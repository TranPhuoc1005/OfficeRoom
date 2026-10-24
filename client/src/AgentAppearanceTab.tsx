import React, { useState, useEffect, useRef } from 'react';
import type { AgentAvatar } from './types';
import {
  COZY_VARIANTS,
  drawIllustratedSprite,
  getAgentVariant
} from './illustrated-sprites';

interface AgentAppearanceTabProps {
  initialAvatar: AgentAvatar;
  agentName: string;
  clothesColorFallback?: string;
  onSave: (avatar: AgentAvatar) => Promise<void>;
  isBusy?: boolean;
}

export const AgentAppearanceTab: React.FC<AgentAppearanceTabProps> = ({
  initialAvatar,
  agentName,
  clothesColorFallback = '#4f7047',
  onSave,
  isBusy = false
}) => {
  const [selectedVariant, setSelectedVariant] = useState<number>(() => {
    return getAgentVariant({ avatar: initialAvatar });
  });

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
        const step = isWalking && Math.floor(stepCount / 18) % 2 === 1;

        drawIllustratedSprite(previewCanvasRef.current, {
          variant: selectedVariant,
          direction: previewDir,
          frame: step
        });
      }
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [selectedVariant, previewDir, isWalking]);

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
        ...initialAvatar,
        spriteVariant: selectedVariant,
        clothesColor: COZY_VARIANTS[selectedVariant].color || clothesColorFallback
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
        <div className="preview-badge">Xem trước nhân vật Cozy</div>
        <div
          className="preview-stage-chibi"
          style={{
            background: 'radial-gradient(ellipse at center, #dce5c19c, #f0e1b800 70%)',
            borderRadius: '12px',
            padding: '12px'
          }}
        >
          <canvas
            ref={previewCanvasRef}
            width={256}
            height={256}
            className="pixel-preview-canvas"
            style={{
              width: '130px',
              height: '130px',
              objectFit: 'contain',
              display: 'block',
              margin: '0 auto'
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
          <small>{COZY_VARIANTS[selectedVariant].desc}</small>
        </div>
      </div>

      {/* RIGHT: COZY OUTFIT PICKER */}
      <div className="options-pane">
        <div className="option-section">
          <label className="section-label">
            Bộ nhân vật Cozy ({COZY_VARIANTS.length} hình mẫu minh họa)
          </label>
          <p style={{ fontSize: '11px', color: 'var(--muted, #95836c)', marginBottom: '12px' }}>
            Chọn hình mẫu từ bộ vẽ pixel ấm áp. Ngoại hình được lưu ổn định mà không làm thay đổi
            tên, thư mục hay lịch sử công việc của Agent.
          </p>

          <div className="outfit-select">
            {COZY_VARIANTS.map((v) => {
              const isSelected = selectedVariant === v.id;
              return (
                <button
                  type="button"
                  key={v.id}
                  className="outfit-choice"
                  aria-pressed={isSelected}
                  onClick={() => setSelectedVariant(v.id)}
                >
                  <OutfitThumbnail variant={v.id} />
                  <small>
                    <strong>{v.name}</strong>
                    <br />
                    {v.desc.split(' · ')[0]}
                  </small>
                </button>
              );
            })}
          </div>
        </div>

        {/* DETAILS OF SELECTED VARIANT */}
        <div
          style={{
            padding: '12px 14px',
            background: '#fff9ea',
            border: '1px solid #d8caa7',
            borderRadius: '8px',
            fontSize: '11px',
            color: '#554731',
            lineHeight: 1.6,
            marginBottom: '16px'
          }}
        >
          <strong>✦ Đặc điểm phong cách:</strong> {COZY_VARIANTS[selectedVariant].desc}.
          <br />
          Tự động đồng bộ trên bản đồ văn phòng, danh sách đội ngũ và thẻ tác vụ.
        </div>

        {/* ACTION BUTTON */}
        <div className="appearance-actions">
          <button
            type="button"
            className="primary"
            style={{ width: '100%', padding: '11px' }}
            onClick={handleSaveAppearance}
            disabled={isSaving || isBusy}
            title={isBusy ? 'Không thể chỉnh ngoại hình khi agent đang bận làm việc' : undefined}
          >
            {isSaving
              ? 'Đang lưu...'
              : isBusy
              ? '⚡ Agent đang bận...'
              : saveSuccess
              ? '✓ Đã cập nhật ngoại hình!'
              : '💾 Lưu ngoại hình Agent'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Subcomponent for thumbnail in outfit select
const OutfitThumbnail: React.FC<{ variant: number }> = ({ variant }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    drawIllustratedSprite(canvasRef.current, {
      variant,
      direction: 'down',
      frame: 0
    });
  }, [variant]);

  return (
    <canvas
      ref={canvasRef}
      width={256}
      height={256}
      aria-hidden="true"
      style={{
        width: '76px',
        height: '76px',
        objectFit: 'contain',
        display: 'block',
        margin: '0 auto'
      }}
    />
  );
};
