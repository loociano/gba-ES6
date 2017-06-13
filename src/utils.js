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
    const mask = 1 << (unsigned.toString(16).replace(/^(.(..)*)$/, "0$1").length*4/*bits/digit*/ - 1) >>> 0;
    return -((unsigned & mask) >>> 0) + (unsigned & ~mask);
  }

  static toUnsigned(signed) {
    if (signed < 0) return 0xffffffff + signed + 1;
    return signed;
  }

  /**
   * @param {number} number
   * @return {string} hex string
   */
  static toHex(number) {
    return number.toString(16).replace(/^(.(..)*)$/, "0$1");
  }

  /**
   * @param hexString {string}
   * @return {number}
   */
  static hexStrToNum(hexString) {
    return parseInt('0x'+hexString);
  }

  /**
   * @param {number} number
   * @return {string} padded hex string (32 bits)
   */
  static to32hex(number) {
    const hex = number.toString(16);
    if (hex.length < 8){
      return `${'0'.repeat(8 - hex.length)}${hex}`;
    } else {
      return hex;
    }
  }

  /**
   * @param {number} word
   * @param {number} shift
   * @return {number} rotated word
   */
  static ror(word, shift) {
    return ((word >>> shift) | (word << (32 - shift))) >>> 0;
  }
}