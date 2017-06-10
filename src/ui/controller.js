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
    this._view.bind('onProgramScroll', (evt) => View.onMouseWheel(evt) );
    // Renderings
    this.renderState(0, this._model.getRegisters());
    this._view.render('memory', this._model.getMemory());
    this._view.onScrollProgram( (scrollOffset) => this.onScrollProgram(scrollOffset) );
  }

  /**
   * @param {Uint8Array} bios
   */
  load(bios) {
    this._model.setBIOS(bios);
    this._model.boot( (offset, registers) => this.renderState(offset, registers) );
  }

  /**
   * Executes one instruction
   */
  execute() {
    this._model.execute( (offset, registers) => this.renderState(offset, registers) );
  }

  /**
   * @param flag
   * @param value
   */
  setFlag(flag, value) {
    this._model.setFlag(flag, value, null);
  }

  /**
   * @param {number} programOffset
   * @param {Object} registers
   */
  renderState(programOffset, registers) {
    this.renderProgram(programOffset);
    this._view.render('cpu', registers);
  }

  /**
   * @param {number} offset (first instruction)
   */
  renderProgram(offset) {
    const pc = this._model.getPC();
    const instrs = this._model.getInstrs(offset, c.INSTR_ON_UI);
    this._view.render('program', { instrs, offset });
    this._view.render('currentInstr', { offset, pc });
  }

  /**
   * @param {number} scrollOffset is a signed multiple of 8
   */
  onScrollProgram(scrollOffset) {
    const pc = this._model.getPC();
    const offset = (pc >= 8) ? scrollOffset + (pc - 8) : scrollOffset;
    this.renderProgram(offset);
  }
}