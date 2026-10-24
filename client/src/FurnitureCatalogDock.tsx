import React, { useState } from 'react';
import { FURNITURE_CATALOG } from './furniture-data';
import type {
  FurnitureCategory,
  FurnitureDefinition,
  PlacedFurniture
} from './furniture-data';

interface FurnitureCatalogDockProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCatalogItem: FurnitureDefinition | null;
  onSelectCatalogItem: (item: FurnitureDefinition | null) => void;
  selectedPlacedItem: PlacedFurniture | null;
  onSelectPlacedItem?: (item: PlacedFurniture | null) => void;
  onDeletePlacedItem: (id: string) => void;
  onAssignDeskAgent: (placedId: string, agentId: string | null) => void;
  agents: Array<{ id: string; name: string }>;
  canUndo: boolean;
  onUndo: () => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving?: boolean;
  isDeleteMode?: boolean;
  onToggleDeleteMode?: () => void;
}

const CATEGORY_TABS: Array<{ id: FurnitureCategory; label: string; icon: string }> = [
  { id: 'all', label: 'Tất cả', icon: '✨' },
  { id: 'desk', label: 'Bàn làm việc', icon: '🖥️' },
  { id: 'chair', label: 'Ghế ngồi', icon: '💺' },
  { id: 'plant', label: 'Cây cảnh', icon: '🪴' },
  { id: 'rug', label: 'Thảm trải', icon: '🧶' },
  { id: 'sofa', label: 'Nghỉ ngơi', icon: '🛋️' },
  { id: 'storage', label: 'Tủ & Kệ', icon: '📚' },
  { id: 'refreshment', label: 'Nước & Cà phê', icon: '☕' },
  { id: 'decor', label: 'Treo tường & Đèn', icon: '💡' }
];

export const FurnitureCatalogDock: React.FC<FurnitureCatalogDockProps> = ({
  isOpen,
  onClose,
  selectedCatalogItem,
  onSelectCatalogItem,
  selectedPlacedItem,
  onSelectPlacedItem,
  onDeletePlacedItem,
  onAssignDeskAgent,
  agents,
  canUndo,
  onUndo,
  onSave,
  onCancel,
  isSaving = false,
  isDeleteMode = false,
  onToggleDeleteMode
}) => {
  const [activeCategory, setActiveCategory] = useState<FurnitureCategory>('all');

  if (!isOpen) return null;

  const filteredItems = FURNITURE_CATALOG.filter(
    (item) => activeCategory === 'all' || item.category === activeCategory
  );

  return (
    <div className="furniture-catalog-dock" role="region" aria-label="Danh mục trang trí">
      {/* Top Decorate Action Bar */}
      <div className="decor-action-bar">
        <div className="decor-left-status">
          <div className="decor-tools-group">
            <button
              type="button"
              className={`btn-tool-mode ${!isDeleteMode && !selectedCatalogItem ? 'active' : ''}`}
              onClick={() => {
                if (isDeleteMode) onToggleDeleteMode?.();
                onSelectCatalogItem(null);
              }}
              title="Bấm để chọn món đồ trên sàn, kéo di chuyển hoặc xóa"
            >
              👆 Chọn & Di chuyển
            </button>
            <button
              type="button"
              className={`btn-tool-mode ${selectedCatalogItem ? 'active' : ''}`}
              onClick={() => {
                if (isDeleteMode) onToggleDeleteMode?.();
                if (!selectedCatalogItem && filteredItems.length > 0) {
                  onSelectCatalogItem(filteredItems[0]);
                }
              }}
              title="Chọn đồ nội thất từ kệ bên dưới để đặt vào phòng"
            >
              🔨 Đặt đồ mới
            </button>
            <button
              type="button"
              className={`btn-tool-mode btn-mode-delete ${isDeleteMode ? 'active' : ''}`}
              onClick={() => {
                onToggleDeleteMode?.();
                onSelectCatalogItem(null);
              }}
              title="Bật chế độ xóa nhanh: Bấm vào bất kỳ món đồ nào trên sàn để xóa ngay"
            >
              🗑️ Chế độ Xóa đồ
            </button>
          </div>

          <div className="decor-hint-container">
            <span className="decor-hint">
              {isDeleteMode ? (
                <strong style={{ color: '#f87171' }}>
                  ⚠️ ĐANG BẬT CHẾ ĐỘ XÓA: Bấm vào bất kỳ đồ nội thất nào trên sàn để xóa!
                </strong>
              ) : selectedPlacedItem ? (
                <span>
                  Đang chọn: <strong>{FURNITURE_CATALOG.find(f => f.type === selectedPlacedItem.type)?.name || selectedPlacedItem.type}</strong> — Kéo để di chuyển, hoặc bấm "Xóa đồ".
                </span>
              ) : selectedCatalogItem ? (
                <span>
                  Đang chọn đặt: <strong style={{ color: '#4ade80' }}>{selectedCatalogItem.name}</strong> — Bấm ô sàn xanh để đặt.
                </span>
              ) : (
                'Bấm vào đồ trên sàn để chọn/di chuyển/xóa, hoặc chọn đồ từ kệ bên dưới để đặt.'
              )}
            </span>
          </div>
        </div>

        {/* Selected Placed Item Controls (e.g. Desk Owner, Delete) */}
        {selectedPlacedItem && !isDeleteMode && (
          <div className="placed-item-controls">
            {selectedPlacedItem.type.startsWith('desk') && (
              <div className="desk-assignment-picker">
                <span className="label-sm">Chủ bàn:</span>
                <select
                  value={selectedPlacedItem.assignedAgentId || ''}
                  onChange={(e) =>
                    onAssignDeskAgent(
                      selectedPlacedItem.id,
                      e.target.value ? e.target.value : null
                    )
                  }
                >
                  <option value="">(Chưa gán agent)</option>
                  {agents.map((ag) => (
                    <option key={ag.id} value={ag.id}>
                      {ag.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button
              type="button"
              className="btn-danger-sm"
              onClick={() => onDeletePlacedItem(selectedPlacedItem.id)}
              title="Xóa món đồ này khỏi văn phòng (hoặc bấm phím Delete/Backspace)"
            >
              🗑️ Xóa món này
            </button>
            <button
              type="button"
              className="btn-close-sm"
              onClick={() => onSelectPlacedItem?.(null)}
              title="Bỏ chọn"
            >
              ✕
            </button>
          </div>
        )}

        {/* Action Controls: Undo, Cancel, Save */}
        <div className="decor-actions">
          <button
            type="button"
            className="btn-decor-undo"
            onClick={onUndo}
            disabled={!canUndo}
            title="Hoàn tác thay đổi vừa thực hiện"
          >
            ↶ Hoàn tác
          </button>
          <button
            type="button"
            className="btn-decor-cancel"
            onClick={onCancel}
            title="Hủy tất cả thay đổi chưa lưu và thoát"
          >
            ✕ Hủy thay đổi
          </button>
          <button
            type="button"
            className="btn-decor-save"
            onClick={onSave}
            disabled={isSaving}
            title="Lưu bố cục phòng và đồng bộ"
          >
            {isSaving ? 'Đang lưu...' : '✓ Lưu bố cục'}
          </button>
          <button
            type="button"
            className="small"
            style={{ minWidth: '32px', height: '32px', padding: 0 }}
            onClick={onClose}
            title="Đóng bảng trang trí"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Categories Bar */}
      <div className="decor-category-tabs">
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`category-tab ${activeCategory === tab.id ? 'active' : ''}`}
            onClick={() => setActiveCategory(tab.id)}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Catalog Items Horizontal List */}
      <div className="decor-items-shelf">
        {filteredItems.map((item) => {
          const isSelected = selectedCatalogItem?.type === item.type;
          return (
            <div
              key={item.type}
              className={`catalog-card ${isSelected ? 'selected' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => {
                if (isSelected) {
                  onSelectCatalogItem(null);
                } else {
                  onSelectCatalogItem(item);
                }
              }}
              title={item.description}
            >
              <div className="catalog-card-icon">{item.icon}</div>
              <div className="catalog-card-info">
                <strong>{item.name}</strong>
                <small>
                  Kích thước: {item.w}x{item.h} ô
                </small>
              </div>
              {isSelected && <span className="selected-indicator">Đã chọn</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
};
