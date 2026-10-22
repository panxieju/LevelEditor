import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {FBXLoader} from 'three/addons/loaders/FBXLoader.js';
import {TYPE_MAP,createScene,addEntity,canPlace,parseScene,serializeScene,occupiedVolumes,expandSupportColumns} from '../src/level.js';
assert.equal(TYPE_MAP.glass.movable,true);assert.equal(TYPE_MAP.target.overlay,true);assert.equal(TYPE_MAP.target.visualScale,6);
let scene={...createScene(),layerCount:4};scene=addEntity(scene,'target',2,2,1).scene;
assert.equal(canPlace(scene,'player',2,2,1).ok,true);assert.equal(canPlace(scene,'glass',2,2,1).ok,true);
scene=addEntity(scene,'glass',3,3,2).scene;const glass=scene.entities.find(e=>e.type==='glass');
assert.equal(occupiedVolumes(glass).length,1);assert.equal(canPlace(scene,'box1x1',3,3,2).ok,false);
assert.deepEqual(parseScene(serializeScene(scene)),scene);assert.equal(expandSupportColumns(scene).entities.filter(e=>e.type==='ground'&&e.x===3&&e.z===3).length,2);
globalThis.window={URL:globalThis.URL};THREE.TextureLoader.prototype.load=function(){return new THREE.Texture();};
for(const [name,targetHeight] of [['GoalBeacon',4.8],['GlassBox',.8]]) {
 const buffer=fs.readFileSync(`public/models/${name}.fbx`),o=new FBXLoader().parse(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength),'');
 const size=new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3());o.scale.setScalar(targetHeight/Math.max(size.x,size.y,size.z));o.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(o),actual=b.getSize(new THREE.Vector3());
 assert.ok(Math.abs(actual.y-targetHeight)<.00001);
 if(name==='GlassBox')assert.ok(Math.abs(actual.x-.8)<.00001&&Math.abs(actual.z-.8)<.00001);
 else {assert.ok(actual.x<=.8&&actual.z<=.8);assert.ok(o.getObjectByName('GoalBeamOuter'));}
}
console.log('Goal overlay and six-cell beacon, glass occupancy/support and JSON round trips, real FBX dimensions passed.');
