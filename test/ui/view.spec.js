import {describe, it, beforeEach} from 'mocha';
import {assert} from 'chai';
import {JSDOM} from 'jsdom';
import View from '../../src/ui/view';

describe('View', () => {
  let dom, view;
  beforeEach( () => {
    dom = new JSDOM(`
      <div id="program"><ul></ul></div>
      <div id="memory"><textarea></textarea></div>
      <div id="flags"><input type="checkbox"/></div>
    `);
    view = new View(dom.window.document);
  });
  it('should construct', () => {
    assert.throws( () => new View(undefined), Error);
  });
  describe('CPU view',  () => {
    it('should bind flag', () => {
      let called = false;
      const handler = function handler() {
        called = true;
      };
      const $flag = dom.window.document.querySelector('#flags input[type="checkbox"]');
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
      const $memory = dom.window.document.querySelector('#memory textarea');

      view.render('memory', memory);
      const lines = $memory.textContent.split('\n');
      assert.equal(lines.length, 0x10);
      assert.equal(lines[0], '00000000 11 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00');
      assert.equal(lines[0xf], '000000f0 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 ff');
    });
  });
  describe('Program view', () => {
    it('should render program instructions', () => {
      const program = [0xea000018, 0xe35e0000, 0xe3a0e004, 0xe3a0c301, 0xe59cc300, 0xffffffff];
      const $program = dom.window.document.querySelector('#program ul');

      view.render('program', program);
      const $nodes = $program.children;
      assert.equal($nodes.length, 6);
      assert.equal($nodes[0].innerText, '00000000 ea000018  b 0x68');
      assert.equal($nodes[1].innerText, '00000004 e35e0000  cmp r14,0x00');
      assert.equal($nodes[2].innerText, '00000008 e3a0e004  mov r14,0x04');
      assert.equal($nodes[3].innerText, '0000000c e3a0c301  mov r12,0x04000000');
      assert.equal($nodes[4].innerText, '00000010 e59cc300  ldr r12,[r12,0x0300]');
      assert.equal($nodes[5].innerText, '00000014 ffffffff  ???');
    });
  });
});