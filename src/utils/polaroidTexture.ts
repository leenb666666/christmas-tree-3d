import * as THREE from 'three';

/**
 * Generates a crisp high-DPI canvas texture for the Polaroid caption strip
 * so Chinese & Latin typography renders natively without external font fetches.
 */
export function createPolaroidCaptionTexture(caption: string, date?: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    // Warm ivory Polaroid paper background
    ctx.fillStyle = '#f8f4ea';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle paper fiber grain
    ctx.fillStyle = 'rgba(180, 165, 140, 0.06)';
    for (let i = 0; i < 180; i++) {
      const x = (i * 73) % canvas.width;
      const y = (i * 41) % canvas.height;
      ctx.fillRect(x, y, 2, 2);
    }

    // Main handwritten-style Chinese caption
    ctx.fillStyle = '#2c2520';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font =
      '600 32px "STKaiti", "KaiTi", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", serif';
    const trimmedCaption = caption.trim() || '圣诞快乐';
    ctx.fillText(trimmedCaption, canvas.width / 2, date ? 64 : 82, canvas.width - 48);

    // Optional date / subtitle in subtle warm gold-brown
    if (date && date.trim()) {
      ctx.fillStyle = '#8b7355';
      ctx.font = '500 20px "Georgia", "PingFang SC", "Microsoft YaHei", serif';
      ctx.fillText(date.trim(), canvas.width / 2, 118, canvas.width - 64);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}
