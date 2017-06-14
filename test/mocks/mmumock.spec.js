import MMUMock from './mmuMock';
import {describe, beforeEach, it} from 'mocha';
import {assert} from 'chai';

describe('MMU mock', () => {
  it('should read/write in memory', () => {
    const mmuMock = new MMUMock();
    mmuMock.writeWord(0xabcdef01, 0);
    assert.equal(mmuMock.readWord(0), 0xabcdef01);
    mmuMock.writeWord(0x12345678, 0x100);
    assert.equal(mmuMock.readWord(0x100), 0x12345678);
  });
});