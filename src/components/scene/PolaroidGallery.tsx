import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import { PhotoItem } from '../../types';
import { generatePolaroidSlots, PolaroidSlotData } from '../../utils/treeMath';
import { createPolaroidCaptionTexture } from '../../utils/polaroidTexture';

interface PolaroidGalleryProps {
  photos: PhotoItem[];
  visible: boolean;
  morphRef: React.MutableRefObject<number>;
  focusedPhotoId: string | null;
  onSelectPhoto: (id: string | null) => void;
  focusFrontTriggerRef: React.MutableRefObject<(() => void) | null>;
}

interface SinglePolaroidProps {
  photo: PhotoItem;
  slot: PolaroidSlotData;
  morphRef: React.MutableRefObject<number>;
  isFocused: boolean;
  hasOtherFocused: boolean;
  onToggleFocus: (id: string) => void;
  registerGroup: (id: string, group: THREE.Group | null) => void;
}

const SinglePolaroid: React.FC<SinglePolaroidProps> = ({
  photo,
  slot,
  morphRef,
  isFocused,
  hasOtherFocused,
  onToggleFocus,
  registerGroup,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const [photoTexture, setPhotoTexture] = useState<THREE.Texture | null>(null);
  const { camera, size } = useThree();

  // Reusable scratch objects for zero-GC animation loop
  const restPos = useMemo(() => new THREE.Vector3(), []);
  const restQuat = useMemo(() => new THREE.Quaternion(), []);
  const targetPos = useMemo(() => new THREE.Vector3(), []);
  const targetQuat = useMemo(() => new THREE.Quaternion(), []);
  const camDir = useMemo(() => new THREE.Vector3(), []);
  const parentWorldQuat = useMemo(() => new THREE.Quaternion(), []);
  const swayQuat = useMemo(() => new THREE.Quaternion(), []);
  const swayEuler = useMemo(() => new THREE.Euler(), []);
  const targetScaleVec = useMemo(() => new THREE.Vector3(), []);
  const focusProgressRef = useRef(0);

  // Register group ref so parent can compute front-facing photo dynamically
  useEffect(() => {
    registerGroup(photo.id, groupRef.current);
    return () => registerGroup(photo.id, null);
  }, [photo.id, registerGroup]);

  // Load photo texture with aspect-ratio-preserving cover crop (face-friendly vertical bias)
  useEffect(() => {
    let disposed = false;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');

    loader.load(
      photo.url,
      (tex) => {
        if (disposed) {
          tex.dispose();
          return;
        }
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 8;

        const img = tex.image as HTMLImageElement | undefined;
        if (img && img.width && img.height) {
          const aspect = img.width / img.height;
          if (aspect > 1) {
            // Landscape: crop horizontally centered
            tex.repeat.set(1 / aspect, 1);
            tex.offset.set((1 - 1 / aspect) * 0.5, 0);
          } else if (aspect < 1) {
            // Portrait: crop vertically with upper-center bias so faces stay nicely framed
            tex.repeat.set(1, aspect);
            tex.offset.set(0, (1 - aspect) * 0.62);
          }
        }
        tex.needsUpdate = true;
        setPhotoTexture((prev) => {
          if (prev) prev.dispose();
          return tex;
        });
      },
      undefined,
      () => {
        // Ignore broken image gracefully; ivory frame still displays caption
      }
    );

    return () => {
      disposed = true;
    };
  }, [photo.url]);

  // Cleanup texture on unmount
  useEffect(() => {
    return () => {
      setPhotoTexture((prev) => {
        if (prev) prev.dispose();
        return null;
      });
    };
  }, []);

  // Generate crisp Chinese caption canvas texture
  const captionTexture = useMemo(
    () => createPolaroidCaptionTexture(photo.caption, photo.date),
    [photo.caption, photo.date]
  );

  useEffect(() => {
    return () => {
      captionTexture.dispose();
    };
  }, [captionTexture]);

  useEffect(() => {
    if (hovered) {
      document.body.style.cursor = 'pointer';
    }
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, [hovered]);

  useFrame(({ clock }, rawDelta) => {
    const g = groupRef.current;
    if (!g) return;
    const delta = Math.min(rawDelta, 0.05);
    const t = clock.getElapsedTime();
    const m = morphRef.current;
    const easeM = m * m * (3 - 2 * m);

    // Smooth focus progress [0..1]
    const targetFocus = isFocused ? 1 : 0;
    focusProgressRef.current = THREE.MathUtils.damp(
      focusProgressRef.current,
      targetFocus,
      5.5,
      delta
    );

    // Compute resting position & orientation on tree or scattered halo
    restPos.lerpVectors(slot.treePos, slot.scatterPos, easeM);
    restPos.y += Math.sin(t * 1.1 + slot.swayPhase) * (0.025 + easeM * 0.14);

    restQuat.slerpQuaternions(slot.treeQuat, slot.scatterQuat, easeM);
    swayEuler.set(
      Math.sin(t * 0.9 + slot.swayPhase) * 0.035,
      Math.cos(t * 0.7 + slot.swayPhase) * 0.03,
      Math.sin(t * 1.2 + slot.swayPhase) * 0.045
    );
    swayQuat.setFromEuler(swayEuler);
    restQuat.multiply(swayQuat);

    if (isFocused) {
      // Position straight in front of active camera regardless of orbit or tree rotation
      camera.getWorldDirection(camDir);
      const isNarrow = size.width < 640;
      const focusDist = isNarrow ? 5.6 : 4.95;
      targetPos.copy(camera.position).addScaledVector(camDir, focusDist);

      if (g.parent) {
        g.parent.updateWorldMatrix(true, false);
        g.parent.worldToLocal(targetPos);
        g.parent.getWorldQuaternion(parentWorldQuat);
        targetQuat.copy(parentWorldQuat).invert().multiply(camera.quaternion);
      } else {
        targetQuat.copy(camera.quaternion);
      }

      const dampSpeed = 6.5;
      g.position.lerp(targetPos, 1 - Math.exp(-dampSpeed * delta));
      g.quaternion.slerp(targetQuat, 1 - Math.exp(-dampSpeed * delta));

      const focusScale = isNarrow ? 1.55 : 1.78;
      targetScaleVec.setScalar(focusScale);
      g.scale.lerp(targetScaleVec, 1 - Math.exp(-dampSpeed * delta));
    } else {
      const returnSpeed = 5.8;
      g.position.lerp(restPos, 1 - Math.exp(-returnSpeed * delta));
      g.quaternion.slerp(restQuat, 1 - Math.exp(-returnSpeed * delta));

      const baseScale = hasOtherFocused ? 0.88 : hovered ? 1.14 : 1.0;
      targetScaleVec.setScalar(baseScale);
      g.scale.lerp(targetScaleVec, 1 - Math.exp(-8 * delta));
    }
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onToggleFocus(photo.id);
  };

  return (
    <group
      ref={groupRef}
      position={slot.treePos}
      quaternion={slot.treeQuat}
      onClick={handleClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
      }}
    >
      {/* Main Polaroid thick ivory card */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1.04, 1.28, 0.028]} />
        <meshStandardMaterial
          color="#f8f4ea"
          emissive="#f8f4ea"
          emissiveIntensity={hovered || isFocused ? 0.58 : 0.45}
          roughness={0.92}
          metalness={0.0}
        />
      </mesh>

      {/* Subtle golden highlight rim when hovered or focused */}
      {(hovered || isFocused) && (
        <mesh position={[0, 0, -0.002]}>
          <boxGeometry args={[1.08, 1.32, 0.02]} />
          <meshBasicMaterial color="#e8c77b" transparent opacity={isFocused ? 0.55 : 0.35} />
        </mesh>
      )}

      {/* Photo image area (front) */}
      <mesh position={[0, 0.125, 0.016]}>
        <planeGeometry args={[0.91, 0.91]} />
        {photoTexture ? (
          <meshBasicMaterial map={photoTexture} toneMapped={true} />
        ) : (
          <meshStandardMaterial color="#18382c" roughness={0.7} />
        )}
      </mesh>

      {/* Crisp caption bottom strip (front) */}
      <mesh position={[0, -0.465, 0.016]}>
        <planeGeometry args={[0.92, 0.27]} />
        <meshBasicMaterial map={captionTexture} toneMapped={true} />
      </mesh>

      {/* Backside subtle vintage stamp look */}
      <mesh position={[0, 0, -0.016]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[0.96, 1.2]} />
        <meshStandardMaterial color="#ece5d5" roughness={0.92} metalness={0} />
      </mesh>

      {/* 3D Wooden Clothespin (木质夹子) gripping top edge of Polaroid */}
      <group position={[0, 0.67, 0]}>
        {/* Front wooden prong */}
        <mesh position={[0, 0.06, 0.036]} rotation={[-0.08, 0, 0]} castShadow>
          <boxGeometry args={[0.13, 0.36, 0.042]} />
          <meshStandardMaterial color="#c9965b" roughness={0.76} metalness={0.05} />
        </mesh>
        {/* Back wooden prong */}
        <mesh position={[0, 0.06, -0.036]} rotation={[0.08, 0, 0]} castShadow>
          <boxGeometry args={[0.13, 0.36, 0.042]} />
          <meshStandardMaterial color="#b48047" roughness={0.78} metalness={0.05} />
        </mesh>
        {/* Metallic coil spring hinge */}
        <mesh position={[0, 0.08, 0]} rotation={[0, Math.PI / 2, 0]}>
          <cylinderGeometry args={[0.045, 0.045, 0.15, 12]} />
          <meshStandardMaterial color="#d4c4a2" metalness={0.88} roughness={0.25} />
        </mesh>
        {/* Golden twine hook loop */}
        <mesh position={[0, 0.27, 0]}>
          <torusGeometry args={[0.05, 0.012, 8, 16]} />
          <meshStandardMaterial color="#e8c77b" metalness={0.9} roughness={0.22} />
        </mesh>
      </group>
    </group>
  );
};

export const PolaroidGallery: React.FC<PolaroidGalleryProps> = ({
  photos,
  visible,
  morphRef,
  focusedPhotoId,
  onSelectPhoto,
  focusFrontTriggerRef,
}) => {
  const { camera } = useThree();
  const groupMapRef = useRef<Map<string, THREE.Group>>(new Map());

  const slots = useMemo(() => generatePolaroidSlots(photos.length), [photos.length]);

  const registerGroup = useMemo(
    () => (id: string, group: THREE.Group | null) => {
      if (group) groupMapRef.current.set(id, group);
      else groupMapRef.current.delete(id);
    },
    []
  );

  // Register imperative callback to toggle/focus the Polaroid currently most front-facing
  useEffect(() => {
    focusFrontTriggerRef.current = () => {
      if (!visible || photos.length === 0) return;

      // If one is already focused, return it to the tree
      if (focusedPhotoId) {
        onSelectPhoto(null);
        return;
      }

      const camPos = camera.position;
      const camForward = new THREE.Vector3();
      camera.getWorldDirection(camForward);

      const worldPos = new THREE.Vector3();
      const worldQuat = new THREE.Quaternion();
      const normal = new THREE.Vector3();
      const toCam = new THREE.Vector3();
      const fromCam = new THREE.Vector3();

      let bestId: string | null = null;
      let bestScore = -Infinity;

      for (const photo of photos) {
        const grp = groupMapRef.current.get(photo.id);
        if (!grp) continue;

        grp.getWorldPosition(worldPos);
        grp.getWorldQuaternion(worldQuat);

        // Local +Z is the front face of the Polaroid
        normal.set(0, 0, 1).applyQuaternion(worldQuat).normalize();
        toCam.subVectors(camPos, worldPos).normalize();
        fromCam.subVectors(worldPos, camPos).normalize();

        const facingDot = normal.dot(toCam);
        const centeredDot = fromCam.dot(camForward);
        const dist = camPos.distanceTo(worldPos);

        // Prioritize Polaroids facing toward camera and close to screen center
        const score = facingDot * 1.4 + centeredDot * 1.1 - dist * 0.06;
        if (score > bestScore) {
          bestScore = score;
          bestId = photo.id;
        }
      }

      if (bestId) {
        onSelectPhoto(bestId);
      }
    };

    return () => {
      focusFrontTriggerRef.current = null;
    };
  }, [camera, focusedPhotoId, onSelectPhoto, photos, visible, focusFrontTriggerRef]);

  const handleToggleFocus = (id: string) => {
    if (focusedPhotoId === id) {
      onSelectPhoto(null);
    } else {
      onSelectPhoto(id);
    }
  };

  if (!visible) return null;

  return (
    <group>
      {photos.map((photo, index) => (
        <SinglePolaroid
          key={photo.id}
          photo={photo}
          slot={slots[index]}
          morphRef={morphRef}
          isFocused={focusedPhotoId === photo.id}
          hasOtherFocused={focusedPhotoId !== null && focusedPhotoId !== photo.id}
          onToggleFocus={handleToggleFocus}
          registerGroup={registerGroup}
        />
      ))}
    </group>
  );
};
