import {describe, it, beforeEach} from 'mocha';
import {assert} from 'chai';
import {JSDOM} from 'jsdom';
import View from '../../src/ui/view';

describe('View', () => {
  let dom, view;
  let $load, $program, $memory, $flag;
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
      <div id="program"><ul></ul></div>
      <div id="memory"><textarea></textarea></div>
      <div id="flags"><input type="checkbox"/></div>
    `);
    $load = dom.window.document.getElementById('load');
    $program = dom.window.document.querySelector('#program ul');
    $memory = dom.window.document.querySelector('#memory textarea');
    $flag = dom.window.document.querySelector('#flags input[type="checkbox"]');

    view = new View(dom.window.document, mockReader);
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

      view.render('program', empty);
      const $nodes = $program.children;
      assert.equal($nodes.length, 100);
      assert.equal($nodes[0].innerText,  '00000000 00000000  and r0,r0,r0');
      assert.equal($nodes[99].innerText, '0000018c 00000000  and r0,r0,r0');
    });
    it('should render program instructions', () => {
      const empty = new Uint8Array(8);
      const program = [0xea000018, 0xea000004, 0xea00004c, 0xe35e0000, 0xe3a0e004, 0xe3a0c301, 0xe59cc300, 0xffffffff];

      view.render('program', program);
      const $nodes = $program.children;
      assert.equal($nodes.length, 8);
      assert.equal($nodes[0].innerText, '00000000 ea000018  b 0x68');
      assert.equal($nodes[1].innerText, '00000004 ea000004  b 0x1c');
      assert.equal($nodes[2].innerText, '00000008 ea00004c  b 0x0140');
      assert.equal($nodes[3].innerText, '0000000c e35e0000  cmp r14,0x00');
      assert.equal($nodes[4].innerText, '00000010 e3a0e004  mov r14,0x04');
      assert.equal($nodes[5].innerText, '00000014 e3a0c301  mov r12,0x04000000');
      assert.equal($nodes[6].innerText, '00000018 e59cc300  ldr r12,[r12,0x0300]');
      assert.equal($nodes[7].innerText, '0000001c ffffffff  ???');

      view.render('program', empty);
      assert.equal($program.children.length, 8, 'Should override the previous program');
    });
  });
});