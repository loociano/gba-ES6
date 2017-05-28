import {describe, beforeEach, it} from 'mocha';
import {assert} from 'chai';
import MMU from '../src/mmu';
import * as c from '../src/constants';

describe('MMU', () => {
  let mmu;
  beforeEach( () => {
    mmu = new MMU();
  });
  it('should write/read a byte', () => {
    mmu.writeByte(1, 0);
    assert.equal(mmu.readByte(0), 1);
  });
  it('should write/read a word', () => {
    mmu.writeWord(0x78563412, 0);
    assert.equal(mmu.readWord(0), 0x12345678);
  });
  it('should write/read an array', () => {
    const array = new Uint8Array(new Buffer('1234567890abcdef', 'hex'));
    mmu.writeArray(array, 0);
    assert.equal(mmu.readWord(0), 0x78563412);
    assert.equal(mmu.readWord(4), 0xefcdab90);
  });
  it('should prohibit reads outside memory', () => {
    assert.throws( () => mmu.readByte(c.MEMORY_SIZE), Error);
    assert.throws( () => mmu.readByte(-1), Error);
    assert.throws( () => mmu.readWord(c.MEMORY_SIZE), Error);
    assert.throws( () => mmu.readWord(-1), Error);
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
  })
});