import { useCallback, useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker, NormalizedLandmark } from '@mediapipe/tasks-vision';
import { CameraStatus, GestureKind, HandControlRef, TreeMode } from '../types';

interface UseHandGestureOptions {
  onModeChange: (mode: TreeMode) => void;
  onPinchToggle: () => void;
}

const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

interface Vec3Like {
  x: number;
  y: number;
  z: number;
}

function dist3D(a: Vec3Like, b: Vec3Like): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

/**
 * Computes joint straightness cosine at vertex B for segment A -> B -> C.
 * Straight finger => cos close to +1.0; bent/curled finger => cos < 0.35.
 */
function jointStraightness(a: Vec3Like, b: Vec3Like, c: Vec3Like): number {
  const v1x = b.x - a.x;
  const v1y = b.y - a.y;
  const v1z = b.z - a.z;
  const v2x = c.x - b.x;
  const v2y = c.y - b.y;
  const v2z = c.z - b.z;
  const l1 = Math.hypot(v1x, v1y, v1z);
  const l2 = Math.hypot(v2x, v2y, v2z);
  if (l1 < 1e-5 || l2 < 1e-5) return 0;
  return (v1x * v2x + v1y * v2y + v1z * v2z) / (l1 * l2);
}

/**
 * Aspect-corrected 2D + 3D world-landmark hybrid gesture classifier.
 * Using 3D joint angles + wrist-distance ratios makes open palm, fist, and pinch
 * accurate regardless of webcam aspect ratio, hand distance, or palm angle.
 */
function classifyHand(
  landmarks: NormalizedLandmark[],
  worldLandmarks: Vec3Like[] | undefined,
  aspectRatio: number,
  wasPinching: boolean
): {
  gesture: GestureKind;
  isPinching: boolean;
  extendedFingers: number;
} {
  // Prefer metric 3D world landmarks when available; otherwise aspect-corrected 2D
  const pts: Vec3Like[] =
    worldLandmarks && worldLandmarks.length === 21
      ? worldLandmarks
      : landmarks.map((lm) => ({ x: lm.x * aspectRatio, y: lm.y, z: lm.z * aspectRatio }));

  const wrist = pts[0];
  const middleMcp = pts[9];
  const palmSize = Math.max(0.03, dist3D(wrist, middleMcp));

  // Finger tuples: [MCP, PIP, DIP, TIP]
  const fingers: [number, number, number, number][] = [
    [5, 6, 7, 8],     // Index
    [9, 10, 11, 12],  // Middle
    [13, 14, 15, 16], // Ring
    [17, 18, 19, 20], // Pinky
  ];

  const fingerExtended: boolean[] = [];
  const fingerCurled: boolean[] = [];

  for (const [mcp, pip, dip, tip] of fingers) {
    const pipCos = jointStraightness(pts[mcp], pts[pip], pts[dip]);
    const dipCos = jointStraightness(pts[pip], pts[dip], pts[tip]);
    const avgStraight = (pipCos + dipCos) * 0.5;

    const tipToWrist = dist3D(pts[tip], wrist);
    const pipToWrist = dist3D(pts[pip], wrist);
    const mcpToWrist = dist3D(pts[mcp], wrist);

    // Extended: fairly straight joints AND tip clearly further from wrist than PIP
    const isExt =
      (avgStraight > 0.45 && tipToWrist > pipToWrist * 1.02) ||
      tipToWrist > mcpToWrist * 1.48;

    // Curled: clearly bent at PIP/DIP OR tip tucked close to palm/wrist
    const isCurl =
      avgStraight < 0.38 ||
      tipToWrist < pipToWrist * 1.08 ||
      dist3D(pts[tip], pts[mcp]) < palmSize * 0.78;

    fingerExtended.push(isExt);
    fingerCurled.push(isCurl);
  }

  // Thumb check: straightness + distance from pinky MCP (17)
  const thumbStraight = jointStraightness(pts[1], pts[2], pts[4]);
  const thumbOut = dist3D(pts[4], pts[17]) > palmSize * 0.92 && thumbStraight > 0.35;

  const fourExtendedCount = fingerExtended.filter(Boolean).length;
  const fourCurledCount = fingerCurled.filter(Boolean).length;
  const otherThreeExtended =
    (fingerExtended[1] ? 1 : 0) + (fingerExtended[2] ? 1 : 0) + (fingerExtended[3] ? 1 : 0);
  const otherThreeCurled =
    (fingerCurled[1] ? 1 : 0) + (fingerCurled[2] ? 1 : 0) + (fingerCurled[3] ? 1 : 0);

  // Thumb tip (4) to Index tip (8) normalized distance
  const pinchRatio = dist3D(pts[4], pts[8]) / palmSize;
  const pinchThreshold = wasPinching ? 0.52 : 0.38;
  const rawPinchClose = pinchRatio < pinchThreshold;

  // Distinguish Fist vs Pinch:
  // A closed fist has 3-4 curled fingers (middle, ring, pinky curled tightly).
  // A pinch has thumb+index touching while middle/ring/pinky are NOT all tightly balled into a fist.
  if (fourCurledCount >= 3 && !fingerExtended[1] && !fingerExtended[2] && otherThreeCurled >= 2) {
    // Allow pinch only if middle+ring+pinky are mostly open (OK-sign pinch) OR index+thumb clearly extended forward
    if (rawPinchClose && otherThreeExtended >= 2) {
      return {
        gesture: 'pinch',
        isPinching: true,
        extendedFingers: fourExtendedCount + (thumbOut ? 1 : 0),
      };
    }
    return {
      gesture: 'fist',
      isPinching: false,
      extendedFingers: 0,
    };
  }

  // Pinch gesture: thumb & index touching (with at least 1 other finger not curled, or clear OK pinch)
  if (rawPinchClose && otherThreeCurled <= 2) {
    return {
      gesture: 'pinch',
      isPinching: true,
      extendedFingers: fourExtendedCount + (thumbOut ? 1 : 0),
    };
  }

  // Open palm: at least 4 fingers extended (or 3 of 4 main fingers + thumb out)
  if (fourExtendedCount >= 4 || (fourExtendedCount >= 3 && thumbOut && fourCurledCount === 0)) {
    return {
      gesture: 'open_palm',
      isPinching: false,
      extendedFingers: fourExtendedCount + (thumbOut ? 1 : 0),
    };
  }

  return {
    gesture: 'none',
    isPinching: false,
    extendedFingers: fourExtendedCount + (thumbOut ? 1 : 0),
  };
}

function formatCameraError(err: unknown): string {
  if (!window.isSecureContext) {
    return '当前页面非安全上下文（需 HTTPS 或 localhost），浏览器已禁止访问摄像头。';
  }
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return '当前浏览器不支持摄像头接口（mediaDevices.getUserMedia），请更换最新版 Chrome / Edge。';
  }

  if (err instanceof DOMException) {
    switch (err.name) {
      case 'NotAllowedError':
      case 'PermissionDeniedError':
        return '摄像头权限已被拒绝。请在浏览器地址栏右侧允许摄像头权限后点击“重试”。';
      case 'NotFoundError':
      case 'DevicesNotFoundError':
        return '未检测到可用的前置摄像头设备，请检查硬件连接后重试。';
      case 'NotReadableError':
      case 'TrackStartError':
        return '摄像头正被其他应用程序占用，请关闭占用程序后重试。';
      case 'OverconstrainedError':
        return '摄像头分辨率参数不兼容，请重试或切换其他摄像头设备。';
      default:
        return `摄像头启动失败（${err.name}）：${err.message || '请检查权限设置'}`;
    }
  }

  if (err instanceof Error) {
    return err.message;
  }
  return '手势识别初始化失败，请检查网络连接或摄像头权限。';
}

export function useHandGesture({ onModeChange, onPinchToggle }: UseHandGestureOptions) {
  const [status, setStatus] = useState<CameraStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [detectedGesture, setDetectedGesture] = useState<GestureKind>('none');
  const [handDetected, setHandDetected] = useState(false);
  const [lastActionTip, setLastActionTip] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const rafRef = useRef<number | null>(null);
  const activeRef = useRef(false);
  const tipTimerRef = useRef<number | null>(null);

  const handControlRef = useRef<HandControlRef>({
    handPresent: false,
    handX: 0,
    handY: 0,
    gesture: 'none',
    pinchActive: false,
  });

  const onModeChangeRef = useRef(onModeChange);
  const onPinchToggleRef = useRef(onPinchToggle);
  useEffect(() => {
    onModeChangeRef.current = onModeChange;
    onPinchToggleRef.current = onPinchToggle;
  }, [onModeChange, onPinchToggle]);

  // Debounce & state tracking
  const wasPinchingRef = useRef(false);
  const lastPinchToggleTimeRef = useRef(0);
  const stableGestureRef = useRef<{ kind: GestureKind; since: number; fired: boolean }>({
    kind: 'none',
    since: 0,
    fired: false,
  });
  const lastTimestampRef = useRef(0);

  const flashActionTip = useCallback((text: string) => {
    setLastActionTip(text);
    if (tipTimerRef.current !== null) window.clearTimeout(tipTimerRef.current);
    tipTimerRef.current = window.setTimeout(() => {
      setLastActionTip(null);
    }, 1800);
  }, []);

  const stopCamera = useCallback(() => {
    activeRef.current = false;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    handControlRef.current = {
      handPresent: false,
      handX: 0,
      handY: 0,
      gesture: 'none',
      pinchActive: false,
    };
    wasPinchingRef.current = false;
    stableGestureRef.current = { kind: 'none', since: 0, fired: false };
    setHandDetected(false);
    setDetectedGesture('none');
    setLastActionTip(null);
    setStatus('idle');
    setErrorMessage(null);
  }, []);

  const drawOverlay = useCallback((landmarks: NormalizedLandmark[] | null, gesture: GestureKind) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!landmarks) return;

    const w = canvas.width;
    const h = canvas.height;

    const strokeColor =
      gesture === 'open_palm'
        ? '#34d399'
        : gesture === 'fist'
          ? '#fbbf24'
          : gesture === 'pinch'
            ? '#60a5fa'
            : 'rgba(232, 199, 123, 0.85)';

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2.5;
    for (const [start, end] of HAND_CONNECTIONS) {
      const a = landmarks[start];
      const b = landmarks[end];
      ctx.beginPath();
      ctx.moveTo(a.x * w, a.y * h);
      ctx.lineTo(b.x * w, b.y * h);
      ctx.stroke();
    }

    for (let i = 0; i < landmarks.length; i++) {
      const lm = landmarks[i];
      const isPinchTip = i === 4 || i === 8;
      ctx.beginPath();
      ctx.arc(lm.x * w, lm.y * h, isPinchTip ? 5 : 3, 0, Math.PI * 2);
      ctx.fillStyle = isPinchTip && gesture === 'pinch' ? '#34d399' : '#fff4cc';
      ctx.fill();
    }
  }, []);

  const attachStreamToVideo = useCallback(async () => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (video && stream && video.srcObject !== stream) {
      video.srcObject = stream;
      try {
        await video.play();
      } catch {
        // Autoplay resolves once video metadata loads
      }
    }
  }, []);

  useEffect(() => {
    if (status === 'requesting' || status === 'loading_model' || status === 'active') {
      void attachStreamToVideo();
    }
  }, [status, attachStreamToVideo]);

  const startCamera = useCallback(async () => {
    setErrorMessage(null);

    if (!window.isSecureContext) {
      setStatus('error');
      setErrorMessage(formatCameraError(null));
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus('error');
      setErrorMessage(formatCameraError(null));
      return;
    }

    try {
      setStatus('requesting');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      streamRef.current = stream;
      await attachStreamToVideo();

      setStatus('loading_model');

      if (!landmarkerRef.current) {
        const baseHref = new URL(import.meta.env.BASE_URL, window.location.href).href;
        const wasmRoot = new URL('mediapipe/wasm', baseHref).href.replace(/\/$/, '');
        const fallbackWasmRoot =
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
        const localModelUrl = new URL('mediapipe/hand_landmarker.task', baseHref).href;
        const remoteModelUrl =
          'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

        // Prefer local model if present in public/mediapipe/
        let modelUrl = remoteModelUrl;
        try {
          const headRes = await fetch(localModelUrl, { method: 'HEAD' });
          const contentLen = Number(headRes.headers.get('content-length') || '0');
          if (headRes.ok && (contentLen === 0 || contentLen > 1000000)) {
            modelUrl = localModelUrl;
          }
        } catch {
          modelUrl = remoteModelUrl;
        }

        const loadVision = async () => {
          try {
            return await FilesetResolver.forVisionTasks(wasmRoot);
          } catch {
            return await FilesetResolver.forVisionTasks(fallbackWasmRoot);
          }
        };

        const createLandmarker = async (delegate: 'GPU' | 'CPU', assetUrl: string) => {
          const vision = await loadVision();
          return HandLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: assetUrl,
              delegate,
            },
            runningMode: 'VIDEO',
            numHands: 1,
            minHandDetectionConfidence: 0.42,
            minHandPresenceConfidence: 0.4,
            minTrackingConfidence: 0.4,
          });
        };

        // Prefer CPU (WASM XNNPACK) delegate first so it never contends with Three.js WebGL2 context
        try {
          landmarkerRef.current = await createLandmarker('CPU', modelUrl);
        } catch {
          try {
            landmarkerRef.current = await createLandmarker('GPU', modelUrl);
          } catch (gpuErr) {
            if (modelUrl === localModelUrl) {
              try {
                landmarkerRef.current = await createLandmarker('CPU', remoteModelUrl);
              } catch {
                throw new Error(
                  `MediaPipe 手势模型加载失败，请检查网络连接（${
                    gpuErr instanceof Error ? gpuErr.message : '模型加载异常'
                  }）。`
                );
              }
            } else {
              throw new Error(
                `MediaPipe 手势模型加载失败，请检查网络连接（${
                  gpuErr instanceof Error ? gpuErr.message : '模型加载异常'
                }）。`
              );
            }
          }
        }
      }

      activeRef.current = true;
      setStatus('active');

      // Ensure video is attached & playing after React renders active view
      setTimeout(() => {
        void attachStreamToVideo();
      }, 60);

      let lastVideoTime = -1;

      const loop = () => {
        if (!activeRef.current) return;
        const video = videoRef.current;
        const landmarker = landmarkerRef.current;

        if (video && streamRef.current && video.srcObject !== streamRef.current) {
          video.srcObject = streamRef.current;
          void video.play().catch(() => undefined);
        }

        if (
          video &&
          landmarker &&
          video.readyState >= 2 &&
          video.videoWidth > 0 &&
          video.currentTime !== lastVideoTime
        ) {
          lastVideoTime = video.currentTime;
          const now = Math.max(performance.now(), lastTimestampRef.current + 1);
          lastTimestampRef.current = now;

          let result;
          try {
            result = landmarker.detectForVideo(video, now);
          } catch {
            result = null;
          }

          if (result && result.landmarks && result.landmarks.length > 0) {
            const lm = result.landmarks[0];
            const worldLm = result.worldLandmarks?.[0];
            const aspect = video.videoWidth / Math.max(1, video.videoHeight);
            const { gesture, isPinching } = classifyHand(
              lm,
              worldLm,
              aspect,
              wasPinchingRef.current
            );

            // Mirror X so moving user's hand right moves +X; amplify range slightly so small hand motions feel responsive
            const rawX = Math.max(-1, Math.min(1, (0.5 - lm[9].x) * 2.4));
            const rawY = Math.max(-1, Math.min(1, (lm[9].y - 0.5) * 2.2));

            const prev = handControlRef.current;
            handControlRef.current = {
              handPresent: true,
              handX: prev.handPresent ? prev.handX * 0.65 + rawX * 0.35 : rawX,
              handY: prev.handPresent ? prev.handY * 0.65 + rawY * 0.35 : rawY,
              gesture,
              pinchActive: isPinching,
            };

            setHandDetected(true);
            setDetectedGesture(gesture);
            drawOverlay(lm, gesture);

            // Pinch rising edge with 700ms cooldown
            if (isPinching && !wasPinchingRef.current && now - lastPinchToggleTimeRef.current > 700) {
              lastPinchToggleTimeRef.current = now;
              onPinchToggleRef.current();
              flashActionTip('🤏 捏合触发：切换拍立得放大/收回');
            }
            wasPinchingRef.current = isPinching;

            // Fast & reliable debounce (~150ms hold) for open_palm and fist; always syncs cleanly even if UI button was clicked
            if (gesture === 'open_palm' || gesture === 'fist') {
              if (stableGestureRef.current.kind !== gesture) {
                stableGestureRef.current = { kind: gesture, since: now, fired: false };
              } else if (!stableGestureRef.current.fired && now - stableGestureRef.current.since > 150) {
                stableGestureRef.current.fired = true;
                const desiredMode: TreeMode = gesture === 'open_palm' ? 'scattered' : 'tree';
                onModeChangeRef.current(desiredMode);
                flashActionTip(
                  desiredMode === 'scattered'
                    ? '🖐 张开手掌：已切换为粒子散落态'
                    : '✊ 握拳：已聚合成圣诞树'
                );
              }
            } else {
              stableGestureRef.current = { kind: 'none', since: now, fired: false };
            }
          } else {
            handControlRef.current.handPresent = false;
            handControlRef.current.gesture = 'none';
            handControlRef.current.pinchActive = false;
            wasPinchingRef.current = false;
            stableGestureRef.current = { kind: 'none', since: 0, fired: false };
            setHandDetected(false);
            setDetectedGesture('none');
            drawOverlay(null, 'none');
          }
        }

        rafRef.current = requestAnimationFrame(loop);
      };

      rafRef.current = requestAnimationFrame(loop);
    } catch (err) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      setStatus('error');
      setErrorMessage(formatCameraError(err));
    }
  }, [attachStreamToVideo, drawOverlay, flashActionTip]);

  useEffect(() => {
    return () => {
      activeRef.current = false;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (tipTimerRef.current !== null) window.clearTimeout(tipTimerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
        landmarkerRef.current = null;
      }
    };
  }, []);

  return {
    status,
    errorMessage,
    detectedGesture,
    handDetected,
    lastActionTip,
    videoRef,
    overlayCanvasRef,
    handControlRef,
    startCamera,
    stopCamera,
  };
}
