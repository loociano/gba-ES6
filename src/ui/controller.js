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
    this._updateMemory();
    this._updateProgram();
    this._updateCpu();
  }

  /**
   * @param {Uint8Array} bios
   */
  load(bios) {
    this._model.setBIOS(bios);
    this._updateMemory();
    this._updateProgram();
    this._model.boot((current, registers) => {
      this._view.render('currentInstr', current);
      this._view.render('cpu', registers);
    });
  }

  executeNext() {
    this._model.executeNext((current, registers) => {
      this._view.render('currentInstr', current);
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
    this._view.render('program', this._model.getProgram());
  }

  _updateCpu() {
    this._view.render('cpu', this._model.getRegisters());
  }
}