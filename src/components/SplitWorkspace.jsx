import { useRef, useState } from 'react';

const LAYOUT_KEY = 'puppetgo-level-editor-layout-v1';

export function readLayout() {
  try {
    const saved = JSON.parse(localStorage.getItem(LAYOUT_KEY));
    if (['2d', 'split', '3d'].includes(saved?.mode) && Number.isFinite(saved.ratio)) {
      return { mode: saved.mode, ratio: Math.max(10, Math.min(90, saved.ratio)) };
    }
  } catch { /* 使用默认布局 */ }
  return { mode: 'split', ratio: 50 };
}

export function saveLayout(mode, ratio) {
  try { localStorage.setItem(LAYOUT_KEY, JSON.stringify({ mode, ratio })); }
  catch { /* 布局仍可在当前页面使用 */ }
}

export default function SplitWorkspace({ mode, ratio, onRatioChange, onModeChange, left, right }) {
  const workspaceRef = useRef(null);
  const [resizing, setResizing] = useState(false);

  const resize = (event) => {
    const bounds = workspaceRef.current.getBoundingClientRect();
    const percent = (event.clientX - bounds.left) / bounds.width * 100;
    onRatioChange(Math.max(10, Math.min(90, percent)));
  };

  const finishResize = (event) => {
    setResizing(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <div ref={workspaceRef} className={`workspace mode-${mode}${resizing ? ' resizing' : ''}`}>
      <section className="workspace-pane pane-2d" hidden={mode === '3d'} style={mode === 'split' ? { flex: `0 0 calc(${ratio}% - 5px)` } : undefined}>
        <div className="pane-toolbar">
          <strong>2D 编辑</strong>
          <button onClick={() => onModeChange(mode === 'split' ? '2d' : 'split')}>
            {mode === 'split' ? '最大化 2D' : '恢复分屏'}
          </button>
        </div>
        {left}
      </section>
      <div
        className="workspace-divider"
        hidden={mode !== 'split'}
        role="separator"
        aria-label="调整 2D 与 3D 宽度"
        aria-orientation="vertical"
        aria-valuemin={10}
        aria-valuemax={90}
        aria-valuenow={Math.round(ratio)}
        tabIndex={mode === 'split' ? 0 : -1}
        title="拖动调整宽度，双击恢复各半；方向键微调"
        onPointerDown={event => {
          if (event.button !== 0) return;
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          setResizing(true);
          resize(event);
        }}
        onPointerMove={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) resize(event); }}
        onPointerUp={finishResize}
        onPointerCancel={finishResize}
        onLostPointerCapture={() => setResizing(false)}
        onDoubleClick={() => onRatioChange(50)}
        onKeyDown={event => {
          const value = { ArrowLeft: ratio - 2, ArrowRight: ratio + 2, Home: 10, End: 90 }[event.key];
          if (value == null) return;
          event.preventDefault();
          onRatioChange(Math.max(10, Math.min(90, value)));
        }}
      >
        <span />
      </div>
      <section className="workspace-pane pane-3d" hidden={mode === '2d'}>
        <div className="pane-toolbar">
          <strong>3D 实时预览</strong>
          <button onClick={() => onModeChange(mode === 'split' ? '3d' : 'split')}>
            {mode === 'split' ? '最大化 3D' : '恢复分屏'}
          </button>
        </div>
        <div className="viewport">
          {right}
          <div className="overlay">左键旋转 · 滚轮缩放 · 右键平移</div>
        </div>
      </section>
    </div>
  );
}
