import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import TagItem from './tag/card-tag';
import { WebTag } from './interface';
import { Tabs, Card, Switch, Empty, Input, Dropdown, Menu, Typography, Message, Grid, Form, Button, Space } from '@arco-design/web-react';
import { IconEyeInvisible, IconToTop, IconMore, IconPlus, IconEraser, IconToBottom, IconLink, IconDelete, IconEdit, IconEye, IconCheck } from '@arco-design/web-react/icon';
import styles from './style/index.module.less';
import TagForm from './form/tag-form';
import TabGroupForm from './form/tab-group-form';
import Add2Form from './form/add2form';
import { removeConfirm } from './form/remove-confirm-modal';
import { clearConfirm } from './form/clear-confirm-modal';
import { removeGroup, saveTagGroup, moveGroupTopBottom } from '@/api/navigate';
import { useDispatch } from 'react-redux'
import { fetchBookmarksPageData, updateActiveGroup } from '@/store/modules/global';
import { getBookmarkGroupById, removeGroupById, clearGroupBookmarksById } from '@/db/bookmarksPages';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { sortGroup } from '@/api/navigate';
const TabPane = Tabs.TabPane;
const ButtonGroup = Button.Group;
const { Row, Col, GridItem } = Grid;
// import locale from './locale';
// import useLocale from '@/utils/useLocale';
// 搜索结果tab-key
const searchTabKey = 'search-result'

interface DragItem {
    index: number;
}

interface WrapTabNodeProps {
    index: number;
    moveTabNode: (dragIndex: number, hoverIndex: number) => void;
    children: React.ReactNode;
}

const WrapTabNode = (props: WrapTabNodeProps) => {
    const { index, moveTabNode, children, ...elseProps } = props;

    const ref = useRef<HTMLDivElement>(null);

    const [{ handlerId }, drop] = useDrop<DragItem, void, { handlerId: Identifier | null }>({
        accept: 'DND_NODE',
        collect(monitor) {
            return {
                handlerId: monitor.getHandlerId()
            };
        },
        hover(item, monitor) {
            if (!ref.current) {
                return;
            }
            const dragIndex = item.index;
            const hoverIndex = index;

            if (dragIndex === hoverIndex) {
                return;
            }

            const hoverBoundingRect = ref.current?.getBoundingClientRect();
            const hoverMiddleX = (hoverBoundingRect.right - hoverBoundingRect.left) / 2;

            const clientOffset = monitor.getClientOffset();
            const hoverClientX = (clientOffset as XYCoord).x - hoverBoundingRect.left;

            if (dragIndex < hoverIndex && hoverClientX < hoverMiddleX) {
                return;
            }
            if (dragIndex > hoverIndex && hoverClientX > hoverMiddleX) {
                return;
            }

            moveTabNode(dragIndex, hoverIndex);

            item.index = hoverIndex;
        }
    });

    const [, drag] = useDrag({
        type: 'DND_NODE',
        item: () => {
            return { index };
        }
    });

    drag(drop(ref));

    return (
        <div ref={ref} data-handler-id={handlerId} {...elseProps}>
            {children}
        </div>
    );
};


// 根据关键词高亮文本数组
const Highlight = (parts, keyword) => {
    return (
        <span>
            {parts.map((part, index) => (
                <span key={index}>
                    {part.toLowerCase() === keyword.toLowerCase() ? (
                        <span className="highlight">{part}</span>
                    ) : (
                        part
                    )}
                </span>
            ))}
        </span>
    );
};


function searchData(inputValue, cardData) {
    // 必须返回新数据，包括所有属性，重新构造
    const searchResult = [];
    const noHiddenSearchResult = [];
    const search = (data) => {
        const newChildren = [];
        data.children.forEach((item) => {
            const urlList = item.urlList;
            if (urlList && urlList.length > 0) {
                const urlListResult = [];
                let notHideTabCount = 0;//排除隐藏的搜索结果后的数量

                urlList.forEach((navi) => {
                    let contains: boolean = false;
                    let name = navi.name;
                    let description = navi.description;

                    // name或intro中包含inputValue关键字
                    const regex = new RegExp(`(${inputValue})`, 'gi');
                    const parts = name.split(regex);
                    let searchName = name;
                    if (parts.length >= 3) {
                        contains = true;
                        name = Highlight(parts, inputValue);
                        // console.log("搜索结果 name ", data.name, navi.name, searchName);
                    }
                    const parts1 = description.split(regex);
                    if (parts1.length >= 3) {
                        contains = true;
                        description = Highlight(parts1, inputValue);
                        // console.log("搜索结果 description", data.name, navi.description, searchName);
                    }

                    if (contains) {

                        // urlListResult.push({ ...navi, name, intro });//A情况.分组中隐藏项的背景不变色
                        if (navi.hide || item.hide) {//该项目隐藏或所属的分组隐藏
                            // const resultNavi = { ...navi, name: searchName, nameLength: name.length, hide: true, description }
                            const resultNavi = { ...navi, name, nameLength: name.length, hide: true, description }
                            searchResult.push(resultNavi);//搜索结果中隐藏项的背景变色
                            urlListResult.push(resultNavi);//B情况.分组中隐藏项的背景变色
                        } else {//不隐藏
                            // const resultNavi = { ...navi, name: searchName, nameLength: name.length, description }
                            const resultNavi = { ...navi, name, nameLength: name.length, description }
                            searchResult.push(resultNavi);
                            noHiddenSearchResult.push(resultNavi);
                            urlListResult.push(resultNavi);
                            notHideTabCount++;
                        }
                    }
                });
                newChildren.push({ ...item, urlList: urlListResult, notHideTabCount });
            } else {
                newChildren.push({ ...item, urlList: [], notHideTabCount: 0 });
            }
        });
        return { ...data, children: newChildren, searchResult: searchResult, noHiddenSearchResult: noHiddenSearchResult };
    };

    const search1 = (data) => {
        const navis = [];
        const searchResult = [];
        const noHiddenSearchResult = [];
        data.urlList.forEach((navi) => {
            let contains: boolean = false;
            let name = navi.name;
            let description = navi.description;
            // name或intro中包含inputValue关键字
            const regex = new RegExp(`(${inputValue})`, 'gi');
            const parts = name.split(regex);
            let searchName = name;
            // 处理高亮
            if (parts.length >= 3) {
                contains = true;
                searchName = Highlight(parts, inputValue);
                // console.log("111 搜索结果 name", data.name, navi.description, searchName);
            }
            const parts1 = description.split(regex);
            if (parts1.length >= 3) {
                contains = true;
                description = Highlight(parts1, inputValue);
                // console.log("111 搜索结果 description", data.name, navi.description, searchName);
            }

            if (contains) {
                if (navi.hide) {
                    const resultNavi = { ...navi, name: searchName, nameLength: name.length, hide: true, description }
                    searchResult.push(resultNavi)//搜索结果：包含隐藏项
                    navis.push(resultNavi)
                } else {
                    const resultNavi = { ...navi, name: searchName, nameLength: name.length, description };
                    navis.push(resultNavi)
                    searchResult.push(resultNavi)//搜索结果：包含隐藏项
                    noHiddenSearchResult.push(resultNavi)//搜索结果：不包含隐藏项
                }
            }
        });
        return { ...data, urlList: navis, searchResult: searchResult, noHiddenSearchResult: noHiddenSearchResult };
    };

    // 没有二级
    if (cardData.urlList && cardData.children.length === 0) {
        return search1(cardData);
    }
    return search(cardData);
}



function renderCard({ cardData, display, index, activeCardTab, first, activeGroup, last, setCardTabActive, keyWord, hasResult }) {//hasResult

    // if (cardData.id === 1) console.log(cardData.name + ' 渲染了');

    const dispatch = useDispatch();
    const pageId = cardData.pageId;

    // console.log(cardData.name + ' card activeGroup', activeGroup)
    const [data, setData] = useState(cardData);
    // 当前搜索结果
    const [searchResult, setSearchResult] = useState([]);
    const [noHiddenSearchResult, setNoHiddenSearchResult] = useState([]);
    const [showSearchResult, setShowSearchResult] = useState([]);
    // 搜索中
    const [searching, setSearching] = useState(false);
    // 当前被tree选中
    const [treeSelected, setTreeSelected] = useState(false);
    // 当前搜索
    const [currentSearch, setCurrentSearch] = useState(false);
    const [searchInput, setSearchInput] = useState('');
    const linkRef = useRef(null);
    //该Card是否展示(有搜索结果)
    // const [show, setShow] = useState(true)
    const [show, setShow] = useState(true)
    // 本Card(Group)显示/隐藏 隐藏项
    const [showItem, setShowItem] = useState(true);//默认false

    const moveTabNode = (dragIndex: number, hoverIndex: number) => {
        setData(preData => {
            const newCards = [...preData.children];
            newCards.splice(hoverIndex, 0, ...newCards.splice(dragIndex, 1));
            setResort(true)
            return { ...data, children: newCards }
        });
    }

    // 一、切换Tab标签部分#=====================================================================
    const getInitialDefaultActiveKeyFromCardData = (cardData) => {
        // if (cardData.id === 27) console.log(cardData.name + ' getInitialDefaultActiveKeyFromCardData')
        let defaultActiveKey = '';
        if (cardData.children && cardData.children.length !== 0) {
            cardData.children.some((item) => {
                if (!item.hide) {//非隐藏的
                    const currentKey = item.id + '';
                    defaultActiveKey = currentKey;
                    return true;//终止遍历
                } else {//当前项隐藏
                    return false;//继续遍历
                }
            });
        }
        // if (cardData.id === 27) console.log(cardData.name + 'getInitialDefaultActiveKeyFromCardData defaultActiveKey=', defaultActiveKey, typeof defaultActiveKey)
        return defaultActiveKey;
    }
    const [activeTab, setActiveTab] = useState(getInitialDefaultActiveKeyFromCardData(cardData));

    const defaultActiveKey = useMemo(() => {

        let defaultActiveKey = '';
        // if (cardData.id === 27)
        // console.log('defaultActiveKey activeTab', activeTab)
        const okActiveKeys = [];
        const backupActiveKeys = [];

        if (cardData.children && cardData.children.length !== 0) {
            if (showItem) {//显示隐藏的分组
                cardData.children.some((item) => {
                    const currentKey = item.id + '';
                    if (currentKey === activeTab) {
                        defaultActiveKey = currentKey;
                        return true;//终止遍历
                    } else {
                        okActiveKeys.push(currentKey);
                        return false;//继续遍历
                    }
                });
            } else {//不显示隐藏的分组
                // const backupActiveKeys = [];
                cardData.children.some((item) => {
                    const currentKey = item.id + '';
                    if (!item.hide) {//该项不是隐藏的
                        if (currentKey === activeTab) {
                            defaultActiveKey = currentKey;
                            return true;//终止遍历
                        } else {
                            okActiveKeys.push(currentKey);
                            return false;//继续遍历
                        }
                    } else {
                        //加入备选，以防止没有可用的
                        backupActiveKeys.push(currentKey)
                        return false;//隐藏的：跳过，继续遍历下一个
                    }
                });
            }
        }
        const which = okActiveKeys.length > 0 ? okActiveKeys[0] : backupActiveKeys[0]
        const activeKey = defaultActiveKey !== '' ? defaultActiveKey : which;

        return activeKey;
    }, [cardData]);//依赖项

    const setDataFromProps = () => {
        if (searchInput !== '') {
            processSearchKeywordChange(searchInput, true, show)//根据当前Card展示与否
        } else {
            setData(cardData);
        }
    }

    const switchShow = () => {
        processShowChange(!showItem);//Card分组内的切换显/隐
        setShowItem(!showItem)//触发重新渲染
        // console.log(cardData.name + '<<<<<<<<<<<<<<<<<<<<<<<<<< switchShow change', showItem)
    }

    // 监听tab切换
    const onTabChange = async (key: string) => {
        // console.log('onTabChange', key)
        if (key === '0') {//保存顺序
            const success = saveSort();
            return;
        }
        // if (cardData.id === 27) console.log(cardData.name + ' onTabChange  setActiveTab=', key)
        setActiveTab(key)
        if (key !== searchTabKey) {
            if (key === String(data.id)) {//没有二级
                setCardTabActive(['' + data.id])
            } else {
                setCardTabActive(['' + data.id + ',' + key])
            }
        }
    }


    //点击卡片标题
    const onCardTitleClick = (value) => {
        setCardTabActive([String(data.id)])
    }

    useEffect(() => {
        // console.log(cardData.name + ' useEffect activeCardTab', activeCardTab)
        // const cardActive: number = activeCardTab[0];
        // const tabActive: number | null = activeCardTab[1];
        const cardActive: string = activeCardTab[0];
        const tabActive: string | null = activeCardTab[1];
        let treeSelected1: boolean = false;
        // 受控模式
        if (cardActive === data.id || cardActive === data.id + '') {//当前Card被选中了
            setTreeSelected(true);
            treeSelected1 = true;

            // console.log(cardData.name + '>>>>>>> useEffect cardActive', searchResult, cardActive, treeSelected1);
            //如果在全局搜索模式下当前Card被tree选中且搜索结果为空 =>临时显示全部
            /*  if (!show) {//当前没有搜索结果
                 // console.log(">>>>>>>" + cardData.name + ' useEffect cardActive', data.id)
                 setData(cardData)//重置显示数据
                 // if (cardData.id === 27) console.log(cardData.name + ' useEffect activeCardTab  setActiveTab=', searchTabKey)
                 setActiveTab(searchTabKey);
                 if (typeof tabActive !== 'number') {//展示示搜索结果Tab
                     setActiveTab(searchTabKey);
                 }
                 setShow(true);//当前Card展示
             } */

            //选中的Tab
            // if (tabActive && typeof tabActive === 'number') {
            if (tabActive) {
                // console.log("<<<<<<<<<<<<" + cardData.name + ' useEffect cardActive', data.id)
                setActiveTab(tabActive);
            } else { //父分组的Tab被选中
                // setData(cardData);//重置显示数据
                if (searching) {
                    setActiveTab(searchTabKey);
                } else if (cardData.children && cardData.children.some(child => child.id + '' === cardActive)) {
                    setActiveTab(cardActive);
                }
            }
            // setShow(true);//当前Card展示
        } else {//当前Card没有被选中了
            setTreeSelected(false);
        }
        setShowByDisplayAndAll(cardData.hide, display, treeSelected1);
    }, [activeCardTab]);


    useEffect(() => {
        // console.log(cardData.name + ' useEffect display', display)
        //重新进行一次搜索,考虑hasResult并未更新，所以该Card仍然展示
        setDataFromProps();
        //重置默认激活Tab项
        let defalultKey = true;
        if (activeGroup) {
            //编辑或新增的Tag所属的要激活的Tab,属于当前Card 一级或二级
            if (activeGroup.id === cardData.id || cardData.id === activeGroup.pId) {
                if (!activeGroup.hide || showItem) {//当前不隐藏
                    // if (cardData.id === 27) console.log(cardData.name + 'useEffect cardData activeGroup setActiveTab=', activeGroup.id + '')
                    setActiveTab(activeGroup.id + '');
                    defalultKey = false;
                }
                dispatch(updateActiveGroup(null))
            }
        }
        if (defalultKey) {
            // if (cardData.id === 27) console.log(cardData.name + 'useEffect cardData defalultKey setActiveTab=', defaultActiveKey)
            setActiveTab(defaultActiveKey);
        }
        //切换显示、隐藏 
        //考虑是否在搜索中？
        // setShow(!cardData.hide || display)//显示√,隐藏
        /*  if (display != show && cardData.hide) {//切换显示/隐藏 只有隐藏的Group且状态不一致时才需要切换
             // console.log('切换显示', display)
             setShow(display)//设置Card是否展示
         } */
        // setShowByDisplayAndGroupHide(cardData.hide, display);
        setShowByDisplayAndAll(cardData.hide, display, treeSelected);
    }, [cardData]);//cardData发生变化，新增/修改/删除Group或Tab/隐藏or展示 

    //三、切换显示/隐藏部分==================================================================================== 
    useEffect(() => {
        // if (cardData.id === 9) console.log(cardData.name + ' useEffect display1', display)

        // setTreeSelected(false);
        // console.log(cardData.name + ' useEffect display', display, searching, showSearchResult, searchResult);
        setShowItem(display);//显示该分组下的隐藏项 重新渲染
        //如果当前ActiveKey为隐藏项且当前切换为隐藏 --> 切换到第一个tab项
        if (cardData.itemHide) processShowChange(display);//Card分部分组的切换显/隐
        //全局控制局部
        /*  if (display != show && cardData.hide) {//切换显示/隐藏 只有隐藏的Group且状态不一致时才需要切换
             // console.log('切换显示', display)
             setShow(display)//设置Card是否展示
         }  */
        // setShowByDisplayAndGroupHide(cardData.hide, display);
        setShowByDisplayAndAll(cardData.hide, display, treeSelected);
    }, [display]);

    useEffect(() => {
    }, [data]);
    /* const setShowByDisplayAndGroupHide = (groupHide: boolean, display: boolean) => {
        let noSearchResult: boolean = searching && searchResult.length == 0;//搜索中，无结果
        //情况: A.该分组不隐藏  B.展示(NavBar传递)隐藏分组，但如果搜索，不能无搜索结果
        // const toShow: boolean = (!groupHide) || (display && !noSearchResult);
        // 总体展示 
        const toShow: boolean = (!groupHide) || (display && !noSearchResult);
        // if (cardData.id === 1) console.log(cardData.name + 'setShowByDisplayAndGroup1Hide', toShow)
        setShow(toShow)//显示√,隐藏 
    } */

    //根据所有条件决定该Card是否展示
    const setShowByDisplayAndAll = (groupHide: boolean, display: boolean, treeSelected1: boolean) => {
        // const setShowByDisplayAndAll = (groupHide: boolean, display: boolean) => {
        // const toShow: boolean = (!groupHide) || (display && !noSearchResult);
        let toShow = false;
        if (searching) {//正在搜索：
            //有搜索结果
            if (searchResult.length > 0) {//如果搜结果都是隐藏item,继续判断
                if (display) {//切换为显示隐藏项
                    toShow = true;
                } else {//切换为隐藏隐藏项:整体和分组都要判断
                    if (!groupHide) {//整个分组不隐藏
                        for (const item of searchResult) {
                            if (!item.hide) {//搜索结果中有不隐藏的
                                toShow = true;
                                break; // 直接跳出循环
                            }
                        }
                    }
                }
            } else { //无搜索结果：
                console.log(cardData.name + '--------------- searchResult= 0 ', groupHide, display, treeSelected1);
                // toShow = display && treeSelected1;
                // toShow = display && treeSelected1;
                toShow = groupHide ? display && treeSelected1 : treeSelected1;
            }
        } else { //无搜索:看是否有隐藏相或展示隐藏
            toShow = !groupHide || display;
        }
        // if (cardData.id == 9) console.log(cardData.name + '>>>>>> setShowByDisplayAndAllSearchResult', display, searchResult, toShow);
        setShow(toShow);//显示√,隐藏 
    }

    const processShowChange = (showItem: boolean) => {
        // console.log(cardData.name, 'processShowChange!!!!!!!!!!!!!!!');
        //情况A.切换为隐藏
        if (!showItem) {//切换为隐藏，如当前为隐藏项目则进行隐藏
            //并遍历全部分组,找出第一个非隐藏子分组进行替换
            // console.log(cardData.name, '切换为隐藏 activeKey');
            console.log(cardData.name + ' processShowChange setActiveTab= 切换为显示', noHiddenSearchResult);
            if (searching) {
                setShowSearchResult([...noHiddenSearchResult]);//过滤掉隐藏的搜索结果
            }
            //切换到别的Tab
            let toReplaceActive: boolean = false;
            let unHiddenGroupArr = [];//非隐藏的子分组
            data.children.forEach((item) => {
                if ((!item.hide) && (item.id + '' !== activeTab)) {//当前项为非隐藏项，加入数组
                    unHiddenGroupArr.push(item.id + '');
                }
                else if ((item.id + '' === activeTab) && item.hide) {//当前项是否隐藏项? 需要替换
                    toReplaceActive = true;
                }
            })
            if (toReplaceActive) {//需要切换
                if (searching) {
                    // if (cardData.id === 27) console.log(cardData.name + ' processShowChange setActiveTab=', searchTabKey)
                    setActiveTab(searchTabKey);
                }
                else if (unHiddenGroupArr.length > 0) {
                    const replaceActiveKey = unHiddenGroupArr[0] + '';
                    // if (cardData.id === 27) console.log(cardData.name + ' processShowChange setActiveTab=', replaceActiveKey)
                    setActiveTab(replaceActiveKey);
                }
            }
        }
        //情况B.切换为显示
        else {
            if (searching) {
                // console.log(cardData.name + ' processShowChange setActiveTab= 切换为显示', searchResult);
                setShowSearchResult([...searchResult]);
            }
        }
    }
    //三、切换显示/隐藏部分==================================================================================== 


    //五、排序相关====================================================================================
    const [resort, setResort] = useState(false);//添加Tab
    const processSortGroups = async (params) => {
        try {
            const response = await sortGroup(params);
            if (response.code === 200) {
                // Message.success('删除成功');
                getGroupData();
                return true;
            } else {
                return false;
            }
        } catch (error) {
            return false;
        }
    }

    const saveSort = async () => {
        const ids = [];
        data.children.forEach((item) => {
            ids.push(item.id);
        })
        const success = await processSortGroups({ pId: data.id, ids: ids });
        if (success) {
            setResort(false);
            getGroupData()
        }
        // return success;
    }
    const onClickSort = (key: string, event) => {
        if (key === '0') {//保存
            const success = saveSort();
        } else if (key === '1') {//取消
            setDataFromProps();//还原顺序
            setResort(false);
        }
    }
    //五、排序相关 end====================================================================================


    //二、关键词搜索部分====================================================================================
    useEffect(() => {
        // console.log(cardData.name + ' useEffect keyWord', keyWord)
        setSearchInput(keyWord);
        setCurrentSearch(false);
        //是否展示当前Card: 非隐藏或设置显示，再根据搜索结果判断
        const showCard = !cardData.hide || display;
        //处理关键词搜索
        processSearchKeywordChange(keyWord, false, showCard);
    }, [keyWord]);//第一次渲染就会触发 

    // 处理空字符串搜索
    const processEmptySearch = () => {
        // console.log(cardData.name + ' processEmptySearch setActiveTab', defaultActiveKey);
        setSearching(false);
        setShow(true);
        setData(cardData);//展示原始的全部数据
        //恢复默认activeTabKey
        // if (cardData.id === 27) console.log(cardData.name + ' processEmptySearch setActiveTab', defaultActiveKey)
        setActiveTab(defaultActiveKey);
    }

    const onInputChange = (inputValue) => {
        // console.log('onInputChange', inputValue)
        // processSearchKeywordChange(inputValue, true, show)//根据当前Card展示与否
        // processSearchKeywordChange(inputValue, true, show)//根据当前Card展示与否
        processSearchKeywordChange(inputValue, true, true)//根据当前Card展示与否
        setSearchInput(inputValue);
        //不再全局搜索
        setCurrentSearch(true);
        // setShowItem(true);
    }

    const processNotEmptySearch = (keyWord, showItem) => {
        setSearching(true);
        const result = searchData(keyWord.trim(), cardData);
        setData(result);
        console.log(cardData.name + "search keyword=" + keyWord + ",showItem=" + showItem, result.searchResult);
        setSearchResult(result.searchResult) //（全部）搜索结果
        setNoHiddenSearchResult(result.noHiddenSearchResult)//没有隐藏项的搜索结果
        setActiveTab(searchTabKey)//激活<搜索结果>Tab
        if (showItem) {//显示隐藏项目的搜索结果
            return result.searchResult;
        } else {//不显示隐藏项的搜索结果
            return result.noHiddenSearchResult;
        }
    }

    const processSearchKeywordChange = (searchKeyword: string, currentSearch: boolean, showCard: boolean) => {
        // console.log("processSearchInputChange", cardData.name, searchKeyword, showCard)
        if (searchKeyword && searchKeyword.trim()) {//有关键词->搜索->展示?
            setTreeSelected(false);
            // console.log(cardData.name + " ===================search=" + searchKeyword + ",showCard", showCard)
            if (hasResult) {//(全局？)有搜索结果时
                const searchResult = processNotEmptySearch(searchKeyword, showItem)//处理搜索结果
                // console.log('searchResult',)
                // console.log(cardData.name + ' ' + searchInput + ' searchResult', searchResult)
                setShowSearchResult([...searchResult]);//展示搜索结果 默认展示所有搜索结果

                //全局搜索时 有结果才显示
                if (showCard) setShow(currentSearch || (!currentSearch && searchResult.length !== 0))
                else setShow(showCard);
                // setShow(true);

            }
            else {//没有搜索结果时
                // if (showCard) setShow(currentSearch)
                // else setShow(showCard);
                setShow(showCard && currentSearch);
            }
        } else {//处理空字符串搜索
            processEmptySearch()
            setShow(showCard);
        }
    }
    //二、关键词搜索部分end ====================================================================================


    // 四、增删改部分====================================================================================
    const [tabGroup, setTabGroup] = useState(null);//添加Tab
    const [tabForm, setTabForm] = useState(false);//添加Tab
    const [selectGroup, setSelectGroup] = useState(null);//添加Tab
    // const [requirePid, setRequirePid] = useState(true);//添加Tab

    //添加2级分组Tab
    const handleAddTab = () => {
        // console.log('添加2级分组Tab handleAddTab');
        setTabForm(true);
        // setTabGroup({null});
        setTabGroup({ pId: cardData.id });
        // setSelectGroup([cardData.id]);
        setSelectGroup(cardData.id);
    };


    //test
    const editGroup1 = () => {
        setTabForm(true)
        setTabGroup(cardData);
        setSelectGroup(null);
    }
    const switchGroup1 = () => {
        const result = submitGroupData({ id: cardData.id, hide: !cardData.hide })
    }

    // 提交表单数据Group
    const submitGroupData = async (group): Promise<boolean> => {
        try {
            const response = await saveTagGroup(group);
            if (response.code === 200) {
                // console.log('response', response);
                Message.success('修改成功');
                getGroupData();
                return true;
                // return response.data; // 直接返回整个响应对象
            } else {
                return false;
                // 处理错误情况
                // throw new Error('请求失败');
            }
        } catch (error) {
            // 处理异常
            console.error('请求错误:', error);
            throw error;
        }
    };

    // 提交表单数据Group
    const submitGroupMove = async (top, data): Promise<boolean> => {
        try {
            const response = await moveGroupTopBottom(top, data);
            // console.log(cardData.name + ' submitGroupMove', response)
            if (response.code === 200) {
                // console.log('response', response);
                Message.success('修改成功');
                // getGroupData();
                return true;
                // return response.data; // 直接返回整个响应对象
            } else {
                return false;
                // 处理错误情况
                // throw new Error('请求失败');
            }
        } catch (error) {
            // 处理异常
            console.error('请求错误:', error);
            throw error;
        }
    };
    let timeoutId; // 用于存储 setTimeout 返回的标识符
    const moveAndReload = async (top: boolean) => {
        const success = await submitGroupMove(top, { id: cardData.id, batchNo: cardData.batchNo, sort: cardData.sort })
        if (success) {//刷新当前页面数据
            await getGroupData();
            // 清除之前的定时器（如果存在）
            /*  clearTimeout(timeoutId);
             // 设置新的定时器
             timeoutId = setTimeout(() => {
                 window.location.href = `/navigate/user#${data.id}`;
             }, 500); */
        }
    }
    //置顶
    const moveGroupToTop = () => {
        moveAndReload(true);
    }
    //置底
    const moveGroupToBottom = () => {
        moveAndReload(false);
    }

    //打开全部标签
    const openGroupAllTags = (group) => {
        // console.log('打开全部标签', group)
        openUrls(group.urlList);
    }

    const addGroup1Tag = () => {
        setAddTagVisible(true);
        setEditTag(null)
        setTagSelectGroup([cardData.id])
    }

    const removeGroup1 = () => {
        removeConfirm(cardData.id, cardData.name, '点击确定将删除该分组及其所有标签', '分组', processRemoveGroup1);
    }

    const clearGroup = () => {
        clearConfirm(cardData.id, cardData.name, '点击确定将清空该的所有标签', '分组', processClearGroup);
    }

    // 四、增删改部分 end====================================================================================

    //四、添加/编辑/删除Tab标签部分 End
    const [addTagVisible, setAddTagVisible] = useState(false);//添加标签
    const [add2TypesVisible, setAdd2TypesVisible] = useState(false);//添加标签
    // const [addTabVisible, setAddTabVisible] = useState(false);//添加Tab
    const [tagSelectGroup, setTagSelectGroup] = useState([]);//添加Tab

    const [editTag, setEditTag] = useState(null);//添加Tab

    const onEditTag = (tag: WebTag) => {
        setAddTagVisible(true);
        setEditTag(tag)
        setTagSelectGroup(cardData.id === tag.gId ? [tag.gId] : [cardData.id, tag.gId])
    }

    async function processRemoveGroup(id: number) {
        try {
            const response = await removeGroup(id);
            if (response.code === 200) {
                // Message.success('删除成功');
                getGroupData();
                return true;
            } else {
                return false;
            }
        } catch (error) {
            return false;
        }
    }

    async function processRemoveGroup1(id: string) {
        try {
            const response = await removeGroupById(id);
            if (response) {
                // if (response.code === 200) {
                // Message.success('删除成功');
                getGroupData();
                return true;
            } else {
                return false;
            }
        } catch (error) {
            return false;
        }
    }

    async function processClearGroup(id: string) {
        try {
            const response = await clearGroupBookmarksById(id);
            if (response) {
                // if (response.code === 200) {
                // Message.success('删除成功');
                getGroupData();
                return true;
            } else {
                return false;
            }
        } catch (error) {
            return false;
        }
    }

    const openUrls = (tags) => {
        if (tags.length > 0) {
            tags.forEach((tag, index) => {
                // setTimeout(() => {
                // if (confirm(`是否打开链接 ${tag.url}？`)) {
                window.open(tag.url, '_blank');
                // }
                // }, index * 100); // 每个链接延迟500毫秒打开
            });
        }
    }


    const [visible, setVisible] = useState(false);
    const tabMore = (subGroup) => {
        // 创建自定义事件并分发
        const json = JSON.stringify({ id: subGroup.id, name: subGroup.name, hide: subGroup.hide, pId: subGroup.pId });

        /*  const processRemoveGroup = async () => {
            try {
                const response = await removeGroup(subGroup.id);
                if (response.code === 200) {
                    // Message.success('删除成功');
                    getGroupData();
                    return true;
                } else {
                    return false;
                }
            } catch (error) {
                return false;
            }
        } */

        const processRemoveGroup1 = async () => {
            try {
                const response = await removeGroupById(subGroup.id);
                if (response) {
                    // Message.success('删除成功');
                    getGroupData();
                    return true;
                } else {
                    return false;
                }
            } catch (error) {
                return false;
            }
        }


        // 绑定到一个按钮的点击事件上

        // 2级分组菜单
        const onClickMenuItem = (key: string, event) => {
            const index = key.indexOf('-');
            if (index !== -1) {
                const [part1, ...rest] = key.split('-');
                // 2. 使用 join 将 rest 数组重新组合成一个字符串
                //    ["123", "profile"].join('-') 会变成 "123-profile"
                const part2 = rest.join('-');
                const subGroup = JSON.parse(part2);
                key = part1;
                if (key === '0') {//添加Tag
                    setAddTagVisible(true);
                    setEditTag(null)
                    setTagSelectGroup(cardData.id === subGroup.id ? [subGroup.id] : [cardData.id, subGroup.id]);
                } else if (key === '1') {//编辑Group2
                    setTabForm(true);
                    setTabGroup(subGroup);
                    setSelectGroup(cardData.id);
                    // setRequirePid(true)
                } else if (key === '2') {//删除Group2
                    //弹出确认框
                    // removeConfirm(sub subGroup.name, '点击确定将删除该分组及其所有标签', '分组', processRemoveGroup);
                    removeConfirm(subGroup.id, subGroup.name, '点击确定将删除该分组及其所有标签', '分组', processRemoveGroup1);
                } else if (key === '3') {//打开全部标签
                    //test
                    let tags = [];
                    data.children.some((item) => {
                        if (item.id === subGroup.id) {//非隐藏的
                            tags = item.urlList;
                            return true;//终止遍历
                        } else {//当前项隐藏
                            return false;//继续遍历
                        }
                    });
                    openUrls(tags);

                }
            };
        }

        if (subGroup.id + '' === activeTab)
            return <Dropdown
                droplist={
                    <Menu onClickMenuItem={onClickMenuItem} mode='pop'>
                        {/* {['添加', '编辑', '删除', '打开'].map((item, index) => (
                            <Menu.Item key={index.toString() + '-' + json} >{item}</Menu.Item>
                        ))} */}

                        {/* {subGroup.pId != null && */}
                        {
                            <>
                                <Menu.Item key={'0-' + json} >添加</Menu.Item>
                                <Menu.Item key={'1-' + json} >编辑</Menu.Item>
                                <Menu.Item key={'2-' + json} >删除</Menu.Item>
                            </>
                        }
                        {subGroup.urlList && subGroup.urlList.length > 0 && <Menu.Item key={'3-' + json} >打开</Menu.Item>}
                    </Menu>
                }
                trigger="hover"
                onVisibleChange={setVisible}
                popupVisible={visible}
            >
                <div className="tab-more" style={{ display: 'inline-block', color: 'var(--color-text-2)' }}>
                    <IconMore />
                </div>
            </Dropdown>
    }

    const [loading, setLoading] = useState(true);

    //提交成功后关闭或取消关闭Modal窗口
    async function closeAddTagModal(success: boolean, newTag: WebTag, type: number) {
        setAddTagVisible(false);
        if (success) {//刷新当前页面数据
            // console.log('close Modal group', newTag);
            // getGroupData();
            if (newTag) {//所在的分组，重置位置
                if (type === 0) {//修改了分组
                    // console.log('close Modal group', newTag);
                    const group = await getBookmarkGroupById(newTag.gId);
                    processReload(group);//切换到新的分组
                    // setActiveTab(newTag.gId + '');//激活新的分组Tab
                } else if (type === 1) {
                    refreshDataByUpdateBookmark(newTag);//修改
                } else if (type === 2) {
                    refreshDataByAddBookmark(newTag);//新增
                }
            }
        }
    }


    const processReload = async (group) => {
        await getGroupData();
        // console.log('33333333 processReload setActiveGroup', group)
        if (group && group.type == "folder") {
            dispatch(updateActiveGroup(group));
        }

        /* if (group.pId) {//2级分组
            if (cardData.id !== group.pId) {//所在的Card发生了变化 设置activegroup
                dispatch(updateActiveGroup(group))
            } else if (!group.hide || showItem) {//
                if (cardData.id === 27) console.log(cardData.name + 'processReload  setActiveTab=', group.id + '')
                // setActiveTab(group.id + '')
                dispatch(updateActiveGroup(group))
            }
        } else { //1级分组
            if (cardData.id !== group.id) {//所在的Card发生了变化 设置activegroup
                dispatch(updateActiveGroup(group))
            } else if (!group.hide || showItem) {//仍然在当前大分组??
                if (cardData.id === 27) console.log(cardData.name + 'processReload  setActiveTab=', group.id + '')
                // setActiveTab(group.id + '')
                dispatch(updateActiveGroup(group))
            }
        } */

        // 设置新的定时器
        // clearTimeout(timeoutId);
        // timeoutId = setTimeout(() => {
        // }, 500);
    }

    //提交成功后关闭或取消关闭Modal窗口
    async function closeTabModal(success: boolean, group: any) {
        setTabForm(false);
        if (success) {//刷新当前页面数据
            processReload(group);
            /*  if (cardData.id !== group.pId) {//pId发生了变化 设置activegroup
                 dispatch(updateActiveGroup(group))
             } else if (!group.hide || showItem) {//仍然在当前大分组
                 setActiveTab(group.id + '')
             }
             await getGroupData();
             clearTimeout(timeoutId);
             // 设置新的定时器
             timeoutId = setTimeout(() => {
                 if (group.pId) {
                     window.location.href = `/navigate/user#${group.pId}`;
                 } else {
                     window.location.href = `/navigate/user#${group.id}`;
                 }
             }, 500); */
        }
    }

    const getGroupData = async () => {
        // console.log('card getGroupData')
        const data: any = await dispatch(fetchBookmarksPageData(pageId));
    }

    const addTagOrGroup = (id: number) => {
        // console.log('addTagOrGroup', id)
        setAdd2TypesVisible(true);
    }

    //提交成功后关闭或取消关闭添加标签或分组的Modal窗口
    function closeAdd2TypesModal(success: boolean, group?: any) {
        // console.log('close Modal', success)
        setAdd2TypesVisible(false)
        if (success) {//刷新当前页面数据
            processReload(group);
        }
    }


    // 渲染没有子分组的Card
    const render1sCard = (data, activeTab) => {
        return (
            // (show || treeSelected) &&
            show &&
            <>
                <Card id={data.id} key={index}
                    title={


                        <>
                            <a ref={linkRef} onClick={() => onCardTitleClick(data.id)}> <span>{data.name} {data.hide ? <IconEyeInvisible></IconEyeInvisible> : ''}</span>
                            </a>

                            <ButtonGroup style={{ marginLeft: "10px" }}>
                                <Button onClick={(e) => addTagOrGroup(data.id)} icon={<IconPlus />} >添加</Button>
                                <Button onClick={editGroup1} icon={<IconEdit />} >编辑</Button>
                                {data.hide && <Button onClick={switchGroup1} icon={<IconEye />} >展示</Button>}
                                {!data.hide && <Button onClick={switchGroup1} icon={<IconEyeInvisible />} >隐藏</Button>}
                                <Button onClick={removeGroup1} icon={<IconDelete />} >删除</Button>
                                {data.urlList.length > 0 && <Button onClick={clearGroup} icon={<IconEraser />} >清空</Button>}
                                {/* {!first && < Button onClick={moveGroupToTop} icon={<IconToTop />} >置顶</Button>}
                                {!last && < Button onClick={moveGroupToBottom} icon={<IconToBottom />} >置底</Button>} */}
                                {data.urlList.length > 0 && < Button onClick={(e) => openGroupAllTags(data)} icon={<IconLink />} >打开全部</Button>}
                            </ButtonGroup>
                        </>
                    }
                    extra={
                        <div className='card-no-child-more'>
                            {data.itemHide && <label style={{ margin: '5px 8px 0 15px', fontSize: '14px' }}>
                                <Typography.Text style={{ color: 'var(--color-text-2)' }}>显示</Typography.Text>
                                <Switch size='small' style={{ marginLeft: 12, marginRight: 12 }} checked={showItem} onChange={switchShow}></Switch>
                            </label>}

                            <Input.Search
                                allowClear
                                style={{ width: '240px' }}
                                placeholder={`在${data.name}中搜索`}
                                onChange={onInputChange}
                                value={searchInput}
                            />
                        </div>
                    }
                    style={{
                        width: '100%',
                    }}
                >

                    {/* 搜索结果 Tab  */}
                    {searching ?
                        <Tabs
                            type="card-gutter"
                            onChange={onTabChange}
                            activeTab={activeTab}
                        >

                            {/*   <TabPane key={cardData.id + ''}
                                title={(searching && (showSearchResult.length !== 0)) ? (<span><span>{cardData.name}</span> <span style={{ color: 'red' }}>{`(${showSearchResult.length})`}</span></span>) : cardData.name}>
                                <div className={styles.container}>
                                    <div className={styles['single-content']}>
                                        {renderTags(false, true, showSearchResult, [data.id])}
                                    </div>
                                </div>
                            </TabPane> */}
                            <TabPane key={searchTabKey} title={<span style={{ color: 'red' }}>{`搜索结果(${showSearchResult.length})`}</span>}>
                                <div className={styles.container}>
                                    <div className={styles['single-content']}>
                                        {renderTags(false, false, showSearchResult)}
                                    </div>
                                </div>
                            </TabPane>
                        </Tabs>
                        :
                        <div className={styles.container}>
                            <div className={styles['single-content-border']}>
                                {renderTags(false, true, data.urlList, [data.id])}
                            </div>
                        </div>
                    }
                </Card>

                <Add2Form
                    isVisible={add2TypesVisible}
                    // selectGroup={cardData.id}
                    selectGroup={cardData}
                    // batchNo={cardData.pageId}
                    pageId={cardData.pageId}
                    closeWithSuccess={closeAdd2TypesModal}>
                </Add2Form>
            </>
        )
    }

    const render2sCard = (data) => {
        return (
            // (show || treeSelected) &&
            (show) &&
            <Card id={data.id} key={index}
                title={
                    <>
                        <span>{data.name}</span>
                        {data.hide ? <IconEyeInvisible></IconEyeInvisible> : ''}
                        <ButtonGroup style={{ marginLeft: "10px" }}>
                            {/* < Button onClick={addGroup1Tag} icon={<IconPlus />} >添加</Button> */}
                            <Button onClick={editGroup1} icon={<IconEdit />} >编辑</Button>
                            {<Button onClick={switchGroup1} icon={data.hide ? <IconEye /> : <IconEyeInvisible />}>{data.hide ? '展示' : '隐藏'}</Button>}
                            {/* {!data.hide && <Button onClick={switchShowGroup1} icon={<IconEyeInvisible />} >隐藏</Button>} */}
                            {/* 只能添加标签不添加分组 */}
                            <Button onClick={removeGroup1} icon={<IconDelete />} >删除</Button>
                            {/* {!first && < Button onClick={moveGroupToTop} icon={<IconToTop />} >置顶</Button>}
                            {!last && < Button onClick={moveGroupToBottom} icon={<IconToBottom />} >置底</Button>} */}
                        </ButtonGroup>
                    </>
                }
                // <IconEyeInvisible />

                extra={
                    data.itemHide && <div style={{ marginLeft: '15px', fontSize: '14px' }}>
                        <Typography.Text style={{ color: 'var(--color-text-2)' }}>显示</Typography.Text>
                        <Switch size='small' style={{ marginLeft: 12, marginRight: 12 }} checked={showItem} onChange={switchShow}></Switch>
                    </div>
                }
                style={{
                    width: '100%',
                }
                }
            >
                <DndProvider backend={HTML5Backend}>
                    <Tabs
                        editable
                        type="card-gutter"
                        onAddTab={handleAddTab}
                        onChange={onTabChange}
                        activeTab={activeTab}
                        // defaultActiveTab={activeTab}
                        // defaultActiveTab={defaultActiveTab}
                        // defaultActiveTab={'103'}
                        /* addButton={
                            <>
                                <div className="tab-more" style={{ display: 'inline-block', color: 'var(--color-text-2)' }}>
                                    <IconPlus />
                                    <a onClick={onResort} ><span style={{ marginLeft: '4px' }}><IconCheck /></span></a>
                                </div>
                            </>
                        } */
                        deleteButton={
                            <></>
                        }
                        extra={
                            <Input.Search
                                allowClear
                                style={{ width: '240px' }}
                                placeholder={`在${data.name}中搜索`}
                                onChange={onInputChange}
                                value={searchInput}>
                            </Input.Search>
                        }
                    >

                        {resort && <TabPane isActive key={'0'}
                            title={
                                <Dropdown
                                    position='bottom'
                                    droplist={
                                        <Menu mode='pop' onClickMenuItem={onClickSort}>
                                            {['保存', '取消'].map((item, index) => (
                                                <Menu.Item key={index.toString()} >{item}</Menu.Item>
                                            ))}
                                        </Menu>
                                    }
                                    trigger="click"
                                // trigger="hover"
                                // onVisibleChange={setVisible}
                                // popupVisible={visible}
                                >
                                    <IconCheck />
                                </Dropdown>
                            }
                        >
                        </TabPane>}

                        {
                            data.children && data.children.map((item, index: number) => (
                                //  (!item.hide || showItem || currentSearch) &&  // 显示子分组 && ...
                                determinShowTabOrNot(item) &&
                                <TabPane key={item.id + ''}
                                    // 当前处于搜索状态且排除临时显示(搜索结果为0但是) 显示结果数量
                                    title=
                                    {<WrapTabNode key={item.id} index={index} moveTabNode={moveTabNode}>
                                        {/* {(searching && (searchResult.length !== 0)) ? */}
                                        {/* 正在搜索且有结果或当前Card被Tree选择 */}
                                        {(searching && (searchResult.length !== 0 || cardData.id == activeCardTab[0])) ?
                                            <span>
                                                <span>{item.name}</span>
                                                <span>{currentSearch}</span>
                                                {item.hide ? <IconEyeInvisible></IconEyeInvisible> : ''}
                                                <span style={{ color: 'red' }}>{`(${showItem ? item.urlList.length : item.notHideTabCount || 0})`}</span>
                                                {/* {item.pId !== null && tabMore(item)} */}
                                                {tabMore(item)}
                                            </span>
                                            :
                                            <span>
                                                <span>{item.name}</span>
                                                {item.hide ? <IconEyeInvisible></IconEyeInvisible> : ''}
                                                {/* 一级分组没有菜单，位于顶部 */}
                                                {/* {!item.pId && tabMore(item)} */}
                                                {tabMore(item)}
                                            </span>}
                                    </WrapTabNode>}

                                >
                                    <div className={styles.container}>
                                        <div className={styles['single-content']}>
                                            {renderTags(
                                                item.hide,
                                                true,
                                                item.urlList,
                                                data.id == item.id ? [data.id] : [data.id, item.id],
                                                // 何时数据为空? 搜索结果过滤隐藏项后结果list为空
                                                // searching && !showItem && item.notHideTabCount == 0
                                                searching && !showItem && (!item.notHideTabCount)
                                            )
                                            }
                                        </div>
                                    </div>
                                </TabPane>
                            ))}


                        {searching && <TabPane key={searchTabKey} title={<span style={{ color: 'red' }}>{`搜索结果(${showSearchResult.length})`}</span>}>
                            <div className={styles.container}>
                                <div className={styles['single-content']}>
                                    {renderTags(false, false, showSearchResult)}
                                </div>
                            </div>
                        </TabPane>}

                    </Tabs>

                </DndProvider>
            </Card >
        )
    }

    function refreshDataByAddBookmark(bookmark: WebTag) {
        // 纯函数：在 node 上尝试更新 tag，返回新的 node 以及是否已更新的标记
        function addTagFromNode(node: any): { node: any; added: boolean } {
            // 如果当前节点有 urlList，优先在此层尝试删除
            if (Array.isArray(node.children) && node.children.length > 0) {
                const newChildren: any[] = [];
                let addedFlag = false;

                for (let i = 0; i < node.children.length; i++) {
                    const child = node.children[i];
                    if (addedFlag) {
                        // 已删除过，后续子项保持原样（避免不必要的深拷贝）
                        newChildren.push(child);
                        continue;
                    }
                    const res = addTagFromNode(child);
                    newChildren.push(res.node);
                    if (res.added) {
                        addedFlag = true;
                        // don't break here because we still need to append the remaining original children unchanged
                        // 但后续循环会直接 push 原 child（see branch above）
                    }
                }
                if (addedFlag) {
                    return { node: { ...node, children: newChildren }, added: true };
                }
            }

            if (bookmark.gId === node.id) {
                if (Array.isArray(node.urlList) && node.urlList.length > 0) {
                    const newUrlList = [...node.urlList, bookmark];
                    return {
                        node: { ...node, urlList: newUrlList },
                        added: true,
                    };
                } else {
                    return {
                        node: { ...node, urlList: [bookmark] },
                        added: true,
                    };
                }
            }
            // 未找到，返回原节点并标记未删除
            return { node, added: false };
        }

        setData(prev => {
            if (!prev) return prev;
            // 从根节点开始递归查找并删除，找到后立即停止进一步修改
            const result = addTagFromNode(prev);
            const updatedData = result.added ? result.node : prev;
            // console.log('refreshDataByAddBookmark', updatedData);
            return updatedData;
        });
    }


    function refreshDataByUpdateBookmark(bookmark: WebTag) {
        // 纯函数：在 node 上尝试更新 tag，返回新的 node 以及是否已更新的标记
        function updateTagFromNode(node: any, tagId: string | number): { node: any; updated: boolean } {
            // 如果当前节点有 urlList，优先在此层尝试删除
            // if (Array.isArray(node.urlList) && node.urlList.length > 0) {
            if (bookmark.gId === node.id && Array.isArray(node.urlList) && node.urlList.length > 0) {
                const idx = node.urlList.findIndex((item: any) => item.id === tagId);
                if (idx !== -1) {
                    const updatedItem = node.urlList[idx];

                    /* if (bookmark.gId != updatedItem.gId) { // 分组发生变化，直接删除该项
                        processReload(null);
                        return { node, updated: true };
                    } */


                    // const newUrlList = node.urlList.filter((item: any) => item.id !== tagId);
                    const updatedBookmark = {
                        ...updatedItem,
                        ...bookmark,
                    };
                    const newUrlList = [...node.urlList];
                    newUrlList[idx] = updatedBookmark;
                    return {
                        node: { ...node, urlList: newUrlList },
                        updated: true,
                    };
                }
            }

            // 如果有 children，则遍历 children，递归处理；一旦在某个子树中删除成功则停止后续遍历
            if (Array.isArray(node.children) && node.children.length > 0) {
                const newChildren: any[] = [];
                let updatedFlag = false;

                for (let i = 0; i < node.children.length; i++) {
                    const child = node.children[i];
                    if (updatedFlag) {
                        // 已删除过，后续子项保持原样（避免不必要的深拷贝）
                        newChildren.push(child);
                        continue;
                    }
                    const res = updateTagFromNode(child, tagId);
                    newChildren.push(res.node);
                    if (res.updated) {
                        updatedFlag = true;
                        // don't break here because we still need to append the remaining original children unchanged
                        // 但后续循环会直接 push 原 child（see branch above）
                    }
                }
                if (updatedFlag) {
                    return { node: { ...node, children: newChildren }, updated: true };
                }
            }
            // 未找到，返回原节点并标记未删除
            return { node, updated: false };
        }

        setData(prev => {
            if (!prev) return prev;
            // 从根节点开始递归查找并删除，找到后立即停止进一步修改
            const result = updateTagFromNode(prev, bookmark.id);
            return result.updated ? result.node : prev;
        });
    }

    function refreshData1(tag: WebTag) {
        // 纯函数：在 node 上尝试删除 tag，返回新的 node 以及是否已删除的标记
        function removeTagFromNode(node: any, tagId: string | number): { node: any; removed: boolean } {
            // 如果当前节点有 urlList，优先在此层尝试删除
            if (Array.isArray(node.urlList) && node.urlList.length > 0) {
                const idx = node.urlList.findIndex((item: any) => item.id === tagId);
                if (idx !== -1) {
                    const removedItem = node.urlList[idx];
                    const newUrlList = node.urlList.filter((item: any) => item.id !== tagId);
                    // 仅当被删除项不是隐藏项时，才减少 notHideTabCount
                    const decrease = removedItem && removedItem.hide ? 0 : 1;
                    const newNotHide = Math.max(0, (node.notHideTabCount || 0) - decrease);
                    // 返回新的节点并标记已删除，终止进一步递归
                    return {
                        node: { ...node, urlList: newUrlList, notHideTabCount: newNotHide },
                        removed: true,
                    };
                }
            }

            // 如果有 children，则遍历 children，递归处理；一旦在某个子树中删除成功则停止后续遍历
            if (Array.isArray(node.children) && node.children.length > 0) {
                const newChildren: any[] = [];
                let removedFlag = false;

                for (let i = 0; i < node.children.length; i++) {
                    const child = node.children[i];
                    if (removedFlag) {
                        // 已删除过，后续子项保持原样（避免不必要的深拷贝）
                        newChildren.push(child);
                        continue;
                    }
                    const res = removeTagFromNode(child, tagId);
                    newChildren.push(res.node);
                    if (res.removed) {
                        removedFlag = true;
                        // don't break here because we still need to append the remaining original children unchanged
                        // 但后续循环会直接 push 原 child（see branch above）
                    }
                }

                if (removedFlag) {
                    return { node: { ...node, children: newChildren }, removed: true };
                }
            }
            // 未找到，返回原节点并标记未删除
            return { node, removed: false };
        }

        setData(prev => {
            if (!prev) return prev;
            // 从根节点开始递归查找并删除，找到后立即停止进一步修改
            const result = removeTagFromNode(prev, tag.id);
            return result.removed ? result.node : prev;
        });
    }



    function handleDeleteSuccess(tag: WebTag) {
        refreshData1(tag);
    }

    function determinShowTabOrNot(item: any) {
        let dis: boolean = false;
        if (searching) {
            // 正在搜索，有数据或当前tab被（Tree）激活  
            //展示隐藏的分分组
            if (showItem) {//展示隐藏的分分组（但搜索结果urlList不能为空）
                // console.log('>>>>>>>>>> determinShowTabOrNot', item.name, item, showItem);
                dis = (item.urlList && item.urlList.length > 0) || item.id == activeTab;
                // console.log(">>>>>>>>>" + item.name, dis);
            } else {//不展示隐藏的分分组
                // console.log('<<<<<<<<<<< determinShowTabOrNot', item.name, item.hide, showItem);
                dis = (!item.hide && item.notHideTabCount > 0) || item.id == activeTab
            }
        } else {
            dis = !item.hide || showItem;
        }
        return dis;
    }


    // 渲染标签列表
    const renderTags = (
        parentHide: boolean,
        add: Boolean,
        list?: Array<WebTag>,
        selectGroup?: Array<number>,
        empty?: boolean,
    ) => {
        if (empty || (list == null) || list.length == 0) {
            return <Empty
            />;
        }
        return (
            <div style={{ width: '100%' }}>
                <Grid cols={{ xs: 1, sm: 2, md: 3, lg: 4, xl: 5, xxl: 6 }} colGap={12} rowGap={16} >
                    {list.map((item, index) => (
                        ((!item.hide) || (item.hide && showItem)) && //不隐藏或设置显示隐藏
                        <GridItem key={item.id} className='demo-item'>
                            {/* <TagItem tag={item} parentHide={parentHide} loading={loading} /> */}
                            <TagItem tag={item} parentHide={parentHide} no={pageId}
                                editTag={onEditTag}
                                onDeleteSuccess={handleDeleteSuccess}
                                loading={loading} selectGroup={selectGroup}
                            />
                        </GridItem>
                    ))}
                    {/* 添加 */}
                    {/*  {add && <GridItem key={list.length + 1 + ''} className='demo-item'>
                        <TagAdd selectGroup={selectGroup} />
                    </GridItem>} */}
                </Grid>
            </div>
        );
    };

    // 返回结果
    return (
        <>
            {/* 或全部等于隐藏 */}
            {data.children && data.children.length === 0 ? render1sCard(data, activeTab) : render2sCard(data)}
            {/* 添加或编辑标签、分组 */}
            <TagForm isVisible={addTagVisible} selectGroup={tagSelectGroup} data={editTag} closeWithSuccess={closeAddTagModal}></TagForm>
            {/* {tabForm && <TabGroupForm selectGroup={selectGroup} pageId={pageId} groupName={cardData.name} closeWithSuccess={closeTabModal} group={tabGroup}></TabGroupForm>} */}
            <TabGroupForm selectGroup={selectGroup} pageId={pageId} visible={tabForm} closeWithSuccess={closeTabModal} group={tabGroup}></TabGroupForm>
        </>
    )

}

export default renderCard