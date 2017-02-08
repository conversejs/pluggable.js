import test from 'tape';
import * as _ from 'lodash';
import * as pluggable from './pluggable';

test('A passing test', (assert) => {
  assert.pass('This test will pass.');
  assert.end();
});

test('Assertions with tape.', (assert) => {
  const expected = 'something to test';
  const actual = 'sonething to test';
  assert.equal(actual, expected,
    'Given two mismatched values, .equal() should produce a nice bug report');
  assert.end();
});
