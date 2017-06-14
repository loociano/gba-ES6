import Logger from './logger';
import * as c from './constants';
import Decoder from './decoder';
import Utils from './utils';

/**
 * ARM7TDMI chip.
 */
export default class ARM7TDMI {

  /**
   * @param {MMU|MMUMock} MMU
   */
  constructor(MMU) {
    this._mmu = MMU;
    this._r = { r0:0, r1:0, r2:0, r3:0, r4:0, r5:0, r6:0, r7:0, r8:0, r9:0, r10:0, r11:0, r12:0, r13:0, r14:0, pc:0, cpsr:0, sprs:0};
    this._opcodes = {
      '???': this._nop,
      'b': this._b,
      'cmp': this._cmp,
      'ldr': this._ldr,
      'mov': this._mov,
      'mrs': this._mrs,
      'msr': this._msr,
      'orr': this._orr,
      'teq': this._teq
    };
    // {Array} [{number} pc, {number} word]
    this._fetched = null;
    // {Object} decoded instruction {addr: {number}, op: {string} ...}
    this._decoded = null;
  }

  getPC() {
    return this._r.pc;
  }

  getRegisters() {
    return this._r;
  }

  getCPSR() {
    return this._r.cpsr;
  }

  getNZCV() {
    return this._r.cpsr >>> 28;
  }

  setNZCV(bits) {
    this._r.cpsr = (this._r.cpsr & 0x07ffffff | (bits << 28)) >>> 0;
  }

  getIFT() {
    return this._r.cpsr >>> 5 & 7;
  }

  setIFT(bits) {
    this._r.cpsr = (this._r.cpsr & 0xffffff1f | (bits << 5)) >>> 0;
  }

  /**
   * @return {Object}
   */
  getDecodedAddr() {
    return this._decoded.addr;
  }

  /**
   * @param {Uint8Array} BIOS
   * @public
   */
  setBIOS(BIOS) {
    this._mmu.writeArray(BIOS, 0);
  }

  /**
   * Fills the fetched/decoded values
   */
  boot() {
    this._fetch()._decode()._fetch();
  }

  /**
   * Executes one CPU cycle (execute + decode + fetch)
   * @public
   */
  execute() {
    this._execute()._decode()._fetch();
  }

  /**
   * @return {ARM7TDMI}
   * @private
   */
  _fetch() {
    let readFrom;
    if (this._decoded !== null && this._decoded.op === 'b'){
      readFrom = this._decoded.sOffset;
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
    if (this._fetched === null) return this;
    this._decoded = Decoder.decode(...this._fetched);
    return this;
  }

  /**
   * @return {ARM7TDMI}
   * @private
   */
  _execute() {
    if (this._decoded !== null) {
      const op = this._decoded.op;
      if (this._opcodes[op] && this._meetsCondition(this._decoded.cond)) {
        Logger.instr(this._decoded.addr, this._decoded.toString);
        this._opcodes[op].call(this, this._decoded);
      }
    }
    return this;
  }

  /**
   * @param {string} cond
   * @return {boolean}
   * @private
   */
  _meetsCondition(cond) {
    if (this[`_${cond}`]) return this[`_${cond}`].call(this);
    return true;
  }

  /**
   * @return {boolean} true if equal (zero) (same)
   * @private
   */
  _eq() {
    return (this._r.cpsr >>> 30 & 1) === 1;
  }

  /**
   * @return {boolean} true if not equal (nonzero) (not same)
   * @private
   */
  _ne() {
    return !this._eq();
  }

  /**
   * @return {boolean} true if unsigned higher or same (carry set)
   * @private
   */
  _cs() {
    return (this._r.cpsr >>> 29 & 1) === 1;
  }

  /**
   * @return {boolean} true if unsigned lower (carry cleared)
   * @private
   */
  _cc() {
    return !this._cs();
  }

  /**
   * @return {boolean} true if negative (minus)
   * @private
   */
  _mi() {
    return (this._r.cpsr >>> 31 & 1) === 1;
  }

  /**
   * @return {boolean} true if positive or zero (plus)
   * @private
   */
  _pl() {
    return !this._mi();
  }

  /**
   * @return {boolean} true if overflow (V set)
   * @private
   */
  _vs() {
    return (this._r.cpsr >>> 28 & 1) === 1;
  }

  /**
   * @return {boolean} true if no overflow (V cleared)
   * @private
   */
  _vc() {
    return !this._vs();
  }

  /**
   * @return {boolean} true if unsigned higher
   * @private
   */
  _hi() {
    return this._cs() && this._ne();
  }

  /**
   * @return {boolean} true if unsigned lower or same
   * @private
   */
  _ls() {
    return !this._hi();
  }

  /**
   * @return {boolean} true if greater or equal (N=V)
   * @private
   */
  _ge() {
    return (this._r.cpsr >>> 31 & 1) === (this._r.cpsr >>> 28 & 1);
  }

  /**
   * @return {boolean} true if strictly less than (N!=V)
   * @private
   */
  _lt() {
    return !this._ge();
  }

  /**
   * @return {boolean} true if strictly greater than
   * @private
   */
  _gt() {
    return this._ne() && this._ge();
  }

  /**
   * @return {boolean} true if less or equal
   * @private
   */
  _le() {
    return this._eq() || this._lt();
  }

  /**
   * @return {boolean} false always
   * @private
   */
  _nv() {
    return false;
  }

  // Instructions

  _nop() {}

  /**
   * @param {Object} args
   * @private
   */
  _b(args) {
    this._r.pc = args.sOffset;
    this._branched = true;
  }

  /**
   * C is set to 0 if the subtraction produced a borrow (that is, an unsigned underflow), and to 1 otherwise.
   * @param {Object} args
   * @private
   */
  _cmp(args) {
    const Rn = args.Rn;
    const Op2 = args.Op2;
    const sRn = Utils.toSigned(this._r[Rn]);
    const diff = sRn - Op2;
    this._setN(Utils.toSigned(diff) < 0);
    this._setZ(diff === 0);
    this._setC(!(Op2 > this._r[Rn]));
    this._setV(diff < -2147483648);
  }

  _mrs(args) {
    this._r[args.Rd] = this._r.cpsr;
  }

  _msr(args) {
    if (args._flg) {
      this._r[args.Psr] = ((this._r[args.Psr] & 0x0fffffff) | (this._r[args.Rm] & 0xf0000000)) >>> 0;
    }
    if (args._ctl) {
      this._r[args.Psr] = ((this._r[args.Psr] & 0xffffff00) | (this._r[args.Rm] & 0xff)) >>> 0;
    }
  }

  _orr(args) {
    const or = (this._r[args.Rn] | args.Op2) >>> 0;
    this._r[args.Rd] = or;
    if (args.setCondition) {
      this._setN(or >>> 31 === 1);
      this._setZ(or === 0);
      // TODO: C
      // V unaffected
    }
  }

  _mov(args) {
    const Rd = args.Rd;
    const Op2 = args.Op2;
    this._r[Rd] = Op2;
    if (args.setCondition) {
      this._setN(Op2 >>> 31 === 1);
      this._setZ(Op2 === 0);
    }
  }

  _ldr(args) {
    if (args.pre) {
      this._r[args.Rd] = this._mmu.readWord(this._r[args.Rn] + args.offset);
    } else {
      //TODO
    }
  }

  _teq(args) {
    const xor = (this._r[args.Rn] ^ args.Op2) >>> 0;
    this._setN(xor >>> 31 === 1);
    this._setZ(xor === 0);
    // TODO: C
    // V unaffected
  }

  /**
   * @param {boolean} set
   * @private
   */
  _setN(set) {
    set ? this._r.cpsr = (this._r.cpsr | 0x80000000) >>> 0 : this._r.cpsr &= 0x7fffffff;
  }

  /**
   * Sets flag Z according to value
   * @param {boolean} set
   * @private
   */
  _setZ(set) {
    set ? this._r.cpsr |= 0x40000000: this._r.cpsr = (this._r.cpsr & 0xbfffffff) >>> 0;
  }

  /**
   * @param {boolean} set
   * @private
   */
  _setC(set) {
    set ? this._r.cpsr |= 0x20000000 : this._r.cpsr = (this._r.cpsr & 0xdfffffff) >>> 0;
  }

  /**
   * @param set
   * @private
   */
  _setV(set) {
    set ? this._r.cpsr |= 0x10000000 : this._r.cpsr = (this._r.cpsr & 0xefffffff) >>> 0;
  }
}