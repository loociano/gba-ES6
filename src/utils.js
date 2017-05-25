export default class Utils {
  /**
   * @param {number} number
   * @param {number} number of bytes in output
   * @return {number} number with reversed bytes
   */
  static reverseBytes(number, numOutputBytes=0) {
    let output = number.toString(16).replace(/^(.(..)*)$/, "0$1").match(/../g).reverse().join('');
    if (numOutputBytes > 0){
      output += '0'.repeat(numOutputBytes*2 - output.length);
    }
    return parseInt(output, 16);
  }

  /**
   * @param unsigned byte
   * @return {number} signed byte (two's complement).
   */
  static toSigned(unsigned) {
    const mask = 1 << (unsigned.toString(16).replace(/^(.(..)*)$/, "0$1").length*4/*bits/digit*/ - 1);
    return -(unsigned & mask) + (unsigned & ~mask);
  }
}