import ARM7TDMI from '../src/arm7tdmi';
import MMU from '../src/mmu';
import * as c from '../src/constants';
import Utils from '../src/utils';
import {describe, beforeEach, it} from 'mocha';
import {assert} from 'chai';

describe('ARM7TDMI tests', () => {
  let cpu;
  beforeEach(() => {
    cpu = new ARM7TDMI(new MMU());
    /**
     * @param {number} word
     * @param {number} offset
     */
    cpu.writeWord = function(word, offset) {
      this._mmu.writeWord(word, offset);
    };
    /**
     * @param {number} offset
     */
    cpu.readWord = function(offset) {
      return this._mmu.readWord(offset);
    };
    /**
     * @param {number} pc
     */
    cpu.setPC = function(pc) {
      this._r.pc = pc;
    };
    /**
     * @return {number} pc
     */
    cpu.getPC = function() {
      return this._r.pc;
    };
    /**
     * @param {number} word
     */
    cpu.setR14 = function(word) {
      this._r.r14 = word;
    };
    /**
     * @param {number} word
     */
    cpu.setCPSR = function(word) {
      this._r.cpsr = word;
    };
    cpu.getFetched = function() {
      return this._fetch;
    };
    cpu.getDecoded = function() {
      return this._decode;
    };
  });
  describe('Read/Write memory', () => {
    it('should read a memory array', () => {
      cpu.writeWord(0x01020304, 0x100);
      assert.equal(cpu.readWord(0x100), 0x04030201);
    });
  });
  describe('Registrers', () => {
    it('should read NZCVQ flags', () => {
      cpu.setCPSR(0xf8000000);
      assert.equal(cpu.getNZCVQ(), 0b11111);
    });
  });
  describe('Instruction pipeline', () => {
    it('should fetch, decode and execute an instruction', () => {
      const pc = 0;
      cpu.setPC(pc);
      cpu.writeWord(0x180000ea, pc);
      cpu
        .fetch()
        .decode()
        .execute();
      assert.deepEqual(cpu.getFetched(), 0xea000018);
      assert.deepEqual(cpu.getDecoded(), [0x68]);
      assert.equal(cpu.getPC(), 0x68);
    });
  });
  describe('Branch', () => {
    it('should branch forward', () => {
      const pc = 0;
      const offset = 0x0a000000; // 10
      const calcOffset = Utils.toSigned(Utils.reverseBytes(offset))*4 + c.ARM_INSTR_LENGTH*2;
      cpu.setPC(pc);
      cpu.writeWord(0x000000ea + offset, pc);
      cpu.fetch().decode().execute();
      assert.equal(calcOffset, 10*4 + c.ARM_INSTR_LENGTH*2);
      assert.equal(cpu.getPC(), pc + calcOffset);
    });
    it('should branch backwards', () => {
      const pc = 0x100;
      const offset = 0xf6ffff00; // -10
      const calcOffset = Utils.toSigned(Utils.reverseBytes(offset))*4 + c.ARM_INSTR_LENGTH*2;
      cpu.setPC(pc);
      cpu.writeWord(0x000000ea + offset, pc);
      cpu.fetch().decode().execute();
      assert.equal(calcOffset, -10*4 + c.ARM_INSTR_LENGTH*2);
      assert.equal(cpu.getPC(), pc + calcOffset);
    });
    it('should branch to the same address', () => {
      const pc = 0x100;
      const offset = 0xfeffff00; // -2
      const calcOffset = Utils.toSigned(Utils.reverseBytes(offset))*4 + c.ARM_INSTR_LENGTH*2;
      cpu.setPC(pc);
      cpu.writeWord(0x000000ea + offset, pc);
      cpu.fetch().decode().execute();
      assert.equal(calcOffset, 0);
      assert.equal(cpu.getPC(), pc);
    });
    // TODO: test offsets in memory boundaries.
  });
  describe('Compare', () => {
    it('should compare two numbers', () => {
      cpu.setR14(0);
      cpu.writeWord(0x00005ee3);
      cpu.fetch().decode().execute();
      assert.equal(cpu.getNZCVQ(), 0b01000);
    });
  });
});