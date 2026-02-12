import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import groupBy from 'lodash/groupBy';
import {
  Trigger,
  Badge,
  Tabs,
  Spin,
} from '@arco-design/web-react';
import {
  IconFile,
  IconDownload,
  IconUpload,
} from '@arco-design/web-react/icon';
import useLocale from '../../utils/useLocale';
import TagList, { BookmarksPagesType, MessageListType, BookmarksPageData } from './list';
// import RenamePageForm from '@compo';
// import { set } from 'mobx';
import styles from './style/index.module.less';
import { useDispatch } from 'react-redux';
function DropContent({ currentPage, onTagSwitch }) {

  const t = useLocale();
  // const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [currentPageId, setCurrentPageId] = useState(currentPage);
  // const [addedPageIds, setAddedPageIds] = useState(newBookmarkPages);
  // console.log("🌀 渲染 DropContent list newBookmarkPages=", newBookmarkPages);
  const [groupData, setGroupData] = useState<{
    [key: string]: MessageListType;
  }>({});


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

  return (
    <div className={styles['message-box']}>
      <Spin loading={loading} style={{ display: 'block' }}>
        <Tabs.TabPane
          key={pageTab.key}

          title={
            <span>
              {pageTab.titleIcon}
              {pageTab.title}
              {/* {`(${sourceData.length})`} */}
            </span>
          }
        >
          <TagList
            currentPageId={currentPageId}
            // addedPageIds={addedPageIds}
            /*  onItemClick={(key, index, selected) => {
               switchTagSelected(key, index, selected);
             }} */
            onItemClick={(tag) => {
              onTagSwitch(tag);
            }}
            onAllBtnClick={(unReadData) => {
              // readMessage(unReadData);
            }}
          // onSwitchPage={handlePageSwtich}
          />

        </Tabs.TabPane>

      </Spin>

    </div>
  );
}


function BookmarkPageBox({ children, onTagSwitch, currentPage }) {
  // 提供一个ref给DropContent
  const [popupVisible, setPopupVisible] = React.useState(false);

  const [renameActive, setRenameActive] = useState<boolean>(false);

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


  return (
    <Trigger
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
      popup={() => <DropContent currentPage={currentPage} onTagSwitch={onTagSwitch} />}
      position="br"
      unmountOnExit={false}
      popupAlign={{ bottom: 4 }}
    >
      <Badge dot>
        {children}
      </Badge>
    </Trigger>


  );
}


export default BookmarkPageBox;
