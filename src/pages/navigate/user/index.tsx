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
import { useDispatch, useSelector } from 'react-redux'
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
import { updateUserInfo, updateUserPage, updateTagGroups, fetchBookmarksPageData } from '@/store/modules/global';
import { generatePermission } from '@/routes';
import Navi from './navigate';
import { getPages } from "@/db/bookmarksPages";
import BackToTop from '../common/back-to-top';
import styles from '@/style/layout.module.less';
// import { fetchGroupData } from './common';
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
function searchData1(list, keyword) {
  let hasResult: boolean = false;
  const regex = new RegExp(`(${keyword})`, 'gi');
  for (let i = 0; i < list.length; i++) {
    const data = list[i];
    if (data.urlList && data.urlList.length > 0) {
      //重复
      const urlList = data.urlList;
      for (let k = 0; k < urlList.length; k++) {
        const navi = urlList[k];
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
        const urlList = children[j].urlList;
        if (urlList && urlList.length > 0) {
          for (let k = 0; k < urlList.length; k++) {
            const navi = urlList[k];
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

//过滤隐藏的项
function filterHideItems(treeData) {
  const filter = (data) => {
    const result = [];
    data.forEach((item) => {
      if (!item.hide) {
        //有子分组
        if (item.children && item.children.length > 0) {
          const filterData = filter(item.children);
          if (filterData.length) {
            result.push({ ...item, children: filterData });
          }
        } else {
          result.push({ ...item });
        }
      }
    });
    return result;
  };
  return filter(treeData);
}

function searchAndFilterData(inputValue, treeData, display) {
  const loop = (data) => {
    const result = [];
    data.forEach((item) => {
      if ((!inputValue || !inputValue.trim()) && item.name.toLowerCase().indexOf(inputValue.toLowerCase()) > -1) {
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

  //如果搜索词为空且不过滤隐藏
  if ((!inputValue || !inputValue.trim()) && display) return treeData;
  return loop(treeData);
}

function UserNavigate() {

  const urlParams = getUrlParams();
  const history = useHistory();
  const pathname = history.location.pathname;
  const currentComponent = qs.parseUrl(pathname).url.slice(1);
  const locale = useLocale();
  const [navbarKeyWord, setNavbarKeyWord] = useState('');

  // console.log('render user navigate...navbarKeyWord=>', navbarKeyWord)

  const globalState = useSelector((state: RootState) => state.global);

  const { settings, userLoading, userInfo, groups, activeGroup, hiddenGroup, loadedBookmarks } = globalState;

  // console.log('!!!!!!!!!!!!! index activeGroup', groups, activeGroup, hiddenGroup);

  const [list, setList] = useState(groups);
  const [hasResult, setHasResult] = useState(true);
  const [display, setDisplay] = useState(hiddenGroup);//false

  const [hideGroup, setHideGroup] = useState(hiddenGroup);
  // const [data, setData] = useState(hiddenGroup ? filterHideItems(groups) : groups);
  const [data, setData] = useState(groups);
  const [searchFromAll, setSearchFromAll] = useState(data);
  // const [filterFromAll, setFilterFromAll] = useState(hiddenGroup ? filterHideItems(groups) : groups);
  const [filterFromAll, setFilterFromAll] = useState(groups);
  const [bookmarkPages, setBookmarkPages] = useState([]);
  const [currentPage, setCurrentPage] = useState();

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
    // const activeCardTab: number[] = stringArray.map(Number);
    const activeCardTab: string[] = stringArray.map(String);
    // console.log('==========user navigate getTreeSelect', selected, activeCardTab);
    setTreeSelected(activeCardTab);
  }

  // 接收Tree传过来的关键词过滤后的数据
  const getTreeSearchData = (treeData) => {
    setData(treeData);
  }

  // 接收Tree传过来的关键词
  const getTreeInputValue = (inputValue) => {
    setTreeInputValue(inputValue);
    if (!inputValue || !inputValue.trim()) {//搜索词为空
      if (display) {//显示隐藏
        setData(list);
      } else {//显示已过滤隐藏
        setData(filterFromAll);//在搜索结果上显示隐藏的
      }
    } else {//搜索词不为空
      const result = searchData(inputValue.trim(), list);
      setSearchFromAll(result);//
      // console.log('getTreeInputValue', list, inputValue, result);
      if (display) {//在全部数据的基础上搜索
        setData(result);
      } else {//在有隐藏项的基础上搜索
        const result = searchData(inputValue.trim(), data);
        setData(result);
      }
    }
  }

  // 接受NavBar传过来的切换隐藏/显示
  const getAllDisplay = (display) => {
    // console.log('user navigate getAllDisplay', display);
    setDisplay(display);//用于传递(卡片?)切换显示/隐藏
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
    }
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
    // 关键词过滤
    if (!keyword || !keyword.trim()) {
      setHasResult(true);
    } else {//不为空
      const hasResult = searchData1(list, keyword);
      setHasResult(hasResult);
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
      dispatch(updateUserPage(page))
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

  const fetchBookmarksData = async (page: number) => {
    // const { groups, hiddenGroup } = globalState;
    // console.log('pages', pages);
    if (!groups || groups.length === 0) {//没有缓存到localStorage中
      //如果Redux中没有数据才进行获取,localStorage中没有？
      // 刷新时defaultPage变为空
      // if (page || defaultPage) {//只有用户存在标签数据才能查询
      const pages = await getPages();
      setBookmarkPages(pages);
      if (pages.length > 0) {//只有用户存在标签数据才能查询
        // const data: any = await dispatch(fetchTagGroupsData(defaultPage ? defaultPage : page));
        const defaultPage = pages.find(page => page.default === true);
        const pageId = defaultPage ? defaultPage.pageId : pages[0].pageId;
        setCurrentPage(pageId);
        const data: any = await dispatch(fetchBookmarksPageData(pageId));
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (loadedBookmarks && loadedBookmarks.length > 0) {
      loadedBookmarks.forEach(bookmark => {
        setTimeout(() => {
          Message.success(`成功加载书签: '${bookmark.name}'`);
        }, 1000);
      });
    }
  }, [loadedBookmarks]);

  useEffect(() => {
    // console.log('888888888888888888888 user navigate useEffect groups', groups)
    fetchBookmarksData(1760173696766);// getNaviData();
    setList(groups);//Card 全部的
    setHideGroup(hiddenGroup)//这个不能变->NavBar展示开关
    // setDisplay(!hiddenGroup);//显示与否直接由导航栏的开关控制
  }, [groups]);

  const filteredData = useMemo(() => {
    if (hiddenGroup) {//有隐藏的分组，进行过滤
      return filterHideItems(groups);
    }
    return groups;
  }, [groups, hiddenGroup]);


  useEffect(() => {
    setData(filteredData);//Tree
    setFilterFromAll(filteredData);
  }, [filteredData]);//

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

        {/* num={groups.length} */}
        <Navbar show={showNavbar} pageNo={currentPage} pages={bookmarkPages} display={hideGroup ? hiddenGroup : null} setNavBarKey={getNavBarKey} setAllDisplay={getAllDisplay} />
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
                  {renderRoutes(locale)(data, 1)}
                </Menu>
                  :
                  <Tree setTreeSelected={getTreeSelect}
                    treeSelectedKeys={treeSelectedKeys}
                    // data={data}
                    data={data}
                    inputValue={treeInputValue}
                    setTreeInputValue={getTreeInputValue}>
                  </Tree>
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
                {/* Card-Tab列表 hasResult={hasResult}  */}
                <Navi activeCardTab={treeSelected} display={display} keyWord={navbarKeyWord} activeGroup={activeGroup} setCardTabActive={getCardTabActive} hasResult={hasResult} list={list} loading={loading}></Navi>
              </Content>
            </div>
            {showFooter && <Footer />}

            <BackToTop></BackToTop>

            {/* <div
              style={{
                position: 'absolute',
                display: 'inline-block',
                right: '60px',
                bottom: '5px',
              }}>
              <AnchorLink href={`#27`} title={'回到顶部'}> <IconCaretUp /></AnchorLink>
            </div> */}
          </Layout>
        </Layout>
      )
      }
    </Layout >
  );
}

export default UserNavigate;
