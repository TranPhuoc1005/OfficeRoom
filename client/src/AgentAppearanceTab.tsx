import React, { useState, useEffect, useRef } from 'react';
import type { AgentAvatar } from './types';
import {
  drawAgentSprite,
  SKIN_TONES,
  HAIR_STYLES,
  HAIR_COLORS,
  ACCESSORIES
} from './agent-sprite';

interface AgentAppearanceTabProps {
  initialAvatar: AgentAvatar;
  agentName: string;
  clothesColorFallback?: string;
  onSave: (avatar: AgentAvatar) => Promise<void>;
  isBusy?: boolean;
}

const PRESET_CLOTHES = [
  '#2563eb', // Blue
  '#059669', // Emerald Green
  '#dc2626', // Crimson Red
  '#7c3aed', // Royal Purple
  '#d97706', // Amber Gold
  '#db2777', // Rose Pink
  '#0891b2', // Cyan Teal
  '#1e293b', // Midnight Black
  '#2a624d', // Forest Sage
  '#b45309'  // Terracotta
];

export const AgentAppearanceTab: React.FC<AgentAppearanceTabProps> = ({
  initialAvatar,
  agentName,
  clothesColorFallback = '#2563eb',
  onSave,
  isBusy = false
}) => {
  const [skinColor, setSkinColor] = useState(initialAvatar.skinColor || '#edbb90');
  const [hairStyle, setHairStyle] = useState(initialAvatar.hairStyle || 'short');
  const [hairColor, setHairColor] = useState(initialAvatar.hairColor || '#343f42');
  const [clothesColor, setClothesColor] = useState(initialAvatar.clothesColor || clothesColorFallback);
  const [accessory, setAccessory] = useState(initialAvatar.accessory || 'none');

  const [previewDir, setPreviewDir] = useState<'down' | 'right' | 'up' | 'left'>('down');
  const [isWalking, setIsWalking] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Live preview animation loop
  useEffect(() => {
    let animId: number;
    let stepCount = 0;

    const render = () => {
      if (previewCanvasRef.current) {
        stepCount++;
        const step = isWalking && Math.floor(stepCount / 20) % 2 === 1;

        drawAgentSprite(
          previewCanvasRef.current,
          {
            agent: {
              avatar: {
                skinColor,
                hairStyle,
                hairColor,
                clothesColor,
                accessory
              }
            }
          },
          previewDir,
          step
        );
      }
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [skinColor, hairStyle, hairColor, clothesColor, accessory, previewDir, isWalking]);

  const handleRotate = (delta: 1 | -1) => {
    const dirs: Array<'down' | 'right' | 'up' | 'left'> = ['down', 'right', 'up', 'left'];
    const curIdx = dirs.indexOf(previewDir);
    const nextIdx = (curIdx + delta + 4) % 4;
    setPreviewDir(dirs[nextIdx]);
  };

  const handleSaveAppearance = async () => {
    setIsSaving(true);
    try {
      const updatedAvatar: AgentAvatar = {
        skinColor,
        hairStyle,
        hairColor,
        clothesColor,
        accessory
      };
      await onSave(updatedAvatar);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="appearance-customizer">
      {/* LEFT: LIVE PREVIEW STAGE */}
      <div className="preview-pane">
        <div className="preview-badge">Xem trước trực tiếp</div>
        <div className="preview-stage-chibi">
          <canvas
            ref={previewCanvasRef}
            width={32}
            height={40}
            className="pixel-preview-canvas"
            style={{
              width: '128px',
              height: '160px',
              imageRendering: 'pixelated'
            }}
          />
        </div>

        {/* Direction Rotation & Animation Controls */}
        <div className="preview-controls">
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={() => handleRotate(-1)}
            title="Xoay sang trái"
          >
            ⟲ Xoay trái
          </button>
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={() => setPreviewDir('down')}
            title="Quay mặt chính diện"
          >
            Mặt
          </button>
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={() => handleRotate(1)}
            title="Xoay sang phải"
          >
            Xoay phải ⟳
          </button>
        </div>

        <div className="walk-toggle-row">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={isWalking}
              onChange={(e) => setIsWalking(e.target.checked)}
            />
            <span>Bước đi nhịp nhàng</span>
          </label>
        </div>

        <div className="preview-char-name">
          <strong>{agentName}</strong>
          <small>32x40 Chibi Pixel</small>
        </div>
      </div>

      {/* RIGHT: ATTRIBUTES PICKER */}
      <div className="options-pane">
        {/* 1. KIỂU TÓC */}
        <div className="option-section">
          <label className="section-label">Kiểu tóc ({HAIR_STYLES.length} kiểu)</label>
          <div className="chips-grid">
            {HAIR_STYLES.map((style) => (
              <button
                type="button"
                key={style.id}
                className={`choice-chip ${hairStyle === style.id ? 'active' : ''}`}
                onClick={() => setHairStyle(style.id)}
              >
                {style.label}
              </button>
            ))}
          </div>
        </div>

        {/* 2. MÀU TÓC */}
        <div className="option-section">
          <label className="section-label">Màu tóc</label>
          <div className="swatches-grid">
            {HAIR_COLORS.map((hc) => (
              <button
                type="button"
                key={hc.id}
                className={`swatch-btn ${hairColor === hc.hex ? 'active' : ''}`}
                style={{ backgroundColor: hc.hex }}
                onClick={() => setHairColor(hc.hex)}
                title={hc.label}
              />
            ))}
            <input
              type="color"
              value={hairColor}
              onChange={(e) => setHairColor(e.target.value)}
              className="color-picker-input"
              title="Chọn mã màu tóc tùy biến"
            />
          </div>
        </div>

        {/* 3. TÔNG DA */}
        <div className="option-section">
          <label className="section-label">Tông màu da</label>
          <div className="swatches-grid">
            {SKIN_TONES.map((st) => (
              <button
                type="button"
                key={st.id}
                className={`swatch-btn ${skinColor === st.base ? 'active' : ''}`}
                style={{ backgroundColor: st.base }}
                onClick={() => setSkinColor(st.base)}
                title={st.label}
              />
            ))}
          </div>
        </div>

        {/* 4. MÀU TRANG PHỤC */}
        <div className="option-section">
          <label className="section-label">Màu áo / trang phục</label>
          <div className="swatches-grid">
            {PRESET_CLOTHES.map((color) => (
              <button
                type="button"
                key={color}
                className={`swatch-btn ${clothesColor === color ? 'active' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => setClothesColor(color)}
              />
            ))}
            <input
              type="color"
              value={clothesColor}
              onChange={(e) => setClothesColor(e.target.value)}
              className="color-picker-input"
              title="Chọn màu áo tùy biến"
            />
          </div>
        </div>

        {/* 5. PHỤ KIỆN */}
        <div className="option-section">
          <label className="section-label">Phụ kiện đặc trưng</label>
          <div className="chips-grid">
            {ACCESSORIES.map((acc) => (
              <button
                type="button"
                key={acc.id}
                className={`choice-chip ${accessory === acc.id ? 'active' : ''}`}
                onClick={() => setAccessory(acc.id)}
              >
                {acc.id === 'glasses' && '👓 '}
                {acc.id === 'headset' && '🎧 '}
                {acc.id === 'hairclip' && '🎀 '}
                {acc.id === 'cap' && '🧢 '}
                {acc.id === 'none' && '✖ '}
                {acc.label}
              </button>
            ))}
          </div>
        </div>

        {/* ACTION BUTTON */}
        <div className="appearance-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={handleSaveAppearance}
            disabled={isSaving || isBusy}
            title={isBusy ? 'Không thể chỉnh ngoại hình khi agent đang bận làm việc' : undefined}
          >
            {isSaving ? 'Đang lưu...' : isBusy ? '⚡ Agent đang bận...' : saveSuccess ? '✓ Đã cập nhật ngoại hình!' : '💾 Lưu ngoại hình Agent'}
          </button>
        </div>
      </div>
    </div>
  );
};
