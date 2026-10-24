// Exact chibi sprite renderer from ChatGPT reference (pixel-office-fullscreen/components/agent-sprite.js)
export interface AgentSpriteActor {
  index: number;
  agent: {
    color?: string;
    avatar?: {
      clothesColor?: string;
    };
    [key: string]: any;
  };
}

export function drawAgentSprite(
  canvas: HTMLCanvasElement,
  a: AgentSpriteActor,
  dir: 'down' | 'up' | 'left' | 'right' | string,
  step: number | boolean
): void {
  const c = canvas.getContext('2d');
  if (!c) return;
  c.imageSmoothingEnabled = false;
  c.clearRect(0, 0, 32, 40);

  const kind = Math.abs(a.index) % 4;
  const back = dir === 'up';
  const side = dir === 'left' || dir === 'right';
  const flip = dir === 'left';
  const walk = step ? 1 : 0;

  const tint = (hex: string, d: number) => {
    const cleanHex = hex.startsWith('#') ? hex.slice(1) : hex;
    const fullHex = cleanHex.length === 3
      ? cleanHex.split('').map(x => x + x).join('')
      : cleanHex.padEnd(6, '0').slice(0, 6);
    const matches = fullHex.match(/../g) || ['25', '63', 'eb'];
    return '#' + matches.map(s => Math.max(0, Math.min(255, parseInt(s, 16) + d)).toString(16).padStart(2, '0')).join('');
  };

  const rawColor = a.agent.color || a.agent.avatar?.clothesColor || '#2563eb';
  const shirt = rawColor.startsWith('#') ? rawColor : '#' + rawColor;
  const edge = tint(shirt, -46);
  const lit = tint(shirt, 32);
  const dark = tint(shirt, -19);

  const skin = ['#f4c39e', '#edbb90', '#e5ac85', '#f1c4a5'][kind];
  const skinShade = ['#d69a79', '#ce956f', '#c48c6d', '#d5a085'][kind];
  const hair = ['#684434', '#343f42', '#3b3540', '#704934'][kind];
  const hairMid = ['#895a40', '#53605b', '#575064', '#956347'][kind];
  const hairLight = ['#b17b50', '#748279', '#766b7f', '#ba885c'][kind];
  const outline = '#343a3b';

  const r = (x: number, y: number, w: number, h: number, col: string) => {
    c.fillStyle = col;
    c.fillRect(x, y, w, h);
  };

  // Ground shadow and a subtle one-pixel walking bounce
  r(7, 37, 18, 2, '#344c3926');
  r(10, 36, 12, 3, '#344c391c');

  c.save();
  if (flip) {
    c.translate(32, 0);
    c.scale(-1, 1);
  }
  c.translate(0, walk ? -1 : 0);

  // Short legs and contrasting shoes
  r(10, 28, 5, 8 - walk, outline);
  r(17, 28, 5, 7 + walk, outline);
  r(11, 29, 3, 5 - walk, '#64777c');
  r(18, 29, 3, 4 + walk, '#64777c');
  r(9, 34 - walk, 7, 3, '#394b50');
  r(17, 34 + walk, 7, 3, '#394b50');
  r(10, 35 - walk, 5, 1, '#f0e5ca');
  r(18, 35 + walk, 5, 1, '#f0e5ca');

  // Hoodie, cardigan or shirt silhouette; tiny hands swing in opposition
  r(10, 20, 12, 2, edge);
  r(8, 22, 16, 8, edge);
  r(10, 21, 12, 8, shirt);
  r(11, 22, 3, 6, lit);
  r(20, 23, 3, 6, dark);
  r(10, 29, 12, 2, dark);
  r(6, 23 + walk, 3, 6, edge);
  r(7, 24 + walk, 3, 4, shirt);
  r(23, 23 - walk, 3, 6, edge);
  r(22, 24 - walk, 3, 4, lit);
  r(7, 28 + walk, 3, 3, skinShade);
  r(7, 28 + walk, 2, 2, skin);
  r(23, 28 - walk, 3, 3, skinShade);
  r(23, 28 - walk, 2, 2, skin);

  if (kind === 0) {
    r(14, 21, 4, 3, '#f1dec4');
    r(15, 23, 2, 4, '#d8c7a9');
    r(10, 28, 12, 2, '#4f6d57');
  }
  if (kind === 1) {
    r(14, 21, 4, 4, '#f7e8cc');
    r(15, 23, 2, 5, '#947157');
    r(11, 25, 2, 1, '#ede2c9');
    r(10, 29, 12, 1, '#715e4c');
  }
  if (kind === 2) {
    r(12, 21, 8, 3, dark);
    r(13, 22, 6, 2, '#e0deca');
    r(12, 24, 1, 4, '#e6dfc4');
    r(19, 24, 1, 4, '#e6dfc4');
    r(13, 28, 6, 1, dark);
  }
  if (kind === 3) {
    r(13, 21, 6, 8, '#efe1ce');
    r(12, 22, 2, 8, lit);
    r(19, 22, 2, 8, dark);
    r(19, 24, 1, 1, '#d8ba87');
    r(19, 27, 1, 1, '#d8ba87');
  }

  // Distinct hair silhouette behind the face
  if (kind === 3) {
    r(18, 0, 7, 2, hair);
    r(17, 2, 10, 5, outline);
    r(18, 2, 8, 5, hair);
    r(19, 2, 4, 2, hairMid);
    r(18, 7, 6, 2, '#d8ac75');
  }
  r(10, 3, 12, 1, outline);
  r(7, 4, 18, 2, outline);
  r(5, 6, 22, 10, outline);
  r(6, 6, 20, 11, hair);
  r(7, 5, 18, 4, hair);
  r(10, 4, 12, 2, hairMid);
  if (kind === 0) {
    r(5, 12, 4, 9, hair);
    r(23, 12, 4, 9, hair);
    r(7, 20, 3, 2, hairMid);
    r(22, 20, 3, 2, hairMid);
  }

  if (back) {
    r(7, 8, 18, 10, hair);
    r(8, 6, 15, 4, hairMid);
    r(10, 6, 8, 1, hairLight);
    r(7, 10, 2, 5, hairMid);
    r(23, 9, 2, 6, hairMid);
    r(10, 18, 12, 2, hair);
    r(12, 20, 8, 1, skinShade);
    if (kind === 0) {
      r(7, 17, 3, 5, hairMid);
      r(22, 16, 3, 6, hairMid);
      r(22, 9, 3, 2, '#e3bd72');
    }
    if (kind === 2) {
      r(5, 8, 2, 9, '#303d4b');
      r(25, 8, 2, 9, '#303d4b');
      r(7, 4, 18, 2, '#a5bdba');
      r(6, 7, 2, 7, '#88a6a3');
      r(24, 7, 2, 7, '#88a6a3');
    }
  } else {
    // Soft face planes, ears and chin
    r(7, 11, 18, 7, skinShade);
    r(8, 10, 16, 8, skin);
    r(10, 18, 12, 2, skin);
    r(12, 20, 8, 1, skinShade);
    r(6, 12, 2, 4, skin);
    r(24, 12, 2, 4, skinShade);
    r(9, 10, 13, 2, '#f8d4b1');

    if (side) {
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
      if (kind === 1) {
        r(19, 12, 6, 1, '#515652');
        r(19, 12, 1, 5, '#515652');
        r(19, 16, 6, 1, '#515652');
      }
    } else {
      // Large readable eyes, reflected light and rosy cheeks
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
      // Side-swept fringe, layers and individual highlights
      r(7, 7, 17, 3, hair);
      r(8, 6, 14, 2, hairMid);
      r(9, 6, 8, 1, hairLight);
      r(7, 9, 4, 4, hair);
      r(10, 9, 4, 2, hair);
      r(14, 8, 4, 2, hair);
      r(22, 8, 3, 5, hair);
      r(23, 12, 2, 2, hairMid);
      if (kind === 0) {
        r(8, 8, 3, 6, hairMid);
        r(12, 8, 2, 3, hairMid);
        r(20, 7, 4, 2, '#ddba72');
        r(21, 6, 2, 4, '#f4d9a2');
      }
      if (kind === 1) {
        r(7, 5, 5, 3, hairMid);
        r(8, 4, 3, 1, hairLight);
        r(9, 12, 5, 1, '#515652');
        r(18, 12, 5, 1, '#515652');
        r(8, 13, 1, 4, '#515652');
        r(14, 13, 1, 4, '#515652');
        r(17, 13, 1, 4, '#515652');
        r(23, 13, 1, 4, '#515652');
        r(9, 17, 5, 1, '#515652');
        r(18, 17, 5, 1, '#515652');
        r(15, 14, 2, 1, '#515652');
      }
      if (kind === 3) {
        r(9, 8, 4, 3, hairMid);
        r(12, 8, 3, 2, hairLight);
        r(23, 17, 1, 2, '#e6be73');
      }
    }

    if (kind === 2) {
      r(6, 6, 2, 8, '#a9c1bc');
      r(7, 4, 18, 2, '#a9c1bc');
      r(24, 6, 2, 8, '#a9c1bc');
      r(4, 11, 4, 7, '#344450');
      r(5, 12, 2, 4, '#83a6aa');
      r(24, 11, 4, 7, '#344450');
      r(25, 12, 2, 4, '#83a6aa');
    }
  }

  c.restore();
}
