import {describe, it} from 'mocha';
import {assert} from 'chai';
import {JSDOM} from 'jsdom';
import View from '../../src/ui/view';

describe('View', () => {
  it('should construct', () => {
    assert.throws( () => new View(), Error);
  });
  it('should bind flag', () => {
    let view, called = false;
    const dom = new JSDOM('<div id="flags"><input type="checkbox"/></div>');
    view = new View(dom.window.document);
    const handler = function handler() { called = true; };
    const $flag = dom.window.document.querySelector('#flags input[type="checkbox"]');

    view.bind('setFlag', handler);
    $flag.click();
    assert.isTrue(called);
  });
});