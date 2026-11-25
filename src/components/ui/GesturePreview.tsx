import React from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { CameraStatus, GestureKind } from '../../types';

interface GesturePreviewProps {
  status: CameraStatus;
  errorMessage: string | null;
  detectedGesture: GestureKind;
  handDetected: boolean;
  lastActionTip: string | null;
  videoRef: React.MutableRefObject<HTMLVideoElement | null>;
  overlayCanvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
  onRetry: () => void;
  onClose: () => void;
}

const GESTURE_LABELS: Record<GestureKind, string> = {
  none: '👋 已检测到手掌 · 移动控角',
  open_palm: '🖐 张开手掌 · 粒子散落',
  fist: '✊ 握拳 · 聚合成树',
  pinch: '🤏 捏合 · 放大/收回照片',
};

export const GesturePreview: React.FC<GesturePreviewProps> = ({
  status,
  errorMessage,
  detectedGesture,
  handDetected,
  lastActionTip,
  videoRef,
  overlayCanvasRef,
  onRetry,
  onClose,
}) => {
  if (status === 'idle') return null;

  return (
    <div className="glass-panel gesture-card">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 12,
          color: '#ffe6a3',
          fontWeight: 600,
        }}
      >
        <span>MediaPipe 手势识别</span>
        <button
          type="button"
          className="mini-btn"
          style={{ padding: '3px 6px' }}
          onClick={onClose}
          title="关闭手势面板"
        >
          <X size={13} />
        </button>
      </div>

      {status === 'error' ? (
        <div className="gesture-error-box">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 8 }}>
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2, color: '#fca5a5' }} />
            <span>{errorMessage || '摄像头或手势模型启动异常'}</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="mini-btn" onClick={onRetry}>
              <RefreshCw size={12} />
              <span>重试开启</span>
            </button>
            <button type="button" className="mini-btn" onClick={onClose}>
              <span>关闭</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="gesture-video-wrap">
            <video ref={videoRef} playsInline muted autoPlay />
            <canvas ref={overlayCanvasRef} width={320} height={240} />
            <div className="gesture-badge">
              {status === 'requesting'
                ? '等待授权摄像头...'
                : status === 'loading_model'
                  ? '加载手势识别模型...'
                  : handDetected
                    ? GESTURE_LABELS[detectedGesture]
                    : '请将手掌置于镜头前'}
            </div>
          </div>

          {lastActionTip && (
            <div
              style={{
                fontSize: 11,
                color: '#6ee7b7',
                background: 'rgba(6, 78, 59, 0.55)',
                border: '1px solid rgba(52, 211, 153, 0.4)',
                borderRadius: 8,
                padding: '4px 8px',
                textAlign: 'center',
              }}
            >
              {lastActionTip}
            </div>
          )}

          <div className="gesture-legend">
            <span>🖐 张掌 → 散落</span>
            <span>✊ 握拳 → 成树</span>
            <span>🤏 捏合 → 赏照</span>
            <span>👋 移动 → 旋倾</span>
          </div>
        </>
      )}
    </div>
  );
};
