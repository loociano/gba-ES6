import Utils from './utils';

/**
 * ARM7TDMI chip.
 */
export default class ARM7TDMI {

  /**
   * @param {MMU} MMU
   */
  constructor(MMU) {
    this._mmu = MMU;
    this._pc = 0;
    this._opcodes = {
      'b': this._b
    };
  }

  /**
   * @param {Uint8Array} BIOS
   * @public
   */
  setBIOS(BIOS) {
    this._mmu.writeArray(BIOS, 0);
  }

  /**
   * @return {ARM7TDMI}
   * @public
   */
  fetch() {
    this._fetch = this._mmu.readWord(this._pc);
    this._pc += 4;
    return this;
  }

  /**
   * @return {ARM7TDMI}
   * @public
   */
  decode() {
    this._pc += 4;
    switch (this._fetch & 0x0f000000) {
      case 0x0a000000: // Branch
        this._decode = this._decodeBranch(this._fetch);
        break;
      default:
        throw new Error(`Unknown instruction: ${this._fetch.toString(16)}`);
    }
    return this;
  }

  /**
   * @return {ARM7TDMI}
   * @public
   */
  execute() {
    this._opcodes[this._decode[0]].call(this, this._decode[1]);
    return this;
  }

  /**
   * @param {number} word
   * @return {Array}
   * @private
   */
  _decodeBranch(word) {
    const offset = word & 0x00ffffff;
    return ['b', this._pc + (Utils.toSigned(offset) << 2)];
  }

  // Instructions

  /**
   * Branch
   * @param {number} addr
   * @private
   */
  _b(addr){
    this._pc = addr;
  }
}