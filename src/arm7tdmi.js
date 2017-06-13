import Logger from './logger';
import * as c from './constants';
import Decoder from './decoder';

/**
 * ARM7TDMI chip.
 */
export default class ARM7TDMI {

  /**
   * @param {MMU} MMU
   */
  constructor(MMU) {
    this._mmu = MMU;
    this._r = { r0:0, r1:0, r2:0, r3:0, r4:0, r5:0, r6:0, r7:0, r8:0, r9:0, r10:0, r11:0, r12:0, r13:0, r14:0, pc:0, cpsr:0, sprs:0};
    this._opcodes = {
      '???': this._nop,
      'b': this._b,
      'cmp': this._cmp,
      'mov': this._mov,
      'ldr': this._ldr,
      'teq': this._teq
    };
    // {Array} [{number} pc, {number} word]
    this._fetched = null;
    // {Array} decoded instruction [{number} pc, {string} opcode, ...{number} operands]
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

  getNZCVQ() {
    return this._r.cpsr >>> 27;
  }

  setNZCVQ(bits) {
    this._r.cpsr = (this._r.cpsr & 0x07ffffff | (bits << 27)) >>> 0;
  }

  getIFT() {
    return this._r.cpsr >>> 5;
  }

  setIFT(bits) {
    this._r.cpsr = (this._r.cpsr & 0xffffff1f | (bits << 5)) >>> 0;
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
    if (this._decoded !== null && this._decoded[1] === 'b'){
      readFrom = this._decoded[2];
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
      const pc = this._decoded.splice(0, 1)[0];
      const op = this._decoded.splice(0, 1)[0];
      if (this._opcodes[op]) {
        Logger.instr(pc, op, this._decoded);
        this._opcodes[op].apply(this, this._decoded);
      } else {
        Logger.info(`${op} unimplemented`);
      }
    }
    return this;
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
   * @param {number} Rd
   * @param {number} value Rn
   * @param {number} Op2
   * @private
   */
  _cmp(Rd/*unused*/, Rn, Op2) {
    const diff = Rn - Op2;
    this._setZ(diff);
  }

  /**
   * @param {string} Rd
   * @param {string} Rn
   * @param {number} Op2
   * @private
   */
  _mov(Rd, Rn/*unused*/, Op2) {
    this._r[Rd] = Op2;
    this._setZ(Op2);
  }

  /**
   * @param {string} Rd
   * @param {string} Rn
   * @param {boolean} P pre-increment
   * @param {number} offset
   * @private
   */
  _ldr(Rd, Rn, P, offset) {
    if (P) {
      this._r[Rd] = this._mmu.readWord(this._r[Rn] + offset);
    } else {
      //TODO
    }
  }

  /**
   * @param {string} Rd
   * @param {string} Rn
   * @param {string} Op2
   * @private
   */
  _teq(Rd/*unused*/, Rn, Op2) {
    const xor = (this._r[Rn] ^ Op2) >>> 0;
    this._setZ(xor);
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