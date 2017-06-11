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
    this.$cpu = this._document.querySelector('#cpu ul');
    this.$program = this._document.getElementById('program');
    this.$programInstrs = null; // will hold all the instr li
    this.$lineInput = this._document.querySelector('input[name="programLine"]');
    this.$registers = this._document.querySelectorAll('#cpu span');
    this._initDOM();
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
        View.on(this._document.getElementById('load'), 'change', (evt) => this.load(evt, handler));
        break;
      case 'execute':
        View.on(this._document.querySelector('#controls button[name="next"]'), 'click', handler);
        break;
      case 'onProgramScroll':
        View.on(this.$program, 'wheel', (evt) => View.onMouseWheel(evt, handler));
        break;
      case 'setProgramLine':
        View.on(this._document.querySelector('button[name="setProgramLine"]'), 'click', () => {
          handler(this.$lineInput.value);
        });
        break;
      case 'onKeyDownProgramLine':
        View.on(this.$lineInput, 'keydown', (evt) => {
          if (evt.keyCode === 13) handler(this.$lineInput.value);
        });
        break;
    }
  }

  /**
   * @param {Event} evt
   * @param {Function} handler
   */
  static onMouseWheel(evt, handler) {
    const delta = (evt.wheelDeltaY) > 0 ? -c.INSTR_ON_SCROLL : c.INSTR_ON_SCROLL;
    handler(delta);
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
      case 'controls':
        return this._renderControls(args);
      case 'currentInstr':
        return this._highlightCurrentInstr(args.offset, args.pc);
      case 'memory':
        return this._renderMemoryPage(args);
      case 'program':
        return this._renderProgramPage(args.instrs, args.offset);
    }
  }

  /**
   * @param args
   * @private
   */
  _renderControls(args) {
    for(let prop in args) {
      const button = this._document.querySelector(`#controls button[name="${prop}"]`);
      if (button){
        button.disabled = !args[prop];
      }
    }
  }

  /**
   * @private
   */
  _initDOM() {
    const $programUl = this._document.querySelector('#program ul');
    for(let i = 0; i < c.INSTR_ON_UI; i++) {
      const $li = this._document.createElement('li');
      $programUl.appendChild($li);
    }
    this.$programInstrs = this._document.querySelectorAll('#program li');
  }

  /**
   * @param {number} offset
   * @param {number} pc
   * @private
   */
  _highlightCurrentInstr(offset, pc) {
    const $old = this._document.getElementsByClassName('selected')[0];
    if ($old) $old.className = '';
    const highlight = pc - 8;
    if (highlight < offset || highlight >= offset + c.INSTR_ON_UI*4) return;
    this.$programInstrs[(highlight - offset)/4].className = 'selected';
  }

  /**
   * @param {Object} registers
   * @private
   */
  _renderCpu(registers) {
    for(let r = 0; r < this.$registers.length; r++) {
      switch(r){
        case 15:
          if (registers['pc'] !== undefined) {
            this.$registers[r].innerText = Utils.to32hex(registers['pc']);
            this.$registers[r].className = 'updated';
          } else {
            this.$registers[r].className = '';
          }
          break;
        case 16:
          if (registers['cpsr'] !== undefined) {
            this.$registers[r].innerText = Utils.to32hex(registers['cpsr']);
            this.$registers[r].className = 'updated';
          } else {
            this.$registers[r].className = '';
          }
          break;
        case 17:
          if (registers['sprs'] !== undefined) {
            this.$registers[r].innerText = Utils.to32hex(registers['sprs']);
            this.$registers[r].className = 'updated';
          } else {
            this.$registers[r].className = '';
          }
          break;
        default:
          if (registers[`r${r}`] !== undefined) {
            this.$registers[r].innerText = Utils.to32hex(registers[`r${r}`]);
            this.$registers[r].className = 'updated';
          } else {
            this.$registers[r].className = '';
          }
      }
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