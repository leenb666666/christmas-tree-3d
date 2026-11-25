import React, { useRef } from 'react';
import { ImagePlus, Plus, RotateCcw, Trash2, Upload, X } from 'lucide-react';
import { PhotoItem } from '../../types';

interface PhotoManagerModalProps {
  open: boolean;
  photos: PhotoItem[];
  onClose: () => void;
  onUpdatePhoto: (id: string, patch: Partial<PhotoItem>) => void;
  onAddPhoto: (item: PhotoItem) => void;
  onRemovePhoto: (id: string) => void;
  onResetDefaults: () => void;
  onFocusPhoto: (id: string) => void;
}

export const PhotoManagerModal: React.FC<PhotoManagerModalProps> = ({
  open,
  photos,
  onClose,
  onUpdatePhoto,
  onAddPhoto,
  onRemovePhoto,
  onResetDefaults,
  onFocusPhoto,
}) => {
  const addInputRef = useRef<HTMLInputElement | null>(null);

  if (!open) return null;

  const handleReplaceFile = (id: string, file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onUpdatePhoto(id, { url: reader.result });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file, idx) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          const cleanName = file.name.replace(/\.[^/.]+$/, '').slice(0, 18);
          onAddPhoto({
            id: `custom-${Date.now()}-${idx}`,
            url: reader.result,
            caption: cleanName || '新的圣诞回忆',
            date: '2026 · 专属珍藏',
          });
        }
      };
      reader.readAsDataURL(file);
    });
  };

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <div className="drawer-title">
            <ImagePlus size={18} />
            <span>拍立得照片管理</span>
          </div>
          <button type="button" className="mini-btn" onClick={onClose}>
            <X size={15} />
            <span>关闭</span>
          </button>
        </div>

        <p style={{ fontSize: 12, color: 'rgba(246, 239, 226, 0.72)', lineHeight: 1.55 }}>
          {photos.some((p) => p.id.startsWith('placeholder-'))
            ? '当前为默认圣诞留白相框。点击下方「更换图片」或「添加新照片」即可上传你自己的照片并修改手写文字说明（照片仅在你的浏览器本地生效，不会上传到服务器）。'
            : '点击下方「更换图片」可随时替换任意拍立得照片、修改手写文字说明，或新增更多照片挂上圣诞树。'}
        </p>

        <div className="drawer-list">
          {photos.map((photo, index) => (
            <div key={photo.id} className="photo-editor-card">
              <div
                className="photo-thumb-wrap"
                style={{ cursor: 'pointer' }}
                title="点击在 3D 场景中查看此照片"
                onClick={() => {
                  onFocusPhoto(photo.id);
                  onClose();
                }}
              >
                <img src={photo.url} alt={photo.caption} />
              </div>

              <div className="photo-fields">
                <div style={{ fontSize: 11, color: '#e8c77b', fontWeight: 600 }}>
                  拍立得 #{index + 1}
                </div>
                <input
                  type="text"
                  className="field-input"
                  value={photo.caption}
                  maxLength={24}
                  placeholder="输入文字说明..."
                  onChange={(e) => onUpdatePhoto(photo.id, { caption: e.target.value })}
                />
                <input
                  type="text"
                  className="field-input"
                  value={photo.date || ''}
                  maxLength={20}
                  placeholder="副标题或日期（可选）"
                  onChange={(e) => onUpdatePhoto(photo.id, { date: e.target.value })}
                />

                <div className="photo-card-actions">
                  <label className="mini-btn" style={{ cursor: 'pointer' }}>
                    <Upload size={12} />
                    <span>更换图片</span>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => handleReplaceFile(photo.id, e.target.files?.[0])}
                    />
                  </label>

                  <button
                    type="button"
                    className="mini-btn"
                    onClick={() => {
                      onFocusPhoto(photo.id);
                      onClose();
                    }}
                  >
                    <span>3D 聚焦</span>
                  </button>

                  {photos.length > 1 && (
                    <button
                      type="button"
                      className="mini-btn danger"
                      onClick={() => onRemovePhoto(photo.id)}
                      title="移除此拍立得"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="drawer-footer">
          <input
            ref={addInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => {
              handleAddFiles(e.target.files);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            className="glass-btn primary-gold"
            onClick={() => addInputRef.current?.click()}
          >
            <Plus size={15} />
            <span>添加新照片</span>
          </button>

          <button type="button" className="glass-btn" onClick={onResetDefaults}>
            <RotateCcw size={14} />
            <span>恢复默认</span>
          </button>
        </div>
      </div>
    </div>
  );
};
