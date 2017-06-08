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
    if (event === 'setFlag') {
      const $flags = this._document.querySelectorAll('#flags input[type="checkbox"]');
      $flags.forEach(
        ($flag) => View.on($flag, 'click', () => handler($flag.id, $flag.checked))
      );
    }
    if (event === 'load') {
      const $load = this._document.getElementById('load');
      View.on($load, 'change', (evt) => this.load(evt, handler));
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
      case 'memory':
        return this._renderMemoryPage(args);
      case 'program':
        return this._renderProgramPage(args);
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