import Utils from '../utils';
import Decoder from '../decoder';
import * as c from '../constants';

export default class View {

  /**
   * @param {Window} window
   * @param {FileReader} reader
   */
  constructor(window, reader){
    if (typeof window !== 'object') throw new Error('MissingDocument');
    if (typeof reader !== 'object') throw new Error('MissingReader');
    this._window = window;
    this._document = window.document;
    this._reader = reader;
    this.$memory = this._document.querySelector('#memory textarea');
    this.$list = this._document.getElementById('infinite-list');
    this.$programUl = this._document.querySelector('#program ul');
    this.$cpu = this._document.querySelector('#cpu ul');
    this._window.$scrollView = this._document.querySelector('#infinite-list #scroll-view');
    this._initDOM();
    this.$programInstrs = this._document.querySelectorAll('#infinite-list li');
    this._window.previous = null;
    this._window.instrHeight = this.$programInstrs[0].getBoundingClientRect().height;
    this._window.onScrollUpdateInstrs = this._onScrollUpdateInstrs; // attach
  }

  /**
   * @param target
   * @param type
   * @param callback
   */
  static on(target, type, callback) {
    target.addEventListener(type, callback);
  }

  handleScrollInstrs(handler) {
    this._window.onScrollUpdateInstrs(handler);
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
      case 'program-scroll':
        View.on(this.$list, 'wheel', handler);
        break;
    }
  }

  /**
   * @param {Event} evt
   */
  static onMouseWheel(evt) {
    let delta = evt.wheelDeltaY;
    if (Math.abs(delta) < window.instrHeight) {
      delta = window.instrHeight * (delta > 0 ? 1 : -1);
    }
    window.$scrollView.scrollTop -= delta;
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
        return this._renderProgramPage(args.instrs, args.offset);
    }
  }

  /**
   * @private
   */
  _initDOM() {
    for(let i = 0; i < c.INSTR_ON_UI; i++) {
      const $li = this._document.createElement('li');
      this.$programUl.appendChild($li);
    }
  }

  /**
   * This function will be called by the {window} object, 'this' is not available.
   * @param {function} handler
   * @private
   */
  _onScrollUpdateInstrs(handler) {
    let current = window.$scrollView.scrollTop;
    if (window.previous === current) {
      window.requestAnimationFrame(() => window.onScrollUpdateInstrs(handler));
      return;
    }
    window.previous = current;
    let firstInstr = Math.floor(current/15);
    if (current % 120 !== 0) {
      const remain = current % 4;
      firstInstr = (remain >= 2) ? Math.ceil(current/4)*4 : Math.floor(current/4)*4;
    }
    handler(firstInstr, firstInstr + c.INSTR_ON_UI);
    window.requestAnimationFrame(() => window.onScrollUpdateInstrs(handler));
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
   * @param {number} offset
   * @private
   */
  _renderProgramPage(memory, offset) {
    for(let i = 0; i < this.$programInstrs.length; i++) {
      let $li = this.$programInstrs[i];
      const pc = i*4 + offset;
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