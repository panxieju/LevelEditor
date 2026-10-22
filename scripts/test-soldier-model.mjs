import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { normalizeFbxTemplate, cloneFbxTemplate, withFbxAnimation } from '../src/fbxModels.js';
import { CELL_SIZE, FACING_ROTATION, TYPE_MAP } from '../src/level.js';

globalThis.window = { URL: globalThis.URL };
let textureCount = 0;
THREE.TextureLoader.prototype.load = function () { textureCount++; return new THREE.Texture(); };
const readFbx = filename => {
  const bytes = fs.readFileSync(new URL(`../public/models/${filename}`, import.meta.url));
  return new FBXLoader().parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
};
const info = TYPE_MAP.soldier;
assert.equal(info.fbx, 'Rockman@Idle.fbx');
assert.equal(info.preferFbx, true, 'Rockman overrides the old exported soldier');
const animation = readFbx(info.fbx);
assert.ok(animation.animations[0]?.tracks.length > 0, 'the supplied FBX has an animation');
const model = readFbx(info.meshFbx);
const skinned = [];
model.traverse(child => { if (child.isSkinnedMesh) skinned.push(child); });
assert.ok(skinned.length > 0 && textureCount > 0, 'Rockman includes a skinned mesh and embedded texture');
const boneBefore = model.getObjectByName('arm_stretchl').quaternion.clone();
const template = normalizeFbxTemplate(withFbxAnimation(model, animation), info);
assert.ok(!model.getObjectByName('arm_stretchl').quaternion.equals(boneBefore), 'the supplied idle actually poses the model');
const instance = cloneFbxTemplate(template);
const clonedSkinned = [];
instance.traverse(child => { if (child.isSkinnedMesh) clonedSkinned.push(child); });
assert.notEqual(clonedSkinned[0].skeleton.bones[0], skinned[0].skeleton.bones[0], 'cloned soldiers have their own bones');
for (const rotation of Object.values(FACING_ROTATION)) {
  instance.rotation.y = rotation;
  instance.position.set(2.4, CELL_SIZE * 2, -1.6);
  instance.updateMatrixWorld(true);
  instance.traverse(child => { if (child.isSkinnedMesh) child.skeleton.update(); });
  const box = new THREE.Box3().setFromObject(instance);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  assert.ok(Math.abs(box.min.y - CELL_SIZE * 2) < 1e-5, 'feet align to the selected layer');
  assert.ok(Math.abs(center.x - 2.4) < 1e-5 && Math.abs(center.z + 1.6) < 1e-5, 'model stays centered at its grid position');
  assert.ok(size.y > size.x && size.y > size.z, 'soldier is upright');
  assert.ok(Math.abs(size.y - CELL_SIZE * info.visualScale) < 1e-5, 'height is normalized to the grid');
}
console.log('Rockman: supplied idle FBX poses the textured mesh, skinned clones own their bones, four facings stay upright and centered with feet on the layer.');
