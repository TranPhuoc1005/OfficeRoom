// Reusable renderer. Load the bundled PNG; no runtime/backend dependencies.
export async function loadIllustratedSprites(url) {
  const image = new Image();
  await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; image.src = url; });
  return {
    image,
    draw(canvas, { variant = 0, direction = 'down', frame = 0 } = {}) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const row = Math.max(0, Math.min(3, Math.trunc(variant)));
      const col = direction === 'up' ? 1 : ['left', 'right'].includes(direction) ? (frame % 2 ? 2 : 3) : 0;
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      if (direction === 'left') { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
      const w = image.width / 4, h = image.height / 4;
      ctx.drawImage(image, col * w, row * h, w, h, 0, 0, canvas.width, canvas.height);
      ctx.restore();
    }
  };
}
