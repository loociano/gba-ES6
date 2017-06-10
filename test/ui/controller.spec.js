import {describe, beforeEach, it} from 'mocha';
import {assert} from 'chai';
import Controller from '../../src/ui/controller';

describe('Controller', () => {
  let model, view, controller;
  let renderings = {};
  let bindings = {};
  let flags = {};
  beforeEach( () => {
    model = {
      setFlag: function(flag) { flags[flag] = true; },
      getMemory: function() {},
      getInstrs: function(offset, length) {},
      getPC: function() {},
      getRegisters: function() {}
    };
    view = {
      bind: function(what) {
        bindings[what] = true;
      },
      render: function(what) {
        renderings[what] = true;
      },
      onScrollProgram: function() {}
    };
    controller = new Controller(model, view);
  });
  it('should render UI elements', () => {
    assert.equal(renderings['cpu'], true);
    assert.equal(renderings['program'], true);
    assert.equal(renderings['memory'], true);
  });
  it('should bind UI elements to actions', () => {
    assert.equal(bindings['setFlag'], true);
    assert.equal(bindings['load'], true);
    assert.equal(bindings['execute'], true);
    assert.equal(bindings['onProgramScroll'], true);
  });
  it('should re-render program', () => {
    renderings = {};
    controller.renderProgram(0);
    assert.equal(renderings['program'], true);
    assert.equal(renderings['currentInstr'], true);
  });
  it('should read/write flags', () => {
    controller.setFlag('N', true);
    controller.setFlag('Z', true);
    assert.equal(flags['N'], true);
    assert.equal(flags['Z'], true);
    assert.equal(flags['C'], undefined);
  });
});