import * as c from './constants';

export default class MMU {

  /**
   * @param {Uint8Array} rom
   */
  constructor(rom) {
    this._memory = new Uint8Array(c.MEMORY_SIZE);
    this._rom = rom;
    this._memory[c.ADDR_POSTFLG] = 1;
  }

  /**
   * @param {number} offset
   * @return {boolean} true if address is valid
   */
  static isValidAddress(offset) {
    return offset >= 0 && offset < c.MEMORY_SIZE+c.EXT_MEMORY_SIZE;
  }

  /**
   * @param {number} offset
   * @return {number} value
   */
  readByte(offset) {
    if (!MMU.isValidAddress(offset)) throw new Error('ReadByteOutOfBounds');
    if (offset < c.MEMORY_SIZE) {
      return this._memory[offset];
    } else {
      return this._rom[offset - c.MEMORY_SIZE];
    }
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
  writeWord(word, offset=0) {
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
    if (!MMU.isValidAddress(offset)) throw new Error('ReadWordOutOfBounds');
    if (offset < c.MEMORY_SIZE) {
      return (this._memory[offset + 3] << 24 >>> 0) + (this._memory[offset + 2] << 16 >>> 0)
        + (this._memory[offset + 1] << 8 >>> 0) + (this._memory[offset] >>> 0);
    } else {
      const base = offset - c.MEMORY_SIZE;
      return (this._rom[base + 3] << 24 >>> 0) + (this._rom[base + 2] << 16 >>> 0)
        + (this._rom[base + 1] << 8 >>> 0) + (this._rom[base] >>> 0);
    }
  }

  /**
   * @param {Uint8Array} array
   * @param {number} offset
   */
  writeArray(array, offset) {
    this._memory.set(array, offset);
  }

  /**
   * @param offset
   * @param length
   * @return {Array}
   */
  readArray(offset, length) {
    const result = [];
    for(let i = 0; i < length; i++) {
      result.push(this.readWord(offset+i*c.ARM_INSTR_LENGTH));
    }
    return result;
  }

  /**
   * @param offset
   * @param length
   * @return {Uint8Array}
   */
  readRawArray(offset, length) {
    return this._memory.subarray(offset, offset+length);
  }
}