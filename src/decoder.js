import * as c from './constants';
import Utils from './utils';
import Logger from './logger';

export default class Decoder {

  /**
   * @param {number} addr
   * @param {number} word
   * @return {Object}
   */
  static decode(addr, word) {
    switch (word >>> 24 & 0xf) {
      case 0xa: // Branch
        return Decoder._decodeBranch(addr, word);
      case 0: // DataProc
      case 1:
      case 2:
      case 3:
        return Decoder._decodeDataProc(addr, word);
      case 4: // SingleDataTransfer
      case 5:
        return Decoder._decodeDataTransfer(addr, word);
      default:
        return Decoder._decodeUnknown(addr);
    }
  }

  /**
   * @param addr
   * @return {Object}
   * @private
   */
  static _decodeUnknown(addr) {
    const op = '???';
    return {addr, op, toString: op};
  }

  /**
   * @param {number} addr
   * @param {number} word
   * @return {Object}
   * @private
   */
  static _decodeBranch(addr, word) {
    const nn = word & 0x00ffffff;
    const sOffset = addr + c.ARM_INSTR_LENGTH*2 + (Utils.toSigned(nn)*4);
    return {addr, op: 'b', sOffset, toString: `b 0x${Utils.toHex(sOffset)}`};
  }

  /**
   * @param {number} addr
   * @param {number} word
   * @return {Object} instruction parameters
   * @private
   */
  static _decodeDataProc(addr, word) {
    let op, Rd, Rn, Rm, Op2 = 0, toString;
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
    let prefix = '';
    if (typeof Op2 === 'number') prefix = '0x';
    switch(opcode) {
      case 8:
      case 9:
      case 0xa:
      case 0xb:
        toString = `${op} ${Rn},${prefix}${Utils.toHex(Op2)}`;
        break;
      case 0xd:
      case 0xf:
        toString = `${op} ${Rd},${prefix}${Utils.toHex(Op2)}`;
        break;
      default:
        toString = `${op} ${Rd},${Rn},${prefix}${Utils.toHex(Op2)}`;
        break;
    }
    return {addr, op, Rd, Rn, Op2, toString};
  }

  /**
   * @param {number} addr
   * @param {number} word
   * @return {Object}
   * @private
   */
  static _decodeDataTransfer(addr, word) {
    let Rn, Rd, offset, toString;
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
    if (pre) {
      toString = `${op} ${Rd},[${Rn},0x${Utils.toHex(offset)}]`;
    } else {
      toString = `${op} ${Rd},[${Rn}],0x${Utils.toHex(offset)}`;
    }
    return {addr, op, Rd, Rn, pre, offset, toString};
  }
}