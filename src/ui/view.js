import Utils from '../utils';
import Decoder from '../decoder';

export default class View {

  /**
   * @param {HTMLDocument} document
   * @param {FileReader} reader
   */
  constructor(document, reader){
    if (typeof document !== 'object') throw new Error('MissingDocument');
    if (typeof reader !== 'object') throw new Error('MissingReader');
    this._document = document;
    this._reader = reader;
    this.$memory = document.querySelector('#memory textarea');
    this.$programUl = document.querySelector('#program ul');
    this.$cpu = document.querySelector('#cpu ul');
  }

  /**
   * @param target
   * @param type
   * @param callback
   */
  static on(target, type, callback) {
    target.addEventListener(type, callback);
  }

  /**
   * @param {string} event
   * @param {Function} handler
   * @public
   */
  bind(event, handler) {
    switch(event) {
      case 'setFlag':
        const $flags = this._document.querySelectorAll('#flags input[type="checkbox"]');
        $flags.forEach(
          ($flag) => View.on($flag, 'click', () => handler($flag.id, $flag.checked))
        );
        break;
      case 'load':
        const $load = this._document.getElementById('load');
        View.on($load, 'change', (evt) => this.load(evt, handler));
        break;
      case 'executeNext':
        const $button = this._document.querySelector('#controls button[name="next"]');
        View.on($button, 'click', handler);
        break;
    }
  }

  /**
   * @param {Event} evt
   * @param {Function} handler
   */
  load(evt, handler) {
    const file = evt.target.files[0]; // FileList object
    this._reader.onload = (evt) => handler(new Uint8Array(evt.target.result));
    if (file) this._reader.readAsArrayBuffer(file);
  }

  /**
   * @param {string} command
   * @param {Object} args
   */
  render(command, args) {
    if (!command) return;
    switch(command) {
      case 'cpu':
        return this._renderCpu(args);
      case 'currentInstr':
        return this._highlightCurrentInstr(args);
      case 'memory':
        return this._renderMemoryPage(args);
      case 'program':
        return this._renderProgramPage(args);
    }
  }

  /**
   * @param {number} pc
   * @private
   */
  _highlightCurrentInstr(pc) {
    const $old = this._document.getElementsByClassName('selected')[0];
    if ($old) $old.className = '';
    const line = pc/4;
    this.$programUl.childNodes[line].className = 'selected';
  }

  /**
   * @param {Object} registers
   * @private
   */
  _renderCpu(registers) {
    const $registers = this.$cpu.childNodes;
    for(let r = 0; r < 18; r++) {
      let $li = $registers[r];
      if (!$li) {
        $li = this._document.createElement('li');
        this.$cpu.appendChild($li);
      }
      let content;
      if (r === 15) {
        content = `pc &nbsp;&nbsp;${Utils.to32hex(registers['pc'])}`;
      } else if (r === 16) {
        content = `cpsr ${Utils.to32hex(registers['cpsr'])}`;
      } else if (r === 17) {
        content = `sprs ${Utils.to32hex(registers['sprs'])}`;
      } else if (r < 10) {
        content = `r${r} &nbsp;&nbsp;${Utils.to32hex(registers[`r${r}`])}`;
      } else {
        content = `r${r} &nbsp;${Utils.to32hex(registers[`r${r}`])}`;
      }
      $li.innerHTML = content;
    }
  }

  /**
   * @param {Array} memory
   * @private
   */
  _renderProgramPage(memory) {
    const lines = this.$programUl.childNodes;
    for(let i = 0; i < memory.length; i++) {
      let $li = lines[i];
      if (!$li) {
        $li = this._document.createElement('li');
        this.$programUl.appendChild($li);
      }
      const pc = i*4;
      $li.innerText = `${Utils.to32hex(pc)} ${Utils.to32hex(memory[i])}  ${Decoder.decodeToString(pc, memory[i])}`;
    }
  }

  /**
   * @param {Uint8Array} memory
   * @private
   */
  _renderMemoryPage(memory) {
    const lines = [];
    for(let i = 0; i < 0x100; i += 0x10){
      const values = [];
      for(let j = i; j < i+0x10; j++){
        values.push(Utils.toHex(memory[j]));
      }
      lines.push(`${Utils.to32hex(i)} ${values.join(' ')}`);
    }
    this.$memory.textContent = lines.join('\n');
  }
}