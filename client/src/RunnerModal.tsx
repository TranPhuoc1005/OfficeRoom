import React, { useState } from 'react';
import { supabase } from './supabase';
import type { RunnerInfo, ProjectInfo } from './supabase';

interface RunnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  runners: RunnerInfo[];
  projects: ProjectInfo[];
  onRefresh: () => void;
}

export const RunnerModal: React.FC<RunnerModalProps> = ({
  isOpen,
  onClose,
  runners,
  projects,
  onRefresh
}) => {
  const [createdPair, setCreatedPair] = useState<{
    runner_id: string;
    secret_token: string;
    name: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreatePair = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('create_runner_pair', {
        p_name: 'Windows Workstation'
      });
      if (error) {
        alert(`Lỗi tạo Runner: ${error.message}`);
      } else if (data) {
        setCreatedPair(data);
        onRefresh();
      }
    } catch (err: any) {
      alert(`Lỗi: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRunner = async (runnerId: string, runnerName: string) => {
    if (!confirm(`Bạn có chắc muốn xóa thiết bị Runner "${runnerName}" khỏi văn phòng?`)) return;
    if (!supabase) return;
    setDeletingId(runnerId);
    try {
      const { error } = await supabase.from('runners').delete().eq('id', runnerId);
      if (error) {
        alert(`Lỗi xóa: ${error.message}`);
      } else {
        onRefresh();
      }
    } catch (err: any) {
      alert(`Lỗi: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const copyEnvBlock = () => {
    if (!createdPair) return;
    const block = `SUPABASE_URL=${import.meta.env.VITE_SUPABASE_URL}
SUPABASE_ANON_KEY=${import.meta.env.VITE_SUPABASE_ANON_KEY}
RUNNER_ID=${createdPair.runner_id}
RUNNER_SECRET_TOKEN=${createdPair.secret_token}
RUNNER_NAME=${createdPair.name}
`;
    navigator.clipboard.writeText(block);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div
      className="modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99998
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-card"
        style={{
          maxWidth: '620px',
          width: '92%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '24px',
          background: 'var(--panel-bg, #fffbf0)',
          border: '3px solid var(--border, #2d3748)',
          boxShadow: '6px 6px 0px rgba(0,0,0,0.18)',
          borderRadius: '8px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🖥️</span> Quản Lý Windows Local Runner ({runners.length})
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: '#64748b'
            }}
          >
            ✕
          </button>
        </div>

        {/* Runners List */}
        <div style={{ marginBottom: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {runners.length === 0 ? (
            <div style={{ padding: '16px', border: '1px dashed #cbd5e1', borderRadius: '6px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
              Chưa có máy Runner nào được kết nối với văn phòng này. Bấm nút bên dưới để tạo mã kết nối.
            </div>
          ) : (
            runners.map((r) => {
              const isOnline = r.isOnline;
              const runnerProjects = projects.filter((p) => p.runner_id === r.id);
              return (
                <div
                  key={r.id}
                  style={{
                    padding: '14px',
                    backgroundColor: isOnline ? '#f0fdf4' : '#fef2f2',
                    border: `2px solid ${isOnline ? '#22c55e' : '#ef4444'}`,
                    borderRadius: '8px',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span
                        style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          backgroundColor: isOnline ? '#22c55e' : '#ef4444',
                          boxShadow: `0 0 8px ${isOnline ? '#22c55e' : '#ef4444'}`,
                          display: 'inline-block'
                        }}
                      />
                      <span style={{ fontWeight: 'bold', fontSize: '15px', color: '#0f172a' }}>
                        {r.name || 'Windows Workstation'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 'bold',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: isOnline ? '#dcfce7' : '#fee2e2',
                          color: isOnline ? '#166534' : '#991b1b'
                        }}
                      >
                        {isOnline ? '🟢 TRỰC TUYẾN' : '🔴 NGOẠI TUYẾN'}
                      </span>
                      <button
                        onClick={() => handleDeleteRunner(r.id, r.name)}
                        disabled={deletingId === r.id}
                        title="Xóa thiết bị runner này khỏi danh sách văn phòng"
                        style={{
                          background: 'none',
                          border: '1px solid #cbd5e1',
                          borderRadius: '4px',
                          padding: '2px 6px',
                          fontSize: '11px',
                          color: '#dc2626',
                          cursor: 'pointer'
                        }}
                      >
                        {deletingId === r.id ? '...' : '🗑️ Xóa'}
                      </button>
                    </div>
                  </div>

                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#475569', lineHeight: '1.6' }}>
                    <div>
                      • <strong>ID:</strong> <code style={{ fontSize: '11px' }}>{r.id}</code>
                    </div>
                    <div>
                      • <strong>Tín hiệu cuối:</strong>{' '}
                      {r.last_heartbeat_at
                        ? new Date(r.last_heartbeat_at).toLocaleTimeString()
                        : 'Chưa nhận tín hiệu'}
                    </div>
                    {r.metadata?.hostname && (
                      <div>
                        • <strong>Máy trạm:</strong> {r.metadata.hostname} ({r.metadata.platform || 'win32'})
                      </div>
                    )}
                    {r.metadata?.agyBinary && (
                      <div style={{ wordBreak: 'break-all' }}>
                        • <strong>CLI Path:</strong> {r.metadata.agyBinary}
                      </div>
                    )}
                    <div>
                      • <strong>Thư mục dự án:</strong> {runnerProjects.length} thư mục
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Registered Projects List */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 'bold', margin: 0 }}>
              📁 Thư mục dự án đồng bộ trên máy Windows ({projects.length})
            </h3>
            <span style={{ fontSize: '11px', color: '#64748b' }}>Tự động đồng bộ</span>
          </div>

          {projects.length === 0 ? (
            <div style={{ padding: '12px', border: '1px dashed #cbd5e1', borderRadius: '6px', fontSize: '13px', color: '#64748b', textAlign: 'center' }}>
              Chưa có thư mục nào được đồng bộ từ runner. Khi runner bật, các thư mục dự án sẽ tự động xuất hiện ở đây.
            </div>
          ) : (
            <div style={{ maxHeight: '140px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px' }}>
              {projects.map((p) => (
                <div
                  key={p.id}
                  style={{
                    padding: '6px 8px',
                    borderBottom: '1px solid #f1f5f9',
                    fontSize: '12px',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <strong style={{ color: '#0f172a' }}>{p.name}</strong>
                  <span style={{ color: '#64748b', fontSize: '11px', fontFamily: 'monospace' }}>{p.path}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pairing Box */}
        {createdPair ? (
          <div
            style={{
              padding: '16px',
              backgroundColor: '#fffbeb',
              border: '2px solid #f59e0b',
              borderRadius: '6px',
              marginBottom: '16px'
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#92400e', marginBottom: '8px' }}>
              🔑 MÃ KẾT NỐI RUNNER MỚI (Lưu ý: Chỉ hiện một lần)
            </div>
            <p style={{ fontSize: '12px', color: '#78350f', margin: '0 0 10px 0' }}>
              Dán nội dung sau vào file <code>runner/.env</code> trên máy Windows của bạn:
            </p>
            <pre
              style={{
                backgroundColor: '#1e293b',
                color: '#f8fafc',
                padding: '10px',
                borderRadius: '4px',
                fontSize: '11px',
                overflowX: 'auto',
                fontFamily: 'monospace'
              }}
            >
              {`RUNNER_ID=${createdPair.runner_id}\nRUNNER_SECRET_TOKEN=${createdPair.secret_token}`}
            </pre>
            <button
              onClick={copyEnvBlock}
              style={{
                marginTop: '8px',
                padding: '6px 14px',
                backgroundColor: '#f59e0b',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              {copied ? '✓ Đã sao chép cấu hình!' : '📋 Sao chép cấu hình .env'}
            </button>
          </div>
        ) : (
          <div style={{ marginBottom: '16px' }}>
            <button
              onClick={handleCreatePair}
              disabled={loading}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#f8fafc',
                border: '2px dashed #94a3b8',
                borderRadius: '6px',
                color: '#334155',
                fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '13px'
              }}
            >
              {loading ? 'Đang tạo...' : '+ Ghép nối máy Windows Runner mới'}
            </button>
          </div>
        )}

        {/* Quick Instructions */}
        <div style={{ fontSize: '12px', color: '#64748b', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
          <strong>💡 Hướng dẫn khởi động trên máy Windows:</strong>
          <ol style={{ margin: '6px 0 0 0', paddingLeft: '20px', lineHeight: '1.6' }}>
            <li>Mở PowerShell tại thư mục mã nguồn trên máy Windows.</li>
            <li>Chạy lệnh: <code>powershell .\start-runner.ps1</code></li>
            <li>Runner sẽ tự động kết nối, giữ phiên làm việc và thực thi các tác vụ bạn giao từ website.</li>
          </ol>
        </div>
      </div>
    </div>
  );
};
