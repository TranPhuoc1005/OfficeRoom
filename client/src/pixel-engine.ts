import type { Agent } from './types';

export interface OfficeEntity {
  agent: Agent;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  state: 'idle' | 'walking' | 'sitting' | 'working';
  facing: 'left' | 'right' | 'down' | 'up';
  walkFrame: number;
  blinkTimer: number;
  wanderTimer: number;
  showDoneBadge: boolean;
  doneBadgeTimer: number;
}

export class PixelOfficeEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private entities: Map<string, OfficeEntity> = new Map();
  private animationFrameId: number | null = null;
  private hoveredAgentId: string | null = null;
  private onAgentClick: (agent: Agent) => void;
  private tickCount: number = 0;

  constructor(canvas: HTMLCanvasElement, onAgentClick: (agent: Agent) => void) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Cannot get 2d context');
    this.ctx = context;
    this.ctx.imageSmoothingEnabled = false; // crisp retro pixels
    this.onAgentClick = onAgentClick;

    this.setupEventListeners();
  }

  public updateAgents(agents: Agent[]) {
    for (const agent of agents) {
      let entity = this.entities.get(agent.id);
      if (!entity) {
        // Initialize entity at its desk or entrance
        entity = {
          agent,
          x: agent.desk_x + 10,
          y: agent.desk_y + 40,
          targetX: agent.desk_x + 10,
          targetY: agent.desk_y + 40,
          state: agent.isBusy ? 'working' : 'idle',
          facing: 'down',
          walkFrame: 0,
          blinkTimer: Math.random() * 100,
          wanderTimer: 60 + Math.random() * 120,
          showDoneBadge: false,
          doneBadgeTimer: 0
        };
        this.entities.set(agent.id, entity);
      } else {
        const wasBusy = entity.agent.isBusy;
        entity.agent = agent;

        // If newly finished, show green checkmark badge
        if (wasBusy && !agent.isBusy) {
          entity.showDoneBadge = true;
          entity.doneBadgeTimer = 300; // 5 seconds at 60fps
        }

        if (agent.isBusy) {
          entity.showDoneBadge = false;
        }
      }
    }
  }

  public start() {
    const loop = () => {
      this.update();
      this.render();
      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  public stop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private setupEventListeners() {
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      const mouseX = (e.clientX - rect.left) * scaleX;
      const mouseY = (e.clientY - rect.top) * scaleY;

      let found: string | null = null;
      for (const [id, entity] of this.entities.entries()) {
        const charWidth = 28;
        const charHeight = 44;
        if (
          mouseX >= entity.x - charWidth / 2 &&
          mouseX <= entity.x + charWidth / 2 &&
          mouseY >= entity.y - charHeight &&
          mouseY <= entity.y + 10
        ) {
          found = id;
          break;
        }
      }

      this.hoveredAgentId = found;
      this.canvas.style.cursor = found ? 'pointer' : 'default';
    });

    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      const mouseX = (e.clientX - rect.left) * scaleX;
      const mouseY = (e.clientY - rect.top) * scaleY;

      for (const entity of this.entities.values()) {
        const charWidth = 32;
        const charHeight = 48;
        if (
          mouseX >= entity.x - charWidth / 2 &&
          mouseX <= entity.x + charWidth / 2 &&
          mouseY >= entity.y - charHeight &&
          mouseY <= entity.y + 10
        ) {
          this.onAgentClick(entity.agent);
          return;
        }
      }
    });
  }

  private update() {
    this.tickCount++;

    for (const entity of this.entities.values()) {
      const isWorking = entity.agent.isBusy;

      // Handle done badge countdown
      if (entity.doneBadgeTimer > 0) {
        entity.doneBadgeTimer--;
        if (entity.doneBadgeTimer <= 0) {
          entity.showDoneBadge = false;
        }
      }

      // Blink animation
      entity.blinkTimer--;
      if (entity.blinkTimer <= 0) {
        entity.blinkTimer = 180 + Math.random() * 120;
      }

      if (isWorking) {
        // Go to desk and sit/work
        const chairX = entity.agent.desk_x + 16;
        const chairY = entity.agent.desk_y + 12;

        const dist = Math.hypot(chairX - entity.x, chairY - entity.y);
        if (dist > 3) {
          entity.state = 'walking';
          const angle = Math.atan2(chairY - entity.y, chairX - entity.x);
          entity.x += Math.cos(angle) * 1.8;
          entity.y += Math.sin(angle) * 1.8;
          entity.facing = Math.cos(angle) > 0 ? 'right' : 'left';
          entity.walkFrame = Math.floor(this.tickCount / 6) % 4;
        } else {
          entity.x = chairX;
          entity.y = chairY;
          entity.state = 'working';
          entity.facing = 'up'; // facing desk monitor
        }
      } else {
        // IDLE: wander occasionally around office walkable zone
        entity.wanderTimer--;
        if (entity.wanderTimer <= 0) {
          // Pick new target in office
          entity.targetX = 80 + Math.random() * 640;
          entity.targetY = 220 + Math.random() * 180;
          entity.wanderTimer = 180 + Math.random() * 300;
        }

        const dist = Math.hypot(entity.targetX - entity.x, entity.targetY - entity.y);
        if (dist > 3) {
          entity.state = 'walking';
          const angle = Math.atan2(entity.targetY - entity.y, entity.targetX - entity.x);
          entity.x += Math.cos(angle) * 1.0;
          entity.y += Math.sin(angle) * 1.0;
          entity.facing = Math.cos(angle) > 0 ? 'right' : 'left';
          entity.walkFrame = Math.floor(this.tickCount / 8) % 4;
        } else {
          entity.state = 'idle';
          if (Math.random() < 0.02) {
            entity.facing = Math.random() > 0.5 ? 'left' : 'right';
          }
        }
      }
    }
  }

  private render() {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw Office Environment
    this.drawOfficeEnvironment();

    // 2. Draw Desks & Stations
    for (const entity of this.entities.values()) {
      this.drawDesk(entity.agent);
    }

    // 3. Draw Characters (sorted by Y for depth/isometric layering)
    const sorted = Array.from(this.entities.values()).sort((a, b) => a.y - b.y);
    for (const entity of sorted) {
      this.drawCharacter(entity);
    }
  }

  private drawOfficeEnvironment() {
    const { ctx, canvas } = this;
    const w = canvas.width;
    const h = canvas.height;

    // Top Wall (Y: 0 -> 140)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, w, 140);

    // Wall top border & trim
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, 8);
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 136, w, 4);

    // Brick texture subtle accents
    ctx.fillStyle = '#26354a';
    for (let y = 14; y < 130; y += 18) {
      const offset = (y % 36 === 0) ? 0 : 20;
      for (let x = offset; x < w; x += 40) {
        ctx.fillRect(x, y, 36, 14);
      }
    }

    // Two Large Office Windows showing night skyline/lights
    this.drawWindow(60, 20, 110, 75);
    this.drawWindow(630, 20, 110, 75);

    // Center Whiteboard
    this.drawWhiteboard(330, 22, 140, 75);

    // Wall Clock
    this.drawClock(240, 40);

    // Floor (Y: 140 -> h)
    // Warm retro wooden plank floor
    const tileSize = 32;
    for (let y = 140; y < h; y += tileSize) {
      for (let x = 0; x < w; x += tileSize) {
        const isAlt = ((x / tileSize) + (y / tileSize)) % 2 === 0;
        ctx.fillStyle = isAlt ? '#78350f' : '#854d0e';
        ctx.fillRect(x, y, tileSize, tileSize);

        // Plank border lines
        ctx.fillStyle = '#451a03';
        ctx.fillRect(x, y + tileSize - 1, tileSize, 1);
        ctx.fillRect(x + tileSize - 1, y, 1, tileSize);
      }
    }

    // Cozy Office Rug in center
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(220, 240, 360, 160);
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.strokeRect(223, 243, 354, 154);

    // Water Cooler Station
    this.drawWaterCooler(26, 120);

    // Potted Plants
    this.drawPottedPlant(210, 120);
    this.drawPottedPlant(570, 120);
  }

  private drawWindow(x: number, y: number, w: number, h: number) {
    const { ctx } = this;
    // Window Frame
    ctx.fillStyle = '#475569';
    ctx.fillRect(x - 3, y - 3, w + 6, h + 6);

    // Sky inside window (twilight gradient)
    const sky = ctx.createLinearGradient(x, y, x, y + h);
    sky.addColorStop(0, '#0c4a6e');
    sky.addColorStop(1, '#0284c7');
    ctx.fillStyle = sky;
    ctx.fillRect(x, y, w, h);

    // Distant city silhouette
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x + 10, y + 35, 18, 40);
    ctx.fillRect(x + 35, y + 25, 24, 50);
    ctx.fillRect(x + 65, y + 40, 20, 35);
    ctx.fillRect(x + 90, y + 30, 15, 45);

    // City lights
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(x + 14, y + 42, 3, 3);
    ctx.fillRect(x + 40, y + 32, 3, 3);
    ctx.fillRect(x + 48, y + 45, 3, 3);
    ctx.fillRect(x + 70, y + 48, 3, 3);

    // Glass panes divider
    ctx.fillStyle = '#64748b';
    ctx.fillRect(x + w / 2 - 2, y, 4, h);
    ctx.fillRect(x, y + h / 2 - 2, w, 4);
  }

  private drawWhiteboard(x: number, y: number, w: number, h: number) {
    const { ctx } = this;
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(x - 3, y - 3, w + 6, h + 6);

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(x, y, w, h);

    // Diagrams & flowchart lines
    ctx.fillStyle = '#2563eb';
    ctx.fillRect(x + 15, y + 15, 24, 14);
    ctx.fillRect(x + 60, y + 15, 24, 14);
    ctx.fillRect(x + 100, y + 15, 24, 14);

    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 39, y + 22);
    ctx.lineTo(x + 60, y + 22);
    ctx.moveTo(x + 84, y + 22);
    ctx.lineTo(x + 100, y + 22);
    ctx.stroke();

    // Notes
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(x + 15, y + 40, 30, 2);
    ctx.fillStyle = '#10b981';
    ctx.fillRect(x + 15, y + 46, 50, 2);

    // Post-it notes
    ctx.fillStyle = '#fde047';
    ctx.fillRect(x + 105, y + 42, 18, 18);
  }

  private drawClock(x: number, y: number) {
    const { ctx } = this;
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.arc(x, y, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Clock hands
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 7, y - 4);
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + 9);
    ctx.stroke();
  }

  private drawWaterCooler(x: number, y: number) {
    const { ctx } = this;
    // Water Bottle (cyan transparent)
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(x + 4, y, 16, 22);
    // Dispenser base
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(x, y + 22, 24, 30);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(x + 6, y + 32, 12, 10);
    // Blue/Red taps
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(x + 7, y + 34, 3, 3);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(x + 14, y + 34, 3, 3);
  }

  private drawPottedPlant(x: number, y: number) {
    const { ctx } = this;
    // Pot
    ctx.fillStyle = '#ea580c';
    ctx.beginPath();
    ctx.moveTo(x, y + 30);
    ctx.lineTo(x + 5, y + 48);
    ctx.lineTo(x + 25, y + 48);
    ctx.lineTo(x + 30, y + 30);
    ctx.closePath();
    ctx.fill();

    // Leaves
    ctx.fillStyle = '#16a34a';
    ctx.beginPath();
    ctx.arc(x + 15, y + 20, 18, 0, Math.PI * 2);
    ctx.arc(x + 7, y + 12, 12, 0, Math.PI * 2);
    ctx.arc(x + 24, y + 14, 13, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawDesk(agent: Agent) {
    const { ctx } = this;
    const x = agent.desk_x;
    const y = agent.desk_y;
    const isWorking = agent.isBusy;

    // Chair
    ctx.fillStyle = '#334155';
    ctx.fillRect(x + 10, y + 20, 20, 16);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x + 13, y + 36, 14, 8);

    // Desk Tabletop
    ctx.fillStyle = '#b45309';
    ctx.fillRect(x - 20, y, 80, 26);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(x - 20, y + 23, 80, 3);

    // Desk Legs
    ctx.fillStyle = '#451a03';
    ctx.fillRect(x - 16, y + 26, 6, 24);
    ctx.fillRect(x + 50, y + 26, 6, 24);

    // Computer Monitor
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x + 6, y - 22, 28, 20); // frame
    ctx.fillRect(x + 17, y - 2, 6, 6);   // stand
    ctx.fillRect(x + 13, y + 3, 14, 3);  // base

    // Monitor Screen
    if (isWorking) {
      // Screen glow when working!
      const glow = (this.tickCount % 20 < 10) ? '#06b6d4' : '#22d3ee';
      ctx.fillStyle = glow;
      ctx.fillRect(x + 8, y - 20, 24, 16);

      // Flickering green code lines
      ctx.fillStyle = '#10b981';
      const offset = (this.tickCount % 12);
      ctx.fillRect(x + 10, y - 18 + (offset % 10), 12, 2);
      ctx.fillRect(x + 10, y - 14, 18, 2);
      ctx.fillRect(x + 10, y - 9, 15, 2);
    } else {
      ctx.fillStyle = '#1e293b'; // off/idle screen
      ctx.fillRect(x + 8, y - 20, 24, 16);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(x + 12, y - 12, 4, 4); // logo
    }

    // Keyboard & Mouse
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(x + 10, y + 10, 18, 6);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(x + 32, y + 12, 5, 4);

    // Coffee mug
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(x - 10, y + 6, 7, 9);
    ctx.fillRect(x - 5, y + 8, 3, 5);
  }

  private drawCharacter(entity: OfficeEntity) {
    const { ctx } = this;
    const { agent, x, y, state, facing, walkFrame } = entity;
    const avatar = agent.avatar;
    const isHovered = this.hoveredAgentId === agent.id;

    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));

    // Selection/Hover indicator
    if (isHovered) {
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 2]);
      ctx.strokeRect(-18, -46, 36, 52);
      ctx.setLineDash([]);
    }

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(0, 4, 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    const bob = (state === 'walking') ? (walkFrame % 2 === 0 ? -2 : 0) : 0;

    // Legs & Shoes
    ctx.fillStyle = '#1e293b'; // dark pants
    if (state === 'walking') {
      const legOffset = (walkFrame % 2 === 0) ? -3 : 3;
      ctx.fillRect(-6 + legOffset, -10 + bob, 4, 12);
      ctx.fillRect(2 - legOffset, -10 + bob, 4, 12);
    } else if (state === 'working') {
      ctx.fillRect(-6, -6, 12, 8); // sitting
    } else {
      ctx.fillRect(-6, -10, 4, 12);
      ctx.fillRect(2, -10, 4, 12);
    }

    // Torso / Shirt
    ctx.fillStyle = avatar.clothesColor || '#2563eb';
    ctx.fillRect(-9, -24 + bob, 18, 16);

    // Collar detail
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-3, -24 + bob, 6, 4);

    // Hands
    ctx.fillStyle = avatar.skinColor || '#ffe0bd';
    if (state === 'working') {
      // Hands typing on keyboard
      const handBob = (this.tickCount % 8 < 4) ? -1 : 1;
      ctx.fillRect(-8, -14 + handBob, 4, 4);
      ctx.fillRect(4, -14 - handBob, 4, 4);
    } else {
      ctx.fillRect(-12, -20 + bob, 4, 8);
      ctx.fillRect(8, -20 + bob, 4, 8);
    }

    // Head
    ctx.fillStyle = avatar.skinColor || '#ffe0bd';
    ctx.fillRect(-10, -38 + bob, 20, 16);

    // Eyes
    const isBlinking = entity.blinkTimer < 8;
    if (facing !== 'up') {
      ctx.fillStyle = '#0f172a';
      const eyeX = (facing === 'left') ? -6 : (facing === 'right' ? 2 : -4);
      if (isBlinking) {
        ctx.fillRect(eyeX, -30 + bob, 3, 1);
        ctx.fillRect(eyeX + 6, -30 + bob, 3, 1);
      } else {
        ctx.fillRect(eyeX, -32 + bob, 3, 4);
        ctx.fillRect(eyeX + 6, -32 + bob, 3, 4);
        // Eye twinkle
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(eyeX + 1, -32 + bob, 1, 1);
        ctx.fillRect(eyeX + 7, -32 + bob, 1, 1);
      }
    }

    // Hair
    ctx.fillStyle = avatar.hairColor || '#4a2c11';
    if (avatar.hairStyle === 'messy') {
      ctx.fillRect(-11, -44 + bob, 22, 8);
      ctx.fillRect(-12, -40 + bob, 4, 10);
      ctx.fillRect(8, -40 + bob, 4, 10);
      ctx.fillRect(-6, -46 + bob, 5, 3);
      ctx.fillRect(2, -46 + bob, 6, 3);
    } else if (avatar.hairStyle === 'curly') {
      ctx.fillRect(-12, -43 + bob, 24, 9);
      ctx.fillRect(-13, -38 + bob, 4, 12);
      ctx.fillRect(9, -38 + bob, 4, 12);
    } else {
      // Short standard
      ctx.fillRect(-11, -42 + bob, 22, 6);
      ctx.fillRect(-12, -38 + bob, 3, 6);
      ctx.fillRect(9, -38 + bob, 3, 6);
    }

    // Accessories
    if (avatar.accessory === 'glasses' && facing !== 'up') {
      ctx.fillStyle = '#0284c7';
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 1;
      const eyeX = (facing === 'left') ? -7 : (facing === 'right' ? 1 : -5);
      ctx.strokeRect(eyeX - 1, -33 + bob, 5, 5);
      ctx.strokeRect(eyeX + 5, -33 + bob, 5, 5);
      ctx.fillRect(eyeX + 4, -31 + bob, 2, 1);
    } else if (avatar.accessory === 'headset') {
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-12, -36 + bob, 3, 8); // ear cup left
      ctx.fillRect(9, -36 + bob, 3, 8);  // ear cup right
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -38 + bob, 10, Math.PI, 0); // band
      ctx.stroke();
    }

    // Status Balloon Above Head
    const balloonY = -54 + bob;
    if (agent.isBusy) {
      // Typing dots '...' balloon
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-12, balloonY, 24, 14);
      ctx.fillStyle = '#0f172a';
      const dot = (this.tickCount % 30 < 10) ? 1 : (this.tickCount % 30 < 20 ? 2 : 3);
      if (dot >= 1) ctx.fillRect(-7, balloonY + 6, 2, 2);
      if (dot >= 2) ctx.fillRect(-1, balloonY + 6, 2, 2);
      if (dot >= 3) ctx.fillRect(5, balloonY + 6, 2, 2);
    } else if (entity.showDoneBadge) {
      // Green '✓' checkmark balloon
      const bounce = Math.sin(this.tickCount / 5) * 3;
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(0, balloonY + bounce, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('✓', 0, balloonY + bounce + 4);
    }

    // Nametag
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(-34, 8, 68, 16);
    ctx.fillStyle = agent.isBusy ? '#38bdf8' : '#e2e8f0';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(agent.name.split(' ')[0], 0, 20);

    ctx.restore();
  }
}
