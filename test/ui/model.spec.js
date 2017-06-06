import {describe, beforeEach, it} from 'mocha';
import {assert} from 'chai';
import Model from '../../src/ui/model';

describe('Model', () => {
  let model;
  beforeEach( () => {
    model = new Model();
  });
  it('should read/write flags', () => {
    let called = false;

    model.setFlag('N', true, function() { called = true; });
    assert.equal(model.getFlag('N'), true);
    assert.equal(called, true);
  });
});