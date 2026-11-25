import React, { useCallback, useMemo, useRef, useState } from 'react';
import { DEFAULT_PHOTOS } from './data/defaultPhotos';
import { PhotoItem, TreeMode } from './types';
import { ChristmasTreeScene } from './components/scene/ChristmasTreeScene';
import { HUD } from './components/ui/HUD';
import { GesturePreview } from './components/ui/GesturePreview';
import { PhotoManagerModal } from './components/ui/PhotoManagerModal';
import { useHandGesture } from './hooks/useHandGesture';

export const App: React.FC = () => {
  const [mode, setMode] = useState<TreeMode>('tree');
  const [photos, setPhotos] = useState<PhotoItem[]>(DEFAULT_PHOTOS);
  const [showPhotos, setShowPhotos] = useState(true);
  const [focusedPhotoId, setFocusedPhotoId] = useState<string | null>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [photoManagerOpen, setPhotoManagerOpen] = useState(false);
  const [resetViewSignal, setResetViewSignal] = useState(0);

  const focusFrontTriggerRef = useRef<(() => void) | null>(null);

  const handleToggleFocusFront = useCallback(() => {
    if (focusFrontTriggerRef.current) {
      focusFrontTriggerRef.current();
    }
  }, []);

  const handleGestureModeChange = useCallback((nextMode: TreeMode) => {
    setMode(nextMode);
  }, []);

  const handleGesturePinchToggle = useCallback(() => {
    if (!showPhotos) return;
    handleToggleFocusFront();
  }, [showPhotos, handleToggleFocusFront]);

  const {
    status: cameraStatus,
    errorMessage: cameraError,
    detectedGesture,
    handDetected,
    lastActionTip,
    videoRef,
    overlayCanvasRef,
    handControlRef,
    startCamera,
    stopCamera,
  } = useHandGesture({
    onModeChange: handleGestureModeChange,
    onPinchToggle: handleGesturePinchToggle,
  });

  const handleToggleCamera = useCallback(() => {
    if (cameraStatus === 'idle' || cameraStatus === 'error') {
      void startCamera();
    } else {
      stopCamera();
    }
  }, [cameraStatus, startCamera, stopCamera]);

  const handleToggleShowPhotos = useCallback(() => {
    setShowPhotos((prev) => {
      if (prev) setFocusedPhotoId(null);
      return !prev;
    });
  }, []);

  const handleUpdatePhoto = useCallback((id: string, patch: Partial<PhotoItem>) => {
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

  const handleAddPhoto = useCallback((item: PhotoItem) => {
    setPhotos((prev) => [...prev, item]);
    setShowPhotos(true);
  }, []);

  const handleRemovePhoto = useCallback((id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    setFocusedPhotoId((curr) => (curr === id ? null : curr));
  }, []);

  const handleResetDefaults = useCallback(() => {
    setPhotos(DEFAULT_PHOTOS);
    setFocusedPhotoId(null);
    setShowPhotos(true);
  }, []);

  const focusedPhoto = useMemo(
    () => photos.find((p) => p.id === focusedPhotoId) ?? null,
    [photos, focusedPhotoId]
  );

  return (
    <div className="app-root">
      <ChristmasTreeScene
        mode={mode}
        photos={photos}
        showPhotos={showPhotos}
        focusedPhotoId={focusedPhotoId}
        onSelectPhoto={setFocusedPhotoId}
        autoRotate={autoRotate}
        handControlRef={handControlRef}
        focusFrontTriggerRef={focusFrontTriggerRef}
        resetViewSignal={resetViewSignal}
      />

      <HUD
        mode={mode}
        onToggleMode={() => setMode((m) => (m === 'tree' ? 'scattered' : 'tree'))}
        showPhotos={showPhotos}
        onToggleShowPhotos={handleToggleShowPhotos}
        focusedPhoto={focusedPhoto}
        onToggleFocusFront={handleToggleFocusFront}
        onClearFocus={() => setFocusedPhotoId(null)}
        autoRotate={autoRotate}
        onToggleAutoRotate={() => setAutoRotate((r) => !r)}
        onResetView={() => {
          setFocusedPhotoId(null);
          setResetViewSignal((n) => n + 1);
        }}
        onOpenPhotoManager={() => setPhotoManagerOpen(true)}
        cameraStatus={cameraStatus}
        onToggleCamera={handleToggleCamera}
        photoCount={photos.length}
      />

      <GesturePreview
        status={cameraStatus}
        errorMessage={cameraError}
        detectedGesture={detectedGesture}
        handDetected={handDetected}
        lastActionTip={lastActionTip}
        videoRef={videoRef}
        overlayCanvasRef={overlayCanvasRef}
        onRetry={() => void startCamera()}
        onClose={stopCamera}
      />

      <PhotoManagerModal
        open={photoManagerOpen}
        photos={photos}
        onClose={() => setPhotoManagerOpen(false)}
        onUpdatePhoto={handleUpdatePhoto}
        onAddPhoto={handleAddPhoto}
        onRemovePhoto={handleRemovePhoto}
        onResetDefaults={handleResetDefaults}
        onFocusPhoto={(id) => {
          setShowPhotos(true);
          setFocusedPhotoId(id);
        }}
      />
    </div>
  );
};

export default App;
