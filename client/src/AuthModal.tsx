import React, { useState } from 'react';
import { supabase } from './supabase';

interface AuthModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  onClose?: () => void;
  onUseLocalMode?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onSuccess, onClose, onUseLocalMode }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('tranphuoc1005@gmail.com');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen || !supabase) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim()
        });

        if (error) {
          setErrorMsg(error.message);
        } else if (data.session) {
          onSuccess();
        } else {
          setSuccessMsg('Đăng ký thành công! Vui lòng kiểm tra email để xác nhận tài khoản (nếu Supabase bật email confirmation).');
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim()
        });

        if (error) {
          setErrorMsg(error.message === 'Invalid login credentials' ? 'Email hoặc mật khẩu không chính xác.' : error.message);
        } else if (data.session) {
          onSuccess();
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Đã xảy ra lỗi kết nối');
    } finally {
      setLoading(false);
    }
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
        zIndex: 99999
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) {
          onClose();
        }
      }}
    >
      <div
        className="modal-card"
        style={{
          position: 'relative',
          maxWidth: '430px',
          width: 'calc(100% - 32px)',
          padding: '28px 24px',
          background: 'var(--panel-bg, #fffbf0)',
          border: '3px solid var(--border, #2d3748)',
          boxShadow: '8px 8px 0px rgba(0,0,0,0.25)',
          borderRadius: '12px',
          boxSizing: 'border-box'
        }}
      >
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '14px',
              right: '16px',
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: '#64748b'
            }}
            title="Đóng"
          >
            ✕
          </button>
        )}

        <div style={{ textAlign: 'center', marginBottom: '18px' }}>
          <div style={{ fontSize: '32px', marginBottom: '6px' }}>🏢</div>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--ink, #1a202c)', margin: 0 }}>
            {isSignUp ? 'Tạo Văn Phòng Mới' : 'Đăng Nhập Pixel Office'}
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '6px' }}>
            {isSignUp
              ? 'Mỗi tài khoản sở hữu một văn phòng riêng, đồng bộ đa thiết bị.'
              : 'Đăng nhập để xem đội ngũ 7 agent, dự án và kết nối Windows Runner.'}
          </p>
        </div>

        {errorMsg && (
          <div
            style={{
              padding: '10px 12px',
              backgroundColor: '#fee2e2',
              border: '1px solid #ef4444',
              borderRadius: '6px',
              color: '#991b1b',
              fontSize: '13px',
              marginBottom: '14px'
            }}
          >
            ⚠️ {errorMsg}
          </div>
        )}

        {successMsg && (
          <div
            style={{
              padding: '10px 12px',
              backgroundColor: '#ecfdf5',
              border: '1px solid #10b981',
              borderRadius: '6px',
              color: '#065f46',
              fontSize: '13px',
              marginBottom: '14px'
            }}
          >
            ✓ {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>
              Email:
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ten@congty.com"
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '6px',
                border: '2px solid #cbd5e1',
                boxSizing: 'border-box',
                fontSize: '14px'
              }}
            />
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>
              Mật khẩu:
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '6px',
                border: '2px solid #cbd5e1',
                boxSizing: 'border-box',
                fontSize: '14px'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: 'var(--sage, #4ade80)',
              color: '#0f172a',
              border: '2px solid #1e293b',
              borderRadius: '6px',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '3px 3px 0px #1e293b',
              fontSize: '14px'
            }}
          >
            {loading ? 'Đang xử lý...' : isSignUp ? 'Đăng ký tài khoản' : 'Đăng nhập'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px' }}>
          {isSignUp ? (
            <span>
              Đã có tài khoản?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(false);
                  setErrorMsg(null);
                }}
                style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
              >
                Đăng nhập
              </button>
            </span>
          ) : (
            <span>
              Chưa có tài khoản?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(true);
                  setErrorMsg(null);
                }}
                style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
              >
                Tạo văn phòng mới
              </button>
            </span>
          )}
        </div>

        {onUseLocalMode && (
          <div style={{ marginTop: '14px', borderTop: '1px dashed #cbd5e1', paddingTop: '10px', textAlign: 'center' }}>
            <button
              type="button"
              onClick={onUseLocalMode}
              style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '12px', cursor: 'pointer' }}
            >
              Chuyển sang chế độ Local (Không dùng Cloud)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
