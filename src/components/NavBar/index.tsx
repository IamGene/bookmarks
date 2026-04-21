import React, { useContext, useEffect, useState } from 'react';
import {
  Tooltip,
  Input,
  Avatar,
  Select,
  Dropdown,
  Trigger,
  Tabs,
  Spin,
  Menu,
  List,
  AutoComplete,
  Divider,
  Message,
  Upload,
  DatePicker,
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
import dayjs from 'dayjs';
// import { useFetchPageData } from '@/hooks/fetchPageData';
// import { GlobalState } from '@/info';
import { GlobalContext } from '@/context';
import useLocale from '@/utils/useLocale';
import Logo from '@/assets/logo.svg';
import Plugins from '@/components/Icons';
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
import { reloadUserPages, oneTagSelectedSwitch, fetchBookmarksPageData } from '@/store/modules/global';
// const api = import.meta.env.VITE_REACT_APP_BASE_API; updatePageSelectedTags
import { useHistory } from 'react-router-dom';
import { set } from 'mobx';
// filterDataByTags
function Navbar({ pageType, show, setNavBarKey, setAllDisplay }) {

  const t = useLocale();
  const dispatch = useDispatch();
  // const [bookmarkPages, setBookmarkPages] = useState(pages);
  const [bookmarkPages, setBookmarkPages] = useState([]);
  const globalState = useSelector((state: any) => state.global);
  const { userInfo, userLoading, pages, domainGroups, currentPage } = globalState;

  //将domainGroups（数组）按属性name转换为map，key为name，value为属性children（数组）中各个元素的name组成的数组，
  // 存储在domainGroupsMap中，供搜索建议使用
  /* const domainGroupsMap = domainGroups && domainGroups.reduce((acc, group) => {
    acc[group.name] = group.children.map(child => child.name);
    return acc;
  }, {} as Record<string, string[]>);
 */
  // 将domainGroups中的每个元素的属性children（数组）中每个元素的属性name组成一个新的数组，存储在domainList中，供搜索建议使用
  const domainList = domainGroups ? domainGroups.flatMap(group => group.children.map(child => child.name)) : [];

  const history = useHistory();
  const [currentPageId, setCurrentPageId] = useState(null);//pageNo
  const [keyword, setKeyword] = useState(null);
  const [keyword1, setKeyword1] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState(undefined);

  const [searchType, setSearchType] = useState<number>(0);
  const [enterSearchType, setEnterSearchType] = useState<number>(0);
  const [valueValid, setValueValid] = useState<boolean>(true);

  function setCurrentPage(pageId) {
    setCurrentPageId(pageId);
  }

  const setCurrentPageBookmarksData = async (pages) => {
    if (pages && pages.length > 0 && pageType === 'bookmarks') {//只有用户存在标签数据才能查询
      // const defaultPage = pages.find(page => page.default === true);
      const currentPage = pages.find(page => page.current === true);
      const pageId = currentPage ? currentPage.pageId : pages[0].pageId;//获取默认展示的书签页
      // setCurrentPage(pageId);
      setCurrentPageId(pageId);
      const data: any = await dispatch(fetchBookmarksPageData(pageId));//获取当前书签页的分组和书签数据
    }

    //没有缓存到localStorage中
    // if (!pages) { console.log('------------->pages 未加载', pages);
    /*  const pages1: any = await dispatch(reloadUserPages());//加载所有书签页->Redux
     setBookmarkPages(pages1);
    */
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
    history.replace('/login');
  }

  useEffect(() => {
    setBookmarkPages(pages);
    if (!currentPage) setCurrentPageBookmarksData(pages);//初始化默认书签页数据
  }, [pages]);//书签页数据

  // 监听搜索框输入变化
  const onInputChange = (key: string) => {
    // setNavBarKey(key);//搜索跟随输入
    setKeyword(key);//本地状态更新
    setValueValid(true);
    if (!key || key.trim().length === 0) {//清空搜索->重置数据
      setNavBarKey(key.trim(), searchType);//搜索跟随输入
      // setSearchKeyword(null);
    }
  }
  const onClickHistory = (word: string) => {
    setKeyword(word);//本地状态更新
    setNavBarKey(word, searchType);//搜索跟随输入
    setSearchKeyword(word);//传递给搜索历史子组件
    // console.log('点击搜索历史记录项：', word);
  }


  // 监听回车键
  const onEnterPress = (e) => {
    setNavBarKey(keyword.trim(), searchType);//回车搜索，带搜索类型
    setSearchKeyword(keyword.trim());//传递给搜索历史子组件
    setKeyword1(null);//重置按域名搜索的输入值
    setEnterSearchType(searchType);//0 1 2 3
  }

  const onEnterPress1 = (value: string) => {
    console.log('onEnterPress1 value=', value);
    //如果domainList包含value
    setKeyword(null);
    if (value && domainList.includes(value))
      // if (searchType === 4) return;
      setNavBarKey(value.trim(), searchType);//回车搜索，带搜索类型
    // setSearchKeyword(value.trim());//传递给搜索历史子组件
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
    // selected tags are sourced from Redux now.
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
        // console.log('xxxxxxxxxxxxxxxxxx closeAddModal', currentPageId, pageId);
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

  // 使用共享的 TagContext（不要在组件内重新创建）
  const [unselectedTag, setUnselectedTag] = useState<any>(null);

  function downloadPlugin() {
    window.location.href = '/plugin-add2Bookmarks-v1.0.zip';
  }


  function onSelect(dateString, date) {
    // console.log('111111111111 onSelect', dateString, date);
  }

  function onChange(dateString, date) {
    // console.log('111111111111 onChange: ', dateString, date);
    setNavBarKey(dateString, searchType);//搜索跟随输入
    setKeyword1(null);//重置按域名搜索的输入值
    setKeyword(null);//
  }


  function onTagSwitch(value: { key: string; index: number; color: string; selected: boolean, bookmarkIds: string[] }) {
    // Normalize and validate incoming value
    // console.log('sssssssssssssssssss onTagSwitch state.tags.toBeUnselectedNextTime.=', tags.toBeUnselectedNextTime);
    const key = value && typeof value.key === 'string' ? value.key : null;
    const color = value && value.color ? value.color : undefined;
    const bookmarks = value && value.bookmarkIds ? value.bookmarkIds : [];
    const index = typeof value.index === 'number' ? value.index : -1;
    const selected = !!value && !!value.selected;
    if (!key) {
      // invalid key, ignore
      return;
    }

    dispatch(oneTagSelectedSwitch({ key, index, color, selected: selected, bookmarks }));//获取当前书签页的分组和书签数据
  }

  /*   useEffect(() => {
      if (pageType === 'bookmarks') {
        // dispatch(updatePageSelectedTags(selectedTags));//获取当前书签页的分组和书签数据
      }
    }, [selectedTags]);//当选中标签发生变化时，传递到主页面组件 */
  const InputSearch = Input.Search;

  const [data, setData] = useState([]);
  // const [domainOptionSelected, setDomainOptionSelected] = useState(false);
  const DOMAIN_INPUT_PATTERN = /^[a-zA-Z0-9.-]*$/;

  const normalizeDomainInput = (value) => {
    const nextValue = typeof value === 'string' ? value : '';
    return nextValue.replace(/[^a-zA-Z0-9.-]/g, '');
  };

  const isValidDomainInput = (value) => DOMAIN_INPUT_PATTERN.test(value || '');

  const handleDomainSelect = (value) => {
    const normalizedValue = normalizeDomainInput(value);
    setNavBarKey(normalizedValue, searchType);
    setKeyword1(normalizedValue);
  };

  const handleDomainChange = (value) => {
    const nextValue = typeof value === 'string' ? value : '';
    const normalizedValue = normalizeDomainInput(nextValue);
    if (nextValue && !isValidDomainInput(nextValue)) {
      Message.warning('Only letters, numbers, "." and "-" are allowed.');
    }
    setKeyword1(normalizedValue);
    if (!normalizedValue || normalizedValue.trim().length === 0) {
      setNavBarKey(normalizedValue.trim(), searchType);
    }
  };

  const handleDomainPressEnter = (value: string) => {
    const normalizedValue = normalizeDomainInput(value).trim();
    setKeyword(null);
    setKeyword1(normalizedValue);
    if (!normalizedValue) {
      setNavBarKey('', searchType);
      return;
    }
    if (!isValidDomainInput(value)) {
      Message.warning('Only letters, numbers, "." and "-" are allowed.');
      return;
    }
    if (domainList.includes(normalizedValue)) {
      setNavBarKey(normalizedValue, searchType);
    }
  };

  const handleSearch = (inputValue) => {
    const normalizedValue = normalizeDomainInput(inputValue);
    // 取inputValue的首字母，从domainGroupsMap中找到对应的域名列表，更新data为该域名列表；如果没有找到，则将data置空数组
    /*  if (searchType == 3 && inputValue && domainGroupsMap) {
       const firstChar = inputValue[0].toUpperCase();
       const matchedDomains = domainGroupsMap[firstChar] || [];
       // console.log('matchedDomains=', matchedDomains);
       setData(matchedDomains);
     } */
    if (searchType == 4 && normalizedValue && domainList) {
      const matchedDomains = domainList.filter(domain => domain.indexOf(normalizedValue) !== -1);
      setData(matchedDomains);
    }
    else {
      setData([]);
    }
    // setData(inputValue && searchType == 3 ? new Array(5).fill(null).map((_, index) => `${inputValue}_${index}`) : []);
  };

  const handleSelect = (value) => {
    setNavBarKey(value, searchType);//搜索跟随输入
    setKeyword1(value);//本地状态更新
    // setDomainOptionSelected(true);
  };

  const handleChange = (value) => {//输入后Enter或选择建议项都会触发这个函数，
    // console.log('11111111111111 handleChange value=', value);
    // setDomainOptionSelected(false);
    // setKeyword(value);//本地状态更新
    setKeyword1(value);//本地状态更新
    if (!value || value.trim().length === 0) {//清空搜索->重置数据
      setNavBarKey(value.trim(), searchType);//搜索跟随输入
      // setSearchKeyword(null);
    }
  };

  const handleChange1 = (value) => {//输入后Enter或选择建议项都会触发这个函数，
    // onChange = {(val) => {
    const next = Number(value);
    setSearchType(next);
    setData([]);//切换搜索类型时清空搜索建议数据

    //搜索值有效（valueValid）? 搜索类型在0 1 2 3 之间切换则有效（3按url不能包含中文否则无效）；
    //曾切换到4或5则输入值无效 除非切换回该搜索搜索方式已按Enter搜索，否则搜索值无效
    let nextValueValide = valueValid ? next < 4 : next == enterSearchType;
    // 若输入框有内容，则切换搜索类型时立即触发搜索
    if (next < 4 && keyword && String(keyword).trim().length > 0) {

      //按url搜索时输入中文则无效
      if (next == 3 && keyword && /[\u4e00-\u9fff]/.test(String(keyword))) nextValueValide = false;
      if (nextValueValide) { //此时搜索值有效，才触发搜索
        setNavBarKey(keyword.trim(), next);
        setEnterSearchType(next);
      }
    }
    setValueValid(nextValueValide);
  }

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
          {/* selected tags UI removed: selection is driven by Redux `tags.selectedTags` */}

          <li>
            {/* <SearchHistory searchKeyword={searchKeyword} onClickHistory={onClickHistory} inputValue={keyword}>
              <Input.Search
                className={styles.round}
                // value={value}
                value={keyword}
                placeholder={t['navbar.search.placeholder']}
                onChange={onInputChange}
                // onPressEnter={(value) => setNavBarKey(value)}
                onPressEnter={(value) => onEnterPress(value)}
              />
            </SearchHistory> */}

            <div
              style={{
                width: 300,
                height: 33,
                display: 'inline-block',
              }}
              className="custom-input-group"
            >
              <Input.Group compact>
                <Select
                  value={searchType}
                  onChange={(val) => { handleChange1(val); }}
                  /*  onChange={(val) => {
                     const next = Number(val);
                     setSearchType(next);
                     setData([]);//切换搜索类型时清空搜索建议数据
 
                     //搜索值有效（valueValid）? 搜索类型在0 1 2 3 之间切换则有效（3按url不能包含中文否则无效）；
                     //曾切换到4或5则输入值无效 除非切换回该搜索搜索方式已按Enter搜索，否则搜索值无效
                     let nextValueValide = valueValid ? next < 4 : next == enterSearchType;
                     // 若输入框有内容，则切换搜索类型时立即触发搜索
                     if (next < 4 && keyword && String(keyword).trim().length > 0) {
 
                       //按url搜索时输入中文则无效
                       if (next == 3 && keyword && /[\u4e00-\u9fff]/.test(String(keyword))) nextValueValide = false;
                       if (nextValueValide) { //此时搜索值有效，才触发搜索
                         setNavBarKey(keyword.trim(), next);
                         setEnterSearchType(next);
                       }
                     }
                     setValueValid(nextValueValide);
                   }} */
                  style={{ width: 70 }}
                  dropdownMenuStyle={{
                    maxHeight: 400, // 👈 调大这个值
                    // overflowY: 'auto', // 或者 'visible'
                  }}
                >
                  <Select.Option value={0}>默认</Select.Option>
                  <Select.Option value={1}>标题</Select.Option>
                  <Select.Option value={2}>描述</Select.Option>
                  <Select.Option value={4}>域名</Select.Option>
                  <Select.Option value={3}>网址</Select.Option>
                  {pageType === 'bookmarks' && <Select.Option value={5} >日期</Select.Option>}
                </Select>
                {

                  searchType === 4 ?
                    <AutoComplete
                      // placeholder='Please Enter'
                      placeholder={t['navbar.search.placeholder']}
                      allowClear
                      onSearch={handleSearch}
                      onSelect={handleDomainSelect}
                      onChange={handleDomainChange}
                      value={keyword1}
                      data={data}
                      style={{ width: '76.5%', height: 31 }}
                      triggerElement={<Input.Search />}
                      onPressEnter={(event) => handleDomainPressEnter(event.target.value)}
                    >
                    </AutoComplete>

                    :

                    (
                      searchType !== 5 ?
                        <SearchHistory searchKeyword={searchKeyword} onClickHistory={onClickHistory} inputValue={keyword}>
                          <InputSearch
                            allowClear
                            value={valueValid ? keyword : ''}
                            placeholder={t['navbar.search.placeholder']}
                            onChange={onInputChange}
                            style={{ width: '76.5%', height: 31 }}
                            onPressEnter={(value) => onEnterPress(value)}
                          />
                        </SearchHistory>
                        :
                        <DatePicker.RangePicker
                          style={{ width: 228 }}
                          shortcutsPlacementLeft
                          onChange={onChange}
                          onSelect={onSelect}
                          shortcuts={[
                            {
                              text: 'Today',
                              value: () => [dayjs(), dayjs()],
                              key: 'today',
                            },
                            {
                              text: 'Yesterday',
                              value: () => [dayjs().subtract(1, 'day'), dayjs().subtract(1, 'day')],
                              key: 'yesterday',
                            },
                            {
                              text: 'Last week',
                              value: () => [dayjs().add(-1, 'week'), dayjs()],
                              key: '1week',
                            },
                            {
                              text: 'Last 30 days',
                              value: () => [dayjs().subtract(30, 'day'), dayjs()],
                              key: '30days',
                            },

                            {
                              text: 'This month', // 本月至今
                              value: () => [dayjs().startOf('month'), dayjs()],
                              key: 'thisMonth',
                            },
                            {
                              // text: 'Last month', // 上个月 (3月)
                              text: dayjs().subtract(1, 'month').format('MMMM'), // 上个月 (3月)
                              value: () => [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')],
                              key: 'last-1-month',
                            },
                            {
                              text: dayjs().subtract(2, 'month').format('MMMM'), // 上上个月 (2月)
                              value: () => [dayjs().subtract(2, 'month').startOf('month'), dayjs().subtract(2, 'month').endOf('month')],
                              key: 'last-2-month',
                            },
                            {
                              text: dayjs().subtract(3, 'month').format('MMMM'), // 上上上个月 (1月)
                              value: () => [dayjs().subtract(3, 'month').startOf('month'), dayjs().subtract(3, 'month').endOf('month')],
                              key: 'last-3-month',
                            },
                            /*   {
                                text: 'Last month',
                                value: () => [dayjs().add(-1, 'month'), dayjs()],
                                key: '1month',
                              }, */
                            /*  {
                               text: 'Last 3 months',
                               value: () => [dayjs().add(-3, 'month'), dayjs()],
                               key: '3month',
                             },
                            {
                              text: 'Last year',
                              value: () => [dayjs().add(-1, 'year'), dayjs()],
                              key: '12months',
                            },*/
                            {
                              text: 'This year', // 今年至今
                              value: () => [dayjs().startOf('year'), dayjs()],
                              key: 'thisYear',
                            },
                          ]}
                        />
                    )
                }
              </Input.Group>
            </div>
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

          {/* 消息盒子 */}
          {/*  <li>
            <MessageBox>
              <IconButton icon={<IconNotification />} />
            </MessageBox>
          </li> */}
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

          {/* settings.navbar.plugin.download */}
          <li>
            <Tooltip
              content={
                t['settings.navbar.plugin.download']
              }
            >
              <IconButton onClick={() => downloadPlugin()}>
                <Plugins
                />
              </IconButton>
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
          {/*   {display !== null && <li>
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
          } */}

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
