import * as c from './constants';

export default class MMU {

  constructor() {
    this._memory = new Uint8Array(c.MEMORY_SIZE);
  }

  /**
   * @param {number} offset
   * @return {number} value
   */
  readByte(offset) {
    if (offset < 0 || offset >= c.MEMORY_SIZE) throw new Error('ReadByteOutOfBounds');
    return this._memory[offset];
  }

  /**
   * @param {number} value
   * @param {number} offset
   */
  writeByte(value, offset) {
    if (value < 0 || value > 0xff) throw new Error('WriteByteInvalidValue');
    if (offset < 0 || offset >= c.MEMORY_SIZE) throw new Error('WriteByteOutOfBounds');
    this._memory[offset] = value;
  }

  /**
   * @param {number} word
   * @param {number} offset
   */
  writeWord(word, offset) {
    if (word < 0 || word > 0xffffffff) throw new Error('WriteWordInvalidValue');
    if (offset < 0 || offset >= c.MEMORY_SIZE) throw new Error('ReadWordOutOfBounds');
    this._memory[offset++] = word >> 24 & 0xff;
    this._memory[offset++] = word >> 16 & 0xff;
    this._memory[offset++] = word >> 8 & 0xff;
    this._memory[offset] = word & 0xff;
  }

  /**
   * @param {number} offset
   * @return {number} word
   */
  readWord(offset) {
    if (offset < 0 || offset >= c.MEMORY_SIZE) throw new Error('ReadWordOutOfBounds');
    return (this._memory[offset+3] << 24 >>> 0)
      + (this._memory[offset+2] << 16 >>> 0)
      + (this._memory[offset+1] << 8 >>> 0)
      + (this._memory[offset] >>> 0);
  }

  /**
   * @param {Uint8Array} array
   * @param {number} offset
   */
  writeArray(array, offset) {
    this._memory.set(array, offset);
  }
}