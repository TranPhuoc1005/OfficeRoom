// Procedural Pixel Art Furniture Catalog & Definitions for Pixel Office
// Original design inspired by social management games, strictly free of copied assets.

export type FurnitureCategory =
  | 'all'
  | 'desk'
  | 'chair'
  | 'plant'
  | 'rug'
  | 'sofa'
  | 'storage'
  | 'refreshment'
  | 'decor';

export interface FurnitureDefinition {
  type: string;
  name: string;
  category: FurnitureCategory;
  w: number; // Width in 16px grid cells
  h: number; // Height in 16px grid cells
  isObstacle: boolean;
  isDesk?: boolean;
  isSeat?: boolean;
  isRestStop?: boolean; // sofa / water / coffee / bookshelf where idle agents can visit!
  icon: string;
  description: string;
  draw: (
    ctx: CanvasRenderingContext2D,
    x: number, // canvas pixel x
    y: number, // canvas pixel y
    w: number, // canvas pixel w
    h: number, // canvas pixel h
    variant?: number,
    extra?: { assignedAgentName?: string; isWorking?: boolean }
  ) => void;
}

export interface PlacedFurniture {
  id: string;
  type: string;
  gx: number; // grid x (cell coordinate: 0..COLS)
  gy: number; // grid y (cell coordinate: 0..ROWS)
  assignedAgentId?: string | null;
  variant?: number;
}

// Utility pixel drawing helper
const rect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, col: string) => {
  ctx.fillStyle = col;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
};

export const FURNITURE_CATALOG: FurnitureDefinition[] = [
  // 1. DESKS
  {
    type: 'desk-wood',
    name: 'Bàn làm việc Gỗ sồi',
    category: 'desk',
    w: 6, // 96px
    h: 5, // 80px (desk 58px + chair clearance 22px)
    isObstacle: true,
    isDesk: true,
    icon: '🖥️',
    description: 'Bàn làm việc phong cách gỗ ấm cúng có màn hình, bàn phím và bảng tên chủ bàn.',
    draw: (ctx, x, y, _w, _h, _variant, extra) => {
      // Main desk wooden body
      rect(ctx, x, y + 14, 96, 37, '#a98359');
      rect(ctx, x, y + 6, 96, 39, '#bd996e');
      rect(ctx, x + 2, y + 6, 92, 4, '#e3bd87');
      // Legs
      rect(ctx, x + 2, y + 43, 5, 15, '#93734e');
      rect(ctx, x + 89, y + 43, 5, 15, '#93734e');
      // Monitor & Screen
      rect(ctx, x + 27, y + 12, 42, 28, '#4c5953');
      const screenColor = extra?.isWorking ? '#38bdf8' : '#aec2a0';
      rect(ctx, x + 30, y + 14, 36, 21, screenColor);
      // Code / text lines on screen
      rect(ctx, x + 33, y + 17, 24, 2, extra?.isWorking ? '#ffffff' : '#e1e8bb');
      rect(ctx, x + 33, y + 22, 16, 2, extra?.isWorking ? '#bae6fd' : '#7f9e82');
      rect(ctx, x + 33, y + 27, 22, 2, extra?.isWorking ? '#ffffff' : '#d2ddb4');
      // Monitor stand
      rect(ctx, x + 45, y + 38, 6, 7, '#606e5a');
      // Keyboard
      rect(ctx, x + 32, y + 44, 32, 4, '#e6dcb4');
      for (let i = 0; i < 6; i++) {
        rect(ctx, x + 34 + i * 5, y + 45, 2, 2, '#8e967e');
      }
      // Mouse pad & mouse
      rect(ctx, x + 70, y + 44, 10, 6, '#475569');
      rect(ctx, x + 73, y + 45, 4, 4, '#e2e8f0');
      // Coffee mug
      rect(ctx, x + 77, y + 32, 9, 10, '#fff0cd');
      rect(ctx, x + 86, y + 34, 3, 5, '#d3b68b');
      // Documents / notebook
      rect(ctx, x + 8, y + 28, 14, 19, '#ddd3a7');
      rect(ctx, x + 10, y + 31, 10, 1, '#ad9e79');
      rect(ctx, x + 10, y + 35, 10, 1, '#ad9e79');
      // Chair behind desk
      rect(ctx, x + 31, y + 66, 34, 14, '#6c806b');
      rect(ctx, x + 28, y + 64, 40, 6, '#93a086');

      // Desk Owner Badge / Name Tag
      if (extra?.assignedAgentName) {
        ctx.save();
        ctx.fillStyle = 'rgba(30, 41, 59, 0.9)';
        ctx.fillRect(x + 12, y + 54, 72, 14);
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 12.5, y + 54.5, 71, 13);
        ctx.fillStyle = '#fef08a';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(extra.assignedAgentName.slice(0, 10), x + 48, y + 61);
        ctx.restore();
      }
    }
  },
  {
    type: 'desk-modern',
    name: 'Bàn Dev Dual Monitor',
    category: 'desk',
    w: 6,
    h: 5,
    isObstacle: true,
    isDesk: true,
    icon: '🖥️',
    description: 'Bàn lập trình viên cao cấp với hệ thống 2 màn hình kép và bàn phím cơ.',
    draw: (ctx, x, y, _w, _h, _variant, extra) => {
      // Dark slate tabletop
      rect(ctx, x, y + 14, 96, 37, '#1e293b');
      rect(ctx, x, y + 6, 96, 39, '#334155');
      rect(ctx, x + 2, y + 6, 92, 3, '#64748b');
      // Metal legs
      rect(ctx, x + 2, y + 43, 5, 15, '#0f172a');
      rect(ctx, x + 89, y + 43, 5, 15, '#0f172a');
      // Left Monitor
      rect(ctx, x + 12, y + 10, 34, 25, '#0f172a');
      rect(ctx, x + 14, y + 12, 30, 19, extra?.isWorking ? '#22c55e' : '#1e3a8a');
      rect(ctx, x + 17, y + 15, 16, 2, '#ffffff');
      rect(ctx, x + 17, y + 19, 22, 2, '#93c5fd');
      // Right Monitor
      rect(ctx, x + 50, y + 10, 34, 25, '#0f172a');
      rect(ctx, x + 52, y + 12, 30, 19, extra?.isWorking ? '#38bdf8' : '#047857');
      rect(ctx, x + 55, y + 15, 20, 2, '#ffffff');
      rect(ctx, x + 55, y + 19, 14, 2, '#a7f3d0');
      // Mechanical Keyboard with RGB light
      rect(ctx, x + 31, y + 42, 34, 5, '#0f172a');
      rect(ctx, x + 32, y + 43, 32, 2, extra?.isWorking ? '#ec4899' : '#38bdf8');
      // Swivel Chair
      rect(ctx, x + 31, y + 65, 34, 15, '#1e293b');
      rect(ctx, x + 28, y + 63, 40, 6, '#475569');

      // Desk Owner Badge
      if (extra?.assignedAgentName) {
        ctx.save();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
        ctx.fillRect(x + 12, y + 53, 72, 14);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 12.5, y + 53.5, 71, 13);
        ctx.fillStyle = '#bae6fd';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(extra.assignedAgentName.slice(0, 10), x + 48, y + 60);
        ctx.restore();
      }
    }
  },

  // 2. CHAIRS & ARMCHAIRS
  {
    type: 'chair-swivel',
    name: 'Ghế xoay văn phòng',
    category: 'chair',
    w: 2,
    h: 2,
    isObstacle: true,
    isSeat: true,
    icon: '💺',
    description: 'Ghế xoay công thái học êm ái có bánh xe.',
    draw: (ctx, x, y) => {
      // Base wheels
      rect(ctx, x + 6, y + 26, 20, 3, '#334155');
      rect(ctx, x + 14, y + 21, 4, 6, '#64748b');
      // Seat cushion
      rect(ctx, x + 4, y + 15, 24, 7, '#2563eb');
      rect(ctx, x + 6, y + 13, 20, 3, '#60a5fa');
      // Backrest
      rect(ctx, x + 5, y + 3, 22, 11, '#1d4ed8');
      rect(ctx, x + 7, y + 4, 18, 4, '#3b82f6');
      // Armrests
      rect(ctx, x + 2, y + 10, 3, 8, '#1e293b');
      rect(ctx, x + 27, y + 10, 3, 8, '#1e293b');
    }
  },
  {
    type: 'chair-armchair',
    name: 'Ghế bành thư giãn',
    category: 'chair',
    w: 3,
    h: 3,
    isObstacle: true,
    isSeat: true,
    isRestStop: true,
    icon: '🛋️',
    description: 'Ghế bành đơn da ấm cúng cho góc đọc sách.',
    draw: (ctx, x, y) => {
      // Wooden feet
      rect(ctx, x + 6, y + 40, 5, 6, '#78350f');
      rect(ctx, x + 37, y + 40, 5, 6, '#78350f');
      // Deep cushion
      rect(ctx, x + 4, y + 22, 40, 19, '#b45309');
      rect(ctx, x + 7, y + 24, 34, 14, '#d97706');
      // High backrest
      rect(ctx, x + 6, y + 5, 36, 19, '#92400e');
      rect(ctx, x + 9, y + 7, 30, 15, '#b45309');
      // Thick padded arms
      rect(ctx, x + 1, y + 15, 8, 23, '#78350f');
      rect(ctx, x + 39, y + 15, 8, 23, '#78350f');
    }
  },

  // 3. PLANTS & GREENERY
  {
    type: 'plant-monstera',
    name: 'Cây trầu bà Monstera',
    category: 'plant',
    w: 2,
    h: 3,
    isObstacle: true,
    icon: '🪴',
    description: 'Chậu trầu bà Nam Mỹ lá to xanh mướt thanh lọc không khí.',
    draw: (ctx, x, y) => {
      // Ceramic pot
      rect(ctx, x + 6, y + 32, 20, 14, '#c2410c');
      rect(ctx, x + 4, y + 30, 24, 4, '#ea580c');
      rect(ctx, x + 8, y + 34, 16, 10, '#9a3412');
      // Soil
      rect(ctx, x + 6, y + 29, 20, 3, '#451a03');
      // Stems & Leaves
      rect(ctx, x + 14, y + 10, 4, 20, '#15803d');
      rect(ctx, x + 2, y + 8, 12, 14, '#16a34a');
      rect(ctx, x + 18, y + 4, 12, 14, '#22c55e');
      rect(ctx, x + 8, y + 2, 14, 12, '#4ade80');
      // Leaf cutouts (Monstera holes)
      rect(ctx, x + 5, y + 12, 3, 2, '#15803d');
      rect(ctx, x + 22, y + 8, 3, 2, '#16a34a');
    }
  },
  {
    type: 'plant-succulent',
    name: 'Chậu sen đá mini',
    category: 'plant',
    w: 1,
    h: 2,
    isObstacle: false,
    icon: '🌵',
    description: 'Chậu sen đá để bàn xinh xắn.',
    draw: (ctx, x, y) => {
      // Small white pot
      rect(ctx, x + 2, y + 18, 12, 10, '#f1f5f9');
      rect(ctx, x + 1, y + 16, 14, 3, '#ffffff');
      // Succulent rosettes
      rect(ctx, x + 3, y + 10, 10, 8, '#0d9488');
      rect(ctx, x + 5, y + 7, 6, 6, '#2dd4bf');
      rect(ctx, x + 7, y + 9, 2, 2, '#99f6e4');
    }
  },
  {
    type: 'plant-ficus',
    name: 'Cây Bàng Singapore lớn',
    category: 'plant',
    w: 3,
    h: 4,
    isObstacle: true,
    icon: '🌳',
    description: 'Cây bàng thân cao đặt góc phòng mang lại cảm giác sinh thái thư thái.',
    draw: (ctx, x, y) => {
      // Woven basket pot
      rect(ctx, x + 10, y + 45, 28, 17, '#b45309');
      rect(ctx, x + 8, y + 42, 32, 5, '#d97706');
      for (let i = 0; i < 4; i++) {
        rect(ctx, x + 12 + i * 6, y + 47, 3, 13, '#92400e');
      }
      // Wooden trunk
      rect(ctx, x + 21, y + 18, 6, 26, '#78350f');
      // Broad lush leaves
      rect(ctx, x + 6, y + 20, 16, 14, '#15803d');
      rect(ctx, x + 25, y + 16, 18, 15, '#16a34a');
      rect(ctx, x + 12, y + 6, 24, 18, '#22c55e');
      rect(ctx, x + 16, y + 2, 16, 12, '#4ade80');
      rect(ctx, x + 20, y + 8, 8, 3, '#86efac');
    }
  },

  // 4. RUGS & CARPETS
  {
    type: 'rug-cozy',
    name: 'Thảm dệt len phòng khách',
    category: 'rug',
    w: 8, // 128px
    h: 5, // 80px
    isObstacle: false,
    icon: '🧶',
    description: 'Thảm len êm ái họa tiết viền cổ điển giúp văn phòng ấm cúng hơn.',
    draw: (ctx, x, y, w, h) => {
      // Shadow & base
      rect(ctx, x + 3, y + 3, w, h, '#0000001a');
      rect(ctx, x, y, w, h, '#94a3b8');
      rect(ctx, x + 4, y + 4, w - 8, h - 8, '#cbd5e1');
      rect(ctx, x + 8, y + 8, w - 16, h - 16, '#e2e8f0');
      // Tassels on sides
      for (let i = x + 12; i < x + w - 12; i += 12) {
        rect(ctx, i, y + 2, 4, 3, '#f8fafc');
        rect(ctx, i, y + h - 5, 4, 3, '#f8fafc');
      }
    }
  },
  {
    type: 'rug-warm',
    name: 'Thảm đỏ Bohemia',
    category: 'rug',
    w: 6,
    h: 4,
    isObstacle: false,
    icon: '🟥',
    description: 'Thảm dệt thổ cẩm phong cách tự do tràn đầy năng lượng.',
    draw: (ctx, x, y, w, h) => {
      rect(ctx, x + 2, y + 2, w, h, '#00000018');
      rect(ctx, x, y, w, h, '#991b1b');
      rect(ctx, x + 4, y + 4, w - 8, h - 8, '#dc2626');
      rect(ctx, x + 8, y + 8, w - 16, h - 16, '#f87171');
      // Inner pattern diamonds
      rect(ctx, x + w / 2 - 8, y + h / 2 - 8, 16, 16, '#fef08a');
      rect(ctx, x + w / 2 - 4, y + h / 2 - 4, 8, 8, '#b91c1c');
    }
  },

  // 5. SOFAS & BREAK ROOM
  {
    type: 'sofa-sage',
    name: 'Sofa góc nghỉ ngơi 3 chỗ',
    category: 'sofa',
    w: 7, // 112px
    h: 3, // 48px
    isObstacle: true,
    isSeat: true,
    isRestStop: true,
    icon: '🛋️',
    description: 'Sofa bọc vải nỉ cao cấp cho các cuộc họp nhanh hoặc nghỉ trưa.',
    draw: (ctx, x, y, w) => {
      // Shadow
      rect(ctx, x + 3, y + 3, w, 38, '#00000022');
      // Sofa base & back
      rect(ctx, x, y, w, 36, '#4d7c0f');
      rect(ctx, x, y, w, 11, '#65a30d');
      // 3 Cushions
      const cushionW = Math.floor((w - 20) / 3);
      for (let i = 0; i < 3; i++) {
        const cx = x + 10 + i * (cushionW + 3);
        rect(ctx, cx, y + 13, cushionW, 20, '#84cc16');
        rect(ctx, cx + 2, y + 14, cushionW - 4, 4, '#a3e635');
      }
      // Armrests
      rect(ctx, x - 2, y + 3, 9, 34, '#65a30d');
      rect(ctx, x + w - 7, y + 3, 9, 34, '#65a30d');
    }
  },
  {
    type: 'table-coffee',
    name: 'Bàn trà gỗ tròn',
    category: 'sofa',
    w: 3,
    h: 3,
    isObstacle: true,
    icon: '☕',
    description: 'Bàn trà nhỏ để cà phê và tạp chí.',
    draw: (ctx, x, y) => {
      // Round tabletop
      rect(ctx, x + 4, y + 8, 40, 28, '#78350f');
      rect(ctx, x + 2, y + 6, 44, 28, '#92400e');
      rect(ctx, x + 4, y + 4, 40, 28, '#b45309');
      rect(ctx, x + 8, y + 6, 32, 22, '#d97706');
      // Tea cup & magazine
      rect(ctx, x + 14, y + 12, 8, 8, '#ffffff');
      rect(ctx, x + 16, y + 14, 4, 4, '#78350f');
      rect(ctx, x + 26, y + 14, 12, 10, '#38bdf8');
    }
  },

  // 6. STORAGE & SHELVES
  {
    type: 'shelf-books',
    name: 'Kệ sách & tài liệu',
    category: 'storage',
    w: 5, // 80px
    h: 3, // 48px
    isObstacle: true,
    isRestStop: true, // idle agents can browse books
    icon: '📚',
    description: 'Kệ sách nhiều ngăn đựng tài liệu dự án và sách lập trình.',
    draw: (ctx, x, y, w) => {
      // Wood frame
      rect(ctx, x, y, w, 46, '#78350f');
      rect(ctx, x + 3, y + 3, w - 6, 40, '#92400e');
      // 2 Shelves with books
      for (let row = 0; row < 2; row++) {
        const ry = y + 5 + row * 20;
        rect(ctx, x + 2, ry + 16, w - 4, 4, '#b45309');
        const bookCols = ['#dc2626', '#2563eb', '#16a34a', '#d97706', '#9333ea', '#0891b2', '#ea580c'];
        for (let i = 0; i < Math.floor((w - 12) / 8); i++) {
          const bx = x + 6 + i * 8;
          const col = bookCols[i % bookCols.length];
          const bh = 10 + (i % 3) * 2;
          rect(ctx, bx, ry + (16 - bh), 6, bh, col);
          rect(ctx, bx + 1, ry + (16 - bh) + 1, 2, 2, '#ffffff');
        }
      }
    }
  },
  {
    type: 'cabinet-filing',
    name: 'Tủ hồ sơ kim loại',
    category: 'storage',
    w: 2,
    h: 3,
    isObstacle: true,
    icon: '🗄️',
    description: 'Tủ ngăn kéo kim loại chuyên nghiệp lưu trữ hồ sơ mật.',
    draw: (ctx, x, y) => {
      rect(ctx, x, y, 32, 44, '#334155');
      rect(ctx, x + 2, y + 2, 28, 40, '#475569');
      // 3 Drawers
      for (let i = 0; i < 3; i++) {
        const dy = y + 4 + i * 13;
        rect(ctx, x + 4, dy, 24, 11, '#64748b');
        rect(ctx, x + 6, dy + 2, 8, 4, '#f8fafc'); // label
        rect(ctx, x + 17, dy + 4, 8, 2, '#0f172a'); // handle
      }
    }
  },

  // 7. REFRESHMENTS & WATER COOLER
  {
    type: 'water-dispenser',
    name: 'Cây nước nóng lạnh',
    category: 'refreshment',
    w: 2,
    h: 4,
    isObstacle: true,
    isRestStop: true, // Agent visits to drink water!
    icon: '🚰',
    description: 'Cây nước uống tinh khiết. Nơi các agent tụ tập trò chuyện và uống nước giải lao.',
    draw: (ctx, x, y) => {
      // Inverted blue water bottle on top
      rect(ctx, x + 7, y + 2, 18, 18, '#38bdf8');
      rect(ctx, x + 9, y + 4, 14, 14, '#7dd3fc');
      rect(ctx, x + 11, y + 6, 4, 10, '#e0f2fe'); // bottle shine
      rect(ctx, x + 12, y + 19, 8, 4, '#0284c7'); // bottle cap/neck

      // White dispenser machine body
      rect(ctx, x + 4, y + 22, 24, 38, '#e2e8f0');
      rect(ctx, x + 6, y + 24, 20, 34, '#f8fafc');
      // Dispenser alcove
      rect(ctx, x + 8, y + 30, 16, 14, '#1e293b');
      // Hot & Cold spigots
      rect(ctx, x + 10, y + 32, 4, 4, '#ef4444'); // red hot tap
      rect(ctx, x + 18, y + 32, 4, 4, '#3b82f6'); // blue cold tap
      // Cup on drip tray
      rect(ctx, x + 13, y + 38, 6, 5, '#ffffff');
      // Vent grill at bottom
      rect(ctx, x + 8, y + 48, 16, 2, '#94a3b8');
      rect(ctx, x + 8, y + 52, 16, 2, '#94a3b8');
    }
  },
  {
    type: 'coffee-machine',
    name: 'Máy pha cà phê quầy Bar',
    category: 'refreshment',
    w: 3,
    h: 3,
    isObstacle: true,
    isRestStop: true, // Agent visits for coffee!
    icon: '☕',
    description: 'Quầy pha cà phê espresso tiếp thêm năng lượng cho các buổi fix bug căng thẳng.',
    draw: (ctx, x, y) => {
      // Wooden counter bar
      rect(ctx, x, y + 24, 48, 20, '#78350f');
      rect(ctx, x + 2, y + 22, 44, 4, '#92400e');
      // Espresso machine body
      rect(ctx, x + 8, y + 4, 32, 22, '#334155');
      rect(ctx, x + 10, y + 6, 28, 18, '#475569');
      // Chrome group head & steam wand
      rect(ctx, x + 16, y + 16, 8, 4, '#cbd5e1');
      rect(ctx, x + 28, y + 14, 2, 8, '#cbd5e1');
      // Espresso cups
      rect(ctx, x + 18, y + 19, 4, 4, '#f87171');
      rect(ctx, x + 34, y + 22, 6, 6, '#ffffff');
    }
  },

  // 8. WALL DECOR & LIGHTING
  {
    type: 'board-whiteboard',
    name: 'Bảng Agile & Sticky Notes',
    category: 'decor',
    w: 5,
    h: 3,
    isObstacle: false, // on wall
    icon: '📋',
    description: 'Bảng trắng kế hoạch sprint gắn đầy các mảnh giấy note màu sắc.',
    draw: (ctx, x, y, w) => {
      // Aluminum frame
      rect(ctx, x, y + 4, w, 40, '#64748b');
      rect(ctx, x + 2, y + 6, w - 4, 36, '#ffffff');
      rect(ctx, x + 4, y + 8, w - 8, 32, '#f8fafc');
      // Columns (To Do, Doing, Done)
      rect(ctx, x + Math.floor(w * 0.35), y + 9, 1, 30, '#cbd5e1');
      rect(ctx, x + Math.floor(w * 0.68), y + 9, 1, 30, '#cbd5e1');
      // Colorful sticky notes
      rect(ctx, x + 8, y + 12, 8, 8, '#fef08a'); // yellow note
      rect(ctx, x + 18, y + 15, 8, 8, '#f472b6'); // pink note
      rect(ctx, x + 32, y + 12, 8, 8, '#67e8f9'); // blue note
      rect(ctx, x + 58, y + 16, 8, 8, '#86efac'); // green done note
      // Marker tray at bottom
      rect(ctx, x + 8, y + 43, 24, 2, '#334155');
    }
  },
  {
    type: 'lamp-floor',
    name: 'Đèn cây sàn ấm cúng',
    category: 'decor',
    w: 2,
    h: 4,
    isObstacle: true,
    icon: '💡',
    description: 'Đèn đứng phong cách Bắc Âu tỏa ánh sáng vàng ấm áp.',
    draw: (ctx, x, y) => {
      // Base
      rect(ctx, x + 8, y + 54, 16, 4, '#1e293b');
      // Thin metal pole
      rect(ctx, x + 15, y + 14, 2, 40, '#334155');
      // Lampshade
      rect(ctx, x + 6, y + 6, 20, 12, '#f59e0b');
      rect(ctx, x + 8, y + 4, 16, 3, '#d97706');
      rect(ctx, x + 7, y + 16, 18, 3, '#fef08a');
      // Cozy warm light glow effect
      ctx.save();
      ctx.fillStyle = '#fef08a1a';
      ctx.beginPath();
      ctx.arc(x + 16, y + 24, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
];

// Helper to look up definition by type
export function getFurnitureDef(type: string): FurnitureDefinition | undefined {
  return FURNITURE_CATALOG.find((f) => f.type === type);
}

// Generate default placed furniture matching the 7 agents & 2-column layout
export function getDefaultOfficeFurniture(agentsCount: number = 7): PlacedFurniture[] {
  const items: PlacedFurniture[] = [];

  // Center Area: Main Rug
  items.push({
    id: 'main-rug',
    type: 'rug-cozy',
    gx: 14,
    gy: 8,
    variant: 0
  });

  // 7 Desks: Column 1 (4 desks) and Column 2 (3 desks)
  // Grid: STEP = 16px. Work area spans approx gx: 16 to 48, gy: 10 to 36
  const col1X = 17; // Left column
  const col2X = 35; // Right column

  for (let i = 0; i < agentsCount; i++) {
    const isCol1 = i < 4;
    const gx = isCol1 ? col1X : col2X;
    const r = isCol1 ? i : i - 4;
    const gy = 10 + r * 6; // Spaced vertically

    items.push({
      id: `desk-agent-${i}`,
      type: i % 2 === 0 ? 'desk-wood' : 'desk-modern',
      gx,
      gy,
      assignedAgentId: null, // Will be paired with agents[i].id
      variant: 0
    });
  }

  // Left Room: Meeting & Lounge
  items.push({
    id: 'shelf-left',
    type: 'shelf-books',
    gx: 2,
    gy: 7
  });

  items.push({
    id: 'sofa-left',
    type: 'sofa-sage',
    gx: 1,
    gy: 22
  });

  items.push({
    id: 'coffee-table-left',
    type: 'table-coffee',
    gx: 3,
    gy: 26
  });

  items.push({
    id: 'plant-corner-left',
    type: 'plant-monstera',
    gx: 2,
    gy: 32
  });

  // Right Room: Coffee & Water Station
  items.push({
    id: 'water-cooler-right',
    type: 'water-dispenser',
    gx: 54,
    gy: 8
  });

  items.push({
    id: 'coffee-bar-right',
    type: 'coffee-machine',
    gx: 58,
    gy: 8
  });

  items.push({
    id: 'plant-tree-right',
    type: 'plant-ficus',
    gx: 60,
    gy: 16
  });

  items.push({
    id: 'armchair-right',
    type: 'chair-armchair',
    gx: 55,
    gy: 22
  });

  items.push({
    id: 'lamp-right',
    type: 'lamp-floor',
    gx: 60,
    gy: 22
  });

  items.push({
    id: 'whiteboard-center',
    type: 'board-whiteboard',
    gx: 26,
    gy: 2
  });

  return items;
}
