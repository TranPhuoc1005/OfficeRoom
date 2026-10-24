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
  onDeletePlacedItem: (id: string) => void;
  onAssignDeskAgent: (placedId: string, agentId: string | null) => void;
  agents: Array<{ id: string; name: string }>;
  canUndo: boolean;
  onUndo: () => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving?: boolean;
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
  onDeletePlacedItem,
  onAssignDeskAgent,
  agents,
  canUndo,
  onUndo,
  onSave,
  onCancel,
  isSaving = false
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
          <span className="decor-icon-badge">🔨</span>
          <div>
            <strong>CHẾ ĐỘ TRANG TRÍ VĂN PHÒNG</strong>
            <span className="decor-hint">
              {selectedPlacedItem
                ? `Đang chọn: ${selectedPlacedItem.type} (Kéo để di chuyển, hoặc gán chủ bàn)`
                : selectedCatalogItem
                ? `Đang chọn đặt: ${selectedCatalogItem.name} — Bấm lên sàn văn phòng để đặt`
                : 'Chọn đồ nội thất bên dưới rồi bấm vào sàn phòng để đặt (Xanh: hợp lệ, Đỏ: bị chặn)'}
            </span>
          </div>
        </div>

        {/* Selected Placed Item Controls (e.g. Desk Owner, Delete) */}
        {selectedPlacedItem && (
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
              title="Xóa món đồ này khỏi văn phòng"
            >
              🗑️ Xóa đồ
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
