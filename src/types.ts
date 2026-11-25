export type TreeMode = 'tree' | 'scattered';

export interface PhotoItem {
  id: string;
  url: string;
  caption: string;
  date?: string;
}

export type GestureKind = 'none' | 'open_palm' | 'fist' | 'pinch';

export type CameraStatus =
  | 'idle'
  | 'requesting'
  | 'loading_model'
  | 'active'
  | 'error';

export interface HandControlRef {
  handPresent: boolean;
  /** Normalized horizontal palm offset in [-1, 1] (mirrored so right hand movement moves right) */
  handX: number;
  /** Normalized vertical palm offset in [-1, 1] */
  handY: number;
  gesture: GestureKind;
  pinchActive: boolean;
}
