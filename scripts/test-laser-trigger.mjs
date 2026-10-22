import assert from 'node:assert/strict';
import { createScene, addEntity, canPlace, moveEntity, occupiedVolumes, pairedEntities, expandSupportColumns, parseScene, serializeScene, TYPE_MAP, mechanismColor, MECHANISM_PALETTE, isLaserType } from '../src/level.js';
let scene = { ...createScene(), layerCount: 3 };
scene = addEntity(scene, 'laserTrigger', 2, 2, 2).scene;
const sensor = scene.entities[0];
assert.equal(TYPE_MAP.laserTrigger.movable, true);
assert.equal(TYPE_MAP.laserTrigger.overlay, undefined);
assert.equal(sensor.number, null);
assert.equal(occupiedVolumes(sensor).length, 1);
assert.equal(canPlace(scene, 'box1x1', 2, 2, 2).ok, false);
assert.equal(canPlace(scene, 'laserTrigger', 2, 2, 2).ok, false);
sensor.number = 7;
scene.entities.push(
  { id: 'door', type: 'door', x: 0, z: 0, layer: 0, rotation: 0, number: 7 },
  { id: 'spring', type: 'spring', x: 4, z: 4, layer: 0, number: 7 },
  { id: 'portal', type: 'portal', x: 6, z: 4, layer: 0, facing: 'S', number: 7 },
);
assert.deepEqual(pairedEntities(scene, sensor).map(e => e.id), ['door', 'spring']);
assert.deepEqual(pairedEntities(scene, scene.entities[1]).map(e => e.id), [sensor.id]);
assert.deepEqual(pairedEntities(scene, scene.entities[2]).map(e => e.id), [sensor.id]);
assert.equal(parseScene(serializeScene(scene)).entities.find(e => e.type === 'laserTrigger').number, 7);
const supported = expandSupportColumns(scene);
assert.equal(supported.entities.filter(e => e.type === 'ground' && e.x === 2 && e.z === 2).length, 2);
const moved = moveEntity(scene, sensor.id, 3, 2, 2);
assert.equal(moved.result.ok, true);
assert.equal(moved.scene.entities.find(e => e.id === sensor.id).number, 7);
console.log('Laser trigger: volume, collision, movement, pairing and JSON checks passed.');

const groups = { entities: [] };
for (const [index, number] of [0, 10, 20, 30, 40, 50, 60, 70, 80, 99].entries()) {
  for (const type of ['trigger', 'laserTrigger', 'spring']) groups.entities.push({ id: `${type}${index}`, type, number });
  const expected = MECHANISM_PALETTE[index];
  assert.equal(mechanismColor(groups, groups.entities.at(-1)), expected);
}
assert.equal(new Set(groups.entities.map(e => mechanismColor(groups, e))).size, 10);
for (let i = 0; i < groups.entities.length; i += 3) assert.equal(mechanismColor(groups, groups.entities[i]), mechanismColor(groups, groups.entities[i + 2]));
assert.equal(mechanismColor(groups, { type: 'spring', number: null }), '#A3ABB3');
assert.equal(isLaserType('laserTrigger'), false);
const reordered = { entities: [...groups.entities].reverse() };
for (const entity of groups.entities) assert.equal(mechanismColor(reordered, entity), mechanismColor(groups, entity));
console.log('Ten distinct colors, shared groups, neutral null, sorted determinism and receiver exclusion passed.');
