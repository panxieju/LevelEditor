import assert from 'node:assert/strict';
import { TYPE_MAP, FACINGS, laserAxisFacings, laserAxisFacing, laserMuzzleCell, occupiedCells, addEntity, createScene, parseScene } from '../src/level.js';
assert.deepEqual(TYPE_MAP.laser1x1x1.size,{nx:1,nz:1,ny:1});
assert.deepEqual(laserAxisFacings(0,'laser1x1x1'),FACINGS);
for(const facing of FACINGS){
  assert.equal(laserAxisFacing(0,facing,'laser1x1x1'),facing);
  const e={id:'cube',type:'laser1x1x1',x:2,z:2,layer:0,facing};
  assert.deepEqual(occupiedCells(e),[{x:2,z:2}]);
  assert.deepEqual(laserMuzzleCell(e),{x:2,z:2});
  const placed=addEntity(createScene(),e.type,2,2,0,0,facing);
  assert.equal(placed.result.ok,true);assert.equal(placed.scene.entities.at(-1).facing,facing);
  assert.equal(parseScene(JSON.stringify(placed.scene)).entities.at(-1).facing,facing);
}
assert.deepEqual(laserAxisFacings(0,'laser2x1x1'),['E','W']);
assert.deepEqual(laserAxisFacings(90,'laser2x1x2'),['N','S']);
console.log('Cube laser: all four facings, one-cell occupancy and old two-cell constraints passed.');
