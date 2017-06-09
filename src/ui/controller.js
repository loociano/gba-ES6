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

    this._view.bind('setFlag', (flag, value) => this.setFlag(flag, value));
    this._view.bind('load', (bios) => this.load(bios));
    this._view.bind('executeNext', () => this.executeNext());
    this._view.bind('program-scroll', (evt) => View.onMouseWheel(evt));
    this._updateMemory();
    this._updateProgram();
    this._updateCpu();
    this._view.handleScrollInstrs((firstInstr, amount) => this.handleScrollInstrs(firstInstr, amount));
  }

  /**
   * @param firstInstr
   * @param amount
   */
  handleScrollInstrs(firstInstr, amount) {
    const pc = this._model.getPC();
    let offset = firstInstr;
    if (pc >= 8) offset = pc - 8 + firstInstr;

    this._view.render('program', {
      instrs: this._model.getInstrs(offset, amount),
      offset: offset
    });
    this._view.render('currentInstr', {
      offset: offset,
      pc: this._model.getPC()
    });
  }

  /**
   * @param {Uint8Array} bios
   */
  load(bios) {
    this._model.setBIOS(bios);
    this._updateMemory();
    this._updateProgram();
    this._model.boot((current, registers) => {
      this._view.render('currentInstr', {offset: current, pc: this._model.getPC()});
      this._view.render('cpu', registers);
    });
  }

  executeNext() {
    this._model.executeNext((current, registers) => {
      this._view.render('program', {
        instrs: this._model.getInstrs(current, current + c.INSTR_ON_UI),
        offset: current
      });
      this._view.render('currentInstr', {offset: current, pc: this._model.getPC()});
      this._view.render('cpu', registers);
    });
  }

  /**
   * @param flag
   * @param value
   */
  setFlag(flag, value) {
    this._model.setFlag(flag, value, null);
  }

  _updateMemory() {
    this._view.render('memory', this._model.getMemory());
  }

  _updateProgram() {
    this._view.render('program', {instrs: this._model.getInstrs(0, 20), offset: 0});
  }

  _updateCpu() {
    this._view.render('cpu', this._model.getRegisters());
  }
}