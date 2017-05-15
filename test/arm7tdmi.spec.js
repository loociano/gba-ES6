import ARM7TDMI from '../src/arm7tdmi';
import {describe, beforeEach, it} from 'mocha';
import {assert} from 'chai';

describe('ARM7TDMI tests', () => {
  let cpu;

  beforeEach(() => {
    cpu = new ARM7TDMI();
  });

  describe('Read/Write memory', () => {
    it('should read a memory array', () => {
      cpu.writeArray([1, 2, 3, 4], 0x100);
      assert.deepEqual(cpu.readArray(0x100, 0x104), [4, 3, 2, 1]);
    });
  })
});