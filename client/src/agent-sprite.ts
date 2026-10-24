// Enhanced chibi sprite renderer compatible with original ChatGPT reference
// Supports dynamic hairstyles, hair colors, skin tones, accessories, and directions.

export interface AgentSpriteActor {
  index?: number;
  agent: {
    name?: string;
    color?: string;
    avatar?: {
      skinColor?: string;
      hairStyle?: string;
      hairColor?: string;
      clothesColor?: string;
      accessory?: string;
    };
    [key: string]: any;
  };
}

export const SKIN_TONES = [
  { id: 'fair', label: 'Trắng sáng', base: '#f4c39e', shade: '#d69a79', highlight: '#f8d4b1' },
  { id: 'light', label: 'Tự nhiên', base: '#edbb90', shade: '#ce956f', highlight: '#f5cca4' },
  { id: 'tan', label: 'Ấm áp', base: '#e5ac85', shade: '#c48c6d', highlight: '#ebbd9c' },
  { id: 'warm', label: 'Rắn rỏi', base: '#f1c4a5', shade: '#d5a085', highlight: '#f7d3b9' },
  { id: 'deep', label: 'Nâu khỏe', base: '#c98a5e', shade: '#a6693f', highlight: '#d99e74' }
];

export const HAIR_STYLES = [
  { id: 'short', label: 'Ngắn gọn' },
  { id: 'messy', label: 'Đánh rối' },
  { id: 'parted', label: 'Rẽ ngôi' },
  { id: 'long', label: 'Tóc dài' },
  { id: 'bob', label: 'Tóc Bob' },
  { id: 'spiky', label: 'Vuốt nhọn' },
  { id: 'curly', label: 'Uốn xoăn' },
  { id: 'ponytail', label: 'Đuôi ngựa' }
];

export const HAIR_COLORS = [
  { id: 'black', label: 'Đen than', hex: '#1e293b' },
  { id: 'dark-brown', label: 'Nâu sẫm', hex: '#343f42' },
  { id: 'chestnut', label: 'Hạt dẻ', hex: '#684434' },
  { id: 'caramel', label: 'Caramel', hex: '#895a40' },
  { id: 'blonde', label: 'Vàng hoe', hex: '#d97706' },
  { id: 'auburn', label: 'Nâu đỏ', hex: '#b45309' },
  { id: 'teal', label: 'Xanh ngọc', hex: '#0f766e' },
  { id: 'blue', label: 'Xanh dương', hex: '#1d4ed8' },
  { id: 'pink', label: 'Hồng phấn', hex: '#db2777' },
  { id: 'silver', label: 'Bạch kim', hex: '#94a3b8' }
];

export const ACCESSORIES = [
  { id: 'none', label: 'Không' },
  { id: 'glasses', label: 'Kính mắt' },
  { id: 'headset', label: 'Tai nghe dev' },
  { id: 'hairclip', label: 'Kẹp tóc' },
  { id: 'cap', label: 'Nón kết' }
];

export function tintColor(hex: string, d: number): string {
  const cleanHex = hex.startsWith('#') ? hex.slice(1) : hex;
  const fullHex =
    cleanHex.length === 3
      ? cleanHex
          .split('')
          .map((x) => x + x)
          .join('')
      : cleanHex.padEnd(6, '0').slice(0, 6);
  const matches = fullHex.match(/../g) || ['25', '63', 'eb'];
  return (
    '#' +
    matches
      .map((s) => Math.max(0, Math.min(255, parseInt(s, 16) + d)).toString(16).padStart(2, '0'))
      .join('')
  );
}

export function drawAgentSprite(
  canvas: HTMLCanvasElement,
  a: AgentSpriteActor,
  dir: 'down' | 'up' | 'left' | 'right' | string,
  step: number | boolean,
  options?: { isSeated?: boolean; isTyping?: boolean }
): void {
  const c = canvas.getContext('2d');
  if (!c) return;
  c.imageSmoothingEnabled = false;
  c.clearRect(0, 0, 32, 40);

  const kind = Math.abs(a.index ?? 0) % 4;
  const back = dir === 'up';
  const side = dir === 'left' || dir === 'right';
  const flip = dir === 'left';
  const walk = step ? 1 : 0;
  const seated = options?.isSeated || false;
  const typing = options?.isTyping || false;

  // 1. Resolve Colors
  const rawShirt = a.agent.color || a.agent.avatar?.clothesColor || '#2563eb';
  const shirt = rawShirt.startsWith('#') ? rawShirt : '#' + rawShirt;
  const edge = tintColor(shirt, -46);
  const lit = tintColor(shirt, 32);
  const dark = tintColor(shirt, -19);

  // Skin tone
  const customSkin = a.agent.avatar?.skinColor;
  let skin = ['#f4c39e', '#edbb90', '#e5ac85', '#f1c4a5'][kind];
  let skinShade = ['#d69a79', '#ce956f', '#c48c6d', '#d5a085'][kind];
  let skinHighlight = '#f8d4b1';

  if (customSkin) {
    const matched = SKIN_TONES.find((s) => s.base.toLowerCase() === customSkin.toLowerCase());
    if (matched) {
      skin = matched.base;
      skinShade = matched.shade;
      skinHighlight = matched.highlight;
    } else if (customSkin.startsWith('#')) {
      skin = customSkin;
      skinShade = tintColor(customSkin, -32);
      skinHighlight = tintColor(customSkin, 28);
    }
  }

  // Hair style & color
  const hairStyle = a.agent.avatar?.hairStyle || ['short', 'messy', 'parted', 'ponytail'][kind] || 'short';
  const rawHairColor = a.agent.avatar?.hairColor || ['#684434', '#343f42', '#3b3540', '#704934'][kind];
  const hair = rawHairColor.startsWith('#') ? rawHairColor : '#' + rawHairColor;
  const hairMid = tintColor(hair, 26);
  const hairLight = tintColor(hair, 55);
  const outline = '#343a3b';

  // Accessory
  const accessory = a.agent.avatar?.accessory || (kind === 1 ? 'glasses' : kind === 2 ? 'headset' : kind === 0 ? 'hairclip' : 'none');

  const r = (x: number, y: number, w: number, h: number, col: string) => {
    c.fillStyle = col;
    c.fillRect(x, y, w, h);
  };

  // Ground shadow
  if (!seated) {
    r(7, 37, 18, 2, '#344c3926');
    r(10, 36, 12, 3, '#344c391c');
  } else {
    r(8, 36, 16, 2, '#344c391f');
  }

  c.save();
  if (flip) {
    c.translate(32, 0);
    c.scale(-1, 1);
  }
  c.translate(0, seated ? 2 : walk ? -1 : 0);

  // Legs & Shoes
  if (!seated) {
    r(10, 28, 5, 8 - walk, outline);
    r(17, 28, 5, 7 + walk, outline);
    r(11, 29, 3, 5 - walk, '#64777c');
    r(18, 29, 3, 4 + walk, '#64777c');
    r(9, 34 - walk, 7, 3, '#394b50');
    r(17, 34 + walk, 7, 3, '#394b50');
    r(10, 35 - walk, 5, 1, '#f0e5ca');
    r(18, 35 + walk, 5, 1, '#f0e5ca');
  } else {
    // Seated legs
    r(10, 30, 5, 4, outline);
    r(17, 30, 5, 4, outline);
    r(11, 30, 3, 3, '#64777c');
    r(18, 30, 3, 3, '#64777c');
    r(10, 33, 5, 2, '#394b50');
    r(17, 33, 5, 2, '#394b50');
  }

  // Torso / Outfit
  r(10, 20, 12, 2, edge);
  r(8, 22, 16, 8, edge);
  r(10, 21, 12, 8, shirt);
  r(11, 22, 3, 6, lit);
  r(20, 23, 3, 6, dark);
  r(10, 29, 12, 2, dark);

  // Arms and hands
  if (typing) {
    // Typing forward hands with tiny key bounce
    const tShift = Math.floor(Date.now() / 150) % 2;
    r(7, 23, 3, 4, shirt);
    r(22, 23, 3, 4, lit);
    r(8, 26 + tShift, 4, 3, skin);
    r(20, 27 - tShift, 4, 3, skin);
  } else {
    // Normal arms swinging or resting
    r(6, 23 + (seated ? 0 : walk), 3, 6, edge);
    r(7, 24 + (seated ? 0 : walk), 3, 4, shirt);
    r(23, 23 - (seated ? 0 : walk), 3, 6, edge);
    r(22, 24 - (seated ? 0 : walk), 3, 4, lit);
    r(7, 28 + (seated ? 0 : walk), 3, 3, skinShade);
    r(7, 28 + (seated ? 0 : walk), 2, 2, skin);
    r(23, 28 - (seated ? 0 : walk), 3, 3, skinShade);
    r(23, 28 - (seated ? 0 : walk), 2, 2, skin);
  }

  // Outfit collar / details
  r(14, 21, 4, 3, '#f1dec4');
  r(15, 23, 2, 3, '#d8c7a9');
  r(11, 25, 2, 1, '#ede2c9');

  // Head Silhouette Base
  r(10, 3, 12, 1, outline);
  r(7, 4, 18, 2, outline);
  r(5, 6, 22, 10, outline);

  // Hair Back Layer (Behind head)
  if (back) {
    r(6, 6, 20, 14, hair);
    r(7, 5, 18, 5, hair);
    r(8, 6, 15, 4, hairMid);
    r(10, 6, 8, 1, hairLight);
    r(7, 10, 2, 7, hairMid);
    r(23, 9, 2, 8, hairMid);
    r(10, 18, 12, 3, hair);
    r(12, 21, 8, 1, skinShade);

    if (hairStyle === 'long') {
      r(6, 16, 20, 9, hair);
      r(7, 20, 4, 6, hairMid);
      r(21, 20, 4, 6, hairMid);
    } else if (hairStyle === 'ponytail') {
      r(14, 0, 4, 3, hairMid);
      r(13, 2, 6, 7, hair);
      r(15, 9, 3, 8, hairMid);
      r(14, 5, 4, 2, '#e06666'); // hair tie
    } else if (hairStyle === 'curly') {
      r(4, 7, 3, 11, hairMid);
      r(25, 7, 3, 11, hairMid);
      r(8, 18, 16, 4, hair);
    } else if (hairStyle === 'spiky') {
      r(8, 1, 4, 3, hair);
      r(14, 0, 4, 4, hairMid);
      r(20, 1, 4, 3, hair);
    }
  } else {
    // Face Planes, Ears & Chin
    r(6, 6, 20, 11, hair);
    r(7, 5, 18, 4, hair);
    r(10, 4, 12, 2, hairMid);

    r(7, 11, 18, 7, skinShade);
    r(8, 10, 16, 8, skin);
    r(10, 18, 12, 2, skin);
    r(12, 20, 8, 1, skinShade);
    r(6, 12, 2, 4, skin);
    r(24, 12, 2, 4, skinShade);
    r(9, 10, 13, 2, skinHighlight);

    if (side) {
      // Side Face
      r(7, 7, 9, 11, hair);
      r(8, 7, 5, 8, hairMid);
      r(9, 7, 3, 1, hairLight);
      r(16, 8, 7, 3, hair);
      r(15, 10, 3, 3, hair);
      r(21, 13, 3, 4, '#3f3c40');
      r(21, 13, 1, 1, '#fff7df');
      r(24, 15, 2, 2, skin);
      r(19, 17, 4, 1, '#e4a092');
      r(21, 19, 2, 1, '#a66c61');

      // Hairstyle variations for side
      if (hairStyle === 'long') {
        r(5, 12, 5, 13, hair);
        r(6, 16, 3, 9, hairMid);
      } else if (hairStyle === 'ponytail') {
        r(4, 7, 4, 5, hair);
        r(2, 10, 4, 6, hairMid);
        r(5, 8, 2, 2, '#e06666'); // tie
      } else if (hairStyle === 'bob') {
        r(5, 11, 7, 9, hair);
        r(6, 14, 5, 6, hairMid);
      }
    } else {
      // Front Face: Eyes, Cheeks, Mouth
      r(10, 12, 3, 1, '#7c5b50');
      r(19, 12, 3, 1, '#7c5b50');
      r(10, 13, 3, 4, '#383d40');
      r(19, 13, 3, 4, '#383d40');
      r(10, 13, 1, 1, '#fff9e8');
      r(19, 13, 1, 1, '#fff9e8');
      r(11, 16, 2, 1, '#786855');
      r(20, 16, 2, 1, '#786855');
      r(8, 17, 3, 1, '#e9a397');
      r(22, 17, 3, 1, '#e9a397');
      r(15, 17, 2, 1, '#dc9f7b');
      r(14, 19, 4, 1, '#a76a60');
      r(15, 19, 2, 1, '#c57c6d');

      // Hairstyle variations for front view
      if (hairStyle === 'short') {
        r(7, 7, 17, 3, hair);
        r(8, 6, 14, 2, hairMid);
        r(9, 6, 8, 1, hairLight);
        r(7, 9, 4, 3, hair);
        r(14, 8, 4, 2, hair);
        r(21, 9, 4, 3, hair);
      } else if (hairStyle === 'messy') {
        r(6, 4, 4, 4, hairMid);
        r(13, 3, 6, 4, hairMid);
        r(21, 4, 5, 4, hairMid);
        r(7, 7, 18, 4, hair);
        r(9, 9, 5, 3, hair);
        r(17, 9, 6, 3, hair);
        r(23, 10, 2, 4, hair);
      } else if (hairStyle === 'parted') {
        r(7, 6, 18, 3, hair);
        r(8, 7, 6, 4, hairMid);
        r(18, 7, 7, 4, hairMid);
        r(14, 7, 2, 1, skin); // Part line
        r(6, 10, 3, 5, hair);
        r(23, 10, 3, 5, hair);
      } else if (hairStyle === 'long') {
        r(7, 7, 18, 3, hair);
        r(8, 6, 14, 2, hairMid);
        r(4, 11, 4, 14, hair);
        r(5, 14, 2, 11, hairMid);
        r(24, 11, 4, 14, hair);
        r(25, 14, 2, 11, hairMid);
      } else if (hairStyle === 'bob') {
        r(7, 7, 18, 4, hair);
        r(8, 6, 14, 2, hairMid);
        r(5, 10, 4, 10, hair);
        r(23, 10, 4, 10, hair);
        r(6, 18, 3, 2, hairMid);
        r(23, 18, 3, 2, hairMid);
      } else if (hairStyle === 'spiky') {
        r(7, 2, 3, 5, hairMid);
        r(12, 1, 4, 6, hairMid);
        r(17, 1, 4, 6, hairLight);
        r(22, 2, 3, 5, hairMid);
        r(7, 7, 18, 4, hair);
        r(8, 9, 4, 3, hair);
        r(15, 9, 4, 3, hair);
      } else if (hairStyle === 'curly') {
        r(5, 4, 6, 5, hairMid);
        r(13, 3, 7, 5, hairMid);
        r(21, 4, 6, 5, hairMid);
        r(4, 9, 4, 8, hair);
        r(24, 9, 4, 8, hair);
        r(7, 8, 18, 4, hair);
        r(9, 10, 4, 3, hair);
        r(19, 10, 4, 3, hair);
      } else if (hairStyle === 'ponytail') {
        r(14, 0, 4, 3, hairMid);
        r(13, 2, 6, 5, hair);
        r(14, 5, 4, 2, '#e06666'); // cute hair tie
        r(7, 7, 18, 3, hair);
        r(8, 6, 14, 2, hairMid);
        r(7, 9, 4, 4, hair);
        r(22, 9, 3, 4, hair);
      }
    }
  }

  // 4. Accessories Layer
  if (accessory === 'glasses') {
    if (!back) {
      if (side) {
        r(19, 12, 6, 1, '#1e293b');
        r(19, 12, 1, 5, '#1e293b');
        r(19, 16, 6, 1, '#1e293b');
        r(20, 13, 4, 3, '#93c5fd33');
      } else {
        // Front glasses frames
        r(9, 12, 5, 1, '#1e293b');
        r(18, 12, 5, 1, '#1e293b');
        r(8, 13, 1, 4, '#1e293b');
        r(14, 13, 1, 4, '#1e293b');
        r(17, 13, 1, 4, '#1e293b');
        r(23, 13, 1, 4, '#1e293b');
        r(9, 17, 5, 1, '#1e293b');
        r(18, 17, 5, 1, '#1e293b');
        r(15, 14, 2, 1, '#1e293b'); // bridge
        r(9, 13, 4, 3, '#93c5fd26'); // lens shine
        r(18, 13, 4, 3, '#93c5fd26');
      }
    }
  } else if (accessory === 'headset') {
    // Headband across crown
    r(7, 3, 18, 2, '#334155');
    r(8, 2, 16, 1, '#64748b');
    // Left ear cup
    r(4, 10, 4, 7, '#0f172a');
    r(5, 11, 2, 5, '#38bdf8');
    // Right ear cup
    r(24, 10, 4, 7, '#0f172a');
    r(25, 11, 2, 5, '#38bdf8');
    // Mic boom if front or side
    if (!back && !side) {
      r(7, 17, 1, 3, '#334155');
      r(8, 19, 3, 1, '#334155');
      r(11, 18, 2, 2, '#38bdf8');
    }
  } else if (accessory === 'hairclip') {
    if (!back) {
      const clipX = side ? 15 : 20;
      r(clipX, 7, 4, 2, '#f43f5e');
      r(clipX + 1, 6, 2, 4, '#fb7185');
      r(clipX + 1, 7, 2, 2, '#fff');
    }
  } else if (accessory === 'cap') {
    // Cap crown
    r(7, 3, 18, 5, '#dc2626');
    r(8, 2, 16, 2, '#ef4444');
    r(14, 1, 4, 2, '#ffffff'); // button on top
    if (side) {
      // Visor projecting forward
      r(21, 7, 7, 2, '#991b1b');
    } else if (!back) {
      // Front curved visor
      r(6, 7, 20, 2, '#991b1b');
      r(8, 8, 16, 1, '#7f1d1d');
    } else {
      // Back snapback opening
      r(13, 6, 6, 2, skinShade);
    }
  }

  c.restore();
}
