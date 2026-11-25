import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Lightformer, OrbitControls } from '@react-three/drei';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { HandControlRef, PhotoItem, TreeMode } from '../../types';
import { FoliageParticles } from './FoliageParticles';
import { GoldenSpiralGarland } from './GoldenSpiralGarland';
import { MetallicOrnaments } from './MetallicOrnaments';
import { GiftBoxes } from './GiftBoxes';
import { StarTopper } from './StarTopper';
import { StardustField } from './StardustField';
import { PolaroidGallery } from './PolaroidGallery';

interface ChristmasTreeSceneProps {
  mode: TreeMode;
  photos: PhotoItem[];
  showPhotos: boolean;
  focusedPhotoId: string | null;
  onSelectPhoto: (id: string | null) => void;
  autoRotate: boolean;
  handControlRef: React.MutableRefObject<HandControlRef>;
  focusFrontTriggerRef: React.MutableRefObject<(() => void) | null>;
  resetViewSignal: number;
}

const SceneContent: React.FC<ChristmasTreeSceneProps> = ({
  mode,
  photos,
  showPhotos,
  focusedPhotoId,
  onSelectPhoto,
  autoRotate,
  handControlRef,
  focusFrontTriggerRef,
  resetViewSignal,
}) => {
  const treeRootRef = useRef<THREE.Group>(null);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const morphRef = useRef(0);
  const handSpinRef = useRef(0);
  const handTiltXRef = useRef(0);
  const handTiltZRef = useRef(0);

  // Reset camera position smoothly when requested
  useEffect(() => {
    if (resetViewSignal === 0) return;
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
    if (treeRootRef.current) {
      treeRootRef.current.rotation.set(0, 0, 0);
    }
    handSpinRef.current = 0;
    handTiltXRef.current = 0;
    handTiltZRef.current = 0;
  }, [resetViewSignal]);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);

    // Smooth morph factor: 0 = assembled tree, 1 = scattered particles
    const targetMorph = mode === 'scattered' ? 1 : 0;
    morphRef.current = THREE.MathUtils.damp(morphRef.current, targetMorph, 2.8, delta);

    const root = treeRootRef.current;
    if (!root) return;

    const hand = handControlRef.current;
    if (hand.handPresent) {
      // Hand horizontal offset rotates tree smoothly; vertical & horizontal also apply responsive tilt
      const targetRotY = hand.handX * Math.PI * 1.45;
      const targetTiltX = hand.handY * 0.42;
      const targetTiltZ = -hand.handX * 0.24;

      handSpinRef.current = THREE.MathUtils.damp(handSpinRef.current, targetRotY, 6.2, delta);
      handTiltXRef.current = THREE.MathUtils.damp(handTiltXRef.current, targetTiltX, 6.2, delta);
      handTiltZRef.current = THREE.MathUtils.damp(handTiltZRef.current, targetTiltZ, 6.2, delta);

      root.rotation.y = handSpinRef.current;
      root.rotation.x = handTiltXRef.current;
      root.rotation.z = handTiltZRef.current;
    } else {
      // Return tilt gently to upright when no hand is detected
      handTiltXRef.current = THREE.MathUtils.damp(handTiltXRef.current, 0, 3.0, delta);
      handTiltZRef.current = THREE.MathUtils.damp(handTiltZRef.current, 0, 3.0, delta);
      root.rotation.x = handTiltXRef.current;
      root.rotation.z = handTiltZRef.current;

      // Gentle ambient rotation when autoRotate is enabled and not inspecting a zoomed photo
      if (autoRotate && !focusedPhotoId) {
        root.rotation.y += delta * 0.16;
        handSpinRef.current = root.rotation.y;
      }
    }
  });

  return (
    <>
      <color attach="background" args={['#01130e']} />
      <fogExp2 attach="fog" args={['#01130e', 0.022]} />

      {/* Offline procedural luxury studio environment for metallic reflections */}
      <Environment resolution={256}>
        <group rotation={[-Math.PI / 4, 0, 0]}>
          <Lightformer
            form="ring"
            intensity={2.4}
            color="#ffe6a8"
            position={[0, 8, 4]}
            scale={[10, 10, 1]}
          />
          <Lightformer
            form="rect"
            intensity={1.6}
            color="#10b981"
            position={[-8, 2, -6]}
            rotation={[0, Math.PI / 3, 0]}
            scale={[12, 8, 1]}
          />
          <Lightformer
            form="rect"
            intensity={2.2}
            color="#f6cf7a"
            position={[8, 4, 6]}
            rotation={[0, -Math.PI / 4, 0]}
            scale={[10, 6, 1]}
          />
        </group>
      </Environment>

      {/* Balanced emerald-and-gold lighting rig */}
      <ambientLight intensity={0.42} color="#d9eee3" />
      <hemisphereLight args={['#ffe8b0', '#03281d', 0.65]} />
      <directionalLight position={[7, 11, 9]} intensity={1.75} color="#fff1d1" />
      <directionalLight position={[-8, 5, -7]} intensity={0.85} color="#28c78a" />
      <pointLight position={[0, 0.5, 0]} intensity={2.4} distance={11} color="#ffcf6b" decay={2} />
      <pointLight position={[0, -3.2, 2.5]} intensity={1.2} distance={8} color="#f5cf78" decay={2} />

      {/* Ambient golden stardust across the night sky */}
      <StardustField />

      {/* Main interactive Christmas Tree assembly */}
      <group ref={treeRootRef} position={[0, -0.55, 0]}>
        <FoliageParticles morphRef={morphRef} />
        <GoldenSpiralGarland morphRef={morphRef} />
        <MetallicOrnaments morphRef={morphRef} />
        <GiftBoxes morphRef={morphRef} />
        <StarTopper morphRef={morphRef} />
        <PolaroidGallery
          photos={photos}
          visible={showPhotos}
          morphRef={morphRef}
          focusedPhotoId={focusedPhotoId}
          onSelectPhoto={onSelectPhoto}
          focusFrontTriggerRef={focusFrontTriggerRef}
        />
      </group>

      {/* Smooth mouse drag & scroll zoom controls */}
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.06}
        enablePan={false}
        minDistance={6.5}
        maxDistance={25}
        minPolarAngle={0.35}
        maxPolarAngle={Math.PI / 1.85}
        target={[0, 0.25, 0]}
      />

      {/* Selective Bloom & dark emerald cinematic vignette */}
      <EffectComposer multisampling={4}>
        <Bloom
          mipmapBlur
          luminanceThreshold={0.98}
          luminanceSmoothing={0.22}
          intensity={0.9}
          radius={0.68}
        />
        <Vignette eskil={false} offset={0.22} darkness={0.56} />
      </EffectComposer>
    </>
  );
};

export const ChristmasTreeScene: React.FC<ChristmasTreeSceneProps> = (props) => {
  return (
    <div className="canvas-container">
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 1.15, 16.0], fov: 45, near: 0.1, far: 100 }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.06,
        }}
        onPointerMissed={() => {
          if (props.focusedPhotoId) {
            props.onSelectPhoto(null);
          }
        }}
      >
        <SceneContent {...props} />
      </Canvas>
    </div>
  );
};
