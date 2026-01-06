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
import RenamePageForm from '@/pages/navigate/user/form/rename_page_form';
import { setDefaultPage, getPages, exportPageJson, getNodePath, testUpdate } from '@/db/bookmarksPages';
import ExportModal from './exportModal';
import { useHistory } from 'react-router-dom';
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
  new?: boolean;
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
  currentPageId: number;
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
  const { data, currentPageId, onRemovePage, onRenamePage } = props;

  const history = useHistory();

  const [currentPage, setCurrentPage] = useState(currentPageId);
  const [localPages, setLocalPages] = useState(props.data);
  // console.log('useEffect BookmarksPages addedPageIds', addedPageIds);
  // const [newPageIds, setNewPageIds] = useState<number[]>(() => addedPageIds || []);
  // 本地是否已修改过 newPageIds（用户交互后设为 true），如果为 true 则不再由 props 覆盖
  // console.log("BookmarksPages currentPageId=", currentPageId);

  function onItemClick(item: BookmarksPageData, index: number) {
    props.onItemClick && props.onItemClick(item, index);
  }

  useEffect(() => {
    setLocalPages(data);
    // console.log('useEffect setLocalPages', data);
  }, [data]);


  useEffect(() => {
    setCurrentPage(currentPageId);
    // console.log('useEffect currentPageId', currentPageId)
  }, [currentPageId]);

  useEffect(() => {
  }, [localPages]);


  async function handleSetDefaultPage(item: BookmarksPageData, index: number) {
    // 设置为默认书签页
    await setDefaultPage(item.pageId);
    // 局部刷新：直接获取最新数据并 setState
    const newPages = await getPages();
    // console.log('newPages', newPages);
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
    // const res = item.new;
    // return res;
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

  function switchPage(item: BookmarksPageData, index: number) {
    setCurrentPage(item.pageId);
    // onSwitchPage(item);
    // testUpdate();
    // const path = await getNodePath({ id: '3ve0wr3tn', pId: 'voqqcfkih' })
    /*
      const href = window.location.href;
     const lastIndex = href.lastIndexOf('/');
     if (lastIndex > -1) {//A.点击的是：3级和以下分组
       const last = href.substring(lastIndex + 1).trim();
       console.log("href last", last);
     } */
    //else {} //是首页
    console.log("---------->href", window.location.href);
    console.log("---------->href index", window.location.href.indexOf('/bookmarks') === -1);
    console.log("==============>history.replace('/bookmarks');");
    if (window.location.href.indexOf('/bookmarks') === -1) {
      console.log("---------->history.replace('/bookmarks');");
      history.replace('/bookmarks');
    }
    /*  if (isContained(item.pageId)) {
       // 点击切换到刚添加的书签页，取消红点：使用函数式更新以避免闭包取到过期状态
       setNewPageIds(prev => prev.filter(id => id !== item.pageId));
       // console.log("点击切换到刚添加的书签页，取消红点：使用函数式更新以避免闭包取到过期状态", addedPageIds.filter(id => id !== item.pageId));
     } */
    if (isNew(item)) {
      // setNewPageIds(prev => prev.filter(id => id !== item.pageId));
      const idx = localPages.findIndex(p => p.pageId === item.pageId);
      if (idx !== -1) {
        localPages[idx].new = false; // 就地修改
        setLocalPages([...localPages]); // 通过创建新数组引用来触发渲染
      }
    }
    if (currentPage !== item.pageId) {
      switchPageId(item.pageId);//切换显示数据
    }
  }


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
        {/* {data.map((item, index) => ( */}
        {localPages.map((item, index) => (
          <List.Item
            key={item.pageId}
            actionLayout="vertical"
            style={{
              // opacity: item.status ? 0.5 : 1,//0.5:半透明
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
                  <div className={styles['message-title']}>
                    <Space size={4}>
                      {/* <Badge count={isContained(item.pageId) ? 1 : 0} dot> */}
                      <Badge count={isNew(item) ? 1 : 0} dot>
                        <Button type={item.pageId === currentPage ? 'outline' : 'default'}
                          onClick={e => { e.stopPropagation(); switchPage(item, index); }}
                        >
                          {item.title}
                        </Button>
                      </Badge>

                      {/* <Typography.Text type="secondary">
                      {item.subTitle}
                    </Typography.Text> */}
                    </Space>
                    <Tag color="red" onClick={e => { e.stopPropagation(); onRemovePage(item, index); }}>删除</Tag>
                    <Tag color="orange" onClick={e => { e.stopPropagation(); onRenamePage(item, index); }}>重命名</Tag>
                    {/* <Tag color="orange" onClick={e => { e.stopPropagation(); handleRenamePage(item, index); }}>重命名</Tag> */}
                    <Tag color="green" onClick={e => { e.stopPropagation(); exportSelect(item, index); }}>导出</Tag>
                    {item.default ? (
                      // <Tag icon={<IconStar />} color='arcoblue'>默认</Tag>) :
                      <Tag color='arcoblue'>默认</Tag>) :
                      <Tag color='gray' onClick={e => { e.stopPropagation(); handleSetDefaultPage(item, index); }}>默认</Tag>
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