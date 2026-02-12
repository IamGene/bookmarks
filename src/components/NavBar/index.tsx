import React, { useContext, useEffect, useState, useRef } from 'react';
import {
  Tooltip,
  Input,
  Avatar,
  Select,
  Dropdown,
  Tag,
  Trigger,
  Tabs,
  Spin,
  Menu,
  List,
  AutoComplete,
  Divider,
  Message,
  Upload,
  Button,
} from '@arco-design/web-react';
import {
  IconLanguage,
  IconNotification,
  IconSunFill,
  IconHome,
  IconTags,
  IconDelete,
  IconMoonFill,
  IconEyeInvisible,
  IconEye,
  IconNav,
  IconUser,
  IconSettings,
  IconPoweroff,
  IconExperiment,
  IconPlus,
  IconDashboard,
  IconInteraction,
  IconTag,
  IconLoading,
} from '@arco-design/web-react/icon';
import { useSelector, useDispatch } from 'react-redux';
import { useFetchPageData } from '@/hooks/fetchPageData';
// import { GlobalState } from '@/info';
import { GlobalContext } from '@/context';
import useLocale from '@/utils/useLocale';
import Logo from '@/assets/logo.svg';
import MessageBox from '@/components/MessageBox';
import Bookmarks from '@/components/Bookmarks';
import SearchHistory from '@/components/SearchHistory';
import Tags from '@/components/Tags';
import { TagContext } from '@/components/Tags/context';
import IconButton from './IconButton';
import Settings from '../Settings';
import styles from './style/index.module.less';
import defaultLocale from '@/locale';
import useStorage from '@/utils/useStorage';
import { generatePermission } from '@/routes';
import { removeToken } from '@/utils1/auth';
import { useStore } from '@/store1';
import CreatePageGroup from '@/pages/navigate/user/form/add_page_group';
import { reloadUserPages, fetchBookmarksPageData } from '@/store/modules/global';
// const api = import.meta.env.VITE_REACT_APP_BASE_API;
import { useHistory } from 'react-router-dom';

function Navbar({ pageType, pageId, filterDataByTags, show, display, setNavBarKey, setAllDisplay }) {

  const t = useLocale();
  const dispatch = useDispatch();
  // const [bookmarkPages, setBookmarkPages] = useState(pages);
  const [bookmarkPages, setBookmarkPages] = useState([]);
  const globalState = useSelector((state: any) => state.global);
  const { userInfo, userLoading, pages, tagsMap, currentPage } = globalState;
  const history = useHistory();
  const [currentPageId, setCurrentPageId] = useState(null);//pageNo
  const [keyword, setKeyword] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState(undefined);
  function setCurrentPage(pageId) {
    setCurrentPageId(pageId);
    // setSelectedTags([]);
  }


  const setDefaultPageBookmarksData = async (pages) => {
    if (pages && pages.length > 0 && pageType === 'bookmarks') {//只有用户存在标签数据才能查询
      const defaultPage = pages.find(page => page.default === true);
      const pageId = defaultPage ? defaultPage.pageId : pages[0].pageId;//获取默认展示的书签页
      setCurrentPage(pageId);
      const data: any = await dispatch(fetchBookmarksPageData(pageId));//获取当前书签页的分组和书签数据
      // setList(data);//Card 全部的
      // setHideGroup(hiddenGroup)//这个不能变->NavBar展示开关
      // setLoading(false);
    }
    //没有缓存到localStorage中
    // if (!pages) { console.log('------------->pages 未加载', pages);
    /*  const pages1: any = await dispatch(reloadUserPages());//加载所有书签页->Redux
     setBookmarkPages(pages1);
    */

    /*  } else {//
       console.log('-------------<<< 已加载 pages', pages);
     } */

  };

  // const { userInfo, userLoading } = useSelector((state: GlobalState) => state);

  // console.log(" ===================currentPage=", currentPage);

  const [_, setUserStatus] = useStorage('userStatus');
  const [role, setRole] = useStorage('userRole', 'admin');

  const { setLang, lang, theme, setTheme } = useContext(GlobalContext);
  // const [createType, setCreateType] = useState("page");
  const { userStore } = useStore();
  const [tagsShow, setTagsShow] = useState(false)//一开始是隐藏的

  async function logout() {
    setUserStatus('logout');
    removeToken();
    const res = await userStore.LogOut();
    // window.location.href = '/login';
    history.replace('/login');//navigate
  }

  /*   useEffect(() => {
      setCurrentPageId(pageNo);
    }, [pageNo]); */

  useEffect(() => {
    setBookmarkPages(pages);
    setDefaultPageBookmarksData(pages);
  }, [pages]);


  // 监听搜索框输入变化
  const onInputChange = (key: string) => {
    // setNavBarKey(key);//搜索跟随输入
    setKeyword(key);//本地状态更新
    if (!key || key.trim().length === 0) {//清空搜索->重置数据
      setNavBarKey(key);//搜索跟随输入
      // setSearchKeyword(null);
    }
  }
  const onClickHistory = (word: string) => {
    // setNavBarKey(key);//搜索跟随输入
    // setKeyword(word);//本地状态更新
    setKeyword(word);//本地状态更新
    setNavBarKey(word);//搜索跟随输入
    setSearchKeyword(word);//传递给搜索历史子组件
    // console.log('点击搜索历史记录项：', word);
  }


  // 监听回车键
  const onEnterPress = (e) => {
    setNavBarKey(keyword);//回车搜索
    setSearchKeyword(keyword);//传递给搜索历史子组件
    // dispatch(addSearchHistory(keyword));//获取当前书签页的分组和书签数据
    // console.log('onEnterPress key=', key);
  }

  const [createNewForm, setCreateNewForm] = useState(false);//添加Tab

  const onCreateNew = () => {
    setCreateNewForm(true);
  }

  const onClickHome = () => {
    const href = window.location.href;
    const lastIndex = href.lastIndexOf('/');
    if (lastIndex > -1) {
      const last = href.substring(lastIndex + 1).trim();
      // console.log("href last", last);
      if (last.length > 0) {
        history.replace('');
      } else {
        // Message.info('您已经在导航页了哦!');
        Message.info(t['bookmarks.page.home.tips']);
      }
    }
    //其他情况：首页，无路径名
  }

  // 监听显示/隐藏切换
  const onToggleDisplay = () => {
    setAllDisplay(!tagsShow)
    setTagsShow(tagsShow ? false : true)
  }

  function onMenuItemClick(key) {
    if (key === 'logout') {
      logout();
    } else {
      Message.info(`You clicked ${key}`);
    }
  }

  useEffect(() => {
    dispatch({
      type: 'update-userInfo',
      payload: {
        userInfo: {
          ...userInfo,
          permissions: generatePermission(role),
        },
      },
    });
  }, [role]);

  if (!show) {
    return (
      <div className={styles['fixed-settings']}>
        <Settings
          trigger={
            <Button icon={<IconSettings />} type="primary" size="large" />
          }
        />
      </div>
    );
  }

  const handleChangeRole = () => {
    const newRole = role === 'admin' ? 'user' : 'admin';
    setRole(newRole);
  };

  const droplist = (
    <Menu onClickMenuItem={onMenuItemClick}>
      <Menu.SubMenu
        key="role"
        title={
          <>
            <IconUser className={styles['dropdown-icon']} />
            <span className={styles['user-role']}>
              {role === 'admin'
                ? t['menu.user.role.admin']
                : t['menu.user.role.user']}
            </span>
          </>
        }
      >
        <Menu.Item onClick={handleChangeRole} key="switch role">
          <IconTag className={styles['dropdown-icon']} />
          {t['menu.user.switchRoles']}
        </Menu.Item>
      </Menu.SubMenu>
      <Menu.Item key="setting">
        <IconSettings className={styles['dropdown-icon']} />
        {t['menu.user.setting']}
      </Menu.Item>
      <Menu.SubMenu
        key="more"
        title={
          <div style={{ width: 80 }}>
            <IconExperiment className={styles['dropdown-icon']} />
            {t['message.seeMore']}
          </div>
        }
      >
        <Menu.Item key="workplace">
          <IconDashboard className={styles['dropdown-icon']} />
          {t['menu.dashboard.workplace']}
        </Menu.Item>
        <Menu.Item key="card list">
          <IconInteraction className={styles['dropdown-icon']} />
          {t['menu.list.cardList']}
        </Menu.Item>
      </Menu.SubMenu>

      <Divider style={{ margin: '4px 0' }} />
      <Menu.Item key="logout">
        <IconPoweroff className={styles['dropdown-icon']} />
        {t['navbar.logout']}
      </Menu.Item>
    </Menu>
  );


  useEffect(() => {
    setSelectedTags([]);
  }, [currentPageId]);


  //提交成功后关闭或取消关闭Modal窗口
  const closeAddModal = async (success: boolean, type: number, pageId: number) => {
    // console.log('data', pageId);
    setCreateNewForm(false);
    if (success) {
      const pages: any = await dispatch(reloadUserPages());
      // const pages = await getPages();//刷新书签页数据
      if (type === 1) { //添加书签页
        const idx = pages.findIndex(p => p.pageId === pageId);
        if (idx !== -1) {
          // 不要就地修改可能是不可扩展/冻结的对象，使用不可变方式创建新数组和对象
          const updated = pages.map(p =>
            p.pageId === pageId ? { ...p, new: true } : p
          );
          setBookmarkPages(updated);
        } else {
          setBookmarkPages(pages);
        }
        // await dispatch(asyncUserPages(pages));
        // switchPageId(pageId);
      } else { //添加书签分组->刷新页面数据
        // switchPageId(pageId);
        // console.log('xxxxxxxxxxxxxxxxxx', currentPageId, pageId);
        if (currentPage.pageId === pageId) {
          await dispatch(fetchBookmarksPageData(pageId));//获取当前书签页的分组和书签数据
        } else {//非当前书签页
          const idx = pages.findIndex(p => p.pageId === pageId);
          if (idx !== -1) {
            // 不要就地修改可能是不可扩展/冻结的对象，使用不可变方式创建新数组和对象
            const updated = pages.map(p =>
              p.pageId === pageId ? { ...p, new: true } : p
            );
            setBookmarkPages(updated);
          }
        }
        // switchPageId(item.pageId);//切换显示数据
      }
      // setAddedBookmarkPages([data.pageId]);
    }
  }

  /* if (res) {
         // 清除之前的定时器（如果存在）
         if (data) {
           clearTimeout(timeoutId);
           // 设置新的定时器
           timeoutId = setTimeout(() => {
             window.location.href = `/navigate/user#${data.id}`;
           }, 800);//延时1秒，等组件重新渲染完毕
         }
       } */

  let timeoutId; // 用于存储 setTimeout 返回的标识符
  async function getGroupData() {
    try {
      const data: any = await dispatch(fetchBookmarksPageData(pageNo));
      return data;
    } catch (error) {
      return false;
    }
  }

  // 使用共享的 TagContext（不要在组件内重新创建）
  const [unselectedTag, setUnselectedTag] = useState<any>(null);
  function onTagClose(item) {
    // const key = item && item.key ? item.key : (typeof item === 'string' ? item : null);
    setUnselectedTag(item.key);
    setSelectedTags(prev => {
      const list = Array.isArray(prev) ? prev : [];
      return list.filter(x => !(x && x.key === item.key));
    });
  }

  const [selectedTags, setSelectedTags] = useState<any[]>([]);
  const tagsContainerRef = useRef<HTMLDivElement | null>(null);

  function onTagSwitch(value: { key: string; index: number; color: string; selected: boolean }) {
    // Normalize and validate incoming value
    // console.log('sssssssssssssssssss onTagSwitch value=', value, selectedTags);
    const key = value && typeof value.key === 'string' ? value.key : null;
    const color = value && value.color ? value.color : undefined;
    const index = typeof value.index === 'number' ? value.index : -1;
    const selected = !!value && !!value.selected;
    if (!key) {
      // invalid key, ignore
      return;
    }

    setSelectedTags(prev => {
      // Ensure prev is an array
      const list = Array.isArray(prev) ? prev : [];
      const exists = list.some(x => x && x.key === key);

      if (selected) {//选中
        if (exists) return list; // already selected
        // store a normalized object to keep shape consistent
        return [...list, { key, index, color, selected: true }];
      } else {
        return list.filter(x => !(x && x.key === key));
      }
      // deselect: remove any matching key

    });
  }

  useEffect(() => {
    // console.log("ssssssssssssssssssss NavBar selectedTags=", selectedTags);
    if (pageType === 'bookmarks') {
      filterDataByTags(selectedTags);
    }
  }, [selectedTags]);

  // When tags change, scroll the tags container to the rightmost edge
  useEffect(() => {
    const el = tagsContainerRef.current as HTMLDivElement | null;
    if (el) {
      // ensure scroll happens after render
      requestAnimationFrame(() => {
        try {
          el.scrollLeft = el.scrollWidth;
        } catch (e) {
          // ignore
        }
      });
    }
  }, [selectedTags]);


  useEffect(() => {
    setSelectedTags([]);
  }, [currentPage]);


  return (
    <>
      <div className={styles.navbar}>
        <div className={styles.left}>
          <div className={styles.logo}>
            <Logo />
            <div className={styles['logo-name']}>Bookmarks Pro</div>
          </div>
        </div>
        <ul className={styles.right} style={{ marginBottom: '0rem' }}>
          {
            pageType === 'bookmarks' && selectedTags.length > 0 &&
            <li style={{ minWidth: 0, width: '1060px', flex: '0 0 1060px' }}>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'nowrap',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  width: '100%',
                  maxHeight: '56px',
                  overflowX: 'auto',
                  overflowY: 'hidden',
                  padding: '4px 0',
                  minWidth: 0,
                }}
              >
                {/* 左侧占位，用来把 tags 顶到右边 */}
                <div style={{ flex: '1 0 auto' }} />
                {selectedTags.map((item) => {
                  return (
                    <Tag
                      key={item.key}
                      closable
                      style={{
                        // margin: '16px 16px 16px 0',
                        marginRight: '16px',
                        flex: '0 0 auto',
                        maxWidth: '160px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'inline-block',
                      }}
                      color={item.color}
                      onClose={() => onTagClose(item)}
                    >
                      {item.key}
                    </Tag>
                  );
                })}
              </div>
            </li>

          }

          <li>
            <SearchHistory searchKeyword={searchKeyword} onClickHistory={onClickHistory} inputValue={keyword}>
              <Input.Search
                allowClear
                className={styles.round}
                // value={value}
                value={keyword}
                placeholder={t['navbar.search.placeholder']}
                onChange={onInputChange}
                // onPressEnter={(value) => setNavBarKey(value)}
                onPressEnter={(value) => onEnterPress(value)}
              />
            </SearchHistory>
          </li>

          <li>
            <Tooltip
              content={t['bookmarks.page.home']}
            >
              <IconButton
                icon={<IconHome />}
                onClick={onClickHome}
              />
            </Tooltip>
          </li>

          {/* {pageNo && <li> */}
          <li>
            <Bookmarks pages={bookmarkPages} currentPage={currentPageId} setCurrentPage={setCurrentPage}>
              <IconButton icon={<IconNav />} />
            </Bookmarks>
          </li>

          {
            // pageType === 'bookmarks' && tagsMap && Object.keys(tagsMap).length > 0 && <li>
            pageType === 'bookmarks' && <li>
              {/* 跨组件共享数据Context */}
              <TagContext.Provider value={unselectedTag}>
                <Tags currentPage={currentPageId} onTagSwitch={onTagSwitch}>
                  <IconButton icon={<IconTags />} />
                </Tags>
              </TagContext.Provider>
            </li>
          }

          <li>
            <Select
              triggerElement={<IconButton icon={<IconLanguage />} />}
              options={[
                { label: '中文', value: 'zh-CN' },
                { label: 'English', value: 'en-US' },
              ]}
              value={lang}
              triggerProps={{
                autoAlignPopupWidth: false,
                autoAlignPopupMinWidth: true,
                position: 'br',
              }}
              trigger="hover"
              onChange={(value) => {
                setLang(value);
                const nextLang = defaultLocale[value];
                Message.info(`${nextLang['message.lang.tips']}${value}`);
              }}
            />
          </li>


          <li>
            <Tooltip
              content={t['bookmarks.page.group.create']}
            >
              <IconButton
                icon={<IconPlus />}
                onClick={onCreateNew}
              />
            </Tooltip>
          </li>

          <li>
            <MessageBox>
              <IconButton icon={<IconNotification />} />
            </MessageBox>
          </li>
          <li>
            <Tooltip
              content={
                theme === 'light'
                  ? t['settings.navbar.theme.toDark']
                  : t['settings.navbar.theme.toLight']
              }
            >
              <IconButton
                icon={theme !== 'dark' ? <IconMoonFill /> : <IconSunFill />}
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              />
            </Tooltip>
          </li>


          {/*  <li>
          <Tooltip
            content={t['website.tag.group.create']}
          >
            <IconButton
              icon={<IconPlus />}
              onClick={onCreateNewTagGroup}
            />
          </Tooltip>
        </li> */}


          {/* 显示/隐藏 */}
          {display !== null && <li>
            <Tooltip
              content={
                tagsShow ? t['settings.tags.hide'] : t['settings.tags.show']
              }
            >
              <IconButton
                icon={tagsShow ? <IconEye /> : <IconEyeInvisible />}
                // icon={tagsShow ? <IconEyeInvisible /> : <IconEye />}
                onClick={onToggleDisplay}
              />
            </Tooltip>
          </li>
          }

          <Settings />
          {/* 头像 */}
          {/* {userInfo && (
            <li>
              <Dropdown droplist={droplist} position="br" disabled={userLoading}>
                <Avatar size={32} style={{ cursor: 'pointer' }}>
                  {userLoading ? (
                    <IconLoading />
                  ) : (
                    <img alt="avatar" src={`${api}${userInfo.avatar}`} />
                  )}
                </Avatar>
              </Dropdown>
            </li>
          )} */}


        </ul>

      </div >

      <CreatePageGroup
        isVisible={createNewForm}
        // bookmarkPages={bookmarkPages}
        closeWithSuccess={closeAddModal}>
      </CreatePageGroup>
    </>
  );
}

export default Navbar;
