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
import { getPageTree, getPageTreeByDate, getPages, getPageTreeByDomain, getPage, getSearchHistory } from "@/db/bookmarksPages";
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
  search: {
    hasResult: boolean,
    searchHistory: string[],
    keyword: string,
    searchResultNum: number,
  };
  // hasResult: boolean;
  // searchHistory: string[];
  userLoading?: boolean;
  dataByGroup: TagGroups;
  dataByDate: TagGroups;
  dataByDomain: TagGroups;
  toUpdateGroupTypes: number[];
  expandedKeys: string[];
  dateGroups: TagGroups;
  dataGroups: TagGroups;
  domainGroups: TagGroups;
  pageId: number,
  currentPage: Page,
  // group1s: TagGroups;
  hiddenGroup: boolean;
  defaultPage: number;
  pages: [];
  tagsMap: { [key: string]: string[] } | null;
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
  search: {
    hasResult: true,
    searchHistory: [],
    keyword: null,
    searchResultNum: 0,
  },
  // hasResult: true,
  // groups: [],//当前标签分组列表,用于新增
  dataByDate: null,//当前标签分组列表,用于新增
  dataByGroup: null,//当前标签分组列表（按时间排列）,用于新增
  dataByDomain: null,//当前标签分组列表（按域名排列）,用于新增
  dateGroups: null,//当前标签分组列表,用于新增
  domainGroups: null,//当前标签分组列表,用于新增
  dataGroups: [],//当前标签分组列表
  expandedKeys: [],//当前标签分组列表
  toUpdateGroupTypes: [],//
  hiddenGroup: false,//有隐藏分组
  defaultPage: null,
  currentPage: null,
  pageId: null,
  tagsMap: null,
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
      state.search.hasResult = action.payload.hasResult;
    },
    updateSearchState: (state, action) => {
      // console.log('xxxxxxxxxxxxxxxxxxxxx updateSearchState', action.payload);
      state.search.hasResult = action.payload.hasResult;
      if (action.payload.keyword != null) {//重新搜索
        state.search.keyword = action.payload.keyword;
        state.search.searchResultNum = 0;//每次新搜索，重置结果数
        const keyword = action.payload.keyword;
        // 将 keyword 移到 state.searchHistory 的第一个位置（若已存在则先移除再放到最前面；若不存在则添加到最前面）
        if (!keyword) return;
        const list = Array.isArray(state.search.searchHistory) ? [...state.search.searchHistory] : [];
        const idx = list.findIndex(item => item === keyword);
        if (idx > -1) {
          list.splice(idx, 1);
        }
        list.unshift(keyword);
        state.search.searchHistory = list;
        // console.log('🌀 updateSearchHistory state.searchHistory=', list);

      }
      // console.log('---------------', action.payload);
      if (action.payload.searchResultNum != null) {
        state.search.searchResultNum = state.search.searchResultNum + action.payload.searchResultNum;
      }
    },
    setSearchHistory: (state, action) => {
      state.search.searchHistory = action.payload.historyWords;
    },

    updateBookmarks: (state, action) => {
      if (action.payload.dataGroups) state.dataGroups = action.payload.dataGroups;
      if (action.payload.dataByDate) state.dataByDate = action.payload.dataByDate;
      if (action.payload.dataByDomain) state.dataByDomain = action.payload.dataByDomain;
      if (action.payload.dataByGroup) state.dataByGroup = action.payload.dataByGroup;
      if (action.payload.dateGroups) state.dateGroups = action.payload.dateGroups;
      if (action.payload.domainGroups) state.domainGroups = action.payload.domainGroups;
      if (action.payload.currentPage) state.currentPage = action.payload.currentPage;
      if (action.payload.tagsMap) state.tagsMap = action.payload.tagsMap;
      state.search.searchResultNum = 0;//每次更新书签数据，重置搜索结果数
      state.hiddenGroup = action.payload.hideGroup;
      state.expandedKeys = action.payload.expandedKeys;
      if (action.payload.updatedGroupType != null) {
        if (state.toUpdateGroupTypes.includes(action.payload.updatedGroupType)) {
          const idx = state.toUpdateGroupTypes.indexOf(action.payload.updatedGroupType);
          state.toUpdateGroupTypes.splice(idx, 1);
        }
      }
    },

    updateGroupTypes: (state, action) => {
      if (action.payload.toUpdateGroupTypes) {
        const types = action.payload.toUpdateGroupTypes;
        for (const t of types) {
          if (!state.toUpdateGroupTypes.includes(t)) {
            state.toUpdateGroupTypes.push(t);
          }
        }
      }
    },

    updateTagsMap: (state, action) => {
      // tagsMap now stores arrays of ids: { [tag:string]: string[] }
      const tagsUpdate = action.payload.tagsUpdate || [];

      if (!state.tagsMap) state.tagsMap = {} as any;

      for (const item of tagsUpdate) {
        if (!item || !item.tag) continue;
        const tagKey = String(item.tag).trim();
        if (!tagKey) continue;
        const add = !!item.add;
        const id = item.id != null ? String(item.id) : null;

        const currentArr: string[] = Array.isArray(state.tagsMap[tagKey]) ? [...state.tagsMap[tagKey]] : [];

        if (add) {//增加
          if (id) {
            if (!currentArr.includes(id)) currentArr.push(id);
            state.tagsMap[tagKey] = currentArr;
          } else {
            if (!state.tagsMap[tagKey]) state.tagsMap[tagKey] = [];
          }
        } else {//删除
          if (id) {
            const filtered = currentArr.filter(x => x !== id);
            if (filtered.length === 0) delete state.tagsMap[tagKey];
            else state.tagsMap[tagKey] = filtered;
          } else {
            // no id: remove the whole tag entry
            delete state.tagsMap[tagKey];
          }
        }
      }
    },

    /* updateSearchHistory: (state, action) => {
      const keyword = action.payload.keyword;
      // 将 keyword 移到 state.searchHistory 的第一个位置（若已存在则先移除再放到最前面；若不存在则添加到最前面）
      if (!keyword) return;
      const list = Array.isArray(state.searchHistory) ? [...state.searchHistory] : [];
      const idx = list.findIndex(item => item === keyword);
      if (idx > -1) {
        list.splice(idx, 1);
      }
      list.unshift(keyword);
      state.searchHistory = list;
      console.log('🌀 updateSearchHistory state.searchHistory=', list);
    }, */
    setUserPages: (state, action) => {
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
  return async (dispatch) => {
    const res = await getPageTree(pageId);

    // console.log('--------------------fetchBookmarksPageData res', res);
    const res1 = await getPageTreeByDate(pageId);
    const expandedKeys = res.expandedKeys || [];
    const res2 = await getPageTreeByDomain(pageId);
    // const domainGroups = res2.treeData.slice(0, 10);//
    const domainGroups = res2.treeData;//
    const list2 = res2.data;//书签数据
    // console.log('--------------------fetchBookmarksPageData res', res);
    const data = res.data;
    let tagsMap = res.tagsMap;
    // 如果后端/DB 返回的是 Map，转换为普通对象以保证 state 可序列化
    if (tagsMap instanceof Map) {
      tagsMap = Object.fromEntries(tagsMap);
    }

    // console.log('--------------------fetchBookmarksPageData res1', res1);
    const dateGroups = res1.treeData;//
    const list1 = res1.data;//书签数据

    // console.log('5555555555555 fetchTagGroupsData tagsMap', tagsMap);
    const currentPage = await getPage(pageId);
    if (data.length > 0) {
      //list: 分组书签（全字段）
      const list = data;
      const hideGroup: boolean = hasHidden(list);
      const treeData = filterChildrenArrayByPath(list);
      // console.log('999999999999 fetchTagGroupsData treeData', treeData);
      dispatch(updateBookmarks({
        dataByGroup: list,
        dataByDate: list1,
        dataByDomain: list2,
        hideGroup: hideGroup,
        expandedKeys: expandedKeys,
        dateGroups: dateGroups,
        domainGroups: domainGroups,
        dataGroups: treeData,
        tagsMap: tagsMap,
        currentPage: currentPage,
      }));
      return res; // 直接返回整个响应对象
    } else {
      dispatch(updateBookmarks({ dataByGroup: [], dataByDate: [], hideGroup: false, dateGroups: [], tagsMap: tagsMap, currentPage: currentPage, dataGroups: [] }));
      return [];
      // 处理错误情况
      // throw new Error('请求失败');
    }
  }
};

const fetchBookmarksPageData0 = (pageId: number) => {
  return async (dispatch) => {
    const res = await getPageTree(pageId);
    // console.log('--------------------fetchBookmarksPageData0 res', res);
    const data = res.data;
    let tagsMap = res.tagsMap;
    // 如果后端/DB 返回的是 Map，转换为普通对象以保证 state 可序列化
    if (tagsMap instanceof Map) {
      tagsMap = Object.fromEntries(tagsMap);
    }
    //
    // const currentPage = await getPage(pageId);
    if (data.length > 0) {
      //list: 分组书签（全字段）
      const list = data;
      // const hideGroup: boolean = hasHidden(list);
      const hideGroup: boolean = false;
      const treeData = filterChildrenArrayByPath(list);
      dispatch(updateBookmarks({
        dataByGroup: list,
        dataGroups: treeData,
        hideGroup: hideGroup,
        tagsMap: tagsMap,
        updatedGroupType: 0,
        // currentPage: currentPage
      }));
      return res; // 直接返回整个响应对象
    } else {
      await dispatch(updateBookmarks({ dataByGroup: [], hideGroup: false, tagsMap: [], treeData: null }));
      // await dispatch(updateGroupTypes({ updatedGroupType: 0 }));
      // dispatch(updateBookmarks({ dataByGroup: [], dataByDate: [], hideGroup: false, dateGroups: [], tagsMap: tagsMap, currentPage: currentPage, treeData: [] }));
      return [];
      // 处理错误情况
      // throw new Error('请求失败');
    }
  }
};



const fetchBookmarksPageData1 = (pageId: number) => {
  return async (dispatch) => {
    const res1 = await getPageTreeByDate(pageId);
    const dateGroups = res1.treeData;//
    // console.log('999999999999 fetchBookmarksPageData1 treeData', res1);
    const list1 = res1.data;//书签数据
    if (list1.length > 0) {
      await dispatch(updateBookmarks({ dataByDate: list1, dateGroups: dateGroups, updatedGroupType: 1 }));
      // await dispatch(updateGroupTypes({  }));
      return res1; // 直接返回整个响应对象
    } else {
      dispatch(updateBookmarks({ dataByDate: [], hideGroup: false, dateGroups: [], treeData: [] }));
      return [];
      // 处理错误情况
      // throw new Error('请求失败');
    }
  }
};


const fetchBookmarksPageData2 = (pageId: number) => {
  return async (dispatch) => {
    const res1 = await getPageTreeByDomain(pageId);
    const domainGroups = res1.treeData;//
    const list1 = res1.data;//书签数据
    const currentPage = await getPage(pageId);
    if (list1.length > 0) {
      dispatch(updateBookmarks({ dataByDomain: list1, domainGroups: domainGroups, currentPage: currentPage }));
      return res1; // 直接返回整个响应对象
    } else {
      dispatch(updateBookmarks({ dataByDomain: [], hideGroup: false, domainGroups: [], currentPage: currentPage, treeData: [] }));
      return [];
    }
  }
};


/* const fetchBookmarksPageData012 = (pageId: number) => {
  console.log('sssssssssssss fetchBookmarksPageData012 pageId', pageId);
  return async (dispatch) => {
    dispatch(updateGroupTypes({ toUpdateGroupTypes: [0, 1, 2] }));
  };
};
const fetchBookmarksPageData12 = (pageId: number) => {
  return async (dispatch) => {
    dispatch(updateGroupTypes({ toUpdateGroupTypes: [1, 2] }));
  };
}; */

const fetchBookmarksPageDatas = (types: number[]) => {
  console.log('sssssssssssss fetchBookmarksPageDatas types', types);
  return async (dispatch) => {
    dispatch(updateGroupTypes({ toUpdateGroupTypes: types }));
  };
};

const updatePageDataState = (pageData: any[]) => {
  return async (dispatch) => {
    const hideGroup: boolean = hasHidden(pageData || []);
    const treeData = filterChildrenArrayByPath(pageData || []);
    dispatch(updateBookmarks({ groups: pageData, hideGroup: hideGroup, treeData }));
  };
};

const updatePageBookmarkTags = (tagsUpdate: any[]) => {
  return async (dispatch) => {
    dispatch(updateTagsMap({ tagsUpdate: tagsUpdate }));
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

const loadSearchHistory = () => {
  return async (dispatch) => {
    const historyWords = await getSearchHistory();
    // console.log('🌀 loadSearchHistory historyWords=', historyWords);
    dispatch(setSearchHistory({ historyWords: historyWords }));
    return historyWords; // 直接返回整个响应对象
  }
};

// export const { updateSettings, updateUserInfo, updateHasResult, updateBookmarks } = globalSlice.actions;
//updateSearchHistory 
const { updateSettings, updateUserInfo, updateHasResult, updateGroupTypes, updateSearchState, updateTagsMap, updateBookmarks, setUserPages, setSearchHistory, updateActiveGroup, setLoadBookmarks } = globalSlice.actions;
export {
  updateSettings, updateUserInfo, updateHasResult, updateSearchState, updateBookmarks, updateActiveGroup,
  loadSearchHistory, updatePageBookmarkTags,
  updatePageDataState, reloadUserPages, fetchBookmarksPageData,
  fetchBookmarksPageData0, fetchBookmarksPageData1, fetchBookmarksPageData2, fetchBookmarksPageDatas,
  loadNewAddedBookmarks
};
export default globalSlice.reducer;
// export { dispatchTagGroupsData };
