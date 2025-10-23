import './style/global.less';
import React, { useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { ConfigProvider } from '@arco-design/web-react';
import zhCN from '@arco-design/web-react/es/locale/zh-CN';
import enUS from '@arco-design/web-react/es/locale/en-US';
import { BrowserRouter, Redirect, Switch, Route } from 'react-router-dom';
// import { HashRouter as Router, Redirect, Switch, Route } from 'react-router-dom';
import UserNavigate from './pages/navigate/user';
import IndexedDB1 from './db/BookmarkRestore.jsx';
import DefaultNavigate from './pages/navigate/default';
import { GlobalContext } from './context';
import Login from './pages/login';
import changeTheme from './utils/changeTheme';
import useStorage from './utils/useStorage';
import './mock';
import store from './store';
import { getCollectPageGroups, saveBookmarkToDB } from './db/bookmarksPages';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store';
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

  // const globalState = useSelector((state: RootState) => state.global);
  // const { settings, userLoading, userInfo, groups, activeGroup, hiddenGroup } = globalState;
  // const { groups } = globalState;


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


  useEffect(() => {
    // window.location.pathname = '/index';
  }, []);


  useEffect(() => {
    changeTheme(theme);
  }, [theme]);

  // 将 message 监听器提升到根组件
  useEffect(() => {
    const handleMessage = async (event) => {
      // 1. 安全检查：可以根据需要添加来源验证
      // if (event.origin !== 'expected-origin') return;
      console.log("event.origin", event.origin);
      console.log("window.location.origin", window.location.origin);
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
      if (event.data.type === 'SAVE_TO_DB_REQUEST') {
        const bookmark = event.data.payload;
        try {
          await saveBookmarkToDB(bookmark);
          console.log(`A.com 主线程: 已将书签 "${bookmark.title}" 写入 IndexedDB。`, bookmark, store);

          event.source.postMessage({
            type: 'SAVE_TO_DB_RESPONSE',
            ok: true
          }, event.origin);

          // ✅ 当书签保存成功后，派发 action 重新获取该页面的数据，以刷新UI
          if (bookmark.pageId) {
            // 动态导入 action 创建函数以避免循环依赖
            // const { fetchBookmarksPageData } = await import('./store/modules/global');
            // store.dispatch(fetchBookmarksPageData(bookmark.pageId));
          }
        } catch (e) {
          console.error("A.com 主线程: 写入书签到 IndexedDB 失败:", e);
        }
      }
    };

    console.log('注册全局 message 监听器');
    window.addEventListener('message', handleMessage);

    // 组件卸载时（即应用关闭时）移除监听器
    return () => {
      console.log('移除全局 message 监听器');
      window.removeEventListener('message', handleMessage);
    };
  }, []); // 空依赖数组确保只在应用启动时注册一次


  const contextValue = {
    lang,
    setLang,
    theme,
    setTheme,
  };

  return (
    // <Router>
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
              <Route path="/login" component={Login} />
              {/* 以下2个直接匹配，不能交给/PageLayout，因为布局不一样 */}

              {/* 导航主页 */}
              <Route path="/index" component={DefaultNavigate} />
              {/* <Route path="/navigate" exact component={DefaultNavigate} /> */}
              {/* 用户书签 */}
              {/* <Route path="/indexedDB" exact component={IndexedDB1} /> */}
              <Route path="/bookmarks" exact component={UserNavigate} />

              {/*  <Route path="/navigate" >
                <Redirect to={`/navigate/default`} />
              </Route> */}
              {/* <Route path="/navigate/default" component={DefaultNavigate} /> */}

              {/* <Route path="/" component={PageLayout} /> */}

              {/* <Route path="/" component={DefaultNavigate} /> */}
              <Route path="/" component={UserNavigate} />
            </Switch>
          </GlobalContext.Provider>
        </Provider>
      </ConfigProvider>
    </BrowserRouter>
    // </Router >
  );
}

// ReactDOM.render(<Index />, document.getElementById('root'));
//react 18的写法
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<Index />);