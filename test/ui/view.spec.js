import {describe, it, beforeEach} from 'mocha';
import {assert} from 'chai';
import {JSDOM} from 'jsdom';
import View from '../../src/ui/view';

describe('View', () => {
  let dom;
  beforeEach( () => {
    dom = new JSDOM(`
      <div id="memory"><textarea></textarea></div>
      <div id="flags"><input type="checkbox"/></div>
    `);
  });
  it('should construct', () => {
    assert.throws( () => new View(undefined), Error);
  });
  it('should bind flag', () => {
    let view, called = false;
    view = new View(dom.window.document);
    const handler = function handler() { called = true; };
    const $flag = dom.window.document.querySelector('#flags input[type="checkbox"]');

    view.bind('setFlag', handler);
    $flag.click();
    assert.isTrue(called);
  });
  it('should render memory page (16 lines)', () => {
    const view = new View(dom.window.document);
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