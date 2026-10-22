import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeAdminSource, loadAdminSource } from './adminBridge.js';
import { parseScene } from './level.js';

test('opening and saving unchanged preserves legacy scale and source extensions',()=>{
  const original={name:'original-filename',cellSize:.66,background:'night',custom:{keep:1},grid:{width:8,depth:6,extension:true},layerCount:2,entities:[{id:'g',type:'ground',x:1,z:1,layer:0,customFlag:17}]};
  const baseline=loadAdminSource({name:'后台显示名称',levelData:original},parseScene);
  assert.deepEqual(mergeAdminSource(original,baseline,baseline),original);
  const edited=structuredClone(baseline);edited.entities[0].x=2;edited.name='new display name';
  const next=mergeAdminSource(original,baseline,edited);
  assert.equal(next.entities[0].x,2);assert.equal(next.entities[0].customFlag,17);
  assert.equal(next.cellSize,.66);assert.equal(next.background,'night');assert.deepEqual(next.custom,{keep:1});
  assert.equal(next.name,edited.name);assert.equal(original.entities[0].x,1);
});

test('deleted entities stay deleted and new entities are retained',()=>{
  const source={name:'test',grid:{width:8,depth:6},layerCount:2,entities:[{id:'g',type:'ground',x:1,z:1,layer:0}]};
  const baseline=loadAdminSource({name:'test',levelData:source},parseScene);
  const edited={...baseline,entities:[{id:'new',type:'ground',x:2,z:1,layer:0}]};
  assert.deepEqual(mergeAdminSource(source,baseline,edited).entities,edited.entities);
});

test('lossy legacy import cannot silently remove components',()=>{
  const source={grid:{width:8,depth:6},entities:[{id:'unknown',type:'future-component',x:1,z:1,layer:0}]};
  assert.throws(()=>loadAdminSource({name:'test',levelData:source},parseScene),/无法完整载入/);
});
