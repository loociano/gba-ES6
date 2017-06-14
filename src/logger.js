import Utils from './utils';

export default class Logger {

  static error(msg) {
    console.log(msg);
  }

  static info(msg) {
    console.info(msg);
  }

  /**
   * @param {number} addr
   * @param {number} opcode
   * @param {Object} operands
   */
  static instr(addr, opcode, operands) {
    const array = [];
    for (let val in operands) {
      array.push(Utils.toHex(operands[val]));
    }
    console.info(` ${Utils.to32hex(addr)}  ${opcode} ${array.join(' ')}`);
  }

  /**
   * @param {number} pc
   * @param {number} word
   */
  static fetched(pc, word) {
    console.info(`(${Utils.to32hex(pc)}) -> ${Utils.to32hex(word)}`);
  }
}