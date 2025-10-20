// useFetchTagGroups.ts

import { useDispatch } from 'react-redux';
import { fetchBookmarksPageData } from '@/store/modules/global'; // 确保路径正确

/**
 * 自定义 Hook：用于获取指定页面的标签分组数据
 * 封装了 useDispatch 和 fetchTagGroupsData 的调用
 * @returns {function(number): Promise<any>} 一个异步函数，接受 pageId 并触发 Redux Thunk
 */
export function useFetchPageData() {
  // 1. 在自定义 Hook 内部调用 useDispatch，这是合法的 Hook 调用位置
  const dispatch = useDispatch();

  /**
   * 触发获取分组数据的异步操作
   * @param pageId 要获取数据的页面ID
   */
  const switchPageId = async (pageId: number) => {
    console.log("使用 Hook 切换标签页 switchPageId pageId=", pageId);
    // 2. 派发 Thunk Action
    // dispatch 函数在这里被调用，并且传入了 fetchTagGroupsData(pageId) 返回的 Thunk 函数
    // fetchTagGroupsData 函数体内的 dispatch(updateTagGroups) 会被执行
    // 使用 await 是为了确保操作完成（如果 fetchTagGroupsData 返回的是 Promise）
    return await dispatch(fetchBookmarksPageData(pageId));
  };
  return switchPageId;
}