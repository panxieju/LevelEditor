import { useEffect, useState } from 'react';
import { BUILTIN_IMAGE, DIALOGUE_TYPE, defaultDialogue, dialogueKey, imageSource, importDialogueImage, updateDialogue, validateDialogueContent } from '../dialogue.js';

export default function DialogueEditor({ scene, entity, setScene }) {
  const [page, setPage] = useState(0), [preview, setPreview] = useState(false), [error, setError] = useState('');
  useEffect(() => { setPage(0); setError(''); setPreview(false); }, [entity.id]);
  const d = entity.dialogue || defaultDialogue(), index = Math.min(page, d.pages.length - 1), current = d.pages[index];
  const key = dialogueKey(entity);
  const groups = [...new Map(scene.entities.filter(e => e.type === DIALOGUE_TYPE).map(e => [dialogueKey(e), e])).values()];
  const update = next => setScene(s => updateDialogue(s, entity.id, next, key));
  const patchPage = patch => update({ ...d, pages: d.pages.map((p, i) => i === index ? { ...p, ...patch } : p) });
  const image = imageSource(scene, current.imageId);
  async function upload(event) {
    const file = event.target.files[0]; event.target.value = ''; if (!file) return;
    try {
      const media = await importDialogueImage(file);
      setScene(s => {
        const target = s.entities.find(e => e.id === entity.id); if (!target) return s;
        const existing = s.media?.find(m => m.data === media.data && m.mime === media.mime);
        const data = { ...target.dialogue, pages: target.dialogue.pages.map((p, i) => i === index ? { ...p, imageId: existing?.id || media.id } : p) };
        const next = updateDialogue({ ...s, media: existing ? s.media : [...(s.media || []), media] }, target.id, data, dialogueKey(target));
        try { validateDialogueContent(next); return next; } catch (ex) { setError(ex.message); return s; }
      }); setError('');
    } catch (ex) { setError(ex.message); }
  }
  return <section className="dialogue-editor">
    <h3>教程对话</h3>
    <label>共用对话<select aria-label="共用对话" value={key} onChange={ev => { const source = groups.find(e => dialogueKey(e) === ev.target.value); setScene(s => updateDialogue(s, entity.id, source.dialogue, dialogueKey(source))); setPage(0); }}>
      {groups.map(e => <option value={dialogueKey(e)} key={dialogueKey(e)}>{e.dialogue?.title || '无标题'} · ({e.x},{e.z},L{e.layer+1})</option>)}
    </select></label>
    <button onClick={() => setScene(s => updateDialogue(s, entity.id, d, crypto.randomUUID()))}>复制为独立对话</button>
    <p className="tip">同一对话的所有触发位置合计弹一次。共用位置：{scene.entities.filter(e => e.type === DIALOGUE_TYPE && dialogueKey(e) === key).length}；修改内容会同步。</p>
    <label>标题<input aria-label="对话标题" maxLength={120} value={d.title} onChange={e => update({ ...d, title: e.target.value })}/></label>
    <div className="dialogue-pages"><button disabled={index === 0} onClick={() => setPage(index-1)}>‹</button><span>第 {index+1} / {d.pages.length} 页</span><button disabled={index === d.pages.length-1} onClick={() => setPage(index+1)}>›</button></div>
    <label>正文<textarea aria-label="对话正文" maxLength={4096} rows={7} value={current.text} onChange={e => patchPage({ text: e.target.value })}/></label>
    <label>配图<select aria-label="对话配图" value={current.imageId || ''} onChange={e => patchPage({ imageId: e.target.value })}>
      <option value="">纯文本</option><option value={BUILTIN_IMAGE}>内置：手势教学</option>{scene.media?.map(m => <option key={m.id} value={m.id}>已导入图片 {m.id.slice(0,8)}</option>)}
    </select></label>
    <label className="dialogue-upload">上传图片（自动压缩）<input type="file" accept="image/png,image/jpeg" onChange={upload}/></label>
    {image && <img className="dialogue-thumbnail" src={image} alt="本页配图"/>}
    <p className="tip">单图512KB，关卡图片合计2MB；图片随JSON保存。触发器使用玩家脚底所在层，可与其他组件重叠。</p>
    <div className="dialogue-pages"><button disabled={d.pages.length >= 12} onClick={() => { update({ ...d, pages: [...d.pages, { text: '请输入提示内容' }] }); setPage(d.pages.length); }}>添加页</button><button disabled={d.pages.length <= 1} onClick={() => { update({ ...d, pages: d.pages.filter((_,i) => i !== index) }); setPage(Math.max(0,index-1)); }}>删除页</button><button onClick={() => setPreview(true)}>预览</button></div>
    {error && <p role="alert">{error}</p>}
    {preview && <div className="dialogue-modal" role="dialog" aria-modal="true" aria-label="教程对话预览"><article className="dialogue-card"><h2>{d.title}</h2>{image && <img src={image} alt="本页配图"/>}<div className="dialogue-body">{current.text}</div><footer><button disabled={index===0} onClick={()=>setPage(index-1)}>上一页</button><span>{index+1} / {d.pages.length}</span><button onClick={()=>index===d.pages.length-1?setPreview(false):setPage(index+1)}>{index===d.pages.length-1?'知道了':'下一页'}</button><button onClick={()=>setPreview(false)}>关闭预览</button></footer></article></div>}
  </section>;
}
