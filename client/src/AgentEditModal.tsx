import React, { useState } from 'react';
import type { Agent } from './types';
import { FolderBrowserModal } from './FolderBrowserModal';

interface AgentEditModalProps {
  agent: Agent;
  onClose: () => void;
  onSave: (updated: Partial<Agent>) => Promise<void>;
}

export const AgentEditModal: React.FC<AgentEditModalProps> = ({
  agent,
  onClose,
  onSave
}) => {
  const [name, setName] = useState(agent.name);
  const [role, setRole] = useState(agent.role);
  const [instructions, setInstructions] = useState(agent.system_instructions);
  const [folderPath, setFolderPath] = useState(agent.folder_path);
  const [color, setColor] = useState(agent.avatar?.clothesColor || '#2a624d');
  const [showFolderBrowser, setShowFolderBrowser] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      name: name.trim(),
      role: role.trim(),
      system_instructions: instructions.trim(),
      folder_path: folderPath.trim(),
      avatar: {
        ...agent.avatar,
        clothesColor: color
      }
    });
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Chỉnh sửa vai trò agent</h2>
          <button className="small" onClick={onClose} aria-label="Đóng">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <label>Tên agent</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={40}
          />

          <label>Vai trò / chuyên môn</label>
          <input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            required
            maxLength={100}
          />

          {/* Folder Source Path */}
          <div className="folder-selection-card">
            <div className="folder-card-header">
              <div className="folder-card-title">
                <span className="folder-icon">📂</span>
                <strong>Thư mục nguồn dự án</strong>
              </div>
              <div className="folder-card-actions">
                <button
                  type="button"
                  onClick={() => setShowFolderBrowser(true)}
                  title="Mở trình duyệt thư mục dự án"
                >
                  📂 Duyệt thư mục
                </button>
              </div>
            </div>

            <div className="folder-path-display">
              <code title={folderPath}>{folderPath}</code>
            </div>

            <div className="folder-manual-row">
              <input
                type="text"
                value={folderPath}
                onChange={(e) => setFolderPath(e.target.value)}
                placeholder="Nhập đường dẫn thư mục..."
                required
              />
            </div>
          </div>

          <label>Hướng dẫn làm việc (System Instructions)</label>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={4}
            required
          />

          <label>Màu đại diện / áo trang phục</label>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            style={{ width: 70, height: 42, padding: 2 }}
          />

          <div className="modal-actions">
            <button type="button" onClick={onClose}>Hủy</button>
            <button type="submit" className="primary">Lưu agent</button>
          </div>
        </form>
      </div>

      {showFolderBrowser && (
        <FolderBrowserModal
          initialPath={folderPath}
          onSelect={(newPath) => {
            setFolderPath(newPath);
            setShowFolderBrowser(false);
          }}
          onClose={() => setShowFolderBrowser(false)}
        />
      )}
    </div>
  );
};
