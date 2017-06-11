import View from './view';
import Utils from '../utils';
import Model from './model';
import * as c from '../constants';

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
    this._view.bind('onProgramScroll', (delta) => this.onProgramScroll(delta));
    this._view.bind('setProgramLine', (line) => this.setProgramLine(line) );
    this._view.bind('onKeyDownProgramLine', (line) => this.setProgramLine(line) );
    // Renderings
    this.renderProgram();
    this._renderMemory();
    this._view.render('controls', {'run': false, 'next': false});
  }

  /**
   * @param {Uint8Array} bios
   */
  load(bios) {
    this._model.setBIOS(bios);
    this._model.boot( (registers) => {
      this._view.render('controls', {'run': true, 'next': true});
      this.renderState(registers);
    });
  }

  /**
   * Executes one instruction
   */
  execute() {
    this._model.execute( (registers) => this.renderState(registers) );
  }

  /**
   * @param flag
   * @param value
   */
  setFlag(flag, value) {
    this._model.setFlag(flag, value, null);
  }

  /**
   * @param {Object} registers
   */
  renderState(registers) {
    this.renderProgram();
    this._renderMemory();
    this._view.render('cpu', registers);
  }

  renderProgram() {
    const pc = this._model.getPC();
    const offset = this._model.getProgramLine();
    const instrs = this._model.getInstrs();
    this._view.render('program', { instrs, offset });
    this._view.render('currentInstr', { offset, pc });
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
    this._model.setProgramLine(newLine, () => this.renderProgram());
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
    this._model.setProgramLine(programLine, () => this.renderProgram());
  }

  /**
   * @private
   */
  _renderMemory() {
    this._view.render('memory', this._model.getMemory());
  }
}