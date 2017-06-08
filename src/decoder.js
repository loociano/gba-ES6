import * as c from './constants';
import Utils from './utils';
import Logger from './logger';

export default class Decoder {

  /**
   * @param {number} pc
   * @param {number} word
   * @param {boolean} toString
   * @return {Array|string}
   */
  static decode(pc, word, toString=false) {
    switch (word >>> 24 & 0xf) {
      case 0xa: // Branch
        return Decoder._decodeBranch(pc, word, toString);
      case 0: // DataProc
      case 1:
      case 2:
      case 3:
        return Decoder._decodeDataProc(pc, word, toString);
      case 4: // SingleDataTransfer
      case 5:
        return Decoder._decodeDataTransfer(pc, word, toString);
      default:
        return Decoder._decodeUnknown(pc, toString);
    }
  }

  /**
   * Decodes an instruction in a human readable way. Example: ldr r1,[r0,0x300]
   * @param {number} pc
   * @param {number} word
   * @return {string}
   */
  static decodeToString(pc, word) {
    return Decoder.decode(pc, word, true);
  }

  /**
   * @param pc
   * @param {boolean} toString
   * @return {Array|string}
   * @private
   */
  static _decodeUnknown(pc, toString=false) {
    if (toString) return '???';
    return [pc, '???'];
  }

  /**
   * @param {number} pc
   * @param {number} word
   * @param {boolean} toString
   * @return {Array|string}
   * @private
   */
  static _decodeBranch(pc, word, toString=false) {
    const offset = word & 0x00ffffff;
    const decoded = [pc, 'b', pc + c.ARM_INSTR_LENGTH*2 + (Utils.toSigned(offset)*4)];
    if (toString) return `${decoded[1]} 0x${Utils.toHex(decoded[2])}`;
    return decoded;
  }

  /**
   * @param {number} pc
   * @param {number} word
   * @param {boolean} toString
   * @return {Array|string} instruction parameters
   * @private
   */
  static _decodeDataProc(pc, word, toString=false) {
    let op, Rd, Rn, Op2 = 0;
    const immediate = word >>> 25 & 1 === 1;
    const opcode = word >>> 21 & 0xf;
    Rn = `r${word >>> 16 & 0xf}`;
    Rd = `r${word >>> 12 & 0xf}`;
    if (immediate) {
      Op2 = Utils.ror(word & 0xff, (word >>> 8 & 0xf)*2);
    } else {
      const R = word >>> 4 & 1 === 1;
      const Rm = `r${word & 0xf}`;
      if (!R) {
        const Is = word >>> 7 & 0x1f;
        if (Is === 0){
          Op2 = Rm;
        } else {
          //TODO
        }
      } else {
        //TODO
      }
    }
    op = c.ALU_OPCODES[opcode];
    if (toString) {
      let prefix = '';
      if (typeof Op2 === 'number') prefix = '0x';
      switch(opcode) {
        case 8:
        case 9:
        case 0xa:
        case 0xb:
          return `${op} ${Rn},${prefix}${Utils.toHex(Op2)}`;
        case 0xd:
        case 0xf:
          return `${op} ${Rd},${prefix}${Utils.toHex(Op2)}`;
        default:
          return `${op} ${Rd},${Rn},${prefix}${Utils.toHex(Op2)}`;
      }
    }
    return [pc, op, Rd, Rn, Op2];
  }

  /**
   * @param {number} pc
   * @param {number} word
   * @param {boolean} toString
   * @return {Array|string}
   * @private
   */
  static _decodeDataTransfer(pc, word, toString=false) {
    let Rn, Rd, offset;
    let op = 'str';
    const I = (word >>> 25 & 1) === 1;
    const P = (word >>> 24 & 1) === 1;
    const U = (word >>> 23 & 1) === 1;
    if ((word >>> 20 & 1) === 1) op = 'ldr';
    Rn = `r${word >>> 16 & 0xf}`;
    Rd = `r${word >>> 12 & 0xf}`;
    if (!I) {
      offset = word & 0xfff;
    } else {
      throw new Error('Shifted register');
    }
    if (!U) offset = -offset;
    if (toString) {
      if (P) {
        return `${op} ${Rd},[${Rn},0x${Utils.toHex(offset)}]`;
      } else {
        return `${op} ${Rd},[${Rn}],0x${Utils.toHex(offset)}`;
      }
    }
    return [pc, op, Rd, Rn, P, offset];
  }
}