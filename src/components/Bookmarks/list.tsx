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
import { useFetchPageData } from '@/hooks/fetchPageData'; //
import { setDefaultPage, getPages, getPageTree, exportPageJson } from '@/db/bookmarksPages';
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
  currentPageId: number;
  addedPageIds: number[];
  onItemClick?: (item: BookmarksPageData, index: number) => void;
  onAllBtnClick?: (data: BookmarksPageData[]) => void;
  onRemovePage?: (item: BookmarksPageData, index: number) => void;
}

function BookmarksPages(props: BookmarksPageProps) {
  const t = useLocale();
  const { data, currentPageId, addedPageIds, onRemovePage } = props;

  const [currentPage, setCurrentPage] = useState(currentPageId);
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
    setCurrentPage(currentPageId);
  }, [currentPageId]);

  useEffect(() => {
    setNewPageIds(addedPageIds);
  }, [addedPageIds]);

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
  const switchPageId = useFetchPageData();

  /*  async function switchPageId(pageId: number) {
     // const res = await getGroupData(pageId);
     console.log("切换标签页 111 switchPageId pageId=", pageId);
     await dispatchTagGroupsData(pageId);
   } */

  async function exportPage(item: BookmarksPageData, index: number) {
    // 导出书签页
    const res = await exportPageJson(item.pageId);
    if (res && res.pages) {
      // 将 JSON 对象转换为格式化的字符串
      const jsonString = JSON.stringify(res, null, 2);
      // 创建一个 Blob 对象
      const blob = new Blob([jsonString], { type: 'application/json' });
      // 创建一个指向该 Blob 的 URL
      const url = URL.createObjectURL(blob);
      // 创建一个临时的 a 标签用于下载
      const a = document.createElement('a');
      a.href = url;
      a.download = `${res.pages[0].title}.json`; // 设置下载的文件名
      a.click(); // 触发下载
      // 释放 URL 对象
      URL.revokeObjectURL(url);
    }
  }

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



  function switchPage(item: BookmarksPageData, index: number) {
    setCurrentPage(item.pageId);
    // 示例
    // console.log(formatDate("1735123456789")); // 输出：2024-12-25
    // console.log("日期>>>>>>>>>>>>>>>>>>>>", formatDate("1735123456789")); // 输出：2024-12-25
    // console.log("日期>>>>>>>>>>>>>>>>>>>>", formatDate("1728665329000")); // 输出：2024-12-25

    /*  console.log("1735123456", formatTimestamp("1735123456"));    // "2024-12-25"（字符串秒级）
     if (formatTimestamp("1735123456")) {
       console.log(typeof formatTimestamp("1735123456"), true);
     }
 
     console.log(1735123456, formatTimestamp(1735123456));      // "2024-12-25"（数字秒级）
     if (formatTimestamp(1735123456)) {
       console.log(typeof formatTimestamp(1735123456), true);
     }
 
     console.log("1735123456789", formatTimestamp("1735123456789")); // "2024-12-25"（字符串毫秒级）
     if (formatTimestamp("1735123456789")) {
       console.log("1735123456789", true);
     }
 
     console.log(1735123456789, formatTimestamp(1735123456789));   // "2024-12-25"（数字毫秒级）
     if (formatTimestamp(1735123456789)) {
       console.log(1735123456789, true);
     }
 
     console.log("abc", formatTimestamp("abc"));           // ""
     if (formatTimestamp("abc")) {
       console.log("abc", true);
     }
     console.log("", formatTimestamp(""));           // ""
     if (formatTimestamp("")) {
       console.log("", true);
     }
 
     console.log(null, formatTimestamp(null));            // ""
     if (formatTimestamp(null)) {
       console.log(null, true);
     } */

    if (addedPageIds.length > 0 && isContained(item.pageId)) {
      //点击切换到刚添加的书签页，取消红点
      // setNewPageId(null);
      // newPageIds.remove(item.pageId);
      setNewPageIds(newPageIds.filter(id => id !== item.pageId));
    }
    if (currentPage !== item.pageId) {
      switchPageId(item.pageId);
    }
  }

  const isContained = (pageId: number) =>
    // console.log('isContained pageId=', pageId, ' newPageIds=', newPageIds);
    newPageIds.length > 0 && newPageIds.includes(pageId);
  ;

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

                      {/* <Badge count={item.pageId == newPageId ? 1 : 0} dot> */}
                      {/* <Badge count={isContained(item.pageId) ? 1 : 0} dot> */}
                      <Badge count={isContained(item.pageId) ? 1 : 0} dot>
                        <Button type={item.pageId == currentPage ? 'outline' : 'default'}
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
                    <Tag color="orange" onClick={e => { e.stopPropagation(); onRemovePage(item, index); }}>重命名</Tag>
                    {/* <Tag color="green" onClick={e => { e.stopPropagation(); exportPage(item, index); }}>导出</Tag> */}
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
    </>
  );


}

export default BookmarksPages;