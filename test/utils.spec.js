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
    assert.equal(Utils.toSigned(0xffffffff), -1);
    assert.equal(Utils.toSigned(0xfffffffe), -2);
    assert.equal(Utils.toSigned(0x80000000/*max*/), -2147483648);
  });
  it('should convert to signed', () => {
    assert.equal(Utils.toUnsigned(0), 0);
    assert.equal(Utils.toUnsigned(0x7fffffff), 2147483647);
    assert.equal(Utils.toUnsigned(-1), 0xffffffff);
    assert.equal(Utils.toUnsigned(-2), 0xfffffffe);
  });
  it('should format to hex', () => {
    assert.equal(Utils.toHex(0), '00');
    assert.equal(Utils.toHex(0x123), '0123');
  });
  it('should parse an hex', () => {
    assert.equal(Utils.hexStrToNum('0'), 0);
    assert.equal(Utils.hexStrToNum('f'), 0xf);
    assert.equal(Utils.hexStrToNum('ff'), 0xff);
    assert.equal(Utils.hexStrToNum('0abc'), 0xabc);
    assert.isNaN(Utils.hexStrToNum('-1'));
    assert.isNaN(Utils.hexStrToNum('g'));
  });
  it('should format to 32 bits', () => {
    assert.equal(Utils.to32hex(0), '00000000');
    assert.equal(Utils.to32hex(0x123), '00000123');
    assert.equal(Utils.to32hex(0x12345678), '12345678');
    assert.equal(Utils.to32hex(0x123456789), '123456789');
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