export default class Model {

  /**
   * @param {GBA} GBA
   */
  constructor(GBA) {
    if (!GBA) throw new Error('MissingGBA');
    this._gba = GBA;
    this._flags = {N: false, Z: false, C: false, V: false, I: false, F: false, T: false, Q: false};
  }

  /**
   * @param {function} callback
   */
  boot(callback) {
    this._gba._cpu.boot();
    if (typeof callback === 'function') {
      const instrAddress = this._gba._cpu._decoded[0];
      callback.call(this, instrAddress, this._gba._cpu._r);
    }
  }

  /**
   * @param {function} callback
   */
  executeNext(callback) {
    this._gba._cpu.cycle();
    if (typeof callback === 'function') {
      const instrAddress = this._gba._cpu._decoded[0];
      callback.call(this, instrAddress, this._gba._cpu._r);
    }
  }

  /**
   * @param {Uint8Array} bios
   * @param {function} callback
   */
  setBIOS(bios, callback) {
    this._gba._cpu.setBIOS(bios);
    if (typeof callback === 'function') {
      callback.call(this);
    }
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

  /**
   * @return {Object} registers
   */
  getRegisters() {
    return this._gba._cpu._r;
  }
}