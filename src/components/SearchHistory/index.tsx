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
  IconFile,
  IconHistory,
} from '@arco-design/web-react/icon';
import useLocale from '../../utils/useLocale';
import History, { BookmarksPagesType, MessageListType, BookmarksPageData } from './list';
// import RenamePageForm from '@compo';
// import { set } from 'mobx';
import { deletePageBookmarks } from '@/db/bookmarksPages';
import { useFetchPageData } from '@/hooks/fetchPageData';
import { removeConfirm } from '@/pages/navigate/user/form/remove-confirm-modal';
import styles from './style/index.module.less';
import { useDispatch } from 'react-redux';
function DropContent({ searchKeyword, onHistoryClick, activeKey, onHistoryEmpty }) {

  const t = useLocale();
  // const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(activeKey);
  const [clearSignal, setClearSignal] = useState(0);
  // const [addedPageIds, setAddedPageIds] = useState(newBookmarkPages);
  // console.log("🌀 渲染 DropContent list searchKeyword", searchKeyword);

  /*   useEffect(() => {
      if (activeKey) {
        // console.log("🔁 父组件触发 activeKey 变化:", activeKey);
        setActiveTab(activeKey);
      }
    }, [activeKey]); */


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
        // pagesChange(0, item.pageId); // 删除成功后刷新列表
      } else {
        console.log('❎ 用户取消或删除失败');
        //让父组件恢复因为弹窗而导致收起的展开状态
        // keepPopupVisible();
      }
    } catch (e) {
      Message.error('删除失败，请重试');
    }
  }


  /*  async function switchPageId(pageId: number) {
     // const res = await getGroupData(pageId);
     console.log("切换标签页 111 switchPageId pageId=", pageId);
     await dispatchTagGroupsData(pageId);
   } */


  function clearAll() {
    // 触发子组件清空搜索历史（通过信号递增）
    setClearSignal(s => s + 1);
  }


  function onClikHistory(data: any) {
    // onClikHistory(data);
    // console.log('点击搜索历史记录项：', data);
  }

  function onClickTab(key: string) {
    setActiveTab(key);
  }

  const pageTab =
  {
    key: 'pages',
    title: t['search.history'],
    titleIcon: <IconHistory style={{ marginRight: 6 }} />
    /* avatar: (
      <Avatar style={{ backgroundColor: '#0FC6C2' }}>
        <IconDesktop />
      </Avatar>
    ), */
  };
  /* const addTab =
  {
    key: 'add',
    title: '新建书签',
    titleIcon: <IconUpload style={{ marginRight: 6 }} />
  }; */

  return (
    <div className={styles['history-box']}>

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
            // words && words.length > 0 &&
            <Button type='text' onClick={() => clearAll()}>
              {/* icon={<IconDownload />} */}
              {'清空'}
            </Button>
          }

        >
          <Tabs.TabPane
            key={pageTab.key}
            title={
              <span>
                {pageTab.titleIcon}
                {pageTab.title}
                {/* {pages && pages.length ? `(${pages.length})` : ''} */}
              </span>
            }
          >
            <History
              keyword={searchKeyword}
              clearSignal={clearSignal}
              onEmpty={onHistoryEmpty}
              // addedPageIds={addedPageIds}
              onItemClick={(item) => {
                onHistoryClick(item);
              }}
              onAllBtnClick={(unReadData) => {
                // onClikHistory(unReadData);
              }}
            />
          </Tabs.TabPane>


        </Tabs>
      </Spin>

    </div>
  );
}


function BookmarkPageBox({ children, onClickHistory, searchKeyword, inputValue }) {
  // 提供一个ref给DropContent
  const [popupVisible, setPopupVisible] = useState(false);
  // console.log('222222222 BookmarkPageBox', pages, currentPage);
  // const [data, setData] = useState<BookmarksPagesType>(pages);
  const [activeKey, setActiveKey] = useState<string>('pages');

  const [historyEmpty, setHistoryEmpty] = useState<boolean>(false);

  // 当子组件通知搜索历史为空时的统一处理函数（从组件内部传出）

  function handleHistoryEmpty(isEmpty: boolean) {
    setHistoryEmpty(isEmpty);
  }

  /*   useEffect(() => {
      console.log("3333333333333333333 searchKeyword:", searchKeyword);
    }, [inputValue]); */

  useEffect(() => {
    if (inputValue && inputValue.trim().length > 0)//仅在无搜索关键词时允许打开弹层
      setPopupVisible(false);//输入时关闭弹层
  }, [inputValue]);

  // Trigger 自动通知，但不再控制 popupVisible
  const handleVisibleChange = (nextVisible) => {
    // ❗完全不根据它设置 popupVisible
    if (historyEmpty || inputValue && inputValue.trim().length > 0) {//搜索历史为空时强制关闭
      setPopupVisible(false);
    } else {
      // if (!inputValue || inputValue.trim().length === 0)//仅在无搜索关键词时允许打开弹层
      setPopupVisible(nextVisible);
    }
    // 想允许手动打开的话可以写 if (nextVisible) setPopupVisible(true)
  };


  //当搜索历史为空时自动关闭弹层
  useEffect(() => {
    if (historyEmpty) {
      setPopupVisible(false);
    }
  }, [historyEmpty]);


  return (
    <Trigger
      trigger={['hover', 'click']}
      clickToClose={false} // 关键属性：点击弹层内容（包括Modal）不关闭 keepPopupVisible={keepPopupVisible} 
      popupVisible={popupVisible}
      // popupVisible={true}
      position="bottom"
      onVisibleChange={(visible) => {
        //受控模式下手动控制 popupVisible
        handleVisibleChange(visible);
      }}
      onClickOutside={() => {
        setPopupVisible(false);
      }}
      clickOutsideToClose={false}
      popupHoverStay={true} // 关键属性：鼠标在弹层中时，保持打开
      popup={() => <DropContent searchKeyword={searchKeyword} onHistoryClick={onClickHistory} activeKey={activeKey} onHistoryEmpty={handleHistoryEmpty} />}
      unmountOnExit={false}
    //
    >
      {/* <Badge count={count} dot> */}
      {children}
      {/* </Badge> */}
    </Trigger>


  );
}


export default BookmarkPageBox;
