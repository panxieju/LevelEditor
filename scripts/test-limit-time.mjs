import assert from 'node:assert/strict';
import { createScene, parseScene, serializeScene, expandSupportColumns } from '../src/level.js';

assert.equal(createScene().limitTime, 5);
const base = { name: 'timer-test', grid: { width: 4, depth: 4 }, layerCount: 2,
  entities: [{ id: 'g', type: 'ground', x: 0, z: 0, layer: 0 }] };
for (const [value, expected] of [[undefined, 5], [5, 5], [2.5, 2.5], [0, 0], [-1, 5], [null, 5], ['5', 5]]) {
  const input = { ...base, ...(value === undefined ? {} : { limitTime: value }) };
  const parsed = parseScene(JSON.stringify(input));
  const exported = JSON.parse(serializeScene(expandSupportColumns(parsed)));
  assert.equal(parsed.limitTime, expected);
  assert.equal(exported.limitTime, expected);
  assert.deepEqual(exported.entities, base.entities);
}
assert.equal(JSON.parse(serializeScene(base)).limitTime, 5);
console.log('limitTime: default, old JSON, fractional minutes, unlimited and import/export round trips passed.');
