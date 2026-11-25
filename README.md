# 翡翠金辉 · 3D 交互圣诞树

基于 **React + TypeScript + Three.js (`@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`) + MediaPipe HandLandmarker** 制作的交互式 3D 圣诞树网页应用。

## 核心特色

- **深墨绿与香槟金美学**：`#01130e` 深墨绿夜空背景、6,800 颗祖母绿与香槟金分层树冠粒子、金色螺旋灯带与闪烁灯泡、金属彩球、树底立体礼物盒、顶部发光 3D 五角星、星尘粒子与 Bloom 辉光。
- **螺旋拍立得回忆墙**：木质夹子悬挂拍立得相框，支持点击放大/转出当前朝向正面的照片，再次点击转回树上，支持一键显示/隐藏及在线替换图片与修改文字说明。
- **MediaPipe 实时手势交互**：
  - 🖐 **张开手掌**：粒子散落态
  - ✊ **握拳**：聚合成圣诞树
  - 👋 **手掌位移**：平滑控制倾斜与旋转
  - 🤏 **拇指与食指捏合**：放大 / 收回前方拍立得照片

## 本地开发

```bash
npm install --legacy-peer-deps
npm run dev
```
