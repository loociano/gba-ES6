import {describe, beforeEach, it} from 'mocha';
import {assert} from 'chai';
import Utils from '../src/utils';

describe('Utils', () => {
  it('should revert bytes (endianness)', () => {
    assert.equal(Utils.reverseBytes(0x0a), 0x0a);
    assert.equal(Utils.reverseBytes(0x12), 0x12);
    assert.equal(Utils.reverseBytes(0x1234), 0x3412);
    assert.equal(Utils.reverseBytes(0x123456), 0x563412);
    assert.equal(Utils.reverseBytes(0x12345678), 0x78563412);
    assert.equal(Utils.reverseBytes(0x1234567890), 0x9078563412);
  });
  it('should trail with zeros if number has leading zeros', () => {
    assert.equal(Utils.reverseBytes(0x0012, 2), 0x1200);
    assert.equal(Utils.reverseBytes(0x00000012, 4), 0x12000000);
    assert.equal(Utils.reverseBytes(0x12, 4), 0x12000000);
    assert.equal(Utils.reverseBytes(0x1, 4), 0x01000000);
  });
  it('should ignore invalid inputs', () => {
    assert.equal(Utils.reverseBytes(0x12, 0), 0x12);
    assert.equal(Utils.reverseBytes(0x12, -1), 0x12);
    assert.equal(Utils.reverseBytes(0x12, 'a'), 0x12);
  });
  it('should return signed number', () => {
    assert.equal(Utils.toSigned(0x0), 0);
    assert.equal(Utils.toSigned(0x01), 1);
    assert.equal(Utils.toSigned(0xa), 0xa);
    assert.equal(Utils.toSigned(0x7f), 127);
    assert.equal(Utils.toSigned(0xff), -1);
    assert.equal(Utils.toSigned(0xfe), -2);
    assert.equal(Utils.toSigned(0x80), -128);
  });
  it('should return signed bytes', () => {
    assert.equal(Utils.toSigned(0xffffff), -1);
    assert.equal(Utils.toSigned(0xfffffe), -2);
    assert.equal(Utils.toSigned(0x800000/*max*/), -8388608);
  });
  it('should format to hex', () => {
    assert.equal(Utils.toHex(0), '0x0');
    assert.equal(Utils.toHex(0x123), '0x123');
  });
  it('should format to 32 bits', () => {
    assert.equal(Utils.to32hex(0), '0x00000000');
    assert.equal(Utils.to32hex(0x123), '0x00000123');
    assert.equal(Utils.to32hex(0x12345678), '0x12345678');
    assert.equal(Utils.to32hex(0x123456789), '0x123456789');
  });
  it('should ROR a word', () => {
    assert.equal(Utils.ror(0, 0), 0);
    assert.equal(Utils.ror(1, 1), 0x80000000);
    assert.equal(Utils.ror(0x3, 2), 0xc0000000);
    assert.equal(Utils.ror(1, 31), 0x2);
    assert.equal(Utils.ror(1, 32), 1);
    assert.equal(Utils.ror(1, 33), 0x80000000);
  });
});