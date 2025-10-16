import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Switch, Route, Redirect, useHistory } from 'react-router-dom';
import { Layout, Menu, Breadcrumb, Spin, Anchor, Descriptions } from '@arco-design/web-react';
const AnchorLink = Anchor.Link;
import cs from 'classnames';
import {
  IconDashboard,
  IconList,
  IconSettings,
  IconFile,
  IconApps,
  IconCheckCircle,
  IconExclamationCircle,
  IconUser,
  IconTag,
  IconMenuFold,
  IconMenuUnfold,
} from '@arco-design/web-react/icon';
import qs from 'query-string';
import { getNaviate } from '@/api/navigate';
import { useDispatch, useSelector } from 'react-redux'
import cache from '@/plugins/cache';
import axios from 'axios';
//注意顺序在前以免样式被覆盖 add
import './index.css'
// 导航组件
import Navbar from '@/components/NavBar';
import Footer from '@/components/Footer';
import Tree from '@/components/Tree';
import useNavi, { INavi } from '@/navis';
import { isArray } from '@/utils/is';
import useLocale from '@/utils/useLocale';
import getUrlParams from '@/utils/getUrlParams';
import { RootState } from '@/store';
import { updateUserInfo } from '@/store/modules/global';
import { generatePermission } from '@/routes';
import Navi from './navigate';
import styles from '@/style/layout.module.less';
// import './index.css'

// import NProgress from 'nprogress';
// import { inscrement, decrement, addToNum } from './store/modules/counterStore'
// import { fetchChannlList } from './store/modules/channelStore'
// import useRoute, { IRoute } from '@/routes';
// import lazyload from './utils/lazyload';
// import { GlobalState } from './info';
// import { setUserInfo } from '@/store/modules/user'
// import Navbar from './components/NavBar1';

const MenuItem = Menu.Item;
const SubMenu = Menu.SubMenu;
const Sider = Layout.Sider;
const Content = Layout.Content;
//默认用户信息
const userRole = window.localStorage.getItem('userRole') || 'admin';
const defaultUserInfo = {
  userName: 'admin',
  avatar:
    '/profile/avatar/2024/01/06/blob_20240106142934A002.png',
  email: 'wangliqun@email.com',
  job: 'frontend',
  jobName: '前端开发工程师',
  organization: 'Frontend',
  organizationName: '前端',
  location: 'beijing',
  locationName: '北京',
  introduction: '王力群并非是一个真实存在的人。',
  personalWebsite: 'https://www.arco.design',
  verified: true,
  phoneNumber: /177[*]{6}[0-9]{2}/,
  accountId: /[a-z]{4}[-][0-9]{8}/,
  permissions: generatePermission(userRole),
};

// 找出含有关键词？
function searchData1(list, keyword) {
  let hasResult: boolean = false;
  const regex = new RegExp(`(${keyword})`, 'gi');
  for (let i = 0; i < list.length; i++) {
    const data = list[i];
    if (data.naviList.length > 0) {
      //重复
      const naviList = data.naviList;
      for (let k = 0; k < naviList.length; k++) {
        const navi = naviList[k];
        let name = navi.name;
        let description = navi.description;
        const parts = name.split(regex);
        if (parts.length >= 3) {
          hasResult = true;
          break;
        }
        const parts1 = description.split(regex);
        if (parts1.length >= 3) {
          hasResult = true;
          break;
        }
      }
    }
    const children = data.children;
    if (children.length > 0) {
      for (let j = 0; j < children.length; j++) {
        const naviList = children[j].naviList;
        for (let k = 0; k < naviList.length; k++) {
          const navi = naviList[k];
          let name = navi.name;
          let description = navi.description;

          const parts = name.split(regex);
          if (parts.length >= 3) {
            hasResult = true;
            break;
          }
          const parts1 = description.split(regex);
          if (parts1.length >= 3) {
            hasResult = true;
            break;
          }
          //没有 不用搜索;有—>传入keyword,每个搜索
        }
      }
    }
  }
  return hasResult;
}

function getIconFromKey(key) {
  switch (key) {
    case 'dashboard':
      return <IconDashboard className={styles.icon} />;
    case 'list':
      return <IconList className={styles.icon} />;
    case 'form':
      return <IconSettings className={styles.icon} />;
    case 'profile':
      return <IconFile className={styles.icon} />;
    case 'visualization':
      return <IconApps className={styles.icon} />;
    case 'result':
      return <IconCheckCircle className={styles.icon} />;
    case 'exception':
      return <IconExclamationCircle className={styles.icon} />;
    case 'user':
      return <IconUser className={styles.icon} />;
    default:
      // return <div className={styles['icon-empty']} />;//空的
      return <IconTag className={styles.icon} />;
  }
}

function getFlattenRoutes(routes) {
  const mod = import.meta.glob('./pages/**/[a-z[]*.tsx');
  const res = [];
  function travel(_routes) {
    _routes.forEach((route) => {
      const visibleChildren = (route.children || []).filter(
        (child) => !child.ignore
      );
      // 没有子菜单,加载该菜单的组件
      if (route.key && (!route.children || !visibleChildren.length)) {
        try {
          // 加载组件文件
          // route.component = lazyload(mod[`./pages/${route.key}/index.tsx`]);
          res.push(route);
        } catch (e) {
          console.error(e);
        }
      }
      // 递归
      if (isArray(route.children) && route.children.length) {
        travel(route.children);
      }
    });
  }
  travel(routes);
  return res;
}

function searchData(inputValue, treeData) {
  const loop = (data) => {
    const result = [];
    data.forEach((item) => {
      if (item.name.toLowerCase().indexOf(inputValue.toLowerCase()) > -1) {
        result.push({ ...item });
      } else if (item.children) {
        const filterData = loop(item.children);

        if (filterData.length) {
          result.push({ ...item, children: filterData });
        }
      }
    });
    return result;
  };

  return loop(treeData);
}

function Navigate() {

  // console.log('default navigate')

  const urlParams = getUrlParams();
  const history = useHistory();
  const pathname = history.location.pathname;
  const currentComponent = qs.parseUrl(pathname).url.slice(1);
  const locale = useLocale();

  // const { settings, userLoading, userInfo } = useSelector(
  //   (state: GlobalState) => state
  // );
  // RootState

  const globalState = useSelector((state: RootState) => state.global);
  const { settings, userLoading, userInfo } = globalState;
  const [routes, defaultRoute] = useNavi(userInfo?.permissions);

  const [list, setList] = useState(
    []
  );

  const [data, setData] = useState(
    []
  );

  const defaultSelectedKeys = [currentComponent || defaultRoute];
  const paths = (currentComponent || defaultRoute).split('/');
  const defaultOpenKeys = paths.slice(0, paths.length - 1);

  const [breadcrumb, setBreadCrumb] = useState([]);

  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [selectedKeys, setSelectedKeys] =
    useState<string[]>(defaultSelectedKeys);
  const [openKeys, setOpenKeys] = useState<string[]>(defaultOpenKeys);

  const routeMap = useRef<Map<string, React.ReactNode[]>>(new Map());

  const menuMap = useRef<
    Map<string, { menuItem?: boolean; subMenu?: boolean }>
  >(new Map());

  const navbarHeight = 60;
  const menuWidth = collapsed ? 48 : settings.menuWidth;

  const showNavbar = settings.navbar && urlParams.navbar !== false;
  const showMenu = settings.menu && urlParams.menu !== false;
  const showFooter = settings.footer && urlParams.footer !== false;

  const flattenRoutes = useMemo(() => getFlattenRoutes(routes) || [], [routes]);

  // 点击(菜单)回调
  function onClickMenuItem(key, e, keyPath) {//key
    if (key.indexOf(',') !== -1) {
      const stringArray: string[] = key.split(',');
      const activeCardTab: number[] = stringArray.map(Number);
      setTreeSelected(activeCardTab);
    } else {//父菜单,只有一级路径  String => Number
      const num = Number(key);
      setTreeSelected([num]);
    }

    /*  const currentRoute = flattenRoutes.find((r) => r.key === key);
     const component = currentRoute.component;
     const preload = component.preload();
     NProgress.start();
     preload.then(() => {
       history.push(currentRoute.path ? currentRoute.path : `/${key}`);
       NProgress.done();
     }); */
  }

  // 切换收纳侧边栏
  function toggleCollapse() {
    setCollapsed((collapsed) => !collapsed);
  }

  const paddingLeft = showMenu ? { paddingLeft: menuWidth } : {};
  const paddingTop = showNavbar ? { paddingTop: navbarHeight } : {};
  const paddingStyle = { ...paddingLeft, ...paddingTop };
  const [loading, setLoading] = useState(true);

  const [treeSelected, setTreeSelected] = useState([]);
  const [treeSelectedKeys, setTreeSelectedKeys] = useState([]);
  const [treeInputValue, setTreeInputValue] = useState('');

  // 接收Tree传过来的选中项
  const getTreeSelect = (selected) => {
    const value = selected[0];
    const stringArray: string[] = value.split(',');
    const activeCardTab: number[] = stringArray.map(Number);
    setTreeSelected(activeCardTab);
  }

  // 接收Tree传过来的关键词过滤后的数据
  const getTreeSearchData = (treeData) => {
    setData(treeData);
  }

  // 接收Tree传过来的关键词
  const getTreeInputValue = (inputValue) => {
    setTreeInputValue(inputValue);
    if (!inputValue || !inputValue.trim()) {
      setData(list);//还原初始数据
      // setTempExpand(false)
      // setTreeSearchData(data)
    } else {//不为空
      // setTreeSearch(inputValue.trim())
      const result = searchData(inputValue.trim(), data);
      if (result.length) {
        //当有搜索结果时，临时设置为展开但不影响原本的设置
        // setTempExpand(true)
      }
      setData(result);
    }
  }

  const [hasResult, setHasResult] = useState(true);

  // 接收Card-Tab传过来的选中项['card_id,tab_id']
  const getCardTabActive = (activeValue) => {
    setTreeSelectedKeys(activeValue);
  }

  // let hasResult = true;
  // 接收NavBar传过来的搜索关键词
  const [navbarKeyWord, setNavbarKeyWord] = useState('');
  const getNavBarKey = (keyword) => {
    setNavbarKeyWord(keyword)
    // 关键词过滤
    if (!keyword || !keyword.trim()) {
      setHasResult(true)
    } else {//不为空
      const hasResult = searchData1(list, keyword);
      setHasResult(hasResult)
    }
  }

  const api = import.meta.env.VITE_REACT_APP_BASE_API;

  // 从Api接口获取数据
  const getNaviData = async (): Promise<boolean> => {
    return await getNaviate()
      .then((res: any) => {
        setList(res);//Card
        setData(res);//Menu
        return true
      })
      .catch(() => {
        return false
      })
      .finally(() => setLoading(false));
  };

  const dispatch = useDispatch();
  // 获取用户信息 默认 主要是头像
  function setDefaultUserInfo() {
    const userInfo = cache.session.getJSON('user');
    if (typeof userInfo === 'undefined' || userInfo === null) {
      // console.log('userInfo is Null')
      dispatch(updateUserInfo({ userInfo: defaultUserInfo, userLoading: false }))
    } else {
      dispatch(updateUserInfo({ userInfo, userLoading: false }))
    }
  }

  // 获取数据
  const getData = () => {
    axios
      //.get('/api/cardList')  //mock
      .get(`${api}/navigation`)
      .then((res) => {
        setList(res.data);//Card
        setData(res.data);//Menu
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // getData();
    getNaviData();
    // setDefaultUserInfo()
  }, []);


  // 渲染MenuItem
  function renderRoutes(locale) {
    // routeMap.current.clear();
    // console.log('renderRoutes')
    return function travel(_routes: INavi[], level, parentNode = []) {
      return _routes.map((route) => {
        const { breadcrumb = true, ignore } = route;
        //根据key获取图标
        // const iconDom = getIconFromKey(route.key);
        // const iconDom = getIconFromKey(route.id);
        //二级目录没有图标
        const iconDom = route.pid ? '' : getIconFromKey(route.id);
        // const pid = route.pid;
        const hrefId = route.pid ? route.pid : route.id;
        const titleDom = (
          <>
            {/* {iconDom} {locale[route.name] || route.name} */}
            {<AnchorLink href={`#${hrefId}`}
              title={
                <> {iconDom} {route.name}</>
                // route.pid ?
                //   <> <a href="javascript:void(0)" ref={linkRef} onClick={() => onMenuClick(route.id, route.pid)}> {iconDom}<span>{route.name}</span></a></>
                //   : <> {iconDom} {route.name}</>
              }>
            </AnchorLink>}
          </>
        );

        // 根据key,设置面包屑导航到routeMap
        /*  routeMap.current.set(
           `/${route.key}`,
           breadcrumb ? [...parentNode, route.name] : []
         ); */

        // 将子菜单name添加到面包屑导航routeMap
        const visibleChildren = (route.children || []).filter((child) => {
          // ignore：当前路由是否渲染菜单项，为 true 的话不会在菜单中显示，但可通过路由地址访问。
          const { ignore, breadcrumb = true } = child;

          // 如果父route或子route的ignore为true,设置breadcrumb路由地址
          /*  if (ignore || route.ignore) {
             routeMap.current.set(
               `/${child.key}`,
               breadcrumb ? [...parentNode, route.name, child.name] : []
             );
           } */

          //过滤ignore为false的子菜单
          return !ignore;
        });

        // A.当前路由菜单route.ignore==true不可见，返回空,也不渲染子菜单
        if (ignore) {
          return '';
        }
        //B.当前路由菜单可见，且拥有可见路由子菜单
        if (visibleChildren.length) {
          // 设置当前路由菜单类型到menuMap,返回当前菜单并递归子菜单渲染
          // menuMap.current.set(route.key, { subMenu: true });
          return (
            <SubMenu key={route.path} title={titleDom}>
              {travel(visibleChildren, level + 1, [...parentNode, route.name])}
            </SubMenu>
          );
        }
        //C.当前路由菜单可见，且没有可见路由子菜单：返回当前菜单，设置当前路由菜单到menuMap
        // menuMap.current.set(route.key, { menuItem: true });
        return <MenuItem key={route.path}>{titleDom}</MenuItem>;
      });
    };
  }

  // 根据路径pathname,打开/展开对应的菜单
  function updateMenuStatus() {
    const pathKeys = pathname.split('/');
    const newSelectedKeys: string[] = [];
    const newOpenKeys: string[] = [...openKeys];
    while (pathKeys.length > 0) {
      const currentRouteKey = pathKeys.join('/');
      const menuKey = currentRouteKey.replace(/^\//, '');
      const menuType = menuMap.current.get(menuKey);
      if (menuType && menuType.menuItem) {//是单个菜单->选中
        newSelectedKeys.push(menuKey);
      }
      if (menuType && menuType.subMenu && !openKeys.includes(menuKey)) {//是嵌套(父级)菜单->展开
        newOpenKeys.push(menuKey);
      }
      pathKeys.pop();
    }
    setSelectedKeys(newSelectedKeys);
    setOpenKeys(newOpenKeys);
  }

  return (
    <Layout className={styles.layout}>
      <div
        className={cs(styles['layout-navbar'], {
          [styles['layout-navbar-hidden']]: !showNavbar,
        })}
      >
        {/* <Navbar show={showNavbar} setNavBarKey={getNavBarKey} /> */}
        <Navbar show={showNavbar} pageNo={null} pages={[]} display={null} setNavBarKey={getNavBarKey} setAllDisplay={null} />
      </div>
      {userLoading ? (
        <Spin className={styles['spin']} />
      ) : (
        <Layout>
          {(showMenu) && (
            <Sider
              className={styles['layout-sider']}
              width={menuWidth}
              collapsed={collapsed}
              onCollapse={setCollapsed}
              trigger={null}
              collapsible
              breakpoint="xl"
              style={paddingTop}
            >
              <div className={styles['menu-wrapper']}>
                {/* 收纳：展示菜单 */}
                {collapsed ? <Menu
                  // {<Menu
                  collapse={collapsed}
                  onClickMenuItem={(key, event, keyPath) => onClickMenuItem(key, event, keyPath)}
                  // onClickSubMenu={onClickMenuItem}
                  selectedKeys={selectedKeys}
                  openKeys={openKeys}
                  onClickSubMenu={(key, openKeys, keyPath) => {
                    // console.log('key', key)
                    // console.log('keyPath', keyPath)
                    onClickMenuItem(key, openKeys, keyPath)
                    setOpenKeys(openKeys);
                  }}
                >
                  {renderRoutes(locale)(data, 1)}
                </Menu>
                  :
                  <Tree setTreeSelected={getTreeSelect} treeSelectedKeys={treeSelectedKeys} data={data} inputValue={treeInputValue} setTreeInputValue={getTreeInputValue}></Tree>
                }
              </div>
              <div className={styles['collapse-btn']} onClick={toggleCollapse}>
                {collapsed ? <IconMenuUnfold /> : <IconMenuFold />}
              </div>
            </Sider>
          )}
          <Layout className={styles['layout-content']} style={paddingStyle}>
            <div className={styles['layout-content-wrapper']}>
              {!!breadcrumb.length && (
                <div className={styles['layout-breadcrumb']}>
                  <Breadcrumb>
                    {breadcrumb.map((node, index) => (
                      <Breadcrumb.Item key={index}>
                        {typeof node === 'string' ? locale[node] || node : node}
                      </Breadcrumb.Item>
                    ))}
                  </Breadcrumb>
                </div>
              )}
              <Content>
                {/* Card-Tab列表 */}
                <Navi activeCardTab={treeSelected} keyWord={navbarKeyWord} setCardTabActive={getCardTabActive} list={list} hasResult={hasResult} loading={loading}></Navi>
              </Content>
            </div>
            {showFooter && <Footer />}
          </Layout>
        </Layout>
      )
      }
    </Layout >
  );
}

export default Navigate;
