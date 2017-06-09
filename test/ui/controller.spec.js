import {describe, beforeEach, it} from 'mocha';
import {assert} from 'chai';
import Controller from '../../src/ui/controller';

describe('Controller', () => {
  let model, view, controller;
  beforeEach( () => {
    model = {
      called: false,
      setFlag: function() { this.called = true; },
      getMemory: function() {},
      getInstrs: function() {},
      getRegisters: function() {}
    };
    view = {
      bind: function() {},
      render: function() {},
      handleScrollInstrs: function() {}
    };
    controller = new Controller(model, view);
  });
  it('should read/write flags', () => {
    controller.setFlag('N', true);
    assert.equal(controller._model.called, true);
  });
});