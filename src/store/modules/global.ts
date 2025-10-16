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
import { getPageTree } from "@/db/restoreTree";

export interface GroupNode {
  id: number;
  name: string;
  hide: boolean;
  batchNo: number; // 页编号
  pid?: number; // 父节点ID，可能为空
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
  activeGroup: null
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
    // const res = await getUserNaviate();
    console.log('999999999999 fetchTagGroupsData res', page, res)
    // if (res.code === 200) {
    if (res.length > 0) {
      //list: 分组书签（全字段）
      const list = res;
      let hideGroup: boolean = hasHidden(list);
      // console.log('33333333333 hasHidden', hideGroup);

      // 添加到Redux全局变量
      /* const group1s = [];
      list.forEach(item => {
        //只取需要的字段
        group1s.push({ id: item.id, name: item.name, hide: item.hide })
      }); */
      // dispatch(updateActives([1, 21]))
      //检查有无隐藏的分组或标签??
      dispatch(updateTagGroups({ groups: list, hideGroup: hideGroup }))
      // return true
      // 设置表单数据，这里省略了...
      // return res.data; // 直接返回整个响应对象
      return res; // 直接返回整个响应对象
    } else {
      return undefined;
      // 处理错误情况
      // throw new Error('请求失败');
    }
  }
};

// export const { updateSettings, updateUserInfo, updateHasResult, updateTagGroups } = globalSlice.actions;
const { updateSettings, updateUserInfo, updateHasResult, updateTagGroups, updateUserPage, updateActiveGroup } = globalSlice.actions;
export { updateSettings, updateUserInfo, updateHasResult, updateTagGroups, updateUserPage, updateActiveGroup, fetchBookmarksPageData };
export default globalSlice.reducer;
// export { dispatchTagGroupsData };
