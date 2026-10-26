// Illustrated Character Atlas Renderer for Pixel Office Cozy Edition
// Uses sprite-regions.json and official character atlases (all 8 variants)

export interface CharacterVariant {
  id: number;
  name: string;
  desc: string;
  color: string;
}

export const COZY_VARIANTS: CharacterVariant[] = [
  { id: 0, name: 'Mộc', desc: 'Tóc bob · Kẹp hoa · Cardigan sage', color: '#6b9272' },
  { id: 1, name: 'Lam', desc: 'Kính tròn · Sơ mi xanh · Quần tan', color: '#4f7047' },
  { id: 2, name: 'Kai', desc: 'Tai nghe · Hoodie kem · Quần xanh', color: '#5b7947' },
  { id: 3, name: 'An', desc: 'Tóc búi · Áo tím pastel · Túi nâu', color: '#88673d' },
  { id: 4, name: 'Hạ', desc: 'Tóc lavender · Bomber cá tính', color: '#7c5ba6' },
  { id: 5, name: 'Kim', desc: 'Tóc vàng · Blazer thanh lịch', color: '#b38b67' },
  { id: 6, name: 'Linh', desc: 'Đuôi ngựa · Hoodie thể thao', color: '#3f72af' },
  { id: 7, name: 'Bách', desc: 'Tóc bạc · Tai nghe chuyên gia', color: '#5c715e' }
];

let atlasImg: HTMLImageElement | null = null;
let styleAtlasImg: HTMLImageElement | null = null;
let walkAtlasImg: HTMLImageElement | null = null;
let spriteMeta: any = null;
let loadingPromise: Promise<void> | null = null;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = src;
    img.onload = () => resolve(img);
    img.onerror = () => {
      // Fallback without leading slash
      const img2 = new Image();
      img2.src = src.startsWith('/') ? src.slice(1) : src;
      img2.onload = () => resolve(img2);
      img2.onerror = reject;
    };
  });
}

export function ensureLoaded(): Promise<void> {
  if (spriteMeta && atlasImg && styleAtlasImg && walkAtlasImg) {
    return Promise.resolve();
  }
  if (loadingPromise) return loadingPromise;

  loadingPromise = Promise.all([
    fetch('/assets/sprite-regions.json')
      .then((r) => r.json())
      .then((m) => {
        spriteMeta = m;
      })
      .catch((err) => {
        console.warn('Failed to load sprite-regions.json', err);
      }),
    loadImage('/assets/characters-atlas.png').then((img) => {
      atlasImg = img;
    }),
    loadImage('/assets/character-styles.png').then((img) => {
      styleAtlasImg = img;
    }),
    loadImage('/assets/walk-cycle.png')
      .then((img) => {
        walkAtlasImg = img;
      })
      .catch(() => {})
  ]).then(() => {});

  return loadingPromise;
}

// Pre-trigger loading
if (typeof window !== 'undefined') {
  ensureLoaded().catch(() => {});
}

export function getAgentVariant(agent: any): number {
  if (!agent) return 0;
  if (
    typeof agent.avatar?.spriteVariant === 'number' &&
    agent.avatar.spriteVariant >= 0 &&
    agent.avatar.spriteVariant < 8
  ) {
    return agent.avatar.spriteVariant;
  }
  if (
    typeof agent.spriteVariant === 'number' &&
    agent.spriteVariant >= 0 &&
    agent.spriteVariant < 8
  ) {
    return agent.spriteVariant;
  }

  // Stable fallback hash based on agent ID or name
  const seed = String(agent.id || agent.name || 'agent-0');
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 8;
}

export interface DrawSpriteOptions {
  variant?: number;
  direction?: 'down' | 'up' | 'left' | 'right' | string;
  frame?: number | boolean;
  isWorking?: boolean;
}

/**
 * Draws an illustrated character using sprite-regions.json onto any HTMLCanvasElement.
 */
export function drawIllustratedSprite(
  canvas: HTMLCanvasElement,
  options: DrawSpriteOptions = {}
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!spriteMeta || !atlasImg || !styleAtlasImg) {
    ensureLoaded()
      .then(() => drawIllustratedSprite(canvas, options))
      .catch(() => {});
    return;
  }

  const {
    variant = 0,
    direction = 'down',
    frame = 0,
    isWorking = false
  } = options;

  const v = Math.max(0, Math.min(7, Math.floor(variant)));
  const moving = typeof frame === 'boolean' ? frame : frame > 0;
  const phase = typeof frame === 'number' ? frame : (moving ? 1 : 0);
  const side = direction === 'left' || direction === 'right';

  let img: HTMLImageElement | null = null;
  let rect: [number, number, number, number] | null = null;

  if (v < 4) {
    if (moving && walkAtlasImg && v < 3 && spriteMeta.walk) {
      img = walkAtlasImg;
      rect = spriteMeta.walk[v][Math.floor(phase) % 8];
    } else {
      img = atlasImg;
      const stepIdx = moving
        ? 2 + (Math.floor(phase / 2) % 2)
        : direction === 'up' || isWorking
        ? 1
        : side
        ? 2
        : 0;
      rect = spriteMeta.idle[v][stepIdx];
    }
  } else {
    img = styleAtlasImg;
    const stepIdx = moving
      ? 2 + (Math.floor(phase / 2) % 2)
      : direction === 'up' || isWorking
      ? 1
      : 0;
    rect = spriteMeta.styles[v - 4][stepIdx];
  }

  if (!rect || !img) return;

  const [x, y, w, h] = rect;
  const scale = Math.min((canvas.width * 0.86) / w, (canvas.height * 0.94) / h);
  const dw = w * scale;
  const dh = h * scale;

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  if (direction === 'left') {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }

  ctx.drawImage(img, x, y, w, h, (canvas.width - dw) / 2, canvas.height - dh, dw, dh);
  ctx.restore();
}

/**
 * Draws portrait/avatar frame (front pose) on a 256x256 canvas
 */
export function drawIllustratedPortrait(canvas: HTMLCanvasElement, variant: number): void {
  drawIllustratedSprite(canvas, {
    variant,
    direction: 'down',
    frame: 0
  });
}
