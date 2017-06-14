import * as c from './constants';
import Utils from './utils';
import Logger from './logger';

export default class Decoder {

  /**
   * @param {number} addr
   * @param {number} word
   * @param {boolean} toString
   * @return {Object}
   */
  static decode(addr, word, toString=false) {
    switch (word >>> 24 & 0xf) {
      case 0xa: // Branch
        return Decoder._decodeBranch(addr, word, toString);
      case 0: // DataProc
      case 1:
      case 2:
      case 3:
        return Decoder._decodeDataProc(addr, word, toString);
      case 4: // SingleDataTransfer
      case 5:
        return Decoder._decodeDataTransfer(addr, word, toString);
      default:
        return Decoder._decodeUnknown(addr, toString);
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
   * @param addr
   * @param {boolean} toString
   * @return {Object}
   * @private
   */
  static _decodeUnknown(addr, toString=false) {
    const op = '???';
    if (toString) return op;
    return {addr, op};
  }

  /**
   * @param {number} addr
   * @param {number} word
   * @param {boolean} toString
   * @return {Object}
   * @private
   */
  static _decodeBranch(addr, word, toString=false) {
    const nn = word & 0x00ffffff;
    const sOffset = addr + c.ARM_INSTR_LENGTH*2 + (Utils.toSigned(nn)*4);
    const decoded = {addr, op: 'b', sOffset};
    if (toString) return `b 0x${Utils.toHex(sOffset)}`;
    return decoded;
  }

  /**
   * @param {number} addr
   * @param {number} word
   * @param {boolean} toString
   * @return {Object} instruction parameters
   * @private
   */
  static _decodeDataProc(addr, word, toString=false) {
    let op, Rd, Rn, Rm, Op2 = 0;
    const immediate = word >>> 25 & 1 === 1;
    const opcode = word >>> 21 & 0xf;
    Rn = `r${word >>> 16 & 0xf}`;
    Rd = `r${word >>> 12 & 0xf}`;
    if (immediate) {
      Op2 = Utils.ror(word & 0xff, (word >>> 8 & 0xf)*2);
    } else {
      const R = word >>> 4 & 1 === 1;
      Rm = `r${word & 0xf}`;
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
    return {addr, op, Rd, Rn, Op2};
  }

  /**
   * @param {number} addr
   * @param {number} word
   * @param {boolean} toString
   * @return {Object}
   * @private
   */
  static _decodeDataTransfer(addr, word, toString=false) {
    let Rn, Rd, offset;
    let op = 'str';
    const I = (word >>> 25 & 1) === 1;
    const pre = (word >>> 24 & 1) === 1;
    const U = (word >>> 23 & 1) === 1;
    if ((word >>> 20 & 1) === 1) op = 'ldr';
    Rn = `r${word >>> 16 & 0xf}`;
    Rd = `r${word >>> 12 & 0xf}`;
    if (Rn === 'r15') Rn = 'pc';
    if (Rd === 'r15') Rd = 'pc';
    if (!I) {
      offset = word & 0xfff;
    } else {
      throw new Error('Shifted register');
    }
    if (!U) offset = -offset;
    if (toString) {
      if (pre) {
        return `${op} ${Rd},[${Rn},0x${Utils.toHex(offset)}]`;
      } else {
        return `${op} ${Rd},[${Rn}],0x${Utils.toHex(offset)}`;
      }
    }
    return {addr, op, Rd, Rn, pre, offset};
  }
}