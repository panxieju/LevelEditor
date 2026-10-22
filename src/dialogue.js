export const DIALOGUE_TYPE = 'dialogueTrigger';
export const BUILTIN_IMAGE = 'builtin:gestures';
export const MAX_IMAGE_BYTES = 512 * 1024;
export const MAX_TOTAL_BYTES = 2 * 1024 * 1024;
export const defaultDialogue = () => ({ title: '操作提示', pages: [{ text: '面向箱子，按住互动键并移动，即可推拉箱子。' }] });
export const dialogueKey = e => e.dialogueId || e.id;
export function imageSource(scene, id) {
  if (id === BUILTIN_IMAGE) return `${import.meta.env?.BASE_URL || '/'}tutorial/GestureHands.png`;
  const m = scene.media?.find(m => m.id === id);
  return m ? `data:${m.mime};base64,${m.data}` : null;
}
export function updateDialogue(scene, id, dialogue, group) {
  return { ...scene, entities: scene.entities.map(e => e.id === id || e.type === DIALOGUE_TYPE && dialogueKey(e) === group
    ? { ...e, dialogueId: group, dialogue: structuredClone(dialogue) } : e) };
}
export function validateDialogueContent(scene) {
  const fail = message => { throw new Error(message); };
  if (scene.media !== undefined && !Array.isArray(scene.media)) fail('图片列表格式错误');
  const ids = new Set(); let total = 0;
  for (const m of scene.media || []) {
    if (!m || typeof m.id !== 'string' || !m.id.trim() || m.id.length > 100 || m.id.startsWith('builtin:') || ids.has(m.id)) fail('图片编号无效或重复');
    ids.add(m.id);
    if (!['image/png', 'image/jpeg'].includes(m.mime) || typeof m.data !== 'string' || !m.data.length || m.data.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(m.data)) fail('仅支持512KB以内的PNG/JPEG图片');
    const bytes = atob(m.data);
    const png = bytes.length >= 24 && bytes.charCodeAt(0) === 137 && bytes.slice(1, 4) === 'PNG';
    const jpg = bytes.length > 3 && bytes.charCodeAt(0) === 255 && bytes.charCodeAt(1) === 216 && bytes.charCodeAt(2) === 255;
    if (!(m.mime === 'image/png' ? png : jpg) || bytes.length > MAX_IMAGE_BYTES) fail('图片格式与内容不符');
    let width=0,height=0;const u16=i=>(bytes.charCodeAt(i)<<8)|bytes.charCodeAt(i+1);
    if(png){const u32=i=>bytes.charCodeAt(i)*16777216+bytes.charCodeAt(i+1)*65536+u16(i+2);width=u32(16);height=u32(20);}
    else if(jpg){let i=2;while(i+3<bytes.length){if(bytes.charCodeAt(i++)!==255)break;while(i<bytes.length&&bytes.charCodeAt(i)===255)i++;if(i>=bytes.length)break;const marker=bytes.charCodeAt(i++);if(marker===217||marker===218)break;if(marker===1||marker>=208&&marker<=216)continue;if(i+1>=bytes.length)break;const length=u16(i);if(length<2||i+length>bytes.length)break;if(marker>=192&&marker<=207&&![196,200,204].includes(marker)&&length>=7){height=u16(i+3);width=u16(i+5);break;}i+=length;}}
    if(width<1||height<1||width>2048||height>2048)fail('图片尺寸无效或超过2048像素');
    total += bytes.length;
  }
  if (total > MAX_TOTAL_BYTES) fail('关卡图片总量不能超过2MB');
  const groups = new Map();
  for (const e of scene.entities.filter(e => e.type === DIALOGUE_TYPE)) {
    const d = e.dialogue;
    if (e.dialogueId !== undefined && (typeof e.dialogueId !== 'string' || !e.dialogueId.trim() || e.dialogueId.length > 100)) fail('对话编号无效');
    if (!d || typeof d.title !== 'string' || d.title.length > 120 || !Array.isArray(d.pages) || d.pages.length < 1 || d.pages.length > 12) fail('教程需要标题和1–12页内容');
    for (const p of d.pages) {
      if (!p || typeof p.text !== 'string' || p.text.length > 4096 || p.imageId !== undefined && typeof p.imageId !== 'string') fail('教程正文最多4096字');
      if (p.imageId && p.imageId !== BUILTIN_IMAGE && !ids.has(p.imageId)) fail('教程引用的图片不存在');
      if (!p.text.trim() && !p.imageId) fail('教程页面不能全空');
    }
    // Compare only schema fields, independent of JSON object key order.
    const content = JSON.stringify([d.title, d.pages.map(p => [p.text, p.imageId || ''])]);
    if (groups.has(dialogueKey(e)) && groups.get(dialogueKey(e)) !== content) fail('共用同一对话编号的内容必须一致');
    groups.set(dialogueKey(e), content);
  }
}

export async function importDialogueImage(file) {
  if (!['image/png', 'image/jpeg'].includes(file.type) || file.size > 8 * 1024 * 1024) throw new Error('请选择8MB以内的PNG/JPEG图片');
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1024 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    let uri = canvas.toDataURL('image/jpeg', .85);
    if (atob(uri.split(',')[1]).length > MAX_IMAGE_BYTES) uri = canvas.toDataURL('image/jpeg', .65);
    if (atob(uri.split(',')[1]).length > MAX_IMAGE_BYTES) throw new Error('压缩后图片仍超过512KB');
    return { id: crypto.randomUUID(), mime: 'image/jpeg', data: uri.split(',')[1] };
  } finally { bitmap.close(); }
}
