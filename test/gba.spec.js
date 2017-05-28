import GBA from '../src/gba';
import {describe, beforeEach, it} from 'mocha';
import {assert} from 'chai';

describe('GBA tests', () => {
  let gba, rom;
  const bios = new Uint8Array(0);
  beforeEach(() => {
    rom = new Uint8Array(new Buffer('1234567824ffae51699aa2213d84820a84e409ad11248b98c0817f21a352be199309ce2010464a4' +
      'af82731ec58c7e83382e3cebf85f4df94ce4b09c194568ac01372a7fc9f844d73a3ca9a615897a327fc039876231dc7610304ae56bf38' +
      '840040a70efdff52fe036f9530f197fbc08560d68025a963be03014e38e2f9a234ffbb3e0344780090cb88113a9465c07c6387f03cafd' +
      '625e48b380aac7221d4f8074c554349414e4f525542494f', 'hex'));
    gba = new GBA(bios, rom);
  });
  describe('Cartridge Header', () => {
    it('should read the ROM entry point', () => {
      assert.deepEqual(gba.getCartridgeHeader().getEntryPoint(), [0x78, 0x56, 0x34, 0x12]);
    });
    it('should read the Nintendo logo', () => {
      assert.deepEqual(gba.getCartridgeHeader().getNintendoLogo(), Array.from(new Buffer('51aeff2421a29a690a82843dad0' +
        '9e484988b2411217f81c019be52a320ce09934a4a4610ec3127f833e8c758bfcee38294dff485c1094bcec08a5694fca77213734d849' +
        'f619acaa327a39758769803fc61c71d2356ae0403008438bffd0ea74003fe52fff130956f85c0fb972580d66003be63a9e2384e01ff3' +
        '4a2f944033ebbcb900078943a1188637cc065af3cf0878be425d672ac0a3807f8d421', 'hex')));
    });
    it('should read the game title', () => {
      assert.equal(gba.getCartridgeHeader().getGameTitle(), 'LUCIANORUBIO');
    });
  });
});