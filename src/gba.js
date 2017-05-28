import * as c from './constants';
import ARM7TDMI from './arm7tdmi';

/**
 * GBA system
 */
export default class GBA {

  /**
   * @param BIOS
   * @param ROM
   */
  constructor(BIOS, ROM) {
    this._rom = ROM;
    this._cpu = new ARM7TDMI();
    this._cpu.setBIOS(BIOS);
  }

  start(){
    while (true) {
      this._cpu.fetch().decode().execute();
    }
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