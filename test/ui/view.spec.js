import {describe, it, beforeEach} from 'mocha';
import {assert} from 'chai';
import {JSDOM} from 'jsdom';
import View from '../../src/ui/view';
import * as c from '../../src/constants';
import * as s from '../../src/ui/strings';
import AnimationFrame from '../../src/ui/animationFrame';

describe('View', () => {
  let dom, view;
  let $load, $program, $programLines, $programLineInput, $setProgramLine, $memory, $registers, $flags, $flagLines, $flagN, $stepButton, $runButton;
  const mockReader = {
    /**
     * @param {Array} file
     * @return {ArrayBuffer}
     */
    readAsArrayBuffer: function(file) {
      const evtMock = {
        target: {
          result: file[1] // ArrayBuffer
        }
      };
      this.onload(evtMock);
    },
    onload: function(evt) {}
  };
  beforeEach( () => {
    dom = new JSDOM(`
      <input id="load" type="file"/>
      <div id="cpu">
       <ul>
        <li>r0 &nbsp;&nbsp;<span id="r0">00000000</span></li>
        <li>r1 &nbsp;&nbsp;<span id="r1">00000000</span></li>
        <li>r2 &nbsp;&nbsp;<span id="r2">00000000</span></li>
        <li>r3 &nbsp;&nbsp;<span id="r3">00000000</span></li>
        <li>r4 &nbsp;&nbsp;<span id="r4">00000000</span></li>
        <li>r5 &nbsp;&nbsp;<span id="r5">00000000</span></li>
        <li>r6 &nbsp;&nbsp;<span id="r6">00000000</span></li>
        <li>r7 &nbsp;&nbsp;<span id="r7">00000000</span></li>
        <li>r8 &nbsp;&nbsp;<span id="r8">00000000</span></li>
        <li>r9 &nbsp;&nbsp;<span id="r9">00000000</span></li>
        <li>r10 &nbsp;<span id="r10">00000000</span></li>
        <li>r11 &nbsp;<span id="r11">00000000</span></li>
        <li>r12 &nbsp;<span id="r12">00000000</span></li>
        <li>r13 &nbsp;<span id="r13">00000000</span></li>
        <li>r14 &nbsp;<span id="r14">00000000</span></li>
        <li>pc &nbsp;&nbsp;<span id="pc">00000000</span></li>
        <li>cpsr <span id="cpsr">00000000</span></li>
        <li>sprs <span id="sprs">00000000</span></li>
       </ul></div>
      <div id="program"><ul></ul><input name="programLine"/><button name="setProgramLine"></button></div>
      <div id="memory"><textarea></textarea></div>
      <div id="flags">
        <li><input type="checkbox" id="N"/></li>
        <li><input type="checkbox" id="Z"/></li>
        <li><input type="checkbox" id="C"/></li>
        <li><input type="checkbox" id="V"/></li>
        <li><input type="checkbox" id="I"/></li>
        <li><input type="checkbox" id="F"/></li>
        <li><input type="checkbox" id="T"/></li>
        </div>
      <div id="controls"><button name="run"></button><button name="step"></button></div>
    `);
    $load = dom.window.document.getElementById('load');
    $program = dom.window.document.getElementById('program');
    $programLines = dom.window.document.querySelectorAll('#program ul li');
    $setProgramLine = dom.window.document.querySelector('button[name="setProgramLine"]');
    $programLineInput = dom.window.document.querySelector('input[name="programLine"]');
    $memory = dom.window.document.querySelector('#memory textarea');
    $flagN = dom.window.document.querySelector('#flags #N');
    $flags = dom.window.document.querySelectorAll('#flags input[type="checkbox"]');
    $flagLines = dom.window.document.querySelectorAll('#flags li');
    $stepButton = dom.window.document.querySelector('#controls button[name="step"]');
    $runButton = dom.window.document.querySelector('#controls button[name="run"]');
    $registers = dom.window.document.querySelectorAll('#cpu span');
    view = new View(dom.window, mockReader);
    view.mockKeyPress = function($elt, key) {
      const event = dom.window.document.createEvent('Event');
      event.keyCode = key;
      event.initEvent('keydown');
      $elt.dispatchEvent(event);
    };
  });
  describe('Initialization', () => {
    it('should not construct without inputs', () => {
      assert.throws(() => new View(undefined), Error);
      assert.throws(() => new View(dom.window, undefined), Error);
    });
    it('should attach animationFrame.frame to window object', () => {
      assert.equal(view._window.frame, AnimationFrame.frame);
    });
  });
  describe('Menu', () => {
    it('should bind load', () => {
      let called = false;
      const handler = () => { called = true; };
      const evt = dom.window.document.createEvent('HTMLEvents');
      evt.initEvent('change', false, true);
      view.load = (evt, handler) => handler();

      view.bind('load', handler);
      $load.dispatchEvent(evt);
      assert.isTrue(called);
    });
    it('should load a file', () => {
      let called = false;
      const handler = () => { called = true; };
      const mockEvt = { target: { files: ['foo', new ArrayBuffer(8)] }};
      view.load(mockEvt, handler);
      assert.isTrue(called);
    });
  });
  describe('Controls View', () => {
    it('should render buttons', () => {
      view.render('controls', {run: false, step: false});
      assert.isTrue($runButton.disabled);
      assert.isTrue($stepButton.disabled);
      view.render('controls', {run: true, step: true});
      assert.isFalse($runButton.disabled);
      assert.isFalse($stepButton.disabled);
    });
    it('should bind Step button', () => {
      let called = false;
      const handler = function handler() {
        called = true;
      };
      view.bind('execute', handler);
      $stepButton.click();
      assert.isTrue(called);
    });
    it('should bind Run button', () => {
      let clicked = false;
      view.bind('run', () => { clicked = true; });
      $runButton.click();
      assert.isTrue(clicked);
    });
    it('should render running', () => {
      assert.equal($runButton.textContent, s.RUN);
      view.render('running', true);
      assert.equal($runButton.textContent, s.PAUSE);
      view.render('running', false);
      assert.equal($runButton.textContent, s.RUN);
    });
  });
  describe('CPU view',  () => {
    it('should bind flag', () => {
      let flag, value;
      view.bind('setFlag', (f, v) => {
        flag = f;
        value = v;
      });
      $flagN.click();
      assert.equal(flag, 'N');
      assert.equal(value, true);
      $flagN.click();
      assert.equal(value, false);
    });
    it('should render registers', () => {
      const registers = { r0: 0, r1: 1, r2: 2, r3: 3, r4: 4, r5: 5, r6: 6, r7: 7, r8: 8, r9: 9, r10: 10, r11: 11, r12: 12, r13: 13, r14: 14, pc: 15, cpsr: 0, sprs: 17};
      view.render('cpu', registers);
      assert.equal($registers.length, 18);
      assert.equal($registers[0].innerText, '00000000');
      assert.equal($registers[1].innerText, '00000001');
      assert.equal($registers[2].innerText, '00000002');
      assert.equal($registers[3].innerText, '00000003');
      assert.equal($registers[4].innerText, '00000004');
      assert.equal($registers[5].innerText, '00000005');
      assert.equal($registers[6].innerText, '00000006');
      assert.equal($registers[7].innerText, '00000007');
      assert.equal($registers[8].innerText, '00000008');
      assert.equal($registers[9].innerText, '00000009');
      assert.equal($registers[10].innerText, '0000000a');
      assert.equal($registers[11].innerText, '0000000b');
      assert.equal($registers[12].innerText, '0000000c');
      assert.equal($registers[13].innerText, '0000000d');
      assert.equal($registers[14].innerText, '0000000e');
      assert.equal($registers[15].innerText, '0000000f');
      assert.equal($registers[16].innerText, '00000000');
      assert.equal($registers[17].innerText, '00000011');
      $flags.forEach( ($flag) => assert.equal($flag.checked, false) );

      view.render('cpu', { cpsr: 0xf00000e0 } /* all flags set */);
      assert.equal($registers[16].innerText, 'f00000e0');
      for(let f = 0; f < $flags.length; f++) {
        const $flag = $flags[f];
        const $flagLine = $flagLines[f];
        assert.equal($flag.checked, true);
        assert.equal($flagLine.className, 'updated');
      }

      view.render('cpu', { cpsr: 0x300000e0 } /* reset nz */);
      assert.equal($registers[16].innerText, '300000e0');
      for(let f = 0; f < $flags.length; f++) {
        const $flag = $flags[f];
        const $flagLine = $flagLines[f];
        if ($flag.id === 'N' || $flag.id === 'Z') {
          assert.equal($flag.checked, false);
          assert.equal($flagLine.className, 'updated');
        } else {
          assert.equal($flag.checked, true);
          assert.equal($flagLine.className, '');
        }
      }

      view.render('cpu', {} /* no flag changes */);
      for(let f = 0; f < $flags.length; f++) {
        assert.equal($flagLines[f].className, '');
      }
    });
    it('should highlight modified registers', () => {
      const registers = { r1: 0xa, pc: 0xb};

      view.render('cpu', registers);
      assert.equal($registers[0].innerHTML, '00000000');
      assert.equal($registers[0].className, '');
      assert.equal($registers[1].innerText, '0000000a');
      assert.equal($registers[1].className, 'updated');
      // ...
      assert.equal($registers[15].innerText, '0000000b');
      assert.equal($registers[15].className, 'updated');
    });
  });
  describe('Memory view', () => {
    it('should render memory page (16 lines)', () => {
      const memory = new Uint8Array(0x100);
      memory[0] = 0x11;
      memory[0xff] = 0xff;

      view.render('memory', memory);
      const lines = $memory.textContent.split('\n');
      assert.equal(lines.length, 0x10);
      assert.equal(lines[0], '00000000 11 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00');
      assert.equal(lines[0xf], '000000f0 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 ff');
    });
  });
  describe('Program view', () => {
    it('should render empty program', () => {
      const empty = new Uint8Array(100);

      view.render('program', {instrs: empty, offset: 0});
      $programLines = dom.window.document.querySelectorAll('#program ul li');
      assert.equal($programLines.length, c.INSTR_ON_UI);
      assert.equal($programLines[0].innerText,  '00000000 00000000  and r0,r0,r0');
      assert.equal($programLines[c.INSTR_ON_UI-1].innerText, '0000004c 00000000  and r0,r0,r0');
    });
    it('should render program instructions', () => {
      const empty = new Uint8Array(20);
      const program = [0xea000018, 0xea000004, 0xea00004c, 0xe35e0000, 0xe3a0e004, 0xe3a0c301, 0xe59cc300, 0xffffffff,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

      view.render('program', {instrs: program, offset: 0});
      $programLines = dom.window.document.querySelectorAll('#program ul li');
      assert.equal($programLines.length, c.INSTR_ON_UI);
      assert.equal($programLines[0].innerText, '00000000 ea000018  b 0x68');
      assert.equal($programLines[1].innerText, '00000004 ea000004  b 0x1c');
      assert.equal($programLines[2].innerText, '00000008 ea00004c  b 0x0140');
      assert.equal($programLines[3].innerText, '0000000c e35e0000  cmp r14,0x00');
      assert.equal($programLines[4].innerText, '00000010 e3a0e004  mov r14,0x04');
      assert.equal($programLines[5].innerText, '00000014 e3a0c301  mov r12,0x04000000');
      assert.equal($programLines[6].innerText, '00000018 e59cc300  ldr r12,[r12,0x0300]');
      assert.equal($programLines[7].innerText, '0000001c ffffffff  ???');

      view.render('program', {instrs: empty, offset: 0});
      assert.equal($programLines.length, c.INSTR_ON_UI, 'Should override the previous program');
      assert.equal($programLines[0].innerText,  '00000000 00000000  and r0,r0,r0');
    });
    it('should bind onmousewheel (scroll)', () => {
      let called = false;
      const evt = dom.window.document.createEvent('HTMLEvents');
      evt.initEvent('wheel', false, true);

      view.bind('onProgramScroll', () => {called = true; });
      $program.dispatchEvent(evt);
      assert.isTrue(called);
    });
    it('should highlight current instruction', () => {
      view.render('program', {instrs: new Uint8Array(100), offset: 0});

      view.render('currentInstr', {offset: 0, pc: 8});
      $programLines = dom.window.document.querySelectorAll('#program ul li');
      assert.equal($programLines[0].className, 'selected');

      view.render('currentInstr', {offset: 8, pc: 8});
      assert.equal($programLines[0].className, '');

      view.render('currentInstr', {offset: 0, pc: 80}); // 18*4=72
      assert.equal($programLines[18].className, 'selected');

      view.render('currentInstr', {offset: 0, pc: 88});
      assert.equal($programLines[18].className, '');

      view.render('currentInstr', {offset: 100, pc: 107});
      assert.equal($programLines[0].className, '');

      view.render('currentInstr', {offset: 100, pc: 108});
      assert.equal($programLines[0].className, 'selected');

      view.render('currentInstr', {offset: 100, pc: (100+18*4)+8});
      assert.equal($programLines[18].className, 'selected');
    });
    it('should bind program line jump', () => {
      let programLine;
      const handler = (line) => { programLine = line };
      view.bind('setProgramLine', handler);

      $programLineInput.value = '5';
      $setProgramLine.click();
      assert.equal(programLine, '5');

      $programLineInput.value = '-1'; // invalid hex
      $setProgramLine.click();
      assert.equal(programLine, '-1');

      $programLineInput.value = 'f';
      $setProgramLine.click();
      assert.equal(programLine, 'f');
    });
    it('should bind Enter key on program jump address', () => {
      let programLine;
      const handler = (line) => { programLine = line };
      view.bind('onKeyDownProgramLine', handler);
      $programLineInput.value = '5';

      view.mockKeyPress($programLineInput, c.ENTER_KEYCODE);
      assert.equal(programLine, '5');
    });
  });
});