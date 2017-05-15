import * as c from './constants';

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
   * @param {number} begin
   * @param {number} end
   * @return {Array}
   */
  readArray(begin, end) {
    const length = end - begin;
    const array = [];
    for(let i = 0; i < length; i += 4){
      const offset = begin + i;
      array.push(this._memory[offset + 3]);
      array.push(this._memory[offset + 2]);
      array.push(this._memory[offset + 1]);
      array.push(this._memory[offset]);
    }
    return array;
  }

  /**
   * @param {Array} array
   * @param {number} pos
   * @return {void}
   */
  writeArray(array, pos) {
    this._memory.set(array, pos);
  }

  /**
   * @return {ARM7TDMI}
   */
  fetch() {
    this._fetch = [this._memory[this.pc+3], this._memory[this.pc+2], this._memory[this.pc+1], this._memory[this.pc]];
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
    this._decode = ['b', 0x68];
    return this;
  }

  getDecoded() {
    return this._decode;
  }

  /**
   * @return {ARM7TDMI}
   */
  execute() {
    this._opcodes[this._decode[0]].call(this, this._decode[1]);
    return this;
  }

  /**
   * Branch
   * @param {number} addr
   * @private
   */
  _b(addr){
    this.pc = addr;
  }
}