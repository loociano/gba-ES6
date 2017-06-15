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
    const cond = c.CONDS[(word >>> 28 & 0xf)];
    switch (word >>> 24 & 0xf) {
      case 0: // DataProc
      case 1:
      case 2:
      case 3:
        return Decoder._decodeDataProc(addr, word, cond);
      case 4: // SingleDataTransfer
      case 5:
        return Decoder._decodeDataTransfer(addr, word);
      case 8:
      case 9:
        return Decoder._decodeBlockDataTransfer(addr, word, cond);
      case 0xa: // Branch
      case 0xb:
        return Decoder._decodeBranch(addr, word);
      default:
        return Decoder._decodeUnknown(addr);
    }
  }

  /**
   * @param {number} addr
   * @param {number} word
   * @param {string} cond
   * @return {Object}
   * @private
   */
  static _decodeBlockDataTransfer(addr, word, cond) {
    const L = (word >>> 20 & 1) === 1;
    const Rn = `r${word >>> 16 & 0xf}`;
    const Rlist = word & 0xffff;
    const op = L ? 'pop' : 'push';

    const toString = `${op} ${this.decodeRlist(Rlist)}`;
    return {addr, cond, op, Rn, Rlist, toString};
  }

  /**
   * @param {number} Rlist
   * @return {string} stringyfied list of registers, shortened with dashes if they are contiguous.
   */
  static decodeRlist(Rlist) {
    const result = [];
    const stack = [];
    for (let b = 0; b < 0x10; b++) {
      if ((Rlist >>> b & 1) === 1) {
        if (stack.length === 0) {
          stack.push(b);
        }
      } else {
        if (stack.length === 1) {
          let first = stack.pop();
          if (b === first + 2) {
            result.push(`r${first}`);
            result.push(`r${first+1}`);
          } else if (b > first + 1) {
            result.push(`r${first}-r${b - 1}`);
          } else {
            result.push(`r${first}`);
          }
        }
      }
    }
    return result.join(',');
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
   * @param {string} cond
   * @return {Object} instruction parameters
   * @private
   */
  static _decodeDataProc(addr, word, cond) {
    let op, Rd, Rn, Rm, Op2 = 0, Psr, _flg, _ctl, toString;
    const immediate = (word >>> 25 & 1) === 1;
    const opcode = word >>> 21 & 0xf;
    let setCondition = (word >>> 20 & 1) === 1;
    Rn = `r${word >>> 16 & 0xf}`;
    Rd = `r${word >>> 12 & 0xf}`;
    if (Rn === 'r15') Rn = 'pc';
    if (Rd === 'r15') Rd = 'pc';
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
    if (opcode > 7 && opcode < 0xc) {
      if (!setCondition) {
        // PRS instructions
        op = (word >>> 21 & 1) === 0 ? 'mrs' : 'msr';
        Psr = (word >>> 22 & 1) === 0 ? 'cpsr' : 'spsr';
        if (op === 'mrs' && Rn !== 'pc') {
          op = 'swp';
        } else if (op === 'msr') {
          _flg = (word >>> 19 & 1) === 1;
          _ctl = (word >>> 16 & 1) === 1;
          if (immediate) {
            // TODO
          } else {
            Rm = `r${word & 0xf}`;
          }
        }
      }
    }
    let prefix = '';
    if (typeof Op2 === 'number') prefix = '0x';
    if (cond === 'al') cond = '';
    switch(opcode) {
      case 8:
      case 9:
      case 0xa:
      case 0xb:
        if (op === 'mrs') {
          toString = `${op}${cond} ${Rd},${Psr}`;
        } else if (op === 'msr') {
          let fields = '';
          if (_flg) fields += 'f';
          if (_ctl) fields += 'c';
          toString = `${op}${cond} ${Psr}_${fields},${Rm}`;
        } else {
          toString = `${op}${cond} ${Rn},${prefix}${Utils.toHex(Op2)}`;
        }
        break;
      case 0xd:
      case 0xf:
        toString = `${op}${cond} ${Rd},${prefix}${Utils.toHex(Op2)}`;
        break;
      default:
        toString = `${op}${cond} ${Rd},${Rn},${prefix}${Utils.toHex(Op2)}`;
        break;
    }
    if (cond === '') cond = 'al';
    return {addr, op, Rd, Rn, Rm, Op2, _flg, _ctl, setCondition, Psr, cond, toString};
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