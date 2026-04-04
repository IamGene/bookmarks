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
import { getPageTree, getPageTreeByDate, getPages, getPageTreeGroupsData, getPageTreeByDomain, getPage, getSearchHistory } from "@/db/BookmarksPages";
import { WebTag } from '@/pages/navigate/user/interface';
import { set } from 'mobx';
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
  defaultPage: number;
  pages: [];
  // tagsMap: { [key: string]: string[] } | null;
  tags: {
    tagsMap: { [key: string]: string[] } | null,
    selectedTags: any[]
  },
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
  defaultPage: null,
  currentPage: null,
  pageId: null,
  // tagsMap: null,
  tags: {
    tagsMap: null,
    selectedTags: []
  },
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
      if (action.payload.searchResultNum != null) {
        // console.log('---------------', state.search.searchResultNum, action.payload.searchResultNum);
        state.search.searchResultNum = state.search.searchResultNum + action.payload.searchResultNum;
      }
      if (action.payload.resetSearchResultNum) {
        state.search.searchResultNum = 0;
      }
    },
    setSearchHistory: (state, action) => {
      state.search.searchHistory = action.payload.historyWords;
    },
    switchTagSelected: (state, action) => {
      const tag = action.payload.switchTag;
      // console.log('55555555555555555 switchTagSelected action.payload.selectedTags', tag);
      if (tag.selected) {
        state.tags.selectedTags.push(tag);
      } else {
        state.tags.selectedTags = state.tags.selectedTags.filter(t => t.key !== tag.key);
      }
    },

    updatePageGroupList: (state, action) => {
      const params = action.payload?.params || {};
      const dataType = params.dataType;


      if (dataType === 1) {//按时间
        const groupId = params.groupId;
        const idStr = String(groupId);
        if (dataType == null || groupId == null) return;
        // 期望 groupId 为 yyyy-MM 格式（例如 2024-04），取出年份并在 state.dateGroups 中操作
        if (!Array.isArray(state.dateGroups)) return;
        const monthRegex = /^\d{4}-\d{2}$/;
        if (!monthRegex.test(idStr)) return;
        const year = idStr.slice(0, 4);

        const yearIndex = state.dateGroups.findIndex(item => String(item?.id) === year);
        if (yearIndex === -1) return;
        const yearNode = state.dateGroups[yearIndex];
        if (!yearNode || !Array.isArray(yearNode.children)) return;
        // 从 yearNode.children 中移除 id === groupId 的子元素

        const remainingChildren = yearNode.children.filter(child => String(child?.id) !== idStr);
        if (remainingChildren.length === 0) {
          // 如果没有子元素了，移除整个年份节点
          state.dateGroups.splice(yearIndex, 1);
        } else {
          // 否则更新该年份节点的 children
          state.dateGroups[yearIndex] = { ...yearNode, children: remainingChildren } as any;
        }
      } else if (dataType === 2) {
        // groupId 可能为 "p0" 或 "p0,p1" 两种形式
        if (!Array.isArray(state.domainGroups)) return;
        // const parts = idStr.split(',').map(s => s.trim()).filter(s => s !== '');
        // if (parts.length === 0) return;
        const pId = params.pId;
        const groupId = params.groupId;

        if (!groupId) {//无子节点，直接删除父节点
          const idx = state.domainGroups.findIndex(item => String(item?.id) === pId);
          if (idx !== -1) state.domainGroups.splice(idx, 1);
        } else {
          // parts.length >= 2, 只取前两个 p0,p1
          const parentIndex = state.domainGroups.findIndex(item => String(item?.id) === pId);
          if (parentIndex === -1) return;
          const parent = state.domainGroups[parentIndex];
          if (!parent || !Array.isArray(parent.children)) return;

          const remaining = parent.children.filter(child => String(child?.id) !== groupId);
          if (remaining.length === 0) {
            // 若子节点为空，则移除父节点
            state.domainGroups.splice(parentIndex, 1);
          } else {
            // 否则更新父节点的 children
            state.domainGroups[parentIndex] = { ...parent, children: remaining } as any;
          }
        }
      }
    },
    updateBookmarks: (state, action) => {
      if (action.payload.dataGroups) state.dataGroups = action.payload.dataGroups;
      if (action.payload.dataByDate) state.dataByDate = action.payload.dataByDate;
      if (action.payload.dataByDomain) state.dataByDomain = action.payload.dataByDomain;
      if (action.payload.dataByGroup) state.dataByGroup = action.payload.dataByGroup;
      if (action.payload.dateGroups) state.dateGroups = action.payload.dateGroups;
      if (action.payload.domainGroups) state.domainGroups = action.payload.domainGroups;
      if (action.payload.currentPage) state.currentPage = action.payload.currentPage;
      if (action.payload.tagsMap) state.tags.tagsMap = action.payload.tagsMap;
      // console.log('xxxxxxxxxxxxxxxxxxx updateBookmarks', action.payload.tagsMap);
      if (action.payload.clearSearchResultNum || action.payload.clearSearchResultNum === undefined)//
        state.search.searchResultNum = 0;//每次更新书签数据，重置搜索结果数 仅更新分组数据的时候除外
      if (action.payload.updateSelectedTags || action.payload.updateSelectedTags === undefined)//
        state.tags.selectedTags = [];
      if (action.payload.expandedKeys) state.expandedKeys = action.payload.expandedKeys;
      if (action.payload.updatedGroupType != null) {
        if (state.toUpdateGroupTypes.includes(action.payload.updatedGroupType)) {
          const idx = state.toUpdateGroupTypes.indexOf(action.payload.updatedGroupType);
          state.toUpdateGroupTypes.splice(idx, 1);
        }
      }
    },

    updateBookmarksGroups: (state, action) => {
      if (action.payload.dataGroups) state.dataGroups = action.payload.dataGroups;
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

    updateTagsMap: (state, action) => {//更新所有书签列表
      // tagsMap now stores arrays of ids: { [tag:string]: string[] }
      const tagsUpdate = action.payload.tagsUpdate || [];

      if (!state.tags.tagsMap) state.tags.tagsMap = {} as any;

      for (const item of tagsUpdate) {
        if (!item || !item.tag) continue;
        const tagKey = String(item.tag).trim();
        if (!tagKey) continue;
        const add = !!item.add;
        const id = item.id != null ? String(item.id) : null;

        const currentArr: string[] = Array.isArray(state.tags.tagsMap[tagKey]) ? [...state.tags.tagsMap[tagKey]] : [];

        if (add) {//增加
          if (id) {
            if (!currentArr.includes(id)) currentArr.push(id);
            state.tags.tagsMap[tagKey] = currentArr;
          } else {
            if (!state.tags.tagsMap[tagKey]) state.tags.tagsMap[tagKey] = [];
          }
        } else {//删除
          if (id) {
            const filtered = currentArr.filter(x => x !== id);

            console.log('sssssssssssssssssssssssss updateTagsMap nextSelectedTags', filtered);
            if (filtered.length === 0) {
              delete state.tags.tagsMap[tagKey];
              const selectedTags = state.tags.selectedTags;
              const nextSelectedTags = selectedTags.filter(t => t.key !== tagKey);
              // console.log('sssssssssssssssssssssssss updateTagsMap delete tagKey nextSelectedTags', nextSelectedTags);
              state.tags.selectedTags = nextSelectedTags;
            }
            else state.tags.tagsMap[tagKey] = filtered;
          } else {
            // no id: remove the whole tag entry
            delete state.tags.tagsMap[tagKey];
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

    updateUserPage: (state, action) => {
      const updateInfo = action.payload.updateInfo;
      const updatePage = action.payload.updatePage;

      if (Array.isArray(state.pages)) {
        if (updateInfo) {
          state.pages = state.pages.map((page: any) => {
            if (page?.pageId === updateInfo?.pageId) {
              return {
                ...page,
                bookmarksNum: (page.bookmarksNum || 0) + (updateInfo?.addNum || 0),
              };
            }
            return page;
          }) as any;
        }
      }

      if (updatePage) {
        // console.log('xxxxxxxxxxxxxxxxx updatePage', updatePage);
        state.pages = state.pages.map((page: any) => {
          if (page?.pageId === updatePage?.pageId) {
            return {
              ...page,
              bookmarksNum: updatePage?.bookmarksNum
            };
          }
          return page;
        }) as any;
      }
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
    // .filter(child => child.id !== data.id)//过滤掉复制分组
    .filter(child => !child.id.endsWith('_copy'))//过滤掉复制分组
    .map(child => filterChildrenByPath(child));
  return newData;
}

const fetchBookmarksPageData = (pageId: number) => {
  return async (dispatch) => {
    const res = await getPageTree(pageId);
    // const resss = await testData(pageId);
    console.log('--------------------fetchBookmarksPageData res', res);

    const expandedKeys = res.expandedKeys || [];

    // console.log('--------------------fetchBookmarksPageData res', res);
    const data = res.data;
    const bookmarksNum = res.bookmarksNum;
    let tagsMap = res.tagsMap;
    // 如果后端/DB 返回的是 Map，转换为普通对象以保证 state 可序列化
    if (tagsMap instanceof Map) {
      tagsMap = Object.fromEntries(tagsMap);
    }

    const res1 = await getPageTreeByDate(pageId);
    const dateGroups = res1.treeData;//
    const list1 = res1.data;//书签数据

    const res2 = await getPageTreeByDomain(pageId);
    // const domainGroups = res2.treeData.slice(0, 10);//
    const domainGroups = res2.treeData;//
    const list2 = res2.data;//书签数据

    // const currentPage = await getPage(pageId);
    const currentPage = res.page;

    dispatch(updateUserPage({ updatePage: { pageId, bookmarksNum } }));

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


/* const updatePageSelectedTags = (selectedTags: any[]) => {
  return (dispatch) => {
    dispatch(setSelectedTags({ selectedTags: selectedTags }));
  }
}; */

const oneTagSelectedSwitch = (tag: any) => {
  return (dispatch) => {
    dispatch(switchTagSelected({ switchTag: tag }));
  }
};


//更新按默认分组数据
const fetchBookmarksPageData0 = (pageId: number) => {
  return async (dispatch) => {
    const res = await getPageTree(pageId);
    console.log('--------------------fetchBookmarksPageData0 res', res);
    const data = res.data;
    const bookmarksNum = res.bookmarksNum;
    dispatch(updateUserPage({ updatePage: { pageId, bookmarksNum } }));
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
        updateSelectedTags: false,
        // currentPage: currentPage
      }));
      return res.data; // 直接返回整个响应对象
    } else {
      await dispatch(updateBookmarks({ dataByGroup: [], dataGroups: [], hideGroup: false, tagsMap: [], treeData: null }));
      // await dispatch(updateGroupTypes({ updatedGroupType: 0 }));
      // dispatch(updateBookmarks({ dataByGroup: [], dataByDate: [], hideGroup: false, dateGroups: [], tagsMap: tagsMap, currentPage: currentPage, treeData: [] }));
      return [];
      // 处理错误情况
      // throw new Error('请求失败');
    }
  }
};

//仅更新默认方式分组
const fetchBookmarksPageDataGoups = (pageId: number) => {
  return async (dispatch) => {
    const data = await getPageTreeGroupsData(pageId);
    // console.log('--------------------fetchBookmarksPageDataGoups res', data);
    if (data.length > 0) {
      // const treeData = filterChildrenArrayByPath(data);
      dispatch(updateBookmarks({
        dataGroups: data,
        updatedGroupType: 0,
        updateSelectedTags: false,//不更新标签选中状态
        clearSearchResultNum: false
      }));
      return data; // 直接返回整个响应对象
    } else {
      await dispatch(updateBookmarks({ dataByGroup: [], dataGroups: [], hideGroup: false, tagsMap: [], treeData: null }));
      return [];
      // 处理错误情况
      // throw new Error('请求失败');
    }
  }
};

const updatePageGroupsDataByType = (params) => {
  return async (dispatch) => {
    // const data = await getPageTreeGroupsData(pageId);
    console.log('--------------------updatePageGroupsDataByType', params);
    // const treeData = filterChildrenArrayByPath(data);
    dispatch(updatePageGroupList({
      params: params
    }));
    return true; //
  }
};


const fetchBookmarksPageData1 = (pageId: number) => {
  return async (dispatch) => {
    const res1 = await getPageTreeByDate(pageId);
    const dateGroups = res1.treeData;//
    // console.log('999999999999 fetchBookmarksPageData1 treeData', res1);
    const bookmarksNum = res1.bookmarksNum;
    dispatch(updateUserPage({ updatePage: { pageId, bookmarksNum } }));

    const list1 = res1.data;//书签数据
    if (list1.length > 0) {
      await dispatch(updateBookmarks({ dataByDate: list1, dateGroups: dateGroups, updatedGroupType: 1 }));
      // await dispatch(updateGroupTypes({  }));
      return res1.data; // 直接返回整个响应对象
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

    const bookmarksNum = res1.bookmarksNum;
    dispatch(updateUserPage({ updatePage: { pageId, bookmarksNum } }));
    if (list1.length > 0) {
      dispatch(updateBookmarks({ dataByDomain: list1, domainGroups: domainGroups, currentPage: currentPage }));
      return res1.data; // 直接返回整个响应对象
    } else {
      dispatch(updateBookmarks({ dataByDomain: [], hideGroup: false, domainGroups: [], currentPage: currentPage, treeData: [] }));
      return [];
    }
  }
};

//哪种分组方式的书签页列表数据待更新
const fetchBookmarksPageDatas = (types: number[]) => {
  // console.log('sssssssssssss fetchBookmarksPageDatas types', types);
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
  // console.log('11111111111111111 updatePageBookmarkTags');
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

const updateBookmarksPage = (info: any) => {
  return async (dispatch) => {
    dispatch(updateUserPage({ updateInfo: info }));
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
const { updateSettings, updateUserInfo, updateHasResult, switchTagSelected,
  updateGroupTypes, updateSearchState, updatePageGroupList,
  updateUserPage, updateTagsMap, updateBookmarks, setUserPages,
  setSearchHistory,
  updateActiveGroup, setLoadBookmarks } = globalSlice.actions;
export {
  updateSettings, updateUserInfo, updateHasResult, updateSearchState, updateBookmarks, updateActiveGroup,
  loadSearchHistory, updatePageBookmarkTags, oneTagSelectedSwitch,
  updatePageDataState, reloadUserPages, fetchBookmarksPageData,
  fetchBookmarksPageData0, fetchBookmarksPageData1, fetchBookmarksPageData2, updateBookmarksPage, fetchBookmarksPageDatas, fetchBookmarksPageDataGoups,
  loadNewAddedBookmarks, updatePageGroupsDataByType
};
export default globalSlice.reducer;
// export { dispatchTagGroupsData }; updatePageSelectedTags
