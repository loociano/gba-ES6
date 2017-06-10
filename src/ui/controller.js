import View from './view';
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
    // Renderings
    this.renderState(this._model.getRegisters());
    this._view.render('memory', this._model.getMemory());
  }

  /**
   * @param {Uint8Array} bios
   */
  load(bios) {
    this._model.setBIOS(bios);
    this._model.boot( (registers) => this.renderState(registers) );
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
    this._view.render('cpu', registers);
  }

  renderProgram() {
    const pc = this._model.getPC();
    const offset = this._model.currentLine;
    const instrs = this._model.getInstrs();
    this._view.render('program', { instrs, offset });
    this._view.render('currentInstr', { offset, pc });
  }

  /**
   * @param {number} delta
   */
  onProgramScroll(delta) {
    let newLine = this._model.currentLine + delta;
    if (newLine < 0) {
      if (this._model.currentLine > 0) {
        newLine = 0;
      } else {
        return;
      }
    }
    this._model.currentLine = newLine;
    this.renderProgram();
  }
}