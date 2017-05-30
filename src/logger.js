import Utils from './utils';

export default class Logger {

  static error(msg) {
    console.log(msg);
  }

  static info(msg) {
    console.info(msg);
  }

  /**
   * @param {number} pc
   * @param {number} opcode
   * @param {Array} operands
   */
  static instr(pc, opcode, operands) {
    console.info(` ${Utils.to32hex(pc)}  ${opcode} ${operands.map( (operand) => Utils.toHex(operand) ).toString()}`);
  }

  /**
   * @param {number} pc
   * @param {number} word
   */
  static fetched(pc, word) {
    console.info(`(${Utils.to32hex(pc)}) -> ${Utils.to32hex(word)}`);
  }
}