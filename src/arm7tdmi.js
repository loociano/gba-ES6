import Utils from './utils';
import Logger from './logger';
import * as c from './constants';

/**
 * ARM7TDMI chip.
 */
export default class ARM7TDMI {

  /**
   * @param {MMU} MMU
   */
  constructor(MMU) {
    this._mmu = MMU;
    this._r = { r0: 0, r1: 0, r2: 0, r3: 0, r14: 0, pc: 0, cpsr: 0};
    this._opcodes = {
      'b': this._b,
      'cmp': this._cmp,
      'nop': this._nop
    };
    this._fetched = [this._r.pc, 0]; // instruction word (raw)
    this._decoded = ['nop']; // decoded instruction [{string} opcode, ...{number} operands]
    this._logPC = 0;
    this._r.pc = c.ARM_INSTR_LENGTH*2;
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
   * @public
   */
  cycle() {
    this._execute()._decode()._fetch();
  }

  /**
   * @return {ARM7TDMI}
   * @private
   */
  _fetch() {
    let readFrom;
    if (this._decoded[0] === 'b'){
      readFrom = this._decoded[1];
    } else if (this._branched) {
      readFrom = this._r.pc + c.ARM_INSTR_LENGTH;
    } else {
      readFrom = this._r.pc;
    }
    if (this._branched) {
      this._branched = false;
      this._r.pc += 4;
    }
    this._fetched = [readFrom, this._mmu.readWord(readFrom)];
    Logger.fetched(...this._fetched);
    this._r.pc += 4;
    return this;
  }

  /**
   * @return {ARM7TDMI}
   * @private
   */
  _decode() {
    if (this._fetched[1] === 0) {
      this._decoded = ['nop'];
    } else {
      switch (this._fetched[1] >>> 24 & 0xf) {
        case 0xa: // Branch
          this._decoded = this._decodeBranch(...this._fetched);
          break;
        case 0: // DataProc
        case 1:
        case 2:
        case 3:
          this._decoded = this._decodeDataProc(this._fetched[1]);
          break;
        default:
          throw new Error(`Unknown instruction: ${this._fetched[1].toString(16)}`);
      }
    }
    return this;
  }

  /**
   * @return {ARM7TDMI}
   * @private
   */
  _execute() {
    if (this._decoded.length !== 0) {
      const op = this._decoded.splice(0, 1)[0];
      Logger.instr(this._logPC, op, this._decoded);
      this._opcodes[op].apply(this, this._decoded);
    }
    return this;
  }

  /**
   * @param {number} pc
   * @param {number} instr
   * @return {Array}
   * @private
   */
  _decodeBranch(pc, instr) {
    const offset = instr & 0x00ffffff;
    return ['b', pc + c.ARM_INSTR_LENGTH*2 + (Utils.toSigned(offset)*4)];
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
      case 0:
        Rn = this._r.r0;
        break;
      case 1:
        Rn = this._r.r1;
        break;
      case 2:
        Rn = this._r.r2;
        break;
      case 3:
        Rn = this._r.r3;
        break;
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

  _nop() {}

  /**
   * Branch
   * @param {number} addr
   * @private
   */
  _b(addr) {
    this._r.pc = addr;
    this._branched = true;
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