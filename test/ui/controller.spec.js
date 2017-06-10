import {describe, beforeEach, it} from 'mocha';
import {assert} from 'chai';
import Controller from '../../src/ui/controller';

describe('Controller', () => {
  let model, view, controller;
  let renderings = {};
  let renderArgs;
  let bindings = {};
  let flags = {};
  beforeEach( () => {
    model = {
      _line: 0,
      setFlag: function(flag) { flags[flag] = true; },
      getMemory: function() {},
      getInstrs: function(offset, length) {},
      getPC: function() {},
      getRegisters: function() {},
      setProgramLine: function(line, callback) {
        this._line = line;
        callback.call(this, line);
      },
      getProgramLine: function() { return this._line; }
    };
    view = {
      bind: function(what) {
        bindings[what] = true;
      },
      render: function(what, args) {
        renderings[what] = true;
        renderArgs = args;
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
      assert.equal(bindings['setProgramLine'], true);
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
  describe('Go to Program Line', () => {
    it('should go to program line', () => {
      controller.setProgramLine('10');

      assert.equal(renderings['program'], true);
      assert.equal(renderings['currentInstr'], true);
      assert.equal(renderArgs.offset, 0x10);
    });
    it('should validate program line', () => {
      controller.setProgramLine(-1);

      assert.equal(renderings['program'], undefined);
      assert.equal(renderings['currentInstr'], undefined);
    });
    it('should go to the closest multiple of 4 line', () => {
      controller.setProgramLine('9');

      assert.equal(renderings['program'], true);
      assert.equal(renderings['currentInstr'], true);
      assert.equal(renderArgs.offset, 8);

      controller.setProgramLine('b');
      assert.equal(renderArgs.offset, 8);

      controller.setProgramLine('c');
      assert.equal(renderArgs.offset, 0xc);

      controller.setProgramLine('c');
      assert.equal(renderArgs.offset, 0xc);

      renderings = {};
      controller.setProgramLine('-1'); // must not render
      assert.equal(renderings['program'], undefined);
    });
  });
});