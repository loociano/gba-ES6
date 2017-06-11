import {describe, beforeEach, it} from 'mocha';
import {assert} from 'chai';
import Controller from '../../src/ui/controller';
import * as c from '../../src/constants';

describe('Controller', () => {
  let model, view, controller;
  let renderings = {};
  let renderArgs = {};
  let bindings = {};
  let flags = {};
  beforeEach( () => {
    model = {
      _line: 0,
      execute: function(callback) { callback.call(this); },
      setFlag: function(flag) { flags[flag] = true; },
      getMemory: function() {},
      getInstrs: function(offset, length) {},
      getPC: function() {},
      getRegisters: function() {},
      setProgramLine: function(line, callback) {
        this._line = line;
        if (typeof callback === 'function') callback.call(this, line);
      },
      getProgramLine: function() { return this._line; },
      setBIOS: function() {},
      boot: function(callback) {
        if (typeof callback === 'function') callback.call(this);
      }
    };
    view = {
      bind: function(what) {
        bindings[what] = true;
      },
      render: function(what, args) {
        renderings[what] = true;
        renderArgs[what] = args;
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
      assert.equal(renderings['program'], true);
      assert.equal(renderings['memory'], true);
      assert.equal(renderings['controls'], true);
      assert.deepEqual(renderArgs['controls'], { 'run': false, 'next': false });
    });
    it('should bind UI elements to actions', () => {
      controller = new Controller(model, view);
      assert.equal(bindings['setFlag'], true);
      assert.equal(bindings['load'], true);
      assert.equal(bindings['execute'], true);
      assert.equal(bindings['onProgramScroll'], true);
      assert.equal(bindings['setProgramLine'], true);
      assert.equal(bindings['onKeyDownProgramLine'], true);
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
  describe('Program execution', () => {
    it('should enable controls on program load', () => {
      controller.load(new Uint8Array(1));
      assert.equal(renderings['controls'], true);
      assert.deepEqual(renderArgs['controls'], { 'run': true, 'next': true });
    });
    it('should render all on execution', () => {
      controller.execute();
      assert.equal(renderings['program'], true);
      assert.equal(renderings['currentInstr'], true);
      assert.equal(renderings['cpu'], true);
      assert.equal(renderings['memory'], true);
    });
  });
  describe('Program rendering on scroll up/down', () => {
    it('should re-render on scroll down', () => {
      model.setProgramLine(0);
      controller.onProgramScroll(8);
      assert.equal(renderings['program'], true);
      assert.equal(model.getProgramLine(), 8);
    });
    it('should re-render on scroll up', () => {
      model.setProgramLine(32);
      controller.onProgramScroll(-8);
      assert.equal(renderings['program'], true);
      assert.equal(model.getProgramLine(), 24);
    });
    it('should not re-render on scroll up if at bottom of program', () => {
      model.setProgramLine(0);
      controller.onProgramScroll(-8);
      assert.equal(renderings['program'], undefined);
      assert.equal(model.getProgramLine(), 0);
    });
    it('should not re-render on scroll down if at top of program', () => {
      const maxValue = c.MEMORY_SIZE + c.EXT_MEMORY_SIZE - c.INSTR_ON_UI*c.ARM_INSTR_LENGTH;
      model.setProgramLine(maxValue); // max program line 0x0fff ffb0
      controller.onProgramScroll(8);
      assert.equal(renderings['program'], undefined);
      assert.equal(model.getProgramLine(), maxValue);
    });
    it('should re-render on scroll up if there are lines available', () => {
      model.setProgramLine(4);
      controller.onProgramScroll(-8);
      assert.equal(renderings['program'], true);
      assert.equal(model.getProgramLine(), 0);
    });
    it('should re-render on scroll down if there are lines available', () => {
      model.setProgramLine(0x0fffffa8);
      controller.onProgramScroll(8);
      assert.equal(renderings['program'], true);
      assert.equal(model.getProgramLine(), 0x0fffffb0); // max
    });
  });
  describe('Go to Program Line', () => {
    it('should go to program line', () => {
      controller.setProgramLine('10');

      assert.equal(renderings['program'], true);
      assert.equal(renderings['currentInstr'], true);
      assert.equal(renderArgs['currentInstr'].offset, 0x10);
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
      assert.equal(renderArgs['currentInstr'].offset, 8);

      controller.setProgramLine('b');
      assert.equal(renderArgs['currentInstr'].offset, 8);

      controller.setProgramLine('c');
      assert.equal(renderArgs['currentInstr'].offset, 0xc);

      controller.setProgramLine('c');
      assert.equal(renderArgs['currentInstr'].offset, 0xc);
    });
    it('should render max program line', () => {
      controller.setProgramLine('0fffffb0'); // max value = max memory - 20 lines
      assert.equal(renderings['program'], true);
    });
    it('should not render invalid program lines', () => {
      controller.setProgramLine('-1');
      assert.equal(renderings['program'], undefined);
    });
    it('should default to max when larger than max', () => {
      controller.setProgramLine('0fffffb4'); // out of bound
      assert.equal(renderings['program'], true);
      assert.equal(model.getProgramLine(), 0x0fffffb0); //max
    });
  });
});