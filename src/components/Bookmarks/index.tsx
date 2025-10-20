import React, { memo, useEffect, useState, useRef } from 'react';
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
import { getPages, deletePageBookmarks, exportAllPagesJson, getCollectPageGroups } from '@/db/bookmarksPages';
import { useFetchPageData } from '@/hooks/fetchPageData';
import { removeConfirm } from '@/pages/navigate/user/form/remove-confirm-modal';
import styles from './style/index.module.less';
import Imports from './import/index';
// import { set } from 'mobx';
// const dispatch = useDispatch();
// import { useDispatch } from 'react-redux';

function DropContent({ pages, currentPage, pagesChange, keepPopupVisible, activeKey }) {
  const switchPageId = useFetchPageData();
  const t = useLocale();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(activeKey);
  const [currentPageId, setCurrentPageId] = useState(currentPage);
  // const [addedPageId, setAddedPageId] = useState(null);
  const [addedPageIds, setAddedPageIds] = useState([]);

  // console.log("🌀 渲染 DropContent list pages=", pages);
  async function getCollectPageGroupData() {
    const res = await getCollectPageGroups();
    console.log("🌀 getCollectPageGroups ", res);
  }

  function pageSwitch(pageId: number) {
    // 立即更新UI，让按钮样式先生效
    setCurrentPageId(pageId);
    // 重置书签页数据，会导致content重新渲染
    switchPageId(pageId);
  }

  useEffect(() => {
    getCollectPageGroupData();
  }, []);


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


  async function handleImportSuccess(pageIds: number[]) {
    setAddedPageIds(pageIds);
    pagesChange(1, pageIds[0]); // 传递新的页面ID
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
              initialCurrentPageId={currentPageId}
              pageSwitch={pageSwitch}
              addedPageIds={addedPageIds}
              keepPopupVisible={keepPopupVisible}
              onItemClick={(item) => {
                pagesChange(0, true); // 点击时也保持弹窗打开
                // readMessage([item]);
              }}
              // onAllBtnClick={(unReadData) => {
              //   // readMessage(unReadData);
              // }}
              onRemovePage={handlePageRemove}
            />
            {/* <List1 /> */}
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
  // const BookmarkPageBox = memo(function BookmarkPageBox({ children, pages, currentPage }) {
  // 提供一个ref给DropContent
  const [popupVisible, setPopupVisible] = useState(false);
  const [currentPageId, setCurrentPageId] = useState(currentPage);

  const [data, setData] = useState<BookmarksPagesType>(pages);
  const forceOpenRef = useRef(false); // 使用 ref 来标记是否需要强制保持打开

  console.log("🌀 渲染 BookmarkPageBox，popupVisible =", popupVisible, currentPage);
  const [activeKey, setActiveKey] = useState<string>('pages');
  const [count, setCount] = useState<number>(0);

  function keepPopupVisible() {
    // console.log('33333333333 keepPopupVisible')
    forceOpenRef.current = true; // 设置标记
    setPopupVisible(true);
  }
  useEffect(() => {
  }, [popupVisible]);

  useEffect(() => {
    setCurrentPageId(currentPage);
  }, [currentPage]);

  useEffect(() => {
    setData(pages);
  }, [pages]);

  const handleVisibleChange = (visible) => {
    if (forceOpenRef.current && !visible) {
      // 如果标记为 true 且弹窗将要关闭，则阻止关闭
      forceOpenRef.current = false; // 重置标记
      return;
    }
    setPopupVisible(visible);
  };

  async function refreshBookmarksPage() {
    const newPages = await getPages();
    setData(newPages);
  }

  function onPagesChange(count?: number, newPageId?: number) {
    if (newPageId) {
      setCurrentPageId(newPageId);
    }
    refreshBookmarksPage();
    // 强制刷新 Tabs
    setActiveKey("");
    setPopupVisible(true);
    setTimeout(() => setActiveKey("pages"), 0);
    setCount(count || 0);
  }


  return (
    /*  <Trigger
       // trigger="hover"
       trigger={['hover', 'click', 'focus']}
       // popupHoverStay
       popupVisible={popupVisible}
       blurToHide={false}
       clickToClose={false} // 关键属性：点击弹层内容（包括Modal）不关闭
       onVisibleChange={handleVisibleChange}
       updateOnScroll={false}
       autoFixPosition={false}
       // defaultPopupVisible={true}
       // updateOnScroll={false}
       // mouseLeaveToClose={false}
       // popupVisible={true}
       // containerScrollToClose={false}
       // autoFitPosition
       // updateOnScroll={true} // 关键属性：在容器滚动时，更新弹出框的位置
       // popupStyle={{ position: 'fixed' }}
       // getPopupContainer={() => document.body}
       // style={{ position: 'fixed' }}
       // boundaryDistance={{ top: 100000 }}
       // autoFitPosition={true}
       // alignPoint={false}
 
       autoFitPosition={false}
       unmountOnExit={false} // 推荐设置为 false 避免状态丢失
       popup={() => <DropContent pages={data} currentPage={currentPageId} keepPopupVisible={keepPopupVisible} pagesChange={onPagesChange} activeKey={activeKey} />}
       position="br"
       // unmountOnExit={false}
       popupAlign={{ bottom: 4 }}
     >
       <Badge count={count} dot>
         {children}
       </Badge>
     </Trigger> */

    <Trigger
      // trigger="hover"
      trigger={['hover', 'click']}
      popupVisible={popupVisible}
      onVisibleChange={handleVisibleChange}
      autoFitPosition={false}
      popup={() => <DropContent pages={data} currentPage={currentPageId} keepPopupVisible={keepPopupVisible} pagesChange={onPagesChange} activeKey={activeKey} />}
      position="br"
      unmountOnExit={false}// 推荐设置为 false 避免状态丢失
      popupAlign={{ bottom: 4 }}
    >
      <Badge count={count} dot>
        {children}
      </Badge>
    </Trigger>
  );
};

// BookmarkPageBox.displayName = 'BookmarkPageBox';

// export default BookmarkPageBox;
export default memo(BookmarkPageBox);
