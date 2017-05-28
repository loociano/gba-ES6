import * as c from './constants';
import Utils from './utils';

/**
 * ARM7TDMI chip.
 */
export default class ARM7TDMI {

  constructor() {
    this._memory = new Uint8Array(c.MEMORY_SIZE);
    this.pc = 0;
    this._opcodes = {
      'b': this._b
    };
  }

  /**
   * @param {Uint8Array} BIOS
   */
  setBIOS(BIOS) {
    this._memory.set(BIOS, 0);
  }

  /**
   * @return {ARM7TDMI}
   */
  fetch() {
    this._fetch = this._memory[this.pc];
    this._fetch += this._memory[this.pc+1] << 8;
    this._fetch += this._memory[this.pc+2] << 16;
    this._fetch += (this._memory[this.pc+3] << 24) >>> 0;
    this.pc += 4;
    return this;
  }

  getFetched() {
    return this._fetch;
  }

  /**
   * @return {ARM7TDMI}
   */
  decode() {
    this.pc += 4;
    switch (this._fetch & 0x0f000000) {
      case 0x0a000000: // Branch
        this._decode = this._decodeBranch(this._fetch);
        break;
      default:
        throw new Error(`Unknown instruction: ${this._fetch.toString(16)}`);
    }
    return this;
  }

  getDecoded() {
    return this._decode;
  }

  /**
   * @param {number} word
   * @return {Array}
   * @private
   */
  _decodeBranch(word) {
    const offset = word & 0x00ffffff;
    return ['b', this.pc + (Utils.toSigned(offset) << 2)];
  }

  /**
   * @return {ARM7TDMI}
   */
  execute() {
    this._opcodes[this._decode[0]].call(this, this._decode[1]);
    return this;
  }

  // Instructions

  /**
   * Branch
   * @param {number} addr
   * @private
   */
  _b(addr){
    this.pc = addr;
  }
}