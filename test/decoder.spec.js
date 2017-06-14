import {describe, beforeEach, it} from 'mocha';
import {assert} from 'chai';
import Decoder from '../src/decoder';

describe('Decoder', () => {
  it('should detect unknown instruction', () => {
    assert.deepEqual(Decoder.decode(0, 0xffffffff), {addr: 0, op: '???'});
  });
  it('should decode Branch', () => {
    const addr = 8;
    assert.deepEqual(Decoder.decode(addr, 0xea000018), {addr, op: 'b', sOffset: 0x70});
    assert.equal(Decoder.decodeToString(addr, 0xea000018), 'b 0x70');
  });
  it('should decode Compare', () => {
    const addr = 0x70;
    assert.deepEqual(Decoder.decode(addr, 0xe35e0000), {addr, op: 'cmp', Rd: 'r0', Rn: 'r14', Op2: 0});
    assert.equal(Decoder.decodeToString(addr, 0xe35e0000), 'cmp r14,0x00');
  });
  it('should decode Move', () => {
    const addr = 0;
    assert.deepEqual(Decoder.decode(addr, 0xe3a0e004), {addr, op: 'mov', Rd: 'r14', Rn: 'r0', Op2: 4});
    assert.equal(Decoder.decodeToString(addr, 0xe3a0e004), 'mov r14,0x04');
  });
  it('should decode Load', () => {
    const addr = 0;
    assert.deepEqual(Decoder.decode(addr, 0xe5910300), {addr, op: 'ldr', Rd:'r0', Rn:'r1', pre: true, offset: 0x300});
    assert.equal(Decoder.decodeToString(addr, 0xe5910300), 'ldr r0,[r1,0x0300]');

    // using pc as register
    assert.deepEqual(Decoder.decode(addr, 0xe59ff300), {addr, op: 'ldr', Rd: 'pc', Rn: 'pc', pre: true, offset: 0x300});
    assert.equal(Decoder.decodeToString(addr, 0xe59ff300), 'ldr pc,[pc,0x0300]');
  });
  it('should decode AND', () => {
    const addr = 0;
    assert.deepEqual(Decoder.decode(addr, 0), {addr, op: 'and'/*FIXME:andeq*/, Rd: 'r0', Rn: 'r0', Op2: 'r0'});
    assert.equal(Decoder.decodeToString(addr, 0), 'and r0,r0,r0');
  });
  it('should decode XOR', () => {
    const addr = 0;
    assert.deepEqual(Decoder.decode(addr, 0xe3300001), {addr, op: 'teq', Rd: 'r0', Rn: 'r0', Op2: 1});
    assert.equal(Decoder.decodeToString(addr, 0xe3300001), 'teq r0,0x01');
  });
});