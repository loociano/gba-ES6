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
   * @param {string} toString
   */
  static instr(addr, toString) {
    console.info(` ${Utils.to32hex(addr)}  ${toString}`);
  }

  /**
   * @param {number} pc
   * @param {number} word
   */
  static fetched(pc, word) {
    console.info(`(${Utils.to32hex(pc)}) -> ${Utils.to32hex(word)}`);
  }
}