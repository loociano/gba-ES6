export default class Model {

  constructor(GBA) {
    if (!GBA) throw new Error('MissingGBA');
    this._gba = GBA;
    this._flags = {N: false, Z: false, C: false, V: false, I: false, F: false, T: false, Q: false};
  }

  /**
   * @param {string} flag
   * @param {boolean} value
   * @param {function} callback
   */
  setFlag(flag, value, callback) {
    this._flags[flag] = value;
    if (typeof callback === 'function') {
      callback.call(this, {flag: flag, value: value});
    }
  }

  /**
   * @param {string} flag
   * @return {boolean} value
   */
  getFlag(flag) {
    return this._flags[flag];
  }

  /**
   * @return {Uint8Array} memory
   */
  getMemory() {
    return this._gba.getMemory();
  }

  getProgram() {
    return this._gba.getProgram();
  }
}