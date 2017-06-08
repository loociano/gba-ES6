import {describe, beforeEach, it} from 'mocha';
import {assert} from 'chai';
import Decoder from '../src/decoder';

describe('Decoder', () => {
  it('should detect unknown instruction', () => {
    assert.deepEqual(Decoder.decode(0, 0xffffffff), [0, '???']);
  });
  it('should decode Branch', () => {
    const pc = 8;
    assert.deepEqual(Decoder.decode(pc, 0xea000018), [pc, 'b', 0x70]);
    assert.equal(Decoder.decodeToString(pc, 0xea000018), 'b 0x70');
  });
  it('should decode Compare', () => {
    const pc = 0x70;
    assert.deepEqual(Decoder.decode(pc, 0xe35e0000), [pc, 'cmp', 'r0', 'r14', 0]);
    assert.equal(Decoder.decodeToString(pc, 0xe35e0000), 'cmp r14,0x00');
  });
  it('should decode Move', () => {
    const pc = 0;
    assert.deepEqual(Decoder.decode(pc, 0xe3a0e004), [pc, 'mov', 'r14', 'r0', 4]);
    assert.equal(Decoder.decodeToString(pc, 0xe3a0e004), 'mov r14,0x04');
  });
  it('should decode Load', () => {
    const pc = 0;
    assert.deepEqual(Decoder.decode(pc, 0xe5910300), [pc, 'ldr', 'r0', 'r1', true/*Pre?*/, 0x300]);
    assert.equal(Decoder.decodeToString(pc, 0xe5910300), 'ldr r0,[r1,0x0300]');
  });
  it('should decode AND', () => {
    const pc = 0;
    assert.deepEqual(Decoder.decode(pc, 0), [pc, 'and'/*FIXME:andeq*/, 'r0', 'r0', 'r0']);
    assert.equal(Decoder.decodeToString(pc, 0), 'and r0,r0,r0');
  });
  it('should decode XOR', () => {
    const pc = 0;
    assert.deepEqual(Decoder.decode(pc, 0xe3300001), [pc, 'teq', 'r0', 'r0', 1]);
    assert.equal(Decoder.decodeToString(pc, 0xe3300001), 'teq r0,0x01');
  });
});