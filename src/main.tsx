import './style/global.less';
import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { ConfigProvider } from '@arco-design/web-react';
import zhCN from '@arco-design/web-react/es/locale/zh-CN';
import enUS from '@arco-design/web-react/es/locale/en-US';
// import { BrowserRouter, Redirect, Switch, Route } from 'react-router-dom';
import { HashRouter as Router, Redirect, Switch, Route } from 'react-router-dom';
// import Navigate from './navigate';
import UserNavigate from './pages/navigate/user';
import IndexedDB1 from './db/BookmarkRestore.jsx';
import DefaultNavigate from './pages/navigate/default';
import { GlobalContext } from './context';
import Login from './pages/login';
import changeTheme from './utils/changeTheme';
import useStorage from './utils/useStorage';
import './mock';
import store from './store';

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

  const contextValue = {
    lang,
    setLang,
    theme,
    setTheme,
  };

  return (
    // <BrowserRouter>
    <Router>
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
    </Router >
    // </BrowserRouter>
  );
}

// ReactDOM.render(<Index />, document.getElementById('root'));
//react 18的写法
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<Index />);