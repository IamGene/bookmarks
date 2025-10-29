import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import groupBy from 'lodash/groupBy';
import {
  Trigger,
  Badge,
  Tabs,
  Message,
  Avatar,
  Spin,
  Button,
} from '@arco-design/web-react';
import {
  IconMessage,
  IconCustomerService,
  IconFile,
  IconDownload,
  IconUpload,
  IconDesktop,
} from '@arco-design/web-react/icon';
import useLocale from '../../utils/useLocale';
import BookmarkPages, { BookmarksPagesType, MessageListType, BookmarksPageData } from './list';
import { getPages, deletePageBookmarks, exportAllPagesJson } from '@/db/bookmarksPages';
import { useFetchPageData } from '@/hooks/fetchPageData';
import { removeConfirm } from '@/pages/navigate/user/form/remove-confirm-modal';
import styles from './style/index.module.less';
import Imports from './import/index';
import { set } from 'mobx';
import { useDispatch } from 'react-redux';

function DropContent({ pages, currentPage, pagesChange, keepPopupVisible, activeKey }) {

  const t = useLocale();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(activeKey);
  const [currentPageId, setCurrentPageId] = useState(currentPage);
  // const [addedPageId, setAddedPageId] = useState(null);
  const [addedPageIds, setAddedPageIds] = useState([]);

  console.log("🌀 渲染 DropContent list pages=", pages);
  const [groupData, setGroupData] = useState<{
    [key: string]: MessageListType;
  }>({});

  useEffect(() => {
    if (activeKey) {
      // console.log("🔁 父组件触发 activeKey 变化:", activeKey);
      setActiveTab(activeKey);
    }
  }, [activeKey]);


  async function handlePageRemove(item, index) {
    try {
      // 弹出确认框
      const confirmed = await removeConfirm(
        item.pageId,
        item.title,
        '点击确定将删除该书签页及其所有书签',
        '书签页',
        deletePageBookmarks
      );
      // 用户点击了“确定”并删除成功
      if (confirmed) {
        // console.log('✅ 用户确认删除，刷新书签页列表');
        pagesChange(0); // 删除成功后刷新列表
      } else {
        console.log('❎ 用户取消或删除失败');
        //让父组件恢复因为弹窗而导致收起的展开状态
        // keepPopupVisible();
      }
    } catch (e) {
      Message.error('删除失败，请重试');
    }
  }


  /*   useEffect(() => {
    }, [addedPageId]); */


  /*  async function switchPageId(pageId: number) {
     // const res = await getGroupData(pageId);
     console.log("切换标签页 111 switchPageId pageId=", pageId);
     await dispatchTagGroupsData(pageId);
   } */


  const switchPageId = useFetchPageData();
  async function handleImportSuccess(pageIds: number[]) {
    setCurrentPageId(pageIds[0]);
    setAddedPageIds(pageIds);
    pagesChange(1);
    switchPageId(pageIds[0]);
  }


  async function exportAll() {
    const res = await exportAllPagesJson();
    if (res && res.pages && res.pages.length > 0) {
      // 将 JSON 对象转换为格式化的字符串
      const jsonString = JSON.stringify(res, null, 2);
      // 创建一个 Blob 对象
      const blob = new Blob([jsonString], { type: 'application/json' });
      // 创建一个指向该 Blob 的 URL
      const url = URL.createObjectURL(blob);
      // 创建一个临时的 a 标签用于下载
      const a = document.createElement('a');
      a.href = url;

      // a.download = `bookmarks_all.json`; // 设置下载的文件名
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
      const timeStr = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      a.download = `bookmarks_all_${dateStr}_${timeStr}.json`; // 设置下载的文件名
      a.click(); // 触发下载
      // 释放 URL 对象
      URL.revokeObjectURL(url);
    }
  }



  function readMessage(data: BookmarksPagesType) {
    const ids = data.map((item) => item.pageId);
    axios
      .post('/api/message/read', {
        ids,
      })
      .then(() => {
        fetchSourceData();
      });
  }

  function onClickTab(key: string) {
    setActiveTab(key);
  }

  const pageTab =
  {
    key: 'pages',
    title: t['bookmark.pages'],
    titleIcon: <IconFile style={{ marginRight: 6 }} />
    /* avatar: (
      <Avatar style={{ backgroundColor: '#0FC6C2' }}>
        <IconDesktop />
      </Avatar>
    ), */
  };
  const importTab =
  {
    key: 'imports',
    // title: t['bookmark.pages'],
    title: '导入书签',
    titleIcon: <IconUpload style={{ marginRight: 6 }} />
  };


  return (
    <div className={styles['message-box']}>
      <Spin loading={loading} style={{ display: 'block' }}>
        <Tabs
          overflow="dropdown"
          type="rounded"
          onClickTab={onClickTab}
          activeTab={activeTab}
          defaultActiveTab="pages"
          destroyOnHide
          // headerPadding={false}
          /*  extra={
             <Button icon={<IconUpload />} type="text" onClick={() => importBookMarks()}>
               {t['bookmarks.import']}
             </Button>
           } */
          extra={
            pages.length > 0 &&
            <Button type="text" icon={<IconDownload />} onClick={() => exportAll()}>
              {/* {t['message.empty']} */}
              {'导出全部'}
            </Button>
          }

        >
          <Tabs.TabPane
            key={pageTab.key}

            title={
              <span>
                {pageTab.titleIcon}
                {pageTab.title}
                {pages.length ? `(${pages.length})` : ''}
                {/* {`(${sourceData.length})`} */}
              </span>
            }
          >
            <BookmarkPages
              data={pages}
              currentPageId={currentPageId}
              addedPageIds={addedPageIds}
              onItemClick={(item) => {
                // readMessage([item]);
              }}
              onAllBtnClick={(unReadData) => {
                // readMessage(unReadData);
              }}
              onRemovePage={handlePageRemove}
            />

          </Tabs.TabPane>


          <Tabs.TabPane
            key={importTab.key}
            title={
              <span>
                {importTab.titleIcon}
                {importTab.title}
              </span>
            }
          >
            <Imports
              data={pages}
              onImportSuccess={handleImportSuccess}
              onItemClick={(item) => {
                // readMessage([item]);
              }}
              onAllBtnClick={(unReadData) => {
                // readMessage(unReadData);
              }}
            />
          </Tabs.TabPane>
        </Tabs>
      </Spin>
    </div>
  );
}


function BookmarkPageBox({ children, pages, currentPage }) {
  // 提供一个ref给DropContent
  const [popupVisible, setPopupVisible] = React.useState(false);


  const [data, setData] = useState<BookmarksPagesType>(pages);

  console.log("🌀 渲染 BookmarkPageBox，popupVisible =", data, currentPage);
  const [activeKey, setActiveKey] = useState<string>('pages');
  const [count, setCount] = useState<number>(0);

  function keepPopupVisible() {
    setPopupVisible(true);
  }

  useEffect(() => {
    setData(pages);
  }, [pages]);

  async function refreshBookmarksPage() {
    const newPages = await getPages();
    // console.log('onPagesChange 222222222 newPages', newPages);
    setData(newPages);
  }

  function onPagesChange(count?: number, callback?: () => void) {
    // 简化逻辑，只负责刷新数据和UI
    refreshBookmarksPage();
    // 强制刷新 Tabs
    setActiveKey("");
    setPopupVisible(true);
    setTimeout(() => setActiveKey("pages"), 0);
    setCount(count || 0);
  }


  return (
    <Trigger
      // trigger="hover"
      trigger={['hover', 'click']}
      popupHoverStay // 关键属性：鼠标在弹层中时，保持打开
      clickToClose={false} // 关键属性：点击弹层内容（包括Modal）不关闭
      popupVisible={popupVisible}
      onVisibleChange={setPopupVisible}
      popup={() => <DropContent pages={data} currentPage={currentPage} keepPopupVisible={keepPopupVisible} pagesChange={onPagesChange} activeKey={activeKey} />}
      position="br"
      unmountOnExit={false}
      popupAlign={{ bottom: 4 }}
    >
      <Badge count={count} dot>
        {children}
      </Badge>
    </Trigger>
  );
}


export default BookmarkPageBox;
