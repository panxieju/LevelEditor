import test from 'node:test';
import assert from 'node:assert/strict';
import { addEntity, canPlace, createScene, moveEntity, parseScene, serializeScene } from './level.js';
import { defaultDialogue, updateDialogue, validateDialogueContent } from './dialogue.js';

const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aDVkAAAAASUVORK5CYII=';
function fixture() {
  let s = { ...createScene(), layerCount: 3 };
  for (const [type,x,z] of [['player',1,1],['trigger',2,1],['dialogueTrigger',1,1],['dialogueTrigger',2,1],['dialogueTrigger',3,1],['dialogueTrigger',4,1]]) s = addEntity(s,type,x,z,1).scene;
  return s;
}
test('logic markers coexist with player, overlay, and other markers in either placement order', () => {
  const s=fixture();assert.equal(s.entities.length,6);
  assert.equal(canPlace(s,'dialogueTrigger',1,1,1).ok,true);
  assert.equal(canPlace(s,'dialogueTrigger',2,1,1).ok,true);
  assert.equal(canPlace(s,'box1x1',3,1,1).ok,true);
  assert.equal(canPlace(s,'target',4,1,1).ok,true);
  assert.equal(moveEntity(s,s.entities[3].id,1,1).result.ok,true);
  assert.equal(canPlace(s,'dialogueTrigger',-1,1,1).ok,false);
});
test('four locations share edits; separating keeps other locations unchanged', () => {
  let s=fixture();const markers=s.entities.filter(e=>e.type==='dialogueTrigger');
  for(const e of markers)s=updateDialogue(s,e.id,defaultDialogue(),'box-help');
  const d={title:'推拉箱子',pages:[{text:'按住互动键并移动',imageId:'builtin:gestures'},{text:'再试一试'}]};
  s=updateDialogue(s,markers[0].id,d,'box-help');
  assert.equal(s.entities.filter(e=>e.dialogueId==='box-help'&&e.dialogue.title==='推拉箱子').length,4);
  s=updateDialogue(s,markers[0].id,{title:'独立提示',pages:[{text:'新内容'}]},'separate');
  assert.equal(s.entities.filter(e=>e.dialogueId==='box-help').length,3);
  validateDialogueContent(s);
});
test('text, multiple pages, built-in and embedded images survive export/import',()=>{
  let s=fixture();const e=s.entities.find(e=>e.type==='dialogueTrigger');s.media=[{id:'photo',mime:'image/png',data:png}];
  const d={title:'教程中文',pages:[{text:'纯文本\n第二行'},{text:'图文',imageId:'photo'},{text:'手势',imageId:'builtin:gestures'}]};
  s=updateDialogue(s,e.id,d,'group');const result=parseScene(serializeScene(s));
  assert.deepEqual(result.entities.find(a=>a.id===e.id).dialogue,d);assert.deepEqual(result.media,s.media);
});
for(const [name,mutate] of [
  ['missing image',s=>s.entities[2].dialogue.pages[0].imageId='missing'],
  ['empty page',s=>s.entities[2].dialogue.pages[0].text=''],
  ['excessive pages',s=>s.entities[2].dialogue.pages=Array.from({length:13},()=>({text:'x'}))],
  ['long text',s=>s.entities[2].dialogue.pages[0].text='x'.repeat(4097)],
  ['long title',s=>s.entities[2].dialogue.title='x'.repeat(121)],
  ['non-string text',s=>s.entities[2].dialogue.pages[0].text=12],
  ['remote image',s=>s.entities[2].dialogue.pages[0].imageId='https://example.com/pic.png'],
  ['invalid mime',s=>s.media=[{id:'x',mime:'image/svg+xml',data:png}]],
  ['invalid base64',s=>s.media=[{id:'x',mime:'image/png',data:'invalid!'}]],
  ['duplicate image ID',s=>s.media=Array.from({length:2},()=>({id:'x',mime:'image/png',data:png}))],
  ['oversized image',s=>s.media=[{id:'x',mime:'image/png',data:'A'.repeat(700000)}]],
  ['shared content mismatch',s=>{s.entities[2].dialogueId='g';s.entities[3].dialogueId='g';s.entities[3].dialogue.title='different';}],
  ['bad group ID',s=>s.entities[2].dialogueId=12],
  ['oversized dimensions',s=>{const b=Buffer.from(png,'base64');b.writeUInt32BE(99999,16);s.media=[{id:'x',mime:'image/png',data:b.toString('base64')}];}],
])test(`reject ${name}`,()=>{const s=fixture();mutate(s);assert.throws(()=>serializeScene(s));assert.throws(()=>parseScene(JSON.stringify(s)));});
