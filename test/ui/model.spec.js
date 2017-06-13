import {describe, beforeEach, it} from 'mocha';
import {assert} from 'chai';
import Model from '../../src/ui/model';

describe('Model', () => {
  let model;
  const cpuMock = {
    _decoded: [],
    _r: { r0:0, r1:0, r2:0, r3:0, r4:0, r5:0, r6:0, r7:0, r8:0, r9:0, r10:0, r11:0, r12:0, r13:0, r14:0, pc:0, sprs:0, nzcvq: 0, ift: 0},
    execute: function() {},
    getRegisters: function() { return this._r; },
    getCPSR: function() {
      return ((this._r.ift << 5) | (this._r.nzcvq << 27)) >>> 0;
    },
    getNZCVQ: function() { return this._r.nzcvq; },
    setNZCVQ: function(nzcvq) { this._r.nzcvq = nzcvq; },
    getIFT: function() { return this._r.ift; },
    setIFT: function(ift) { this._r.ift = ift; }
  };
  const gbaMock = {
    _running: false,
    getCPU: function() { return cpuMock; },
    start: function() { this._running = true; }
  };
  beforeEach( () => {
    model = new Model(gbaMock);
  });
  it('should read/write flags', () => {
    let updatedRegisters;
    ['N', 'Z', 'C', 'V', 'Q', 'I', 'F', 'T'].forEach( (flag) => {
      model.setFlag(flag, true);
      assert.equal(model.getFlag(flag), true, `${flag} is not true`);
      model.setFlag(flag, false);
      assert.equal(model.getFlag(flag), false, `${flag} is not false`);
    });

    ['N', 'Z', 'C', 'V', 'Q', 'I', 'F', 'T'].forEach( (flag) => {
      model.setFlag(flag, true, (registers) => { updatedRegisters = registers; });
    });
    assert.equal(cpuMock.getNZCVQ(), 0b11111);
    assert.equal(cpuMock.getIFT(), 0b111);
    assert.deepEqual(updatedRegisters, { cpsr: 0xf80000e0} );

    ['N', 'Z', 'C', 'V', 'Q', 'I', 'F', 'T'].forEach( (flag) => {
      model.setFlag(flag, false, (registers) => { updatedRegisters = registers; });
    });
    assert.equal(cpuMock.getNZCVQ(), 0);
    assert.equal(cpuMock.getIFT(), 0);
    assert.deepEqual(updatedRegisters, { cpsr: 0} );
  });
  it('should execute and return the updated registers only', () => {
    cpuMock.execute = function () {
      cpuMock._r.r1 = 1;
      cpuMock._r.pc = 15;
    };
    model.execute(function (registers) {
      assert.deepEqual(registers, {r1: 1, pc: 15});
    });
  });
});