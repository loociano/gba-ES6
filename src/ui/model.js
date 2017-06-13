import * as c from '../constants';
import MMU from '../mmu';

export default class Model {

  static isValidAddress(address) {
    return MMU.isValidAddress(address);
  }

  /**
   * @param {GBA} GBA
   */
  constructor(GBA) {
    if (!GBA) throw new Error('MissingGBA');
    this._gba = GBA;
    this._programLine = 0;
    this._running = false;
  }

  /**
   * @param {function} callback
   */
  toggleRunning(callback) {
    this._running = !this._running;
    if (typeof callback === 'function') {
      callback.call(this, this._running);
    }
  }

  /**
   * @return {number} programLine
   */
  getProgramLine() {
    return this._programLine;
  }

  /**
   * @param line
   * @param {function} callback
   */
  setProgramLine(line, callback) {
    this._programLine = line;
    if (typeof callback === 'function') {
      callback.call(this, this._programLine);
    }
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
   * @param {Uint8Array} bios
   */
  setBIOS(bios) {
    this._gba.getCPU().setBIOS(bios);
  }

  /**
   * @param {string} flag
   * @param {boolean} value
   * @param {Function} callback, will receive updated cpsr
   */
  setFlag(flag, value, callback) {
    const cpu = this._gba.getCPU();
    const nzcvq = this._gba.getCPU().getNZCVQ();
    const ift = this._gba.getCPU().getIFT();
    const bit = value ? 1 : 0;
    switch(flag) {
      case 'N': case 'Z': case 'C': case 'V': case 'Q':
        cpu.setNZCVQ(nzcvq & (~(1 << c.FLAG_BITS[flag]) & 0x1f) | (bit << c.FLAG_BITS[flag]));
        break;
      case 'I': case 'F': case 'T':
        cpu.setIFT(ift & (~(1 << c.FLAG_BITS[flag]) & 7) | (bit << c.FLAG_BITS[flag]));
        break;
      default:
        throw new Error(`SetUnknownFlag ${flag}`);
    }
    if (typeof callback === 'function') {
      callback.call(this, {cpsr: cpu.getCPSR()} );
    }
  }

  /**
   * @param {string} flag
   * @return {boolean} value
   */
  getFlag(flag) {
    const cpu = this._gba.getCPU();
    const nzcvq = cpu.getNZCVQ();
    const ift = cpu.getIFT();

    switch(flag) {
      case 'N': case 'Z': case 'C': case 'V': case 'Q':
        return (nzcvq >>> c.FLAG_BITS[flag]) === 1;
      case 'I': case 'F': case 'T':
        return (ift >>> c.FLAG_BITS[flag]) === 1;
      default:
        throw new Error(`GetUnknownFlag ${flag}`);
    }
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
}