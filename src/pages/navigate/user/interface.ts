// 质检
import { GroupNode } from '@/store/modules/global';

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
// export interface TagCard {
/* export interface WebTag {
  // icon1?: number;
  id?: number;
  icon?: string;
  status?: 0 | 1 | 2;
  description: string;
  hide: boolean;
  gid: number;
  name: string;
  url?: string;
  //搜索关键词时name会被Element类型取代,无法获知原来的长度以tooltip展示，所以保存在这个变量里
  nameLength?: number;
  img?: string;
} */

// 基本
// export interface TagCard {
export interface WebTag {
  // icon1?: number;
  id?: string;
  icon?: string;
  status?: 0 | 1 | 2;
  description: string;
  hide: boolean;
  gId: string;
  path?: string;//所在group的path

  pageId: number;
  date?: string;
  name: string;
  url: string;
  originalName?: string;
  originalDescription?: string;
  //搜索关键词时name会被Element类型取代,无法获知原来的长度以tooltip展示，所以保存在这个变量里
  nameLength?: number;
  img?: string;
}

export interface GroupFormParams {
  group: GroupNode;
  pid?: number;
}