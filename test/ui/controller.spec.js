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
    renderings = {};
    bindings = {};
  });
  describe('Initialization', () => {
    it('should render UI elements', () => {
      controller = new Controller(model, view);
      assert.equal(renderings['cpu'], true);
      assert.equal(renderings['program'], true);
      assert.equal(renderings['memory'], true);
    });
    it('should bind UI elements to actions', () => {
      controller = new Controller(model, view);
      assert.equal(bindings['setFlag'], true);
      assert.equal(bindings['load'], true);
      assert.equal(bindings['execute'], true);
      assert.equal(bindings['onProgramScroll'], true);
    });
  });
  it('should re-render program', () => {
    controller.renderProgram();
    assert.equal(renderings['program'], true);
    assert.equal(renderings['currentInstr'], true);
  });
  describe('Flag bindings', () => {
    it('should read/write flags', () => {
      controller.setFlag('N', true);
      controller.setFlag('Z', true);
      assert.equal(flags['N'], true);
      assert.equal(flags['Z'], true);
      assert.equal(flags['C'], undefined);
    });
  });
  describe('Program rendering on scroll up/down', () => {
    it('should re-render on scroll down', () => {
      model.currentLine = 0;
      controller.onProgramScroll(8);
      assert.equal(renderings['program'], true);
      assert.equal(model.currentLine, 8);
    });
    it('should re-render on scroll up', () => {
      model.currentLine = 32;
      controller.onProgramScroll(-8);
      assert.equal(renderings['program'], true);
      assert.equal(model.currentLine, 24);
    });
    it('should not re-render on scroll up if at bottom of program', () => {
      model.currentLine = 0;
      controller.onProgramScroll(-8);
      assert.equal(renderings['program'], undefined);
      assert.equal(model.currentLine, 0);
    });
    it('should re-render on scroll up if there are lines available', () => {
      model.currentLine = 4;
      controller.onProgramScroll(-8);
      assert.equal(renderings['program'], true);
      assert.equal(model.currentLine, 0);
    });
  });
});