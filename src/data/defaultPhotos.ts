import { PhotoItem } from '../types';

const BASE = import.meta.env.BASE_URL;

export const DEFAULT_PHOTOS: PhotoItem[] = [
  {
    id: 'photo-1',
    url: `${BASE}photos/photo-1.jpg`,
    caption: '小小探险家的温暖日常',
    date: '2026 · 冬日记忆',
  },
  {
    id: 'photo-2',
    url: `${BASE}photos/photo-2.jpg`,
    caption: '乖巧萌宝的温柔凝望',
    date: '2026 · 岁末欢喜',
  },
  {
    id: 'photo-3',
    url: `${BASE}photos/photo-3.jpg`,
    caption: '和舅舅贴贴的幸福瞬间',
    date: '2026 · 温馨合影',
  },
  {
    id: 'photo-4',
    url: `${BASE}photos/photo-4.jpg`,
    caption: '满屋欢笑的灿烂小步',
    date: '2026 · 阖家团圆',
  },
  {
    id: 'photo-5',
    url: `${BASE}photos/photo-5.jpg`,
    caption: '手握小零食的快乐模样',
    date: '2026 · 成长点滴',
  },
  {
    id: 'photo-6',
    url: `${BASE}photos/photo-6.jpg`,
    caption: '镜头前最可爱的小天使',
    date: '2026 · 圣诞星愿',
  },
];
