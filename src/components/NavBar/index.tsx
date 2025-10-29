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
import { fetchBookmarksPageData } from '@/store/modules/global';
import TabGroupForm from '@/pages/navigate/user/form/tab-group-form';
const api = import.meta.env.VITE_REACT_APP_BASE_API;
// import cache from '@/plugins/cache';
// function Navbar({ show }: { show: boolean }, setNavBarKey) {
function Navbar({ pageNo, pages, show, display, setNavBarKey, setAllDisplay }) {

  const t = useLocale();
  const dispatch = useDispatch();

  // console.log(" ===================pageNo=", pageNo);
  // const { userInfo, userLoading } = useSelector((state: GlobalState) => state);
  const globalState = useSelector((state: any) => state.global);
  const { userInfo, userLoading } = globalState;

  const [_, setUserStatus] = useStorage('userStatus');
  const [role, setRole] = useStorage('userRole', 'admin');

  const { setLang, lang, theme, setTheme } = useContext(GlobalContext);
  const { userStore } = useStore();

  // const [tagsShow, setTagsShow] = useState('hide')
  const [tagsShow, setTagsShow] = useState(false)//一开始是隐藏的

  async function logout() {
    setUserStatus('logout');
    removeToken()
    // cache.local.remove("")
    const res = await userStore.LogOut();
    window.location.href = '/login';
  }

  // 监听搜索框输入变化
  const onInputChange = (key: string) => {
    setNavBarKey(key)
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

  const onCreateNewTagGroup = () => {
    setTabForm(true);
  }
  const [tabForm, setTabForm] = useState(false);//添加Tab

  let timeoutId; // 用于存储 setTimeout 返回的标识符
  //提交成功后关闭或取消关闭Modal窗口
  const closeAddTabModal = async (success: boolean, data?: any) => {
    setTabForm(false)
    if (success) {//刷新当前页面数据
      const res = await getGroupData();
      if (res) {
        // 清除之前的定时器（如果存在）
        if (data) {
          clearTimeout(timeoutId);
          // 设置新的定时器
          timeoutId = setTimeout(() => {
            window.location.href = `/navigate/user#${data.id}`;
          }, 800);//延时1秒，等组件重新渲染完毕
        }
      }
    }
  }

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
    return () => {
      clearTimeout(timeoutId);
    };
  }, []);


  return (
    <div className={styles.navbar}>
      <div className={styles.left}>
        <div className={styles.logo}>
          <Logo />
          <div className={styles['logo-name']}>Arco Pro</div>
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

        {/* {pageNo && <li> */}
        {<li>
          <Bookmarks pages={pages} currentPage={pageNo}>
            <IconButton icon={<IconNav />} />
          </Bookmarks>
        </li>
        }

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


        <li>
          <Tooltip
            content={t['website.tag.group.create']}
          >
            <IconButton
              icon={<IconPlus />}
              onClick={onCreateNewTagGroup}
            />
          </Tooltip>
        </li>

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
        {userInfo && (
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
        )}
      </ul>

      {tabForm && <TabGroupForm selectGroup={null} noPid={true} batchNo={pageNo} groupName={''} closeWithSuccess={closeAddTabModal} group={null}></TabGroupForm>}
    </div >
  );
}

export default Navbar;
