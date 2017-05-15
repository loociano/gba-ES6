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
  });

  describe('Instruction pipeline', () => {
    it('should fetch, decode and execute an instruction', () => {
      cpu.pc = 0x100;
      cpu.writeArray([0x18, 0, 0, 0xea], 0x100);
      cpu
        .fetch()
        .decode()
        .execute();
      assert.equal(cpu.pc, 0x68);
      assert.deepEqual(cpu.getFetched(), [0xea, 0, 0, 0x18]);
      assert.deepEqual(cpu.getDecoded(), ['b', 0x68]);
    })
  });
});