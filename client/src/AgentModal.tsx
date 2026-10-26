import React, { useState, useEffect, useRef } from 'react';
import type { Agent, Task } from './types';
import { FolderBrowserModal } from './FolderBrowserModal';
import { AgentAppearanceTab } from './AgentAppearanceTab';
import { drawIllustratedPortrait, getAgentVariant } from './illustrated-sprites';

interface AgentModalProps {
  agent: Agent;
  onClose: () => void;
  onUpdateAgent: (updated: Partial<Agent>) => Promise<void>;
  onAssignTask: (prompt: string) => Promise<void>;
  onStopTask: () => Promise<void>;
  onResetConversation: () => Promise<void>;
  activeTask?: Task | null;
  tasks: Task[];
}

export const AgentModal: React.FC<AgentModalProps> = ({
  agent,
  onClose,
  onUpdateAgent,
  onAssignTask,
  onStopTask,
  onResetConversation,
  activeTask,
  tasks
}) => {
  const [prompt, setPrompt] = useState('');
  const [folderInput, setFolderInput] = useState(agent.folder_path);
  const [isEditingFolder, setIsEditingFolder] = useState(false);
  const [showFolderBrowser, setShowFolderBrowser] = useState(false);
  const [activeTab, setActiveTab] = useState<'task' | 'appearance' | 'history' | 'settings'>('task');
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  const headerCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (headerCanvasRef.current) {
      drawIllustratedPortrait(
        headerCanvasRef.current,
        getAgentVariant(agent)
      );
    }
  }, [agent, agent.avatar, agent.spriteVariant]);

  useEffect(() => {
    setFolderInput(agent.folder_path);
  }, [agent.folder_path]);

  const handleSaveManualFolder = async () => {
    await onUpdateAgent({ folder_path: folderInput });
    setIsEditingFolder(false);
  };

  const handleSubmitTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || agent.isBusy) return;
    const taskText = prompt;
    setPrompt('');
    await onAssignTask(taskText);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="agent-badge">
            <div
              className="avatar-chibi-badge"
              style={{
                borderColor: agent.isBusy ? '#38bdf8' : '#475569'
              }}
            >
              <canvas
                ref={headerCanvasRef}
                width={256}
                height={256}
                style={{ width: '48px', height: '48px', objectFit: 'contain' }}
              />
              {agent.isBusy && <span className="status-dot working" title="Đang làm việc" />}
            </div>
            <div>
              <div className="agent-title-row">
                <h2 className="agent-name">{agent.name}</h2>
                <span className={`status-pill ${agent.isBusy ? 'pill-working' : 'pill-idle'}`}>
                  {agent.isBusy ? '⚡ Đang thực thi' : '💤 Rảnh rỗi'}
                </span>
              </div>
              <p className="agent-role">{agent.role}</p>
            </div>
          </div>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        {/* Project Folder Banner */}
        <div className="folder-banner">
          <div className="folder-info">
            <span className="folder-label">📁 Thư mục dự án:</span>
            {!isEditingFolder ? (
              <span className="folder-path" title={agent.folder_path}>
                {agent.folder_path}
              </span>
            ) : (
              <input
                type="text"
                className="folder-input-edit"
                value={folderInput}
                onChange={(e) => setFolderInput(e.target.value)}
                placeholder="C:\path\to\project"
              />
            )}
          </div>
          <div className="folder-actions">
            {!isEditingFolder ? (
              <>
                <button
                  className="btn-secondary btn-sm"
                  onClick={() => setShowFolderBrowser(true)}
                  disabled={agent.isBusy}
                >
                  📂 Chọn thư mục
                </button>
                <button
                  className="btn-ghost btn-sm"
                  onClick={() => setIsEditingFolder(true)}
                  disabled={agent.isBusy}
                  title="Nhập đường dẫn thủ công"
                >
                  ✏️
                </button>
              </>
            ) : (
              <>
                <button className="btn-primary btn-sm" onClick={handleSaveManualFolder}>Lưu</button>
                <button className="btn-ghost btn-sm" onClick={() => setIsEditingFolder(false)}>Hủy</button>
              </>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="modal-tabs">
          <button
            className={`tab-btn ${activeTab === 'task' ? 'active' : ''}`}
            onClick={() => setActiveTab('task')}
          >
            ⚡ Giao Task & Tiến độ
          </button>
          <button
            className={`tab-btn ${activeTab === 'appearance' ? 'active' : ''}`}
            onClick={() => setActiveTab('appearance')}
          >
            🎨 Ngoại hình
          </button>
          <button
            className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            📜 Lịch sử tác vụ ({tasks.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            ⚙️ Cấu hình Agent
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {/* TAB 1: TASK & LIVE PROGRESS */}
          {activeTab === 'task' && (
            <div className="tab-pane">
              {/* Active Task Live Progress Banner */}
              {agent.isBusy && activeTask && (
                <div className="live-task-card">
                  <div className="live-task-header">
                    <div className="live-badge">
                      <span className="pulse-ring" />
                      <span>Đang xử lý tác vụ...</span>
                    </div>
                    <button className="btn-stop" onClick={onStopTask} title="Dừng tiến trình CLI này ngay lập tức">
                      🛑 Dừng tiến trình
                    </button>
                  </div>
                  <div className="live-prompt">
                    <strong>Yêu cầu:</strong> {activeTask.prompt}
                  </div>
                  {activeTask.current_activity && (
                    <div className="live-activity-box">
                      <span className="activity-icon">⚙️</span>
                      <span className="activity-text">{activeTask.current_activity}</span>
                    </div>
                  )}
                  {activeTask.response_text && (
                    <div className="live-response-stream">
                      <div className="stream-label">Kết quả đang phản hồi:</div>
                      <pre className="stream-content">{activeTask.response_text}</pre>
                    </div>
                  )}
                </div>
              )}

              {/* Task Input Form */}
              <form onSubmit={handleSubmitTask} className="task-form">
                <div className="form-group">
                  <label htmlFor="task-prompt">
                    Nhập tác vụ cho <strong>{agent.name}</strong>:
                  </label>
                  <textarea
                    id="task-prompt"
                    className="task-textarea"
                    rows={4}
                    placeholder="Ví dụ: Kiểm tra cấu trúc các file trong thư mục, đọc file README hoặc tạo unit test..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    disabled={agent.isBusy}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                        handleSubmitTask(e);
                      }
                    }}
                  />
                  <div className="textarea-hint">
                    <span>Nhấn <code>Ctrl + Enter</code> để gửi nhanh.</span>
                    <span>Tác vụ sẽ chạy trên đúng thư mục dự án của Agent.</span>
                  </div>
                </div>

                <div className="form-actions">
                  <div className="conversation-info">
                    <span className="conv-tag">
                      Phiên: {agent.conversation_id ? agent.conversation_id.slice(0, 8) + '...' : 'Mới (chưa lưu)'}
                    </span>
                    {agent.conversation_id && (
                      <button
                        type="button"
                        className="btn-ghost btn-sm"
                        onClick={onResetConversation}
                        disabled={agent.isBusy}
                        title="Bắt đầu phiên hội thoại mới, không tiếp nối lịch sử cũ"
                      >
                        🔄 Tạo phiên mới
                      </button>
                    )}
                  </div>

                  <div className="action-buttons">
                    {agent.isBusy ? (
                      <button type="button" className="btn-stop" onClick={onStopTask}>
                        🛑 Dừng tiến trình
                      </button>
                    ) : (
                      <button
                        type="submit"
                        className="btn-primary"
                        disabled={!prompt.trim() || agent.isBusy}
                      >
                        ⚡ Giao Task Ngay
                      </button>
                    )}
                  </div>
                </div>
              </form>

              {/* Most recent completed task if not busy */}
              {!agent.isBusy && tasks.length > 0 && tasks[0] && (
                <div className="recent-result-card">
                  <div className="recent-header">
                    <span>Kết quả tác vụ gần nhất ({new Date(tasks[0].started_at).toLocaleTimeString()}):</span>
                    <span className={`status-badge status-${tasks[0].status.toLowerCase()}`}>
                      {tasks[0].status}
                    </span>
                  </div>
                  <div className="recent-prompt">"{tasks[0].prompt}"</div>
                  {tasks[0].error_text ? (
                    <div className="error-box">{tasks[0].error_text}</div>
                  ) : (
                    <pre className="result-content">{tasks[0].response_text || 'Đã hoàn tất.'}</pre>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB: APPEARANCE CUSTOMIZATION */}
          {activeTab === 'appearance' && (
            <div className="tab-pane">
              <AgentAppearanceTab
                initialAvatar={
                  agent.avatar || {
                    skinColor: '#edbb90',
                    hairStyle: 'short',
                    hairColor: '#343f42',
                    clothesColor: agent.color || '#2563eb',
                    accessory: 'none'
                  }
                }
                agentName={agent.name}
                clothesColorFallback={agent.color || '#2563eb'}
                isBusy={agent.isBusy}
                onSave={async (newAvatar) => {
                  await onUpdateAgent({
                    avatar: newAvatar,
                    color: newAvatar.clothesColor,
                    spriteVariant: newAvatar.spriteVariant
                  });
                }}
              />
            </div>
          )}

          {/* TAB 2: HISTORY */}
          {activeTab === 'history' && (
            <div className="tab-pane">
              {tasks.length === 0 ? (
                <div className="empty-state">Chưa có tác vụ nào được thực hiện cho Agent này.</div>
              ) : (
                <div className="history-list">
                  {tasks.map((t) => (
                    <div key={t.id} className="history-item">
                      <div
                        className="history-header"
                        onClick={() => setExpandedTaskId(expandedTaskId === t.id ? null : t.id)}
                      >
                        <div className="history-title-row">
                          <span className={`status-badge status-${t.status.toLowerCase()}`}>
                            {t.status === 'SUCCESS' ? '✓' : t.status === 'RUNNING' ? '⚡' : '✕'} {t.status}
                          </span>
                          <span className="history-prompt">{t.prompt}</span>
                        </div>
                        <div className="history-meta">
                          {t.duration_seconds && <span>⏱️ {t.duration_seconds.toFixed(1)}s</span>}
                          <span>{new Date(t.started_at).toLocaleString()}</span>
                          <span className="expand-chevron">{expandedTaskId === t.id ? '▲' : '▼'}</span>
                        </div>
                      </div>

                      {expandedTaskId === t.id && (
                        <div className="history-details">
                          <div className="history-detail-row">
                            <strong>Thư mục:</strong> <code>{t.folder_path}</code>
                          </div>
                          {t.conversation_id && (
                            <div className="history-detail-row">
                              <strong>Conversation ID:</strong> <code>{t.conversation_id}</code>
                            </div>
                          )}
                          {t.error_text && (
                            <div className="error-box">
                              <strong>Lỗi:</strong> {t.error_text}
                            </div>
                          )}
                          {t.response_text && (
                            <div className="history-response-box">
                              <strong>Kết quả:</strong>
                              <pre className="result-content">{t.response_text}</pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="tab-pane settings-pane">
              <div className="form-group">
                <label>Tên nhân vật:</label>
                <input
                  type="text"
                  className="folder-input-edit"
                  value={agent.name}
                  onChange={(e) => onUpdateAgent({ name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Vai trò / Chuyên môn:</label>
                <input
                  type="text"
                  className="folder-input-edit"
                  value={agent.role}
                  onChange={(e) => onUpdateAgent({ role: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Chỉ dẫn hệ thống (System Instructions):</label>
                <textarea
                  className="task-textarea"
                  rows={4}
                  value={agent.system_instructions}
                  onChange={(e) => onUpdateAgent({ system_instructions: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Màu áo trang phục:</label>
                <div className="color-swatches">
                  {['#2563eb', '#059669', '#dc2626', '#7c3aed', '#ea580c', '#0891b2'].map((col) => (
                    <button
                      key={col}
                      className={`color-swatch ${agent.avatar.clothesColor === col ? 'selected' : ''}`}
                      style={{ backgroundColor: col }}
                      onClick={() => onUpdateAgent({ avatar: { ...agent.avatar, clothesColor: col } })}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showFolderBrowser && (
        <FolderBrowserModal
          initialPath={agent.folder_path}
          onSelect={async (newPath) => {
            setFolderInput(newPath);
            await onUpdateAgent({ folder_path: newPath });
            setShowFolderBrowser(false);
          }}
          onClose={() => setShowFolderBrowser(false)}
        />
      )}
    </div>
  );
};
