import {describe, beforeEach, it} from 'mocha';
import {assert} from 'chai';
import Decoder from '../src/decoder';

describe('Decoder', () => {
  it('should detect unknown instruction', () => {
    assert.deepEqual(Decoder.decode(0, 0), [0, '???']);
  });
  it('should decode Branch', () => {
    const pc = 8;
    assert.deepEqual(Decoder.decode(0xea000018, pc), [pc, 'b', 0x70]);
  });
  it('should decode Compare', () => {
    const pc = 0x70;
    assert.deepEqual(Decoder.decode(0xe35e0000, pc), [pc, 'cmp', 'r0', 'r14', 0]);
  });
  it('should decode Move', () => {
    const pc = 0;
    assert.deepEqual(Decoder.decode(0x03a0e004, pc), [pc, 'mov', 'r14', 'r0', 4]);
  });
  it('should decode Load', () => {
    const pc = 0;
    assert.deepEqual(Decoder.decode(0xe5910300, pc), [pc, 'ldr', 'r0', 'r1', true/*Pre?*/, 0x300]);
  });
  it('should decode XOR', () => {
    const pc = 0;
    assert.deepEqual(Decoder.decode(0xe3300001, pc), [pc, 'teq', 'r0', 'r0', 1]);
  });
});