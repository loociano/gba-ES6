import ARM7TDMI from '../src/arm7tdmi';
import MMU from '../src/mmu';
import * as c from '../src/constants';
import Utils from '../src/utils';
import {describe, beforeEach, it} from 'mocha';
import {assert} from 'chai';

describe('ARM7TDMI tests', () => {
  let cpu;
  const rom = new Uint8Array(c.EXT_MEMORY_SIZE);
  beforeEach(() => {
    cpu = new ARM7TDMI(new MMU(rom));
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
    cpu.getR12 = function() { return this._r.r12; };
    cpu.setR14 = function(word) { this._r.r14 = word; };
    cpu.getR14 = function() { return this._r.r14 };
    /**
     * @param {number} word
     */
    cpu.setCPSR = function(word) {
      this._r.cpsr = word;
    };
    cpu.getFetched = function() {
      return this._fetched;
    };
    cpu.setFetched = function(pc, word) {
      this._fetched = [pc, word];
    };
    cpu.getDecoded = function() {
      return this._decoded;
    };
    cpu.setDecoded = function(array) {
      this._decoded = array;
    };

    cpu.writeWord(0, 0); // 0x0 nop
    cpu.writeWord(0, 4); // 0x4 nop
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
    it('should bootstrap correctly', () => {
      const pc = 0;
      cpu.writeWord(0x000051e3, pc); // cmp r1,#0
      cpu.writeWord(0x000052e3, pc+4); // cmp r2,#0
      cpu.writeWord(0x000053e3, pc+8);
      cpu.setR1(1);
      cpu.setR2(2);
      cpu.setR3(3);
      cpu.boot();

      cpu.cycle();
      assert.deepEqual(cpu.getFetched(), [8, 0xe3530000]);
      assert.deepEqual(cpu.getDecoded(), [4, 'cmp', 'r0', 2, 0]);
      assert.equal(cpu.getPC(), pc+12);
    });
    it('should execute instructions in a pipeline', () => {
      const pc = 0;
      cpu.setDecoded([0, 'cmp', 0, 0]);
      cpu.setFetched(4, 0xe3510000);
      cpu.setPC(pc + 8);
      cpu.setR1(1);
      cpu.setR2(2);
      cpu.setR3(3);
      cpu.writeWord(0x000053e3, pc + 8); // cmp r3,#0
      cpu.writeWord(0x000054e3, pc + 12); // cmp r4,#0

      cpu.cycle();
      assert.equal(cpu.getPC(), pc + 12);
      assert.deepEqual(cpu.getFetched(), [8, 0xe3530000]);
      assert.deepEqual(cpu.getDecoded(), [4, 'cmp', 'r0', 1, 0]);

      cpu.cycle();
      assert.equal(cpu.getPC(), pc + 16);
      assert.deepEqual(cpu.getFetched(), [12, 0xe3540000]);
      assert.deepEqual(cpu.getDecoded(), [8, 'cmp', 'r0', 3, 0]);
    });
    it('should fetch, decode and execute an branching instruction', () => {
      const pc = 0;
      cpu.setDecoded([0, 'nop']);
      cpu.setFetched(4, 0); // nop
      cpu.setPC(pc + 8);
      cpu.writeWord(0x180000ea, 8); // b 0x70
      cpu.writeWord(0x00005ee3, 0x70); // cmp r14,#0
      cpu.writeWord(0xffffffff, 0x74); // rubbish

      cpu.cycle();
      assert.deepEqual(cpu.getFetched(), [8, 0xea000018]);
      assert.deepEqual(cpu.getDecoded(), [4, 'nop']);
      assert.equal(cpu.getPC(), pc + 12);

      cpu.cycle();
      assert.deepEqual(cpu.getFetched(), [0x70, 0xe35e0000]);
      assert.deepEqual(cpu.getDecoded(), [8, 'b', 0x70]);
      assert.equal(cpu.getPC(), pc + 16);

      cpu.cycle(); // execute branch
      assert.deepEqual(cpu.getFetched(), [0x74, 0xffffffff]);
      assert.deepEqual(cpu.getDecoded(), [0x70, 'cmp', 'r0', 0, 0]);
      assert.equal(cpu.getPC(), 0x70 + 8);
    });
  });
  describe('Branch', () => {
    it('should branch forward', () => {
      const pc = 0;
      const offset = 0x0a000000; // 10
      const calcOffset = Utils.toSigned(Utils.reverseBytes(offset))*4 + 8 + 8;
      cpu.writeWord(0, 4);
      cpu.writeWord(0x000000ea + offset, 8);
      cpu.boot();

      cpu.cycle(); // fetch
      assert.deepEqual(cpu.getFetched(), [8, 0xea00000a]);
      assert.deepEqual(cpu.getDecoded(), [4, 'nop']);
      assert.equal(cpu.getPC(), pc + 12);

      cpu.cycle(); // decode
      assert.deepEqual(cpu.getFetched(), [0x38, 0]); // fetch from 10*4 + 8 + 8
      assert.deepEqual(cpu.getDecoded(), [8, 'b', 0x38]);
      assert.equal(cpu.getPC(), pc + 16);

      cpu.cycle(); // branch forward
      assert.equal(calcOffset, 0x38 /* 10*4 + pc + 8 */);
      assert.deepEqual(cpu.getFetched(), [0x38+4, 0]);
      assert.deepEqual(cpu.getDecoded(), [0x38, 'nop']);
      assert.equal(cpu.getPC(), 0x38 + 8);

      cpu.cycle();
      assert.deepEqual(cpu.getFetched(), [0x38+8, 0]);
      assert.deepEqual(cpu.getDecoded(), [0x38+4, 'nop']);
      assert.equal(cpu.getPC(), 0x38 + 12);
    });
    it('should branch backwards', () => {
      const pc = 0x100;
      const offset = 0xf6ffff00; // -10
      const calcOffset = Utils.toSigned(Utils.reverseBytes(offset))*4 + pc+8 + 8;
      cpu.setPC(pc + 8);
      cpu.writeWord(0x000000ea + offset, 0x108);

      cpu.cycle();
      assert.deepEqual(cpu.getFetched(), [0x108, 0xeafffff6]);
      assert.equal(cpu.getPC(), pc + 12);

      cpu.cycle();
      assert.deepEqual(cpu.getFetched(), [0xe8, 0]); // fetch from -10*4 + 8 + 0x108 = 0xe8
      assert.deepEqual(cpu.getDecoded(), [0x108, 'b', 0xe8]);
      assert.equal(cpu.getPC(), pc + 16);

      cpu.cycle(); // branch backwards
      assert.equal(calcOffset, 0xe8 /* -10*4 + 0x108 + 8 */);
      assert.deepEqual(cpu.getFetched(), [0xe8+4, 0]);
      assert.deepEqual(cpu.getDecoded(), [0xe8, 'nop']);
      assert.equal(cpu.getPC(), 0xe8 + 8);

      cpu.cycle();
      assert.deepEqual(cpu.getFetched(), [0xe8+8, 0]);
      assert.deepEqual(cpu.getDecoded(), [0xe8+4, 'nop']);
      assert.equal(cpu.getPC(), 0xe8 + 12);
    });
    it('should branch to the same address (stuck)', () => {
      const pc = 0x100;
      const offset = 0xfeffff00; // -2
      const calcOffset = Utils.toSigned(Utils.reverseBytes(offset))*4 + pc+8 + 8;
      cpu.setPC(pc + 8);
      cpu.writeWord(0x000000ea + offset, 0x108);

      cpu.cycle();
      assert.deepEqual(cpu.getFetched(), [0x108, 0xeafffffe]);
      assert.equal(cpu.getPC(), pc + 12);

      cpu.cycle();
      assert.deepEqual(cpu.getFetched(), [0x108, 0xeafffffe]); // fetch from -2*4 + 8 + 0x108 = 0x108
      assert.deepEqual(cpu.getDecoded(), [0x108, 'b', 0x108]);
      assert.equal(cpu.getPC(), pc + 16);

      cpu.cycle(); // branch at the same address
      assert.equal(calcOffset, 0x108 /* -2*4 + 0x108 + 8 */);
      assert.deepEqual(cpu.getFetched(), [0x108, 0xeafffffe]); // fetch again from 0x108
      assert.deepEqual(cpu.getDecoded(), [0x108, 'b', 0x108]);
      assert.equal(cpu.getPC(), 0x108 + 8);

      cpu.cycle(); // branch at the same address
      assert.deepEqual(cpu.getFetched(), [0x108, 0xeafffffe]); // fetch again from 0x108
      assert.deepEqual(cpu.getDecoded(), [0x108, 'b', 0x108]);
      assert.equal(cpu.getPC(), 0x108 + 8);
    });
    // TODO: test offsets in memory boundaries.
  });
  describe('Compare', () => {
    it('should compare two numbers', () => {
      const pc = cpu.getPC();
      cpu.setR14(1);
      cpu.setDecoded([0, 'cmp', 'r0', 1, 1]);

      cpu.cycle();
      assert.equal(cpu.getNZCVQ(), 0b01000);
      assert.equal(cpu.getPC(), pc + 4);
    });
  });
  describe('Store (move)', () => {
    it('should store an immediate value into a register', () => {
      const pc = cpu.getPC();
      cpu.writeWord(0x04e0a003, pc); // mov r14,4
      cpu.writeWord(0x00e0a003, pc+4); // mov r14,0  to test zero flag
      cpu.writeWord(0x01c3a003, pc+8); // mov r12,0x4000000 test rotated immediate

      cpu.cycle();
      assert.deepEqual(cpu.getFetched(), [pc, 0x03a0e004]);
      assert.equal(cpu.getPC(), pc + 4);

      cpu.cycle();
      assert.deepEqual(cpu.getFetched(), [pc+4, 0x03a0e000]);
      assert.deepEqual(cpu.getDecoded(), [pc, 'mov', 'r14', 0, 4]);
      assert.equal(cpu.getPC(), pc + 8);

      cpu.cycle();
      assert.deepEqual(cpu.getFetched(), [pc+8, 0x03a0c301]);
      assert.deepEqual(cpu.getDecoded(), [pc+4, 'mov', 'r14', 0, 0]);
      assert.equal(cpu.getR14(), 4);
      assert.equal(cpu.getNZCVQ(), 0b00000);
      assert.equal(cpu.getPC(), pc + 12);

      cpu.cycle();
      assert.deepEqual(cpu.getDecoded(), [pc+8, 'mov', 'r12', 0, 0x4000000]);
      assert.equal(cpu.getR14(), 0);
      assert.equal(cpu.getNZCVQ(), 0b01000);

      cpu.cycle();
      assert.equal(cpu.getR12(), 0x4000000);
      assert.equal(cpu.getNZCVQ(), 0b00000);
    });
  });
});