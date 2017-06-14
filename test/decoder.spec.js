import {describe, beforeEach, it} from 'mocha';
import {assert} from 'chai';
import Decoder from '../src/decoder';

describe('Decoder', () => {
  it('should detect unknown instruction', () => {
    assert.include(Decoder.decode(0, 0xffffffff), {addr: 0, op: '???', toString: '???'});
  });
  describe('Conditions', () => {
    it('should decode conditions', () => {
      assert.include(Decoder.decode(0, 0),
        {cond: 'eq', op: 'and', Rd: 'r0', Rn: 'r0', Op2: 'r0', setCondition: false, toString: 'andeq r0,r0,r0'});
      assert.include(Decoder.decode(0, 0x10000000), {cond: 'ne', toString: 'andne r0,r0,r0'});
      assert.include(Decoder.decode(0, 0x20000000), {cond: 'cs', toString: 'andcs r0,r0,r0'});
      assert.include(Decoder.decode(0, 0x30000000), {cond: 'cc', toString: 'andcc r0,r0,r0'});
      assert.include(Decoder.decode(0, 0x40000000), {cond: 'mi', toString: 'andmi r0,r0,r0'});
      assert.include(Decoder.decode(0, 0x50000000), {cond: 'pl', toString: 'andpl r0,r0,r0'});
      assert.include(Decoder.decode(0, 0x60000000), {cond: 'vs', toString: 'andvs r0,r0,r0'});
      assert.include(Decoder.decode(0, 0x70000000), {cond: 'vc', toString: 'andvc r0,r0,r0'});
      assert.include(Decoder.decode(0, 0x80000000), {cond: 'hi', toString: 'andhi r0,r0,r0'});
      assert.include(Decoder.decode(0, 0x90000000), {cond: 'ls', toString: 'andls r0,r0,r0'});
      assert.include(Decoder.decode(0, 0xa0000000), {cond: 'ge', toString: 'andge r0,r0,r0'});
      assert.include(Decoder.decode(0, 0xb0000000), {cond: 'lt', toString: 'andlt r0,r0,r0'});
      assert.include(Decoder.decode(0, 0xc0000000), {cond: 'gt', toString: 'andgt r0,r0,r0'});
      assert.include(Decoder.decode(0, 0xd0000000), {cond: 'le', toString: 'andle r0,r0,r0'});
      assert.include(Decoder.decode(0, 0xe0000000), {cond: 'al', toString: 'and r0,r0,r0'});
      assert.include(Decoder.decode(0, 0xf0000000), {cond: 'nv', toString: 'andnv r0,r0,r0'});
    });
  });
  describe('Branch', () => {
    it('should decode Branch', () => {
      const addr = 8;
      assert.deepEqual(Decoder.decode(addr, 0xea000018), {addr, op: 'b', sOffset: 0x70, toString: 'b 0x70'});
    });
  });
  describe('Data transfer', () => {
    it('should decode Load', () => {
      const addr = 0;
      assert.deepEqual(Decoder.decode(addr, 0xe5910300),
        {addr, op: 'ldr', Rd:'r0', Rn:'r1', pre: true, offset: 0x300, toString: 'ldr r0,[r1,0x0300]'});

      // using pc as register
      assert.deepEqual(Decoder.decode(addr, 0xe59ff300),
        {addr, op: 'ldr', Rd: 'pc', Rn: 'pc', pre: true, offset: 0x300, toString: 'ldr pc,[pc,0x0300]'});
    });
  });
  describe('ALU', () => {
    describe('Compare (CMP)', () => {
      it('should decode', () => {
        const addr = 0x70;
        assert.include(Decoder.decode(addr, 0xe35e0000),
          {addr, op: 'cmp', Rd: 'r0', Rn: 'r14', Op2: 0, setCondition: true, toString: 'cmp r14,0x00'});
      });
      it('should decode Compare with Rn=pc', () => {
        const addr = 0x70;
        assert.include(Decoder.decode(addr, 0xe35f0000),
          {addr, op: 'cmp', Rd: 'r0', Rn: 'pc', Op2: 0, setCondition: true, toString: 'cmp pc,0x00'});
      });
    });
    describe('Move (MVN)', () => {
      it('should decode', () => {
        const addr = 0;
        assert.include(Decoder.decode(addr, 0xe3a0e004),
          {addr, op: 'mov', Rd: 'r14', Rn: 'r0', Op2: 4, setCondition: false, toString: 'mov r14,0x04'});
        assert.include(Decoder.decode(addr, 0xe3b0e004), {setCondition: true});
      });
      it('should decode Move with Rd=pc', () => {
        const addr = 0;
        assert.include(Decoder.decode(addr, 0xe3a0f004), {op: 'mov', Rd: 'pc', Op2: 4, toString: 'mov pc,0x04'});
      });
    });
    it('should decode AND', () => {
      const addr = 0;
      assert.include(Decoder.decode(addr, 0),
        {addr, cond: 'eq', op: 'and', Rd: 'r0', Rn: 'r0', Op2: 'r0', setCondition: false, toString: 'andeq r0,r0,r0'});
    });
    it('should decode TEQ', () => {
      const addr = 0;
      assert.include(Decoder.decode(addr, 0xe3300001),
        {addr, op: 'teq', Rn: 'r0', Op2: 1, setCondition: true, toString: 'teq r0,0x01'});
    });
    it('should decode MRS', () => {
      assert.include(Decoder.decode(0, 0xe10fc000),
        {addr: 0, op: 'mrs', Rd: 'r12', Psr: 'cpsr', toString: 'mrs r12,cpsr'});
    });
    it('should decode MSR', () => {

    });
    it('should decode OR', () => {
      assert.include(Decoder.decode(0, 0xe38cc0c0),
        {addr: 0, op: 'orr', Rd: 'r12', Rn: 'r12', Op2: 0xc0, toString: 'orr r12,r12,0xc0'});
    });
  });
});