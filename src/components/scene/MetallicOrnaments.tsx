import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { generateOrnaments, OrnamentData } from '../../utils/treeMath';

interface MetallicOrnamentsProps {
  morphRef: React.MutableRefObject<number>;
}

const SingleOrnament: React.FC<{
  data: OrnamentData;
  morphRef: React.MutableRefObject<number>;
}> = ({ data, morphRef }) => {
  const groupRef = useRef<THREE.Group>(null);
  const pos = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock }) => {
    const g = groupRef.current;
    if (!g) return;
    const t = clock.getElapsedTime();
    const m = morphRef.current;
    const easeM = m * m * (3 - 2 * m);

    pos.lerpVectors(data.treePos, data.scatterPos, easeM);

    // Subtle swirl arc during morph
    const swirl = Math.sin(easeM * Math.PI) * 0.95;
    if (swirl > 0.001) {
      const cs = Math.cos(swirl);
      const sn = Math.sin(swirl);
      const nx = pos.x * cs - pos.z * sn;
      const nz = pos.x * sn + pos.z * cs;
      pos.x = nx;
      pos.z = nz;
    }

    const bob = 0.018 + easeM * 0.16;
    pos.y += Math.sin(t * 1.15 + data.phase) * bob;
    g.position.copy(pos);

    g.rotation.y = t * (0.25 + easeM * 0.4) + data.phase;
    g.rotation.z = Math.sin(t * 1.3 + data.phase) * (0.06 + easeM * 0.25);
  });

  return (
    <group ref={groupRef} scale={data.scale}>
      {/* Metallic bauble sphere */}
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[1, 24, 24]} />
        <meshStandardMaterial
          color={data.color}
          metalness={data.metalness}
          roughness={data.roughness}
          envMapIntensity={1.65}
        />
      </mesh>
      {/* Golden crown cap */}
      <mesh position={[0, 1.02, 0]}>
        <cylinderGeometry args={[0.24, 0.3, 0.26, 12]} />
        <meshStandardMaterial color="#f2cf7a" metalness={0.95} roughness={0.18} />
      </mesh>
      {/* Hanging ring */}
      <mesh position={[0, 1.22, 0]}>
        <torusGeometry args={[0.14, 0.035, 8, 16]} />
        <meshStandardMaterial color="#ffe49e" metalness={0.95} roughness={0.15} />
      </mesh>
    </group>
  );
};

export const MetallicOrnaments: React.FC<MetallicOrnamentsProps> = ({ morphRef }) => {
  const ornaments = useMemo(() => generateOrnaments(56), []);

  return (
    <group>
      {ornaments.map((item, idx) => (
        <SingleOrnament key={idx} data={item} morphRef={morphRef} />
      ))}
    </group>
  );
};
