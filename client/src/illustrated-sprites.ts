// Illustrated Character Atlas Renderer for Pixel Office Cozy Edition
// Uses /assets/characters-atlas.png (4x4 grid of variants and walk/seated frames)

export interface CharacterVariant {
  id: number;
  name: string;
  desc: string;
  color: string;
}

export const COZY_VARIANTS: CharacterVariant[] = [
  { id: 0, name: 'Mộc', desc: 'Tóc bob · Kẹp hoa · Cardigan sage', color: '#6b9272' },
  { id: 1, name: 'Lam', desc: 'Kính tròn · Áo xanh · Quần tan', color: '#4f7047' },
  { id: 2, name: 'Kai', desc: 'Tai nghe · Hoodie kem · Quần xanh', color: '#5b7947' },
  { id: 3, name: 'An', desc: 'Tóc búi · Cardigan mauve · Túi nâu', color: '#88673d' }
];

let atlasImage: HTMLImageElement | null = null;
let atlasLoadingPromise: Promise<HTMLImageElement> | null = null;

export function loadAtlasImage(): Promise<HTMLImageElement> {
  if (atlasImage && atlasImage.complete && atlasImage.naturalWidth > 0) {
    return Promise.resolve(atlasImage);
  }
  if (atlasLoadingPromise) {
    return atlasLoadingPromise;
  }
  atlasLoadingPromise = new Promise((resolve, reject) => {
    const img = new Image();
    img.src = '/assets/characters-atlas.png';
    img.onload = () => {
      atlasImage = img;
      resolve(img);
    };
    img.onerror = (err) => {
      console.warn('Failed to load characters atlas image from /assets/characters-atlas.png', err);
      // Fallback try relative path
      const img2 = new Image();
      img2.src = 'assets/characters-atlas.png';
      img2.onload = () => {
        atlasImage = img2;
        resolve(img2);
      };
      img2.onerror = reject;
    };
  });
  return atlasLoadingPromise;
}

// Pre-trigger loading
if (typeof window !== 'undefined') {
  loadAtlasImage().catch(() => {});
}

export function getAgentVariant(agent: any): number {
  if (!agent) return 0;
  if (
    typeof agent.avatar?.spriteVariant === 'number' &&
    agent.avatar.spriteVariant >= 0 &&
    agent.avatar.spriteVariant <= 3
  ) {
    return agent.avatar.spriteVariant;
  }
  if (
    typeof agent.spriteVariant === 'number' &&
    agent.spriteVariant >= 0 &&
    agent.spriteVariant <= 3
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
  return Math.abs(hash) % 4;
}

export interface DrawSpriteOptions {
  variant?: number;
  direction?: 'down' | 'up' | 'left' | 'right' | string;
  frame?: number | boolean;
  isWorking?: boolean;
}

/**
 * Draws an illustrated character from the atlas onto any HTMLCanvasElement.
 */
export function drawIllustratedSprite(
  canvas: HTMLCanvasElement,
  options: DrawSpriteOptions = {}
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!atlasImage || !atlasImage.complete || atlasImage.naturalWidth === 0) {
    // If not yet loaded, wait and draw once ready
    loadAtlasImage()
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

  const row = Math.max(0, Math.min(3, Math.trunc(variant)));

  // Frame columns according to atlas.json:
  // 0: front (down)
  // 1: back (up)
  // 2: side frame A
  // 3: side frame B
  let col = 0;
  if (isWorking || direction === 'up') {
    col = 1;
  } else if (direction === 'left' || direction === 'right') {
    const isWalkStep = typeof frame === 'boolean' ? frame : frame % 2 === 1;
    col = isWalkStep ? 2 : 3;
  } else {
    col = 0;
  }

  const cellW = atlasImage.width / 4;
  const cellH = atlasImage.height / 4;

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  if (direction === 'left') {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }

  ctx.drawImage(
    atlasImage,
    col * cellW,
    row * cellH,
    cellW,
    cellH,
    0,
    0,
    canvas.width,
    canvas.height
  );
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
