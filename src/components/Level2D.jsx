import { useRef } from 'react';
import {
  TYPE_MAP,
  boundaryProfile,
  mechanismColor,
  FACING_ARROW,
  occupiedCells,
  occupiedVolumes,
  hasSupportBelow,
  isLaserType,
  isSliderType,
  laserMuzzleCell,
  reservingEntitiesAt,
} from '../level.js';

const PITCH = 46; // 44px 格子 + 2px 间距

export default function Level2D({
  scene,
  layer,
  onClick,
  onSelectEntity,
  onRightClick,
  showBelow,
  selectedId,
  draggingId,
  onDragStart,
  onDragEnter,
  onDragEnd,
}) {
  const { width, depth } = scene.grid;
  const byKey = new Map();
  const belowByKey = new Map();
  for (const e of scene.entities) {
    for (const c of occupiedVolumes(e)) {
      if (c.layer !== layer) continue;
      const key = `${c.x},${c.z}`;
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key).push(e);
    }
  }
  if (showBelow) {
    const belows = scene.entities
      .filter((e) => occupiedVolumes(e).some((c) => c.layer === layer - 1))
      .sort(
        (a, b) =>
          (TYPE_MAP[a.type]?.overlay ? -1 : 0) - (TYPE_MAP[b.type]?.overlay ? -1 : 0)
      );
    for (const e of belows) {
      for (const c of occupiedVolumes(e)) {
        if (c.layer === layer - 1) belowByKey.set(`${c.x},${c.z}`, e);
      }
    }
  }

  // 激光炮口格（占地格中沿发射方向最靠前的一格），用于把方向箭头标在发射端并突出显示。
  const muzzleKeys = new Map();
  const trackOwnerKeys = new Map();
  for (const e of scene.entities) {
    if (isLaserType(e.type) && e.layer === layer) {
      const m = laserMuzzleCell(e);
      muzzleKeys.set(e.id, `${m.x},${m.z}`);
    }
    if (isSliderType(e.type) && Array.isArray(e.track)) {
      for (const p of e.track) trackOwnerKeys.set(`${e.layer}:${p.x},${p.z}`, e.id);
    }
  }

  const cells = [];
  for (let z = 0; z < depth; z++) {
    for (let x = 0; x < width; x++) {
      const list = byKey.get(`${x},${z}`) || [];
      const main = list.find((e) => !TYPE_MAP[e.type]?.overlay) || null;
      const overlays = list.filter((e) => TYPE_MAP[e.type]?.overlay);
      const info = main ? TYPE_MAP[main.type] : null;
      const boundary = main?.type === 'boundary' ? boundaryProfile(scene, main) : null;
      const below = belowByKey.get(`${x},${z}`);
      const belowInfo = below ? TYPE_MAP[below.type] : null;
      const unsupported = Boolean(main && info?.movable && !hasSupportBelow(scene, x, z, layer));
      const anchor = Boolean(main && main.layer === layer && main.x === x && main.z === z);
      const selected = Boolean(
        selectedId && list.some((e) => e.id === selectedId)
      );
      const spanPartner = Boolean(main && !anchor);
      const fromBelow = Boolean(main && main.layer < layer);
      const isMuzzle = Boolean(main && muzzleKeys.get(main.id) === `${x},${z}`);
      const onTrack = Boolean(trackOwnerKeys.get(`${layer}:${x},${z}`));
      const reservations = main || overlays.length ? [] : reservingEntitiesAt(scene, x, z, layer);
      const doorSlot = reservations.some((e) => e.type === 'door');
      const numbered = list.find((e) => TYPE_MAP[e.type]?.hasNumber && e.number != null);
      const extra = [
        main ? TYPE_MAP[main.type]?.label || '' : '',
        overlays.length ? '机关' : '',
        fromBelow ? `${main?.layer + 1} 层起跨层组件` : '',
        onTrack ? '滑动轨道' : '',
        doorSlot ? '门的开门位（预留，不能放置）' : '',
      ]
        .filter(Boolean)
        .join(' / ');
      cells.push(
        <button
          key={`${x}-${z}`}
          type="button"
          data-grid-cell
          data-x={x}
          data-z={z}
          className={`cell ${(x + z) % 2 === 0 ? 'even' : 'odd'} ${list.length ? 'filled' : ''} ${unsupported ? 'unsupported' : ''} ${selected ? 'selected' : ''} ${spanPartner ? 'span-partner' : ''} ${fromBelow ? 'from-below' : ''} ${isMuzzle ? 'muzzle' : ''} ${onTrack ? 'on-track' : ''} ${doorSlot ? 'door-slot' : ''} ${main && main.id === draggingId ? 'dragging' : ''}`}
          onClick={() => onClick(x, z)}
          onContextMenu={(ev) => {
            ev.preventDefault();
            onRightClick(x, z);
          }}
          title={`(${x}, ${z})${extra ? ` ${extra}` : ''}${unsupported ? ' - 下层镂空，无支撑！' : ''}`}
        >
          {below && belowInfo && (
            <span className="glyph ghost" style={{ background: mechanismColor(scene, below), color: belowInfo.textColor || '#fff' }}>
              {belowInfo.glyph}
            </span>
          )}
          {overlays.map((o) => {
            const oi = TYPE_MAP[o.type];
            return main ? (
              <span
                key={o.id}
                className="glyph overlay-mini"
                data-entity-id={o.id}
                onClick={ev=>{ev.stopPropagation();onSelectEntity?.(o.id);}}
                style={{ background: mechanismColor(scene, o), color: oi.textColor || '#fff' }}
              >
                {oi.glyph}
              </span>
            ) : (
              <span
                key={o.id}
                data-entity-id={o.id}
                onClick={ev=>{ev.stopPropagation();onSelectEntity?.(o.id);}}
                className={`glyph${oi.translucent ? ' translucent' : ''}`}
                style={{ background: mechanismColor(scene, o), color: oi.textColor || '#fff' }}
              >
                {oi.glyph}
              </span>
            );
          })}
          {boundary && (
            <span className="boundary-fill" aria-hidden="true" style={{
              background: info.color,
              width: `${boundary.w * 100}%`,
              height: `${boundary.d * 100}%`,
              left: `${(0.5 + boundary.offsetX - boundary.w / 2) * 100}%`,
              top: `${(0.5 + boundary.offsetZ - boundary.d / 2) * 100}%`,
            }} />
          )}
          {main && info && (
            <span
              className={`glyph${boundary ? ' boundary-label' : ''}${info.translucent ? ' translucent' : ''}${spanPartner ? ' upper' : ''}`}
              style={{ background: boundary ? 'transparent' : mechanismColor(scene, main), color: info.textColor || '#fff' }}
            >
              {info.glyph}
            </span>
          )}
          {!main && reservations.length > 0 && (
            <span
              className={`glyph slot ${doorSlot ? 'door' : 'track'}`}
              title="预留格：不能放置其他组件"
            >
              {doorSlot ? '开' : '轨'}
            </span>
          )}
          {main && info?.hasFacing && (!isLaserType(main.type) || isMuzzle) && (
            <span className="face-badge">{FACING_ARROW[main.facing] || '↓'}</span>
          )}
          {numbered && (
            <span className="num-badge">{numbered.number}</span>
          )}
          {unsupported && <span className="warn-badge">!</span>}
        </button>
      );
    }
  }

  const routes = [];
  for (const e of scene.entities) {
    const isTrack = isSliderType(e.type);
    if (e.layer !== layer || (e.type !== 'soldier' && !isTrack)) continue;
    const points = [{ x: e.x, z: e.z }, ...(isTrack ? e.track || [] : e.route || [])];
    if (points.length < 2) continue;
    routes.push({
      isTrack,
      start: { x: e.x, z: e.z },
      points: points.map((p) => ({
        x: p.x * PITCH + 22,
        z: p.z * PITCH + 22,
        wait: p.wait || 0,
      })),
    });
  }
  const svgW = width * PITCH - 2;
  const svgH = depth * PITCH - 2;
  const gridRef = useRef(null);
  const dragPointerIdRef = useRef(null);
  const draggingRef = useRef(false);
  const dragOriginRef = useRef(null);
  const movedRef = useRef(false);
  const suppressClickRef = useRef(false);

  const cellFromPointer = (ev) => {
    const element = document.elementFromPoint(ev.clientX, ev.clientY);
    const cell = element?.closest?.('[data-grid-cell]');
    if (!cell) return null;
    return { x: Number(cell.dataset.x), z: Number(cell.dataset.z) };
  };

  const handlePointerDown = (ev) => {
    suppressClickRef.current = false;
    if (ev.button !== 0) return;
    const cell = ev.target.closest?.('[data-grid-cell]');
    if (!cell) return;

    const x = Number(cell.dataset.x);
    const z = Number(cell.dataset.z);
    const list = byKey.get(`${x},${z}`) || [];
    const hitId=ev.target.closest?.('[data-entity-id]')?.dataset.entityId;
    const entity = list.find(e=>e.id===hitId) || list.find((e) => !TYPE_MAP[e.type]?.overlay) || list[0];
    if (!entity) return;

    dragOriginRef.current = { x: ev.clientX, y: ev.clientY };
    if (onDragStart?.(entity.id) === false) return;
    draggingRef.current = true;
    movedRef.current = false;
    dragPointerIdRef.current = ev.pointerId;
  };

  const handlePointerMove = (ev) => {
    if (!draggingRef.current) return;
    const origin = dragOriginRef.current;
    if (origin && Math.hypot(ev.clientX - origin.x, ev.clientY - origin.y) < 6) return;
    movedRef.current = true;
    if (!gridRef.current?.hasPointerCapture(ev.pointerId)) gridRef.current?.setPointerCapture(ev.pointerId);
    const cell = cellFromPointer(ev);
    if (!cell) return;
    onDragEnter?.(cell.x, cell.z);
  };

  const handlePointerUp = (ev) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    suppressClickRef.current = movedRef.current;
    if (dragPointerIdRef.current !== null && gridRef.current?.hasPointerCapture(dragPointerIdRef.current)) {
      gridRef.current?.releasePointerCapture?.(dragPointerIdRef.current);
    }
    dragPointerIdRef.current = null;
    onDragEnd?.();
  };

  return (
    <div className="grid-wrap">
      <div className="grid-relative">
        <div
          ref={gridRef}
          className="grid"
          style={{ gridTemplateColumns: `repeat(${width}, 44px)` }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onClickCapture={ev => {
            if (suppressClickRef.current) { ev.stopPropagation(); suppressClickRef.current = false; }
          }}
        >
          {cells}
        </div>
        {routes.length > 0 && (
          <svg
            className="route-overlay"
            width={svgW}
            height={svgH}
            viewBox={`0 0 ${svgW} ${svgH}`}
          >
            <defs>
              <marker
                id="route-arrow"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M0,0 L10,5 L0,10 z" fill="#ef4444" />
              </marker>
              <marker
                id="track-arrow"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M0,0 L10,5 L0,10 z" fill="#0ea5e9" />
              </marker>
            </defs>
            {routes.map(({ points, isTrack }, ri) =>
              points.slice(0, -1).map((a, i) => (
                <line
                  key={`${ri}-${i}`}
                  x1={a.x}
                  y1={a.z}
                  x2={points[i + 1].x}
                  y2={points[i + 1].z}
                  stroke={isTrack ? '#0ea5e9' : '#ef4444'}
                  strokeWidth={2.5}
                  markerEnd={isTrack ? 'url(#track-arrow)' : 'url(#route-arrow)'}
                />
              ))
            )}
            {routes.map(({ points, isTrack }, ri) =>
              points.map((p, i) => (
                <circle
                  key={`${ri}-${i}`}
                  cx={p.x}
                  cy={p.z}
                  r={4}
                  fill="#fff"
                  stroke={isTrack ? '#0ea5e9' : '#ef4444'}
                  strokeWidth={1.5}
                />
              ))
            )}
            {routes.map(({ points }, ri) =>
              points
                .filter((p) => p.wait > 0)
                .map((p, i) => (
                  <text
                    key={`w-${ri}-${i}`}
                    x={p.x}
                    y={p.z + 18}
                    fontSize={10}
                    fill="#facc15"
                    textAnchor="middle"
                  >
                    {p.wait}s
                  </text>
                ))
            )}
          </svg>
        )}
      </div>
    </div>
  );
}
