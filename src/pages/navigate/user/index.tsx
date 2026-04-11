import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { Layout, Menu, Breadcrumb, Spin, Anchor, Message } from '@arco-design/web-react';

const AnchorLink = Anchor.Link;
import cs from 'classnames';
import {
  IconDashboard,
  IconList,
  IconSettings,
  IconFile,
  IconFolder,
  IconApps,
  IconCheckCircle,
  IconExclamationCircle,
  IconUser,
  // IconCaretUp,
  // IconRefresh,
  IconTag,
  IconMenuFold,
  IconMenuUnfold,
} from '@arco-design/web-react/icon';
import qs from 'query-string';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import cache from '@/plugins/cache';
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
import { updateUserInfo, updateSearchState } from '@/store/modules/global';
import { generatePermission } from '@/routes';
import Navi from './navigate';
import { getPages, saveSearchHistory, getBookmarkById, getBookmarkGroupById } from "@/db/BookmarksPages";
import BackToTop from '../common/back-to-top';
import styles from '@/style/layout.module.less';
import { set } from 'mobx';
// import { fetchGroupData } from './common';
// import './index.css'
// import NProgress from 'nprogress';
// import { inscrement, decrement, addToNum } from './store/modules/counterStore'
// import { fetchChannlList } from './store/modules/channelStore'
// import useRoute, { IRoute } from '@/routes';
// import lazyload from './utils/lazyload';
// import { GlobalState } from './info';
// import { setUserInfo } from '@/store/modules/user'

const MenuItem = Menu.Item;
const SubMenu = Menu.SubMenu;
const Sider = Layout.Sider;
const Content = Layout.Content;
const api = import.meta.env.VITE_REACT_APP_BASE_API;
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
// 通用递归搜索：支持任意深度的 children
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function searchDataRecursive(list, keyword) {
  if (!keyword || !keyword.trim()) return false;
  const k = keyword.trim();
  const regex = new RegExp(escapeRegExp(k), 'i');

  function nodeHasMatch(node) {
    if (!node) return false;
    // if (node.urlList && node.urlList.length > 0) {
    if (node.bookmarks && node.bookmarks.length > 0) {
      for (let i = 0; i < node.bookmarks.length; i++) {
        const navi = node.bookmarks[i] || {};
        const name = (navi.name || '') + '';
        const description = (navi.description || '') + '';
        if (regex.test(name) || regex.test(description)) return true;
      }
    }
    if (node.children && node.children.length > 0) {
      for (let j = 0; j < node.children.length; j++) {
        if (nodeHasMatch(node.children[j])) return true;
      }
    }
    return false;
  }

  for (let i = 0; i < list.length; i++) {
    if (nodeHasMatch(list[i])) return true;
  }
  return false;
}

// 保持原名兼容，指向递归实现
function searchData2(list, keyword) {
  return searchDataRecursive(list, keyword);
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
      // return <IconTag className={styles.icon} />;
      return <IconFile className={styles.icon} />;
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



function UserNavigate() {

  const urlParams = getUrlParams();
  const history = useHistory();
  const pathname = history.location.pathname;
  const currentComponent = qs.parseUrl(pathname).url.slice(1);
  const locale = useLocale();
  const [navbarKeyWord, setNavbarKeyWord] = useState('');

  // console.log('render user navigate...navbarKeyWord=>', navbarKeyWord)

  // const globalState = useSelector((state: RootState) => state.global);
  // const { settings, userLoading, userInfo, tags, dataByGroup, dataByDate, dataByDomain, pageId,
  //   hiddenGroup, loadedBookmarks } = globalState;

  // console.log('!!!!!!!!!!!!! index ', dataByGroup, dataByDate);

  const {
    settings,
    userLoading,
    userInfo,
    dataByGroup,
    dataByDate,
    dataByDomain,
    hiddenGroup,
    loadedBookmarks,
  } = useSelector(
    (state: RootState) => ({
      settings: state.global.settings,
      // userInfo: state.global.userInfo,
      dataByGroup: state.global.dataByGroup,
      dataByDate: state.global.dataByDate,
      // toUpdateGroupTypes: state.global.toUpdateGroupTypes,
      dataByDomain: state.global.dataByDomain,
      hiddenGroup: state.global.hiddenGroup,
      loadedBookmarks: state.global.loadedBookmarks,
    }),
    shallowEqual
  );

  // const selectedTags = tags.selectedTags;
  /*  const selectedTags = useSelector(//仅依赖tags中的selectedTags
     (state: RootState) => state.global.tags.selectedTags,
     shallowEqual
   ); */

  const group3Bookmarks = useMemo(() => ([
    { data: dataByGroup, value: 0 },
    { data: dataByDate, value: 1 },
    { data: dataByDomain, value: 2 }
  ]), [dataByGroup, dataByDate, dataByDomain]);


  useEffect(() => {
    const data = group3Bookmarks.find(g => g.value === dataType)?.data || [];
    // console.log('1111111111111111 useEffect group3Bookmarks group3Bookmarks', dataType, group3Bookmarks);
    setList(data);
    group3Ref.current = group3Bookmarks;
  }, [group3Bookmarks]);//书签页数据发生变化

  const group3Ref = useRef(group3Bookmarks);

  /*   useEffect(() => {
      console.log('00000000000000   selectedTags=', selectedTags, toUpdateGroupTypes);
      // fetchDefaultPageBookmarksData();
      setFilterTags(selectedTags);//标签筛选发生变化，重新渲染整个页面，
      if (toUpdateGroupTypes.length > 0) {
        // getLatestBookmarksData();
        // setList(data);
      }
    }, [selectedTags]);//仅在初次加载组件时候执行(pageId未设置到redux状态)  */

  function onTreeTypeChange(value) {
    // const data = group3Bookmarks.find(g => g.value === value)?.data || [];
    // setList(data);
    setDataType(value);
    const data = group3Ref.current.find(g => g.value === value)?.data || [];
    setList(data);
  }

  const [list, setList] = useState([]);//右侧书签数据
  console.log('!!!!!!!!!!!!! index ', list);//查看index页面有无重新渲染

  const [dataType, setDataType] = useState(0);//数据组织类型：0：按分组；1：按时间

  const [hasResult, setHasResult] = useState(true);
  // const [data, setData] = useState(hiddenGroup ? filterHideItems(groups) : groups);

  // const [filterFromAll, setFilterFromAll] = useState(hiddenGroup ? filterHideItems(groups) : groups);
  // const [filterFromAll, setFilterFromAll] = useState(groups);
  // const [filterFromAll, setFilterFromAll] = useState(dataGroups);
  // const [bookmarkPages, setBookmarkPages] = useState([]);
  // const [currentPage, setCurrentPage] = useState(null);

  const [routes, defaultRoute] = useNavi(userInfo?.permissions);
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

  // const flattenRoutes = useMemo(() => getFlattenRoutes(routes) || [], [routes]);
  // 点击(菜单)回调
  function onClickMenuItem(key, e, keyPath) {//key
    // console.log('onClickMenuItem', keyPath);
    if (key.indexOf(',') !== -1) {
      // const stringArray: string[] = key.split(',');
      // const activeCardTab: number[] = stringArray.map(Number);
      const activeCardTab: string[] = key.split(',');
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

  const contentWrapperRef = useRef<HTMLDivElement | null>(null);

  const [treeSelected, setTreeSelected] = useState([]);
  const [treeSelectedKeys, setTreeSelectedKeys] = useState([]);
  // const [treeInputValue, setTreeInputValue] = useState('');

  // 接收Tree传过来的选中项
  const getTreeSelect = (selected) => {
    // console.log('00000000000000 user  getTreeSelect selected=', selected);
    // const value = selected[0];
    const value = selected;
    const stringArray: string[] = value.split(',');
    const activeCardTab: string[] = stringArray.map(String);
    setTreeSelected(activeCardTab);
  }


  // 接受NavBar传过来的切换隐藏/显示
  const getAllDisplay = () => {
    // console.log('user navigate getAllDisplay', display);
    /*  setDisplay(display);//用于传递(卡片?)切换显示/隐藏
     //显示
     if (display) {//不搜索
       if (!treeInputValue || !treeInputValue.trim()) {
         setData(list);
       } else {//搜索结果
         setData(searchFromAll)//在搜索结果上显示隐藏的
       }
     }
     //隐藏
     else {
       // console.log(">>>>>>>>>>隐藏");
       //设置已过滤的
       const result = filterHideItems(list)
       setFilterFromAll(result);//从全部数据中过滤
       if (!treeInputValue || !treeInputValue.trim()) {
         setData(result)//不搜索：显示过滤的结果
       } else {
         //搜索：显示搜索后过滤的结果
         setData(filterHideItems(searchFromAll))//在原有(搜索)结果上过滤隐藏
       }
     } */
  }

  // 接收Card-Tab传过来的选中项['card_id,tab_id']
  const getCardTabActive = (activeValue) => {
    // console.log('user navigate getCardTabActive', activeValue)
    setTreeSelectedKeys(activeValue);
  }

  // let hasResult = true;
  // 接收NavBar传过来的搜索关键词
  const getNavBarKey = (keyword) => {
    setNavbarKeyWord(keyword);
    dispatch(updateSearchState({ keyword: keyword }));
    // 关键词过滤
    if (!keyword || !keyword.trim()) {
      setHasResult(true);
    } else {//不为空
      const hasResult = searchData2(list, keyword);
      // console.log('00000000000 search', keyword, hasResult);
      setHasResult(hasResult);
      saveSearchHistory(keyword.trim());
    }
    // setNavbarKeyWord(keyword)
  }


  const dispatch = useDispatch();
  // 获取用户信息和标签数据
  function setUserInfo() {
    const userInfo = cache.session.getJSON('user');
    const page = cache.session.getJSON('page');//当前标签页
    if (userInfo && page) {//两个都要存在,缺一不可
      dispatch(updateUserInfo({ userInfo, userLoading: false }))
      // dispatch(asyncUserPages(page));
      //刷新页面后defaultPage变为空,但是获取标签页数据需要用到defaultPage
      return page.defaultPage;
    } else {
      // window.location.href = '/login';
    }
  }

  // 获取数据
  /*   const getData = () => {
      axios
        //.get('/api/cardList')  //mock
        .get(`${api}/navigation`)
        .then((res) => {
          setList(res.data);//Card
          setData(res.data);//Menu
        })
        .finally(() => setLoading(false));
    }; */



  /*   const fetchDefaultPageBookmarksData = async () => {
      //没有缓存到localStorage中
      const pages: any = await dispatch(reloadUserPages());//加载所有书签页->Redux
      setBookmarkPages(pages);
      if (pages.length > 0) {//只有用户存在标签数据才能查询
        const defaultPage = pages.find(page => page.default === true);
        const pageId = defaultPage ? defaultPage.pageId : pages[0].pageId;//获取默认展示的书签页
        setCurrentPage(pageId);
        const data: any = await dispatch(fetchBookmarksPageData(pageId));//获取当前书签页的分组和书签数据
        setList(data);//Card 全部的
        setHideGroup(hiddenGroup)//这个不能变->NavBar展示开关
        setLoading(false);
      }
    }; */


  useEffect(() => {
    if (loadedBookmarks && loadedBookmarks.length > 0) {
      loadedBookmarks.forEach(bookmark => {
        setTimeout(() => {
          Message.success(`成功加载书签: '${bookmark.name}'`);
        }, 1000);
      });
    }
  }, [loadedBookmarks]);


  /*   const filteredData = useMemo(() => {
      if (hiddenGroup) {//有隐藏的分组，进行过滤
        return filterHideItems(dataByGroup);
      }
      setList(dataByGroup);
      setHideGroup(hiddenGroup);//这个不能变->NavBar展示开关
      return dataByGroup;
    }, [dataByGroup, hiddenGroup]); */

  /*   useEffect(() => {
      // setTreeDatas(filteredData);//TreeDatas应该从TreeData进行处理
      setTreeDatas(dataGroups);
    }, [dataGroups]);// */

  /*原来的 const filteredData = useMemo(() => {
      if (hiddenGroup) {//有隐藏的分组，进行过滤
        return filterHideItems(groups);
      }
    }, [hiddenGroup]); */

  /*   useEffect(() => {
      // setTreeDatas(filteredData);//TreeDatas应该从TreeData进行处理
      setFilterFromAll(filteredData);
    }, [filteredData]);// */

  function scrollToAnchor(event, path) {
    // console.log('scrollToAnchor', path);
    const pathArr: string[] = path.split(",");
    event.preventDefault(); // 阻止默认的锚点跳转
    const targetElement = document.getElementById(pathArr[0]);
    if (targetElement) {
      targetElement.scrollIntoView({
        behavior: 'smooth' // 可选：平滑滚动
      });
    }
  }

  /*   useEffect(() => {
      console.log('搜索词或显示隐藏变化')
    }, [display, treeInputValue]); */

  // 渲染MenuItem
  function renderRoutes(locale) {
    // routeMap.current.clear();
    // console.log('renderRoutes')
    return function travel(_routes: INavi[], level, parentNode = []) {
      return _routes.map((route) => {
        const { breadcrumb = true, ignore } = route;
        //根据key获取图标
        // const iconDom = getIconFromKey(route.key);
        //二级目录没有图标
        // const iconDom = route.pId ? '' : getIconFromKey(route.id);
        // const iconDom = <IconFile className={styles.icon} />;

        const iconDom = route.children && route.children.length > 0 ? <IconFolder className={styles.icon} /> : <IconFile className={styles.icon} />;
        // const pid = route.pid;
        // onClick = {(event) => scrollToAnchor(event, {`${hrefId}`})

        {/* {iconDom} {locale[route.name] || route.name} */ }
        const hrefId = route.pId ? route.pId : route.id;
        /*  const titleDom = (
           <>
             {<AnchorLink href={`#${hrefId}`}
               title={
                 <> {iconDom} {route.name}</>
                 // route.pid ?
                 //   <> <a href="javascript:void(0)" ref={linkRef} onClick={() => onMenuClick(route.id, route.pid)}> {iconDom}<span>{route.name}</span></a></>
                 //   : <> {iconDom} {route.name}</>
               }
             >
             </AnchorLink>}
           </>
         ); */

        const titleDom = (
          // {iconDom} {locale[route.name] || route.name}
          <AnchorLink title={<> {iconDom} {route.name}</>} onClick={(event) => scrollToAnchor(event, `${hrefId}`)} />
        )
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
  }

  return (
    <Layout className={styles.layout}>
      <div
        className={cs(styles['layout-navbar'], {
          [styles['layout-navbar-hidden']]: !showNavbar,
        })}
      >
        {/* filterDataByTags={filterDataByTags} */}
        {/* num={groups.length} */}
        {/* pageNo={currentPage} */}
        <Navbar show={showNavbar} pageType={'bookmarks'} setNavBarKey={getNavBarKey} setAllDisplay={getAllDisplay} />

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
                    onClickMenuItem(key, openKeys, keyPath)
                    setOpenKeys(openKeys);
                  }}
                >

                  {/* 按时间，月-展开分组；按分组，嵌套分组 */}
                  {renderRoutes(locale)(list, 1)}
                </Menu>
                  :
                  <Tree setTreeSelected={getTreeSelect}
                    treeSelectedKeys={treeSelectedKeys}
                    setTreeType={onTreeTypeChange}
                  >
                  </Tree>
                }
              </div>
              <div className={styles['collapse-btn']} onClick={toggleCollapse}>
                {collapsed ? <IconMenuUnfold /> : <IconMenuFold />}
              </div>
            </Sider>
          )}
          <Layout className={styles['layout-content']} style={paddingStyle}>
            <div ref={contentWrapperRef} className={styles['layout-content-wrapper']}>
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
                <Navi activeCardTab={treeSelected}
                  dataType={dataType}
                  keyWord={navbarKeyWord}
                  setCardTabActive={getCardTabActive}
                  list={list}
                  // tags={tags}
                  // tags={filterTags}
                  loading={loading}>
                </Navi>
              </Content>

              {showFooter && <Footer />}
            </div>
            {/* <BackToTop></BackToTop> */}

            {/* <div
              style={{
                position: 'absolute',
                display: 'inline-block',
                right: '60px',
                bottom: '5px',
              }}>
              <AnchorLink href={`#27`} title={'回到顶部'}> <IconCaretUp /></AnchorLink>
            </div> */}
            <BackToTop container={contentWrapperRef.current} threshold={200}></BackToTop>
          </Layout>
        </Layout>


      )
      }
    </Layout >
  );
}

export default UserNavigate;
