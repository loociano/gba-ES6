import * as c from './constants';

/**
 * ARM7TDMI chip.
 */
export default class ARM7TDMI {

  constructor() {
    this._memory = new Uint8Array(c.MEMORY_SIZE);
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
   * @param {Uint8Array} array
   * @param {number} pos
   * @return {void}
   */
  writeArray(array, pos) {
    this._memory.set(array, pos);
  }
}