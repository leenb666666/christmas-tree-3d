import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { mulberry32 } from '../../utils/treeMath';

const stardustVert = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  attribute float aSpeed;

  uniform float uTime;
  uniform float uPixelRatio;

  varying float vAlpha;

  void main() {
    vec3 pos = position;
    // Slow graceful golden snow & stardust drift
    pos.y = mod(pos.y - uTime * aSpeed + 14.0, 28.0) - 14.0;
    pos.x += sin(uTime * 0.35 + aPhase) * 0.55;
    pos.z += cos(uTime * 0.3 + aPhase * 1.4) * 0.55;

    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPos;

    float twinkle = 0.4 + 0.6 * sin(uTime * 1.9 + aPhase * 6.2831);
    vAlpha = twinkle;

    gl_PointSize = clamp(aSize * uPixelRatio * (18.0 / max(1.0, -mvPos.z)), 1.2, 22.0);
  }
`;

const stardustFrag = /* glsl */ `
  varying float vAlpha;

  void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);
    float d = length(uv);
    if (d > 0.5) discard;

    float glow = smoothstep(0.5, 0.05, d);
    vec3 goldColor = vec3(1.18, 0.96, 0.58);
    gl_FragColor = vec4(goldColor, glow * vAlpha * 0.78);
  }
`;

export const StardustField: React.FC = () => {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const geometry = useMemo(() => {
    const count = 950;
    const rng = mulberry32(8881225);
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    const speeds = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const r = 4.5 + Math.pow(rng(), 0.65) * 20;
      const theta = rng() * Math.PI * 2;
      positions[i * 3] = Math.cos(theta) * r;
      positions[i * 3 + 1] = (rng() - 0.5) * 26;
      positions[i * 3 + 2] = Math.sin(theta) * r;

      sizes[i] = 0.8 + rng() * 1.9;
      phases[i] = rng() * Math.PI * 2;
      speeds[i] = 0.14 + rng() * 0.34;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geo.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
    return geo;
  }, []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
    }),
    []
  );

  useFrame(({ clock }) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = clock.getElapsedTime();
    }
  });

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={matRef}
        vertexShader={stardustVert}
        fragmentShader={stardustFrag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
};
