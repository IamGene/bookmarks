/* 

import defaultSettings from '../settings.json';
export interface GlobalState {
  settings?: typeof defaultSettings;
  userInfo?: {
    name?: string;
    avatar?: string;
    job?: string;
    organization?: string;
    location?: string;
    email?: string;
    permissions: Record<string, string[]>;
  };
  userLoading?: boolean;
  hasResult: boolean;
}

// 全局状态初始值
const initialState: GlobalState = {
  // 设置
  settings: defaultSettings,
  // 用户信息
  userInfo: {
    permissions: {},
  },
  hasResult: true
};

function store(state = initialState, action) {
  switch (action.type) {
    case 'update-settings': {
      const { settings } = action.payload;
      return {
        ...state,
        settings,
      };
    }
    case 'update-userInfo': {
      const { userInfo = initialState.userInfo, userLoading } = action.payload;
      console.log('userInfo', userInfo)
      return {
        ...state,
        userLoading,
        userInfo,
      };
    }

    case 'update-hasResult': {
      const { hasResult } = action.payload;
      // initialState.hasResult = hasResult
      return {
        ...state,
        hasResult,
      };
    }

    default:
      return state;
  }
}

export default store 
*/


import { createSlice } from '@reduxjs/toolkit';
import defaultSettings from '../../settings.json';
// import { getUserNaviate } from '@/api/navigate';
import { getPageTree, getPages, getPage } from "@/db/bookmarksPages";
import { WebTag } from '@/pages/navigate/user/interface';
export interface GroupNode {
  id: string;
  name: string;
  path: string;
  description: string;
  hide: boolean;
  // batchNo: number; // 页编号
  pageId: number; //页编号
  pId?: number; // 父节点ID，可能为空
  children?: GroupNode[]; // 子节点，可能为空数组
}

export interface Page {
  createAt: number;
  updatedAt: number;
  title: string;
  default: boolean;
  // batchNo: number; // 页编号
  pageId: number; //页编号
  // children?: GroupNode[]; // 子节点，可能为空数组
}
// 定义一个TreeNode类型的数组
type TagGroups = GroupNode[];

export interface GlobalState {
  settings?: typeof defaultSettings;
  userInfo?: {
    userName?: string;
    avatar?: string;
    job?: string;
    organization?: string;
    location?: string;
    email?: string;
    permissions: Record<string, string[]>;
  };
  userLoading?: boolean;
  hasResult: boolean;
  groups: TagGroups;
  treeData: TagGroups;
  pageId: number,
  currentPage: Page,
  // group1s: TagGroups;
  hiddenGroup: boolean;
  defaultPage: number;
  pages: [];
  activeGroup: GroupNode;
  loadedBookmarks: WebTag[];
}

const initialState: GlobalState = {
  // 设置
  settings: defaultSettings,
  // 用户信息
  userInfo: {
    permissions: {},
  },
  hasResult: true,
  // groups: [],//当前标签分组列表,用于新增
  groups: null,//当前标签分组列表,用于新增
  treeData: [],//当前标签分组列表,用于新增
  // group1s: [],//当前标签分组列表,用于新增
  hiddenGroup: false,//有隐藏分组
  defaultPage: null,
  currentPage: null,
  pages: null,
  activeGroup: null,
  loadedBookmarks: null
}


// 找出含有隐藏项
function hasHidden(arr) {
  // 遍历数组中的每个元素
  for (const item of arr) {
    // 检查当前元素自身的hide属性
    // if (item.hide !== 'undefined' && item.hide !== null && item.hide) {
    if (item.hide) {
      return true;
    }
    // 检查naviList中的元素
    if (Array.isArray(item.naviList)) {
      for (const navi of item.naviList) {
        if (navi.hide === true) {
          return true;
        }
      }
    }
    // 检查children中的元素（递归）
    if (Array.isArray(item.children) && item.children.length > 0) {
      if (hasHidden(item.children)) {
        return true;
      }
    }
  }
  // 没有找到hide为true的元素
  return false;
}

const globalSlice = createSlice({
  name: 'global',
  initialState,
  reducers: {
    updateSettings: (state, action) => {
      state.settings = action.payload.settings;
    },
    updateUserInfo: (state, action) => {
      state.userInfo = action.payload.userInfo || initialState.userInfo;
      state.userLoading = action.payload.userLoading;
    },
    updateHasResult: (state, action) => {
      state.hasResult = action.payload.hasResult;
    },
    updateTagGroups: (state, action) => {
      state.groups = action.payload.groups;
      state.hiddenGroup = action.payload.hideGroup;
      state.treeData = action.payload.treeData;
      state.currentPage = action.payload.currentPage;
    },
    setUserPages: (state, action) => {
      state.defaultPage = action.payload.defaultPage;
      state.pages = action.payload.pages;
      // 兼容性处理：如果 payload 中没有 defaultPage，则从 pages 中自动选取
      /* const pagesPayload = action.payload.pages || [];
      state.pages = pagesPayload;
      if (action.payload.defaultPage !== undefined && action.payload.defaultPage !== null) {
        state.defaultPage = action.payload.defaultPage;
      } else {
        const defaultPageObj = Array.isArray(pagesPayload) && pagesPayload.length > 0
          ? pagesPayload.find(p => p.default === true)
          : null;
        state.defaultPage = defaultPageObj ? defaultPageObj.pageId : (pagesPayload[0]?.pageId ?? null);
      }
      // 同时设置 currentPage 为默认页对象（如果存在）
      if (state.defaultPage) {
        const current = Array.isArray(pagesPayload) ? pagesPayload.find(p => p.pageId === state.defaultPage) : null;
        state.currentPage = current || state.currentPage;
      } */
    },
    //test..........................
    updateActiveGroup: (state, action) => {
      state.activeGroup = action.payload;
    },
    setLoadBookmarks: (state, action) => {
      state.loadedBookmarks = action.payload;
    }
  },
});


function filterChildrenArrayByPath(arr) {
  // 返回一个新数组，避免修改原数组
  return arr.map(item => filterChildrenByPath(item));
}


// 保证每层都新建对象，不引用原对象
function filterChildrenByPath(data) {

  if (!data) {
    // children不是数组，直接返回新对象
    return data;
  }

  // 先浅拷贝一份（不引用原对象）
  const newData = { ...data };

  if (!Array.isArray(data.children)) {
    // children不是数组，直接返回新对象
    return newData;
  }

  // 过滤并递归深拷贝子元素
  newData.children = data.children
    // .filter(child => child.path !== data.path)//过滤掉复制分组
    .filter(child => child.id !== data.id)//过滤掉复制分组
    .map(child => filterChildrenByPath(child));
  return newData;
}


const fetchBookmarksPageData = (pageId: number) => {
  // console.log('fetchTagGroupsData', page)
  return async (dispatch) => {
    const res = await getPageTree(pageId);
    const currentPage = await getPage(pageId);
    if (res.length > 0) {
      //list: 分组书签（全字段）
      const list = res;
      const hideGroup: boolean = hasHidden(list);
      const treeData = filterChildrenArrayByPath(list);
      console.log('999999999999 fetchTagGroupsData treeData', list);
      dispatch(updateTagGroups({ groups: list, hideGroup: hideGroup, currentPage: currentPage, treeData: treeData }));
      return res; // 直接返回整个响应对象
    } else {
      dispatch(updateTagGroups({ groups: [], hideGroup: false, currentPage: currentPage, treeData: [] }));
      return [];
      // 处理错误情况
      // throw new Error('请求失败');
    }
  }
};


const updatePageDataState = (pageData: any[]) => {
  return async (dispatch) => {
    const hideGroup: boolean = hasHidden(pageData || []);
    const treeData = filterChildrenArrayByPath(pageData || []);
    dispatch(updateTagGroups({ groups: pageData, hideGroup: hideGroup, treeData }));
  };
};

const loadNewAddedBookmarks = (bookmarks: WebTag[]) => {
  // console.log('2222222222 loadNewAddedBookmarks action', bookmarks);
  return async (dispatch) => {
    dispatch(setLoadBookmarks(bookmarks));
  }
};

const reloadUserPages = () => {
  return async (dispatch) => {
    const pages = await getPages();
    dispatch(setUserPages({ pages: pages }));
    return pages; // 直接返回整个响应对象
  }
};


// export const { updateSettings, updateUserInfo, updateHasResult, updateTagGroups } = globalSlice.actions;
const { updateSettings, updateUserInfo, updateHasResult, updateTagGroups, setUserPages, updateActiveGroup, setLoadBookmarks } = globalSlice.actions;
export { updateSettings, updateUserInfo, updateHasResult, updateTagGroups, updateActiveGroup, updatePageDataState, reloadUserPages, fetchBookmarksPageData, loadNewAddedBookmarks };
export default globalSlice.reducer;
// export { dispatchTagGroupsData };
