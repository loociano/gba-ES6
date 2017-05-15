import ARM7TDMI from '../src/arm7tdmi';
import {describe, beforeEach, it} from 'mocha';
import {assert} from 'chai';

describe('ARM7TDMI tests', () => {
  let cpu;

  beforeEach(() => {
    cpu = new ARM7TDMI();
  });

  it('should instantiate', () => {
    assert.notEqual(cpu, null);
  });
});