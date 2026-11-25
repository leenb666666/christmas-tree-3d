import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const photosDir = path.join(root, 'public', 'photos');
const defaultPhotosFile = path.join(root, 'src', 'data', 'defaultPhotos.ts');

// 1. Delete all personal photo files under public/photos/
if (fs.existsSync(photosDir)) {
  for (const entry of fs.readdirSync(photosDir)) {
    const full = path.join(photosDir, entry);
    fs.rmSync(full, { recursive: true, force: true });
    console.log(`Removed personal photo: public/photos/${entry}`);
  }
  fs.rmSync(photosDir, { recursive: true, force: true });
  console.log('Removed public/photos directory.');
} else {
  console.log('public/photos already removed.');
}

// 2. Replace src/data/defaultPhotos.ts with festive self-upload placeholder Polaroids
const cleanDefaultPhotos = `import { PhotoItem } from '../types';

const BASE = import.meta.env.BASE_URL;

export const DEFAULT_PHOTOS: PhotoItem[] = [
  {
    id: 'placeholder-1',
    url: \`\${BASE}placeholders/card-1.svg\`,
    caption: '上传你的冬日回忆',
    date: '点击右上角自定义照片',
  },
  {
    id: 'placeholder-2',
    url: \`\${BASE}placeholders/card-2.svg\`,
    caption: '点亮专属圣诞瞬间',
    date: '支持本地相册替换',
  },
  {
    id: 'placeholder-3',
    url: \`\${BASE}placeholders/card-3.svg\`,
    caption: '挂上温暖合影时光',
    date: '自由编辑手写配文',
  },
  {
    id: 'placeholder-4',
    url: \`\${BASE}placeholders/card-4.svg\`,
    caption: '珍藏此刻岁末欢喜',
    date: '仅本地展示 · 保护隐私',
  },
  {
    id: 'placeholder-5',
    url: \`\${BASE}placeholders/card-5.svg\`,
    caption: '装点你的梦幻圣诞树',
    date: '可自由添加更多照片',
  },
  {
    id: 'placeholder-6',
    url: \`\${BASE}placeholders/card-6.svg\`,
    caption: '留下一张圣诞星愿照',
    date: '支持手势隔空赏图',
  },
];
`;

fs.writeFileSync(defaultPhotosFile, cleanDefaultPhotos, 'utf8');
console.log('Updated src/data/defaultPhotos.ts to festive placeholder self-upload mode.');
