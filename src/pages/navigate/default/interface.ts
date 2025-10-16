// 质检
export interface QualityInspection {
  title?: string;
  time?: string;
  qualityCount?: number;
  randomCount?: number;
  duration?: number;
}
// 基本
export interface BasicCard {
  icon?: number;
  status?: 0 | 1 | 2;
  description?: string;
}

// 基本
export interface TagCard {
  // icon1?: number;
  icon?: string;
  status?: 0 | 1 | 2;
  intro?: string;
  id: number;
  gid: number;
  name: string;
  url?: string;
  img?: string;
}