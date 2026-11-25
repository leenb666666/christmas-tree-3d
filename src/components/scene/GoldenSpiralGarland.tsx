import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { generateSpiralGarland } from '../../utils/treeMath';

interface GoldenSpiralGarlandProps {
  morphRef: React.MutableRefObject<number>;
}

export const GoldenSpiralGarland: React.FC<GoldenSpiralGarlandProps> = ({ morphRef }) => {
  const ribbonMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const ribbonMeshRef = useRef<THREE.Mesh>(null);
  const bulbsRef = useRef<THREE.InstancedMesh>(null);

  const { curvePoints, bulbs } = useMemo(() => generateSpiralGarland(5.5, 340), []);

  const ribbonGeometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(curvePoints);
    return new THREE.TubeGeometry(curve, 320, 0.028, 8, false);
  }, [curvePoints]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tempPos = useMemo(() => new THREE.Vector3(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const m = morphRef.current;
    const easeM = m * m * (3 - 2 * m);

    // Gracefully dissolve and expand the continuous ribbon strand when scattering
    if (ribbonMatRef.current && ribbonMeshRef.current) {
      const opacity = Math.max(0, 1 - easeM * 1.45);
      ribbonMatRef.current.opacity = opacity * 0.9;
      ribbonMatRef.current.emissiveIntensity = (1.15 + Math.sin(t * 2.2) * 0.2) * opacity;
      ribbonMeshRef.current.visible = opacity > 0.01;
      const expand = 1 + easeM * 0.45;
      ribbonMeshRef.current.scale.set(expand, 1, expand);
    }

    // Animate all 340 twinkling fairy light bulbs
    const inst = bulbsRef.current;
    if (!inst) return;

    const swirlArc = Math.sin(easeM * Math.PI);

    for (let i = 0; i < bulbs.length; i++) {
      const b = bulbs[i];
      tempPos.lerpVectors(b.treePos, b.scatterPos, easeM);

      // Gentle spiral swirl during transition
      if (swirlArc > 0.001) {
        const ang = swirlArc * 1.2;
        const cs = Math.cos(ang);
        const sn = Math.sin(ang);
        const nx = tempPos.x * cs - tempPos.z * sn;
        const nz = tempPos.x * sn + tempPos.z * cs;
        tempPos.x = nx;
        tempPos.z = nz;
      }

      // Subtle floating drift
      const drift = 0.02 + easeM * 0.14;
      tempPos.y += Math.sin(t * 1.4 + b.phase) * drift;

      // Twinkling pulse
      const twinkle = 0.55 + 0.45 * Math.sin(t * 3.4 + b.phase * 3.0);
      const s = 0.036 * b.scale * (0.75 + 0.5 * twinkle);

      dummy.position.copy(tempPos);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);

      // High luminance gold for Bloom
      const lum = 1.15 + twinkle * 1.15;
      tempColor.copy(b.color).multiplyScalar(lum);
      inst.setColorAt(i, tempColor);
    }

    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
  });

  return (
    <group>
      {/* Continuous glowing golden spiral ribbon */}
      <mesh ref={ribbonMeshRef} geometry={ribbonGeometry}>
        <meshStandardMaterial
          ref={ribbonMatRef}
          color="#f7d582"
          emissive="#ffcf63"
          emissiveIntensity={1.25}
          metalness={0.9}
          roughness={0.2}
          transparent
          opacity={0.9}
          toneMapped={false}
        />
      </mesh>

      {/* Instanced twinkling fairy light bulbs */}
      <instancedMesh ref={bulbsRef} args={[undefined, undefined, bulbs.length]} frustumCulled={false}>
        <sphereGeometry args={[1, 10, 10]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </group>
  );
};
