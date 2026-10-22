import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
const root = new URL('../public/unity/', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('manifest.json', root), 'utf8'));
for (const type of manifest.types) {
  const data = JSON.parse(await readFile(new URL(`${type}.json`, root), 'utf8'));
  assert.equal(data.type, type);
  assert.ok(data.parts.length, `${type} has no renderable meshes`);
  for (const part of data.parts) {
    assert.equal(part.positions.length % 3, 0);
    assert.equal(part.indices.length % 3, 0);
    assert.ok(part.positions.every(Number.isFinite));
    assert.ok(part.indices.every(i => Number.isInteger(i) && i >= 0 && i < part.positions.length / 3));
    assert.equal(part.normals.length, part.positions.length);
    for (const tex of Object.values(part.material.textures)) await access(new URL(tex.file, root));
  }
}
assert.deepEqual(new Set(manifest.shaders), new Set(['Standard','PuppetGo/Bright Grove','PuppetGo/Goal Beam','PuppetGo/Portal Glow','PuppetGo/Mechanism Paint','PuppetGo/Boundary Limestone']));
console.log(`Unity export validated: ${manifest.types.length} Prefabs, ${manifest.textures} textures and ${manifest.shaders.length} shader adapters.`);

for (const [type, prefab] of [['box1x1','Crate'],['box2x1x2','CrateWide']]) {
  const data = JSON.parse(await readFile(new URL(`${type}.json`, root), 'utf8'));
  assert.equal(data.source, `Assets/Resources/Prefabs/BrightGrove/${prefab}.prefab`);
}
