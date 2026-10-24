import React, { useState } from 'react';
import type { Agent, AgentAvatar } from './types';
import { FolderBrowserModal } from './FolderBrowserModal';
import { AgentAppearanceTab } from './AgentAppearanceTab';

interface AgentEditModalProps {
  agent: Agent;
  onClose: () => void;
  onSave: (updated: Partial<Agent>) => Promise<void>;
  onDelete?: () => void;
}

export const AgentEditModal: React.FC<AgentEditModalProps> = ({
  agent,
  onClose,
  onSave,
  onDelete
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'appearance'>('info');
  const [name, setName] = useState(agent.name);
  const [role, setRole] = useState(agent.role);
  const [instructions, setInstructions] = useState(agent.system_instructions);
  const [folderPath, setFolderPath] = useState(agent.folder_path);
  const [color, setColor] = useState(agent.avatar?.clothesColor || agent.color || '#2a624d');
  const [avatar, setAvatar] = useState<AgentAvatar>(
    agent.avatar || {
      skinColor: '#edbb90',
      hairStyle: 'short',
      hairColor: '#343f42',
      clothesColor: color,
      accessory: 'none'
    }
  );
  const [showFolderBrowser, setShowFolderBrowser] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      name: name.trim(),
      role: role.trim(),
      system_instructions: instructions.trim(),
      folder_path: folderPath.trim(),
      color: avatar.clothesColor || color,
      avatar: {
        ...avatar,
        clothesColor: avatar.clothesColor || color
      }
    });
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Chỉnh sửa Agent: {agent.name}</h2>
          <button className="small" onClick={onClose} aria-label="Đóng">✕</button>
        </div>

        {/* Navigation Tabs */}
        <div className="modal-tabs" style={{ marginBottom: 16 }}>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`}
            onClick={() => setActiveTab('info')}
          >
            📋 Thông tin & Thư mục
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'appearance' ? 'active' : ''}`}
            onClick={() => setActiveTab('appearance')}
          >
            🎨 Ngoại hình nhân vật
          </button>
        </div>

        {activeTab === 'info' ? (
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

            <div className="modal-actions">
              {onDelete && (
                <button type="button" className="danger" onClick={onDelete}>
                  Xóa agent
                </button>
              )}
              <button type="button" onClick={onClose}>Hủy</button>
              <button type="submit" className="primary">Lưu thay đổi</button>
            </div>
          </form>
        ) : (
          <div className="modal-body">
            <AgentAppearanceTab
              initialAvatar={avatar}
              agentName={name}
              clothesColorFallback={color}
              onSave={async (newAvatar) => {
                setAvatar(newAvatar);
                setColor(newAvatar.clothesColor);
                await onSave({
                  avatar: newAvatar,
                  color: newAvatar.clothesColor
                });
              }}
            />
          </div>
        )}
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
