import * as c from '../../src/constants';
import Utils from '../../src/utils';

export default class MMUMock {

  constructor() {
    this._memory = new Uint8Array(c.MEMORY_SIZE);
    this._extMemory = new Uint8Array(c.EXT_MEMORY_SIZE);
  }

  /**
   * @param {number} offset
   * @return {number}
   */
  readWord(offset) {
    if (offset < c.MEMORY_SIZE) {
      return (this._memory[offset] << 24 >>> 0) + (this._memory[offset + 1] << 16 >>> 0)
        + (this._memory[offset + 2] << 8 >>> 0) + this._memory[offset + 3];
    } else {
      offset -= c.MEMORY_SIZE;
      return (this._extMemory[offset] << 24 >>> 0) + (this._extMemory[offset + 1] << 16 >>> 0)
        + (this._extMemory[offset + 2] << 8 >>> 0) + this._extMemory[offset + 3];
    }
  }

  /**
   * @param {number}word
   * @param {number} offset
   */
  writeWord(word, offset) {
    const bytes = Utils.to32hex(word).match(/../g).map( (i) => parseInt(i, 16));
    (offset < c.MEMORY_SIZE) ? this._memory.set(bytes, offset) : this._extMemory.set(bytes, offset - c.MEMORY_SIZE);
  }
}