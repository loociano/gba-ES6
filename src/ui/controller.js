export default class Controller {

  /**
   * @param {Model} model
   * @param {View} view
   */
  constructor(model, view) {
    this._model = model;
    this._view = view;

    this._view.bind('setFlag', (flag, value) => this.setFlag(flag, value));
    this._updateMemory();
    this._updateProgram();
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
}