import {describe, beforeEach, it} from 'mocha';
import {assert} from 'chai';
import MMU from '../src/mmu';
import * as c from '../src/constants';

describe('MMU', () => {
  let mmu;
  const rom = new Uint8Array(c.EXT_MEMORY_SIZE);
  rom[0] = 1;
  rom[1] = 2;
  rom[2] = 3;
  rom[3] = 4;
  beforeEach( () => {
    mmu = new MMU(rom);
  });
  it('should write/read a byte', () => {
    mmu.writeByte(1, 0);
    assert.equal(mmu.readByte(0), 1);
  });
  it('should write/read a word', () => {
    mmu.writeWord(0x78563412, 0);
    assert.equal(mmu.readWord(0), 0x12345678);
  });
  it('should read from external memory', () => {
    assert.equal(mmu.readByte(0x08000000), 1);
    assert.equal(mmu.readWord(0x08000000), 0x04030201);
  });
  it('should write/read an array', () => {
    const array = new Uint8Array(new Buffer('1234567890abcdef', 'hex'));
    mmu.writeArray(array, 0);
    assert.equal(mmu.readWord(0), 0x78563412);
    assert.equal(mmu.readWord(4), 0xefcdab90);
    assert.deepEqual(mmu.readArray(0/*offset*/, 2/*size*/), [0x78563412, 0xefcdab90]);
  });
  it('should prohibit reads outside memory', () => {
    assert.throws( () => mmu.readByte(0x10000000), Error);
    assert.throws( () => mmu.readByte(-1), Error);
    assert.throws( () => mmu.readWord(0x10000000), Error);
    assert.throws( () => mmu.readWord(-1), Error);
    assert.throws( () => mmu.readArray(0x10000000, 1), Error);
  });
  it('should prohibit writes outside memory', () => {
    assert.throws( () => mmu.writeByte(1, c.MEMORY_SIZE), Error);
    assert.throws( () => mmu.writeByte(1, -1), Error);
    assert.throws( () => mmu.writeWord(0x12345678, c.MEMORY_SIZE), Error);
    assert.throws( () => mmu.writeWord(0x12345678, -1), Error);
  });
  it('should prohibit writing invalid values', () => {
    assert.throws( () => mmu.writeByte(0x100, 0), Error);
    assert.throws( () => mmu.writeByte(-1, 0), Error);
    assert.throws( () => mmu.writeWord(0x100000000, 0), Error);
    assert.throws( () => mmu.writeWord(-1, 0), Error);
  });
});