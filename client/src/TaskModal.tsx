import React, { useState, useEffect } from 'react';
import type { Agent, Task } from './types';
import { FolderBrowserModal } from './FolderBrowserModal';

interface TaskModalProps {
  agents: Agent[];
  selectedAgentId?: string;
  task?: Task | null;
  onClose: () => void;
  onAssignTask: (agentId: string, prompt: string, title?: string, priority?: string) => Promise<void>;
  onStopTask: (agentId: string) => Promise<void>;
  onResetConversation: (agentId: string) => Promise<void>;
  onUpdateAgentFolder: (agentId: string, newFolder: string) => Promise<void>;
  activeRunningTask?: Task | null;
  historyTasks: Task[];
}

export const TaskModal: React.FC<TaskModalProps> = ({
  agents,
  selectedAgentId,
  task,
  onClose,
  onAssignTask,
  onStopTask,
  onResetConversation,
  onUpdateAgentFolder,
  activeRunningTask,
  historyTasks
}) => {
  const defaultAgentId = selectedAgentId || agents[0]?.id || '';
  const [agentId, setAgentId] = useState<string>(task ? task.agent_id : defaultAgentId);
  const [title, setTitle] = useState(task ? task.prompt.slice(0, 50) : '');
  const [detail, setDetail] = useState(task ? task.prompt : '');
  const [priority, setPriority] = useState('Bình thường');
  const [showFolderBrowser, setShowFolderBrowser] = useState(false);
  const [manualFolderEdit, setManualFolderEdit] = useState(false);

  const currentAgent = agents.find((a) => a.id === agentId) || agents[0];
  const [folderPathInput, setFolderPathInput] = useState(currentAgent?.folder_path || '');

  useEffect(() => {
    if (currentAgent) {
      setFolderPathInput(currentAgent.folder_path);
    }
  }, [currentAgent]);

  const isBusy = currentAgent?.isBusy ?? false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detail.trim() || isBusy) return;
    const promptToSend = detail.trim();
    await onAssignTask(agentId, promptToSend, title.trim() || promptToSend.slice(0, 40), priority);
  };

  const currentActive = isBusy ? activeRunningTask : null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-head">
          <h2>{task ? 'Chi tiết công việc' : isBusy ? 'Tiến độ thực thi tác vụ' : 'Giao việc cho agent'}</h2>
          <button className="small" onClick={onClose} aria-label="Đóng">✕</button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {/* Active Running Task Banner */}
          {isBusy && (
            <div className="live-task-box">
              <div className="live-task-box-head">
                <span>⚡ Agent đang thực thi tác vụ trên Antigravity CLI...</span>
                <button
                  type="button"
                  className="small btn-stop"
                  onClick={() => onStopTask(agentId)}
                  title="Dừng tiến trình CLI này ngay lập tức"
                >
                  🛑 Dừng tiến trình
                </button>
              </div>

              {currentActive?.current_activity && (
                <div className="live-activity">
                  ⚙️ {currentActive.current_activity}
                </div>
              )}

              {currentActive?.response_text && (
                <div>
                  <label>Kết quả đang phản hồi trực tiếp:</label>
                  <pre className="result">{currentActive.response_text}</pre>
                </div>
              )}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <label>Giao cho Agent</label>
            <select
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              disabled={isBusy}
            >
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} — {a.role} {a.isBusy ? '(Đang bận)' : ''}
                </option>
              ))}
            </select>

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
                    disabled={isBusy}
                    title="Mở trình duyệt thư mục dự án"
                  >
                    📂 Duyệt thư mục
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFolderPathInput(currentAgent?.folder_path || '');
                      setManualFolderEdit(!manualFolderEdit);
                    }}
                    disabled={isBusy}
                    title="Nhập trực tiếp đường dẫn"
                  >
                    {manualFolderEdit ? '✕ Đóng nhập tay' : '✏️ Nhập tay'}
                  </button>
                </div>
              </div>

              {!manualFolderEdit ? (
                <div className="folder-path-display">
                  <code title={currentAgent?.folder_path}>{currentAgent?.folder_path}</code>
                </div>
              ) : (
                <div className="folder-manual-row">
                  <input
                    type="text"
                    value={folderPathInput}
                    onChange={(e) => setFolderPathInput(e.target.value)}
                    placeholder="Nhập đường dẫn đầy đủ (ví dụ C:\projects\my-app)..."
                    disabled={isBusy}
                  />
                  <button
                    type="button"
                    className="small primary"
                    onClick={async () => {
                      await onUpdateAgentFolder(agentId, folderPathInput);
                      setManualFolderEdit(false);
                    }}
                    disabled={isBusy || !folderPathInput.trim()}
                  >
                    Lưu
                  </button>
                </div>
              )}
            </div>

            <label>Tên công việc</label>
            <input
              type="text"
              placeholder="Ví dụ: Kiểm tra file mã nguồn hoặc tạo tính năng mới"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isBusy}
            />

            <label>Yêu cầu chi tiết</label>
            <textarea
              placeholder="Mô tả cụ thể tác vụ bạn muốn Agent thực hiện trong thư mục trên..."
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              disabled={isBusy}
              required
            />

            <label>Ưu tiên</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              disabled={isBusy}
            >
              <option>Bình thường</option>
              <option>Quan trọng</option>
              <option>Gấp</option>
            </select>

            {/* Display Past Result if viewing existing task */}
            {task && task.response_text && (
              <div style={{ marginTop: 15 }}>
                <label>Kết quả đã hoàn tất:</label>
                <pre className="result">{task.response_text}</pre>
              </div>
            )}

            {task && task.error_text && (
              <div style={{ marginTop: 15 }}>
                <label>Thông báo lỗi / gián đoạn:</label>
                <div className="warning" style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' }}>
                  {task.error_text}
                </div>
              </div>
            )}

            {/* Session info & Actions */}
            <div className="modal-actions" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="actions">
                <span className="date">
                  Phiên: {currentAgent?.conversation_id ? currentAgent.conversation_id.slice(0, 8) + '...' : 'Phiên mới'}
                </span>
                {currentAgent?.conversation_id && (
                  <button
                    type="button"
                    className="small"
                    onClick={() => onResetConversation(agentId)}
                    disabled={isBusy}
                    title="Xóa phiên cũ để tạo phiên hội thoại mới"
                  >
                    🔄 Tạo phiên mới
                  </button>
                )}
              </div>

              <div className="actions">
                <button type="button" onClick={onClose}>Đóng</button>
                {!isBusy && (
                  <button type="submit" className="primary">
                    ⚡ Bắt đầu thực thi
                  </button>
                )}
              </div>
            </div>
          </form>

          {/* History list for this agent */}
          {historyTasks.length > 0 && (
            <div style={{ marginTop: 24, borderTop: '1px solid var(--line)', paddingTop: 16 }}>
              <h3 style={{ fontSize: 14, margin: '0 0 10px' }}>Lịch sử công việc của {currentAgent?.name} ({historyTasks.length})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 180, overflowY: 'auto' }}>
                {historyTasks.map((h) => (
                  <div key={h.id} style={{ background: '#f5f4ef', padding: '8px 12px', borderRadius: 8, fontSize: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span className="tag" style={{ background: h.status === 'SUCCESS' ? '#dcfce7' : h.status === 'RUNNING' ? '#fef3c7' : '#fee2e2' }}>
                        {h.status === 'SUCCESS' ? '✓ Hoàn tất' : h.status === 'RUNNING' ? '⚡ Đang làm' : h.status === 'INTERRUPTED' ? '⏸ Bị gián đoạn' : '✕ Lỗi'}
                      </span>
                      <span className="date">{new Date(h.started_at).toLocaleString()}</span>
                    </div>
                    <strong style={{ display: 'block', marginBottom: 4 }}>{h.prompt}</strong>
                    {h.response_text && (
                      <p style={{ margin: 0, fontSize: 11, color: '#475569', maxHeight: 40, overflow: 'hidden' }}>
                        {h.response_text}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Visual In-App Folder Picker Dialog */}
      {showFolderBrowser && (
        <FolderBrowserModal
          initialPath={currentAgent?.folder_path || ''}
          onSelect={async (newPath) => {
            await onUpdateAgentFolder(agentId, newPath);
            setFolderPathInput(newPath);
            setShowFolderBrowser(false);
          }}
          onClose={() => setShowFolderBrowser(false)}
        />
      )}
    </div>
  );
};
