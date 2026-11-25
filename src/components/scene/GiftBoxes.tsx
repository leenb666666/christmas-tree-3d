import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { generateGiftBoxes, GiftBoxData, TREE_BASE_Y } from '../../utils/treeMath';

interface GiftBoxesProps {
  morphRef: React.MutableRefObject<number>;
}

const SingleGiftBox: React.FC<{
  data: GiftBoxData;
  morphRef: React.MutableRefObject<number>;
}> = ({ data, morphRef }) => {
  const groupRef = useRef<THREE.Group>(null);
  const pos = useMemo(() => new THREE.Vector3(), []);
  const treeQuat = useMemo(() => new THREE.Quaternion().setFromEuler(data.treeRot), [data.treeRot]);
  const scatterQuat = useMemo(
    () => new THREE.Quaternion().setFromEuler(data.scatterRot),
    [data.scatterRot]
  );

  const [w, h, d] = data.size;
  const ribbonThick = Math.min(w, d) * 0.16;

  useFrame(({ clock }) => {
    const g = groupRef.current;
    if (!g) return;
    const t = clock.getElapsedTime();
    const m = morphRef.current;
    const easeM = m * m * (3 - 2 * m);

    pos.lerpVectors(data.treePos, data.scatterPos, easeM);
    if (easeM > 0.01) {
      pos.y += Math.sin(t * 0.9 + data.phase) * 0.25 * easeM;
    }
    g.position.copy(pos);

    g.quaternion.slerpQuaternions(treeQuat, scatterQuat, easeM);
    if (easeM > 0.05) {
      g.rotateY(t * 0.25 * easeM);
      g.rotateX(Math.sin(t * 0.5 + data.phase) * 0.12 * easeM);
    }
  });

  return (
    <group ref={groupRef}>
      {/* Main gift box body */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial
          color={data.boxColor}
          metalness={0.35}
          roughness={0.38}
          envMapIntensity={1.1}
        />
      </mesh>

      {/* Slight lid overhang for luxury 3D gift box detail */}
      <mesh position={[0, h * 0.42, 0]} castShadow>
        <boxGeometry args={[w * 1.04, h * 0.19, d * 1.04]} />
        <meshStandardMaterial
          color={data.boxColor}
          metalness={0.38}
          roughness={0.34}
          envMapIntensity={1.15}
        />
      </mesh>

      {/* Crossed ribbon X */}
      <mesh position={[0, 0.005, 0]}>
        <boxGeometry args={[w * 1.06, h * 1.04, ribbonThick]} />
        <meshStandardMaterial
          color={data.ribbonColor}
          metalness={0.85}
          roughness={0.22}
          envMapIntensity={1.4}
        />
      </mesh>

      {/* Crossed ribbon Z */}
      <mesh position={[0, 0.005, 0]}>
        <boxGeometry args={[ribbonThick, h * 1.04, d * 1.06]} />
        <meshStandardMaterial
          color={data.ribbonColor}
          metalness={0.85}
          roughness={0.22}
          envMapIntensity={1.4}
        />
      </mesh>

      {/* Sculpted 3D ribbon bow on top */}
      <group position={[0, h * 0.54, 0]}>
        <mesh position={[-ribbonThick * 0.7, 0.05, 0]} rotation={[0.3, 0, 0.45]}>
          <torusGeometry args={[ribbonThick * 0.85, ribbonThick * 0.24, 10, 18]} />
          <meshStandardMaterial color={data.ribbonColor} metalness={0.88} roughness={0.2} />
        </mesh>
        <mesh position={[ribbonThick * 0.7, 0.05, 0]} rotation={[-0.3, 0, -0.45]}>
          <torusGeometry args={[ribbonThick * 0.85, ribbonThick * 0.24, 10, 18]} />
          <meshStandardMaterial color={data.ribbonColor} metalness={0.88} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.03, 0]}>
          <sphereGeometry args={[ribbonThick * 0.42, 12, 12]} />
          <meshStandardMaterial color={data.ribbonColor} metalness={0.92} roughness={0.18} />
        </mesh>
      </group>
    </group>
  );
};

export const GiftBoxes: React.FC<GiftBoxesProps> = ({ morphRef }) => {
  const gifts = useMemo(() => generateGiftBoxes(14), []);
  const floorAuraRef = useRef<THREE.Mesh>(null);

  const auraTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(128, 128, 12, 128, 128, 124);
      grad.addColorStop(0, 'rgba(245, 207, 120, 0.34)');
      grad.addColorStop(0.55, 'rgba(16, 110, 74, 0.18)');
      grad.addColorStop(0.85, 'rgba(232, 199, 123, 0.08)');
      grad.addColorStop(1, 'rgba(1, 19, 14, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 256);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  useFrame(({ clock }) => {
    if (!floorAuraRef.current) return;
    const mat = floorAuraRef.current.material as THREE.MeshBasicMaterial;
    const m = morphRef.current;
    mat.opacity = Math.max(0, (1 - m * 1.35) * (0.85 + 0.12 * Math.sin(clock.getElapsedTime() * 1.5)));
  });

  return (
    <group>
      {/* Soft radial emerald-gold aura beneath the tree base */}
      <mesh
        ref={floorAuraRef}
        position={[0, TREE_BASE_Y - 0.34, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[10.2, 10.2]} />
        <meshBasicMaterial
          map={auraTexture}
          transparent
          opacity={0.85}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {gifts.map((gift, idx) => (
        <SingleGiftBox key={idx} data={gift} morphRef={morphRef} />
      ))}
    </group>
  );
};
