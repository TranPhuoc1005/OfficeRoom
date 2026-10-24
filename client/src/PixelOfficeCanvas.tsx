import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { Agent, Task } from './types';
import {
  drawIllustratedSprite,
  getAgentVariant
} from './illustrated-sprites';
import { getFurnitureDef } from './furniture-data';
import type { PlacedFurniture, FurnitureDefinition } from './furniture-data';

export interface PixelOfficeCanvasProps {
  agents: Agent[];
  tasks: Task[];
  selectedAgentId: string | null;
  onSelectAgent: (agent: Agent) => void;
  isMotionPaused?: boolean;
  isDecorating?: boolean;
  furniture: PlacedFurniture[];
  onUpdateFurniture?: (newFurniture: PlacedFurniture[]) => void;
  selectedCatalogItem?: FurnitureDefinition | null;
  onSelectCatalogItem?: (item: FurnitureDefinition | null) => void;
  selectedPlacedItem?: PlacedFurniture | null;
  onSelectPlacedItem?: (item: PlacedFurniture | null) => void;
  isDeleteMode?: boolean;
  onDeletePlacedItem?: (id: string) => void;
}

interface Point {
  x: number;
  y: number;
}

interface CozyActor {
  agent: Agent;
  index: number;
  home: Point;
  x: number;
  y: number;
  dir: 'down' | 'up' | 'left' | 'right';
  wait: number;
  path: Point[];
  phase: number;
  status: 'idle' | 'doing' | 'review' | 'attention';
  isMoving: boolean;
  walkFrame: number;
}

const HOMES: Point[] = [
  { x: 640, y: 429 },  // Desk 1 (top-left)
  { x: 1030, y: 429 }, // Desk 2 (top-right)
  { x: 640, y: 657 },  // Desk 3 (bottom-left)
  { x: 1030, y: 657 }, // Desk 4 (bottom-right)
  { x: 440, y: 725 },  // Left library / plant zone
  { x: 1200, y: 725 }, // Right lounge zone
  { x: 825, y: 730 },  // Central meeting rug
  { x: 1000, y: 760 }  // Front collaborative table
];

const STEP = 16;

export const PixelOfficeCanvas: React.FC<PixelOfficeCanvasProps> = ({
  agents,
  tasks,
  selectedAgentId,
  onSelectAgent,
  isMotionPaused = false,
  isDecorating = false,
  furniture,
  onUpdateFurniture,
  selectedCatalogItem = null,
  onSelectCatalogItem,
  selectedPlacedItem = null,
  onSelectPlacedItem,
  isDeleteMode = false,
  onDeletePlacedItem
}) => {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const decorCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [viewportDim, setViewportDim] = useState<{
    vw: number;
    vh: number;
    cover: number;
    offsetX: number;
    offsetY: number;
  }>({
    vw: 1200,
    vh: 800,
    cover: 1,
    offsetX: 0,
    offsetY: 0
  });

  const actorsRef = useRef<Map<string, CozyActor>>(new Map());
  const [actorsState, setActorsState] = useState<CozyActor[]>([]);

  // Drag and hover state for decoration mode
  const [hoverGrid, setHoverGrid] = useState<{ gx: number; gy: number; valid: boolean } | null>(null);
  const [hoveredDeleteItem, setHoveredDeleteItem] = useState<PlacedFurniture | null>(null);
  const [draggingItem, setDraggingItem] = useState<{
    item: PlacedFurniture;
    startGx: number;
    startGy: number;
    curGx: number;
    curGy: number;
  } | null>(null);

  // Keyboard shortcut: Delete or Backspace to remove selected item
  useEffect(() => {
    if (!isDecorating || !selectedPlacedItem) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        onDeletePlacedItem?.(selectedPlacedItem.id);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDecorating, selectedPlacedItem, onDeletePlacedItem]);

  // 1. Calculate Viewport & Cover Mapping (ratio 1672 x 941)
  const updateDimensions = useCallback(() => {
    if (!viewportRef.current) return;
    const r = viewportRef.current.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;

    const vw = r.width;
    const vh = r.height;
    const cover = Math.max(vw / 1672, vh / 941);
    const offsetX = (vw - 1672 * cover) / 2;
    const offsetY = (vh - 941 * cover) / 2;

    setViewportDim({ vw, vh, cover, offsetX, offsetY });
  }, []);

  useEffect(() => {
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [updateDimensions]);

  // 2. Synchronize Actors with agents & task status
  useEffect(() => {
    const currentMap = actorsRef.current;
    const newMap = new Map<string, CozyActor>();

    agents.forEach((ag, idx) => {
      const home = HOMES[idx % HOMES.length];
      const existing = currentMap.get(ag.id);

      // Determine real task status from runtime/backend
      const agTasks = tasks.filter((t) => t.agent_id === ag.id);
      const isDoing =
        ag.isBusy ||
        agTasks.some(
          (t) =>
            t.status === 'RUNNING' ||
            t.status === 'running' ||
            t.status === 'doing' ||
            t.status === 'queued'
        );
      const hasAttention = agTasks.some(
        (t) => t.status === 'INTERRUPTED' || t.status === 'ERROR' || t.status === 'error'
      );
      const isReview = agTasks.some((t) => t.status === 'review');

      let status: 'idle' | 'doing' | 'review' | 'attention' = 'idle';
      if (isDoing) status = 'doing';
      else if (hasAttention) status = 'attention';
      else if (isReview) status = 'review';

      const actor: CozyActor = {
        agent: ag,
        index: idx,
        home,
        x: existing?.x ?? home.x,
        y: existing?.y ?? home.y,
        dir: existing?.dir ?? (isDoing ? 'up' : 'down'),
        wait: existing?.wait ?? (5 + idx * 3),
        path: existing?.path ? [...existing.path] : [],
        phase: existing?.phase ?? 0,
        status,
        isMoving: existing?.isMoving ?? false,
        walkFrame: existing?.walkFrame ?? 0
      };

      newMap.set(ag.id, actor);
    });

    actorsRef.current = newMap;
    setActorsState(Array.from(newMap.values()));
  }, [agents, tasks]);

  // 3. Path calculation for idle wander
  const pathFor = (a: CozyActor): Point[] => {
    const h = a.home;
    if (a.phase++ % 2 === 0) {
      return [
        { x: 825, y: a.y < 500 ? 432 : 680 },
        { x: 825, y: 718 },
        { x: a.index % 2 ? 1240 : 400, y: 718 }
      ];
    }
    return [
      { x: 825, y: 718 },
      { x: 825, y: h.y < 500 ? 432 : 680 },
      { x: h.x, y: h.y }
    ];
  };

  // 4. Animation loop: handles walking gait, wander, seat at desk when doing tasks
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000 || 0, 0.08);
      lastTime = now;

      if (!isMotionPaused && !document.hidden) {
        let hasChanges = false;

        for (const a of actorsRef.current.values()) {
          if (a.status === 'doing') {
            // Seated at desk facing up
            if (a.x !== a.home.x || a.y !== a.home.y || a.dir !== 'up' || a.isMoving) {
              a.x = a.home.x;
              a.y = a.home.y;
              a.path = [];
              a.dir = 'up';
              a.isMoving = false;
              hasChanges = true;
            }
          } else if (a.wait > 0) {
            a.wait -= dt;
            if (a.dir !== 'down') {
              a.dir = 'down';
              hasChanges = true;
            }
            if (a.isMoving) {
              a.isMoving = false;
              hasChanges = true;
            }
          } else {
            if (a.path.length === 0) {
              a.path = pathFor(a);
            }
            const target = a.path[0];
            if (target) {
              const dx = target.x - a.x;
              const dy = target.y - a.y;
              const dist = Math.hypot(dx, dy);
              const speed = 46 + (a.index % 3) * 6;

              if (dist < speed * dt) {
                a.x = target.x;
                a.y = target.y;
                a.path.shift();
                if (a.path.length === 0) {
                  a.wait = 7 + Math.random() * 8;
                  a.dir = 'down';
                  a.isMoving = false;
                }
                hasChanges = true;
              } else {
                a.isMoving = true;
                a.x += (dx / dist) * speed * dt;
                a.y += (dy / dist) * speed * dt;
                a.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
                a.walkFrame = Math.floor(now / 220) % 2;
                hasChanges = true;
              }
            }
          }
        }

        if (hasChanges) {
          setActorsState(Array.from(actorsRef.current.values()));
        }
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isMotionPaused]);

  // 5. Placed Furniture Layer (renders on top of the interior artwork if user added items)
  useEffect(() => {
    const canvas = decorCanvasRef.current;
    if (!canvas) return;
    const g = canvas.getContext('2d');
    if (!g) return;
    g.clearRect(0, 0, canvas.width, canvas.height);

    if (furniture.length === 0) return;

    const { cover, offsetX, offsetY } = viewportDim;

    g.save();
    g.translate(offsetX, offsetY);
    g.scale(cover, cover);

    // Sort furniture by depth
    const sorted = [...furniture].sort((a, b) => a.gy - b.gy);

    sorted.forEach((item) => {
      const def = getFurnitureDef(item.type);
      if (!def) return;
      const px = item.gx * STEP;
      const py = item.gy * STEP;
      const pw = def.w * STEP;
      const ph = def.h * STEP;

      let assignedAgentName: string | undefined;
      let isWorking = false;
      if (item.assignedAgentId) {
        const ag = agents.find((a) => a.id === item.assignedAgentId);
        if (ag) {
          assignedAgentName = ag.name;
          isWorking = ag.isBusy || tasks.some(
            (t) => t.agent_id === ag.id && (t.status === 'RUNNING' || t.status === 'doing')
          );
        }
      }

      def.draw(g, px, py, pw, ph, item.variant, {
        assignedAgentName,
        isWorking
      });

      // Highlight selected placed item in decorate mode
      if (isDecorating && selectedPlacedItem?.id === item.id) {
        g.save();
        g.strokeStyle = '#eab308';
        g.lineWidth = 2;
        g.setLineDash([4, 4]);
        g.strokeRect(px - 2, py - 2, pw + 4, ph + 4);
        g.restore();
      }
    });

    g.restore();
  }, [furniture, agents, tasks, isDecorating, selectedPlacedItem, viewportDim]);

  // 6. Decoration Grid & Hover Overlay
  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const g = canvas.getContext('2d');
    if (!g) return;
    g.clearRect(0, 0, canvas.width, canvas.height);

    if (!isDecorating) return;

    const { cover, offsetX, offsetY } = viewportDim;

    g.save();
    g.translate(offsetX, offsetY);
    g.scale(cover, cover);

    // Faint overlay grid
    g.strokeStyle = 'rgba(120, 100, 70, 0.15)';
    g.lineWidth = 1;

    for (let x = 0; x <= 1672; x += STEP) {
      g.beginPath();
      g.moveTo(x + 0.5, 0);
      g.lineTo(x + 0.5, 941);
      g.stroke();
    }
    for (let y = 0; y <= 941; y += STEP) {
      g.beginPath();
      g.moveTo(0, y + 0.5);
      g.lineTo(1672, y + 0.5);
      g.stroke();
    }

    // Hover preview
    if (!isDeleteMode && hoverGrid && (selectedCatalogItem || draggingItem)) {
      const def = selectedCatalogItem || (draggingItem ? getFurnitureDef(draggingItem.item.type) : null);
      if (def) {
        const px = hoverGrid.gx * STEP;
        const py = hoverGrid.gy * STEP;
        const pw = def.w * STEP;
        const ph = def.h * STEP;

        g.fillStyle = hoverGrid.valid ? 'rgba(79, 112, 71, 0.4)' : 'rgba(220, 38, 38, 0.45)';
        g.strokeStyle = hoverGrid.valid ? '#4f7047' : '#dc2626';
        g.lineWidth = 2;
        g.fillRect(px, py, pw, ph);
        g.strokeRect(px + 1, py + 1, pw - 2, ph - 2);
        def.draw(g, px, py, pw, ph);
      }
    }

    // Delete mode highlight
    if (isDeleteMode && hoveredDeleteItem) {
      const def = getFurnitureDef(hoveredDeleteItem.type);
      if (def) {
        const px = hoveredDeleteItem.gx * STEP;
        const py = hoveredDeleteItem.gy * STEP;
        const pw = def.w * STEP;
        const ph = def.h * STEP;

        g.fillStyle = 'rgba(239, 68, 68, 0.45)';
        g.strokeStyle = '#ef4444';
        g.lineWidth = 2;
        g.setLineDash([4, 4]);
        g.fillRect(px, py, pw, ph);
        g.strokeRect(px, py, pw, ph);
      }
    }

    g.restore();
  }, [
    isDecorating,
    isDeleteMode,
    hoverGrid,
    selectedCatalogItem,
    draggingItem,
    hoveredDeleteItem,
    viewportDim
  ]);

  // Decoration Mouse Events
  const handlePointerMove = (e: React.MouseEvent) => {
    if (!isDecorating || !viewportRef.current) return;
    const rect = viewportRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const { cover, offsetX, offsetY } = viewportDim;
    const sceneX = (mx - offsetX) / cover;
    const sceneY = (my - offsetY) / cover;

    const gx = Math.floor(sceneX / STEP);
    const gy = Math.floor(sceneY / STEP);

    if (isDeleteMode) {
      const found = furniture.find((f) => {
        const def = getFurnitureDef(f.type);
        if (!def) return false;
        return gx >= f.gx && gx < f.gx + def.w && gy >= f.gy && gy < f.gy + def.h;
      });
      setHoveredDeleteItem(found || null);
      return;
    }

    if (selectedCatalogItem || draggingItem) {
      const def = selectedCatalogItem || (draggingItem ? getFurnitureDef(draggingItem.item.type) : null);
      const w = def?.w || 2;
      const h = def?.h || 2;
      const valid = gx >= 0 && gx + w <= Math.floor(1672 / STEP) && gy >= 0 && gy + h <= Math.floor(941 / STEP);
      setHoverGrid({ gx, gy, valid });

      if (draggingItem) {
        setDraggingItem((prev) => (prev ? { ...prev, curGx: gx, curGy: gy } : null));
      }
    }
  };

  const handlePointerDown = (e: React.MouseEvent) => {
    if (!isDecorating || !viewportRef.current) return;
    const rect = viewportRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const { cover, offsetX, offsetY } = viewportDim;
    const sceneX = (mx - offsetX) / cover;
    const sceneY = (my - offsetY) / cover;
    const gx = Math.floor(sceneX / STEP);
    const gy = Math.floor(sceneY / STEP);

    if (isDeleteMode) {
      const found = furniture.find((f) => {
        const def = getFurnitureDef(f.type);
        if (!def) return false;
        return gx >= f.gx && gx < f.gx + def.w && gy >= f.gy && gy < f.gy + def.h;
      });
      if (found) {
        onDeletePlacedItem?.(found.id);
        setHoveredDeleteItem(null);
      }
      return;
    }

    // Placing new item from catalog
    if (selectedCatalogItem && hoverGrid?.valid) {
      const newItem: PlacedFurniture = {
        id: `fur-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: selectedCatalogItem.type,
        gx: hoverGrid.gx,
        gy: hoverGrid.gy,
        variant: 0
      };
      onUpdateFurniture?.([...furniture, newItem]);
      onSelectCatalogItem?.(null);
      onSelectPlacedItem?.(newItem);
      setHoverGrid(null);
      return;
    }

    // Selecting or starting drag on placed item
    const clickedItem = [...furniture].reverse().find((f) => {
      const def = getFurnitureDef(f.type);
      if (!def) return false;
      return gx >= f.gx && gx < f.gx + def.w && gy >= f.gy && gy < f.gy + def.h;
    });

    if (clickedItem) {
      onSelectPlacedItem?.(clickedItem);
      setDraggingItem({
        item: clickedItem,
        startGx: clickedItem.gx,
        startGy: clickedItem.gy,
        curGx: clickedItem.gx,
        curGy: clickedItem.gy
      });
    } else {
      onSelectPlacedItem?.(null);
    }
  };

  const handlePointerUp = () => {
    if (draggingItem) {
      if (
        hoverGrid?.valid &&
        (draggingItem.curGx !== draggingItem.startGx || draggingItem.curGy !== draggingItem.startGy)
      ) {
        const updated = furniture.map((f) =>
          f.id === draggingItem.item.id
            ? { ...f, gx: draggingItem.curGx, gy: draggingItem.curGy }
            : f
        );
        onUpdateFurniture?.(updated);
      }
      setDraggingItem(null);
      setHoverGrid(null);
    }
  };

  const { vw, vh, cover, offsetX, offsetY } = viewportDim;

  return (
    <div
      ref={viewportRef}
      className={`world-viewport ${isDecorating ? 'mode-decorating' : ''}`}
      aria-label="Văn phòng pixel tương tác"
      onMouseMove={handlePointerMove}
      onMouseDown={handlePointerDown}
      onMouseUp={handlePointerUp}
    >
      <div className="office pixel-room">
        {/* Layer 1: Cozy Interior PNG Artwork */}
        <div
          className="office-art"
          style={{
            backgroundSize: `${1672 * cover}px ${941 * cover}px`,
            backgroundPosition: `${offsetX}px ${offsetY}px`
          }}
        />

        {/* Layer 2: Warm Afternoon Sunlight Vignette */}
        <div className="office-warmth" />

        {/* Layer 3: Placed Interactive Furniture */}
        <canvas
          ref={decorCanvasRef}
          width={vw}
          height={vh}
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 10
          }}
          aria-hidden="true"
        />

        {/* Layer 4: Decoration Grid & Placement Overlay */}
        <canvas
          ref={overlayCanvasRef}
          width={vw}
          height={vh}
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 15
          }}
          aria-hidden="true"
        />

        {/* Layer 5: Illustrated Chibi Actors */}
        <div
          className="sprite-world"
          style={{ pointerEvents: isDecorating ? 'none' : 'auto', zIndex: 12 }}
        >
          {actorsState.map((actor) => {
            const isSelected = selectedAgentId === actor.agent.id;

            // Compute responsive position on screen
            let ax = actor.x * cover + offsetX;
            let ay = actor.y * cover + offsetY;
            const s = vw < 650 ? 88 : Math.max(105, Math.min(145, 118 * cover));
            ax = Math.max(s * 0.5, Math.min(vw - s * 0.5, ax));
            ay = Math.max(160, Math.min(vh - 175, ay));

            const variant = getAgentVariant(actor.agent);

            return (
              <button
                key={actor.agent.id}
                type="button"
                className={`cozy-actor ${isSelected ? 'selected' : ''} ${actor.isMoving ? 'walking' : ''}`}
                style={{
                  left: `${ax}px`,
                  top: `${ay}px`,
                  width: `${s}px`,
                  height: `${s}px`,
                  zIndex: Math.round(actor.y)
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isDecorating) onSelectAgent(actor.agent);
                }}
                aria-label={`Giao việc cho ${actor.agent.name}`}
                title={`${actor.agent.name} — ${actor.agent.role}`}
              >
                {/* Status Indicator Dot / Overhead Badge */}
                {actor.status === 'doing' && (
                  <span className="actor-state" title="Đang thực thi công việc">
                    •••
                  </span>
                )}
                {actor.status === 'attention' && (
                  <span
                    className="actor-state"
                    style={{ color: '#dc2626', borderColor: '#ef4444' }}
                    title="Cần bạn xử lý (!)"
                  >
                    !
                  </span>
                )}
                {actor.status === 'review' && (
                  <span
                    className="actor-state"
                    style={{ color: '#d97706', borderColor: '#f59e0b' }}
                    title="Chờ duyệt kết quả (✓)"
                  >
                    ✓
                  </span>
                )}

                {/* Illustrated Sprite Canvas */}
                <ActorSpriteRenderer
                  variant={variant}
                  dir={actor.dir}
                  walkFrame={actor.walkFrame}
                  isWorking={actor.status === 'doing'}
                />

                {/* Name Tag */}
                <span className="actor-name">{actor.agent.name}</span>
              </button>
            );
          })}
        </div>

        {/* Floating Action HUD on Selected Placed Item in Decoration Mode */}
        {isDecorating && selectedPlacedItem && !isDeleteMode && (
          <div
            className="furniture-floating-hud"
            style={{
              position: 'absolute',
              left: `${selectedPlacedItem.gx * STEP * cover + offsetX + (((getFurnitureDef(selectedPlacedItem.type)?.w || 2) * STEP) / 2) * cover}px`,
              top: `${Math.max(8, selectedPlacedItem.gy * STEP * cover + offsetY - 36)}px`,
              transform: 'translate(-50%, 0)',
              zIndex: 120
            }}
          >
            <div className="floating-hud-content">
              <span className="hud-label">
                {getFurnitureDef(selectedPlacedItem.type)?.name || selectedPlacedItem.type}
              </span>
              <button
                type="button"
                className="hud-delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeletePlacedItem?.(selectedPlacedItem.id);
                }}
                title="Xóa món đồ này khỏi văn phòng (hoặc phím Delete)"
              >
                🗑️ Xóa đồ
              </button>
              <button
                type="button"
                className="hud-close-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectPlacedItem?.(null);
                }}
                title="Bỏ chọn"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Canvas Subcomponent for rendering individual Cozy Illustrated Actor
const ActorSpriteRenderer: React.FC<{
  variant: number;
  dir: string;
  walkFrame: number;
  isWorking: boolean;
}> = ({ variant, dir, walkFrame, isWorking }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    drawIllustratedSprite(canvasRef.current, {
      variant,
      direction: dir,
      frame: walkFrame,
      isWorking
    });
  }, [variant, dir, walkFrame, isWorking]);

  return <canvas ref={canvasRef} width={256} height={256} aria-hidden="true" />;
};
