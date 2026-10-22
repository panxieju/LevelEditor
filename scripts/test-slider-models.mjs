import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FBXLoader} from 'three/addons/loaders/FBXLoader.js';
globalThis.window={URL:globalThis.URL};
THREE.TextureLoader.prototype.load=function(){return new THREE.Texture();};
for(const nx of [1,2]) {
 const buffer=fs.readFileSync(`public/models/Slider${nx}x1x3.fbx`);
 const object=new FBXLoader().parse(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength),'');
 const originalBox=new THREE.Box3().setFromObject(object), originalSize=originalBox.getSize(new THREE.Vector3());
 object.scale.setScalar(2.4/Math.max(originalSize.x,originalSize.y,originalSize.z));
 object.updateMatrixWorld(true);
 const box=new THREE.Box3().setFromObject(object),size=box.getSize(new THREE.Vector3());
 assert.ok(Math.abs(size.x-nx*.8)<1e-5&&Math.abs(size.y-2.4)<1e-5&&Math.abs(size.z-.8)<1e-5,size.toArray().toString());
 const arrows=object.getObjectByName('DirectionArrows'),tail=object.getObjectByName('ArrowTail'),tip=object.getObjectByName('ArrowTip');
 for(const rotation of [0,Math.PI/2]) for(const target of [new THREE.Vector3(1,0,0),new THREE.Vector3(-1,0,0),new THREE.Vector3(0,0,1),new THREE.Vector3(0,0,-1)]) {
  object.rotation.y=rotation;object.updateMatrixWorld(true);
  const direction=tip.getWorldPosition(new THREE.Vector3()).sub(tail.getWorldPosition(new THREE.Vector3()));
  const turn=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),Math.atan2(-target.z,target.x)-Math.atan2(-direction.z,direction.x));
  const current=arrows.getWorldQuaternion(new THREE.Quaternion()),parentInverse=arrows.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
  arrows.quaternion.copy(parentInverse.multiply(turn).multiply(current));object.updateMatrixWorld(true);
  const actual=tip.getWorldPosition(new THREE.Vector3()).sub(tail.getWorldPosition(new THREE.Vector3())).normalize();
  assert.ok(actual.dot(target)>.99999,actual.toArray().toString());
 }
}
console.log('Both exported FBX models: Three.js dimensions and all four arrow directions after both body rotations passed.');
const railBytes=fs.readFileSync('public/models/SliderRail.fbx');
const rail=new FBXLoader().parse(railBytes.buffer.slice(railBytes.byteOffset,railBytes.byteOffset+railBytes.byteLength),'');
const railSize=new THREE.Box3().setFromObject(rail).getSize(new THREE.Vector3());
rail.scale.setScalar(.8/Math.max(railSize.x,railSize.y,railSize.z));rail.updateMatrixWorld(true);
const railBox=new THREE.Box3().setFromObject(rail);
assert.ok(Math.abs(railBox.getSize(new THREE.Vector3()).y-.004)<1e-6);
assert.ok(rail.getObjectByName('RailWood')&&rail.getObjectByName('RailSteel'));
const tail=rail.getObjectByName('ArrowTail'),tip=rail.getObjectByName('ArrowTip');
for(const target of [new THREE.Vector3(1,0,0),new THREE.Vector3(-1,0,0),new THREE.Vector3(0,0,1),new THREE.Vector3(0,0,-1)]){
 rail.rotation.y=0;rail.updateMatrixWorld(true);
 const d=tip.getWorldPosition(new THREE.Vector3()).sub(tail.getWorldPosition(new THREE.Vector3()));
 rail.rotation.y=Math.atan2(-target.z,target.x)-Math.atan2(-d.z,d.x);rail.updateMatrixWorld(true);
 assert.ok(tip.getWorldPosition(new THREE.Vector3()).sub(tail.getWorldPosition(new THREE.Vector3())).normalize().dot(target)>.99999);
}
console.log('New rail FBX: 4mm thickness, wood/iron geometry and four straight axes passed.');
