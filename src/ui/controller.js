export default class Controller {

  /**
   * @param {Model} model
   * @param {View} view
   */
  constructor(model, view) {
    this._model = model;
    this._view = view;

    this._view.bind('setFlag', (flag, value) => this.setFlag(flag, value));
  }

  /**
   * @param flag
   * @param value
   */
  setFlag(flag, value) {
    this._model.setFlag(flag, value, null);
  }
}