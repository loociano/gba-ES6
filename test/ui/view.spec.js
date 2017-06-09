import {describe, it, beforeEach} from 'mocha';
import {assert} from 'chai';
import {JSDOM} from 'jsdom';
import View from '../../src/ui/view';
import * as c from '../../src/constants';

describe('View', () => {
  let dom, view;
  let $load, $program, $infiniteList, $programLines, $programScrollView, $memory, $registers, $flag, $nextButton;
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
      <div id="cpu"><ul></ul></div>
      <div id="program"><div id="infinite-list"><div id="scroll-view"><ul></ul></div></div></div>
      <div id="memory"><textarea></textarea></div>
      <div id="flags"><input type="checkbox"/></div>
      <div id="controls"><button name="next">next</button></div>
    `);
    $load = dom.window.document.getElementById('load');
    $programLines = dom.window.document.querySelectorAll('#program ul li');
    $infiniteList = dom.window.document.getElementById('infinite-list');
    $program = dom.window.document.getElementById('program');
    $programScrollView = dom.window.document.querySelector('#program #scroll-view');
    $memory = dom.window.document.querySelector('#memory textarea');
    $flag = dom.window.document.querySelector('#flags input[type="checkbox"]');
    $nextButton = dom.window.document.querySelector('#controls button[name="next"]');

    view = new View(dom.window, mockReader);
  });
  it('should construct', () => {
    assert.throws( () => new View(undefined), Error);
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
  describe('Execution view', () => {
    it('should bind Next button', () => {
      let called = false;
      const handler = function handler() {
        called = true;
      };
      view.bind('executeNext', handler);
      $nextButton.click();
      assert.isTrue(called);
    });
  });
  describe('CPU view',  () => {
    it('should bind flag', () => {
      let called = false;
      const handler = function handler() {
        called = true;
      };
      view.bind('setFlag', handler);
      $flag.click();
      assert.isTrue(called);
    });
    it('should render registers', () => {
      const registers = { r0: 0, r1: 1, r2: 2, r3: 3, r4: 4, r5: 5, r6: 6, r7: 7, r8: 8, r9: 9, r10: 10, r11: 11, r12: 12, r13: 13, r14: 14, pc: 15, cpsr: 16, sprs: 17};

      view.render('cpu', registers);
      $registers = dom.window.document.querySelectorAll('#cpu ul li');
      assert.equal($registers.length, 18);
      assert.equal($registers[0].innerHTML, 'r0 &nbsp;&nbsp;00000000');
      assert.equal($registers[1].innerHTML, 'r1 &nbsp;&nbsp;00000001');
      assert.equal($registers[2].innerHTML, 'r2 &nbsp;&nbsp;00000002');
      assert.equal($registers[3].innerHTML, 'r3 &nbsp;&nbsp;00000003');
      assert.equal($registers[4].innerHTML, 'r4 &nbsp;&nbsp;00000004');
      assert.equal($registers[5].innerHTML, 'r5 &nbsp;&nbsp;00000005');
      assert.equal($registers[6].innerHTML, 'r6 &nbsp;&nbsp;00000006');
      assert.equal($registers[7].innerHTML, 'r7 &nbsp;&nbsp;00000007');
      assert.equal($registers[8].innerHTML, 'r8 &nbsp;&nbsp;00000008');
      assert.equal($registers[9].innerHTML, 'r9 &nbsp;&nbsp;00000009');
      assert.equal($registers[10].innerHTML, 'r10 &nbsp;0000000a');
      assert.equal($registers[11].innerHTML, 'r11 &nbsp;0000000b');
      assert.equal($registers[12].innerHTML, 'r12 &nbsp;0000000c');
      assert.equal($registers[13].innerHTML, 'r13 &nbsp;0000000d');
      assert.equal($registers[14].innerHTML, 'r14 &nbsp;0000000e');
      assert.equal($registers[15].innerHTML, 'pc &nbsp;&nbsp;0000000f');
      assert.equal($registers[16].innerHTML, 'cpsr 00000010');
      assert.equal($registers[17].innerHTML, 'sprs 00000011');
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
      assert.equal($programLines[c.INSTR_ON_UI-1].innerText, '00000048 00000000  and r0,r0,r0');
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
      const handler = () => {called = true; };
      const evt = dom.window.document.createEvent('HTMLEvents');
      evt.initEvent('wheel', false, true);

      view.bind('program-scroll', handler);
      $infiniteList.dispatchEvent(evt);
      assert.isTrue(called);
    });
    it('should highlight current instruction', () => {
      view.render('program', {instrs: new Uint8Array(100), offset: 0});

      view.render('currentInstr', 0);
      $programLines = dom.window.document.querySelectorAll('#program ul li');
      assert.equal($programLines[0].className, 'selected');
      assert.equal($programLines[1].className, '');

      view.render('currentInstr', 4);
      assert.equal($programLines[0].className, '');
      assert.equal($programLines[1].className, 'selected');
    });
  });
});