import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';

interface ReceptionScreenProps {
  isOpen: boolean;
  onSuccess: () => void;
  onUseLocalMode?: () => void;
  onClose?: () => void;
}

type AuthMode = 'login' | 'register' | 'reset';

export const ReceptionScreen: React.FC<ReceptionScreenProps> = ({
  isOpen,
  onSuccess,
  onUseLocalMode,
  onClose
}) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [officeName, setOfficeName] = useState('');
  const [email, setEmail] = useState('tranphuoc1005@gmail.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);

  const sceneRef = useRef<HTMLDivElement | null>(null);

  // Resize scene cover with 1672/941 aspect ratio matching Cozy preview
  useEffect(() => {
    const handleResize = () => {
      if (!sceneRef.current) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const scale = Math.max(w / 1672, h / 941);
      const sw = 1672 * scale;
      const sh = 941 * scale;
      sceneRef.current.style.width = `${sw}px`;
      sceneRef.current.style.height = `${sh}px`;
      sceneRef.current.style.left = `${w < 800 ? (w - sw) * 0.33 : w - sw}px`;
      sceneRef.current.style.top = `${(h - sh) / 2}px`;
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      if (onUseLocalMode) {
        onUseLocalMode();
        return;
      }
      setErrorMsg('Supabase chưa được cấu hình. Bạn có thể chọn Chế độ ngoại tuyến bên dưới.');
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === 'register') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
          options: {
            data: {
              office_name: officeName.trim() || 'Pixel Office'
            }
          }
        });

        if (error) {
          setErrorMsg(error.message);
        } else if (data.session) {
          triggerSuccess();
        } else {
          setSuccessMsg('Đăng ký thành công! Vui lòng kiểm tra email để xác nhận tài khoản.');
        }
      } else if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin
        });

        if (error) {
          setErrorMsg(error.message);
        } else {
          setSuccessMsg('Đã gửi liên kết đặt lại mật khẩu về email của bạn.');
        }
      } else {
        // Login mode
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim()
        });

        if (error) {
          setErrorMsg(
            error.message === 'Invalid login credentials'
              ? 'Email hoặc mật khẩu không chính xác.'
              : error.message
          );
        } else if (data.session) {
          triggerSuccess();
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  };

  const triggerSuccess = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onSuccess();
    }, 450);
  };

  return (
    <section
      id="entrance"
      className={`entrance ${isLeaving ? 'leaving' : ''}`}
      aria-label="Chào mừng đến Pixel Office"
    >
      {/* Background Illustrated Scene */}
      <div className="entrance-scene" id="entranceScene" ref={sceneRef}>
        <div className="entrance-brand">
          <span className="brand-leaf">❧</span>
          <div>
            <h1>PIXEL OFFICE</h1>
            <p>Đội của bạn đang chờ.</p>
          </div>
        </div>

        {/* Real Interactive Reception Form Overlay */}
        <form
          className="reception-form"
          data-mode={mode}
          onSubmit={handleSubmit}
          autoComplete="on"
        >
          <div className="welcome-icon">❧</div>
          <div className="eyebrow">A LITTLE PLACE FOR BIG IDEAS</div>
          <h2 id="welcomeTitle">
            {mode === 'register'
              ? 'Mở văn phòng mới'
              : mode === 'reset'
              ? 'Tìm lại chìa khóa'
              : 'Vào văn phòng'}
          </h2>
          <p className="welcome-sub" id="welcomeSub">
            {mode === 'register'
              ? 'Một góc nhỏ cho những ý tưởng lớn.'
              : mode === 'reset'
              ? 'Cùng trở lại với đội của bạn.'
              : 'Một ngày mới, cùng đội của bạn.'}
          </p>

          {errorMsg && (
            <div
              style={{
                padding: '8px 11px',
                background: '#fee2e2',
                border: '1px solid #ef4444',
                borderRadius: '6px',
                color: '#991b1b',
                fontSize: '11px',
                margin: '6px 0 8px'
              }}
            >
              ⚠️ {errorMsg}
            </div>
          )}

          {successMsg && (
            <div
              style={{
                padding: '8px 11px',
                background: '#ecfdf5',
                border: '1px solid #10b981',
                borderRadius: '6px',
                color: '#065f46',
                fontSize: '11px',
                margin: '6px 0 8px'
              }}
            >
              ✓ {successMsg}
            </div>
          )}

          <div id="welcomeFields">
            {mode === 'register' && (
              <div id="officeNameBlock">
                <label htmlFor="authOfficeName">Tên văn phòng</label>
                <input
                  id="authOfficeName"
                  type="text"
                  placeholder="Văn phòng Pixel của bạn"
                  value={officeName}
                  onChange={(e) => setOfficeName(e.target.value)}
                  maxLength={50}
                />
              </div>
            )}

            <label htmlFor="authEmail">Email</label>
            <input
              id="authEmail"
              type="email"
              required
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />

            {mode !== 'reset' && (
              <div id="passwordBlock">
                <label htmlFor="authPassword">Mật khẩu</label>
                <div className="password-preview">
                  <input
                    id="authPassword"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Nhập mật khẩu..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    tabIndex={-1}
                  >
                    {showPassword ? '👁' : '◉'}
                  </button>
                </div>
                {mode === 'login' && (
                  <button
                    type="button"
                    id="forgotPreview"
                    className="text-link"
                    onClick={() => {
                      setMode('reset');
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                  >
                    Quên mật khẩu?
                  </button>
                )}
              </div>
            )}
          </div>

          <button
            type="submit"
            id="enterOffice"
            className="wood-primary"
            disabled={loading}
          >
            {loading ? (
              'Đang xử lý...'
            ) : mode === 'register' ? (
              <>Mở văn phòng mới <span>→</span></>
            ) : mode === 'reset' ? (
              <>Gửi liên kết khôi phục <span>→</span></>
            ) : (
              <>Vào văn phòng <span>→</span></>
            )}
          </button>

          {mode === 'login' && (
            <button
              type="button"
              id="createPreview"
              className="text-link create-link"
              onClick={() => {
                setMode('register');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
            >
              Tạo văn phòng mới
            </button>
          )}

          {mode !== 'login' && (
            <button
              type="button"
              id="backWelcome"
              className="text-link"
              style={{ marginTop: '10px' }}
              onClick={() => {
                setMode('login');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
            >
              ← Trở lại đăng nhập
            </button>
          )}

          <p id="previewAuthNote" className="preview-auth-note">
            Bảo mật với Supabase Auth · Dữ liệu được mã hóa
          </p>
        </form>
      </div>

      {/* Floating Leaves */}
      {[0, 1, 2, 3, 4].map((i) => (
        <i
          key={i}
          className="leaf-particle"
          style={{
            left: `${8 + i * 18}%`,
            top: '-20px',
            animationDelay: `${-i * 2.7}s`,
            animationDuration: `${12 + i * 2}s`
          }}
        />
      ))}

      {/* Bottom Bar */}
      <div className="entrance-bottom">
        <span>Pixel Office · Cozy Edition</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          {onUseLocalMode && (
            <button
              type="button"
              onClick={onUseLocalMode}
              title="Vào văn phòng bằng cơ sở dữ liệu SQLite cục bộ (offline)"
            >
              Chế độ ngoại tuyến (SQLite) ↗
            </button>
          )}
          {onClose && (
            <button type="button" onClick={onClose} title="Đóng màn hình lễ tân">
              Đóng ✕
            </button>
          )}
        </div>
      </div>
    </section>
  );
};
