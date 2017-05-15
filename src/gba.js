import * as c from './constants';

/**
 * GBA system
 */
export default class GBA {

  /**
   * @param ARM7TDMI
   * @param ROM
   */
  constructor(ARM7TDMI, ROM) {
    this._rom = ROM;
    this._cpu = ARM7TDMI;
  }

  /**
   * @return {Object} CartridgeHeader
   */
  getCartridgeHeader() {
    return {
      _rom: this._rom,
      /**
       * @return {Array}
       */
      getEntryPoint: function() {
        return Array.from(this._rom.subarray(c.ROM_HEADER_ENTRYPOINT_START, c.ROM_HEADER_ENTRYPOINT_END)).reverse();
      },
      /**
       * @return {Array}
       */
      getNintendoLogo: function() {
        const ROM_HEADER_LENGTH = c.ROM_HEADER_LOGO_END - c.ROM_HEADER_LOGO_START;
        const array = [];
        for(let i = 0; i < ROM_HEADER_LENGTH; i += 4){
          array.push(this._rom[c.ROM_HEADER_LOGO_START + i + 3]);
          array.push(this._rom[c.ROM_HEADER_LOGO_START + i + 2]);
          array.push(this._rom[c.ROM_HEADER_LOGO_START + i + 1]);
          array.push(this._rom[c.ROM_HEADER_LOGO_START + i + 0]);
        }
        return array;
      },
      /**
       * @return {string} title
       */
      getGameTitle: function() {
        return Array.from(this._rom.subarray(c.ROM_HEADER_TITLE_START, c.ROM_HEADER_TITLE_END))
          .map( i => String.fromCharCode(i))
          .join('');
      }
    };
  }
}