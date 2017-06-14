import View from './view';
import Utils from '../utils';
import Model from './model';
import * as c from '../constants';
import AnimationFrame from './animationFrame';

export default class Controller {

  /**
   * @param {Model} model
   * @param {View} view
   */
  constructor(model, view) {
    this._model = model;
    this._view = view;
    // Bindings
    this._view.bind('setFlag', (flag, value) => this.setFlag(flag, value) );
    this._view.bind('load', (bios) => this.load(bios) );
    this._view.bind('execute', () => this.execute() );
    this._view.bind('run', () => this.run() );
    this._view.bind('onProgramScroll', (delta) => this.onProgramScroll(delta));
    this._view.bind('setProgramLine', (line) => this.setProgramLine(line) );
    this._view.bind('onKeyDownProgramLine', (line) => this.setProgramLine(line) );
    this._view.bind('setMemoryLine', (line) => this.setMemoryLine(line) );
    this._view.bind('onKeyDownMemoryLine', (line) => this.setMemoryLine(line) );
    // Renderings
    this._model.setProgramLine(0, (line) => this._renderProgram(line));
    this._model.setMemoryLine(0, (line) => this._renderMemory(line));
    this._view.render('controls', { run: false, step: false}); // FIXME: update through model
  }

  /**
   * @param {Uint8Array} bios
   */
  load(bios) {
    this._model.setBIOS(bios);
    this._model.boot( (registers, programLine, memoryLine) => {
      this._view.render('controls', {run: true, step: true});
      this._renderState(registers, programLine, memoryLine);
    });
  }

  /**
   * Executes one instruction
   */
  execute() {
    this._model.execute( (registers, programLine, memoryLine) => this._renderState(registers, programLine, memoryLine) );
  }

  /**
   * Toggles program execution: either runs the program indefinitely or pauses.
   */
  run() {
    this._model.toggleRunning( (running) => {
      this._view.render('running', running);
      this._view.render('controls', { run: true, step: !running});
      this._view.requestFrame(running);
      AnimationFrame.frame( () => this.execute() );
    });
  }

  /**
   * @param flag
   * @param value
   */
  setFlag(flag, value) {
    this._model.setFlag(flag, value, (registers) => this._view.render('cpu', registers));
  }

  /**
   * @param {number} delta
   */
  onProgramScroll(delta) {
    const programLine = this._model.getProgramLine();
    let newLine = programLine + delta;
    if (newLine < 0) {
      if (programLine > 0) {
        newLine = 0;
      } else {
        return;
      }
    }
    if (!Model.isValidAddress(newLine + c.INSTR_ON_UI*c.ARM_INSTR_LENGTH - 1)) return;
    this._model.setProgramLine(newLine, (line) => this._renderProgram(line));
  }

  /**
   * @param {string} hexString
   */
  setProgramLine(hexString) {
    const line = Utils.hexStrToNum(hexString);
    if (line < 0 || isNaN(line) ) {
      return;
    }
    let programLine = Math.floor(line/4)*4;
    if (!Model.isValidAddress(programLine + c.INSTR_ON_UI*c.ARM_INSTR_LENGTH - 1)) {
      programLine = c.MEMORY_SIZE + c.EXT_MEMORY_SIZE - c.INSTR_ON_UI*c.ARM_INSTR_LENGTH; // default to max
    }
    this._model.setProgramLine(programLine, (programLine) => this._renderProgram(programLine));
  }

  /**
   * @param hexString
   */
  setMemoryLine(hexString) {
    const line = Utils.hexStrToNum(hexString);
    this._model.setMemoryLine(line, (line) => this._renderMemory(line));
  }

  /**
   * @param {Object} registers
   * @param {number} programLine
   * @param {number} memoryLine
   * @private
   */
  _renderState(registers, programLine, memoryLine) {
    this._renderProgram(programLine);
    this._renderMemory(memoryLine);
    this._view.render('cpu', registers);
  }

  /**
   * @param {number} offset
   * @private
   */
  _renderProgram(offset) {
    const pc = this._model.getPC();
    const instrs = this._model.getInstrs();
    this._view.render('program', { instrs, offset });
    this._view.render('currentInstr', { offset, pc });
  }

  /**
   * @param {number} offset
   * @private
   */
  _renderMemory(offset) {
    this._view.render('memory', {memory: this._model.getMemoryPage(), offset});
  }
}