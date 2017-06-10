import * as c from '../constants';
import MMU from '../mmu';

export default class Model {

  /**
   * @param {GBA} GBA
   */
  constructor(GBA) {
    if (!GBA) throw new Error('MissingGBA');
    this._gba = GBA;
    this._flags = {N: false, Z: false, C: false, V: false, I: false, F: false, T: false, Q: false};
    this._programLine = 0;
  }

  getProgramLine() {
    return this._programLine;
  }

  setProgramLine(line, callback) {
    this._programLine = line;
    if (typeof callback === 'function') {
      callback.call(this, this._programLine);
    }
  }

  static isValidAddress(address) {
    return MMU.isValidAddress(address);
  }

  /**
   * //TODO: parametrize method
   * @param {function} callback
   */
  boot(callback) {
    const oldRegisters = Object.assign({}, this.getRegisters()); // clone
    this._gba.getCPU().boot();
    this._programLine = this._gba.getCPU()._decoded[0];
    if (typeof callback === 'function') {
      callback.call(this, this._updatedRegisters(oldRegisters));
    }
  }

  /**
   * @param {function} callback
   */
  execute(callback) {
    const oldRegisters = Object.assign({}, this.getRegisters()); // clone
    this._gba.getCPU().execute();
    this._programLine = this._gba.getCPU()._decoded[0];
    if (typeof callback === 'function') {
      callback.call(this, this._updatedRegisters(oldRegisters));
    }
  }

  /**
   * @param {Object} oldRegisters
   * @return {Object} updatedRegisters
   * @private
   */
  _updatedRegisters(oldRegisters) {
    const newRegisters = this.getRegisters();
    const updatedRegisters = {};
    for(let r in oldRegisters) {
      if (oldRegisters[r] !== newRegisters[r]){
        updatedRegisters[r] = newRegisters[r];
      }
    }
    return updatedRegisters;
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
    return this._gba._cpu._mmu.readArray(this._programLine, c.INSTR_ON_UI);
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