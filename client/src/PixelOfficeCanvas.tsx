import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { Agent, Task } from './types';
import { drawAgentSprite } from './agent-sprite';

interface PixelOfficeCanvasProps {
  agents: Agent[];
  tasks: Task[];
  selectedAgentId: string | null;
  onSelectAgent: (agent: Agent) => void;
  isMotionPaused?: boolean;
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
}

const STEP = 16;

export const PixelOfficeCanvas: React.FC<PixelOfficeCanvasProps> = ({
  agents,
  tasks,
  selectedAgentId,
  onSelectAgent,
  isMotionPaused = false
}) => {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);

  const [worldDim, setWorldDim] = useState<{ W: number; H: number; scale: number }>({
    W: 1120,
    H: 700,
    scale: 1
  });

  const actorsRef = useRef<Map<string, Actor>>(new Map());
  const obstaclesRef = useRef<Obstacle[]>([]);
  const deskHomesRef = useRef<Point[]>([]);
  const lastTimeRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const [, setFrameTick] = useState(0);

  // Labels state for zones
  const [zoneLabels, setZoneLabels] = useState<
    Array<{ text: string; left: string; top: string; visible: boolean }>
  >([]);

  // 1. Procedural room drawing matching ChatGPT preview/pixel-office.js
  const drawRoom = useCallback((W: number, H: number, n: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const g = canvas.getContext('2d');
    if (!g) return;
    g.imageSmoothingEnabled = false;

    obstaclesRef.current = [];
    deskHomesRef.current = [];
    g.clearRect(0, 0, W, H);

    const rect = (x: number, y: number, w: number, h: number, c: string) => {
      g.fillStyle = c;
      g.fillRect(Math.round(x), Math.round(y), w, h);
    };

    const block = (x: number, y: number, w: number, h: number) => {
      obstaclesRef.current.push({ x: x - 13, y: y - 9, w: w + 26, h: h + 20 });
    };

    const plant = (x: number, y: number, large = false) => {
      const s = large ? 1.5 : 1;
      g.save();
      g.translate(x, y);
      g.scale(s, s);
      rect(-9, -4, 18, 17, '#866748');
      rect(-11, -7, 22, 5, '#d0a176');
      rect(-7, -2, 14, 12, '#bc885d');
      rect(-3, -38, 5, 31, '#65825a');
      rect(-17, -34, 13, 9, '#73925e');
      rect(2, -41, 11, 12, '#8ba56a');
      rect(-10, -47, 12, 13, '#9caf74');
      rect(2, -27, 18, 9, '#7d985c');
      rect(-16, -18, 13, 8, '#99ad72');
      rect(-9, -42, 6, 5, '#b3bf89');
      g.restore();
      block(x - 13, y - 12, 26, 26);
    };

    const desk = (x: number, y: number) => {
      rect(x - 48, y + 14, 96, 37, '#a98359');
      rect(x - 48, y + 6, 96, 39, '#bd996e');
      rect(x - 46, y + 6, 92, 4, '#e3bd87');
      rect(x - 46, y + 43, 5, 15, '#93734e');
      rect(x + 41, y + 43, 5, 15, '#93734e');
      rect(x - 21, y + 12, 40, 27, '#4c5953');
      rect(x - 18, y + 14, 34, 20, '#aec2a0');
      rect(x - 15, y + 17, 24, 2, '#e1e8bb');
      rect(x - 15, y + 22, 16, 2, '#7f9e82');
      rect(x - 15, y + 27, 21, 2, '#d2ddb4');
      rect(x - 3, y + 38, 5, 7, '#606e5a');
      rect(x - 16, y + 44, 31, 3, '#e6dcb4');
      rect(x - 17, y + 50, 35, 7, '#d6cba3');
      for (let i = 0; i < 6; i++) {
        rect(x - 14 + i * 5, y + 52, 2, 2, '#8e967e');
      }
      rect(x + 29, y + 32, 9, 10, '#fff0cd');
      rect(x + 38, y + 34, 4, 5, '#d3b68b');
      rect(x - 40, y + 28, 13, 19, '#ddd3a7');
      rect(x - 38, y + 31, 8, 1, '#ad9e79');
      rect(x - 38, y + 35, 8, 1, '#ad9e79');
      rect(x - 17, y + 66, 34, 19, '#6c806b');
      rect(x - 20, y + 64, 40, 8, '#93a086');
      rect(x - 14, y + 84, 28, 5, '#58705c');
      block(x - 48, y + 3, 96, 58);
    };

    const rug = (x: number, y: number, w: number, h: number, c: string) => {
      rect(x + 3, y + 4, w, h, '#a8947533');
      rect(x, y, w, h, '#a6b194');
      rect(x + 4, y + 4, w - 8, h - 8, c);
      for (let i = x + 9; i < x + w - 9; i += 12) {
        rect(i, y + 7, 4, 2, '#dbe0b7');
        rect(i, y + h - 9, 4, 2, '#dbe0b7');
      }
    };

    const sofa = (x: number, y: number, w: number, vertical = false) => {
      if (vertical) {
        rect(x + 4, y + 3, 34, w, '#73816a');
        rect(x, y, 34, w - 4, '#8e9b7e');
        rect(x, y, 7, w - 4, '#a4ad8b');
        for (let yy = y + 8; yy < y + w - 4; yy += 28) {
          rect(x + 8, yy, 22, 25, '#9ca789');
        }
        rect(x, y - 4, 39, 8, '#a5af8f');
        rect(x, y + w - 10, 39, 8, '#a5af8f');
        block(x, y, 39, w);
      } else {
        rect(x + 3, y + 3, w, 36, '#71816c');
        rect(x, y, w, 34, '#8b9b80');
        rect(x, y, w, 9, '#b2bb99');
        for (let xx = x + 9; xx < x + w - 5; xx += 36) {
          rect(xx, y + 11, 32, 19, '#a1ad8d');
        }
        rect(x - 4, y, 9, 38, '#a9b595');
        rect(x + w - 6, y, 9, 38, '#a9b595');
        block(x, y, w, 38);
      }
    };

    const shelf = (x: number, y: number, w: number) => {
      rect(x, y, w, 46, '#9c7b54');
      rect(x + 3, y + 3, w - 6, 40, '#c29e6d');
      for (let row = 0; row < 2; row++) {
        for (let i = 0; i < Math.floor(w / 9) - 1; i++) {
          const xx = x + 6 + i * 9;
          rect(xx, y + 6 + row * 20, 6, 14, ['#8e9d79', '#d1bf8a', '#a67e62', '#7f9490'][i % 4]);
          rect(xx + 1, y + 8 + row * 20, 2, 1, '#e7d7ab');
        }
        rect(x + 2, y + 21 + row * 20, w - 4, 4, '#ad885c');
      }
      block(x, y, w, 46);
    };

    // Parquet wooden floor fills viewport completely
    rect(0, 0, W, H, '#cfb591');
    for (let y = 87; y < H; y += 18) {
      rect(0, y, W, 1, '#baa27d');
      for (let x = (Math.floor(y / 18) % 2) * 40; x < W; x += 80) {
        rect(x, y, 1, 18, '#baa27d');
        if (x + 29 < W) rect(x + 13, y + 5, 16, 1, '#d8bf98');
      }
    }

    // Top wall & windows
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

    const compact = W < 850;
    const side = compact ? 28 : Math.min(245, W * 0.21);
    const left = side;
    const right = W - side;
    const top = compact ? 150 : 160;
    const workBottom = compact
      ? Math.min(H - 430, top + 340)
      : Math.max(top + 260, H - 210);

    // 2-column desk arrangement requested by user:
    // Column 1 (left): 4 desks for Huy, Tường, Phước, Toàn
    // Column 2 (right): 3 desks for Thành, Long, Hiếu
    const totalCols = 2;
    const col1Count = 4;
    const maxRows = 4;
    const mainWidth = right - left;
    const rowSpacing = Math.min(115, Math.max(88, (workBottom - top) / (maxRows - 1)));
    const rugHeight = (maxRows - 1) * rowSpacing + 135;

    rug(left - 7, top - 25, mainWidth + 14, Math.max(180, rugHeight), '#b9c3a4');

    for (let i = 0; i < n; i++) {
      const isCol1 = i < col1Count;
      const c = isCol1 ? 0 : 1;
      const r = isCol1 ? i : (i - col1Count);
      const x = left + (mainWidth * (c + 0.5)) / totalCols;
      const y = top + r * rowSpacing;
      desk(x, y);
      deskHomesRef.current.push({
        x: Math.round(x / 16) * 16,
        y: Math.round((y + 76) / 16) * 16
      });
    }

    const newLabels: Array<{ text: string; left: string; top: string; visible: boolean }> = [
      { text: 'THE WORKROOM', left: `${left + 15}px`, top: `${top - 53}px`, visible: true }
    ];

    if (!compact) {
      // Left side: Meeting room & Quiet lounge
      const lx = 25;
      const ly = 161;
      const lw = side - 50;
      rug(lx, ly, lw, 210, '#bdc4aa');
      shelf(lx + 12, 108, Math.min(120, lw - 24));

      const tx = lx + lw / 2 - 47;
      rect(tx, ly + 55, 94, 80, '#a28059');
      rect(tx - 3, ly + 50, 94, 80, '#cba97c');
      rect(tx + 24, ly + 64, 31, 21, '#74816e');
      rect(tx + 28, ly + 68, 23, 13, '#a9baa0');
      rect(tx + 17, ly + 104, 14, 9, '#ede0bb');
      block(tx - 3, ly + 49, 98, 83);

      for (const yy of [ly + 65, ly + 105]) {
        rect(tx - 27, yy, 17, 25, '#8e9f82');
        rect(tx + 104, yy, 17, 25, '#8e9f82');
        block(tx - 27, yy, 17, 25);
        block(tx + 104, yy, 17, 25);
      }

      const loungeY = Math.max(ly + 250, H - 285);
      rug(lx, loungeY, lw, 140, '#b4b99d');
      sofa(lx + 15, loungeY + 23, Math.min(110, lw - 45));
      rect(lx + lw / 2 - 28, loungeY + 87, 56, 28, '#c7a77b');
      rect(lx + lw / 2 - 12, loungeY + 92, 14, 10, '#f1e5be');
      block(lx + lw / 2 - 28, loungeY + 87, 56, 28);
      plant(lx + lw - 22, loungeY + 118);

      // Right side: Coffee & Quiet zone
      const rx = W - side + 25;
      const rw = side - 50;
      rug(rx, 161, rw, 210, '#c0c7ac');
      rect(rx + 15, 201, 38, 71, '#e1d6b9');
      rect(rx + 19, 182, 30, 22, '#adc9c0');
      rect(rx + 23, 179, 22, 4, '#e0e8cb');
      rect(rx + 21, 215, 26, 14, '#6f8276');
      rect(rx + 25, 220, 4, 5, '#9bc3bb');
      rect(rx + 39, 220, 4, 5, '#b98464');
      block(rx + 15, 179, 38, 93);

      rect(rx + rw - 69, 190, 55, 132, '#d4bc97');
      rect(rx + rw - 72, 185, 61, 6, '#f4e6c9');
      rect(rx + rw - 63, 198, 42, 30, '#728578');
      rect(rx + rw - 58, 203, 32, 17, '#9aaba0');
      rect(rx + rw - 62, 249, 41, 3, '#eedcb5');
      block(rx + rw - 72, 185, 61, 138);
      plant(rx + rw - 18, 351);

      rug(rx, loungeY, rw, 140, '#b1bda0');
      sofa(rx + 17, loungeY + 25, Math.min(111, rw - 35));
      shelf(rx + 18, loungeY + 88, Math.min(130, rw - 36));
      plant(rx + rw - 19, loungeY + 119);

      plant(side - 11, Math.min(430, H - 180));
      plant(W - side + 11, Math.min(430, H - 180));

      newLabels.push(
        { text: 'MEETING ROOM', left: '40px', top: '140px', visible: true },
        { text: 'SLOW CORNER', left: '40px', top: `${Math.max(411, H - 307)}px`, visible: true },
        { text: 'COFFEE & IDEAS', left: `${W - side + 38}px`, top: '140px', visible: true },
        { text: 'QUIET ZONE', left: `${W - side + 38}px`, top: `${Math.max(411, H - 307)}px`, visible: true }
      );
    } else {
      // Portrait layout
      const lower = H - 285;
      const half = W / 2;
      rug(18, lower, half - 26, 140, '#b4b99e');
      sofa(35, lower + 30, Math.max(75, half - 72));
      rect(half / 2 - 20, lower + 95, 45, 24, '#c9a779');
      block(half / 2 - 20, lower + 95, 45, 24);

      rug(half + 8, lower, half - 26, 140, '#bec7ab');
      rect(half + 28, lower + 31, 36, 63, '#e5d9bd');
      rect(half + 32, lower + 13, 28, 21, '#b2cfc0');
      rect(half + 34, lower + 44, 24, 11, '#788b7b');
      block(half + 28, lower + 13, 36, 81);
      shelf(half + 83, lower + 35, Math.max(36, half - 123));
      plant(W - 34, lower + 120);
    }

    plant(22, 118);
    plant(W - 24, 118);

    setZoneLabels(newLabels);
  }, []);

  // 2. Resize and recalculate W, H, displayScale
  const resizeRoom = useCallback(() => {
    if (!viewportRef.current) return;
    const r = viewportRef.current.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;

    const displayScale = r.width < 700 ? 0.85 : Math.max(0.8, Math.min(1.5, (r.height - 100) / 650));
    const W = Math.ceil(r.width / displayScale);
    const H = Math.ceil(r.height / displayScale);

    setWorldDim({ W, H, scale: displayScale });
    drawRoom(W, H, Math.min(agents.length, 8));
  }, [agents.length, drawRoom]);

  useEffect(() => {
    resizeRoom();
    window.addEventListener('resize', resizeRoom);
    return () => window.removeEventListener('resize', resizeRoom);
  }, [resizeRoom]);

  // 3. Collision and Pathfinding (exact BFS from preview/pixel-office.js)
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

  const restStops = useCallback((W: number, H: number): Point[] => {
    return W < 850
      ? [
          { x: W / 2, y: H - 185 },
          { x: W / 2, y: 132 },
          { x: W - 35, y: H / 2 }
        ]
      : [
          { x: W - 240, y: 395 },
          { x: 240, y: 395 },
          { x: W / 2, y: H - 180 },
          { x: W / 2, y: 132 }
        ];
  }, []);

  // 4. Sync actors map with agents list
  useEffect(() => {
    const list = agents.slice(0, 8);
    const prevActors = actorsRef.current;
    const nextActors = new Map<string, Actor>();

    list.forEach((ag, i) => {
      const home = deskHomesRef.current[i] || { x: worldDim.W / 2, y: 220 };
      const isBusy = ag.isBusy || tasks.some((t) => t.agent_id === ag.id && (t.status === 'RUNNING' || t.status === 'doing'));

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
  }, [agents, tasks, worldDim.W]);

  // 5. Animation loop (tick)
  useEffect(() => {
    let animId: number;

    const tick = (now: number) => {
      const dt = Math.min((now - (lastTimeRef.current || now)) / 1000 || 0, 0.06);
      lastTimeRef.current = now;

      if (!isMotionPaused && !document.hidden) {
        const { W, H } = worldDim;
        const stops = restStops(W, H);

        for (const a of actorsRef.current.values()) {
          if (a.busy) {
            // When busy, agent heads home and sits at desk
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
                const speed = 34;
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
              a.dir = 'up';
              a.path = [];
            }
          } else {
            // Idle wander
            if (a.wait > 0) {
              a.wait -= dt;
            } else {
              if (!a.path.length) {
                a.destination = ((a.destination ?? -1) + 1);
                const goal =
                  a.destination % 2 === 0
                    ? stops[(a.index + a.destination) % stops.length]
                    : a.home;
                a.path = routePath(a, goal, W, H);
                if (!a.path.length) a.wait = 3;
              }
              const p = a.path[0];
              if (p) {
                const dx = p.x - a.x;
                const dy = p.y - a.y;
                const d = Math.hypot(dx, dy);
                const speed = 31 + (a.index % 3) * 3;
                if (d < speed * dt) {
                  a.x = p.x;
                  a.y = p.y;
                  a.path.shift();
                  if (!a.path.length) a.wait = 5 + Math.random() * 6;
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
  }, [isMotionPaused, worldDim, restStops, routePath]);

  const actorsList = Array.from(actorsRef.current.values());

  return (
    <div
      ref={viewportRef}
      className="world-viewport"
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
        >
          {/* Main room procedural canvas */}
          <canvas
            ref={canvasRef}
            className="room-art"
            width={worldDim.W}
            height={worldDim.H}
            aria-hidden="true"
          />

          {/* Interactive Chibi Actor Buttons Layer */}
          <div className="pixel-actors">
            {actorsList.map((actor) => {
              const isSelected = selectedAgentId === actor.agent.id;
              const isMoving = actor.path.length > 0;
              const step = isMoving && Math.floor(Date.now() / 175) % 2 === 1;

              const agentTasks = tasks.filter((t) => t.agent_id === actor.agent.id);
              const hasAttention = agentTasks.some((t) => t.status === 'INTERRUPTED' || t.status === 'ERROR');
              const hasRecentSuccess =
                agentTasks.length > 0 &&
                agentTasks[0]?.status === 'SUCCESS' &&
                (!agentTasks[0]?.review_status || agentTasks[0]?.review_status === 'pending');

              return (
                <button
                  key={actor.agent.id}
                  className={`pixel-agent ${isSelected ? 'selected' : ''} ${actor.busy ? 'has-task' : ''}`}
                  style={{
                    left: `${actor.x}px`,
                    top: `${actor.y}px`,
                    zIndex: Math.round(actor.y)
                  }}
                  onClick={() => onSelectAgent(actor.agent)}
                  aria-label={`Giao việc cho ${actor.agent.name}`}
                  title={`${actor.agent.name} — ${actor.agent.role}`}
                >
                  {/* Overhead Status Badges */}
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
                  />
                  <span>{actor.agent.name}</span>
                </button>
              );
            })}
          </div>

          {/* Zone Labels */}
          {zoneLabels.map((zl, idx) => (
            <div
              key={idx}
              className="zone-label"
              style={{
                left: zl.left,
                top: zl.top,
                display: zl.visible ? 'block' : 'none'
              }}
            >
              {zl.text}
            </div>
          ))}

          <div className="map-caption">A LITTLE ROOM FOR BIG IDEAS</div>
        </div>
      </div>
    </div>
  );
};

// Canvas subcomponent for single 32x40 sprite
const ActorSpriteCanvas: React.FC<{
  actor: Actor;
  dir: string;
  step: boolean;
}> = ({ actor, dir, step }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    drawAgentSprite(
      canvasRef.current,
      {
        index: actor.index,
        agent: {
          color: actor.agent.color || actor.agent.avatar?.clothesColor || '#2563eb'
        }
      },
      dir,
      step
    );
  }, [actor.index, actor.agent.color, actor.agent.avatar?.clothesColor, dir, step]);

  return <canvas ref={canvasRef} width={32} height={40} aria-hidden="true" />;
};
