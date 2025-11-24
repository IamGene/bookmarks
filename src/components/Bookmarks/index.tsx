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
// import RenamePageForm from '@compo';
// import { set } from 'mobx';
import { getPages, deletePageBookmarks, exportAllPagesJson } from '@/db/bookmarksPages';
import { useFetchPageData } from '@/hooks/fetchPageData';
import { removeConfirm } from '@/pages/navigate/user/form/remove-confirm-modal';
import RenamePageForm from '@/pages/navigate/user/form/rename_page_form';
import styles from './style/index.module.less';
import { reloadUserPages } from '@/store/modules/global';
import Imports from './import/index';
import { useDispatch } from 'react-redux';
function DropContent({ pages, currentPage, pagesChange, activeRename, activeKey }) {

  const t = useLocale();
  // const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(activeKey);
  const [currentPageId, setCurrentPageId] = useState(currentPage);
  // const [addedPageIds, setAddedPageIds] = useState(newBookmarkPages);
  // console.log("🌀 渲染 DropContent list newBookmarkPages=", newBookmarkPages);
  const [groupData, setGroupData] = useState<{
    [key: string]: MessageListType;
  }>({});

  useEffect(() => {
    if (activeKey) {
      // console.log("🔁 父组件触发 activeKey 变化:", activeKey);
      setActiveTab(activeKey);
    }
  }, [activeKey]);

  /*  useEffect(() => {
     // console.log('3333333333333 useEffect newBookmarkPages ', newBookmarkPages, addedPageIds);
     // 将传入的新 id 追加到现有数组并去重，避免覆盖本地标记
     if (Array.isArray(newBookmarkPages) && newBookmarkPages.length > 0) {
       setAddedPageIds(prev => {
         const merged = Array.from(new Set([...(prev || []), ...newBookmarkPages]));
         return merged;
       });
     }
   }, [newBookmarkPages]);//newBookmarkPages发生变化的时候执行 */

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
        pagesChange(0, item.pageId); // 删除成功后刷新列表
      } else {
        console.log('❎ 用户取消或删除失败');
        //让父组件恢复因为弹窗而导致收起的展开状态
        // keepPopupVisible();
      }
    } catch (e) {
      Message.error('删除失败，请重试');
    }
  }

  const [renameForm, setRenameForm] = useState(false);
  const [bookmarkPage, setBookmarkPage] = useState(null);


  async function handlePageSwtich(item) {
    // console.log('5555555 handlePageSwtich', item)
    // setBookmarkPage(item);
    pagesChange(0, item.pageId);
  }

  /*  async function switchPageId(pageId: number) {
     // const res = await getGroupData(pageId);
     console.log("切换标签页 111 switchPageId pageId=", pageId);
     await dispatchTagGroupsData(pageId);
   } */


  const switchPageId = useFetchPageData();

  async function handlePageRename(item, index) {
    setRenameForm(true);
    setBookmarkPage(item);
  }

  //提交成功后关闭或取消关闭Modal窗口
  async function closeRenameModal(success: boolean, item: any) {
    if (success) {
      setRenameForm(false);
      pagesChange(1, item.pageId);
      activeRename(true);//保持弹出层弹开
    } else {
      setRenameForm(false);
    }
  }

  async function handleImportSuccess(pageIds: number[]) {
    setCurrentPageId(pageIds[0]);
    switchPageId(pageIds[0]);
    pagesChange(1, pageIds[0]);
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
  /* const addTab =
  {
    key: 'add',
    title: '新建书签',
    titleIcon: <IconUpload style={{ marginRight: 6 }} />
  }; */

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
              // addedPageIds={addedPageIds}
              onItemClick={(item) => {
                // readMessage([item]);
              }}
              onAllBtnClick={(unReadData) => {
                // readMessage(unReadData);
              }}
              onRemovePage={handlePageRemove}
              onRenamePage={handlePageRename}
            // onSwitchPage={handlePageSwtich}
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

      <RenamePageForm bookmarkPage={bookmarkPage} visible={renameForm} closeWithSuccess={closeRenameModal}></RenamePageForm>
    </div>
  );
}


// function BookmarkPageBox({ children, pages, currentPage, newBookmarkPages, setCurrentPage }) {
function BookmarkPageBox({ children, pages, currentPage, setCurrentPage }) {
  // 提供一个ref给DropContent
  const [popupVisible, setPopupVisible] = React.useState(false);
  // console.log('222222222 BookmarkPageBox', pages, popupVisible);
  const [data, setData] = useState<BookmarksPagesType>(pages);
  const dispatch = useDispatch();
  const [activeKey, setActiveKey] = useState<string>('pages');
  const [count, setCount] = useState<number>(0);
  // const [newPageIds, setNewPageIds] = useState<number[]>(newBookmarkPages);

  function keepPopupVisible() {
    setPopupVisible(true);
  }

  const [renameActive, setRenameActive] = useState<boolean>(false);
  function setRenameActiveStatus(active: boolean) {
    setRenameActive(active);
  }

  // Trigger 自动通知，但不再控制 popupVisible
  const handleVisibleChange = (nextVisible) => {
    // console.log("Trigger reports visible:", nextVisible);
    // ❗完全不根据它设置 popupVisible
    if (renameActive) {//重命名中
      setPopupVisible(true);
    } else {
      setPopupVisible(nextVisible);
    }
    // 想允许手动打开的话可以写 if (nextVisible) setPopupVisible(true)
  };

  /*   useEffect(() => {
      setNewPageIds(newBookmarkPages);
    }, [newBookmarkPages]); */

  useEffect(() => {
    setData(pages);
    const idx = pages.findIndex(p => p.new);//新的
    if (idx !== -1) {
      setPopupVisible(true);//展开
      setTimeout(() => setActiveKey("pages"), 0);
    }
  }, [pages]);



  /*  useEffect(() => {
     // console.log('useEffect popupVisible 3333333333', popupVisible);
   }, [popupVisible]); */

  async function refreshBookmarksPage(pageId?: number, updated: boolean = false) {
    // const newPages = await getPages();
    const newPages: any = await dispatch(reloadUserPages());
    if (pageId && updated) {//新增或修改，增加红点提示
      const idx = newPages.findIndex(p => p.pageId === pageId);
      if (idx !== -1) {
        // newPages[idx].new = true; // 就地修改
        const updatedPages = newPages.map(p =>
          p.pageId === pageId ? { ...p, new: true } : p
        );
        // setBookmarkPages(updated);
        setPopupVisible(true);//展开
        // setData([...newPages]); // 通过创建新数组引用来触发渲染
        setData(updatedPages); // 通过创建新数组引用来触发渲染
      }
    } else {
      // console.log('refreshBookmarksPage newPages remove3333333333', newPages);
      setData(newPages);
    }
  }

  /*   const ignoreNextVisibilityRef = useRef(false);
    function handleVisibleChange(next) {
      if (ignoreNextVisibilityRef.current) {
        // 忽略一次，并重置标志
        ignoreNextVisibilityRef.current = false;
        return;
      }
      setPopupVisible(next);
    } */


  function onPagesChange(count?: number, pageId?: number, callback?: () => void) {
    // console.log('AAAAAA pageId', pageId);
    setCurrentPage(pageId);
    // 简化逻辑，只负责刷新数据和UI
    refreshBookmarksPage(pageId, count > 0);//显示更新的数量
    // 强制刷新 Tabs
    setActiveKey("");
    setPopupVisible(true);//保持弹出
    setTimeout(() => setActiveKey("pages"), 0);
    setCount(count || 0);
  }


  return (
    <Trigger
      // trigger="hover"
      trigger={['hover', 'click']}
      // trigger={['click']}
      clickToClose={false} // 关键属性：点击弹层内容（包括Modal）不关闭 keepPopupVisible={keepPopupVisible} 
      popupVisible={popupVisible}
      // onVisibleChange={setPopupVisible}
      onVisibleChange={(visible) => {
        handleVisibleChange(visible);
      }}
      onClickOutside={() => {
        setPopupVisible(false);
      }}
      // onVisibleChange={handleVisibleChange}
      clickOutsideToClose={false}
      popupHoverStay={true} // 关键属性：鼠标在弹层中时，保持打开
      // onVisibleChange={handleVisibleChange}
      // newBookmarkPages={newPageIds}
      popup={() => <DropContent pages={data} currentPage={currentPage} pagesChange={onPagesChange} activeRename={setRenameActiveStatus} activeKey={activeKey} />}
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
