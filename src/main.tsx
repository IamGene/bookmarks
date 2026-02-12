import './style/global.less';
import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { ConfigProvider } from '@arco-design/web-react';
import zhCN from '@arco-design/web-react/es/locale/zh-CN';
import enUS from '@arco-design/web-react/es/locale/en-US';
import { BrowserRouter, HashRouter, Redirect, Switch, Route } from 'react-router-dom';
import { } from 'react-router-dom';
// import { HashRouter as Router, Redirect, Switch, Route } from 'react-router-dom';
// import Navigate from './navigate';
import UserBookmarks from './pages/navigate/user';
import DefaultNavigate from './pages/navigate/default';
import { GlobalContext } from './context';
import Login from './pages/login';
import changeTheme from './utils/changeTheme';
import useStorage from './utils/useStorage';
import { getCollectPageGroups, saveBookmarkToDB, saveBookmarksToDB, getBookmarkById, getPages } from './db/bookmarksPages';
// import { useDispatch, useSelector } from 'react-redux'
// import { RootState } from '@/store';
import { fetchBookmarksPageData, loadNewAddedBookmarks, reloadUserPages, loadSearchHistory } from '@/store/modules/global'; // 确保路径正确
import './mock';
import store from './store';

// 在应用启动时预加载用户的 pages（从 IndexedDB）到 Redux，避免组件初次渲染时为 null


// import PageLayout from './layout';
// import checkLogin from './utils/checkLogin';
// import { generatePermission } from '@/routes';
// import rootReducer from './store/modules/global';
// import ReactDOM from 'react-dom';
// import axios from 'axios';
// import Navigate from './pages/navigate';
// import rootReducer from './store/global';//原来是./store
// import rootReducer from './info';//原来是./store
// import { GlobalState } from './info';
// import { createStore } from 'redux';
// const store = createStore(rootReducer);
// import changeTheme from './utils/changeTheme';
// import useStorage from './utils/useStorage';
// const store1 = createStore(rootReducer);

function Index() {

  const [lang, setLang] = useStorage('arco-lang', 'en-US');
  const [theme, setTheme] = useStorage('arco-theme', 'light');

  function getArcoLocale() {
    switch (lang) {
      case 'zh-CN':
        return zhCN;
      case 'en-US':
        return enUS;
      default:
        return zhCN;
    }
  }


  async function getCurrentPageId() {
    const { global } = store.getState();
    let currentPageId = global.groups?.[0]?.pageId;
    if (!currentPageId) {
      const pages = await getPages();
      if (pages.length > 0) {//只有用户存在标签数据才能查询
        const defaultPage = pages.find(page => page.default === true);
        return defaultPage ? defaultPage.pageId : pages[0].pageId;
      }
    }
    return currentPageId;
  }

  async function fetchUserInfo() {
    /*  store.dispatch({
       type: 'update-userInfo',
       payload: { userLoading: true },
     });
     axios.get('/api/user/userInfo').then((res) => {
       store.dispatch({
         type: 'update-userInfo',
         payload: { userInfo: res.data, userLoading: false },
       });
     }); */
  }

  //登录校验-跳转页面
  /*   useEffect(() => {
      if (checkLogin()) {
        // fetchUserInfo();
      } else {
        const path = window.location.pathname.replace(/\//g, '')
        // if (window.location.pathname.replace(/\//g, '') !== 'login') {
        if (path !== 'login' && path !== 'navigate') {
          window.location.pathname = '/login';
        }
      }
    }, []); */


  /*   useEffect(() => {
      // window.location.pathname = '/index';
    }, []); */

  // 将 message 监听器提升到根组件
  useEffect(() => {

    //加载用户书签页数据到redux
    store.dispatch(reloadUserPages() as any).catch(() => { });
    store.dispatch(loadSearchHistory() as any).catch(() => { });

    const handleMessage = async (event) => {
      // 1. 安全检查：可以根据需要添加来源验证
      if (event.origin !== window.location.origin) return;
      if (!event.data || !event.data.type) {
        return;
      }

      // ------------------------------------------
      // A. 处理 Content Script 请求分组数据
      // ------------------------------------------
      if (event.data.type === 'REQUEST_GROUPS_FROM_PAGE') {
        try {
          const groups = await getCollectPageGroups();
          console.log("A.com 主线程: 已从 IndexedDB 读取分组数据:", groups);
          // 将数据回复给 a_com_integrator.js
          event.source.postMessage({
            type: 'GROUPS_DATA_FROM_PAGE',
            groups: groups
          }, event.origin);
          console.log("A.com 主线程: 已回复分组数据给 Content Script。");
        } catch (e) {
          console.error("A.com 主线程: 读取 IndexedDB 分组数据失败:", e);
        }
      }

      // ------------------------------------------
      // B. 处理 Content Script 请求保存书签
      // ------------------------------------------
      else if (event.data.type === 'SAVE_TO_DB_REQUEST') {
        const bookmark = event.data.payload;
        // ✅ 当书签保存成功后，派发 action 重新获取该页面的数据，以刷新UI
        // const { global } = store.getState();
        // let currentPageId = global.groups?.[0]?.pageId;
        //bookmarks页面数据尚未加载完成，则查询获取当前默认pageId
        // if (!currentPageId) currentPageId = await getCurrentPageId();
        const currentPageId = await getCurrentPageId();

        let dbBookmark = await getBookmarkById(bookmark.id);
        console.log("A.com 主线程: 检查书签是否已存在 IndexedDB:", dbBookmark);

        if (dbBookmark) {
          // console.log(`A.com 主线程: 书签 "${bookmark.title}" 已存在 IndexedDB，跳过保存。`, bookmark);
          event.source.postMessage({
            type: 'SAVE_TO_DB_REPEAT_RESPONSE', ok: true, data: dbBookmark
          }, event.origin);
        } else {
          try {
            const saveBookMark = await saveBookmarkToDB(bookmark);
            dbBookmark = saveBookMark;
            console.log(`A.com 主线程: 已将书签 "${bookmark.title}" 写入 IndexedDB。`, bookmark, store);
            event.source.postMessage({
              type: 'SAVE_TO_DB_RESPONSE', ok: true, data: saveBookMark
            }, event.origin);
          } catch (e) {
            // console.error("A.com 主线程: 写入书签到 IndexedDB 失败:", e);
            event.source.postMessage({
              type: 'SAVE_TO_DB_RESPONSE', ok: false, data: bookmark
            }, event.origin);
          }
        }

        // 如果当前在 /bookmarks 页面，并且保存的书签属于当前展示的书签页，则刷新
        console.log("A.com 主线程: 触发重新获取页面数据的操作?", currentPageId === dbBookmark.pageId, currentPageId, dbBookmark.pageId,);
        if (window.location.pathname === '/bookmarks' && currentPageId === dbBookmark.pageId) {
          store.dispatch(fetchBookmarksPageData(dbBookmark.pageId));
        }
      }

      // ------------------------------------------
      // C. 处理 Content Script 请求保存书签 多个(来自插件存储)
      // ------------------------------------------
      else if (event.data.type === 'SAVE_TO_DB_REQUEST_MANY') {
        const bookmarkList = event.data.payload;
        //bookmarks页面数据尚未加载完成，则查询获取当前默认pageId
        const currentPageId = await getCurrentPageId();
        // let dbBookmark = await getBookmarkById(bookmark.id);
        const bookmarks = await saveBookmarksToDB(bookmarkList);
        event.source.postMessage({
          type: 'SAVE_TO_DB_RESPONSE', ok: true, data: bookmarks
        }, event.origin);
        console.log("A.com 主线程: 检查书签数组是否已存在 IndexedDB:", bookmarks);
        if (window.location.pathname === '/bookmarks' && currentPageId === bookmarks[0].pageId) {
          store.dispatch(fetchBookmarksPageData(bookmarks[0].pageId));
        }
        store.dispatch(loadNewAddedBookmarks(bookmarks));
      }
    };

    // console.log('注册全局 message 监听器');
    window.addEventListener('message', handleMessage);
    // 组件卸载时（即应用关闭时）移除监听器
    return () => {
      console.log('移除全局 message 监听器');
      window.removeEventListener('message', handleMessage);
    };
  }, []); // 空依赖数组确保只在应用启动时注册一次


  /**
   * 调用触发
   *  document.dispatchEvent(new CustomEvent('showPageToast', {
                detail: { message: '书签已保存成功！' }
            }));
   */

  useEffect(() => {
    changeTheme(theme);
  }, [theme]);

  const contextValue = {
    lang,
    setLang,
    theme,
    setTheme,
  };

  return (
    // <Router>
    // <HashRouter>
    <BrowserRouter>
      <ConfigProvider
        locale={getArcoLocale()}
        componentConfig={{
          Card: {
            bordered: false,
          },
          List: {
            bordered: false,
          },
          Table: {
            border: false,
          },
        }}
      >
        <Provider store={store}>
          <GlobalContext.Provider value={contextValue}>
            <Switch>
              <Route path="/login" exact component={Login} />
              {/* 以下2个直接匹配，不能交给/PageLayout，因为布局不一样 */}
              {/* 导航主页 */}
              <Route path="/index" exact component={DefaultNavigate} />
              <Route path="/bookmarks" exact component={UserBookmarks} />
              <Route path="/" component={DefaultNavigate} />
            </Switch>
          </GlobalContext.Provider>
        </Provider>
      </ConfigProvider>
    </BrowserRouter>
    // </HashRouter>
    // </Router >



  );
}

{/*  <Route path="/navigate" >
                <Redirect to={`/navigate/default`} />
              </Route> */}

// ReactDOM.render(<Index />, document.getElementById('root'));
//react 18的写法
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<Index />);