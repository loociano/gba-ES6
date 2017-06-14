import ARM7TDMI from '../src/arm7tdmi';
import MMUMock from './mocks/mmuMock';
import Utils from '../src/utils';
import Logger from '../src/logger';
import {describe, beforeEach, it} from 'mocha';
import {assert} from 'chai';

describe('ARM7TDMI tests', () => {
  let cpu, mmuMock;
  beforeEach(() => {
    Logger.instr = function() {};
    Logger.fetched = function() {};
    Logger.info = function() {};
    mmuMock = new MMUMock();
    cpu = new ARM7TDMI(mmuMock);
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
      mmuMock.writeWord(0xe3510000, pc); // cmp r1,#0
      mmuMock.writeWord(0xe3520000, pc+4); // cmp r2,#0
      mmuMock.writeWord(0xe3530000, pc+8);
      cpu.setR1(1);
      cpu.setR2(2);
      cpu.setR3(3);
      cpu.boot();

      cpu.execute();
      assert.deepEqual(cpu.getFetched(), [8, 0xe3530000]);
      assert.include(cpu.getDecoded(), {addr: 4, op: 'cmp', Rn: 'r2', Op2: 0});
      assert.equal(cpu.getPC(), pc+12);
    });
    it('should execute instructions in a pipeline', () => {
      const pc = 0;
      cpu.setDecoded({addr: 0, op: 'cmp', Rd: 'r0', Rn: 'r0', Op2: 0});
      cpu.setFetched(4, 0xe3510000);
      cpu.setPC(pc + 8);
      cpu.setR1(1);
      cpu.setR2(2);
      cpu.setR3(3);
      mmuMock.writeWord(0xe3530000, pc + 8); // cmp r3,#0
      mmuMock.writeWord(0xe3540000, pc + 12); // cmp r4,#0

      cpu.execute();
      assert.equal(cpu.getPC(), pc + 12);
      assert.deepEqual(cpu.getFetched(), [8, 0xe3530000]);
      assert.include(cpu.getDecoded(), {addr: 4, op: 'cmp', Rn: 'r1', Op2: 0});

      cpu.execute();
      assert.equal(cpu.getPC(), pc + 16);
      assert.deepEqual(cpu.getFetched(), [12, 0xe3540000]);
      assert.include(cpu.getDecoded(), {addr: 8, op: 'cmp', Rn: 'r3', Op2: 0});
    });
    it('should fetch, decode and execute an branching instruction', () => {
      const pc = 0;
      cpu.setDecoded({addr: 0, op:'???'});
      cpu.setFetched(4, 0xffffffff); // rubish
      cpu.setPC(pc + 8);
      mmuMock.writeWord(0xea000018, 8); // b 0x70
      mmuMock.writeWord(0xe35e0000, 0x70); // cmp r14,#0
      mmuMock.writeWord(0xffffffff, 0x74); // rubbish

      cpu.execute();
      assert.deepEqual(cpu.getFetched(), [8, 0xea000018]);
      assert.include(cpu.getDecoded(), {addr: 4, op: '???'});
      assert.equal(cpu.getPC(), pc + 12);

      cpu.execute();
      assert.deepEqual(cpu.getFetched(), [0x70, 0xe35e0000]);
      assert.include(cpu.getDecoded(), {addr: 8, op: 'b', sOffset: 0x70});
      assert.equal(cpu.getPC(), pc + 16);

      cpu.execute(); // execute branch
      assert.deepEqual(cpu.getFetched(), [0x74, 0xffffffff]);
      assert.include(cpu.getDecoded(), {addr: 0x70, op: 'cmp', Rn: 'r14', Op2: 0});
      assert.equal(cpu.getPC(), 0x70 + 8);
    });
  });
  describe('Conditions', () => {
    it('should execute if last operation was zero', () => {
      cpu.setNZCV(0);
      cpu.setR14(0);
      cpu.setDecoded({op: 'mov', cond: 'eq', Rd: 'r14', Op2: 1});
      cpu.execute();
      assert.equal(cpu.getR14(), 0, 'Z=0, r14 not updated');
      cpu.setNZCV(0b0100);
      cpu.execute();
      assert.equal(cpu.getR14(), 1);
    });
    it('should execute if the last operation was not zero', () => {
      cpu.setNZCV(0b0100);
      cpu.setR14(0);
      cpu.setDecoded({op: 'mov', cond: 'ne', Rd: 'r14', Op2: 1});
      cpu.execute();
      assert.equal(cpu.getR14(), 0, 'Z=1, r14 not updated');
      cpu.setNZCV(0);
      cpu.execute();
      assert.equal(cpu.getR14(), 1);
    });
    it('should execute if the last operation carried', () => {
      cpu.setNZCV(0);
      cpu.setR14(0);
      cpu.setDecoded({op: 'mov', cond: 'cs', Rd: 'r14', Op2: 1});
      cpu.execute();
      assert.equal(cpu.getR14(), 0, 'C=0, r14 not updated');
      cpu.setNZCV(0b0010);
      cpu.execute();
      assert.equal(cpu.getR14(), 1);
    });
    it('should execute if the last operation did not carry', () => {
      cpu.setNZCV(0b0010);
      cpu.setR14(0);
      cpu.setDecoded({op: 'mov', cond: 'cc', Rd: 'r14', Op2: 1});
      cpu.execute();
      assert.equal(cpu.getR14(), 0, 'C=1, r14 not updated');
      cpu.setNZCV(0);
      cpu.execute();
      assert.equal(cpu.getR14(), 1);
    });
    it('should execute if the last result was negative', () => {
      cpu.setNZCV(0);
      cpu.setR14(0);
      cpu.setDecoded({op: 'mov', cond: 'mi', Rd: 'r14', Op2: 1});
      cpu.execute();
      assert.equal(cpu.getR14(), 0, 'N=0, r14 not updated');
      cpu.setNZCV(0b1000);
      cpu.execute();
      assert.equal(cpu.getR14(), 1);
    });
    it('should execute if the last result was not negative', () => {
      cpu.setNZCV(0b1000);
      cpu.setR14(0);
      cpu.setDecoded({op: 'mov', cond: 'pl', Rd: 'r14', Op2: 1});
      cpu.execute();
      assert.equal(cpu.getR14(), 0, 'N=1, r14 not updated');
      cpu.setNZCV(0);
      cpu.execute();
      assert.equal(cpu.getR14(), 1);
    });
    it('should execute if the last result overflew', () => {
      cpu.setNZCV(0);
      cpu.setR14(0);
      cpu.setDecoded({op: 'mov', cond: 'vs', Rd: 'r14', Op2: 1});
      cpu.execute();
      assert.equal(cpu.getR14(), 0, 'V=0, r14 not updated');
      cpu.setNZCV(0b0001);
      cpu.execute();
      assert.equal(cpu.getR14(), 1);
    });
    it('should execute if the last result did not overflow', () => {
      cpu.setNZCV(0b0001);
      cpu.setR14(0);
      cpu.setDecoded({op: 'mov', cond: 'vc', Rd: 'r14', Op2: 1});
      cpu.execute();
      assert.equal(cpu.getR14(), 0, 'V=1, r14 not updated');
      cpu.setNZCV(0);
      cpu.execute();
      assert.equal(cpu.getR14(), 1);
    });
    it('should execute if the last result was unsigned higher', () => {
      cpu.setNZCV(0);
      cpu.setR14(0);
      cpu.setDecoded({op: 'mov', cond: 'hi', Rd: 'r14', Op2: 1});
      cpu.execute();
      assert.equal(cpu.getR14(), 0, 'C=0, Z=0, r14 not updated');
      cpu.setNZCV(0b0010);
      cpu.execute();
      assert.equal(cpu.getR14(), 1, 'C=1, Z=0');
    });
    it('should execute if the last result was unsigned lower', () => {
      cpu.setNZCV(0b0010);
      cpu.setR14(0);
      cpu.setDecoded({op: 'mov', cond: 'ls', Rd: 'r14', Op2: 1});
      cpu.execute();
      assert.equal(cpu.getR14(), 0, 'C=1, r14 not updated');
      cpu.setNZCV(0b0000);
      cpu.execute();
      assert.equal(cpu.getR14(), 1, 'unsigned lower, r14 updated');
    });
    it('should execute if the last result was same', () => {
      cpu.setNZCV(0b0100);
      cpu.setR14(0);
      cpu.setDecoded({op: 'mov', cond: 'ls', Rd: 'r14', Op2: 1});
      cpu.execute();
      assert.equal(cpu.getR14(), 1, 'same, r14 not updated');
    });
    it('should execute if the last result was greater (or equal)', () => {
      cpu.setNZCV(0b1000);
      cpu.setR14(0);
      cpu.setDecoded({op: 'mov', cond: 'ge', Rd: 'r14', Op2: 1});
      cpu.execute();
      assert.equal(cpu.getR14(), 0, 'not greater, r14 not updated');
      cpu.setNZCV(0b1001);
      cpu.execute();
      assert.equal(cpu.getR14(), 1, 'greater');
    });
    it('should execute if the last result was the (greater) or same', () => {
      cpu.setNZCV(0b1001);
      cpu.setR14(0);
      cpu.setDecoded({op: 'mov', cond: 'ge', Rd: 'r14', Op2: 1});
      cpu.execute();
      assert.equal(cpu.getR14(), 1, 'same');
    });
    it('should execute if the last result was strictly lower', () => {
      cpu.setNZCV(0);
      cpu.setR14(0);
      cpu.setDecoded({op: 'mov', cond: 'lt', Rd: 'r14', Op2: 1});
      cpu.execute();
      assert.equal(cpu.getR14(), 0, 'V=N not lower, r14 not updated');
      cpu.setNZCV(0b1000);
      cpu.execute();
      assert.equal(cpu.getR14(), 1, 'V!=N lower');
    });
    it('should execute if the last result was strictly greater', () => {
      cpu.setNZCV(0b0100);
      cpu.setR14(0);
      cpu.setDecoded({op: 'mov', cond: 'gt', Rd: 'r14', Op2: 1});
      cpu.execute();
      assert.equal(cpu.getR14(), 0, 'same, r14 not updated');
      cpu.setNZCV(0b1001);
      cpu.execute();
      assert.equal(cpu.getR14(), 1, 'greater');
    });
    it('should execute if the last result was strictly greater', () => {
      cpu.setNZCV(0b0000);
      cpu.setR14(0);
      cpu.setDecoded({op: 'mov', cond: 'gt', Rd: 'r14', Op2: 1});
      cpu.execute();
      assert.equal(cpu.getR14(), 1, 'greater, r14 not updated');
    });
    it('should execute if the last result was less or equal', () => {
      cpu.setNZCV(0b0000);
      cpu.setR14(0);
      cpu.setDecoded({op: 'mov', cond: 'le', Rd: 'r14', Op2: 1});
      cpu.execute();
      assert.equal(cpu.getR14(), 0, 'greater, r14 not updated');
      cpu.setNZCV(0b1000);
      cpu.execute();
      assert.equal(cpu.getR14(), 1, 'less');
    });
    it('should execute if the last result was equal', () => {
      cpu.setNZCV(0b0100);
      cpu.setR14(0);
      cpu.setDecoded({op: 'mov', cond: 'le', Rd: 'r14', Op2: 1});
      cpu.execute();
      assert.equal(cpu.getR14(), 1, 'equal');
    });
    it('should execute always regardless of previous operation', () => {
      cpu.setR14(0);
      cpu.setDecoded({op: 'mov', cond: 'al', Rd: 'r14', Op2: 1});
      cpu.execute();
      assert.equal(cpu.getR14(), 1);
    });
    it('should never execute regardless of previous operation', () => {
      cpu.setR14(0);
      cpu.setDecoded({op: 'mov', cond: 'nv', Rd: 'r14', Op2: 1});
      cpu.execute();
      assert.equal(cpu.getR14(), 0);
    });
  });
  describe('Branch', () => {
    it('should branch forward', () => {
      const pc = 0;
      const offset = 0xa; // 10
      const calcOffset = Utils.toSigned(Utils.reverseBytes(offset))*4 + 8 + 8;
      mmuMock.writeWord(0xffffffff, 4); //rubish
      mmuMock.writeWord(0xffffffff, 0x38); //rubish
      mmuMock.writeWord(0xffffffff, 0x3c); //rubish
      mmuMock.writeWord(0xffffffff, 0x40); //rubish
      mmuMock.writeWord(0xea000000 + offset, 8);
      cpu.boot();

      cpu.execute(); // fetch
      assert.deepEqual(cpu.getFetched(), [8, 0xea00000a]);
      assert.include(cpu.getDecoded(), {addr: 4, op: '???'});
      assert.equal(cpu.getPC(), pc + 12);

      cpu.execute(); // decode
      assert.deepEqual(cpu.getFetched(), [0x38, 0xffffffff]); // fetch from 10*4 + 8 + 8
      assert.include(cpu.getDecoded(), {addr: 8, op: 'b', sOffset: 0x38});
      assert.equal(cpu.getPC(), pc + 16);

      cpu.execute(); // branch forward
      assert.equal(calcOffset, 0x38 /* 10*4 + pc + 8 */);
      assert.deepEqual(cpu.getFetched(), [0x38+4, 0xffffffff]);
      assert.include(cpu.getDecoded(), {addr: 0x38, op: '???'});
      assert.equal(cpu.getPC(), 0x38 + 8);

      cpu.execute();
      assert.deepEqual(cpu.getFetched(), [0x38+8, 0xffffffff]);
      assert.include(cpu.getDecoded(), {addr: 0x38+4, op: '???'});
      assert.equal(cpu.getPC(), 0x38 + 12);
    });
    it('should branch backwards', () => {
      const pc = 0x100;
      const offset = 0x00fffff6; // -10
      const calcOffset = Utils.toSigned(offset)*4 + pc+8 + 8;
      cpu.setPC(pc + 8);
      mmuMock.writeWord(0xea000000 + offset, 0x108);
      mmuMock.writeWord(0xffffffff, 0xe8); //rubish
      mmuMock.writeWord(0xffffffff, 0xec); //rubish
      mmuMock.writeWord(0xffffffff, 0xf0); //rubish

      cpu.execute();
      assert.deepEqual(cpu.getFetched(), [0x108, 0xeafffff6]);
      assert.equal(cpu.getPC(), pc + 12);

      cpu.execute();
      assert.deepEqual(cpu.getFetched(), [0xe8, 0xffffffff]); // fetch from -10*4 + 8 + 0x108 = 0xe8
      assert.include(cpu.getDecoded(), {addr: 0x108, op: 'b', sOffset: 0xe8});
      assert.equal(cpu.getPC(), pc + 16);

      cpu.execute(); // branch backwards
      assert.equal(calcOffset, 0xe8 /* -10*4 + 0x108 + 8 */);
      assert.deepEqual(cpu.getFetched(), [0xe8+4, 0xffffffff]);
      assert.include(cpu.getDecoded(), {addr: 0xe8, op: '???'});
      assert.equal(cpu.getPC(), 0xe8 + 8);

      cpu.execute();
      assert.deepEqual(cpu.getFetched(), [0xe8+8, 0xffffffff]);
      assert.include(cpu.getDecoded(), {addr: 0xe8+4, op: '???'});
      assert.equal(cpu.getPC(), 0xe8 + 12);
    });
    it('should branch to the same address (stuck)', () => {
      const pc = 0x100;
      const offset = 0x00fffffe; // -2
      const calcOffset = Utils.toSigned(offset)*4 + pc+8 + 8;
      cpu.setPC(pc + 8);
      mmuMock.writeWord(0xea000000 + offset, 0x108);

      cpu.execute();
      assert.deepEqual(cpu.getFetched(), [0x108, 0xeafffffe]);
      assert.equal(cpu.getPC(), pc + 12);

      cpu.execute();
      assert.deepEqual(cpu.getFetched(), [0x108, 0xeafffffe]); // fetch from -2*4 + 8 + 0x108 = 0x108
      assert.include(cpu.getDecoded(), {addr: 0x108, op: 'b', sOffset: 0x108});
      assert.equal(cpu.getPC(), pc + 16);

      cpu.execute(); // branch at the same address
      assert.equal(calcOffset, 0x108 /* -2*4 + 0x108 + 8 */);
      assert.deepEqual(cpu.getFetched(), [0x108, 0xeafffffe]); // fetch again from 0x108
      assert.include(cpu.getDecoded(), {addr: 0x108, op: 'b', sOffset: 0x108});
      assert.equal(cpu.getPC(), 0x108 + 8);

      cpu.execute(); // branch at the same address
      assert.deepEqual(cpu.getFetched(), [0x108, 0xeafffffe]); // fetch again from 0x108
      assert.include(cpu.getDecoded(), {addr: 0x108, op: 'b', sOffset: 0x108});
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
      assert.equal(cpu.getCPSR(), 0xa0000000); // make sure CPSR is always unsigned
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
      mmuMock.writeWord(0xe3a0e004, pc); // mov r14,4
      mmuMock.writeWord(0xe3b0e000, pc+4); // mov r14,0  to test zero flag
      mmuMock.writeWord(0xe3b0c301, pc+8); // mov r12,0x4000000 test rotated immediate

      cpu.execute();
      assert.deepEqual(cpu.getFetched(), [pc, 0xe3a0e004]);
      assert.equal(cpu.getPC(), pc + 4);

      cpu.execute();
      assert.deepEqual(cpu.getFetched(), [pc+4, 0xe3b0e000]);
      assert.include(cpu.getDecoded(), {addr: pc, op: 'mov', Rd: 'r14', Op2: 4});
      assert.equal(cpu.getPC(), pc + 8);

      cpu.execute(); // mov r14,4
      assert.deepEqual(cpu.getFetched(), [pc+8, 0xe3b0c301]);
      assert.include(cpu.getDecoded(), {addr: pc+4, op: 'mov', Rd: 'r14', Op2: 0, setCondition: true});
      assert.equal(cpu.getR14(), 4);
      assert.equal(cpu.getNZCV(), 0b0000);
      assert.equal(cpu.getPC(), pc + 12);

      cpu.execute(); // mov r14,0
      assert.include(cpu.getDecoded(), {addr: pc+8, op: 'mov', Rd: 'r12', Op2: 0x4000000, setCondition: true});
      assert.equal(cpu.getR14(), 0);
      assert.equal(cpu.getNZCV(), 0b0100);

      cpu.execute();
      assert.equal(cpu.getR12(), 0x4000000);
      assert.equal(cpu.getNZCV(), 0b0000);
    });
    it('should update flags if S=1', () => {
      const signed = 0x80000000;
      cpu.setDecoded({op: 'mov', Rd: 'r14', Op2: 0, setCondition: true});
      cpu.execute();
      assert.equal(cpu.getR14(), 0);
      assert.equal(cpu.getNZCV(), 0b0100);

      cpu.setDecoded({op: 'mov', Rd: 'r14', Op2: signed, setCondition: true});
      cpu.execute();
      assert.equal(cpu.getR14(), signed);
      assert.equal(cpu.getNZCV(), 0b1000);
    });
    it('should not affect flags if S=0', () => {
      const flags = cpu.getNZCV();
      const signed = 0x80000000;

      cpu.setDecoded({op: 'mov', Rd: 'r14', Op2: 0, setCondition: false});
      cpu.execute();
      assert.equal(cpu.getR14(), 0);
      assert.equal(cpu.getNZCV(), flags, 'unchanged');

      cpu.setDecoded({op: 'mov', Rd: 'r14', Op2: signed, setCondition: false});
      cpu.execute();
      assert.equal(cpu.getR14(), signed);
      assert.equal(cpu.getNZCV(), flags, 'unchanged');
    });
  });
  describe('Load', () => {
    it('should load a value from memory to register', () => {
      const pc = cpu.getPC();
      cpu.setR1(0x08000000);
      mmuMock.writeWord(0xe5910300, pc); // ldr r0,[r1,0x300]
      mmuMock.writeWord(0x12345678, 0x08000300);

      cpu.execute();
      assert.deepEqual(cpu.getFetched(), [pc, 0xe5910300]);

      cpu.execute();
      assert.include(cpu.getDecoded(), {addr: pc, op: 'ldr', Rd: 'r0', Rn: 'r1', pre: true, offset: 0x300});

      cpu.execute();
      assert.equal(cpu.getR0(), 0x12345678);
    });
  });
  describe('Data Processing (ALU)', () => {
    it('should test exclusive (TEQ)', () => {
      cpu.setR0(1);
      cpu.setDecoded({op: 'teq', Rn: 'r0', Op2: 1});

      cpu.execute(); // 1 XOR 1 = 0
      assert.equal(cpu.getR0(), 1, 'register unchanged');
      assert.equal(cpu.getNZCV(), 0b0100); // V unaffected
    });
    it('should TEQ with negative result', () => {
      cpu.setR0(0xffffffff);
      cpu.setDecoded({op: 'teq', Rn: 'r0', Op2: 0});

      cpu.execute(); // 1 XOR 1 = 0
      assert.equal(cpu.getR0(), 0xffffffff, 'register unchanged');
      assert.equal(cpu.getNZCV(), 0b1000);
    });
  });
  describe('PSR transfer', () => {
    it('should MRS', () => {
      cpu.setNZCV(0xf);
      cpu.setDecoded({op: 'mrs', Rd: 'r12', Psr: 'cpsr'});
      cpu.execute();
      assert.equal(cpu.getR12(), 0xf0000000);
    });
  });
});