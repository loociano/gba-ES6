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
    for (let r = 0; r < 16; r++) {
      cpu[`setR${r}`] = (word) => { cpu._r[`r${r}`] = word; };
      cpu[`getR${r}`] = () => cpu._r[`r${r}`];
    }
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
  describe('Registrers and flags', () => {
    it('should read NZCV flags', () => {
      cpu.setNZCV(0b1111);
      assert.equal(cpu.getNZCV(), 0b1111);
      cpu.setNZCV(0);
      assert.equal(cpu.getNZCV(), 0);
      cpu.setIFT(0b111);
      assert.equal(cpu.getIFT(), 0b111);
      cpu.setIFT(0);
      assert.equal(cpu.getIFT(), 0);
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

      cpu.execute();
      assert.deepEqual(cpu.getFetched(), [8, 0xe3530000]);
      assert.deepEqual(cpu.getDecoded(), {addr: 4, op: 'cmp', Rd: 'r0', Rn: 'r2', Op2: 0});
      assert.equal(cpu.getPC(), pc+12);
    });
    it('should execute instructions in a pipeline', () => {
      const pc = 0;
      cpu.setDecoded([0, 'cmp', 'r0', 'r0', 0]);
      cpu.setFetched(4, 0xe3510000);
      cpu.setPC(pc + 8);
      cpu.setR1(1);
      cpu.setR2(2);
      cpu.setR3(3);
      cpu.writeWord(0x000053e3, pc + 8); // cmp r3,#0
      cpu.writeWord(0x000054e3, pc + 12); // cmp r4,#0

      cpu.execute();
      assert.equal(cpu.getPC(), pc + 12);
      assert.deepEqual(cpu.getFetched(), [8, 0xe3530000]);
      assert.deepEqual(cpu.getDecoded(), {addr: 4, op: 'cmp', Rd: 'r0', Rn: 'r1', Op2: 0});

      cpu.execute();
      assert.equal(cpu.getPC(), pc + 16);
      assert.deepEqual(cpu.getFetched(), [12, 0xe3540000]);
      assert.deepEqual(cpu.getDecoded(), {addr: 8, op: 'cmp', Rd: 'r0', Rn: 'r3', Op2: 0});
    });
    it('should fetch, decode and execute an branching instruction', () => {
      const pc = 0;
      cpu.setDecoded({addr: 0, op:'???'});
      cpu.setFetched(4, 0xffffffff); // rubish
      cpu.setPC(pc + 8);
      cpu.writeWord(0x180000ea, 8); // b 0x70
      cpu.writeWord(0x00005ee3, 0x70); // cmp r14,#0
      cpu.writeWord(0xffffffff, 0x74); // rubbish

      cpu.execute();
      assert.deepEqual(cpu.getFetched(), [8, 0xea000018]);
      assert.deepEqual(cpu.getDecoded(), {addr: 4, op: '???'});
      assert.equal(cpu.getPC(), pc + 12);

      cpu.execute();
      assert.deepEqual(cpu.getFetched(), [0x70, 0xe35e0000]);
      assert.deepEqual(cpu.getDecoded(), {addr: 8, op: 'b', sOffset: 0x70});
      assert.equal(cpu.getPC(), pc + 16);

      cpu.execute(); // execute branch
      assert.deepEqual(cpu.getFetched(), [0x74, 0xffffffff]);
      assert.deepEqual(cpu.getDecoded(), {addr: 0x70, op: 'cmp', Rd: 'r0', Rn: 'r14', Op2: 0});
      assert.equal(cpu.getPC(), 0x70 + 8);
    });
  });
  describe('Branch', () => {
    it('should branch forward', () => {
      const pc = 0;
      const offset = 0x0a000000; // 10
      const calcOffset = Utils.toSigned(Utils.reverseBytes(offset))*4 + 8 + 8;
      cpu.writeWord(0xffffffff, 4); //rubish
      cpu.writeWord(0xffffffff, 0x38); //rubish
      cpu.writeWord(0xffffffff, 0x3c); //rubish
      cpu.writeWord(0xffffffff, 0x40); //rubish
      cpu.writeWord(0x000000ea + offset, 8);
      cpu.boot();

      cpu.execute(); // fetch
      assert.deepEqual(cpu.getFetched(), [8, 0xea00000a]);
      assert.deepEqual(cpu.getDecoded(), {addr: 4, op: '???'});
      assert.equal(cpu.getPC(), pc + 12);

      cpu.execute(); // decode
      assert.deepEqual(cpu.getFetched(), [0x38, 0xffffffff]); // fetch from 10*4 + 8 + 8
      assert.deepEqual(cpu.getDecoded(), {addr: 8, op: 'b', sOffset: 0x38});
      assert.equal(cpu.getPC(), pc + 16);

      cpu.execute(); // branch forward
      assert.equal(calcOffset, 0x38 /* 10*4 + pc + 8 */);
      assert.deepEqual(cpu.getFetched(), [0x38+4, 0xffffffff]);
      assert.deepEqual(cpu.getDecoded(), {addr: 0x38, op: '???'});
      assert.equal(cpu.getPC(), 0x38 + 8);

      cpu.execute();
      assert.deepEqual(cpu.getFetched(), [0x38+8, 0xffffffff]);
      assert.deepEqual(cpu.getDecoded(), {addr: 0x38+4, op: '???'});
      assert.equal(cpu.getPC(), 0x38 + 12);
    });
    it('should branch backwards', () => {
      const pc = 0x100;
      const offset = 0xf6ffff00; // -10
      const calcOffset = Utils.toSigned(Utils.reverseBytes(offset))*4 + pc+8 + 8;
      cpu.setPC(pc + 8);
      cpu.writeWord(0x000000ea + offset, 0x108);
      cpu.writeWord(0xffffffff, 0xe8); //rubish
      cpu.writeWord(0xffffffff, 0xec); //rubish
      cpu.writeWord(0xffffffff, 0xf0); //rubish

      cpu.execute();
      assert.deepEqual(cpu.getFetched(), [0x108, 0xeafffff6]);
      assert.equal(cpu.getPC(), pc + 12);

      cpu.execute();
      assert.deepEqual(cpu.getFetched(), [0xe8, 0xffffffff]); // fetch from -10*4 + 8 + 0x108 = 0xe8
      assert.deepEqual(cpu.getDecoded(), {addr: 0x108, op: 'b', sOffset: 0xe8});
      assert.equal(cpu.getPC(), pc + 16);

      cpu.execute(); // branch backwards
      assert.equal(calcOffset, 0xe8 /* -10*4 + 0x108 + 8 */);
      assert.deepEqual(cpu.getFetched(), [0xe8+4, 0xffffffff]);
      assert.deepEqual(cpu.getDecoded(), {addr: 0xe8, op: '???'});
      assert.equal(cpu.getPC(), 0xe8 + 8);

      cpu.execute();
      assert.deepEqual(cpu.getFetched(), [0xe8+8, 0xffffffff]);
      assert.deepEqual(cpu.getDecoded(), {addr: 0xe8+4, op: '???'});
      assert.equal(cpu.getPC(), 0xe8 + 12);
    });
    it('should branch to the same address (stuck)', () => {
      const pc = 0x100;
      const offset = 0xfeffff00; // -2
      const calcOffset = Utils.toSigned(Utils.reverseBytes(offset))*4 + pc+8 + 8;
      cpu.setPC(pc + 8);
      cpu.writeWord(0x000000ea + offset, 0x108);

      cpu.execute();
      assert.deepEqual(cpu.getFetched(), [0x108, 0xeafffffe]);
      assert.equal(cpu.getPC(), pc + 12);

      cpu.execute();
      assert.deepEqual(cpu.getFetched(), [0x108, 0xeafffffe]); // fetch from -2*4 + 8 + 0x108 = 0x108
      assert.deepEqual(cpu.getDecoded(), {addr: 0x108, op: 'b', sOffset: 0x108});
      assert.equal(cpu.getPC(), pc + 16);

      cpu.execute(); // branch at the same address
      assert.equal(calcOffset, 0x108 /* -2*4 + 0x108 + 8 */);
      assert.deepEqual(cpu.getFetched(), [0x108, 0xeafffffe]); // fetch again from 0x108
      assert.deepEqual(cpu.getDecoded(), {addr: 0x108, op: 'b', sOffset: 0x108});
      assert.equal(cpu.getPC(), 0x108 + 8);

      cpu.execute(); // branch at the same address
      assert.deepEqual(cpu.getFetched(), [0x108, 0xeafffffe]); // fetch again from 0x108
      assert.deepEqual(cpu.getDecoded(), {addr: 0x108, op: 'b', sOffset: 0x108});
      assert.equal(cpu.getPC(), 0x108 + 8);
    });
    // TODO: test offsets in memory boundaries.
  });
  describe('Compare', () => {
    it('should compare two numbers with positive result', () => {
      const pc = cpu.getPC();
      cpu.setR14(2);
      cpu.setDecoded({addr: 0, op: 'cmp', Rn: 'r14', Op2: 1});
      cpu.execute();
      assert.equal(cpu.getNZCV(), 0b0010);
      assert.equal(cpu.getPC(), pc + 4);
    });
    it('should compare two numbers with negative result', () => {
      cpu.setR14(1);
      cpu.setDecoded({addr: 0, op: 'cmp', Rn: 'r14', Op2: 2});
      cpu.execute();
      assert.equal(cpu.getNZCV(), 0b1000);
    });
    it('should compare two equal numbers', () => {
      cpu.setR14(1);
      cpu.setDecoded({addr: 0, op: 'cmp', Rn: 'r14', Op2: 1});
      cpu.execute();
      assert.equal(cpu.getNZCV(), 0b0110);
    });
    it('should compare a negative number', () => {
      cpu.setR14(0xffffffff); // -1
      cpu.setDecoded({addr: 0, op: 'cmp', Rn: 'r14', Op2: 1});
      cpu.execute();
      assert.equal(cpu.getNZCV(), 0b1010);
    });
    it('should compare with overflow', () => {
      cpu.setR14(0x80000000); // -MAX_SIGNED_VALUE
      cpu.setDecoded({addr: 0, op: 'cmp', Rn: 'r14', Op2: 1});
      cpu.execute();
      assert.equal(cpu.getNZCV(), 0b0011); // overflow: no way to represent -MAX -1 with 32 bits
    });
  });
  describe('Move', () => {
    it('should store an immediate value into a register', () => {
      const pc = cpu.getPC();
      cpu.writeWord(0x04e0a003, pc); // mov r14,4
      cpu.writeWord(0x00e0a003, pc+4); // mov r14,0  to test zero flag
      cpu.writeWord(0x01c3a003, pc+8); // mov r12,0x4000000 test rotated immediate

      cpu.execute();
      assert.deepEqual(cpu.getFetched(), [pc, 0x03a0e004]);
      assert.equal(cpu.getPC(), pc + 4);

      cpu.execute();
      assert.deepEqual(cpu.getFetched(), [pc+4, 0x03a0e000]);
      assert.deepEqual(cpu.getDecoded(), {addr: pc, op: 'mov', Rd: 'r14', Rn: 'r0', Op2: 4});
      assert.equal(cpu.getPC(), pc + 8);

      cpu.execute();
      assert.deepEqual(cpu.getFetched(), [pc+8, 0x03a0c301]);
      assert.deepEqual(cpu.getDecoded(), {addr: pc+4, op: 'mov', Rd: 'r14', Rn: 'r0', Op2: 0});
      assert.equal(cpu.getR14(), 4);
      assert.equal(cpu.getNZCV(), 0b0000);
      assert.equal(cpu.getPC(), pc + 12);

      cpu.execute();
      assert.deepEqual(cpu.getDecoded(), {addr: pc+8, op: 'mov', Rd: 'r12', Rn: 'r0', Op2: 0x4000000});
      assert.equal(cpu.getR14(), 0);
      assert.equal(cpu.getNZCV(), 0b0100);

      cpu.execute();
      assert.equal(cpu.getR12(), 0x4000000);
      assert.equal(cpu.getNZCV(), 0b0000);
    });
  });
  describe('Load', () => {
    it('should load a value from memory to register', () => {
      const pc = cpu.getPC();
      cpu.setR1(0x08000000);
      cpu.writeWord(0x000391e5, pc); // ldr r0,[r1,0x300]
      rom[0x300] = 0x12;
      rom[0x301] = 0x34;
      rom[0x302] = 0x56;
      rom[0x303] = 0x78;

      cpu.execute();
      assert.deepEqual(cpu.getFetched(), [pc, 0xe5910300]);

      cpu.execute();
      assert.deepEqual(cpu.getDecoded(), {addr: pc, op: 'ldr', Rd: 'r0', Rn: 'r1', pre: true, offset: 0x300});

      cpu.execute();
      assert.equal(cpu.getR0(), 0x78563412);
    });
  });
  describe('Data Processing (ALU)', () => {
    it('should test exclusive (XOR)', () => {
      const pc = cpu.getPC();
      cpu.setR0(1);
      cpu.writeWord(0x010030e3, pc); // teq r0,#1

      cpu.execute();
      assert.deepEqual(cpu.getFetched(), [pc, 0xe3300001]);

      cpu.execute();
      assert.deepEqual(cpu.getDecoded(), {addr: pc, op: 'teq', Rd: 'r0', Rn: 'r0', Op2: 1});

      cpu.execute(); // 1 XOR 1 = 0
      assert.equal(cpu.getR0(), 1, 'register unchanged');
      assert.equal(cpu.getNZCV(), 0b0100); // V unaffected
    });
  });
});