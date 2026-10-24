import React, { useState, useEffect } from 'react';

interface FolderBrowserModalProps {
  initialPath: string;
  onSelect: (selectedPath: string) => void;
  onClose: () => void;
}

interface BrowseData {
  currentPath: string;
  parentPath: string | null;
  drives: string[];
  shortcuts: Array<{ name: string; path: string }>;
  folders: Array<{ name: string; path: string }>;
}

export const FolderBrowserModal: React.FC<FolderBrowserModalProps> = ({
  initialPath,
  onSelect,
  onClose
}) => {
  const [data, setData] = useState<BrowseData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState(initialPath);
  const [selectedPath, setSelectedPath] = useState(initialPath);
  const [searchFilter, setSearchFilter] = useState('');
  const [isNativePicking, setIsNativePicking] = useState(false);

  const fetchFolder = async (targetPath: string) => {
    if (!targetPath) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/utils/browse-folder?path=${encodeURIComponent(targetPath)}`);
      const result = await res.json();
      if (res.ok) {
        setData(result);
        setSelectedPath(result.currentPath);
        setManualInput(result.currentPath);
        setSearchFilter('');
        if (result.warning) {
          setError(result.warning);
        }
      } else {
        setError(result.error || 'Không thể đọc thư mục này.');
      }
    } catch (err: any) {
      setError(`Lỗi kết nối: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFolder(initialPath);
  }, [initialPath]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleNativePicker = async () => {
    setIsNativePicking(true);
    try {
      const res = await fetch('/api/utils/pick-folder', { method: 'POST' });
      const resData = await res.json();
      if (resData.selectedPath) {
        onSelect(resData.selectedPath);
        onClose();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsNativePicking(false);
    }
  };

  // Build clickable breadcrumbs from currentPath
  const getBreadcrumbs = (path: string) => {
    if (!path) return [];
    const normalized = path.replace(/\//g, '\\');
    const parts = normalized.split('\\').filter(Boolean);
    const crumbs: Array<{ label: string; fullPath: string }> = [];

    let accumulated = '';
    parts.forEach((part, index) => {
      if (index === 0 && part.includes(':')) {
        accumulated = part + '\\';
        crumbs.push({ label: part, fullPath: accumulated });
      } else {
        accumulated = accumulated.endsWith('\\') ? accumulated + part : accumulated + '\\' + part;
        crumbs.push({ label: part, fullPath: accumulated });
      }
    });
    return crumbs;
  };

  const breadcrumbs = data?.currentPath ? getBreadcrumbs(data.currentPath) : [];

  const filteredFolders = (data?.folders || []).filter((f) =>
    f.name.toLowerCase().includes(searchFilter.toLowerCase().trim())
  );

  return (
    <div className="folder-browser-backdrop" onClick={onClose}>
      <div className="folder-browser-dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        {/* Header */}
        <div className="browser-header">
          <div className="browser-title-row">
            <span className="browser-icon">📂</span>
            <div>
              <h3>Chọn thư mục dự án cho Agent</h3>
            </div>
          </div>
          <button className="btn-close" onClick={onClose} title="Đóng (Esc)">✕</button>
        </div>

        {/* Breadcrumb Path Bar */}
        <div className="browser-breadcrumbs-bar">
          <span className="shortcuts-label">Đường dẫn:</span>
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={crumb.fullPath}>
              <button
                type="button"
                className="breadcrumb-item"
                onClick={() => fetchFolder(crumb.fullPath)}
                title={`Chuyển tới ${crumb.fullPath}`}
              >
                {crumb.label}
              </button>
              {idx < breadcrumbs.length - 1 && <span className="breadcrumb-sep">›</span>}
            </React.Fragment>
          ))}
        </div>

        {/* Quick Jump Shortcuts & Drives */}
        <div className="browser-shortcuts-bar">
          <span className="shortcuts-label">Truy cập nhanh:</span>
          {data?.shortcuts.map((sc) => (
            <button
              key={sc.path}
              type="button"
              className="shortcut-chip"
              onClick={() => fetchFolder(sc.path)}
              title={sc.path}
            >
              {sc.name}
            </button>
          ))}
          {data?.drives.map((d) => (
            <button
              key={d}
              type="button"
              className="shortcut-chip drive-chip"
              onClick={() => fetchFolder(d + '\\')}
              title={`Ổ đĩa ${d}`}
            >
              💽 {d}
            </button>
          ))}
        </div>

        {/* Path Input Row */}
        <div className="browser-nav-row">
          <button
            type="button"
            className="btn-nav-up"
            onClick={() => data?.parentPath && fetchFolder(data.parentPath)}
            disabled={!data?.parentPath || loading}
            title="Lên một cấp (Alt+Up)"
          >
            ⬆️ Lên một cấp
          </button>

          <input
            type="text"
            className="path-input-field"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') fetchFolder(manualInput);
            }}
            placeholder="Nhập đường dẫn đầy đủ (ví dụ C:\projects\my-app)..."
          />

          <button
            type="button"
            className="btn-go"
            onClick={() => fetchFolder(manualInput)}
            disabled={loading}
          >
            Đi tới
          </button>
        </div>

        {/* Search filter within folder */}
        <div className="browser-filter-row">
          <input
            type="text"
            className="browser-filter-input"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="🔍 Tìm nhanh thư mục trong thư mục hiện tại..."
          />
        </div>

        {/* Folder List Grid */}
        <div className="browser-list-container">
          {loading && <div className="browser-loading">⏳ Đang đọc danh sách thư mục...</div>}
          {error && <div className="warning" style={{ margin: 0 }}>⚠️ {error}</div>}

          {!loading && !error && filteredFolders.length === 0 && (
            <div className="empty-state">
              {searchFilter ? 'Không tìm thấy thư mục phù hợp với bộ lọc.' : 'Thư mục này không có thư mục con nào.'}
            </div>
          )}

          {!loading && !error && filteredFolders.length > 0 && (
            <div className="folder-grid">
              {filteredFolders.map((f) => {
                const isSelected = selectedPath === f.path;
                return (
                  <div
                    key={f.path}
                    className={`folder-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedPath(f.path);
                      setManualInput(f.path);
                    }}
                    onDoubleClick={() => fetchFolder(f.path)}
                    title={`Click để chọn: ${f.name}\nNhấp đúp để mở thư mục`}
                  >
                    <span className="folder-item-icon">📁</span>
                    <span className="folder-item-name">{f.name}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="browser-footer">
          <div className="browser-footer-top">
            <span className="selected-tag">Thư mục chọn:</span>
            <code className="selected-code" title={selectedPath}>{selectedPath}</code>
          </div>

          <div className="browser-footer-actions">
            <button
              type="button"
              className="btn-nav-up"
              onClick={handleNativePicker}
              disabled={isNativePicking}
              title="Mở hộp thoại Browse For Folder của Windows nếu cần"
            >
              {isNativePicking ? 'Đang mở Windows...' : '🖥️ Hộp thoại Windows'}
            </button>

            <div className="footer-btns">
              <button type="button" className="btn-nav-up" onClick={onClose}>
                Hủy
              </button>
              <button
                type="button"
                className="btn-go"
                style={{ padding: '8px 18px', fontWeight: 600 }}
                onClick={() => {
                  onSelect(selectedPath);
                  onClose();
                }}
              >
                ✅ Chọn thư mục này
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
