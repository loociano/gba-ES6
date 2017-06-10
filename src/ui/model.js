import * as c from '../constants';

export default class Model {

  /**
   * @param {GBA} GBA
   */
  constructor(GBA) {
    if (!GBA) throw new Error('MissingGBA');
    this._gba = GBA;
    this._flags = {N: false, Z: false, C: false, V: false, I: false, F: false, T: false, Q: false};
    this.currentLine = 0;
  }

  getProgramLine() {
    return this.currentLine;
  }

  setProgramLine(line, callback) {
    this.currentLine = line;
    if (typeof callback === 'function') {
      callback.call(this, this.currentLine);
    }
  }

  /**
   * @param {function} callback
   */
  boot(callback) {
    this._gba.getCPU().boot();
    if (typeof callback === 'function') {
      this.currentLine = this._gba._cpu._decoded[0];
      callback.call(this, this.getRegisters());
    }
  }

  /**
   * @param {function} callback
   */
  execute(callback) {
    this._gba.getCPU().execute();
    if (typeof callback === 'function') {
      this.currentLine = this._gba._cpu._decoded[0];
      callback.call(this, this.getRegisters());
    }
  }

  /**
   * @param {Uint8Array} bios
   */
  setBIOS(bios) {
    this._gba.getCPU().setBIOS(bios);
  }

  /**
   * @param {string} flag
   * @param {boolean} value
   * @param {function} callback
   */
  setFlag(flag, value, callback) {
    this._flags[flag] = value;
    if (typeof callback === 'function') {
      callback.call(this, {flag, value} );
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
    return this._gba._cpu._mmu._memory;
  }

  /**
   * @return {Array}
   */
  getInstrs() {
    return this._gba._cpu._mmu.readArray(this.currentLine, c.INSTR_ON_UI);
  }

  /**
   * @return {Object} registers
   */
  getRegisters() {
    return this._gba.getCPU().getRegisters();
  }

  /**
   * @return {number} pc
   */
  getPC() {
    return this._gba.getCPU().getPC();
  }
}