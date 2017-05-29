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
    cpu.setR1 = function(word) { this._r.r1 = word; };
    cpu.setR2 = function(word) { this._r.r2 = word; };
    cpu.setR3 = function(word) { this._r.r3 = word; };
    cpu.setR14 = function(word) { this._r.r14 = word; };
    cpu.getR14 = function() { return this._r.r14 };
    /**
     * @param {number} word
     */
    cpu.setCPSR = function(word) {
      this._r.cpsr = word;
    };
    cpu.getFetched = function() {
      return this._fetch;
    };
    cpu.setFetched = function(value) {
      this._fetch = value;
      this._logPC = 0;
    };
    cpu.getDecoded = function() {
      return this._decode;
    };
    cpu.setDecoded = function(array) {
      this._decode = array;
      this._logPC = 0;
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
    it('should fetch, decode and execute an branching instruction', () => {
      const pc = 0;
      cpu.setPC(pc);
      cpu.writeWord(0x180000ea, pc); // b 0x68
      cpu.writeWord(0x00005ee3, 0x68); // cmp r14,#0
      cpu.writeWord(0x000000ea, 0x6c); // b 0x74
      cpu.cycle(); // fetch
      assert.equal(cpu.getFetched(), 0xea000018);
      assert.deepEqual(cpu.getDecoded(), []);
      assert.equal(cpu.getPC(), pc + c.ARM_INSTR_LENGTH); // should be c.ARM_INSTR_LENGTH*2 but cpu is starting up.
      cpu.cycle(); // decode, since it's branching fetch from destination
      assert.equal(cpu.getFetched(), 0xe35e0000);
      assert.deepEqual(cpu.getDecoded(), ['b', 0x68]);
      assert.equal(cpu.getPC(), pc + c.ARM_INSTR_LENGTH*3);
      cpu.cycle(); // execute branch, fetch from destination + 4
      assert.equal(cpu.getFetched(), 0xea000000);
      assert.deepEqual(cpu.getDecoded(), ['cmp', 0, 0]);
      assert.equal(cpu.getPC(), 0x68 + c.ARM_INSTR_LENGTH*2);
    });
    it('should execute instructions in a pipeline', () => {
      const pc = 0;
      cpu.setPC(pc + c.ARM_INSTR_LENGTH*2); // PC points always +2
      cpu.setFetched(0xe3510000);
      cpu.setDecoded(['cmp', 0, 0]);
      cpu.setR1(1);
      cpu.setR2(2);
      cpu.setR3(3);
      cpu.writeWord(0x000052e3, pc + c.ARM_INSTR_LENGTH); // cmp r2,#0
      cpu.writeWord(0x000053e3, pc + c.ARM_INSTR_LENGTH*2); // cmp r3,#0
      cpu.writeWord(0x000054e3, pc + c.ARM_INSTR_LENGTH*4); // cmp r4,#0

      cpu.cycle();
      assert.equal(cpu.getPC(), pc + c.ARM_INSTR_LENGTH*4);
      assert.equal(cpu.getFetched(), 0xe3530000);
      assert.deepEqual(cpu.getDecoded(), ['cmp', 1, 0]);

      cpu.cycle();
      assert.equal(cpu.getPC(), pc + c.ARM_INSTR_LENGTH*6);
      assert.equal(cpu.getFetched(), 0xe3540000);
      assert.deepEqual(cpu.getDecoded(), ['cmp', 3, 0]);
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
      const pc = cpu.getPC();
      cpu.setR14(1);
      cpu.setDecoded(['cmp', cpu.getR14(), 1]);

      cpu.cycle();
      assert.equal(cpu.getNZCVQ(), 0b01000);
      assert.equal(cpu.getPC(), pc + c.ARM_INSTR_LENGTH*2);
    });
  });
});