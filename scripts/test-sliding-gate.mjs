import assert from 'node:assert/strict';
import { CELL_SIZE, TYPE_MAP, createScene, occupiedCells, occupiedVolumes, reservedCells, doorLeafCells, addEntity, parseScene, serializeScene } from '../src/level.js';
assert.equal(CELL_SIZE, .8);
assert.deepEqual(TYPE_MAP.door.size, { nx: 4, nz: 1, ny: 3 });
for (const rotation of [0, 90]) {
  const gate = { id: 'gate', type: 'door', x: 0, z: 0, layer: 1, number: 3, rotation };
  const expected = [0, 1, 2, 3].map(i => rotation ? { x: 0, z: i } : { x: i, z: 0 });
  assert.deepEqual(occupiedCells(gate), expected);
  assert.equal(occupiedVolumes(gate).length, 12);
  assert.deepEqual(reservedCells(gate), expected);
  assert.deepEqual(doorLeafCells(gate), [expected[0], expected[3]]);
  const scene = { ...createScene(), layerCount: 4, entities: [gate] };
  assert.deepEqual(parseScene(serializeScene(scene)), scene);
  for (const c of expected) for (const layer of [1, 2, 3])
    assert.equal(addEntity(scene, 'box1x1', c.x, c.z, layer).result.ok, false);
}
assert.equal(addEntity(createScene(), 'door', 0, 0, 0).result.ok, true);
assert.equal(addEntity(createScene(), 'door', 5, 0, 0).result.ok, false);
const legacy = parseScene(JSON.stringify({ ...createScene(), entities: [{ id: 'v', type: 'door', x: 1, z: 1, layer: 0, direction: 'v', number: 1 }] }));
assert.equal(legacy.entities[0].rotation, 90);
console.log('Sliding gate: 4-cell/3-layer footprint, internal end bays, rotations, legacy direction and round trips passed.');
