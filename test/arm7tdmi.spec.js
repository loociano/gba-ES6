import ARM7TDMI from '../src/arm7tdmi';
import * as c from '../src/constants';
import Utils from '../src/utils';
import {describe, beforeEach, it} from 'mocha';
import {assert} from 'chai';

describe('ARM7TDMI tests', () => {
  let cpu;
  beforeEach(() => {
    cpu = new ARM7TDMI();
    /**
     * @param {number} word
     * @param {number} pos
     * @return {void}
     */
    cpu.writeWord = function(word, pos) {
      this._memory[pos] = word >> 24 & 0xff;
      this._memory[pos+1] = word >> 16 & 0xff;
      this._memory[pos+2] = word >> 8 & 0xff;
      this._memory[pos+3] = word & 0xff;
    };
    /**
     * @param {number} begin
     * @param {number} end
     * @return {Array}
     */
    cpu.readArray = function(begin, end) {
      const length = end - begin;
      const array = [];
      for(let i = 0; i < length; i += 4){
        const offset = begin + i;
        array.push(this._memory[offset + 3]);
        array.push(this._memory[offset + 2]);
        array.push(this._memory[offset + 1]);
        array.push(this._memory[offset]);
      }
      return array;
    }
  });
  describe('Read/Write memory', () => {
    it('should read a memory array', () => {
      cpu.writeWord(0x01020304, 0x100);
      assert.deepEqual(cpu.readArray(0x100, 0x104), [4, 3, 2, 1]);
    });
  });
  describe('Instruction pipeline', () => {
    it('should fetch, decode and execute an instruction', () => {
      const pc = 0;
      cpu.pc = pc;
      cpu.writeWord(0x180000ea, pc);
      cpu
        .fetch()
        .decode()
        .execute();
      assert.deepEqual(cpu.getFetched(), 0xea000018);
      assert.deepEqual(cpu.getDecoded(), ['b', 0x68]);
      assert.equal(cpu.pc, 0x68);
    });
  });
  describe('Branch', () => {
    it('should branch forward', () => {
      const pc = 0;
      const offset = 0x0a000000; // 10
      const calcOffset = Utils.toSigned(Utils.reverseBytes(offset))*4 + c.ARM_INSTR_LENGTH*2;
      cpu.pc = pc;
      cpu.writeWord(0x000000ea + offset, pc);
      cpu.fetch().decode().execute();
      assert.equal(calcOffset, 10*4 + c.ARM_INSTR_LENGTH*2);
      assert.equal(cpu.pc, pc + calcOffset);
    });
    it('should branch backwards', () => {
      const pc = 0x100;
      const offset = 0xf6ffff00; // -10
      const calcOffset = Utils.toSigned(Utils.reverseBytes(offset))*4 + c.ARM_INSTR_LENGTH*2;
      cpu.pc = pc;
      cpu.writeWord(0x000000ea + offset, pc);
      cpu.fetch().decode().execute();
      assert.equal(calcOffset, -10*4 + c.ARM_INSTR_LENGTH*2);
      assert.equal(cpu.pc, pc + calcOffset);
    });
    it('should branch to the same address', () => {
      const pc = 0x100;
      const offset = 0xfeffff00; // -2
      const calcOffset = Utils.toSigned(Utils.reverseBytes(offset))*4 + c.ARM_INSTR_LENGTH*2;
      cpu.pc = pc;
      cpu.writeWord(0x000000ea + offset, pc);
      cpu.fetch().decode().execute();
      assert.equal(calcOffset, 0);
      assert.equal(cpu.pc, pc);
    });
  });
});