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
    this._r = { r0: 0, r1: 0, r2: 0, r3: 0, r12: 0, r14: 0, pc: 0, cpsr: 0};
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
   * Fills the fetched/decoded values
   */
  boot() {
    this._fetch()._decode()._fetch();
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
      Logger.instr(pc, op, this._decoded);
      this._opcodes[op].apply(this, this._decoded);
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