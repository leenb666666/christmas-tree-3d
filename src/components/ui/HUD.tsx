import React from 'react';
import {
  Camera,
  CameraOff,
  Eye,
  EyeOff,
  Focus,
  Images,
  RotateCcw,
  Sparkles,
  Trees,
  Play,
  Pause,
  X,
} from 'lucide-react';
import { CameraStatus, PhotoItem, TreeMode } from '../../types';

interface HUDProps {
  mode: TreeMode;
  onToggleMode: () => void;
  showPhotos: boolean;
  onToggleShowPhotos: () => void;
  focusedPhoto: PhotoItem | null;
  onToggleFocusFront: () => void;
  onClearFocus: () => void;
  autoRotate: boolean;
  onToggleAutoRotate: () => void;
  onResetView: () => void;
  onOpenPhotoManager: () => void;
  cameraStatus: CameraStatus;
  onToggleCamera: () => void;
  photoCount: number;
}

export const HUD: React.FC<HUDProps> = ({
  mode,
  onToggleMode,
  showPhotos,
  onToggleShowPhotos,
  focusedPhoto,
  onToggleFocusFront,
  onClearFocus,
  autoRotate,
  onToggleAutoRotate,
  onResetView,
  onOpenPhotoManager,
  cameraStatus,
  onToggleCamera,
  photoCount,
}) => {
  const isCameraActive =
    cameraStatus === 'active' ||
    cameraStatus === 'requesting' ||
    cameraStatus === 'loading_model';

  return (
    <div className="hud-overlay">
      {/* Top Bar */}
      <div className="hud-top">
        <div className="glass-panel brand-card">
          <div className="brand-title">翡翠金辉 · 3D 圣诞树</div>
          <div className="brand-subtitle">
            {mode === 'tree' ? '圣诞树聚合态 · Emerald Tree' : '星尘粒子散落态 · Starlight Scatter'}
          </div>
        </div>

        <div className="top-actions">
          <button
            type="button"
            className="glass-btn"
            onClick={onOpenPhotoManager}
            title="替换拍立得照片与编辑文字说明"
          >
            <Images size={15} />
            <span>自定义照片 ({photoCount})</span>
          </button>

          <button
            type="button"
            className={`glass-btn ${showPhotos ? 'active' : ''}`}
            onClick={onToggleShowPhotos}
          >
            {showPhotos ? <Eye size={15} /> : <EyeOff size={15} />}
            <span>{showPhotos ? '隐藏照片' : '显示照片'}</span>
          </button>

          <button
            type="button"
            className={`glass-btn ${isCameraActive ? 'active' : ''}`}
            onClick={onToggleCamera}
          >
            {isCameraActive ? <CameraOff size={15} /> : <Camera size={15} />}
            <span>
              {cameraStatus === 'requesting'
                ? '请求权限中...'
                : cameraStatus === 'loading_model'
                  ? '加载手势模型...'
                  : cameraStatus === 'active'
                    ? '关闭手势识别'
                    : '开启手势识别'}
            </span>
          </button>
        </div>
      </div>

      {/* Focused photo quick banner */}
      {focusedPhoto && (
        <div className="glass-panel focused-photo-banner">
          <span>正在欣赏：{focusedPhoto.caption || '拍立得回忆'}</span>
          <button type="button" className="mini-btn" onClick={onClearFocus}>
            <X size={13} />
            <span>转回树上</span>
          </button>
        </div>
      )}

      {/* Bottom Dock */}
      <div className="hud-bottom">
        {!focusedPhoto && (
          <div className="hint-bar">
            拖拽旋转 · 滚轮缩放 · 点击任意拍立得放大赏图，再次点击转回树上
          </div>
        )}

        <div className="glass-panel bottom-dock">
          <button
            type="button"
            className="glass-btn primary-gold"
            onClick={onToggleMode}
          >
            {mode === 'tree' ? <Sparkles size={15} /> : <Trees size={15} />}
            <span>{mode === 'tree' ? '切换为粒子散落态' : '聚合成圣诞树'}</span>
          </button>

          <button
            type="button"
            className={`glass-btn ${focusedPhoto ? 'active' : ''}`}
            onClick={onToggleFocusFront}
            disabled={!showPhotos || photoCount === 0}
            title="放大当前朝向正面的拍立得照片，再次点击转回树上"
          >
            <Focus size={15} />
            <span>{focusedPhoto ? '收回照片' : '放大正面照片'}</span>
          </button>

          <button
            type="button"
            className={`glass-btn ${autoRotate ? 'active' : ''}`}
            onClick={onToggleAutoRotate}
            title="开启或暂停自动旋转"
          >
            {autoRotate ? <Pause size={15} /> : <Play size={15} />}
            <span>{autoRotate ? '暂停旋转' : '自动旋转'}</span>
          </button>

          <button
            type="button"
            className="glass-btn"
            onClick={onResetView}
            title="重置相机视角"
          >
            <RotateCcw size={15} />
            <span>重置视角</span>
          </button>
        </div>
      </div>
    </div>
  );
};
