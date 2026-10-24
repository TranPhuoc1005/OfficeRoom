import React, { useState } from 'react';
import type { ProjectInfo } from './supabase';

interface ProjectSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (path: string) => void;
  projects: ProjectInfo[];
  currentPath?: string;
  onOpenLocalPicker?: () => void;
}

export const ProjectSelectModal: React.FC<ProjectSelectModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  projects,
  currentPath = '',
  onOpenLocalPicker
}) => {
  const [customPath, setCustomPath] = useState(currentPath);
  const [showCustom, setShowCustom] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" style={{ zIndex: 9999 }}>
      <div
        className="modal-card"
        style={{
          maxWidth: '540px',
          width: '92%',
          padding: '24px',
          background: 'var(--panel-bg, #fffbf0)',
          border: '3px solid var(--border, #2d3748)',
          boxShadow: '6px 6px 0px rgba(0,0,0,0.18)',
          borderRadius: '8px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📁</span> Chọn Thư Mục Dự Án Trên Máy Runner
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}
          >
            ✕
          </button>
        </div>

        <p style={{ fontSize: '13px', color: '#64748b', marginTop: 0, marginBottom: '16px' }}>
          Danh sách các thư mục mã nguồn được đăng ký trên máy Windows chạy Runner. Antigravity CLI sẽ thực thi task trong thư mục được chọn.
        </p>

        {projects.length === 0 ? (
          <div
            style={{
              padding: '16px',
              backgroundColor: '#fffbeb',
              border: '1px dashed #f59e0b',
              borderRadius: '6px',
              fontSize: '13px',
              color: '#92400e',
              marginBottom: '16px'
            }}
          >
            ⚠️ Chưa có thư mục nào được đồng bộ từ Windows Runner.
            <br />
            Bạn có thể bật <code>start-runner.ps1</code> trên máy Windows để tự động đồng bộ hoặc nhập đường dẫn trực tiếp bên dưới.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', maxHeight: '240px', overflowY: 'auto' }}>
            {projects.map((p) => {
              const isSelected = currentPath.toLowerCase() === p.path.toLowerCase();
              return (
                <div
                  key={p.id}
                  onClick={() => {
                    onSelect(p.path);
                    onClose();
                  }}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '6px',
                    border: `2px solid ${isSelected ? '#22c55e' : '#cbd5e1'}`,
                    backgroundColor: isSelected ? '#f0fdf4' : '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#0f172a' }}>
                      {p.name}
                    </span>
                    <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                      {p.path}
                    </span>
                  </div>
                  {isSelected && (
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#166534', backgroundColor: '#dcfce7', padding: '2px 8px', borderRadius: '4px' }}>
                      ✓ Đang gán
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Custom / Manual Input */}
        {showCustom ? (
          <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px' }}>
              Nhập đường dẫn Windows thủ công:
            </label>
            <input
              type="text"
              value={customPath}
              onChange={(e) => setCustomPath(e.target.value)}
              placeholder="C:\Users\tranp\...\my-project"
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                boxSizing: 'border-box',
                fontFamily: 'monospace'
              }}
            />
            <button
              onClick={() => {
                if (customPath.trim()) {
                  onSelect(customPath.trim());
                  onClose();
                }
              }}
              style={{
                marginTop: '8px',
                padding: '6px 14px',
                backgroundColor: 'var(--sage, #4ade80)',
                color: '#0f172a',
                border: '1px solid #1e293b',
                borderRadius: '4px',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Áp dụng đường dẫn
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
            <button
              onClick={() => setShowCustom(true)}
              style={{
                background: 'none',
                border: 'none',
                color: '#2563eb',
                fontSize: '12px',
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: 0
              }}
            >
              + Nhập đường dẫn khác thủ công
            </button>
            {onOpenLocalPicker && (
              <button
                onClick={() => {
                  onClose();
                  onOpenLocalPicker();
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '12px',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: 0
                }}
              >
                (Mở trình duyệt thư mục local)
              </button>
            )}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: '#e2e8f0',
              border: 'none',
              borderRadius: '6px',
              color: '#334155',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
