import { useEffect, useRef, useState } from 'react';
import DialogueEditor from './components/DialogueEditor.jsx';
import Level2D from './components/Level2D.jsx';
import View3D from './components/View3D.jsx';
import SplitWorkspace, { readLayout, saveLayout } from './components/SplitWorkspace.jsx';
import { pickJson, saveJson, restoreFileLocations } from './fileAccess.js';
import { adminApi, loadAdminSource, mergeAdminSource } from './adminBridge.js';
import {
  ENTITY_TYPES,
  TOOL_GROUPS,
  FACINGS,
  FACING_ARROW,
  TYPE_MAP,
  CELL_SIZE,
  MAX_LAYERS,
  createScene,
  entityAt,
  entitiesAt,
  occupiedVolumes,
  portalPairErrors,
  pairedEntities,
  isSpanningType,
  isLaserType,
  isSliderType,
  isDoorType,
  reservedVolumes,
  volumesAvailable,
  extendSliderTrack,
  laserAxisFacings,
  laserAxisFacing,
  laserFacingOnRotate,
  addEntity,
  removeAt,
  moveEntity,
  addLayer,
  removeLayer,
  fillGround,
  addGroundBoundaries,
  expandSupportColumns,
  resizeGrid,
  serializeScene,
  parseScene,
} from './level.js';

const STORAGE_KEY = 'puppetgo-level-editor-v1';

// 组件占用/跨越到这一层的实体（门、滑动组件会跨 3 层）
const entitiesOnLayer = (scene, layer) =>
  scene.entities.filter((e) => occupiedVolumes(e).some((c) => c.layer === layer));

function loadInitial() {
  if(new URLSearchParams(window.location.search).has('level')||new URLSearchParams(window.location.search).has('new'))return createScene();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return parseScene(raw);
  } catch (err) {
    console.warn('[PuppetGo] 恢复自动保存失败', err);
  }
  return createScene();
}

export default function App() {
  const [adminKey]=useState(()=>new URLSearchParams(window.location.search).get('level'));
  const adminEnabled=Boolean(adminKey||window.location.pathname.startsWith('/skytrials/level_editor')||new URLSearchParams(window.location.search).has('admin'));
  const [administrator,setAdministrator]=useState(null);
  const [showAdminLogin,setShowAdminLogin]=useState(false);
  const [loginError,setLoginError]=useState('');
  const [loginBusy,setLoginBusy]=useState(false);
  const createKey=useRef(null);
  const [adminDocument,setAdminDocument]=useState(null);
  const [adminBaseline,setAdminBaseline]=useState(null);
  const [adminMessage,setAdminMessage]=useState('');
  const [adminBusy,setAdminBusy]=useState(false);
  const [adminLoading,setAdminLoading]=useState(Boolean(adminKey));
  const [adminLoadError,setAdminLoadError]=useState('');
  const [scene, setScene] = useState(loadInitial);
  const [tool, setTool] = useState('ground');
  const [layer, setLayer] = useState(0);
  const [initialLayout] = useState(readLayout);
  const [view, setView] = useState(initialLayout.mode);
  const [splitRatio, setSplitRatio] = useState(initialLayout.ratio);
  const [showBelow, setShowBelow] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [defaultNumber, setDefaultNumber] = useState(null);
  const [defaultWait, setDefaultWait] = useState(0);
  const [boxRotation, setBoxRotation] = useState(0);
  const [laserFacing, setLaserFacing] = useState('S');
  const [portalFacing, setPortalFacing] = useState('S');
  const [gridW, setGridW] = useState(scene.grid.width);
  const [gridD, setGridD] = useState(scene.grid.depth);
  const fileRef = useRef(null);
  const [draggingId, setDraggingId] = useState(null);
  const dragRef = useRef({ id: null, moved: false, soldierMoved: false });

  const selectedEntity = scene.entities.find((e) => e.id === selectedId) || null;
  const selectedSoldier = selectedEntity?.type === 'soldier' ? selectedEntity : null;
  const selectedSlider = selectedEntity && isSliderType(selectedEntity.type) ? selectedEntity : null;
  const sameNumber = pairedEntities(scene, selectedEntity);

  useEffect(() => {
    if(adminKey||adminDocument)return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, serializeScene(scene));
      } catch (err) {
        console.warn('[PuppetGo] 自动保存失败', err);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [scene,adminKey,Boolean(adminDocument)]);

  useEffect(()=>{
    if(!adminEnabled||adminKey)return;
    let active=true;adminApi('admin/session').then(auth=>{if(active)setAdministrator(auth);}).catch(()=>{});
    return()=>{active=false;};
  },[adminEnabled,adminKey]);

  useEffect(()=>{
    if(!adminKey)return;
    let active=true;
    (async()=>{
      try {
        const auth=await adminApi('admin/session');
        const document=await adminApi('admin/official/'+encodeURIComponent(adminKey));
        const loaded=loadAdminSource(document,parseScene);
        if(!active)return;
        setAdministrator(auth);setAdminDocument(document);setAdminBaseline(structuredClone(loaded));setScene(loaded);setLayer(0);setSelectedId(null);
      } catch(error){if(active)setAdminLoadError(error.message);}
      finally{if(active)setAdminLoading(false);}
    })();
    return ()=>{active=false;};
  },[adminKey]);

  const adminDirty=Boolean(adminDocument&&JSON.stringify(scene)!==JSON.stringify(adminBaseline));
  useEffect(()=>{
    if(!adminDirty)return;
    const warn=event=>{event.preventDefault();event.returnValue='';};
    window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);
  },[adminDirty]);

  const saveToAdmin=async()=>{
    if(!adminDocument||adminBusy)return;
    setAdminBusy(true);setAdminMessage('');
    try {
      const source=mergeAdminSource(adminDocument.levelData,adminBaseline,scene);
      const auth=await adminApi('admin/session');
      const saved=await adminApi('admin/official/'+encodeURIComponent(adminDocument.key||adminKey),{method:'PUT',headers:{'X-CSRF-Token':auth.csrf},body:JSON.stringify({name:scene.name,category:adminDocument.category,number:adminDocument.number,hard:adminDocument.hard,status:adminDocument.status,version:adminDocument.version,levelData:source})});
      setAdminDocument({...saved,levelData:source});setAdminBaseline(structuredClone(scene));setAdminMessage('已保存到后台 · v'+saved.version);
    } catch(error){setAdminMessage(error.message);if(error.status===401){setAdministrator(null);setShowAdminLogin(true);}}
    finally{setAdminBusy(false);}
  };

  const loginAdministrator=async event=>{
    event.preventDefault();const form=event.currentTarget,values=new FormData(form);
    const payload={username:values.get('username'),password:values.get('password')};form.reset();setLoginBusy(true);setLoginError('');
    try {
      const auth=await adminApi('admin/login',{method:'POST',body:JSON.stringify(payload)});setAdministrator(auth);setShowAdminLogin(false);
      if(adminKey&&!adminDocument){const document=await adminApi('admin/official/'+encodeURIComponent(adminKey));const loaded=loadAdminSource(document,parseScene);setAdminDocument(document);setAdminBaseline(structuredClone(loaded));setScene(loaded);setLayer(0);setAdminLoadError('');}
    } catch(error){setLoginError(error.message);setShowAdminLogin(true);}
    finally{setLoginBusy(false);}
  };

  const saveAsNormal=async()=>{
    if(!administrator){setShowAdminLogin(true);return;}
    if(adminBusy)return;setAdminBusy(true);setAdminMessage('');
    try {
      const source=JSON.parse(serializeScene(scene));
      if(source.entities.filter(e=>e.type==='player').length!==1||!source.entities.some(e=>e.type==='target'))throw new Error('请放置一个玩家和至少一个终点后再保存普通关卡');
      createKey.current??='normal_'+crypto.randomUUID().replaceAll('-','');
      const auth=await adminApi('admin/session');
      const saved=await adminApi('admin/official/create-normal',{method:'POST',headers:{'X-CSRF-Token':auth.csrf},body:JSON.stringify({key:createKey.current,name:scene.name,levelData:source})});
      setAdminDocument({...saved,levelData:source});setAdminBaseline(structuredClone(scene));setAdminMessage('已添加普通关卡 · 序号 '+saved.number+' · 草稿，可返回管理端发布');
      const url=new URL(window.location.href);url.searchParams.delete('new');url.searchParams.set('level',saved.key);window.history.replaceState(null,'',url);
      createKey.current=null;
    } catch(error){setAdminMessage(error.message);if(error.status===401){setAdministrator(null);setShowAdminLogin(true);}}
    finally{setAdminBusy(false);}
  };

  useEffect(() => {
    setGridW(scene.grid.width);
    setGridD(scene.grid.depth);
  }, [scene.grid.width, scene.grid.depth]);

  useEffect(() => {
    if (layer >= scene.layerCount) setLayer(Math.max(0, scene.layerCount - 1));
  }, [scene.layerCount, layer]);

  useEffect(() => {
    if (selectedId && !selectedEntity) setSelectedId(null);
  }, [selectedId, selectedEntity]);

  // 激光发射方向必须平行于长边：切到激光工具或改变长边方向时，把待放置的朝向压回长边轴。
  useEffect(() => {
    if (!isLaserType(tool)) return;
    setLaserFacing((f) => laserAxisFacing(boxRotation, f, tool));
  }, [tool, boxRotation]);

  useEffect(() => { restoreFileLocations(); }, []);
  useEffect(() => { saveLayout(view, splitRatio); }, [view, splitRatio]);

  const place = (type, x, z) => {
    const rotation = isSpanningType(type) ? boxRotation : 0;
    const facing = TYPE_MAP[type]?.hasFacing
      ? isLaserType(type)
        ? laserAxisFacing(rotation, laserFacing, type)
        : type === 'portal' ? portalFacing : laserFacing
      : 'S';
    const { scene: next, result } = addEntity(scene, type, x, z, layer, rotation, facing);
    if (!result.ok) {
      alert(result.reason);
      return;
    }
    const added = next.entities[next.entities.length - 1];
    if (TYPE_MAP[type]?.hasNumber) added.number = defaultNumber;
    setScene(next);
    {
      const added = next.entities.find(
        (e) => e.type === type && e.x === x && e.z === z && e.layer === layer
      );
      if (added) setSelectedId(added.id);
    }
  };

  const erase = (x, z) => setScene(removeAt(scene, x, z, layer));

  // 士兵用 route（巡逻路线），滑动组件用 track（滑动轨道），编辑方式一致
  const waypointList = (entity) =>
    isSliderType(entity.type) ? entity.track || [] : entity.route || [];

  const writeWaypointList = (entity, list) =>
    isSliderType(entity.type) ? { ...entity, track: list } : { ...entity, route: list };

  const appendWaypoint = (x, z) => {
    const target = selectedSlider || selectedSoldier;
    if (!target) {
      alert('请先点选一个士兵或滑动组件，再点击空格添加路径点');
      return;
    }
    const slider = isSliderType(target.type);
    const label = slider ? '轨道点' : '路径点';
    if (target.layer !== layer) {
      alert(`${label}必须与组件在同一层`);
      return;
    }
    const { width, depth } = scene.grid;
    if (x < 0 || z < 0 || x >= width || z >= depth) {
      alert('超出网格范围');
      return;
    }
    if (slider) {
      const { track, result } = extendSliderTrack(scene, target, x, z);
      if (!result.ok) { alert(result.reason); return; }
      setScene({ ...scene, entities: scene.entities.map(e => e.id === target.id ? { ...e, track } : e) });
      return;
    }
    const list = waypointList(target);
    const last = list.length ? list[list.length - 1] : { x: target.x, z: target.z };
    if (last.x === x && last.z === z) return;
    if (list.some((p) => p.x === x && p.z === z)) {
      alert(`该点已在${slider ? '轨道' : '路线'}中`);
      return;
    }
    const next = { x, z };
    if (entitiesAt(scene, x, z, layer).some((e) => !TYPE_MAP[e.type]?.overlay)) {
      alert('该格已有方块，不能作为路径点');
      return;
    }
    setScene({
      ...scene,
      entities: scene.entities.map((e) =>
        e.id === target.id
          ? writeWaypointList(
              e,
              slider || defaultWait <= 0 ? [...list, next] : [...list, { x, z, wait: defaultWait }]
            )
          : e
      ),
    });
  };

  const removeWaypointAt = (x, z) => {
    const target = selectedSlider || selectedSoldier;
    if (!target) return;
    const list = waypointList(target);
    const index = list.findIndex(p => p.x === x && p.z === z);
    const next = isSliderType(target.type) && index >= 0
      ? list.slice(0, index)
      : list.filter((p) => !(p.x === x && p.z === z));
    if (next.length === list.length) return;
    setScene({
      ...scene,
      entities: scene.entities.map((e) => (e.id === target.id ? writeWaypointList(e, next) : e)),
    });
  };

  const updateWaypointWait = (index, value) => {
    if (!selectedSoldier) return;
    const wait = Math.max(0, Math.min(60, Number(value) || 0));
    setScene({
      ...scene,
      entities: scene.entities.map((e) =>
        e.id === selectedSoldier.id && Array.isArray(e.route)
          ? {
              ...e,
              route: e.route.map((p, i) =>
                i === index ? (wait > 0 ? { ...p, wait } : { x: p.x, z: p.z }) : p
              ),
            }
          : e
      ),
    });
  };

  const handleClearRoute = () => {
    const target = selectedSlider || selectedSoldier;
    if (!target) return;
    const slider = isSliderType(target.type);
    if (!confirm(slider ? '清空该滑动组件的滑动轨道？' : '清空该士兵的巡逻路线？')) return;
    setScene({
      ...scene,
      entities: scene.entities.map((e) =>
        e.id === target.id ? writeWaypointList(e, []) : e
      ),
    });
  };

  const setFacing = (dir) => {
    if (!selectedEntity || !TYPE_MAP[selectedEntity.type]?.hasFacing) return;
    // 激光只能沿长边发射：垂直于长边的方向直接忽略。
    if (isLaserType(selectedEntity.type) && !laserAxisFacings(selectedEntity.rotation, selectedEntity.type).includes(dir)) {
      return;
    }
    setScene({
      ...scene,
      entities: scene.entities.map((e) =>
        e.id === selectedEntity.id ? { ...e, facing: dir } : e
      ),
    });
  };

  const setSelectedRotation = (rot) => {
    const e = selectedEntity;
    if (!e || !TYPE_MAP[e.type]?.hasRotation) return;
    // 门/滑动组件是 3 格高、还要预留开门位或轨道：按整体 3D 体积检查
    // 2×1×3 的轨道只能沿长边，翻转长边后轨道作废，需要重新指定
    const clearsTrack = isSliderType(e.type) && (TYPE_MAP[e.type]?.size?.nx || 1) > 1;
    const rotated = { ...e, rotation: rot, ...(clearsTrack ? { track: [] } : {}) };
    const check = volumesAvailable(scene, reservedVolumes(rotated), e.id);
    if (!check.ok) {
      alert(`翻转后占用/预留的格子有冲突（${check.reason}），无法翻转`);
      return;
    }
    setScene({
      ...scene,
      entities: scene.entities.map((en) =>
        en.id === e.id
          ? {
              ...en,
              rotation: rot,
              // 长边翻转后发射方向跟随机体一起转，始终与长边平行。
              ...(isLaserType(en.type) ? { facing: laserFacingOnRotate(en.facing, rot, en.type) } : {}),
              ...(clearsTrack ? { track: [] } : {}),
            }
          : en
      ),
    });
  };

  const applyRotation = (rot) => {
    const prevRotation = boxRotation;
    setBoxRotation(rot);
    if (isLaserType(tool) && rot !== prevRotation) {
      setLaserFacing((f) => laserFacingOnRotate(f, rot, tool));
    }
    if (selectedEntity && TYPE_MAP[selectedEntity.type]?.hasRotation) {
      setSelectedRotation(rot);
    }
  };

  const setEntityNumber = (value) => {
    if (!selectedEntity || !TYPE_MAP[selectedEntity.type]?.hasNumber) return;
    const raw = value === '' ? null : Math.max(0, Math.min(99, Math.floor(Number(value) || 0)));
    setScene({
      ...scene,
      entities: scene.entities.map((e) => (e.id === selectedEntity.id ? { ...e, number: raw } : e)),
    });
  };

  const handleCellClick = (x, z) => {
    if (tool === 'eraser') {
      erase(x, z);
      return;
    }
    const list = entitiesAt(scene, x, z, layer);
    if (tool === 'route') {
      // 宽滑块向前移动一格时，锚点仍在它自己的第二格上；该点击应添加轨道。
      if (selectedSlider && selectedSlider.layer === layer
          && list.some(e => e.id === selectedSlider.id)
          && (x !== selectedSlider.x || z !== selectedSlider.z)) {
        appendWaypoint(x, z);
        return;
      }
      const target = list.find(
        (e) => e.type === 'soldier' || isSliderType(e.type)
      );
      if (target) {
        setSelectedId(target.id);
        return;
      }
      appendWaypoint(x, z);
      return;
    }
    if (tool === 'dialogueTrigger') { place(tool, x, z); return; }
    if (list.length) {
      setSelectedId((list.find(e => !TYPE_MAP[e.type]?.overlay) || list[0]).id);
      return;
    }
    place(tool, x, z);
  };

  const handleDragStart = (id) => {
    if (tool === 'eraser' || tool === 'route' || tool === 'dialogueTrigger') return false;
    const entity = scene.entities.find((e) => e.id === id);
    if (!entity) return false;
    setSelectedId(id);
    if (entity.type === 'ground') return false;

    setSelectedId(id);
    dragRef.current = { id, moved: false, routeOwner: null };
    setDraggingId(id);
    return true;
  };

  const handleDragEnter = (x, z) => {
    const id = dragRef.current.id;
    if (!id) return;

    const entity = scene.entities.find((e) => e.id === id);
    if (!entity) return;

    const { scene: next, result } = moveEntity(scene, id, x, z);
    if (!result.ok) return;

    dragRef.current.moved = true;
    if (entity.type === 'soldier') dragRef.current.routeOwner = 'soldier';
    if (isSliderType(entity.type)) dragRef.current.routeOwner = 'slider';
    setScene(next);
  };

  const handleDragEnd = () => {
    if (dragRef.current.routeOwner === 'soldier') {
      alert('士兵已移动，请重新设置巡逻路线');
    } else if (dragRef.current.routeOwner === 'slider') {
      alert('滑动组件已移动，请重新设置滑动轨道');
    }
    dragRef.current = { id: null, moved: false, routeOwner: null };
    setDraggingId(null);
  };

  const handleCellRightClick = (x, z) => {
    if (tool === 'route') {
      const owner = selectedSlider || selectedSoldier;
      if (owner && waypointList(owner).some(p => p.x === x && p.z === z)) {
        removeWaypointAt(x, z);
        return;
      }
      const target = entityAt(scene, x, z, layer);
      if (target?.type === 'soldier' || target?.type === 'player' || isSliderType(target?.type)) {
        setSelectedId(null);
        return;
      }
      removeWaypointAt(x, z);
      return;
    }
    erase(x, z);
  };

  const handleAddLayer = () => {
    if (scene.layerCount >= MAX_LAYERS) {
      alert(`最多支持 ${MAX_LAYERS} 层`);
      return;
    }
    setScene(addLayer(scene));
    setLayer(scene.layerCount);
  };

  const handleRemoveLayer = () => {
    if (scene.layerCount <= 1) return;
    const count = entitiesOnLayer(scene, layer).length;
    if (!confirm(`删除第 ${layer + 1} 层？该层有 ${count} 个实体。`)) return;
    setScene(removeLayer(scene, layer));
  };

  const handleClearLayer = () => {
    const targets = entitiesOnLayer(scene, layer);
    const count = targets.length;
    if (!confirm(`清空第 ${layer + 1} 层（${count} 个实体）？`)) return;
    const ids = new Set(targets.map((e) => e.id));
    setScene({ ...scene, entities: scene.entities.filter((e) => !ids.has(e.id)) });
  };

  const handleFillGround = () => setScene(fillGround(scene, layer));

  const applyGridSize = () => {
    const w = Math.min(32, Math.max(2, Math.round(Number(gridW)) || 8));
    const d = Math.min(32, Math.max(2, Math.round(Number(gridD)) || 6));
    setGridW(w);
    setGridD(d);
    if (w !== scene.grid.width || d !== scene.grid.depth) {
      const removed = scene.entities.filter((e) => e.x >= w || e.z >= d).length;
      if (removed > 0 && !confirm(`网格缩小会移除 ${removed} 个越界实体，继续？`)) return;
      setScene(resizeGrid(scene, w, d));
    }
  };

  const checkPortalPairs = () => {
    const errors = portalPairErrors(scene);
    if (errors.length) alert(errors.join('\n'));
    return errors.length === 0;
  };

  const exportJson = async () => {
    if (!checkPortalPairs()) return;
    let text;try { text = serializeScene(expandSupportColumns(scene)); } catch (err) { alert(err.message); return; }
    if (window.showSaveFilePicker) {
      try { await saveJson(text, `${scene.name || 'level'}.json`); }
      catch (err) { if (err.name !== 'AbortError') alert(`导出失败：${err.message}`); }
      return;
    }
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${scene.name || 'level'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyJson = async () => {
    if (!checkPortalPairs()) return;
    try {
      await navigator.clipboard.writeText(serializeScene(expandSupportColumns(scene)));
      alert('已复制 JSON 到剪贴板');
    } catch {
      alert('复制失败，请使用“导出 JSON”');
    }
  };

  const openJson = async () => {
    if (!window.showOpenFilePicker) { fileRef.current?.click(); return; }
    try {
      const file = await pickJson();
      const next = parseScene(await file.text());
      setScene(next); setLayer(0); setSelectedId(null);
    } catch (err) { if (err.name !== 'AbortError') alert(`导入失败：${err.message}`); }
  };

  const importJson = (ev) => {
    const file = ev.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const next = parseScene(reader.result);
        setScene(next);
        setLayer(0);
        alert(`导入成功：${next.name}（${next.entities.length} 个实体，${next.layerCount} 层）`);
      } catch (err) {
        alert(`导入失败：${err.message}`);
      }
    };
    reader.readAsText(file);
    ev.target.value = '';
  };

  const handleNew = () => {
    if (!confirm('新建关卡会清空当前编辑内容，继续？')) return;
    setScene(createScene());
    setLayer(0);
  };

  const counts = {};
  for (const e of scene.entities) counts[e.type] = (counts[e.type] || 0) + 1;

  return (
    <div className="app">
      {adminKey&&(adminLoading||adminLoadError)&&<div className="admin-cover" role="status"><h2>{adminLoading?'正在载入后台关卡…':'无法载入关卡'}</h2><p>{adminLoadError}</p>{!adminLoading&&<button onClick={()=>setShowAdminLogin(true)}>管理员登录</button>}<a href="/skytrials/levels_admin">返回管理端或使用属性 / JSON 编辑</a></div>}
      {adminEnabled&&<div className="admin-bar"><a href="/skytrials/levels_admin">← 管理后台</a><span>{adminDocument?`${adminDocument.category==='tutorial'?'教学':'普通'} · 序号 ${adminDocument.number} · ${adminDocument.key} · v${adminDocument.version} · ${adminDocument.status==='published'?'已发布':adminDocument.status==='draft'?'草稿':'已下架'}`:'新建普通关卡'}</span>{administrator?<span>管理员：{administrator.username}</span>:<button onClick={()=>setShowAdminLogin(true)}>管理员登录</button>}{adminDocument?<button disabled={adminBusy||!adminDirty} onClick={saveToAdmin}>{adminBusy?'正在保存…':'保存到管理后端'}</button>:<button disabled={adminBusy} onClick={saveAsNormal}>{adminBusy?'正在保存…':'保存为普通关卡'}</button>}<span role="status">{adminMessage||(adminDirty?'有未保存修改':'')}</span></div>}
      {showAdminLogin&&<div className="admin-login-cover"><form onSubmit={loginAdministrator} className="admin-login" aria-label="管理员登录"><h2>管理员登录</h2><label>账号<input name="username" autoComplete="username" defaultValue="admin" required/></label><label>密码<input name="password" type="password" autoComplete="current-password" required/></label><p role="alert">{loginError}</p><button disabled={loginBusy}>{loginBusy?'正在登录…':'登录'}</button><button type="button" onClick={()=>setShowAdminLogin(false)}>取消</button></form></div>}
      <header className="topbar">
        <div className="brand">
          <h1>PuppetGo 关卡编辑器</h1>
          <span className="sub">
            每格 {CELL_SIZE} m · 当前第 {layer + 1} 层（高度 {layer * CELL_SIZE} m）
          </span>
        </div>
        <div className="actions">
          <label className="name-field">
            名称
            <input
              className="name-input"
              value={scene.name}
              onChange={(e) => setScene({ ...scene, name: e.target.value })}
              placeholder="untitled"
            />
          </label>
          <label title="关卡限时，单位为分钟；0 表示不限时">
            限时（分钟）
            <input
              type="number"
              min="0"
              step="0.5"
              value={scene.limitTime ?? 5}
              onChange={(e) => setScene({ ...scene, limitTime: Math.max(0, Number(e.target.value) || 0) })}
            />
          </label>
          <label>
            宽
            <input
              type="number"
              min="2"
              max="32"
              value={gridW}
              onChange={(e) => setGridW(e.target.value)}
              onBlur={applyGridSize}
              onKeyDown={(e) => e.key === 'Enter' && applyGridSize()}
            />
          </label>
          <label>
            深
            <input
              type="number"
              min="2"
              max="32"
              value={gridD}
              onChange={(e) => setGridD(e.target.value)}
              onBlur={applyGridSize}
              onKeyDown={(e) => e.key === 'Enter' && applyGridSize()}
            />
          </label>
          <div className="seg">
            <button className={view === '2d' ? 'active' : ''} onClick={() => setView('2d')}>
              2D 编辑
            </button>
            <button className={view === 'split' ? 'active' : ''} onClick={() => setView('split')}>
              2D / 3D 分屏
            </button>
            <button className={view === '3d' ? 'active' : ''} onClick={() => setView('3d')}>
              3D 预览
            </button>
          </div>
          <button onClick={handleNew}>新建</button>
          <button onClick={copyJson}>复制 JSON</button>
          <button onClick={exportJson}>导出 JSON</button>
          <button onClick={openJson}>导入 JSON</button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={importJson}
          />
        </div>
      </header>

        <main className="editor">
          <aside className="palette">
            <h3>放置工具</h3>
            {TOOL_GROUPS.map(group => (
              <section className="tool-group" key={group.label} aria-label={group.label}>
                <h4>{group.label}</h4>
                {group.types.map(type => TYPE_MAP[type]).map((t) => (
              <button
                key={t.type}
                className={`tool ${tool === t.type ? 'active' : ''}`}
                onClick={() => { setTool(t.type); setSelectedId(null); }}
              >
                <span className="chip" style={{ background: t.color, color: t.textColor || '#fff' }}>
                  {t.glyph}
                </span>
                {t.label}
              </button>
                ))}
              </section>
            ))}
            <button
              className={`tool ${tool === 'eraser' ? 'active' : ''}`}
              onClick={() => setTool('eraser')}
            >
              <span className="chip eraser">✕</span>
              橡皮擦
            </button>


          </aside>

          <SplitWorkspace
            mode={view}
            ratio={splitRatio}
            onRatioChange={setSplitRatio}
            onModeChange={setView}
            right={<View3D scene={scene} />}
            left={<section className="board">
            <details className="board-options"><summary>视图与关卡操作</summary>            <h3>视图</h3>
            <label className="check">
              <input
                type="checkbox"
                checked={showBelow}
                onChange={(e) => setShowBelow(e.target.checked)}
              />
              显示下层占用
            </label>
            <h3>当前层操作</h3>
            <button className="wide" onClick={handleFillGround}>
              铺满当前层（外围边界 / 中间地面）
            </button>
            <button className="wide" onClick={handleClearLayer}>
              清空当前层
            </button>
            <h3>第一层边界</h3>
            <button className="wide" onClick={() => setScene(current => addGroundBoundaries(current))}>
              一键添加边界
            </button>
            <p className="tip">沿第一层地板外围添加一圈边界（含角），跳过已有组件和预留格；网格外不添加，请为地板留一格边距。</p>
            <h3>统计</h3>
            <ul className="stats">
              {ENTITY_TYPES.map((t) => (
                <li key={t.type}>
                  <span className="dot" style={{ background: t.color }} />
                  {t.label}：{counts[t.type] || 0}
                </li>
              ))}
            </ul>

            </details>
            <div className="layerbar">
              {Array.from({ length: scene.layerCount }, (_, i) => (
                <button
                  key={i}
                  className={`layer ${layer === i ? 'active' : ''}`}
                  onClick={() => setLayer(i)}
                >
                  第 {i + 1} 层
                </button>
              ))}
              <button className="layer add" onClick={handleAddLayer} title="新增一层">
                + 层
              </button>
              {scene.layerCount > 1 && (
                <button className="layer del" onClick={handleRemoveLayer}>
                  删除本层
                </button>
              )}
            </div>
            <Level2D onSelectEntity={id=>{const e=scene.entities.find(e=>e.id===id);if(tool==='dialogueTrigger'&&e)place(tool,e.x,e.z);else setSelectedId(id);}}
              scene={scene}
              layer={layer}
              onClick={handleCellClick}
              onRightClick={handleCellRightClick}
              showBelow={showBelow}
              selectedId={selectedId}
              draggingId={draggingId}
              onDragStart={handleDragStart}
              onDragEnter={handleDragEnter}
              onDragEnd={handleDragEnd}
            />
            <p className="hint">
              当前工具：
              {tool === 'eraser' ? '橡皮擦' : tool === 'route' ? '编辑路线' : TYPE_MAP[tool]?.label || ''}
              ，点击网格放置；该层实体底部高度 {layer * CELL_SIZE} m。
              {tool === 'route' && (selectedSlider ? '点击沿移动方向的格子延伸轨道，中间格自动补齐；右键轨道点裁短轨道。' : '点选士兵后，点击空格添加路径点，右键路径点删除。')}
              {layer > 0 && showBelow && '半透明色块 = 下一层已占用的格子。'}
            </p>
          </section>}
          />

          <aside className="inspector">
            <h2>组件属性</h2>
            <h3>{TYPE_MAP[selectedEntity?.type || tool]?.label || '请选择组件'}</h3>
            <p className="tip">{selectedEntity ? `已选：(${selectedEntity.x}, ${selectedEntity.z}) · 第 ${selectedEntity.layer + 1} 层` : '设置下一次放置的组件属性'}</p>
            <p className="tip">{(() => {
              const info = TYPE_MAP[selectedEntity?.type || tool];
              return info ? `尺寸：${info.size.nx} × ${info.size.nz} × ${info.size.ny} · ${info.movable ? '可搬运' : '固定组件'}` : '';
            })()}</p>
            {selectedEntity && entitiesAt(scene, selectedEntity.x, selectedEntity.z, layer).length > 1 && (
              <div className="facing-row">{entitiesAt(scene, selectedEntity.x, selectedEntity.z, layer).map(e => (
                <button key={e.id} className={e.id === selectedId ? 'active' : ''} onClick={() => setSelectedId(e.id)}>{TYPE_MAP[e.type]?.label}</button>
              ))}</div>
            )}

            {isSpanningType(tool) && !selectedEntity && (
              <>
                <h3>长边方向</h3>
                <div className="facing-row">
                  <button
                    className={`facing-btn ${boxRotation !== 90 ? 'active' : ''}`}
                    onClick={() => applyRotation(0)}
                  >
                    横向 X
                  </button>
                  <button
                    className={`facing-btn ${boxRotation === 90 ? 'active' : ''}`}
                    onClick={() => applyRotation(90)}
                  >
                    纵向 Z
                  </button>
                </div>
              </>
            )}
            {TYPE_MAP[tool]?.hasFacing && !selectedEntity && (
              <>
                <h3>{isLaserType(tool) ? (tool === 'laser1x1x1' ? '发射方向' : '发射方向（沿长边）') : tool === 'portal' ? '正面入口朝向' : '朝向（初始）'}</h3>
                <div className="facing-row">
                  {(isLaserType(tool) ? laserAxisFacings(boxRotation, tool) : FACINGS).map((d) => (
                    <button
                      key={d}
                      className={`facing-btn ${(tool === 'portal' ? portalFacing : laserFacing) === d ? 'active' : ''}`}
                      onClick={() => tool === 'portal' ? setPortalFacing(d) : setLaserFacing(d)}
                      title={d}
                    >
                      {FACING_ARROW[d]}
                    </button>
                  ))}
                </div>
                {isLaserType(tool) && (
                  <p className="tip">
                    {tool === 'laser1x1x1' ? '单格激光可向四个方向发射，箭头指向圆形发射口。' : '两格激光只能沿长边发射：横向 2 格射东西（← →），纵向 2 格射南北（↑ ↓）。'}
                  </p>
                )}
              </>
            )}

            {!selectedEntity && TYPE_MAP[tool]?.hasNumber && (
              <label className="wait-field">配对编号
                <input type="number" min="0" max="99" value={defaultNumber ?? ''} placeholder="未配对"
                  onChange={e => setDefaultNumber(e.target.value === '' ? null : Math.max(0, Math.min(99, Math.floor(Number(e.target.value) || 0))))} />
              </label>
            )}
            {(selectedSlider || selectedSoldier) && (
              <button className="wide" onClick={() => setTool(tool === 'route' ? selectedEntity.type : 'route')}>
                {tool === 'route' ? '结束路线编辑' : '编辑路线 / 轨道'}
              </button>
            )}
            {selectedEntity && TYPE_MAP[selectedEntity.type]?.hasRotation && (
              <>
                <h3>长边方向</h3>
                <div className="facing-row">
                  <button
                    className={`facing-btn ${selectedEntity.rotation !== 90 ? 'active' : ''}`}
                    onClick={() => setSelectedRotation(0)}
                  >
                    横向 X
                  </button>
                  <button
                    className={`facing-btn ${selectedEntity.rotation === 90 ? 'active' : ''}`}
                    onClick={() => setSelectedRotation(90)}
                  >
                    纵向 Z
                  </button>
                </div>
              </>
            )}
            {selectedEntity && TYPE_MAP[selectedEntity.type]?.hasFacing && (
              <>
                <h3>
                  {isLaserType(selectedEntity.type) ? (selectedEntity.type === 'laser1x1x1' ? '发射方向' : '发射方向（沿长边）') : selectedEntity.type === 'portal' ? '正面入口朝向' : '朝向（初始）'}
                </h3>
                <div className="facing-row">
                  {(isLaserType(selectedEntity.type)
                    ? laserAxisFacings(selectedEntity.rotation, selectedEntity.type)
                    : FACINGS
                  ).map((d) => (
                    <button
                      key={d}
                      className={`facing-btn ${selectedEntity.facing === d ? 'active' : ''}`}
                      onClick={() => setFacing(d)}
                      title={`面向 ${d}`}
                    >
                      {FACING_ARROW[d]}
                    </button>
                  ))}
                </div>
                {isLaserType(selectedEntity.type) && (
                  <p className="tip">
                    发射方向固定平行于长边；翻转长边时方向会跟着一起转（E→S→W→N）。
                  </p>
                )}
              </>
            )}
            {(tool === 'portal' || selectedEntity?.type === 'portal') && (
              <p className="tip">箭头指向传送门正面，玩家只能从箭头所指的一侧进入；侧面和背面不能进入。</p>
            )}
            {selectedEntity?.type === 'dialogueTrigger' && <DialogueEditor scene={scene} entity={selectedEntity} setScene={setScene}/> }
            {selectedEntity && TYPE_MAP[selectedEntity.type]?.hasNumber && (
              <>
                <h3>
                  {selectedEntity.type === 'portal'
                    ? '传送门配对编号'
                    : selectedEntity.type === 'laserTrigger'
                    ? '激光触发器编号'
                    : selectedEntity.type === 'trigger'
                    ? '触发器编号'
                    : isSliderType(selectedEntity.type)
                      ? '滑动组件编号'
                      : '机关编号'}
                </h3>
                <label className="wait-field">
                  编号
                  <input
                    type="number"
                    min="0"
                    max="99"
                    value={selectedEntity.number ?? ''}
                    placeholder="未配对"
                    onChange={(e) => setEntityNumber(e.target.value)}
                  />
                </label>
                <p className="tip">
                  {selectedEntity.type === 'portal' && sameNumber.length !== 1
                    ? `未完成配对：同号共有 ${sameNumber.length + 1} 个传送门，需要恰好 2 个。设置相同数字（0~99），留空为未配对。`
                    : sameNumber.length > 0
                    ? `配对：${sameNumber
                        .map(
                          (e) =>
                            `${TYPE_MAP[e.type]?.label || ''}(${e.x},${e.z},L${e.layer + 1})`
                        )
                        .join('、')}`
                    : '未配对（编号相同的触发器或激光触发器与门/弹簧/滑动组件自动配对）'}
                </p>
              </>
            )}
            {(tool === 'laserTrigger' || selectedEntity?.type === 'laserTrigger') && (
              <p className="tip">激光触发器占 1×1×1 格，可搬运；使用与门、弹簧箱或滑动组件相同的编号配对。</p>
            )}
            {selectedEntity && isDoorType(selectedEntity.type) && (
              <>
                <h3>门</h3>
                <p className="tip">
                  占 4 格、高 3 格；两端各一格是收纳柱，中间两格栅栏向两侧收回。编号与触发器相同时，
                  触发器被压住开门，松开后关闭；通道有人或箱子时等待清空再关门。
                </p>
              </>
            )}
            {selectedSlider && (
              <>
                <h3>滑动轨道</h3>
                <ul className="route-list">
                  <li>
                    <span>起点</span>
                    <span>
                      ({selectedSlider.x}, {selectedSlider.z})
                    </span>
                  </li>
                  {selectedSlider.track?.map((p, i) => (
                    <li key={i}>
                      <div className="route-row">
                        <span>轨道点 {i + 1}</span>
                        <span>
                          ({p.x}, {p.z})
                        </span>
                        <button className="mini" onClick={() => removeWaypointAt(p.x, p.z)}>
                          ×
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
                <button className="wide" onClick={handleClearRoute}>
                  清空轨道
                </button>
                <p className="tip">
                  点击沿移动方向的目标格延伸轨道，中间格自动补齐；可点击滑块自身的第二格。右键或 × 删除该点及后续轨道。触发器压住时滑到末端，松开后退回起点。
                  {(TYPE_MAP[selectedSlider.type]?.size?.nx || 1) > 1
                    ? ' 2×1×3 的轨道只能沿长边方向。'
                    : ' 1×1×3 的轨道沿首次选定的方向直线延伸。'}
                </p>
              </>
            )}
            {selectedSoldier && (
              <>
                <h3>巡逻路线</h3>
                <ul className="route-list">
                  <li>
                    <span>起点</span>
                    <span>({selectedSoldier.x}, {selectedSoldier.z})</span>
                  </li>
                  {selectedSoldier.route?.map((p, i) => (
                    <li key={i}>
                      <div className="route-row">
                        <span>路径点 {i + 1}</span>
                        <span>({p.x}, {p.z})</span>
                        <button className="mini" onClick={() => removeWaypointAt(p.x, p.z)}>
                          ×
                        </button>
                      </div>
                      <label className="wait-field">
                        停留
                        <input
                          type="number"
                          min="0"
                          max="60"
                          step="0.5"
                          value={p.wait ?? 0}
                          onChange={(e) => updateWaypointWait(i, e.target.value)}
                        />
                        秒
                      </label>
                    </li>
                  ))}
                </ul>
                <label className="wait-field">
                  新路径点停留
                  <input
                    type="number"
                    min="0"
                    max="60"
                    step="0.5"
                    value={defaultWait}
                    onChange={(e) =>
                      setDefaultWait(Math.max(0, Math.min(60, Number(e.target.value) || 0)))
                    }
                  />
                  秒
                </label>
                <button className="wide" onClick={handleClearRoute}>
                  清空路线
                </button>
                <p className="tip">切换到“编辑路线”工具后，点选士兵、点击空格添加路径点；每个路径点可单独设置停留秒数。</p>
              </>
            )}
            <p className="tip">
              左键放置，右键擦除。每格每层只允许一个实体；可移动方块（箱子）下层必须有支撑，目标方块是玩家的胜利点。
            </p>
          </aside>
        </main>

      <footer className="statusbar">
        {scene.name} · {scene.grid.width}×{scene.grid.depth} · {scene.layerCount} 层 ·{' '}
        {scene.entities.length} 个实体 · Unity Prefab 网格 / 材质 / WebGL Shader · 备用 FBX：
        {ENTITY_TYPES.filter((t) => t.fbx).map((t) => t.fbx).join(' / ')}
        （资源缺失时使用占位模型）
      </footer>
    </div>
  );
}
