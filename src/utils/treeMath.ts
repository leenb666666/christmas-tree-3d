import * as THREE from 'three';

export const TREE_BASE_Y = -4.0;
export const TREE_TOP_Y = 5.2;
export const TREE_HEIGHT = TREE_TOP_Y - TREE_BASE_Y;
export const TREE_MAX_RADIUS = 3.65;
export const TREE_TIERS = 7;

/** Deterministic PRNG for consistent, artistically balanced layouts */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Returns the outer radius of the layered Christmas tree at normalized height t in [0, 1]
 * and azimuth angle in radians.
 */
export function getTreeRadiusAt(t: number, angle: number): number {
  const clampedT = Math.max(0, Math.min(1, t));
  const baseCone = Math.pow(1 - clampedT, 0.92) * TREE_MAX_RADIUS;

  // 7 overhanging bough layers
  const tierPos = clampedT * TREE_TIERS;
  const tierLocal = tierPos - Math.floor(tierPos);
  // Wide flare at bottom of each tier, tapering inward near top of each tier
  const boughFlare = 0.78 + 0.34 * Math.pow(1 - tierLocal, 1.35);

  // Subtle organic branch ribs around circumference
  const branchRib = 1 + 0.085 * Math.cos(angle * 8 + Math.floor(tierPos) * 0.9);

  // Smooth tip near the very top
  const tipBlend = clampedT > 0.92 ? 1 - (clampedT - 0.92) / 0.08 : 1;

  return Math.max(0.06, baseCone * (0.35 + 0.65 * boughFlare) * branchRib * (0.35 + 0.65 * tipBlend));
}

export interface TreeParticleData {
  count: number;
  treePositions: Float32Array;
  scatterPositions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  phases: Float32Array;
  goldFlags: Float32Array;
}

const EMERALD_PALETTE = [
  new THREE.Color('#03442e'),
  new THREE.Color('#046342'),
  new THREE.Color('#067a50'),
  new THREE.Color('#0c9661'),
  new THREE.Color('#13b576'),
  new THREE.Color('#075a3e'),
];

const GOLD_PALETTE = [
  new THREE.Color('#f7d88b'),
  new THREE.Color('#ffdf7e'),
  new THREE.Color('#e5b653'),
  new THREE.Color('#fff0bd'),
  new THREE.Color('#d9a441'),
];

export function generateTreeParticles(count = 6800): TreeParticleData {
  const rng = mulberry32(20261225);
  const treePositions = new Float32Array(count * 3);
  const scatterPositions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);
  const goldFlags = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    // Bias height distribution slightly toward wider lower tiers for even density
    const u = rng();
    const t = 1 - Math.pow(1 - u, 0.68);
    const angle = rng() * Math.PI * 2;
    const maxR = getTreeRadiusAt(t, angle);

    // Concentrate particles near the sculpted bough surface while keeping lush depth
    const isGold = rng() < 0.27;
    const radialFactor = isGold
      ? 0.72 + 0.34 * Math.pow(rng(), 0.45)
      : 0.28 + 0.75 * Math.pow(rng(), 0.42);
    const r = maxR * radialFactor;

    const y = TREE_BASE_Y + t * TREE_HEIGHT + (rng() - 0.5) * 0.16;
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;

    treePositions[i * 3] = x;
    treePositions[i * 3 + 1] = y;
    treePositions[i * 3 + 2] = z;

    // Celestial nebula scatter distribution
    const sTheta = rng() * Math.PI * 2;
    const sPhi = Math.acos(2 * rng() - 1);
    const sRadius = 5.2 + Math.pow(rng(), 0.7) * 9.5;
    scatterPositions[i * 3] = sRadius * Math.sin(sPhi) * Math.cos(sTheta);
    scatterPositions[i * 3 + 1] = sRadius * Math.cos(sPhi) * 0.68 + 0.5;
    scatterPositions[i * 3 + 2] = sRadius * Math.sin(sPhi) * Math.sin(sTheta);

    const palette = isGold ? GOLD_PALETTE : EMERALD_PALETTE;
    const baseCol = palette[Math.floor(rng() * palette.length)];
    // Slight brightness boost toward outer tips
    const brightness = isGold ? 1.05 + rng() * 0.35 : 0.75 + radialFactor * 0.45;
    colors[i * 3] = baseCol.r * brightness;
    colors[i * 3 + 1] = baseCol.g * brightness;
    colors[i * 3 + 2] = baseCol.b * brightness;

    sizes[i] = isGold ? 1.15 + rng() * 1.6 : 0.95 + rng() * 1.45;
    phases[i] = rng() * Math.PI * 2;
    goldFlags[i] = isGold ? 1.0 : 0.0;
  }

  return {
    count,
    treePositions,
    scatterPositions,
    colors,
    sizes,
    phases,
    goldFlags,
  };
}

export interface SpiralBulbData {
  treePos: THREE.Vector3;
  scatterPos: THREE.Vector3;
  phase: number;
  scale: number;
  color: THREE.Color;
}

export function generateSpiralGarland(turns = 5.5, bulbCount = 340): {
  curvePoints: THREE.Vector3[];
  bulbs: SpiralBulbData[];
} {
  const rng = mulberry32(991225);
  const curvePoints: THREE.Vector3[] = [];
  const curveSamples = 240;

  for (let i = 0; i <= curveSamples; i++) {
    const frac = i / curveSamples;
    const t = 0.03 + frac * 0.91;
    const angle = frac * Math.PI * 2 * turns;
    const r = getTreeRadiusAt(t, angle) + 0.22;
    const y = TREE_BASE_Y + t * TREE_HEIGHT;
    curvePoints.push(new THREE.Vector3(Math.cos(angle) * r, y, Math.sin(angle) * r));
  }

  const bulbs: SpiralBulbData[] = [];
  const bulbColors = [
    new THREE.Color('#ffe599'),
    new THREE.Color('#ffd066'),
    new THREE.Color('#fff5d6'),
    new THREE.Color('#f5c04e'),
  ];

  for (let i = 0; i < bulbCount; i++) {
    const frac = i / (bulbCount - 1);
    const t = 0.03 + frac * 0.91;
    const angle = frac * Math.PI * 2 * turns;
    const r = getTreeRadiusAt(t, angle) + 0.24 + (rng() - 0.5) * 0.08;
    const y = TREE_BASE_Y + t * TREE_HEIGHT + (rng() - 0.5) * 0.06;

    const treePos = new THREE.Vector3(Math.cos(angle) * r, y, Math.sin(angle) * r);

    const scatterAngle = angle * 1.3 + rng() * 0.6;
    const scatterR = 6.0 + rng() * 6.5;
    const scatterY = (rng() - 0.5) * 8.5 + 0.4;
    const scatterPos = new THREE.Vector3(
      Math.cos(scatterAngle) * scatterR,
      scatterY,
      Math.sin(scatterAngle) * scatterR
    );

    bulbs.push({
      treePos,
      scatterPos,
      phase: rng() * Math.PI * 2,
      scale: 0.75 + rng() * 0.7,
      color: bulbColors[Math.floor(rng() * bulbColors.length)],
    });
  }

  return { curvePoints, bulbs };
}

export interface OrnamentData {
  treePos: THREE.Vector3;
  scatterPos: THREE.Vector3;
  scale: number;
  color: string;
  metalness: number;
  roughness: number;
  phase: number;
}

const ORNAMENT_STYLES = [
  { color: '#f3cf7a', metalness: 0.94, roughness: 0.14 }, // Champagne gold
  { color: '#d4a038', metalness: 0.96, roughness: 0.18 }, // Warm antique gold
  { color: '#a81c38', metalness: 0.82, roughness: 0.2 },  // Deep velvet ruby
  { color: '#f9ecd2', metalness: 0.78, roughness: 0.16 }, // Pearl champagne
  { color: '#0d8a5e', metalness: 0.88, roughness: 0.2 },  // Emerald jewel
];

export function generateOrnaments(count = 58): OrnamentData[] {
  const rng = mulberry32(441225);
  const ornaments: OrnamentData[] = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < count; i++) {
    const frac = (i + 0.5) / count;
    const t = 0.06 + frac * 0.83;
    const angle = i * goldenAngle + (rng() - 0.5) * 0.25;
    const r = getTreeRadiusAt(t, angle) + 0.06;
    const y = TREE_BASE_Y + t * TREE_HEIGHT;

    const treePos = new THREE.Vector3(Math.cos(angle) * r, y, Math.sin(angle) * r);

    const sRadius = 5.8 + rng() * 5.6;
    const sTheta = angle + (rng() - 0.5) * 1.2;
    const sY = (rng() - 0.5) * 7.8 + 0.6;
    const scatterPos = new THREE.Vector3(
      Math.cos(sTheta) * sRadius,
      sY,
      Math.sin(sTheta) * sRadius
    );

    const style = ORNAMENT_STYLES[i % ORNAMENT_STYLES.length];
    ornaments.push({
      treePos,
      scatterPos,
      scale: 0.15 + rng() * 0.11,
      color: style.color,
      metalness: style.metalness,
      roughness: style.roughness,
      phase: rng() * Math.PI * 2,
    });
  }

  return ornaments;
}

export interface GiftBoxData {
  treePos: THREE.Vector3;
  treeRot: THREE.Euler;
  scatterPos: THREE.Vector3;
  scatterRot: THREE.Euler;
  size: [number, number, number];
  boxColor: string;
  ribbonColor: string;
  phase: number;
}

const GIFT_STYLES = [
  { boxColor: '#0a4d36', ribbonColor: '#f5cf78' },
  { boxColor: '#8f172f', ribbonColor: '#f8dc91' },
  { boxColor: '#c99b42', ribbonColor: '#073b29' },
  { boxColor: '#e8dcc4', ribbonColor: '#b5842e' },
  { boxColor: '#123a35', ribbonColor: '#e9c16c' },
  { boxColor: '#6e1427', ribbonColor: '#e7c275' },
];

export function generateGiftBoxes(count = 14): GiftBoxData[] {
  const rng = mulberry32(771225);
  const gifts: GiftBoxData[] = [];

  for (let i = 0; i < count; i++) {
    const isOuterRing = i >= 5;
    const ringIndex = isOuterRing ? i - 5 : i;
    const ringTotal = isOuterRing ? count - 5 : 5;
    const baseAngle = (ringIndex / ringTotal) * Math.PI * 2 + (isOuterRing ? 0.35 : 0);
    const angle = baseAngle + (rng() - 0.5) * 0.28;
    const dist = isOuterRing ? 2.55 + rng() * 1.45 : 1.35 + rng() * 0.85;

    const w = 0.55 + rng() * 0.55;
    const h = 0.45 + rng() * 0.55;
    const d = 0.55 + rng() * 0.55;

    const treePos = new THREE.Vector3(
      Math.cos(angle) * dist,
      TREE_BASE_Y - 0.32 + h / 2,
      Math.sin(angle) * dist
    );
    const treeRot = new THREE.Euler(0, angle + (rng() - 0.5) * 0.9, 0);

    const sDist = 6.2 + rng() * 4.5;
    const scatterPos = new THREE.Vector3(
      Math.cos(angle) * sDist,
      -2.2 + rng() * 5.2,
      Math.sin(angle) * sDist
    );
    const scatterRot = new THREE.Euler(
      (rng() - 0.5) * 1.4,
      rng() * Math.PI * 2,
      (rng() - 0.5) * 1.4
    );

    const style = GIFT_STYLES[i % GIFT_STYLES.length];
    gifts.push({
      treePos,
      treeRot,
      scatterPos,
      scatterRot,
      size: [w, h, d],
      boxColor: style.boxColor,
      ribbonColor: style.ribbonColor,
      phase: rng() * Math.PI * 2,
    });
  }

  return gifts;
}

export interface PolaroidSlotData {
  treePos: THREE.Vector3;
  treeQuat: THREE.Quaternion;
  scatterPos: THREE.Vector3;
  scatterQuat: THREE.Quaternion;
  swayPhase: number;
}

export function generatePolaroidSlots(count: number): PolaroidSlotData[] {
  const slots: PolaroidSlotData[] = [];
  if (count <= 0) return slots;

  const rng = mulberry32(314159);
  const totalSpiralTurns = Math.max(1.25, count * 0.27);
  const up = new THREE.Vector3(0, 1, 0);
  const dummy = new THREE.Object3D();

  for (let i = 0; i < count; i++) {
    const frac = count === 1 ? 0.5 : i / (count - 1);
    // Distribute from lower-mid to upper-mid boughs
    const t = 0.2 + frac * 0.56;
    const angle = frac * Math.PI * 2 * totalSpiralTurns + 0.35;
    const r = getTreeRadiusAt(t, angle) + 0.55;
    const y = TREE_BASE_Y + t * TREE_HEIGHT;

    const treePos = new THREE.Vector3(Math.cos(angle) * r, y, Math.sin(angle) * r);

    // Orient Polaroid facing radially outward from the tree axis with gentle upward tilt and natural hang roll
    dummy.position.copy(treePos);
    const outwardTarget = new THREE.Vector3(
      Math.cos(angle) * (r + 5),
      y + 0.65,
      Math.sin(angle) * (r + 5)
    );
    dummy.up.copy(up);
    dummy.lookAt(outwardTarget);
    const naturalRoll = ((i % 2 === 0 ? 1 : -1) * (0.06 + rng() * 0.06));
    dummy.rotateZ(naturalRoll);
    const treeQuat = dummy.quaternion.clone();

    // Floating circular gallery ring in scattered mode
    const sAngle = (i / count) * Math.PI * 2 + 0.25;
    const sRadius = 6.2 + (i % 2) * 0.9;
    const sY = -0.6 + ((i % 3) - 1) * 1.45;
    const scatterPos = new THREE.Vector3(
      Math.cos(sAngle) * sRadius,
      sY,
      Math.sin(sAngle) * sRadius
    );
    dummy.position.copy(scatterPos);
    dummy.lookAt(Math.cos(sAngle) * (sRadius + 5), sY, Math.sin(sAngle) * (sRadius + 5));
    dummy.rotateZ((rng() - 0.5) * 0.14);
    const scatterQuat = dummy.quaternion.clone();

    slots.push({
      treePos,
      treeQuat,
      scatterPos,
      scatterQuat,
      swayPhase: rng() * Math.PI * 2,
    });
  }

  return slots;
}
