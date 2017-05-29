import Utils from './utils';
import Logger from './logger';

/**
 * ARM7TDMI chip.
 */
export default class ARM7TDMI {

  /**
   * @param {MMU} MMU
   */
  constructor(MMU) {
    this._mmu = MMU;
    this._r = { r14: 0, pc: 0, cpsr: 0};
    this._opcodes = {
      'b': this._b,
      'cmp': this._cmp
    };
    this._fetch = null; // instruction word (raw)
    this._decode = []; // decoded instruction [{string} opcode, ...{number} operands]
    this._logPC = null;
  }

  /**
   * @param {Uint8Array} BIOS
   * @public
   */
  setBIOS(BIOS) {
    this._mmu.writeArray(BIOS, 0);
  }

  getNZCVQ() {
    return this._r.cpsr >>> 27;
  }

  /**
   * @return {ARM7TDMI}
   * @public
   */
  fetch() {
    this._fetch = this._mmu.readWord(this._r.pc);
    this._logPC = this._r.pc;
    this._r.pc += 4;
    return this;
  }

  /**
   * @return {ARM7TDMI}
   * @public
   */
  decode() {
    this._r.pc += 4;
    switch (this._fetch >>> 24 & 0xf) {
      case 0xa: // Branch
        this._decode = this._decodeBranch(this._fetch);
        break;
      case 0: // DataProc
      case 1:
      case 2:
      case 3:
        this._decode = this._decodeDataProc(this._fetch);
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
    const op = this._decode.splice(0, 1);
    Logger.instr(this._logPC, op, this._decode);
    this._opcodes[op].apply(this, this._decode);
    return this;
  }

  /**
   * @param {number} word
   * @return {Array}
   * @private
   */
  _decodeBranch(word) {
    const offset = word & 0x00ffffff;
    return ['b', this._r.pc + (Utils.toSigned(offset) << 2)];
  }

  /**
   * @param {number} word
   * @return {Array} instruction parameters
   * @private
   */
  _decodeDataProc(word) {
    let op, Rn, Op2;
    const opcode = word >>> 21 & 0xf;
    switch (opcode){
      case 0xa:
        op = 'cmp';
        break;
      default:
        throw new Error(`Unknown DataProc: ${Utils.toHex(opcode)}`);
    }
    const immediate = word >>> 25 & 1 === 1;
    switch (word >>> 16 & 0xf) {
      case 14:
        Rn = this._r.r14;
        break;
      default:
        throw new Error('Unknown Rn');
    }
    if (immediate) {
      Op2 = word & 0x00000fff; // TODO: calculate with ror
    }
    return [op, Rn, Op2];
  }

  // Instructions

  /**
   * Branch
   * @param {number} addr
   * @private
   */
  _b(addr) {
    this._r.pc = addr;
  }

  /**
   * @param Rn
   * @param Op2
   * @private
   */
  _cmp(Rn, Op2) {
    const diff = Rn - Op2;
    this._setZ(diff);
  }

  /**
   * Sets flag Z according to value
   * @param {number} value
   * @private
   */
  _setZ(value) {
    if (value === 0){
      this._r.cpsr |= 0x40000000;
    } else {
      this._r.cpsr &= 0xbfffffff;
    }
  }
}