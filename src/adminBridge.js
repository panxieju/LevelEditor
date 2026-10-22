const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);

/** Retain source extensions and legacy values which the editor did not change. */
export function mergeAdminSource(original, baseline, edited) {
  if (original.entities.length !== baseline.entities.length) throw new Error('该关卡包含编辑器无法完整载入的组件，请使用管理端“属性 / JSON”编辑');
  const next=structuredClone(original);
  for (const key of new Set([...Object.keys(baseline),...Object.keys(edited)])) {
    if (key==='entities'||key==='cellSize'||same(baseline[key],edited[key])) continue;
    if (edited[key]===undefined) delete next[key];
    else if(key==='grid') next.grid={...original.grid,...edited.grid};
    else next[key]=structuredClone(edited[key]);
  }
  const sources=new Map(baseline.entities.map((e,i)=>[e.id,original.entities[i]]));
  const initial=new Map(baseline.entities.map(e=>[e.id,e]));
  next.entities=edited.entities.map(entity=>{
    if(!sources.has(entity.id))return structuredClone(entity);
    const value=structuredClone(sources.get(entity.id)),before=initial.get(entity.id);
    for(const key of new Set([...Object.keys(before),...Object.keys(entity)])) {
      if(same(before[key],entity[key]))continue;
      if(entity[key]===undefined)delete value[key];else value[key]=structuredClone(entity[key]);
    }
    return value;
  });
  return next;
}

export function loadAdminSource(document, parse) {
  const scene=parse(JSON.stringify(document.levelData));
  if(scene.entities.length!==document.levelData.entities.length)throw new Error('该关卡包含无法完整载入的组件，请返回管理端使用“属性 / JSON”，以免丢失内容');
  scene.name=document.name;
  return scene;
}

export async function adminApi(path, options={}) {
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),20000);
  try {
    const response=await fetch('/skytrials/api/v1/'+path,{credentials:'same-origin',cache:'no-store',...options,signal:controller.signal,headers:{'Content-Type':'application/json',...options.headers}});
    const data=await response.json();
    if(!response.ok){const error=new Error(response.status===401?(path==='admin/login'?'账号或密码不正确':'登录已失效，请重新登录'):response.status===409?'后台版本或序号发生冲突，请检查后重新载入；当前编辑内容仍保留':typeof data.detail==='string'?data.detail:'请求失败，请检查关卡内容');error.status=response.status;throw error;}
    return data;
  } finally {clearTimeout(timeout);}
}
