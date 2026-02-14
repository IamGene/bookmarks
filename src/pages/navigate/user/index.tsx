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
import { useDispatch, useSelector } from 'react-redux';
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
import { updateUserInfo, reloadUserPages, fetchBookmarksPageData, updateSearchState } from '@/store/modules/global';
import { generatePermission } from '@/routes';
import Navi from './navigate';
import { getPages, saveSearchHistory, getBookmarkById, getBookmarkGroupById } from "@/db/bookmarksPages";
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

  const { settings, userLoading, userInfo, dataByGroup, dataByDate, tagsMap, pageId,
    activeGroup, treeData, hiddenGroup, loadedBookmarks } = globalState;

  // console.log('!!!!!!!!!!!!! index ', dataByGroup, hiddenGroup);

  const [list, setList] = useState(dataByGroup);//右侧书签数据
  const [dataType, setDataType] = useState(0);//数据组织类型：0：按分组；1：按时间

  const [hasResult, setHasResult] = useState(true);
  const [display, setDisplay] = useState(!hiddenGroup);//false

  const [hideGroup, setHideGroup] = useState(hiddenGroup);
  // const [data, setData] = useState(hiddenGroup ? filterHideItems(groups) : groups);
  const [data, setData] = useState(dataByGroup);

  const [treeDatas, setTreeDatas] = useState(treeData);
  const [searchFromAll, setSearchFromAll] = useState(data);
  // const [filterFromAll, setFilterFromAll] = useState(hiddenGroup ? filterHideItems(groups) : groups);

  // const [filterFromAll, setFilterFromAll] = useState(groups);
  const [filterFromAll, setFilterFromAll] = useState(treeData);

  const [bookmarkPages, setBookmarkPages] = useState([]);
  const [currentPage, setCurrentPage] = useState(null);

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


  function onTreeTypeChange(value) {
    if (value === '按时间') {
      setDataType(1);
      // setList(dataByDate);
    } else if (value === '按分组') {
      setDataType(0);
      // setList(dataByGroup);
      // setGroups(groups);
    }
  }

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

  const [treeSelected, setTreeSelected] = useState([]);
  const [treeSelectedKeys, setTreeSelectedKeys] = useState([]);
  const [treeInputValue, setTreeInputValue] = useState('');
  const [tags, setTags] = useState([]);

  // 接收Tree传过来的选中项
  const getTreeSelect = (selected) => {
    const value = selected[0];
    const stringArray: string[] = value.split(',');
    const activeCardTab: string[] = stringArray.map(String);
    setTreeSelected(activeCardTab);
  }

  // 接收Tree传过来的关键词过滤后的数据


  async function filterDataByTags(tags: any[]) {
    setTags(tags);
    // console.log('user navigate filterDataByTags tags=', tags);
    if (!Array.isArray(tags) || tags.length === 0) {
      if (dataByGroup && dataByGroup.length > 0) {
        setList(dataByGroup);
      }
      return;
    }
    setNavbarKeyWord(null);//停用搜索功能

    // 收集所有 tag.key
    const keys = tags.map(t => (t && t.key) ? String(t.key) : (typeof t === 'string' ? t : null)).filter(Boolean);
    // 合并 tagsMap 中对应的 id 列表
    const idSet = new Set<string>();
    if (tagsMap) {//key:[bookmarkIds]
      for (const k of keys) {
        const val = tagsMap[k];
        if (Array.isArray(val)) {
          for (const id of val) idSet.add(String(id));
        }
      }
    }

    const ids = Array.from(idSet);
    const matchedBookmarks = await Promise.all(ids.map(id => getBookmarkById(id)));
    // console.log('2222222222222222222 matchedBookmarks', matchedBookmarks);
    // 根据 matchedBookmarks 的 gId 去重，然后逐个调用 getBookmarkGroupById
    const gIdSet = new Set<string>();
    (matchedBookmarks || []).forEach((b) => {
      gIdSet.add(String(b.gId));
    });
    if (gIdSet.size > 0) {
      const gIds = Array.from(gIdSet);
      const groups = await Promise.all(gIds.map((gid) => getBookmarkGroupById(gid)));
      const pGroups = [];
      // 将 matchedBookmarks 分配到对应的 group.bookmarks（按 gId 匹配）
      if (Array.isArray(groups) && groups.length > 0) {
        groups.forEach((group) => {
          if (!Array.isArray(group.bookmarks)) group.bookmarks = [];
          const matched = (matchedBookmarks || []).filter((b) => b && String(b.gId) === String(group.id));
          matched.forEach((m) => group.bookmarks.push(m));
        });

        // 构建父子分组结构：
        // 1. 收集 groups 中所有不同的 pId（去重）
        // 2. 对于每个 group，若 pId 为空则直接加入 pGroups；否则查询其父分组并将该 group 添加到父分组的 children
        // 3. 向上递归，如果父分组还有 pId 则继续查询并把子分组添加到更上层的 children，直到最顶层，将最顶层加入 pGroups
        const parentCache = new Map<string, any>();
        // 已存在的 pGroups 变量在作用域内
        for (const group of groups) {
          if (!group) continue;
          // 如果自身没有父级，直接作为顶层分组
          if (!group.pId && group.pId !== 0) {
            if (!pGroups.find((g) => String(g.id) === String(group.id))) pGroups.push(group);
            continue;
          }

          // 查找直接父分组
          const parentId = String(group.pId);
          let parent = parentCache.get(parentId);
          if (!parent) {
            parent = await getBookmarkGroupById(parentId);
            parentCache.set(parentId, parent);
          }

          if (parent) {
            if (!Array.isArray(parent.children)) parent.children = [];
            if (!parent.children.find((c) => String(c.id) === String(group.id))) parent.children.push(group);

            // 向上递归把 parent 加入其上级的 children，直到最顶层
            let ancestor = parent;
            while (ancestor && ancestor.pId) {
              const ancParentId = String(ancestor.pId);
              let ancParent = parentCache.get(ancParentId);
              if (!ancParent) {
                ancParent = await getBookmarkGroupById(ancParentId);
                parentCache.set(ancParentId, ancParent);
              }
              if (!ancParent) break;
              if (!Array.isArray(ancParent.children)) ancParent.children = [];
              if (!ancParent.children.find((c) => String(c.id) === String(ancestor.id))) ancParent.children.push(ancestor);
              ancestor = ancParent;
            }

            // ancestor 为最顶层（没有 pId 的分组），加入 pGroups
            if (ancestor) {
              if (!pGroups.find((g) => String(g.id) === String(ancestor.id))) pGroups.push(ancestor);
            }
          } else {
            // 未找到父分组时，将当前 group 作为顶层分组处理
            if (!pGroups.find((g) => String(g.id) === String(group.id))) pGroups.push(group);
          }
        }


        // 为每个顶层分组设置 tags 属性：
        // tags 属性为传入的 tags 数组中，与该顶层分组子树内的书签存在交集的那些 tag 对象
        if (Array.isArray(pGroups) && pGroups.length > 0 && Array.isArray(tags) && tags.length > 0) {
          // 帮助函数：从节点子树中收集所有书签 id
          const getBookmarkId = (b) => String(b && (b.id ?? ''));
          const collectBookmarkIds = (root) => {
            const idSet = new Set();
            const dfs = (node) => {
              if (!node) return;
              if (Array.isArray(node.bookmarks)) {
                node.bookmarks.forEach((bk) => {
                  const bid = getBookmarkId(bk);
                  if (bid) idSet.add(bid);
                });
              }
              if (Array.isArray(node.children)) {
                node.children.forEach((c) => dfs(c));
              }
            };
            dfs(root);
            return idSet;
          };

          for (const p of pGroups) {
            const bookmarkIds = collectBookmarkIds(p);//本分组中所有筛选的书签ids
            const matchedTags = (tags || []).filter((t) => {
              // `t` 可能是一个对象（包含 `key` 属性），也可能直接是字符串形式的 tag
              // 优先取对象的 `key`，否则如果 `t` 本身就是字符串则当作 key
              // const key = t && t.key ? String(t.key) : (typeof t === 'string' ? String(t) : null);
              const key = t.key;
              // 从全局 `tagsMap` 中获取该 tag 对应的书签 id 列表（若不存在则为空数组）
              const idsForTag = (tagsMap && tagsMap[key]) || [];
              // 判断该 tag 对应的任一书签 id 是否存在于当前分组的 bookmarkIds 集合中
              return idsForTag.some((id) => bookmarkIds.has(String(id)));
            });
            p.tags = matchedTags;
          }
        }
        // console.log('user navigate filterDataByTags pGroups=', pGroups);
        setList(pGroups);
      }
    }


  }

  // 接收Tree传过来的关键词
  const getTreeInputValue = (inputValue) => {
    // console.log('aaaa', inputValue);
    setTreeInputValue(inputValue);
    if (!inputValue || !inputValue.trim()) {//搜索词为空
      if (display) {//显示隐藏
        // setData(list);
        // setTreeDatas(list);
        setTreeDatas(treeData);
      } else {//显示已过滤隐藏
        setTreeDatas(filterFromAll);//在搜索结果上显示隐藏的
      }
    } else {//搜索词不为空
      // const result = searchData(inputValue.trim(), list);
      const result = searchData(inputValue.trim(), treeData);
      setSearchFromAll(result);//
      // console.log('getTreeInputValue', list, inputValue, result);
      if (display) {//在全部数据的基础上搜索
        // console.log('33333 getTreeInputValue', inputValue, result);
        setTreeDatas(result);
      } else {//在有隐藏项的基础上搜索
        const result = searchData(inputValue.trim(), data);
        setTreeDatas(result);
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

  /*  const fetchBookmarksData = async (page: number) => {
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


  /*   useEffect(() => {
      // fetchDefaultPageBookmarksData();
    }, []);//仅在初次加载组件时候执行(pageId未设置到redux状态) */

  useEffect(() => {
    if (loadedBookmarks && loadedBookmarks.length > 0) {
      loadedBookmarks.forEach(bookmark => {
        setTimeout(() => {
          Message.success(`成功加载书签: '${bookmark.name}'`);
        }, 1000);
      });
    }
  }, [loadedBookmarks]);


  const filteredData = useMemo(() => {
    if (hiddenGroup) {//有隐藏的分组，进行过滤
      return filterHideItems(dataByGroup);
    }
    setList(dataByGroup);
    setHideGroup(hiddenGroup);//这个不能变->NavBar展示开关
    return dataByGroup;
  }, [dataByGroup, hiddenGroup]);

  useEffect(() => {
    // setTreeDatas(filteredData);//TreeDatas应该从TreeData进行处理
    setTreeDatas(treeData);
  }, [treeData]);//

  /*原来的 const filteredData = useMemo(() => {
      if (hiddenGroup) {//有隐藏的分组，进行过滤
        return filterHideItems(groups);
      }
    }, [hiddenGroup]); */

  useEffect(() => {
    // setTreeDatas(filteredData);//TreeDatas应该从TreeData进行处理
    setFilterFromAll(filteredData);
  }, [filteredData]);//


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
        {/* pageNo={currentPage} */}
        <Navbar show={showNavbar} pageType={'bookmarks'} filterDataByTags={filterDataByTags} pageId={pageId} display={hideGroup ? hiddenGroup : null} setNavBarKey={getNavBarKey} setAllDisplay={getAllDisplay} />

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
                    data={treeDatas}
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
                {/* Card-Tab列表 hasResult={hasResult} tags={tags} */}
                <Navi activeCardTab={treeSelected}
                  dataType={dataType}
                  display={display}
                  keyWord={navbarKeyWord}
                  setCardTabActive={getCardTabActive}
                  hasResult={hasResult}
                  list={dataType == 0 ? dataByGroup : dataByDate}
                  loading={loading}>
                </Navi>
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
