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
    this._programLine = 0; // top line in the program display
    this._memoryLine = 0;
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
   * @param line
   * @param {function} callback
   */
  setMemoryLine(line, callback) {
    this._memoryLine = line;
    if (typeof callback === 'function') {
      callback.call(this, this._memoryLine);
    }
  }

  /**
   * //TODO: parametrize method
   * @param {function} callback
   */
  boot(callback) {
    const oldRegisters = Object.assign({}, this.getRegisters()); // clone
    this._gba.getCPU().boot();
    this._programLine = this._gba.getCPU().getDecodedAddr();
    if (typeof callback === 'function') {
      callback.call(this, this._updatedRegisters(oldRegisters), this._programLine, this._memoryLine);
    }
  }

  /**
   * @param {function} callback
   */
  execute(callback) {
    const oldRegisters = Object.assign({}, this.getRegisters()); // clone
    this._gba.getCPU().execute();
    this._programLine = this._gba.getCPU().getDecodedAddr();
    if (typeof callback === 'function') {
      callback.call(this, this._updatedRegisters(oldRegisters), this._programLine, this._memoryLine);
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
    const nzcv = this._gba.getCPU().getNZCV();
    const ift = this._gba.getCPU().getIFT();
    const bit = value ? 1 : 0;
    switch(flag) {
      case 'N': case 'Z': case 'C': case 'V':
        cpu.setNZCV(nzcv & (~(1 << c.FLAG_BITS[flag]) & 0xf) | (bit << c.FLAG_BITS[flag]));
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
    const nzcvq = cpu.getNZCV();
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
  getMemoryPage() {
    return this._gba.getCPU()._mmu.readRawArray(this._memoryLine, c.MEMORY_PAGE_LINES * c.BYTES_PER_MEMORY_LINE);
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