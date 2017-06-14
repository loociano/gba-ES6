import Utils from '../utils';
import Decoder from '../decoder';
import * as c from '../constants';
import * as s from './strings';
import AnimationFrame from './animationFrame';

export default class View {

  /**
   * @param target
   * @param type
   * @param callback
   */
  static on(target, type, callback) {
    target.addEventListener(type, callback);
  }

  /**
   * @param {Event} evt
   * @param {Function} handler
   */
  static onMouseWheel(evt, handler) {
    evt.preventDefault();
    const delta = (evt.wheelDeltaY) > 0 ? -c.INSTR_ON_SCROLL : c.INSTR_ON_SCROLL;
    handler(delta);
  }

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
    this.$program = this._document.getElementById('program');
    this.$programInstrs = null; // will hold all the instr li
    this.$programLineInput = this._document.querySelector('input[name="programLine"]');
    this.$memoryLineInput = this._document.querySelector('input[name="memoryLine"]');
    this.$registers = this._document.querySelectorAll('#cpu span');
    this.$runButton = this._document.querySelector('#controls button[name="run"]');
    this.$flagLines = this._document.querySelectorAll('#flags li');
    this.$flags = this._document.querySelectorAll('#flags input[type="checkbox"]');
    this._initDOM();
    this.requestFrame(true);
  }

  /**
   * @param {boolean} request
   */
  requestFrame(request) {
    this._window.frame = request ? AnimationFrame.frame : AnimationFrame.stop;
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
        View.on(this._document.querySelector('#controls button[name="step"]'), 'click', handler);
        break;
      case 'run':
        View.on(this._document.querySelector('#controls button[name="run"]'), 'click', handler);
        break;
      case 'onProgramScroll':
        View.on(this.$program, 'wheel', (evt) => View.onMouseWheel(evt, handler));
        break;
      case 'setProgramLine':
        return this._bindLineInput(this._document.querySelector('button[name="setProgramLine"]'), this.$programLineInput, handler);
      case 'setMemoryLine':
        return this._bindLineInput(this._document.querySelector('button[name="setMemoryLine"]'), this.$memoryLineInput, handler);
      case 'onKeyDownProgramLine':
        return this._bindKeyDownLineInput(this.$programLineInput, handler);
      case 'onKeyDownMemoryLine':
        return this._bindKeyDownLineInput(this.$memoryLineInput, handler);
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
      case 'controls':
        return this._renderControls(args);
      case 'currentInstr':
        return this._highlightCurrentInstr(args.offset, args.pc);
      case 'memory':
        return this._renderMemoryPage(args.memory, args.offset);
      case 'program':
        return this._renderProgramPage(args.instrs, args.offset);
      case 'running':
        return this._renderRunning(args);
    }
  }

  /**
   * @param {boolean} running
   * @private
   */
  _renderRunning(running) {
    this.$runButton.textContent = running ? s.PAUSE : s.RUN;
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

    // Strings
    this.$runButton.textContent = s.RUN;
    this._document.querySelector('#controls button[name="step"]').textContent = s.STEP;
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
          this._renderFlags(registers['cpsr']);
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
   * @param {number} cpsr
   * @private
   */
  _renderFlags(cpsr) {
    if (cpsr === undefined) {
      return this.$flagLines.forEach( ($flagLine) => $flagLine.className = '');
    }
    const flagBooleans = {
      N: (cpsr >>> 31) === 1,
      Z: (cpsr >>> 30 & 1) === 1,
      C: (cpsr >>> 29 & 1) === 1,
      V: (cpsr >>> 28 & 1) === 1,
      I: (cpsr >>> 7 & 1) === 1,
      F: (cpsr >>> 6 & 1) === 1,
      T: (cpsr >>> 5 & 1) === 1
    };
    for(let f = 0; f < this.$flags.length; f++){
      const $flag = this.$flags[f];
      const $flagLine = this.$flagLines[f];
      const newValue = flagBooleans[`${$flag.id}`];
      $flagLine.className = $flag.checked !== newValue ? 'updated' : '';
      $flag.checked = newValue;
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
      $li.innerText = `${Utils.to32hex(pc)} ${Utils.to32hex(memory[i])}  ${Decoder.decode(pc, memory[i]).toString}`;
    }
  }

  /**
   * @param {Uint8Array} memory page, should be 256 bytes
   * @param {number} offset
   * @private
   */
  _renderMemoryPage(memory, offset) {
    const lines = [];
    for(let i = 0; i < memory.length; i += 0x10){
      const values = [];
      for(let j = i; j < i+0x10; j++){
        values.push(Utils.toHex(memory[j]));
      }
      lines.push(`${Utils.to32hex(i + offset)} ${values.join(' ')}`);
    }
    this.$memory.textContent = lines.join('\n');
  }

  /**
   * @param $elt
   * @param $lineInput
   * @param handler
   * @private
   */
  _bindLineInput($elt, $lineInput, handler) {
    View.on($elt, 'click', () => handler($lineInput.value));
  }

  /**
   * @param $lineInput
   * @param handler
   * @private
   */
  _bindKeyDownLineInput($lineInput, handler) {
    View.on($lineInput, 'keydown', (evt) => {
      if (evt.keyCode === c.ENTER_KEYCODE) handler($lineInput.value);
    });
  }
}