import { defaultDialogue, validateDialogueContent } from './dialogue.js';
export const CELL_SIZE = 0.8;
export const MAX_LAYERS = 16;

export const ENTITY_TYPES = [
  { type: 'dialogueTrigger', label: '教程对话', color: '#0ea5e9', glyph: '话', size: { nx: 1, nz: 1, ny: 1 }, movable: false, overlay: true, annotation: true },
  { type: 'ground', label: '地面方块', color: '#ffffff', textColor: '#111827', glyph: '地', fbx: null, size: { nx: 1, nz: 1, ny: 1 }, visualScale: 1, movable: false },
  { type: 'box1x1', label: '1×1 箱子', color: '#facc15', textColor: '#111827', glyph: '箱', fbx: null, size: { nx: 1, nz: 1, ny: 1 }, visualScale: 1, movable: true },
  { type: 'glass', label: '玻璃 1×1×1', color: '#9EE7F5', textColor: '#155E75', glyph: '玻', fbx: 'GlassBox.fbx', size: { nx: 1, nz: 1, ny: 1 }, visualScale: 1, movable: true, translucent: true },
  { type: 'glass2x1x2', label: '玻璃 1×2×2', color: '#9EE7F5', textColor: '#155E75', glyph: '玻', fbx: 'GlassBox.fbx', size: { nx: 2, nz: 1, ny: 2 }, visualScale: 1, movable: true, hasRotation: true, translucent: true },
  { type: 'box2x1x2', label: '2×1×2 箱子', color: '#facc15', textColor: '#111827', glyph: '板', fbx: null, size: { nx: 2, nz: 1, ny: 2 }, visualScale: 1, movable: true, hasRotation: true },
  { type: 'laser1x1x1', label: '激光 1×1×1', color: '#d946ef', glyph: '激', fbx: null, size: { nx: 1, nz: 1, ny: 1 }, visualScale: 1, movable: true, hasFacing: true },
  { type: 'laser2x1x1', label: '激光 2×1×1', color: '#d946ef', glyph: '激', fbx: null, size: { nx: 2, nz: 1, ny: 1 }, visualScale: 1, movable: true, hasRotation: true, hasFacing: true },
  { type: 'laser2x1x2', label: '激光 2×1×2', color: '#d946ef', glyph: '激', fbx: null, size: { nx: 2, nz: 1, ny: 2 }, visualScale: 1, movable: true, hasRotation: true, hasFacing: true },
  { type: 'player', label: '玩家', color: '#3b82f6', glyph: '玩', fbx: 'ChinesePuppetBoy.fbx', size: { nx: 1, nz: 1, ny: 1 }, visualScale: 1.15, movable: false, hasFacing: true },
  { type: 'soldier', label: '士兵', color: '#ef4444', glyph: '兵', fbx: 'Rockman@Idle.fbx', meshFbx: 'Rockman.fbx', preferFbx: true, size: { nx: 1, nz: 1, ny: 1 }, visualScale: 1.15, movable: false, hasFacing: true },
  { type: 'target', label: '终点光柱', color: '#38BDF8', glyph: '★', fbx: 'GoalBeacon.fbx', size: { nx: 1, nz: 1, ny: 1 }, visualScale: 6, movable: false, overlay: true },
  { type: 'trigger', label: '触发器', color: '#ef4444', glyph: '触', fbx: null, size: { nx: 1, nz: 1, ny: 1 }, visual: { w: 0.5, h: 0.004, d: 0.5, align: 'bottom' }, visualScale: 1, movable: false, translucent: true, hasNumber: true, overlay: true },
  { type: 'laserTrigger', label: '激光触发器 1×1×1', color: '#fb7185', glyph: '感', fbx: 'LightTrigger.fbx', size: { nx: 1, nz: 1, ny: 1 }, visualScale: 1, movable: true, hasNumber: true },
  { type: 'portal', label: '传送门 1×1×3', color: '#22d3ee', glyph: '◎', fbx: null, size: { nx: 1, nz: 1, ny: 3 }, visual: { w: 0.8, h: 2.4, d: 0.8, align: 'bottom' }, visualScale: 1, movable: true, hasFacing: true, hasNumber: true },
  // 门：4×1 占地、3 格高；两端各一格收纳柱，中间两格栅栏向两侧收回。
  { type: 'door', label: '门 4×1×3', color: '#b45309', glyph: '门', fbx: null, size: { nx: 4, nz: 1, ny: 3 }, visualScale: 1, movable: false, hasRotation: true, hasNumber: true },
  { type: 'spring', label: '弹簧 1×1×1', color: '#22d3ee', glyph: '弹', fbx: null, size: { nx: 1, nz: 1, ny: 1 }, visualScale: 1, movable: false, hasNumber: true },
  // 滑动组件：3 格高，配触发器编号，沿"滑动轨道"移动（轨道像士兵路线一样在组件上编辑）
  { type: 'slider1x1x3', label: '滑块 1×1×3', color: '#0ea5e9', glyph: '滑', fbx: 'Slider1x1x3.fbx', size: { nx: 1, nz: 1, ny: 3 }, visualScale: 3, movable: false, hasNumber: true },
  { type: 'slider2x1x3', label: '滑块 2×1×3', color: '#0ea5e9', glyph: '滑', fbx: 'Slider2x1x3.fbx', size: { nx: 2, nz: 1, ny: 3 }, visualScale: 3, movable: false, hasRotation: true, hasNumber: true },
  // 装饰类：只做美化，占格后玩家不能走上去也不能再放其他组件；不挡激光、不需要下层支撑
  { type: 'boundary', label: '边界', color: '#64748b', glyph: '界', fbx: null, size: { nx: 1, nz: 1, ny: 1 }, visual: { w: CELL_SIZE, h: CELL_SIZE * 1.2, d: CELL_SIZE * 0.5, align: 'bottom' }, visualScale: 1, movable: false, decor: true },
  { type: 'decor', label: '饰品格子', color: '#a78bfa', glyph: '饰', fbx: null, size: { nx: 1, nz: 1, ny: 1 }, visualScale: 1, movable: false, decor: true },
];

export const TYPE_MAP = Object.fromEntries(ENTITY_TYPES.map((t) => [t.type, t]));

export const TOOL_GROUPS = [
  { label: '地形与装饰', types: ['ground', 'boundary', 'decor'] },
  { label: '角色与目标', types: ['player', 'soldier', 'target'] },
  { label: '箱子与玻璃', types: ['box1x1', 'box2x1x2', 'glass', 'glass2x1x2'] },
  { label: '机关与触发器', types: ['dialogueTrigger', 'trigger', 'laserTrigger', 'door', 'spring', 'slider1x1x3', 'slider2x1x3', 'portal'] },
  { label: '激光发射器', types: ['laser1x1x1', 'laser2x1x1', 'laser2x1x2'] },
];

export const MECHANISM_PALETTE = ['#EE705C', '#44B9CF', '#EABF45', '#9074D4', '#69B45F', '#DA7CB6', '#E89549', '#5B8DDB', '#58B49C', '#AD9072'];
export function mechanismColor(scene, entity) {
  const usesColor = (e) => ['trigger', 'laserTrigger', 'spring', 'door', 'slider1x1x3', 'slider2x1x3'].includes(e.type);
  if (!entity || !usesColor(entity)) return TYPE_MAP[entity?.type]?.color;
  const numbers = [...new Set(scene.entities.filter((e) => usesColor(e) && Number.isInteger(e.number) && e.number >= 0 && e.number <= 99).map((e) => e.number))].sort((a, b) => a - b);
  const index = numbers.indexOf(entity.number);
  return index < 0 ? '#A3ABB3' : MECHANISM_PALETTE[index % MECHANISM_PALETTE.length];
}
export const FACINGS = ['N', 'E', 'S', 'W'];
export const FACING_ARROW = { N: '↑', E: '→', S: '↓', W: '←' };
// 假定 FBX 模型默认面向 +Z（南）；若模型默认朝向相反，把 N/S 对调、E/W 对调即可
export const FACING_ROTATION = { N: Math.PI, E: Math.PI / 2, S: 0, W: -Math.PI / 2 };
// 网格坐标增量：x 向右（东），z 向下（南）
export const FACING_DELTA = {
  N: { x: 0, z: -1 },
  E: { x: 1, z: 0 },
  S: { x: 0, z: 1 },
  W: { x: -1, z: 0 },
};

export const LASER_TYPES = ['laser1x1x1', 'laser2x1x1', 'laser2x1x2'];

// 激光发射方向必须平行于长边（放置方向）：横向 2 格 → 只能东西（E/W），纵向 2 格 → 只能南北（N/S）。
export const LASER_AXIS_FACINGS = { 0: ['E', 'W'], 90: ['N', 'S'] };

// 机体翻转 90° 时发射方向跟随机体一起转：E→S→W→N→E（另一方向为逆过程）。
const FACING_TURN_CW = { E: 'S', S: 'W', W: 'N', N: 'E' };
const FACING_TURN_CCW = { E: 'N', N: 'W', W: 'S', S: 'E' };

export function isLaserType(type) {
  return LASER_TYPES.includes(type);
}

export function normalizeRotation(rotation) {
  return rotation === 90 ? 90 : 0;
}

/** 该长边方向下允许的发射方向（两个，互为反向）。 */
export function laserAxisFacings(rotation, type) {
  if (type === 'laser1x1x1') return FACINGS;
  return LASER_AXIS_FACINGS[normalizeRotation(rotation)];
}

/** 把任意朝向压到长边轴上：已平行则原样返回，垂直于长边时取默认正向（横向 E / 纵向 S）。 */
export function laserAxisFacing(rotation, facing, type) {
  const allowed = laserAxisFacings(rotation, type);
  return allowed.includes(facing) ? facing : allowed[0];
}

/** 长边翻转 90° 后，发射方向跟随机体一起转，保持炮口在机体上的相对位置不变。 */
export function laserFacingOnRotate(facing, rotation, type) {
  const allowed = laserAxisFacings(rotation, type);
  if (allowed.includes(facing)) return facing;
  const turned = (normalizeRotation(rotation) === 90 ? FACING_TURN_CW : FACING_TURN_CCW)[facing];
  return allowed.includes(turned) ? turned : allowed[0];
}

/** 炮口格 = 占地格中沿发射方向最靠前的那一格（与 Unity LaserSystem.FindMuzzleCell 一致）。 */
export function laserMuzzleCell(entity) {
  const dir = FACING_DELTA[laserAxisFacing(entity.rotation, entity.facing, entity.type)] || FACING_DELTA.S;
  const cells = occupiedCells(entity);
  let best = cells[0];
  let bestScore = -Infinity;
  for (const c of cells) {
    const score = c.x * dir.x + c.z * dir.z;
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return best;
}

export function createScene() {
  return {
    name: 'untitled',
    limitTime: 5,
    cellSize: CELL_SIZE,
    grid: { width: 8, depth: 6 },
    layerCount: 1,
    entities: [],
  };
}

export function entitiesAt(scene, x, z, layer) {
  return scene.entities.filter(
    (e) => occupiedVolumes(e).some((c) => c.x === x && c.z === z && c.layer === layer)
  );
}

export function entityAt(scene, x, z, layer) {
  const list = entitiesAt(scene, x, z, layer);
  return list.find((e) => !TYPE_MAP[e.type]?.overlay) || list[0] || null;
}

export function occupiedCells(entity) {
  const size = TYPE_MAP[entity.type]?.size || { nx: 1, nz: 1, ny: 1 };
  const rotated = entity.rotation === 90;
  const width = rotated ? size.nz : size.nx;
  const depth = rotated ? size.nx : size.nz;
  const cells = [];
  for (let dx = 0; dx < width; dx++) for (let dz = 0; dz < depth; dz++)
    cells.push({ x: entity.x + dx, z: entity.z + dz });
  return cells;
}

export function isSpanningType(type) {
  const size = TYPE_MAP[type]?.size;
  return Boolean(size && (size.nx > 1 || size.nz > 1));
}

export const SLIDER_TYPES = ['slider1x1x3', 'slider2x1x3'];

export function isSliderType(type) {
  return SLIDER_TYPES.includes(type);
}

export function isDoorType(type) {
  return type === 'door';
}

/** 组件在竖直方向占的层数（门、滑动组件是 3 格）。 */
export function volumeHeight(type) {
  return TYPE_MAP[type]?.size?.ny || 1;
}

/** 组件在三维网格里占用的所有格（含向上跨的层）。 */
export function occupiedVolumes(entity) {
  const cells = occupiedCells(entity);
  const out = [];
  for (let l = 0; l < volumeHeight(entity.type); l++) {
    for (const c of cells) out.push({ x: c.x, z: c.z, layer: entity.layer + l });
  }
  return out;
}

/** 门的收纳位：本体四格内的两端柱，中间两格通行。 */
export function doorLeafCells(entity) {
  if (!isDoorType(entity.type)) return [];
  return entity.rotation === 90
    ? [
        { x: entity.x, z: entity.z },
        { x: entity.x, z: entity.z + 3 },
      ]
    : [
        { x: entity.x, z: entity.z },
        { x: entity.x + 3, z: entity.z },
      ];
}

/** 滑动轨道占的格：每个轨道点上机体占地格的并集（2×1×3 会形成 2 格宽的走廊）。 */
export function sliderTrackCells(entity) {
  const track = normalizeTrack(entity, entity.track);
  const seen = new Set();
  const out = [];
  for (const p of track) {
    for (const c of occupiedCells({ ...entity, x: p.x, z: p.z })) {
      const k = `${c.x},${c.z}`;
      if (!seen.has(k)) {
        seen.add(k);
        out.push(c);
      }
    }
  }
  return out;
}

/** 组件本体 + 需要预留的格（门的开门位、滑动组件的轨道走廊）。 */
export function reservedCells(entity) {
  const cells = occupiedCells(entity);
  if (isDoorType(entity.type)) return cells;
  if (isSliderType(entity.type)) return [...cells, ...sliderTrackCells(entity)];
  return cells;
}

export function reservedVolumes(entity) {
  const cells = reservedCells(entity);
  const out = [];
  for (let l = 0; l < volumeHeight(entity.type); l++) {
    for (const c of cells) out.push({ x: c.x, z: c.z, layer: entity.layer + l });
  }
  return out;
}

function volumeKey(c) {
  return `${c.x},${c.z},${c.layer}`;
}

/** 被其他组件预留的 3D 格（门的开门位 + 滑动轨道走廊），这些格不能再放别的东西。 */
export function reservedSlotKeys(scene, excludeId = null) {
  const keys = new Set();
  for (const e of scene.entities) {
    if (e.id === excludeId) continue;
    if (!isDoorType(e.type) && !isSliderType(e.type)) continue;
    const cells = isDoorType(e.type) ? doorLeafCells(e) : sliderTrackCells(e);
    for (let l = 0; l < volumeHeight(e.type); l++) {
      for (const c of cells) keys.add(`${c.x},${c.z},${e.layer + l}`);
    }
  }
  return keys;
}

/** 这些格上被哪个组件预留（门的开门位 / 滑动轨道），用于 2D 提示。 */
export function reservingEntitiesAt(scene, x, z, layer) {
  const out = [];
  for (const e of scene.entities) {
    if (!isDoorType(e.type) && !isSliderType(e.type)) continue;
    if (layer < e.layer || layer >= e.layer + volumeHeight(e.type)) continue;
    const cells = isDoorType(e.type) ? doorLeafCells(e) : sliderTrackCells(e);
    if (cells.some((c) => c.x === x && c.z === z)) out.push(e);
  }
  return out;
}

/** 一组 3D 格能否放东西（忽略 selfId 自己）：不能占用别人的预留格，也不能压到别的实体。 */
export function volumesAvailable(scene, volumes, selfId = null) {
  const reserved = reservedSlotKeys(scene, selfId);
  for (const c of volumes) {
    if (reserved.has(volumeKey(c))) {
      return { ok: false, reason: '该格被门的开门位或滑动轨道预留，不能放置' };
    }
    const others = entitiesAt(scene, c.x, c.z, c.layer).filter((e) => e.id !== selfId);
    if (others.some((e) => !TYPE_MAP[e.type]?.overlay)) {
      return { ok: false, reason: '目标格已有实体' };
    }
  }
  return { ok: true };
}

/** 滑动轨道逐格延伸在同一直线上；双格滑块还需沿长边。 */
export function trackStepError(entity, from, to) {
  if (from.x === to.x && from.z === to.z) return '该点已在轨道中';
  if (Math.abs(to.x - from.x) + Math.abs(to.z - from.z) !== 1) {
    return '轨道点必须与前一个点相邻（一次一格）';
  }
  if ((TYPE_MAP[entity.type]?.size?.nx || 1) > 1) {
    if (entity.rotation === 90 ? to.x !== entity.x : to.z !== entity.z) {
      return '2×1×3 的滑动组件只能沿长边方向移动';
    }
  }
  const dx = from.x - entity.x, dz = from.z - entity.z;
  if ((dx !== 0 && (to.z !== entity.z || Math.sign(to.x - from.x) !== Math.sign(dx)))
      || (dz !== 0 && (to.x !== entity.x || Math.sign(to.z - from.z) !== Math.sign(dz)))) {
    return '轨道只能沿起始方向直线延伸，不能转弯';
  }
  return null;
}

/** 收敛轨道点：只保留合法、相邻且不重复的点（导入旧数据时用来纠正）。 */
export function normalizeTrack(entity, cells) {
  const out = [];
  for (const p of Array.isArray(cells) ? cells : []) {
    const next = { x: p.x, z: p.z };
    if (next.x === entity.x && next.z === entity.z) continue;
    if (out.some((q) => q.x === next.x && q.z === next.z)) continue;
    const prev = out.length ? out[out.length - 1] : { x: entity.x, z: entity.z };
    if (trackStepError(entity, prev, next)) continue;
    out.push(next);
  }
  return out;
}

/** 点击目标位置后，逐格补齐直线轨道；包括宽滑块自身占用的第二格。失败时不修改已有轨道。 */
export function extendSliderTrack(scene, entity, x, z) {
  const track = entity.track || [];
  const fail = (reason) => ({ track, result: { ok: false, reason } });
  if (!isSliderType(entity.type)) return fail('请选择滑动组件');
  if (!Number.isInteger(x) || !Number.isInteger(z)) return fail('轨道点必须对齐网格');
  const last = track.at(-1) || entity;
  if (last.x === x && last.z === z) return { track, result: { ok: true } };
  if ((entity.x === x && entity.z === z) || track.some(p => p.x === x && p.z === z)) {
    return fail('该点已在轨道中');
  }
  if (last.x !== x && last.z !== z) return fail('轨道只能沿起始方向直线延伸，不能转弯');
  const dx = Math.sign(x - last.x), dz = Math.sign(z - last.z);
  const distance = Math.abs(x - last.x) + Math.abs(z - last.z);
  if (distance > Math.max(scene.grid.width, scene.grid.depth)) return fail('超出网格范围');
  const nextTrack = [...track];
  let prev = last;
  for (let i = 1; i <= distance; i++) {
    const next = { x: last.x + dx * i, z: last.z + dz * i };
    const stepError = trackStepError(entity, prev, next);
    if (stepError) return fail(stepError);
    const body = occupiedVolumes({ ...entity, ...next });
    if (body.some(c => c.x < 0 || c.z < 0 || c.x >= scene.grid.width || c.z >= scene.grid.depth)) {
      return fail('滑块沿轨道移动后会超出网格范围');
    }
    const blocked = volumesAvailable(scene, body, entity.id);
    if (!blocked.ok) return fail(`轨道被挡住：${blocked.reason}`);
    nextTrack.push(next);
    prev = next;
  }
  return { track: nextTrack, result: { ok: true } };
}

export function canPlace(scene, type, x, z, layer, rotation = 0) {
  const { width, depth } = scene.grid;
  const info = TYPE_MAP[type];
  if (!info) return { ok: false, reason: '未知组件类型' };
  if (layer < 0 || layer >= scene.layerCount) {
    return { ok: false, reason: '图层无效' };
  }
  const ny = volumeHeight(type);
  if (layer + ny > MAX_LAYERS) {
    return { ok: false, reason: `该组件高 ${ny} 格，最多 ${MAX_LAYERS} 层，请放低一些` };
  }
  const cells = reservedCells({ type, x, z, layer, rotation });
  for (const c of cells) {
    if (c.x < 0 || c.z < 0 || c.x >= width || c.z >= depth) {
      return { ok: false, reason: isDoorType(type) ? '门的四格本体超出网格范围' : '超出网格范围' };
    }
  }
  if (info.annotation) return { ok: true };
  const reserved = reservedSlotKeys(scene);
  for (let l = 0; l < ny; l++) {
    const at = layer + l;
    for (const c of cells) {
      if (reserved.has(`${c.x},${c.z},${at}`)) {
        return { ok: false, reason: '该格被门的开门位或滑动轨道预留，不能放置' };
      }
      const existing = entitiesAt(scene, c.x, c.z, at).filter(e => !TYPE_MAP[e.type]?.annotation);
      if (existing.some((e) => !TYPE_MAP[e.type]?.overlay)) {
        return { ok: false, reason: at === layer ? '该格已有方块，先擦除再放置' : `第 ${at + 1} 层已有方块，先擦除再放置` };
      }
      if (info?.overlay && existing.some((e) => TYPE_MAP[e.type]?.overlay)) {
        return { ok: false, reason: '该格已有机关，先擦除再放置' };
      }
    }
  }
  if (type === 'player' && scene.entities.some((e) => e.type === 'player')) {
    return { ok: false, reason: '场景中已有玩家，请先删除再放置新的' };
  }
  return { ok: true };
}

export function addEntity(scene, type, x, z, layer, rotation = 0, facing = 'S') {
  const result = canPlace(scene, type, x, z, layer, rotation);
  if (!result.ok) return { scene, result };
  const id = `${type}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const entity = { id, type, x, z, layer };
  const info = TYPE_MAP[type];
  if (info?.hasRotation) entity.rotation = rotation === 90 ? 90 : 0;
  if (info?.hasFacing) entity.facing = FACINGS.includes(facing) ? facing : 'S';
  // 激光发射方向必须平行于长边：垂直于长边的朝向在这里统一纠正。
  if (isLaserType(type)) entity.facing = laserAxisFacing(entity.rotation, entity.facing, entity.type);
  if (type === 'dialogueTrigger') { entity.dialogueId = id; entity.dialogue = defaultDialogue(); }
  if (type === 'soldier') entity.route = [];
  if (isSliderType(type)) entity.track = [];
  if (info?.hasNumber) {
    entity.number = null;
  }
  // 门 / 滑动组件高 3 格：自动补足需要的层数
  const layerCount = Math.max(scene.layerCount, layer + volumeHeight(type));
  return {
    scene: { ...scene, layerCount, entities: [...scene.entities, entity] },
    result,
  };
}

export function removeEntity(scene, id) {
  return { ...scene, entities: scene.entities.filter((e) => e.id !== id) };
}

export function moveEntity(scene, id, x, z) {
  const entity = scene.entities.find((e) => e.id === id);
  if (!entity) return { scene, result: { ok: false, reason: '实体不存在' } };
  if (entity.type === 'ground') return { scene, result: { ok: false, reason: '地板不能拖动' } };
  if (entity.x === x && entity.z === z) return { scene, result: { ok: true } };

  const { width, depth } = scene.grid;
  const info = TYPE_MAP[entity.type];
  const moved = { ...entity, x, z };
  const volumes = occupiedVolumes(moved);
  const reserved = reservedSlotKeys(scene, entity.id);

  for (const c of volumes) {
    if (c.x < 0 || c.z < 0 || c.x >= width || c.z >= depth) {
      return { scene, result: { ok: false, reason: '目标位置超出网格范围' } };
    }
    if (!info?.annotation && reserved.has(`${c.x},${c.z},${c.layer}`)) {
      return { scene, result: { ok: false, reason: '目标格是门的开门位或滑动轨道，不能占用' } };
    }

    const others = entitiesAt(scene, c.x, c.z, c.layer).filter((e) => e.id !== entity.id && !TYPE_MAP[e.type]?.annotation);
    if (info?.annotation) continue;

    if (info?.overlay) {
      if (others.some((e) => TYPE_MAP[e.type]?.overlay)) {
        return { scene, result: { ok: false, reason: '目标格已有其他机关' } };
      }
    } else if (others.some((e) => !TYPE_MAP[e.type]?.overlay)) {
      return { scene, result: { ok: false, reason: '目标格已有实体' } };
    }
  }

  const updated = {
    ...moved,
    ...(entity.type === 'soldier' ? { route: [] } : {}),
    ...(isSliderType(entity.type) ? { track: [] } : {}),
  };

  return {
    scene: {
      ...scene,
      entities: scene.entities.map((e) => (e.id === id ? updated : e)),
    },
    result: { ok: true },
  };
}

export function removeAt(scene, x, z, layer) {
  const target = entityAt(scene, x, z, layer);
  return target ? removeEntity(scene, target.id) : scene;
}

export function addLayer(scene) {
  if (scene.layerCount >= MAX_LAYERS) return scene;
  return { ...scene, layerCount: scene.layerCount + 1 };
}

export function removeLayer(scene, layer) {
  if (scene.layerCount <= 1) return scene;
  const layerCount = scene.layerCount - 1;
  const entities = scene.entities
    .filter((e) => e.layer !== layer)
    .map((e) => (e.layer > layer ? { ...e, layer: e.layer - 1 } : e))
    .filter((e) => e.layer + volumeHeight(e.type) <= layerCount);
  return { ...scene, layerCount, entities };
}

export function fillGround(scene, layer) {
  if (layer < 0 || layer >= scene.layerCount) return scene;
  const { width, depth } = scene.grid;
  const reserved = reservedSlotKeys(scene);
  const news = [];
  // 先填外围边界，再填中间地面；已有组件与预留格保持不动。
  for (const perimeter of [true, false]) {
    for (let z = 0; z < depth; z++) {
      for (let x = 0; x < width; x++) {
        const edge = x === 0 || z === 0 || x === width - 1 || z === depth - 1;
        if (edge !== perimeter || reserved.has(`${x},${z},${layer}`)) continue;
        const existing = entitiesAt(scene, x, z, layer);
        if (existing.some(e => !TYPE_MAP[e.type]?.overlay)) continue;
        // 边界不可行走，不能把已有机关或终点封在边界上。
        if (edge && existing.length) continue;
        const type = edge ? 'boundary' : 'ground';
        news.push({
          id: `${type}-${layer}-${x}-${z}-${Math.random().toString(36).slice(2, 7)}`,
          type, x, z, layer,
        });
      }
    }
  }
  return news.length ? updateBoundarySides({ ...scene, entities: [...scene.entities, ...news] }) : scene;
}

export function resizeGrid(scene, width, depth) {
  const entities = scene.entities
    .filter((e) => occupiedVolumes(e).every((c) => c.x < width && c.z < depth))
    .map((e) =>
      e.type === 'soldier' && Array.isArray(e.route)
        ? { ...e, route: e.route.filter((p) => p.x < width && p.z < depth) }
        : e
    );
  return { ...scene, grid: { width, depth }, entities };
}

export function expandSupportColumns(scene) {
  const occupied = new Set();
  for (const e of scene.entities) {
    const info = TYPE_MAP[e.type];
    if (info?.overlay) continue;
    for (const c of occupiedVolumes(e)) occupied.add(`${c.x},${c.z},${c.layer}`);
  }
  const added = [];
  for (const e of scene.entities) {
    const info = TYPE_MAP[e.type];
    if (!info || !info.movable) continue;
    for (const c of occupiedCells(e)) {
      for (let l = 0; l < e.layer; l++) {
        const key = `${c.x},${c.z},${l}`;
        if (occupied.has(key)) continue;
        occupied.add(key);
        added.push({
          id: `ground-support-${c.x}-${c.z}-${l}-${Math.random().toString(36).slice(2, 7)}`,
          type: 'ground',
          x: c.x,
          z: c.z,
          layer: l,
        });
      }
    }
  }
  return added.length ? { ...scene, entities: [...scene.entities, ...added] } : scene;
}

export function hasSupportBelow(scene, x, z, layer) {
  if (layer <= 0) return true;
  return entitiesAt(scene, x, z, layer - 1).some((e) => !TYPE_MAP[e.type]?.overlay);
}

export function serializeScene(scene) {
  validateDialogueContent(scene);
  return JSON.stringify({ ...scene, limitTime: normalizeLimitTime(scene.limitTime), cellSize: CELL_SIZE }, null, 2);
}

function normalizeLimitTime(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 5;
}

export function parseScene(text) {
  const data = JSON.parse(text);
  if (data && Array.isArray(data.entities)) validateDialogueContent(data);
  if (!data || !data.grid || !Array.isArray(data.entities)) {
    throw new Error('文件格式不正确：缺少 grid 或 entities 字段');
  }
  const width = Math.min(32, Math.max(2, Math.floor(Number(data.grid.width)) || 8));
  const depth = Math.min(32, Math.max(2, Math.floor(Number(data.grid.depth)) || 6));
  let layerCount = Math.min(MAX_LAYERS, Math.max(1, Math.floor(Number(data.layerCount)) || 1));
  const entities = data.entities
    .filter(
      (e) =>
        e &&
        TYPE_MAP[e.type] &&
        Number.isFinite(e.x) &&
        Number.isFinite(e.z) &&
        Number.isFinite(e.layer) &&
        e.x >= 0 &&
        e.z >= 0 &&
        e.x < width &&
        e.z < depth &&
        e.layer >= 0 &&
        e.layer < MAX_LAYERS &&
        occupiedCells({ type: e.type, x: e.x, z: e.z, layer: e.layer, rotation: e.rotation }).every(
          (c) => c.x >= 0 && c.z >= 0 && c.x < width && c.z < depth
        )
    )
    .map((e) => {
      const route = Array.isArray(e.route)
        ? e.route
            .filter(
              (p) =>
                p &&
                Number.isFinite(p.x) &&
                Number.isFinite(p.z) &&
                p.x >= 0 &&
                p.z >= 0 &&
                p.x < width &&
                p.z < depth
            )
            .map((p) => {
              const wait = Math.max(0, Math.min(60, Number(p.wait) || 0));
              return wait > 0
                ? { x: Math.floor(p.x), z: Math.floor(p.z), wait }
                : { x: Math.floor(p.x), z: Math.floor(p.z) };
            })
        : [];
      const track = Array.isArray(e.track)
        ? e.track
            .filter((p) => p && Number.isFinite(p.x) && Number.isFinite(p.z))
            .map((p) => ({ x: Math.floor(p.x), z: Math.floor(p.z) }))
        : [];
      return {
        id: e.id || `${e.type}-${e.x}-${e.z}-${e.layer}-${Math.random().toString(36).slice(2, 7)}`,
        type: e.type,
        x: e.x,
        z: e.z,
        layer: e.layer,
        ...(e.type === 'boundary' && ['N','E','S','W','NW','NE','SW','SE'].includes(e.boundarySide) ? { boundarySide: e.boundarySide } : {}),
        ...(e.type === 'dialogueTrigger' ? { dialogue: structuredClone(e.dialogue), dialogueId: e.dialogueId || e.id } : {}),
        ...(e.type === 'soldier' ? { route } : {}),
        ...(isSliderType(e.type) ? { track } : {}),
        ...(TYPE_MAP[e.type]?.hasRotation ? { rotation: e.rotation === 90 || e.type === 'door' && e.direction === 'v' ? 90 : 0 } : {}),
        ...(TYPE_MAP[e.type]?.hasFacing ? { facing: FACINGS.includes(e.facing) ? e.facing : 'S' } : {}),
        ...(TYPE_MAP[e.type]?.hasNumber
          ? {
              number:
                e.number === null || e.number === undefined || e.number === ''
                  ? null
                  : Number.isFinite(Number(e.number))
                    ? Math.max(0, Math.min(99, Math.floor(Number(e.number))))
                    : null,
            }
          : {}),
      };
    });
  // 激光发射方向必须平行于长边：旧关卡里垂直于长边的 facing 在这里统一纠正。
  for (const e of entities) {
    if (isLaserType(e.type)) e.facing = laserAxisFacing(e.rotation, e.facing, e.type);
    if (isSliderType(e.type)) e.track = normalizeTrack(e, e.track);
  }
  // 门 / 滑动组件高 3 格：自动补足需要的层数，再丢掉仍然放不下的实体。
  layerCount = Math.min(
    MAX_LAYERS,
    Math.max(layerCount, entities.reduce((m, e) => Math.max(m, e.layer + volumeHeight(e.type)), 1))
  );
  const kept = entities.filter(
    (e) =>
      e.layer + volumeHeight(e.type) <= layerCount &&
      reservedCells(e).every((c) => c.x >= 0 && c.z >= 0 && c.x < width && c.z < depth)
  );
  return {
    name: typeof data.name === 'string' && data.name ? data.name : 'untitled',
    limitTime: normalizeLimitTime(data.limitTime),
    cellSize: CELL_SIZE,
    grid: { width, depth },
    layerCount,
    entities: kept,
    ...(data.media ? { media: structuredClone(data.media) } : {}),
  };
}

/** 传送门编号独立于机关编号；每个编号必须恰好对应两个传送门。 */
export function portalPairErrors(scene) {
  const groups = new Map();
  const errors = [];
  for (const e of scene.entities.filter((entity) => entity.type === 'portal')) {
    if (!Number.isInteger(e.number) || e.number < 0 || e.number > 99) {
      errors.push(`传送门(${e.x},${e.z},L${e.layer + 1})需要设置配对编号（0~99）`);
      continue;
    }
    groups.set(e.number, (groups.get(e.number) || 0) + 1);
  }
  for (const [number, count] of groups) {
    if (count !== 2) errors.push(`传送门编号 ${number} 有 ${count} 个，需要恰好 2 个`);
  }
  return errors;
}

export function pairedEntities(scene, entity) {
  if (entity?.number == null) return [];
  const isTrigger = (type) => type === 'trigger' || type === 'laserTrigger';
  return scene.entities.filter((other) => {
    if (other.id === entity.id || other.number !== entity.number) return false;
    if (entity.type === 'portal') return other.type === 'portal';
    if (isTrigger(entity.type)) return other.type === 'door' || other.type === 'spring' || isSliderType(other.type);
    return TYPE_MAP[entity.type]?.hasNumber && isTrigger(other.type);
  });
}

/** 第一层地板外围一圈边界（含角）；已有组件和预留格保持不动。 */
export function addGroundBoundaries(scene) {
  const ground = scene.entities.filter(e => e.type === 'ground' && e.layer === 0);
  if (!ground.length) return scene;
  const candidates = new Map();
  for (const e of ground) for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
    if (!dx && !dz) continue;
    const x = e.x + dx, z = e.z + dz;
    if (x < 0 || z < 0 || x >= scene.grid.width || z >= scene.grid.depth) continue;
    candidates.set(`${x},${z}`, { x, z });
  }
  let next = scene;
  for (const { x, z } of candidates.values()) {
    // 包括 overlay 在内的已有物件都保留，避免边界封住机关或终点。
    if (entitiesAt(next, x, z, 0).length) continue;
    next = addEntity(next, 'boundary', x, z, 0).scene;
  }
  return updateBoundarySides(next);
}

/** 半格边界向相邻地板靠齐，转角在两轴上都缩为半格。 */
export function boundaryProfile(scene, entity) {
  const floor = (dx, dz) => scene.entities.some(e => e.type === 'ground' && e.layer === entity.layer && e.x === entity.x + dx && e.z === entity.z + dz);
  let side;
  const adjacent = [[0,1,'N'],[-1,0,'E'],[0,-1,'S'],[1,0,'W']].filter(([dx,dz]) => floor(dx,dz));
  if (adjacent.length) side = adjacent[0][2];
  else {
    const diagonal = [[1,1,'NW'],[-1,1,'NE'],[1,-1,'SW'],[-1,-1,'SE']].find(([dx,dz]) => floor(dx,dz));
    if (diagonal) side = diagonal[2];
  }
  if (!side) {
    const vertical = entity.z === 0 ? 'N' : entity.z === scene.grid.depth - 1 ? 'S' : '';
    const horizontal = entity.x === 0 ? 'W' : entity.x === scene.grid.width - 1 ? 'E' : '';
    side = vertical + horizontal || entity.boundarySide || 'N';
  }
  const corner = side.length === 2;
  const w = corner || side === 'E' || side === 'W' ? .5 : 1;
  const d = corner || side === 'N' || side === 'S' ? .5 : 1;
  return { side, corner, w, d, h: 1.2, offsetX: side.includes('W') ? .25 : side.includes('E') ? -.25 : 0, offsetZ: side.includes('N') ? .25 : side.includes('S') ? -.25 : 0 };
}
function updateBoundarySides(scene) {
  return { ...scene, entities: scene.entities.map(e => e.type === 'boundary' ? { ...e, boundarySide: boundaryProfile(scene,e).side } : e) };
}
