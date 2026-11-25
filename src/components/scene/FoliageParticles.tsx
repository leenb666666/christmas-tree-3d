import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { generateTreeParticles } from '../../utils/treeMath';

interface FoliageParticlesProps {
  morphRef: React.MutableRefObject<number>;
}

const vertexShader = /* glsl */ `
  attribute vec3 aScatterPos;
  attribute vec3 aColor;
  attribute float aSize;
  attribute float aPhase;
  attribute float aGold;

  uniform float uTime;
  uniform float uMorph;
  uniform float uPixelRatio;

  varying vec3 vColor;
  varying float vGold;
  varying float vTwinkle;

  void main() {
    float m = clamp(uMorph, 0.0, 1.0);
    // Smooth cubic ease
    float easeM = m * m * (3.0 - 2.0 * m);

    // Base interpolated position
    vec3 pos = mix(position, aScatterPos, easeM);

    // Magical spiral swirl arc during transition
    float swirlArc = sin(easeM * 3.14159265);
    float swirlAngle = swirlArc * (1.35 + aPhase * 0.25);
    float cs = cos(swirlAngle);
    float sn = sin(swirlAngle);
    pos.xz = mat2(cs, -sn, sn, cs) * pos.xz;
    pos.y += swirlArc * sin(aPhase * 2.0) * 0.65;

    // Gentle living breeze on tree + slow cosmic drift when scattered
    float breeze = mix(0.035, 0.22, easeM);
    pos.x += sin(uTime * 0.9 + aPhase + pos.y * 0.6) * breeze;
    pos.y += cos(uTime * 0.75 + aPhase * 1.3) * breeze * 0.65;
    pos.z += cos(uTime * 0.85 + aPhase + pos.x * 0.5) * breeze;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    float twinkle = 0.68 + 0.32 * sin(uTime * (2.2 + aGold * 2.0) + aPhase * 6.2831);
    vTwinkle = twinkle;
    vGold = aGold;

    // Boost emerald depth & gold sparkle for lush layered foliage readability
    float bloomBoost = mix(1.22, 1.5 + 0.55 * twinkle, aGold);
    vColor = aColor * bloomBoost;

    float pointScale = aSize * (0.95 + 0.32 * twinkle) * (1.0 + 0.28 * easeM);
    gl_PointSize = clamp(pointScale * uPixelRatio * (21.5 / max(1.0, -mvPosition.z)), 1.8, 44.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vGold;
  varying float vTwinkle;

  void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);
    float dist = length(uv);
    if (dist > 0.5) discard;

    // Crisp luminous core + soft bokeh halo
    float core = smoothstep(0.5, 0.06, dist);
    float hotCenter = smoothstep(0.24, 0.0, dist);

    // Subtle 4-point star glint for gold particles
    float star = max(
      exp(-abs(uv.x) * 18.0) * exp(-abs(uv.y) * 5.0),
      exp(-abs(uv.y) * 18.0) * exp(-abs(uv.x) * 5.0)
    ) * vGold * vTwinkle;

    vec3 finalColor = vColor + vec3(1.0, 0.94, 0.75) * (hotCenter * 0.45 * vGold + star * 0.65);
    float alpha = clamp(core * 0.92 + star * 0.4, 0.0, 1.0);

    gl_FragColor = vec4(finalColor, alpha);
  }
`;

export const FoliageParticles: React.FC<FoliageParticlesProps> = ({ morphRef }) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const particleData = useMemo(() => generateTreeParticles(6800), []);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(particleData.treePositions, 3));
    geo.setAttribute('aScatterPos', new THREE.BufferAttribute(particleData.scatterPositions, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(particleData.colors, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(particleData.sizes, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(particleData.phases, 1));
    geo.setAttribute('aGold', new THREE.BufferAttribute(particleData.goldFlags, 1));
    return geo;
  }, [particleData]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMorph: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
    }),
    []
  );

  useFrame(({ clock }) => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.uTime.value = clock.getElapsedTime();
    materialRef.current.uniforms.uMorph.value = morphRef.current;
  });

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
};
