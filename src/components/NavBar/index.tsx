import React, { useContext, useEffect, useState } from 'react';
import {
  Tooltip,
  Input,
  Avatar,
  Select,
  Dropdown,
  Menu,
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
const api = import.meta.env.VITE_REACT_APP_BASE_API;
// function Navbar({ show }: { show: boolean }, setNavBarKey) {
// function Navbar({ pageNo, pageType, show, display, setNavBarKey, setAllDisplay }) {
function Navbar({ pageType, show, display, setNavBarKey, setAllDisplay }) {

  const t = useLocale();
  const dispatch = useDispatch();
  // const [bookmarkPages, setBookmarkPages] = useState(pages);
  const [bookmarkPages, setBookmarkPages] = useState([]);
  const globalState = useSelector((state: any) => state.global);
  const { userInfo, userLoading, pages, currentPage } = globalState;

  const [currentPageId, setCurrentPageId] = useState(null);//pageNo
  function setCurrentPage(pageId) {
    setCurrentPageId(pageId);
  }

  // console.log('------------->pageNo', pageNo);
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
  // 

  const [_, setUserStatus] = useStorage('userStatus');
  const [role, setRole] = useStorage('userRole', 'admin');


  const { setLang, lang, theme, setTheme } = useContext(GlobalContext);
  // const [createType, setCreateType] = useState("page");

  const { userStore } = useStore();

  // const [tagsShow, setTagsShow] = useState('hide')
  const [tagsShow, setTagsShow] = useState(false)//一开始是隐藏的

  async function logout() {
    setUserStatus('logout');
    removeToken()
    const res = await userStore.LogOut();
    window.location.href = '/login';
  }

  /*   useEffect(() => {
      setCurrentPageId(pageNo);
    }, [pageNo]); */

  useEffect(() => {
    setBookmarkPages(pages);
    console.log(" ===================pages=", pages);
    setDefaultPageBookmarksData(pages);
  }, [pages]);



  // 监听搜索框输入变化
  const onInputChange = (key: string) => {
    setNavBarKey(key)
  }
  const [createNewForm, setCreateNewForm] = useState(false);//添加Tab

  const onCreateNew = () => {
    setCreateNewForm(true);
  }

  const onClickHome = () => {

    // setCreateNewForm(true);
    /*  if (window.location.href.indexOf('/index') !== -1) {
       // window.location.href = '/index';
     }
  */
    const href = window.location.href;
    // console.log('------------------->home', href);
    const lastIndex = href.lastIndexOf('/');
    if (lastIndex > -1) {//A.点击的是：3级和以下分组
      const last = href.substring(lastIndex + 1).trim();
      // console.log("href last", last);
      if (last.length > 0 && last !== 'index') {
        window.location.href = '/index';
      } else {
        Message.info('您已经在导航页了哦!');
      }
    }
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


  const [addedBookmarkPages, setAddedBookmarkPages] = useState([]);

  useEffect(() => {
  }, [addedBookmarkPages]);

  const switchPageId = useFetchPageData();

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


  // 在组件卸载或其他合适时机清除定时器
  useEffect(() => {
    /* return () => {
      clearTimeout(timeoutId);
    }; */
  }, []);


  return (
    <>
      <div className={styles.navbar}>
        <div className={styles.left}>
          <div className={styles.logo}>
            <Logo />
            {/* <div className={styles['logo-name']}>Arco Pro</div> */}
            <div className={styles['logo-name']}>Bookmarks Pro</div>
          </div>
        </div>
        <ul className={styles.right} style={{ marginBottom: '0rem' }}>
          <li>
            <Input.Search
              allowClear
              className={styles.round}
              placeholder={t['navbar.search.placeholder']}
              onChange={onInputChange}
            />
          </li>


          <li>
            <Tooltip
              content={t['bookmarks.page.group.create']}
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
