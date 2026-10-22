import assert from 'node:assert/strict';
import { createScene, fillGround } from '../src/level.js';
const scene = { ...createScene(), layerCount: 2 };
const filled = fillGround(scene, 1);
assert.equal(filled.entities.filter(e => e.type === 'boundary').length, 24);
assert.equal(filled.entities.filter(e => e.type === 'ground').length, 24);
assert.ok(filled.entities.every(e => e.layer === 1));
assert.ok(filled.entities.slice(0,24).every(e => e.type === 'boundary'));
assert.deepEqual(fillGround(filled, 1), filled);
const existing = [
  { id: 'box', type: 'box1x1', x: 0, z: 0, layer: 1 },
  { id: 'target', type: 'target', x: 1, z: 0, layer: 1 },
  { id: 'trigger', type: 'trigger', x: 2, z: 2, layer: 1 },
  { id: 'slider', type: 'slider1x1x3', x: 3, z: 3, layer: 0, track: [{ x: 3, z: 2 }] },
];
const occupied = fillGround({ ...scene, layerCount: 3, entities: existing }, 1);
assert.ok(occupied.entities.includes(existing[0]));
assert.equal(occupied.entities.filter(e => e.x === 1 && e.z === 0 && e.layer === 1).length, 1);
assert.equal(occupied.entities.filter(e => e.x === 2 && e.z === 2 && e.layer === 1).length, 2);
assert.equal(occupied.entities.filter(e => e.x === 3 && e.z === 2 && e.layer === 1).length, 0);
const small = fillGround({ ...createScene(), grid: { width: 2, depth: 2 } }, 0);
assert.equal(small.entities.length, 4);
assert.ok(small.entities.every(e => e.type === 'boundary'));
console.log('Layer fill: perimeter first, interior ground, selected layer, existing entities, reserved tracks, repeat clicks and small grids passed.');
