import * as c from './constants';
import Utils from './utils';
import Logger from './logger';

export default class Decoder {

  static decode(pc, word) {
    switch (word >>> 24 & 0xf) {
      case 0xa: // Branch
        return Decoder._decodeBranch(pc, word);
      case 0: // DataProc
      case 1:
      case 2:
      case 3:
        return Decoder._decodeDataProc(pc, word);
      case 4: // SingleDataTransfer
      case 5:
        return Decoder._decodeDataTransfer(pc, word);
      default:
        return Decoder._decodeUnknown(pc);
    }
  }

  static _decodeUnknown(pc) {
    return [pc, '???'];
  }

  /**
   * @param {number} pc
   * @param {number} word
   * @return {Array}
   * @private
   */
  static _decodeBranch(pc, word) {
    const offset = word & 0x00ffffff;
    return [pc, 'b', pc + c.ARM_INSTR_LENGTH*2 + (Utils.toSigned(offset)*4)];
  }

  /**
   * @param {number} pc
   * @param {number} word
   * @return {Array} instruction parameters
   * @private
   */
  static _decodeDataProc(pc, word) {
    let op, Rd, Rn, Op2;
    const opcode = word >>> 21 & 0xf;
    switch (opcode){
      case 9:
        op = 'teq'; break;
      case 0xa:
        op = 'cmp'; break;
      case 0xd:
        op = 'mov'; break;
      default:
        Logger.error(`Unknown DataProc opcode: ${Utils.toHex(opcode)}`);
        return Decoder._decodeUnknown(pc);
    }
    const immediate = word >>> 25 & 1 === 1;
    Rn = `r${word >>> 16 & 0xf}`;
    Rd = `r${word >>> 12 & 0xf}`;
    if (immediate) {
      Op2 = Utils.ror(word & 0xff, (word >>> 8 & 0xf)*2);
    } else {
      throw new Error('TODO: Op2 is a register');
    }
    return [pc, op, Rd, Rn, Op2];
  }

  /**
   * @param {number} pc
   * @param {number} word
   * @return {Array}
   * @private
   */
  static _decodeDataTransfer(pc, word) {
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
    return [pc, op, Rd, Rn, P, offset];
  }
}