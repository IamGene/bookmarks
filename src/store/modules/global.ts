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
import { getPageTree } from "@/db/bookmarksPages";
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
  // group1s: TagGroups;
  hiddenGroup: boolean;

  defaultPage: number;
  pages: string[];
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
  groups: [],//当前标签分组列表,用于新增
  // group1s: [],//当前标签分组列表,用于新增
  hiddenGroup: false,//有隐藏分组
  defaultPage: null,
  pages: [],
  activeGroup: null,
  loadedBookmarks: null
}


// 找出含有隐藏项
function hasHidden(arr) {
  // 遍历数组中的每个元素
  for (const item of arr) {
    // 检查当前元素自身的hide属性
    if (item.hide === true) {
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
      // state.group1s = action.payload.group1s;
    },
    updateUserPage: (state, action) => {
      state.defaultPage = action.payload.defaultPage;
      state.pages = action.payload.pages;
    },
    updateActiveGroup: (state, action) => {
      state.activeGroup = action.payload;
    },
    setLoadBookmarks: (state, action) => {
      state.loadedBookmarks = action.payload;
    }
  },
});


/* function dispatchTagGroupsData(page: number) {
  const dispatch = useDispatch();
  fetchTagGroupsData(page);
} */

const fetchBookmarksPageData = (page: number) => {
  // console.log('fetchTagGroupsData', page)
  return async (dispatch) => {
    const res = await getPageTree(page);
    // const pages = await getPages();
    console.log('999999999999 fetchTagGroupsData res', page, res)
    if (res.length > 0) {
      //list: 分组书签（全字段）
      const list = res;
      let hideGroup: boolean = hasHidden(list);
      dispatch(updateTagGroups({ groups: list, hideGroup: hideGroup }))
      return res; // 直接返回整个响应对象
    } else {
      return undefined;
      // 处理错误情况
      // throw new Error('请求失败');
    }
  }
};


const loadNewAddedBookmarks = (bookmarks: WebTag[]) => {
  console.log('2222222222 loadNewAddedBookmarks action', bookmarks);
  return async (dispatch) => {
    dispatch(setLoadBookmarks(bookmarks))
  }
};

// export const { updateSettings, updateUserInfo, updateHasResult, updateTagGroups } = globalSlice.actions;
const { updateSettings, updateUserInfo, updateHasResult, updateTagGroups, updateUserPage, updateActiveGroup, setLoadBookmarks } = globalSlice.actions;
export { updateSettings, updateUserInfo, updateHasResult, updateTagGroups, updateUserPage, updateActiveGroup, fetchBookmarksPageData, loadNewAddedBookmarks };
export default globalSlice.reducer;
// export { dispatchTagGroupsData };
