import React, { useEffect, useState } from 'react';

import {
  List,
  Button,
  Space,
  Result,
  Typography,
  Badge,
  Tag,
} from '@arco-design/web-react';
import useLocale from '@/utils/useLocale';
import styles from './style/index.module.less';
// 导入自定义 Hook
import { useFetchPageData } from '@/hooks/fetchPageData';
import { setDefaultPage, testUpdate, getPages, setCurrentPage } from '@/db/BookmarksPages';
import ExportModal from './exportModal';
import { useHistory } from 'react-router-dom';
// import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { useSelector, shallowEqual } from 'react-redux';

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
  bookmarksNum: number;
  new?: boolean;
  tag?: {
    text?: string;
    color?: string;
  };
}

export type MessageListType = MessageItemData[];
export type BookmarksPagesType = BookmarksPageData[];

interface BookmarksPageProps {
  data: BookmarksPageData[];
  // currentPageId: number;
  // addedPageIds: number[];
  onItemClick?: (item: BookmarksPageData, index: number) => void;
  onAllBtnClick?: (data: BookmarksPageData[]) => void;
  onRemovePage: (item: BookmarksPageData, index: number) => void;
  onRenamePage: (item: BookmarksPageData, index: number) => void;
  // onRenamePage: (pageId: number) => void;
  // onSwitchPage: (item: BookmarksPageData) => void;
}

function BookmarksPages(props: BookmarksPageProps) {
  const t = useLocale();
  const { data, onRemovePage, onRenamePage } = props;
  const history = useHistory();
  const [currentPageId, setCurrentPageId] = useState(null);
  const [localPages, setLocalPages] = useState(props.data);

  const {
    currentPage,
  } = useSelector(
    (state: RootState) => ({
      currentPage: state.global.currentPage,
    }),
    shallowEqual
  );


  // console.log('----------------------- BookmarksPages currentPageId', currentPageId);
  // const [newPageIds, setNewPageIds] = useState<number[]>(() => addedPageIds || []);
  // 本地是否已修改过 newPageIds（用户交互后设为 true），如果为 true 则不再由 props 覆盖

  function onItemClick(item: BookmarksPageData, index: number) {
    props.onItemClick && props.onItemClick(item, index);
  }
  useEffect(() => {
    if (currentPage) setCurrentPageId(currentPage.pageId);
    // console.log('useEffect setLocalPages', data);
  }, [currentPage]);

  useEffect(() => {
    setLocalPages(data);
  }, [data]);


  async function handleSetDefaultPage(item: BookmarksPageData, index: number) {
    // 设置为默认书签页
    await setDefaultPage(item.pageId);
    // 局部刷新：直接获取最新数据并 setState
    const newPages = await getPages();
    // console.log('newPages', newPages);
    // 假设有 localPages 作为本地状态
    setLocalPages(newPages);
  }

  async function handleSetCurrentPage(item: BookmarksPageData, index: number) {
    // 设置为当前书签页
    // console.log('222222222222222222 handleSetCurrentPage', item);
    await setCurrentPage(item.pageId);
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


  // 替换掉原来的 useDispatch() 和 switchPageId 函数定义
  // 💥 在组件顶层调用自定义 Hook


  /*  async function switchPageId(pageId: number) {
     // const res = await getGroupData(pageId);
     console.log("切换标签页 111 switchPageId pageId=", pageId);
     await dispatchTagGroupsData(pageId);
   } */
  const switchPageId = useFetchPageData();
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportPageItem, setExportPageItem] = useState<BookmarksPageData | null>(localPages?.length > 0 ? localPages[0] : null);
  function exportSelect(item: BookmarksPageData, index: number) {
    // 导出书签页-对话框：选择导出方式
    setExportModalVisible(true);
    setExportPageItem(item);
  }

  /*  function formatDate(timestampStr) {
     const date = new Date(Number(timestampStr)); // 转换为数字并生成Date对象
     const year = date.getFullYear();
     const month = String(date.getMonth() + 1).padStart(2, "0"); // 月份从0开始
     const day = String(date.getDate()).padStart(2, "0");
     return `${year}-${month}-${day}`;
   }
  */

  /*  const isContained1 = (pageId: number) => {
     newPageIds.length > 0 && newPageIds.includes(pageId);
   }
 
   function isContained(pageId: number) {
     const res = newPageIds.length > 0 && newPageIds.includes(pageId);
     return res;
   } */

  /*  useEffect(() => {
     // console.log('useEffect addedPageIds', addedPageIds)
     setNewPageIds(addedPageIds || []);
   }, [addedPageIds]); */

  function isNew(item: BookmarksPageData) {
    return item.new;
  }

  /*
   const [renameForm, setRenameForm] = useState(false);
   const [renamePage, setRenamePage] = useState(null);
 
   function handleRenamePage(item: BookmarksPageData, index: number) {
     setRenameForm(true);
     setRenamePage(item);
   } 
 
   async function closeRenameModal(success: boolean, item: any) {
     if (success) {
       onRenamePage(item.pageId);
     }
     setRenameForm(false);
   } */

  async function switchPage(item: BookmarksPageData, index: number) {

    let pathname = window.location.pathname;
    const pro = pathname.startsWith('/bookmarksPro');
    if (pro) {//github pages
      pathname = pathname.replace('/bookmarksPro', '');
    }
    // 在所有切换动作完成后再导航到书签页（如果当前不在书签页）
    if (pathname.indexOf('/bookmarks') == -1) {
      history.replace('/bookmarks');
    }

    setCurrentPageId(item.pageId);
    if (!currentPage || currentPage.pageId !== item.pageId) {
      // 立即更新本地状态，确保按钮样式瞬时响应
      // setCurrentPage(item.pageId);
      // console.log("---------->switchPage,currentPage 1111", currentPage, window.location.href);
      // 先派发页面数据加载，再持久化当前页标记
      await switchPageId(item.pageId);//切换显示数据
    }
    await handleSetCurrentPage(item, index);
    if (isNew(item)) {
      // setNewPageIds(prev => prev.filter(id => id !== item.pageId));
      const idx = localPages.findIndex(p => p.pageId === item.pageId);
      if (idx !== -1) {
        localPages[idx].new = false; // 就地修改
        setLocalPages([...localPages]); // 通过创建新数组引用来触发渲染
      }
    }
  }

  const [bookmarkPage, setBookmarkPage] = useState(window.location.pathname.replace('/bookmarksPro', '').indexOf('/bookmarks') !== -1);

  return (
    <>
      <List
        noDataElement={<Result status="404" subTitle={t['message.empty.tips']} />}
      /* footer={
        <div className={styles.footer}>
          <div className={styles['footer-item']}>
            <Button type="text" size="small" onClick={() => { }}>
              {t['message.allRead']}
            </Button>
          </div>
          <div className={styles['footer-item']}>
            <Button type="text" size="small">
              {t['message.seeMore']}
            </Button>
          </div>
        </div>
      } */
      >
        {localPages.map((item, index) => (
          <List.Item
            key={item.pageId}
            actionLayout="vertical"
            style={{
              // opacity: item.status ? 0.5 : 1,//0.5:半透明
              opacity: 1,
              padding: '11px 20px'
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
                  <div className={styles['message-title']}>
                    <Space size={4}>
                      {/* <Badge count={isContained(item.pageId) ? 1 : 0} dot> */}
                      <Badge count={isNew(item) ? 1 : 0} dot>
                        {/* <Button style={{ width: 175 }} type={bookmarkPage && item.pageId == currentPage.pageId ? 'outline' : 'default'} */}
                        <Button style={{ width: 175 }} type={bookmarkPage && item.pageId == currentPageId ? 'outline' : 'default'}
                          onClick={e => { e.stopPropagation(); switchPage(item, index); }}
                        >
                          {item.title}
                          {/* {currentPage} */}
                        </Button>
                        <Tag size='small' checkable checked={false} color='#ffffff' style={{ position: 'absolute', left: 190, top: 21, padding: 0 }} >
                          {item.bookmarksNum}
                        </Tag>
                      </Badge>

                      {/* <Typography.Text type="secondary">
                      {item.subTitle} right: -85,
                    </Typography.Text> */}
                    </Space>
                    <Tag color="red" style={{ marginTop: -5 }} onClick={e => { e.stopPropagation(); onRemovePage(item, index); }}>删除</Tag>
                    <Tag color="orange" style={{ marginTop: -5 }} onClick={e => { e.stopPropagation(); onRenamePage(item, index); }}>重命名</Tag>
                    <Tag color="green" style={{ marginTop: -5 }} onClick={e => { e.stopPropagation(); exportSelect(item, index); }}>导出</Tag>
                    {item.default ? (
                      // <Tag icon={<IconStar />} color='arcoblue'>默认</Tag>) :
                      <Tag color='arcoblue' style={{ marginTop: -5 }} >默认</Tag>) :
                      <Tag color='gray' style={{ marginTop: -5 }} onClick={e => { e.stopPropagation(); handleSetDefaultPage(item, index); }}>默认</Tag>
                    }

                  </div>
                }
              />
            </div>
          </List.Item>
        ))}
      </List>

      <ExportModal
        visible={exportModalVisible}
        // pageId={exportPageItem.pageId}
        // pageName={exportPageItem.title}
        page={exportPageItem}
        onClose={() => setExportModalVisible(false)}
      />

      {/* <RenamePageForm bookmarkPage={renamePage} visible={renameForm} closeWithSuccess={closeRenameModal}></RenamePageForm> */}
    </>
  );


}

export default BookmarksPages;