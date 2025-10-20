import React, { memo, useEffect, useState } from 'react';

import {
  List,
  Button,
  Space,
  Result,
  Typography,
  Badge,
  Tag,
  Message,
} from '@arco-design/web-react';
import useLocale from '@/utils/useLocale';
import styles from './style/index.module.less';
// 导入自定义 Hook
import { useFetchPageData } from '@/hooks/fetchPageData';
import { setDefaultPage, getPages, getCollectPageGroups } from '@/db/bookmarksPages';

import ExportModal from './exportModal';
// import { useSelector, useDispatch } from 'react-redux';

export interface MessageItemData {
  id: string;
  title: string;
  subTitle?: string;
  avatar?: string;
  content: string;
  time?: string;
  status: number;
  tag?: {
    text?: string;
    color?: string;
  };
}

export interface BookmarksPageData {
  pageId: number;
  title: string;
  default: boolean
  createAt: number;
  updateAt: number;
  tag?: {
    text?: string;
    color?: string;
  };
}

export type MessageListType = MessageItemData[];
export type BookmarksPagesType = BookmarksPageData[];

interface MessageListProps {
  data: MessageItemData[];
  unReadData: MessageItemData[];
  onItemClick?: (item: MessageItemData, index: number) => void;
  onAllBtnClick?: (
    unReadData: MessageItemData[],
    data: MessageItemData[]
  ) => void;
}

interface BookmarksPageProps {
  data: BookmarksPageData[];
  initialCurrentPageId: number; // 重命名 prop，表示仅用于初始值
  addedPageIds: number[];
  pageSwitch: (pageId: number) => void; keepPopupVisible?: () => void;
  // switchPageIdpageId: number) => void;
  onItemClick?: (item: BookmarksPageData, index: number) => void;
  onAllBtnClick?: (data: BookmarksPageData[]) => void;
  onRemovePage?: (item: BookmarksPageData, index: number) => void;
}

function BookmarksPages(props: BookmarksPageProps) {
  const t = useLocale();
  const { data, initialCurrentPageId, addedPageIds, pageSwitch, onRemovePage, keepPopupVisible } = props;

  const [currentPage, setCurrentPage] = useState(initialCurrentPageId);
  const [localPages, setLocalPages] = useState(props.data);
  // const [newPageId, setNewPageId] = useState(addedPageId);
  const [newPageIds, setNewPageIds] = useState(addedPageIds);

  function onItemClick(item: BookmarksPageData, index: number) {
    props.onItemClick && props.onItemClick(item, index);
  }
  // console.log('1111111111 localPages', localPages, props.data);

  useEffect(() => {
    setLocalPages(data);
  }, [data]);


  useEffect(() => {
    // 仅在组件首次加载时设置 currentPage
    // 使用 initialCurrentPageId 作为初始值，之后不再受父组件影响
    setCurrentPage(initialCurrentPageId);
  }, [initialCurrentPageId]); // 依赖项确保只在初始ID变化时（通常只有一次）执行

  useEffect(() => {
    setNewPageIds(addedPageIds);
  }, [addedPageIds]);

  async function handleSetDefaultPage(item: BookmarksPageData, index: number) {
    // 设置为默认书签页
    await setDefaultPage(item.pageId);
    // 局部刷新：直接获取最新数据并 setState
    const newPages = await getPages();
    // 假设有 localPages 作为本地状态
    setLocalPages(newPages);
  }

  /*  async function removePage(item: BookmarksPageData, index: number) {
     // 删除书签页
     await deletePageBookmarks(item.pageId);
     // 局部刷新：直接获取最新数据并 setState
     const newPages = await getPages();
     // console.log('newPages', newPages);
     // 假设有 localPages 作为本地状态
     setLocalPages(newPages);
   } */

  /*   async function getGroupData(pageId: number) {
      try {
        const data: any = await dispatch(fetchTagGroupsData(pageId));
        return data;
      } catch (error) {
        return false;
      }
    } */

  //切换标签页
  /*   const switchPageId = async (pageId: number) => {
      const res = await dispatchTagGroupsData(pageId);
    } */

  // 替换掉原来的 useDispatch() 和 switchPageId 函数定义
  // 💥 在组件顶层调用自定义 Hook
  const switchPageId = useFetchPageData();

  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportPageItem, setExportPageItem] = useState<BookmarksPageData | null>(localPages?.length > 0 ? localPages[0] : null);
  function exportSelect(item: BookmarksPageData, index: number) {
    // 导出书签页-对话框：选择导出方式
    setExportModalVisible(true);
    setExportPageItem(item);
  }

  function switchPage(item: BookmarksPageData, index: number) {
    if (currentPage === item.pageId) {
      return; // 如果点击的是当前页，则不执行任何操作
    }
    // window.scrollTo(0, 0);
    // keepPopupVisible();

    // const collectPageGroups = await getCollectPageGroups();
    // console.log('collectPageGroups', collectPageGroups);

    pageSwitch(item.pageId);
    if (addedPageIds.length > 0 && isContained(item.pageId)) {
      //点击切换到刚添加的书签页，取消红点
      setNewPageIds(newPageIds.filter(id => id !== item.pageId));
    }
    // 立即更新UI，让按钮样式先生效
    keepPopupVisible();
  }

  const isContained = (pageId: number) =>
    newPageIds.length > 0 && newPageIds.includes(pageId);
  ;

  return (
    <>
      <List
        noDataElement={<Result status="404" subTitle={t['message.empty.tips']} />}
      >
        {localPages?.map((item, index) => (
          <List.Item
            key={item.pageId}
            actionLayout="vertical"
            style={{
              opacity: 1,
            }}
          >
            <div
              style={{
                cursor: 'pointer',
              }}
              onClick={() => {
                onItemClick(item, index);
              }}
            >
              <List.Item.Meta
                title={
                  <div>
                    <Space size={6}>
                      <Badge count={isContained(item.pageId) ? 1 : 0} dot>
                        <Button type={item.pageId == currentPage ? 'outline' : 'default'}
                          onClick={e => { e.stopPropagation(); switchPage(item, index); }}
                        >
                          {item.title}
                        </Button>
                      </Badge>
                      <Tag color="red" onClick={e => { e.stopPropagation(); onRemovePage(item, index); }}>删除</Tag>
                      <Tag color="orange" onClick={e => { e.stopPropagation(); onRemovePage(item, index); }}>重命名</Tag>

                      <Tag color="green" onClick={e => { e.stopPropagation(); exportSelect(item, index); }}>导出</Tag>


                      {item.default ? (<Tag color='arcoblue'>默认</Tag>) : (<Tag color='gray' onClick={e => { e.stopPropagation(); handleSetDefaultPage(item, index); }}>默认</Tag>)
                      }
                    </Space>

                  </div>
                }
              />
            </div>
          </List.Item>
        ))
        }
      </List >

      <ExportModal
        visible={exportModalVisible}
        // pageId={exportPageItem.pageId}
        // pageName={exportPageItem.title}
        page={exportPageItem}
        onClose={() => setExportModalVisible(false)}
      />
    </>
  );
}

export default BookmarksPages;