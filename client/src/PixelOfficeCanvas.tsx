import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { Agent, Task } from './types';
import { drawAgentSprite } from './agent-sprite';
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

interface Obstacle {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Point {
  x: number;
  y: number;
}

interface Actor {
  agent: Agent;
  index: number;
  home: Point;
  x: number;
  y: number;
  dir: 'down' | 'up' | 'left' | 'right';
  wait: number;
  path: Point[];
  destination?: number;
  busy: boolean;
  currentRestStop?: string | null;
}

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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);

  const [worldDim, setWorldDim] = useState<{ W: number; H: number; scale: number }>({
    W: 1120,
    H: 700,
    scale: 1
  });

  const actorsRef = useRef<Map<string, Actor>>(new Map());
  const obstaclesRef = useRef<Obstacle[]>([]);
  const lastTimeRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const [, setFrameTick] = useState(0);

  // Drag and hover state for decoration
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

  // 1. Check if placement is valid (inside room boundaries and not overlapping other obstacles)
  const isPlacementValid = useCallback(
    (
      gx: number,
      gy: number,
      w: number,
      h: number,
      ignoreItemId?: string,
      category?: string
    ): boolean => {
      const maxGx = Math.max(68, Math.floor(worldDim.W / STEP) - 1);
      const maxGy = Math.max(42, Math.floor(worldDim.H / STEP) - 1);

      // Wall decor category: placed on the upper wall (gy: 1 to 5)
      if (category === 'decor') {
        return gx >= 1 && gx + w <= maxGx && gy >= 1 && gy <= 5;
      }

      // Floor furniture: Wall ends at gy = 5 (y = 80px), bottom margin at maxGy
      if (gx < 1 || gx + w > maxGx || gy < 5 || gy + h > maxGy) {
        return false;
      }

      // Overlap check against other obstacles
      for (const item of furniture) {
        if (ignoreItemId && item.id === ignoreItemId) continue;
        const def = getFurnitureDef(item.type);
        if (!def) continue;

        // Rugs can be placed anywhere and do not block other furniture
        if (!def.isObstacle || category === 'rug') continue;

        const overlap =
          gx < item.gx + def.w &&
          gx + w > item.gx &&
          gy < item.gy + def.h &&
          gy + h > item.gy;

        if (overlap) {
          return false;
        }
      }

      return true;
    },
    [furniture, worldDim.W, worldDim.H]
  );

  // 2. Render Main Canvas (Floor, Walls, Windows, Rugs, and Placed Furniture)
  const renderRoom = useCallback(
    (W: number, H: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const g = canvas.getContext('2d');
      if (!g) return;
      g.imageSmoothingEnabled = false;

      // Rebuild obstacle collision list from placed items
      const newObstacles: Obstacle[] = [];

      g.clearRect(0, 0, W, H);

      const rect = (x: number, y: number, w: number, h: number, c: string) => {
        g.fillStyle = c;
        g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
      };

      // A. Parquet wooden floor fills viewport completely
      rect(0, 0, W, H, '#cfb591');
      for (let y = 87; y < H; y += 18) {
        rect(0, y, W, 1, '#baa27d');
        for (let x = (Math.floor(y / 18) % 2) * 40; x < W; x += 80) {
          rect(x, y, 1, 18, '#baa27d');
          if (x + 29 < W) rect(x + 13, y + 5, 16, 1, '#d8bf98');
        }
      }

      // B. Top wall & windows
      rect(0, 0, W, 86, '#d8d9bb');
      rect(0, 0, W, 4, '#f5ebd0');
      rect(0, 81, W, 9, '#a98a61');
      rect(0, 81, W, 3, '#e5cba0');

      for (let x = 34; x + 135 < W; x += 180) {
        rect(x, 24, 136, 49, '#9ebaaa');
        rect(x + 4, 28, 128, 38, '#bfd5bf');
        rect(x + 8, 32, 26, 4, '#e1ebcd');
        rect(x + 66, 25, 4, 46, '#ece9cd');
        rect(x + 2, 66, 132, 5, '#dfe8ca');
        rect(x - 4, 73, 144, 7, '#b89a6d');
      }

      // C. LAYER 1: Rugs (drawn underneath furniture)
      const rugs = furniture.filter((item) => {
        const def = getFurnitureDef(item.type);
        return def && def.category === 'rug';
      });

      rugs.forEach((item) => {
        const def = getFurnitureDef(item.type);
        if (!def) return;
        const px = item.gx * STEP;
        const py = item.gy * STEP;
        const pw = def.w * STEP;
        const ph = def.h * STEP;
        def.draw(g, px, py, pw, ph, item.variant);
      });

      // D. LAYER 2: Furniture sorted by gy (depth-sorted)
      const nonRugs = furniture
        .filter((item) => {
          const def = getFurnitureDef(item.type);
          return def && def.category !== 'rug';
        })
        .sort((a, b) => a.gy - b.gy);

      nonRugs.forEach((item) => {
        const def = getFurnitureDef(item.type);
        if (!def) return;
        const px = item.gx * STEP;
        const py = item.gy * STEP;
        const pw = def.w * STEP;
        const ph = def.h * STEP;

        // Register obstacle
        if (def.isObstacle) {
          if (def.isDesk) {
            // Desk obstacle covers desk body, leaves chair slot open
            newObstacles.push({
              x: px - 6,
              y: py,
              w: pw + 12,
              h: 58
            });
          } else {
            newObstacles.push({
              x: px,
              y: py,
              w: pw,
              h: ph
            });
          }
        }

        // Determine assigned agent name & work status
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

        // Draw selected highlight border if selected in decorate mode
        if (isDecorating && selectedPlacedItem?.id === item.id) {
          g.save();
          g.strokeStyle = '#eab308';
          g.lineWidth = 2;
          g.setLineDash([4, 4]);
          g.strokeRect(px - 2, py - 2, pw + 4, ph + 4);
          g.restore();
        }
      });

      obstaclesRef.current = newObstacles;
    },
    [furniture, agents, tasks, isDecorating, selectedPlacedItem]
  );

  // 3. Render Decoration Grid Overlay (Grid lines, Hover Preview, Valid Green / Blocked Red)
  const renderDecorOverlay = useCallback(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const g = canvas.getContext('2d');
    if (!g) return;
    g.clearRect(0, 0, worldDim.W, worldDim.H);

    if (!isDecorating) return;

    // A. Draw faint floor grid
    g.save();
    g.strokeStyle = 'rgba(100, 116, 139, 0.15)';
    g.lineWidth = 1;

    for (let x = 0; x <= worldDim.W; x += STEP) {
      g.beginPath();
      g.moveTo(x + 0.5, 86);
      g.lineTo(x + 0.5, worldDim.H);
      g.stroke();
    }
    for (let y = 86; y <= worldDim.H; y += STEP) {
      g.beginPath();
      g.moveTo(0, y + 0.5);
      g.lineTo(worldDim.W, y + 0.5);
      g.stroke();
    }
    g.restore();

    // B. Draw Hover / Drag Placement Preview
    if (!isDeleteMode && hoverGrid && (selectedCatalogItem || draggingItem)) {
      const def = selectedCatalogItem || (draggingItem ? getFurnitureDef(draggingItem.item.type) : null);
      if (def) {
        const px = hoverGrid.gx * STEP;
        const py = hoverGrid.gy * STEP;
        const pw = def.w * STEP;
        const ph = def.h * STEP;

        g.save();
        if (hoverGrid.valid) {
          // Valid placement = Green
          g.fillStyle = 'rgba(34, 197, 94, 0.35)';
          g.strokeStyle = '#22c55e';
        } else {
          // Blocked placement = Red
          g.fillStyle = 'rgba(239, 68, 68, 0.45)';
          g.strokeStyle = '#ef4444';
        }

        g.lineWidth = 2;
        g.fillRect(px, py, pw, ph);
        g.strokeRect(px + 1, py + 1, pw - 2, ph - 2);

        // Draw preview silhouette
        def.draw(g, px, py, pw, ph);
        g.restore();
      }
    }

    // C. Draw Delete Mode Hover Highlight
    if (isDeleteMode && hoveredDeleteItem) {
      const def = getFurnitureDef(hoveredDeleteItem.type);
      if (def) {
        const px = hoveredDeleteItem.gx * STEP;
        const py = hoveredDeleteItem.gy * STEP;
        const pw = def.w * STEP;
        const ph = def.h * STEP;

        g.save();
        g.fillStyle = 'rgba(239, 68, 68, 0.45)';
        g.strokeStyle = '#ef4444';
        g.lineWidth = 3;
        g.setLineDash([5, 5]);
        g.fillRect(px, py, pw, ph);
        g.strokeRect(px, py, pw, ph);

        // Delete badge
        g.setLineDash([]);
        g.fillStyle = '#dc2626';
        const tagW = 100;
        const tagH = 20;
        const tagY = Math.max(10, py - 22);
        g.fillRect(px, tagY, tagW, tagH);
        g.fillStyle = '#ffffff';
        g.font = 'bold 11px system-ui';
        g.fillText('🗑️ Bấm để xóa', px + 8, tagY + 14);
        g.restore();
      }
    }
  }, [isDecorating, isDeleteMode, hoveredDeleteItem, hoverGrid, selectedCatalogItem, draggingItem, worldDim]);

  // 4. Auto-fill Resize
  const resizeRoom = useCallback(() => {
    if (!viewportRef.current) return;
    const r = viewportRef.current.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;

    const displayScale = r.width < 700 ? 0.85 : Math.max(0.8, Math.min(1.5, (r.height - 100) / 650));
    const W = Math.max(1120, Math.ceil(r.width / displayScale));
    const H = Math.max(700, Math.ceil(r.height / displayScale));

    setWorldDim({ W, H, scale: displayScale });
  }, []);

  useEffect(() => {
    resizeRoom();
    window.addEventListener('resize', resizeRoom);
    return () => window.removeEventListener('resize', resizeRoom);
  }, [resizeRoom]);

  useEffect(() => {
    renderRoom(worldDim.W, worldDim.H);
    renderDecorOverlay();
  }, [renderRoom, renderDecorOverlay, worldDim]);

  // 5. Collision and Pathfinding
  const isBlocked = useCallback((x: number, y: number, W: number, H: number) => {
    if (x < 15 || x > W - 15 || y < 112 || y > H - 145) return true;
    return obstaclesRef.current.some(
      (o) => x > o.x && x < o.x + o.w && y > o.y && y < o.y + o.h
    );
  }, []);

  const routePath = useCallback((s: Point, t: Point, W: number, H: number): Point[] => {
    const COLS = Math.ceil(W / STEP);
    const ROWS = Math.ceil(H / STEP);

    const cell = (x: number, y: number) => ({
      x: Math.max(0, Math.min(COLS - 1, Math.round(x / STEP))),
      y: Math.max(0, Math.min(ROWS - 1, Math.round(y / STEP)))
    });

    const nearest = (p: Point): Point | null => {
      if (!isBlocked(p.x * STEP, p.y * STEP, W, H)) return p;
      for (let d = 1; d < 14; d++) {
        for (let dy = -d; dy <= d; dy++) {
          for (let dx = -d; dx <= d; dx++) {
            if (Math.abs(dx) === d || Math.abs(dy) === d) {
              const q = { x: p.x + dx, y: p.y + dy };
              if (!isBlocked(q.x * STEP, q.y * STEP, W, H)) return q;
            }
          }
        }
      }
      return null;
    };

    const a = nearest(cell(s.x, s.y));
    const b = nearest(cell(t.x, t.y));
    if (!a || !b) return [];

    const key = (p: Point) => p.y * COLS + p.x;
    const ak = key(a);
    const bk = key(b);
    const queue = [ak];
    const parent = new Map<number, number | null>([[ak, null]]);
    let index = 0;

    while (index < queue.length) {
      const k = queue[index++];
      if (k === bk) break;
      const cx = k % COLS;
      const cy = Math.floor(k / COLS);

      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1]
      ]) {
        const xx = cx + dx;
        const yy = cy + dy;
        const k2 = yy * COLS + xx;
        if (xx < 0 || xx >= COLS || yy < 0 || yy >= ROWS || parent.has(k2)) continue;
        if (isBlocked(xx * STEP, yy * STEP, W, H)) continue;
        parent.set(k2, k);
        queue.push(k2);
      }
    }

    if (!parent.has(bk)) return [];
    const result: Point[] = [];
    let cur: number | null = bk;
    while (cur !== null && cur !== ak) {
      result.push({
        x: (cur % COLS) * STEP,
        y: Math.floor(cur / COLS) * STEP
      });
      cur = parent.get(cur) ?? null;
    }
    result.reverse();
    return result;
  }, [isBlocked]);

  // Social Rest Stops: extracted from placed furniture with isRestStop = true
  const getSocialRestStops = useCallback((): Point[] => {
    const stops: Point[] = [];
    for (const item of furniture) {
      const def = getFurnitureDef(item.type);
      if (def?.isRestStop) {
        stops.push({
          x: (item.gx + Math.floor(def.w / 2)) * STEP,
          y: (item.gy + def.h) * STEP + 8
        });
      }
    }
    if (stops.length === 0) {
      stops.push({ x: worldDim.W / 2, y: worldDim.H - 180 });
    }
    return stops;
  }, [furniture, worldDim]);

  // 6. Sync actors map with agents and assigned desk locations
  useEffect(() => {
    const list = agents.slice(0, 8);
    const prevActors = actorsRef.current;
    const nextActors = new Map<string, Actor>();

    // Collect all desks
    const desks = furniture.filter((f) => f.type.startsWith('desk'));

    list.forEach((ag, i) => {
      // Find assigned desk or fallback
      let assignedDesk = desks.find((d) => d.assignedAgentId === ag.id);
      if (!assignedDesk && desks[i]) {
        assignedDesk = desks[i];
      }

      const home: Point = assignedDesk
        ? {
            x: Math.round(assignedDesk.gx * STEP + 48),
            y: Math.round(assignedDesk.gy * STEP + 72)
          }
        : { x: worldDim.W / 2, y: 220 };

      const isBusy =
        ag.isBusy ||
        tasks.some((t) => t.agent_id === ag.id && (t.status === 'RUNNING' || t.status === 'doing'));

      const existing = prevActors.get(ag.id);
      if (existing) {
        nextActors.set(ag.id, {
          ...existing,
          agent: ag,
          index: i,
          home,
          busy: isBusy
        });
      } else {
        nextActors.set(ag.id, {
          agent: ag,
          index: i,
          home,
          x: home.x,
          y: home.y,
          dir: 'down',
          wait: 3 + i * 2,
          path: [],
          busy: isBusy
        });
      }
    });

    actorsRef.current = nextActors;
  }, [agents, tasks, furniture, worldDim.W]);

  // 7. Animation loop (Agent movement, Social wandering, Desk work)
  useEffect(() => {
    let animId: number;

    const tick = (now: number) => {
      const dt = Math.min((now - (lastTimeRef.current || now)) / 1000 || 0, 0.06);
      lastTimeRef.current = now;

      if (!isMotionPaused && !document.hidden && !isDecorating) {
        const { W, H } = worldDim;
        const restSpots = getSocialRestStops();

        for (const a of actorsRef.current.values()) {
          if (a.busy) {
            // When busy: head directly to assigned desk and sit typing
            const dx = a.home.x - a.x;
            const dy = a.home.y - a.y;
            const dist = Math.hypot(dx, dy);

            if (dist > 5) {
              if (!a.path.length) {
                a.path = routePath(a, a.home, W, H);
              }
              const p = a.path[0];
              if (p) {
                const pdx = p.x - a.x;
                const pdy = p.y - a.y;
                const pd = Math.hypot(pdx, pdy);
                const speed = 36;
                if (pd < speed * dt) {
                  a.x = p.x;
                  a.y = p.y;
                  a.path.shift();
                } else {
                  a.x += (pdx / pd) * speed * dt;
                  a.y += (pdy / pd) * speed * dt;
                  a.dir = Math.abs(pdx) > Math.abs(pdy) ? (pdx > 0 ? 'right' : 'left') : pdy > 0 ? 'down' : 'up';
                }
              }
            } else {
              a.x = a.home.x;
              a.y = a.home.y;
              a.dir = 'up'; // Face monitor
              a.path = [];
            }
          } else {
            // Idle wander: alternate between desk and social rest spots (water cooler, sofa, books)
            if (a.wait > 0) {
              a.wait -= dt;
            } else {
              if (!a.path.length) {
                a.destination = (a.destination ?? -1) + 1;
                const goal =
                  a.destination % 2 === 0
                    ? restSpots[(a.index + a.destination) % restSpots.length]
                    : a.home;
                a.path = routePath(a, goal, W, H);
                if (!a.path.length) a.wait = 3;
              }
              const p = a.path[0];
              if (p) {
                const dx = p.x - a.x;
                const dy = p.y - a.y;
                const d = Math.hypot(dx, dy);
                const speed = 30 + (a.index % 3) * 3;
                if (d < speed * dt) {
                  a.x = p.x;
                  a.y = p.y;
                  a.path.shift();
                  if (!a.path.length) {
                    // Rest pause: 5 to 9 seconds at destination
                    a.wait = 5 + Math.random() * 4;
                  }
                } else {
                  a.x += (dx / d) * speed * dt;
                  a.y += (dy / d) * speed * dt;
                  a.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
                }
              }
            }
          }
        }
        setFrameTick((t) => t + 1);
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    animFrameRef.current = animId;

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isMotionPaused, isDecorating, worldDim, getSocialRestStops, routePath]);

  // 8. Mouse Events for Decoration Mode (Hover preview, click to place, drag existing items)
  const handleStageMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDecorating || !stageRef.current) return;
    const r = stageRef.current.getBoundingClientRect();
    const mx = (e.clientX - r.left) / worldDim.scale;
    const my = (e.clientY - r.top) / worldDim.scale;

    const gx = Math.round(mx / STEP);
    const gy = Math.round(my / STEP);

    if (isDeleteMode) {
      // Find item under cursor for delete highlight
      const targetItem = [...furniture].reverse().find((item) => {
        const def = getFurnitureDef(item.type);
        if (!def) return false;
        const px = item.gx * STEP;
        const py = item.gy * STEP;
        const pw = def.w * STEP;
        const ph = def.h * STEP;
        return mx >= px && mx <= px + pw && my >= py && my <= py + ph;
      });
      setHoveredDeleteItem(targetItem || null);
      setHoverGrid(null);
      return;
    }

    setHoveredDeleteItem(null);

    if (draggingItem) {
      const def = getFurnitureDef(draggingItem.item.type);
      const w = def?.w || 2;
      const h = def?.h || 2;
      const valid = isPlacementValid(gx, gy, w, h, draggingItem.item.id, def?.category);
      setHoverGrid({ gx, gy, valid });
      setDraggingItem((prev) => (prev ? { ...prev, curGx: gx, curGy: gy } : null));
    } else if (selectedCatalogItem) {
      const valid = isPlacementValid(gx, gy, selectedCatalogItem.w, selectedCatalogItem.h, undefined, selectedCatalogItem.category);
      setHoverGrid({ gx, gy, valid });
    }
  };

  const handleStageMouseLeave = () => {
    setHoverGrid(null);
    setHoveredDeleteItem(null);
  };

  const handleStageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDecorating || !stageRef.current) return;
    const r = stageRef.current.getBoundingClientRect();
    const mx = (e.clientX - r.left) / worldDim.scale;
    const my = (e.clientY - r.top) / worldDim.scale;

    const gx = Math.round(mx / STEP);
    const gy = Math.round(my / STEP);

    // Case 0: Delete Mode Active -> Delete clicked item immediately
    if (isDeleteMode) {
      const targetItem = [...furniture].reverse().find((item) => {
        const def = getFurnitureDef(item.type);
        if (!def) return false;
        const px = item.gx * STEP;
        const py = item.gy * STEP;
        const pw = def.w * STEP;
        const ph = def.h * STEP;
        return mx >= px && mx <= px + pw && my >= py && my <= py + ph;
      });
      if (targetItem) {
        onDeletePlacedItem?.(targetItem.id);
      }
      return;
    }

    // Case A: Placing a new catalog item
    if (selectedCatalogItem) {
      // Check if user clicked an existing placed item on floor instead
      const clickedExisting = [...furniture].reverse().find((item) => {
        const def = getFurnitureDef(item.type);
        if (!def) return false;
        const px = item.gx * STEP;
        const py = item.gy * STEP;
        const pw = def.w * STEP;
        const ph = def.h * STEP;
        return mx >= px && mx <= px + pw && my >= py && my <= py + ph;
      });

      const valid = isPlacementValid(gx, gy, selectedCatalogItem.w, selectedCatalogItem.h, undefined, selectedCatalogItem.category);
      if (valid) {
        const newItem: PlacedFurniture = {
          id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: selectedCatalogItem.type,
          gx,
          gy,
          assignedAgentId: null,
          variant: 0
        };
        onUpdateFurniture?.([...furniture, newItem]);
        onSelectPlacedItem?.(newItem);
        return;
      }

      // If clicked existing item where placement is invalid, select the existing item!
      if (clickedExisting) {
        onSelectPlacedItem?.(clickedExisting);
        onSelectCatalogItem?.(null);
        return;
      }
      return;
    }

    // Case B: Selecting an existing placed item on floor
    const clickedItem = [...furniture].reverse().find((item) => {
      const def = getFurnitureDef(item.type);
      if (!def) return false;
      const px = item.gx * STEP;
      const py = item.gy * STEP;
      const pw = def.w * STEP;
      const ph = def.h * STEP;
      return mx >= px && mx <= px + pw && my >= py && my <= py + ph;
    });

    onSelectPlacedItem?.(clickedItem || null);
  };

  const handleStageMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDecorating || isDeleteMode || selectedCatalogItem || !stageRef.current) return;
    const r = stageRef.current.getBoundingClientRect();
    const mx = (e.clientX - r.left) / worldDim.scale;
    const my = (e.clientY - r.top) / worldDim.scale;

    // Check if clicking an existing item to start drag
    const targetItem = [...furniture].reverse().find((item) => {
      const def = getFurnitureDef(item.type);
      if (!def) return false;
      const px = item.gx * STEP;
      const py = item.gy * STEP;
      const pw = def.w * STEP;
      const ph = def.h * STEP;
      return mx >= px && mx <= px + pw && my >= py && my <= py + ph;
    });

    if (targetItem) {
      onSelectPlacedItem?.(targetItem);
      setDraggingItem({
        item: targetItem,
        startGx: targetItem.gx,
        startGy: targetItem.gy,
        curGx: targetItem.gx,
        curGy: targetItem.gy
      });
    }
  };

  const handleStageMouseUp = () => {
    if (draggingItem) {
      const def = getFurnitureDef(draggingItem.item.type);
      const w = def?.w || 2;
      const h = def?.h || 2;
      const valid = isPlacementValid(draggingItem.curGx, draggingItem.curGy, w, h, draggingItem.item.id, def?.category);

      if (valid && (draggingItem.curGx !== draggingItem.startGx || draggingItem.curGy !== draggingItem.startGy)) {
        // Update moved item
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

  const actorsList = Array.from(actorsRef.current.values());

  return (
    <div
      ref={viewportRef}
      className={`world-viewport ${isDecorating ? 'mode-decorating' : ''}`}
      aria-label="Văn phòng pixel tương tác"
    >
      <div className="office pixel-room">
        <div
          ref={stageRef}
          className="pixel-stage"
          style={{
            width: `${worldDim.W}px`,
            height: `${worldDim.H}px`,
            transform: `scale(${worldDim.scale})`,
            transformOrigin: '0 0'
          }}
          onMouseMove={handleStageMouseMove}
          onMouseLeave={handleStageMouseLeave}
          onClick={handleStageClick}
          onMouseDown={handleStageMouseDown}
          onMouseUp={handleStageMouseUp}
        >
          {/* Main room procedural canvas */}
          <canvas
            ref={canvasRef}
            className="room-art"
            width={worldDim.W}
            height={worldDim.H}
            aria-hidden="true"
          />

          {/* Decoration Grid & Hover Overlay Canvas */}
          <canvas
            ref={overlayCanvasRef}
            className="room-decor-overlay"
            width={worldDim.W}
            height={worldDim.H}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              pointerEvents: 'none',
              zIndex: 80
            }}
            aria-hidden="true"
          />

          {/* Floating Action HUD on Selected Placed Item */}
          {isDecorating && selectedPlacedItem && !isDeleteMode && (
            <div
              className="furniture-floating-hud"
              style={{
                position: 'absolute',
                left: `${selectedPlacedItem.gx * STEP + ((getFurnitureDef(selectedPlacedItem.type)?.w || 2) * STEP) / 2}px`,
                top: `${Math.max(8, selectedPlacedItem.gy * STEP - 36)}px`,
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

          {/* Interactive Chibi Actor Buttons Layer */}
          <div className="pixel-actors" style={{ pointerEvents: isDecorating ? 'none' : 'auto' }}>
            {actorsList.map((actor) => {
              const isSelected = selectedAgentId === actor.agent.id;
              const isMoving = actor.path.length > 0;
              const step = isMoving && Math.floor(Date.now() / 175) % 2 === 1;

              const agentTasks = tasks.filter((t) => t.agent_id === actor.agent.id);
              const hasAttention = agentTasks.some(
                (t) => t.status === 'INTERRUPTED' || t.status === 'ERROR'
              );
              const hasRecentSuccess =
                agentTasks.length > 0 &&
                (agentTasks[0]?.status === 'SUCCESS' || agentTasks[0]?.status === 'success') &&
                (!agentTasks[0]?.review_status || agentTasks[0]?.review_status === 'pending');

              const isSeatedAtDesk = actor.busy && !isMoving;

              return (
                <button
                  key={actor.agent.id}
                  className={`pixel-agent ${isSelected ? 'selected' : ''} ${actor.busy ? 'has-task' : ''}`}
                  style={{
                    left: `${actor.x}px`,
                    top: `${actor.y}px`,
                    zIndex: Math.round(actor.y),
                    pointerEvents: isDecorating ? 'none' : 'auto'
                  }}
                  onClick={() => !isDecorating && onSelectAgent(actor.agent)}
                  aria-label={`Agent ${actor.agent.name}`}
                  title={`${actor.agent.name} — ${actor.agent.role}`}
                >
                  {/* Overhead Emotion & Status Badges */}
                  {actor.busy && (
                    <div className="agent-overhead-badge badge-working" title="Đang thực thi task...">
                      ⚡
                    </div>
                  )}
                  {!actor.busy && hasAttention && (
                    <div className="agent-overhead-badge badge-attention" title="Cần bạn xử lý (!)">
                      !
                    </div>
                  )}
                  {!actor.busy && !hasAttention && hasRecentSuccess && (
                    <div className="agent-overhead-badge badge-done" title="Vừa hoàn tất task (✓)">
                      ✓
                    </div>
                  )}

                  <ActorSpriteCanvas
                    actor={actor}
                    dir={actor.dir}
                    step={step}
                    isSeated={isSeatedAtDesk}
                    isTyping={isSeatedAtDesk}
                  />
                  <span>{actor.agent.name}</span>
                </button>
              );
            })}
          </div>

          <div className="map-caption">PIXEL OFFICE — A LITTLE ROOM FOR BIG IDEAS</div>
        </div>
      </div>
    </div>
  );
};

// Canvas subcomponent for single 32x40 chibi sprite
const ActorSpriteCanvas: React.FC<{
  actor: Actor;
  dir: string;
  step: boolean;
  isSeated?: boolean;
  isTyping?: boolean;
}> = ({ actor, dir, step, isSeated = false, isTyping = false }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    drawAgentSprite(
      canvasRef.current,
      {
        index: actor.index,
        agent: actor.agent
      },
      dir,
      step,
      { isSeated, isTyping }
    );
  }, [
    actor.index,
    actor.agent,
    actor.agent.avatar,
    actor.agent.color,
    dir,
    step,
    isSeated,
    isTyping
  ]);

  return <canvas ref={canvasRef} width={32} height={40} aria-hidden="true" />;
};
