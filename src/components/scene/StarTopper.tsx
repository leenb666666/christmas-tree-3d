import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { TREE_TOP_Y } from '../../utils/treeMath';

interface StarTopperProps {
  morphRef: React.MutableRefObject<number>;
}

export const StarTopper: React.FC<StarTopperProps> = ({ morphRef }) => {
  const groupRef = useRef<THREE.Group>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  const starGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    const spikes = 5;
    const outerRadius = 0.62;
    const innerRadius = 0.27;

    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? outerRadius : innerRadius;
      // Start pointing straight up (+Y)
      const angle = (i * Math.PI) / spikes + Math.PI / 2;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();

    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: 0.14,
      bevelEnabled: true,
      bevelThickness: 0.07,
      bevelSize: 0.055,
      bevelSegments: 3,
    };

    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geo.center();
    return geo;
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const m = morphRef.current;
    const easeM = m * m * (3 - 2 * m);

    if (groupRef.current) {
      groupRef.current.position.y = TREE_TOP_Y + 0.42 + easeM * 1.15 + Math.sin(t * 1.8) * 0.06;
      groupRef.current.rotation.y = t * (0.65 + easeM * 0.75);
      const pulse = 1 + Math.sin(t * 2.6) * 0.045;
      groupRef.current.scale.setScalar(pulse * (1 + easeM * 0.16));
    }

    if (haloRef.current) {
      haloRef.current.rotation.z = -t * 0.4;
      const haloScale = 1.0 + Math.sin(t * 3.0) * 0.12;
      haloRef.current.scale.setScalar(haloScale);
    }

    if (lightRef.current) {
      lightRef.current.intensity = 3.2 + Math.sin(t * 2.8) * 0.6;
    }
  });

  return (
    <group ref={groupRef} position={[0, TREE_TOP_Y + 0.42, 0]}>
      {/* Extruded 3D 5-pointed star */}
      <mesh geometry={starGeometry}>
        <meshStandardMaterial
          color="#fff1bd"
          emissive="#ffd25a"
          emissiveIntensity={2.3}
          metalness={0.85}
          roughness={0.14}
          toneMapped={false}
        />
      </mesh>

      {/* Delicate golden crown halo ring */}
      <mesh ref={haloRef} rotation={[0, 0, 0]}>
        <torusGeometry args={[0.84, 0.015, 8, 48]} />
        <meshBasicMaterial color="#ffe499" transparent opacity={0.55} toneMapped={false} />
      </mesh>

      {/* Warm apex glow light */}
      <pointLight ref={lightRef} color="#ffdf88" intensity={3.2} distance={10} decay={2} />
    </group>
  );
};
