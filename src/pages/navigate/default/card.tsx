import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import TagItem from './tag/card-tag';
import { WebTag } from './interface';
import { Tabs, Card, Switch, Empty, Input, Dropdown, Menu, Typography, Message, Grid, Form, Button, Space } from '@arco-design/web-react';
import { IconEyeInvisible } from '@arco-design/web-react/icon';
import styles from './style/index.module.less';
// import TagForm from './form/tag-form';
// import TabGroupForm from './form/tab-group-form';
// import Add2Form from './form/add2form';
// import { removeConfirm } from './form/remove-confirm-modal';
// import { clearConfirm } from './form/clear-confirm-modal';
import { removeGroup, saveTagGroup, moveGroupTopBottom } from '@/api/navigate';
import { useDispatch } from 'react-redux'
import { fetchBookmarksPageData, updateActiveGroup } from '@/store/modules/global';
import { useDrag, useDrop } from 'react-dnd';
import TabsContainer from '../../../components/NestedTabs/TabsContainer0';
import { sortGroup } from '@/api/navigate';
const TabPane = Tabs.TabPane;
const ButtonGroup = Button.Group;
const { Row, Col, GridItem } = Grid;
// import locale from './locale';
// import useLocale from '@/utils/useLocale';
// 搜索结果tab-key
const searchTabKey = 'search-result'

////////////////////////
interface DragItem {
    index: number;
}

interface WrapTabNodeProps {
    index: number;
    id: string;
    node: any;
    moveTabNode: (dragIndex: number, hoverIndex: number, node: any) => void;
    children: React.ReactNode;
}

const WrapTabNode = (props: WrapTabNodeProps) => {
    const { index, id, node, moveTabNode, children, ...elseProps } = props;


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
            // // console.log('WrapTabNode hover key', key);
            // console.log('WrapTabNode hover index', index);
            // console.log('WrapTabNode hover node', node);
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

            moveTabNode(dragIndex, hoverIndex, node);

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
////////////////////////

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



// 递归聚合版本搜索：在保留原有 searchData 行为的同时，增加每个节点的聚合字段
// 返回的节点包含原有的 `searchResult` 与 `noHiddenSearchResult` 字段，
// 并额外添加 `childrenMatchCount`（直接子节点命中数）和 `totalMatchCount`（子树内总命中数）。


function searchDataAggregated(inputValue, cardData) {
    const regex = new RegExp(`(${inputValue})`, 'gi');

    function processLeaf(data) {
        const bookmarks = [];
        const searchResult = [];
        const filterHiddenSearchResult = [];
        let totalMatchCount = 0;

        (data.bookmarks).forEach((bookmark) => {
            let contains = false;
            const originalName = bookmark.name || '';
            const originalDescription = bookmark.description || '';

            let name = bookmark.name || '';
            let description = bookmark.description || '';
            const parts = name.split(regex);
            let displayName = name;
            if (parts.length >= 3) {
                contains = true;
                displayName = Highlight(parts, inputValue);
            }
            const parts1 = (description || '').split(regex);
            if (parts1.length >= 3) {
                contains = true;
                description = Highlight(parts1, inputValue);
            }

            if (contains) {
                // const resultBookmark = { ...bookmark, path: data.path, nameLength: (displayName || '').length, originalName, originalDescription, name: displayName, description };
                const resultBookmark = { ...bookmark, nameLength: (displayName || '').length, originalName, originalDescription, name: displayName, description };
                bookmarks.push(resultBookmark);
                searchResult.push(resultBookmark);
                if (!bookmark.hide) filterHiddenSearchResult.push(resultBookmark);
                totalMatchCount += 1;
            }
        });

        return {
            ...data,
            bookmarks: data.bookmarks,
            searchResult,
            filterHiddenSearchResult,
            // 兼容旧字段名：noHiddenSearchResult
            noHiddenSearchResult: filterHiddenSearchResult,
            // childrenMatchCount: 0,
            totalMatchCount,
        };
    }

    function processNode(node, level = 0) {
        // 叶子（只有 bookmarks）：处理搜索
        if ((!node.children || node.children.length === 0) && node.bookmarks) {
            return processLeaf(node);
        }

        // 含 children 的节点：递归处理子节点
        if (Array.isArray(node.children) && node.children.length > 0) {
            let childrenMatchCount = 0;
            let totalMatchCount = 0;
            const newChildren = node.children.map((child) => {
                const updated = processNode(child, level + 1);
                const childTotal = Number(updated.totalMatchCount || 0);
                if (childTotal > 0) childrenMatchCount += 1;
                totalMatchCount += childTotal;//汇总子分组的查询结果总数
                return updated;
            });

            // const filteredChildren = newChildren;

            // 保留原有顺序：先收集有命中的子节点，再收集无命中的子节点
            const nonZero = newChildren.filter(c => Number(c.totalMatchCount || 0) > 0);
            const zero = newChildren.filter(c => Number(c.totalMatchCount || 0) === 0);
            //保持稳定性排序
            nonZero.sort((a, b) => ((a.order ?? a.addDate ?? 0) - (b.order ?? b.addDate ?? 0)));

            const searchChildren = [...nonZero, ...zero];

            // 汇总子节点的 searchResult 与 filterHiddenSearchResult（基于过滤后的子节点）
            const aggregatedSearchResult = [];
            const aggregatedFilterHidden = [];   //过滤掉隐藏的搜索结果
            searchChildren.forEach((c) => {
                if (c.searchResult && c.searchResult.length) aggregatedSearchResult.push(...c.searchResult);
                if (c.filterHiddenSearchResult && c.filterHiddenSearchResult.length) aggregatedFilterHidden.push(...c.filterHiddenSearchResult);
            });


            const res = {
                ...node,
                children: searchChildren,
                // searchChildren: searchChildren,
                searchResult: aggregatedSearchResult,
                filterHiddenSearchResult: aggregatedFilterHidden,
                // 兼容旧字段名：noHiddenSearchResult
                noHiddenSearchResult: aggregatedFilterHidden,
                totalMatchCount,
            };
            return res;
        }

        // 无 children 且无 bookmarks 的节点
        return { ...node, searchResult: [], filterHiddenSearchResult: [], childrenMatchCount: 0, totalMatchCount: 0 };
    }

    // 入口：保留和 searchData 一致的判断逻辑
    if (cardData.bookmarks && (!cardData.children || cardData.children.length === 0)) {
        return processLeaf(cardData);
    }
    return processNode(cardData, 0);
}

// function renderCard({ cardData, display, activeCardTab, setCardTabActive, keyWord, hasResult }) {//hasResult
function renderCard({ cardData, treeSelectedNode, setCardTabActive, keyWord }) {//hasResult

    // if (cardData.id === 'vu2pi7002')
    // console.log(cardData.name + ' 渲染了>>>>>>>>>>>>>>', keyWord, hasResult);
    // console.log(cardData.name + ' 渲染了>>>>>>>>>>>>>>', keyWord, treeSelectedNode);
    const dispatch = useDispatch();
    const pageId = cardData.pageId;

    const [data, setData] = useState(cardData);
    const [activeCardTab, setActiveCardTab] = useState(treeSelectedNode);
    const [treeSelected, setTreeSelected] = useState(false);//当前card是被tree选中
    // 当前搜索结果
    const [searchResult, setSearchResult] = useState([]);
    const [noHiddenSearchResult, setNoHiddenSearchResult] = useState([]);
    const [showSearchResult, setShowSearchResult] = useState([]);

    // 搜索中
    const [searching, setSearching] = useState(false);
    // 当前被tree选中

    // 当前Card搜索
    const [currentSearch, setCurrentSearch] = useState(false);
    const [searchInput, setSearchInput] = useState('');
    // const linkRef = useRef(null);
    //该Card是否展示(有搜索结果)
    const [cardShow, setCardShow] = useState(true);
    // 本Card(Group)显示/隐藏 隐藏项
    const [showItem, setShowItem] = useState(true);//默认false

    /*   const getResortData = (preData: any, dragIndex: number, hoverIndex: number, pId: string) => {
          if (preData.id === pId) {//第一层
              const newCards = [...preData.children];
              newCards.splice(hoverIndex, 0, ...newCards.splice(dragIndex, 1));
              // setResort(true);
              return { ...preData, children: newCards }
          } else {
              const children = [...preData.children];
              // return { ...preData, children: getResortData(preData, dragIndex, hoverIndex, pId) }
          }
      } */


    function buildActiveMap(path) {
        const parts = path.split(',').map(s => s.trim());
        const result = {};
        // 前 n-1 个作为 standard key
        for (let i = 0; i < parts.length - 1; i++) {
            const key = parts.slice(0, i + 1).join('-');
            const value = parts[i + 1];
            result[key] = value;
        }
        // console.log('00000000000000 buildActiveMap result path ', path, result)
        return result;
    }

    const getResortData = (parentData: any, dragIndex: number, hoverIndex: number, pId: string) => {
        // 目标层直接重新排序 children
        if (!parentData) return parentData;
        if (parentData.id === pId) {
            if (!Array.isArray(parentData.children)) return parentData;
            const newChildren = [...parentData.children];
            // 防护：确保索引在范围内
            newChildren.splice(hoverIndex, 0, ...newChildren.splice(dragIndex, 1));
            // 为保持顺序一致性：按当前顺序为每个子项设置 order 字段（0,1,2...）

            const updatedChildren = newChildren.map((child, idx) => ({ ...child, order: idx }));

            // 异步持久化排序（仍然使用 resortOrders），并把带 order 的数组返回用于更新本地 state
            // resortOrders(updatedChildren);
            return { ...parentData, children: updatedChildren };
        }

        // 否则递归到子节点，若某个子节点发生变化则返回新的 parent 节点
        if (Array.isArray(parentData.children) && parentData.children.length > 0) {
            let changed = false;
            const newChildren = parentData.children.map(child => {
                const updatedChild = getResortData(child, dragIndex, hoverIndex, pId);
                if (updatedChild !== child) {
                    changed = true;
                    return updatedChild;
                }
                return child;
            });
            if (changed) {
                return { ...parentData, children: newChildren };
            }
        }
        // 未命中，返回原节点
        return parentData;
    }


    const moveTabNode = (dragIndex: number, hoverIndex: number, node: any) => {
        // console.log('dragIndex', dragIndex)
        setData(preData => {
            //如果拖动位置tab是复制分组，则父分组其实是它的原始分组
            return getResortData(preData, dragIndex, hoverIndex, node.copy ? node.id : node.pId);
        });
    }

    // 一、切换Tab标签部分#=====================================================================
    //已废弃
    /*   const getInitialDefaultActiveKeyFromCardData = (cardData) => {
          // console.log(cardData.name + ' getInitialDefaultActiveKeyFromCardData')
          let defaultActiveKey = '';
          if (cardData.children && cardData.children.length !== 0) {
              cardData.children.some((item) => {
                  if (!item.hide) {//非隐藏的
                      // const currentKey = item.id + '';
                      const currentKey = item.id;
                      defaultActiveKey = currentKey;
                      return true;//终止遍历
                  } else {//当前项隐藏
                      return false;//继续遍历
                  }
              });
          }
          return defaultActiveKey;
      } */
    // const [activeTab, setActiveTab] = useState(getInitialDefaultActiveKeyFromCardData(cardData));

    /*  useEffect(() => {
         // if (data.id === 'vu2pi7002') console.log(data.name + ' useEffect data', data);
         // console.log(data.name + ' useEffect data', data);
     }, [data]); */

    useEffect(() => {
        // if (data.id === 'vu2pi7002') 
        // console.log(data.name + ' useEffect treeSelectedNode', treeSelectedNode);
        setActiveCardTab(treeSelectedNode);
    }, [treeSelectedNode]);


    // 处理空字符串搜索
    /*  const processEmptySearch = async () => {
         console.log(cardData.name + '000000000000000 processEmptySearch setActiveTab');
         setSearching(false);
         setShow(true);
         //恢复默认activeTabKey
         // if (cardData.id === 27) console.log(cardData.name + ' processEmptySearch setActiveTab', defaultActiveKey)
         // setActiveMap(activeMap);
         // console.log('processEmptySearch activeMap', activeMap);
         setActiveMap(defaultActiveMap);
         if (!dataUpdated) setData(cardData);//组件中数据未更新时，才更新cardData数据(未从)
     } */


    const processNotEmptySearch = (data, keyWord, showItem, searchTab) => {
        setSearching(true);
        // const result = searchData(keyWord.trim(), cardData);
        // const result = searchDataAggregated(keyWord.trim(), cardData);
        const result = searchDataAggregated(keyWord.trim(), data);
        console.log('--------------------------' + cardData.name + "search keyword=" + keyWord + ",result=", result);
        setData(result);
        // setSearchResult(result.searchResult); //（全部）搜索结果
        // setNoHiddenSearchResult(result.noHiddenSearchResult)//没有隐藏项的搜索结果
        // setActiveMap(prev => ({ ...prev, [cardData.id]: searchTabKey })); //激活<搜索结果>Tab
        if (searchTab) setActiveMap({ [cardData.id]: searchTabKey }); //激活<搜索结果>Tab
        return result;
        /*  if (showItem) {//显示隐藏项目的搜索结果
             return result.searchResult;
         } else {//不显示隐藏项的搜索结果
             return result.noHiddenSearchResult;
         } */
    }

    //当cardData发生变化或keyword发生变化(包括清空)时调用
    /*     const processSearchKeywordChange = (data: [], searchKeyword: string, currentSearch: boolean, searchTab: boolean,) => {
            // console.log("processSearchInputChange", cardData.name, searchKeyword, showCard)
            if (searchKeyword) {//有关键词->搜索->展示?
                setTreeSelected(false);
                if (hasResult) {//(全局？)有搜索结果时
                    const searchResult = processNotEmptySearch(data, searchKeyword, showItem, searchTab)//处理搜索结果
                    // console.log(cardData.name + ' ' + searchInput + ' searchResult', searchResult)
                    setShowSearchResult([...searchResult]);//展示搜索结果 默认展示所有搜索结果
                    //全局搜索时 有结果才显示
                    setCardShow(currentSearch || (!currentSearch && searchResult.length !== 0))
                } else {//没有搜索结果时,如果当前搜索则展示Card
                    setCardShow(currentSearch);
                }
            } else {//处理空字符串搜索 显示(可能改变的)data的bookmarks数据 不显示搜索数据 也不需要处理搜索
                setSearching(false);
                setCardShow(true);
            }
        } */

    const processSearchKeywordChange = (data: [], searchKeyword: string, currentSearch: boolean, searchTab: boolean) => {
        // console.log("ggggggggggggggggggggggg processSearchInputChange", cardData.name, searchKeyword);
        if (searchKeyword) {//有关键词->搜索->展示?
            // setTreeSelected(false);
            const searchResult = processNotEmptySearch(data, searchKeyword, searchTab, currentSearch)//处理搜索结果
            // console.log("ggggggggggggggggggggggg processSearchInputChange searchResult", cardData.name, searchResult);
            if (searchResult.totalMatchCount > 0) {//有搜索结果时
                setCardShow(true);
            } else {//全部没有搜索结果时,如果当前搜索则展示Card
                setCardShow(currentSearch);
            }
        } else {//处理空字符串搜索 显示(可能改变的)data的bookmarks书签数据 不显示搜索数据 也不需要处理搜索
            setSearching(false);
            setCurrentSearch(false);
            setCardShow(true);
        }
    }

    useEffect(() => {
        console.log(cardData.name + ' useEffect >>>>>>>>>>>>>>>>>>>>>', cardData, activeMap)
        //重新进行一次搜索,考虑hasResult并未更新，所以该Card仍然展示
        setData(cardData);
        processSearchKeywordChange(cardData, searchInput, currentSearch, false)//从data中搜索 根据当前Card展示与否
    }, [cardData]);//cardData发生变化，

    useEffect(() => {
        console.log(data.name + ' useEffect keyword >>>>>>>>>>>>>>>>>>>>>', keyWord);
        onKeywordChange(keyWord, false);
    }, [keyWord]);//第一次渲染就会触发,全局搜索关键词


    const onKeywordChange = (searchKeyword: string, currentSearch: boolean) => {
        const keyword = searchKeyword.trim();
        setSearchInput(keyword);
        setCurrentSearch(currentSearch);
        setActiveCardTab([]);//相当于tree选中节点失效,除非重新点击
        //点击搜索后点击tab后应恢复到默认tabs
        if (keyword === '') {
            if (defaultActiveMap) setActiveMap(defaultActiveMap);
            // else initActiveMap(cardData.id);//初始化第一层tabs的activeTab
            else initActiveMap1(cardData);//初始化第一层tabs的activeTab
        } else {//搜索结果tab
            setActiveMap({ [data.id]: searchTabKey })
        }
        //是否展示当前Card: 非隐藏或设置显示，再根据搜索结果判断
        // const showCard = !cardData.hide || display;
        //处理关键词搜索
        processSearchKeywordChange(data, keyword, currentSearch, true);
    }

    const onInputChange = (inputValue) => {
        onKeywordChange(inputValue, true);
        // setShowItem(true);
    }


    // 一、切换Tab标签部分 end#=====================================================================
    const [activeMap, setActiveMap] = useState<Record<string, string>>({});


    const getActiveForPath = (path: string) => {
        if (!path) return undefined;
        const activeValue = activeMap[path];
        return activeValue;
    }


    const setActiveMapThroughChildren = async (key: string, path: string,) => {
        const lastIndex = path.lastIndexOf('-');
        if (lastIndex > -1) {//A.点击的是：3级和以下分组
            /*  const last = path.substring(lastIndex + 1).trim();
             if (last === key) { //是复制分组，本身无子分组
                 const result = buildActiveMap(path.replaceAll('-', ',') + ',' + key);
                 // console.log('66666666666666 setActiveMapThroughChildren  last === key 是复制分组 ', key, path, result);
                 setActiveMap(result);
             } else {
                 const lastChild = await getThroughChild(key);
                 setActiveMap(buildActiveMap(lastChild.path));
             } */
        } else {//B.点击的是：2级分组
            //非复制分组，可能有子分组
            // const lastChild = await getThroughChild(key);
            if (cardData.children && cardData.children.length > 0) {
                const idx = cardData.children.findIndex((item: any) => item.id === key);
                if (idx !== -1) {
                    const child = cardData.children[idx];
                    const activeMap = buildActiveMap(child.path);
                    setActiveMap(activeMap);
                }
            }
            // setActiveMap(buildActiveMap(lastChild.path));
        }
    }


    function getNodeByTabForSearch(paths: string[], groupId) {
        function getThroughFirstChild(paths: string[], group, index = 0) {
            const nodes = group.children;
            if (index < paths.length) {
                const match = paths[index];
                if (nodes && nodes.length > 0) {
                    const childNodes = nodes.filter(node => node.id === match);
                    return childNodes && childNodes.length > 0 ?
                        getThroughFirstChild(paths, childNodes[0], index + 1) : group;
                }
            } else {
                if (nodes && nodes.length > 0) {
                    const childNodes = nodes.filter(node => node.id === groupId);
                    return childNodes.length > 0 ?
                        getThroughFirstChild(paths, childNodes[0], index + 1) : group;
                }
            }
            return group;
        }
        if (paths.length === 0) {//第一 ==> 二层
            const nodes = data.children.filter(node => node.id === groupId);
            return nodes.length > 0 ? nodes[0] : data;// 根节点
        } else return getThroughFirstChild(paths, data, 0);

    }

    function getLastChildForSearchResult(root) {
        function getLastChild(parent) {
            const children = parent.children;
            // console.log("222222222222222222 getThroughSearchResult  data", data);
            if (children.length !== 0) {//第一 ==> 二层
                const nodes = children.filter(node => node.totalMatchCount > 0);
                return nodes.length > 0 ? getLastChild(nodes[0]) : parent;// 根节点
            }
            return parent;
        }
        return getLastChild(root);
    }


    const setActiveMapThroughChildrenForSearch = async (key: string, path: string,) => {
        const paths = path.split('-');
        const key1 = paths.shift();//去掉第一个元素，得到第一层分组
        // const lastChild = getThroughSearchResult(paths, key);
        const tabNode = getNodeByTabForSearch(paths, key);
        const lastChild = getLastChildForSearchResult(tabNode);
        // console.log('000000000000000000 setActiveMapThroughChildrenForSearch  path key lastChild', path, key, lastChild);

        // setActiveMap(prev => ({ ...prev, ...buildActiveMap(lastChild.copy ? lastChild.path + ',' + lastChild.id : lastChild.path) }));
        setActiveMap(prev => ({ ...prev, ...buildActiveMap(lastChild.path) }));
        //如果点击的是复制分组，路径要加上自身id
        // setActiveMap(prev => buildActiveMap(lastChild.copy ? lastChild.path + ',' + lastChild.id : lastChild.path));
    }


    // 层级 onChange：根层沿用原有 onTabChange 逻辑，非根层仅更新 activeMap
    const TabChange = (key: string, node: any, path: string,) => {
        // console.log('9999999999 getActiveForPath node', node, path, key);
        if (searching) {
            if (key === searchTabKey) {//搜索结果tab
                setActiveMap(prev => ({ ...prev, [cardData.id]: searchTabKey }))
            } else {
                // console.log('9999999999-111111111 getActiveForPath node', data, path, key);
                setActiveMapThroughChildrenForSearch(key, path);
            }
        }
        else {
            setActiveMapThroughChildren(key, path);
            // setDropdownVisible(false);
            setEnable(false);
            setTimeout(() => {
                setEnable(true);
            }, 2000);
        }
    }


    const switchShow = () => {
        processShowChange(!showItem);//Card分组内的切换显/隐
        setShowItem(!showItem)//触发重新渲染
        // console.log(cardData.name + '<<<<<<<<<<<<<<<<<<<<<<<<<< switchShow change', showItem)
    }

    const [enable, setEnable] = useState(true); // 控制所有 Dropdown 的禁用
    const [defaultActiveMap, setDefaultActiveMap] = useState(null); // 控制所有 Dropdown 的禁用

    const [dropdownVisible, setDropdownVisible] = useState(true); // 控制所有 Dropdown 的禁用
    const anyDropdownOpenRef = useRef(false);

    const handleDropdownVisibleChange = (visible: boolean) => {
        // console.log('handleDropdownVisibleChange', visible, enable)
        anyDropdownOpenRef.current = visible;
        setDropdownVisible(visible);
    };

    //点击卡片标题
    const onCardTitleClick = (value) => {
        setCardTabActive([String(data.id)])
    }

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
    /*    useEffect(() => {
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
       }, [activeCardTab]); */


    function setActiveMapByTreeSelected() {
        const pathLevels = activeCardTab.length;
        const paths = activeCardTab.join(",");
        if (searching) {
            // console.log('setActiveMapByTreeSelected searching  activeCardTab path ', activeCardTab, paths);
            //根据paths循迹找到node节点，如果它还有子节点则自动active
            if (pathLevels == 1) {
                if (data.list) setActiveMap(buildActiveMap(paths + "," + data.id));//分组有书签数据
                else setActiveMap(buildActiveMap(paths));
            } else {
                const groupId: string = activeCardTab[pathLevels - 1];
                setActiveMapByBookmarksNum(groupId, paths);
            }
        } else {
            if (pathLevels == 1) {
                if (data.list) setActiveMap(buildActiveMap(paths + "," + data.id));//分组有书签数据
                else setActiveMap(buildActiveMap(paths));
            } else {
                const groupId: string = activeCardTab[pathLevels - 1];
                setActiveMapByBookmarksNum(groupId, paths);
            }
        }
    }

    async function setActiveMapByBookmarksNum(gId: string, path: string) {
        // const bookmarksNum: number = await getBookmarksNumByGId(gId);
        // const pathStr = bookmarksNum > 0 ? path + "," + gId : path;
        const pathStr = path + "," + gId;
        setActiveMap(buildActiveMap(pathStr));
    }


    useEffect(() => {
        const cardActive: string = activeCardTab[0];
        // 受控模式
        if (cardActive === data.id) {//当前Card被选中了
            setTreeSelected(true);
            console.log('ggggggggggggggggggggg setTreeSelected', cardActive, activeCardTab);
            setActiveMapByTreeSelected();
            // console.log(cardData.name + ' useEffect activeCardTab', activeCardTab, lastPath)
            //如果在全局搜索模式下当前Card被tree选中且搜索结果为空 =>临时显示全部
        } else {//当前Card没有被选中了
            setTreeSelected(false);
        }
        // setShowByDisplayAndAll(cardData.hide, display, treeSelected1);
    }, [activeCardTab]);


    /* useEffect(() => {
        // console.log(cardData.name + ' useEffect display', display)
        //重新进行一次搜索,考虑hasResult并未更新，所以该Card仍然展示
        setDataFromProps();
        //重置默认激活Tab项
        let defaultKey = true;
        if (activeGroup) {
            //编辑或新增的Tag所属的要激活的Tab,属于当前Card 一级或二级
            if (activeGroup.id === cardData.id || cardData.id === activeGroup.pId) {
                if (!activeGroup.hide || showItem) {//当前不隐藏
                    // if (cardData.id === '0l5tbdjit') console.log(cardData.name + 'useEffect cardData activeGroup setActiveTab=', activeGroup.id + '')
                    // setActiveTab(activeGroup.id + '');
                    defaultKey = false;
                }
                dispatch(updateActiveGroup(null))
            }
        }
        if (defaultKey) {
            // if (cardData.id === '0l5tbdjit') console.log(cardData.name + 'useEffect cardData defalultKey setActiveTab=', defaultActiveKey)
            // setActiveTab(defaultActiveKey);
        }
        //切换显示、隐藏 
        //考虑是否在搜索中？
        // setShowByDisplayAndGroupHide(cardData.hide, display);
        setShowByDisplayAndAll(cardData.hide, display, treeSelected);
    }, [cardData]);//cardData发生变化，新增/修改/删除Group或Tab/隐藏or展示  */

    //三、切换显示/隐藏部分==================================================================================== 


    const onEditTag = (tag: WebTag, nodePath: string[], searching: boolean) => {
    }

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
                // console.log(cardData.name + '--------------- searchResult= 0 ', groupHide, display, treeSelected1);
                // toShow = display && treeSelected1;
                toShow = groupHide ? display && treeSelected1 : treeSelected1;
            }
        } else { //无搜索:看是否有隐藏相或展示隐藏
            toShow = !groupHide || display;
        }
        // if (cardData.id == 9) console.log(cardData.name + '>>>>>> setShowByDisplayAndAllSearchResult', display, searchResult, toShow);
        setCardShow(toShow);//显示√,隐藏 
    }

    const processShowChange = (showItem: boolean) => {
        // console.log(cardData.name, 'processShowChange!!!!!!!!!!!!!!!');
        //情况A.切换为隐藏
        if (!showItem) {//切换为隐藏，如当前为隐藏项目则进行隐藏
            //并遍历全部分组,找出第一个非隐藏子分组进行替换
            // console.log(cardData.name, '切换为隐藏 activeKey');
            // console.log(cardData.name + ' processShowChange setActiveTab= 切换为显示', noHiddenSearchResult);
            if (searching) {
                setShowSearchResult([...noHiddenSearchResult]);//过滤掉隐藏的搜索结果
            }
            //切换到别的Tab
            let toReplaceActive: boolean = false;
            let unHiddenGroupArr = [];//非隐藏的子分组
            data.children.forEach((item) => {
                /*  if ((!item.hide) && (item.id + '' !== activeTab)) {//当前项为非隐藏项，加入数组
                     unHiddenGroupArr.push(item.id + '');
                 }
                 else if ((item.id + '' === activeTab) && item.hide) {//当前项是否隐藏项? 需要替换
                     toReplaceActive = true;
                 } */
            })
            if (toReplaceActive) {//需要切换
                if (searching) {
                    //  console.log(cardData.name + ' processShowChange setActiveTab=', searchTabKey)
                    // setActiveTab(searchTabKey);
                }
                else if (unHiddenGroupArr.length > 0) {
                    const replaceActiveKey = unHiddenGroupArr[0] + '';
                    //  console.log(cardData.name + ' processShowChange setActiveTab=', replaceActiveKey)
                    // setActiveTab(replaceActiveKey);
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



    /*    const onClickSort = (key: string, event) => {
           if (key === '0') {//保存
               const success = saveSort();
           } else if (key === '1') {//取消
               setDataFromProps();//还原顺序
               setResort(false);
           }
       } */
    //五、排序相关 end====================================================================================


    //二、关键词搜索部分====================================================================================


    function initActiveMap1(cardData: any) {
        if (cardData.children && cardData.children.length > 0) {
            const child = cardData.children[0];
            const activeMap = buildActiveMap(child.path);
            setActiveMap(activeMap);
            setDefaultActiveMap(activeMap);//默认的 缓存起来
        }
        // const lastChild = await getThroughChild(pGroupId);

    }

    //二、关键词搜索部分end ====================================================================================

    const handleAddTab = (group) => {
        // console.log('添加分组Tab handleAddTab', group, pathArr);
        // setSelectGroup([group.id]);
    };

    // 提交表单数据Group

    //打开全部标签
    const openGroupAllTags = (group) => {
        // console.log('打开全部标签', group)
        openUrls(group.bookmarks);
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


    // const [visible, setVisible] = useState(false);
    const tabMore = (subGroup, popUp) => {
        // 创建自定义事件并分发
        // console.log('xxxxxxxxxxxxxxxxxxxxxxxxxxx tabMore', subGroup, popUp);
        const json = JSON.stringify({ id: subGroup.id, name: subGroup.name, hide: subGroup.hide, path: subGroup.path, pId: subGroup.pId });

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
                const pathArr: string[] = subGroup.path.split(",");
                if (key === '0') {//收藏
                } else if (key === '3') {//打开全部标签
                    //test
                    let tags = [];
                    data.children.some((item) => {
                        if (item.id === subGroup.id) {//非隐藏的
                            tags = item.bookmarks;
                            return true;//终止遍历
                        } else {//当前项隐藏
                            return false;//继续遍历
                        }
                    });
                    openUrls(tags);
                }
            };
        }

        return <Dropdown
            position={'top'}
            droplist={
                <Menu onClickMenuItem={onClickMenuItem} mode='pop'>
                    {/* {['添加', '编辑', '删除', '打开'].map((item, index) => (
                            <Menu.Item key={index.toString() + '-' + json} >{item}</Menu.Item>
                        ))} */}
                    {/* {subGroup.pId != null && */}
                    {
                        enable && dropdownVisible && <>
                            {/* <Menu.Item key={'0-' + json} >♥♡♥收藏</Menu.Item> */}
                            <Menu.Item key={'0-' + json} >♡收藏</Menu.Item>
                            {/* {subGroup.bookmarks && subGroup.bookmarks.length > 0 && <Menu.Item key={'3-' + json} >打开</Menu.Item>} */}
                        </>
                    }

                </Menu>
            }
            trigger="hover"
            // onVisibleChange={setVisible}
            //不再由Dropdown组件控制visible状态，而是通过onTabMouseEnter事件在tab组件中由enter值(true/false)设置的popupVisible控制
            // onVisibleChange={handleDropdownVisibleChange}
            popupVisible={popUp}
        >
            {/*  <div className="tab-more" style={{ display: 'inline-block', color: 'var(--color-text-2)' }}>
                    <IconMore />
                </div> */}
            {subGroup.name}
            {/* {subGroup.copy ? 'copy' : 'self'} */}
            {subGroup.hide ? <IconEyeInvisible></IconEyeInvisible> : ''}

        </Dropdown>
    }

    const [loading, setLoading] = useState(true);

    //提交成功后关闭或取消关闭Modal窗口


    const getGroupData = async () => {
        // console.log('card getGroupData')
        const data: any = await dispatch(fetchBookmarksPageData(pageId));
    }



    function determinShowTabOrNot(item: any) {
        let dis: boolean = false;
        if (searching) {
            // 正在搜索，有数据或当前tab被（Tree）激活  
            //展示隐藏的分分组
            if (showItem) {//展示隐藏的分分组（但搜索结果bookmarks不能为空）
                // console.log('>>>>>>>>>> determinShowTabOrNot', item.name, item, showItem);
                dis = item.bookmarks && item.bookmarks.length > 0;
            } else {//不展示隐藏的分分组
                // console.log('<<<<<<<<<<< determinShowTabOrNot', item.name, item.hide, showItem);
                // dis = (!item.hide && item.notHideTabCount > 0) || item.id == activeTab
                dis = !item.hide && item.notHideTabCount > 0;
            }
        } else {
            dis = !item.hide || showItem;
        }
        return dis;
    }

    // 渲染标签列表
    const renderTags = (
        // groupHide: boolean,
        list: Array<WebTag>,
        selectGroup: string,
        // empty: boolean,
        searching: boolean
    ) => {
        if (!list || list.length == 0) {
            return <Empty />;
        }
        return (
            <div style={{ width: '100%' }}>
                <Grid cols={{ xs: 1, sm: 2, md: 3, lg: 4, xl: 5, xxl: 6 }} colGap={12} rowGap={16} >
                    {list.map((item, index) => (
                        ((!item.hide) || (item.hide && showItem)) && //不隐藏或设置显示隐藏
                        <GridItem key={item.id} className='demo-item'>
                            {/* <TagItem tag={item} parentHide={parentHide} loading={loading} /> */}
                            <TagItem tag={item}
                                // parentHide={groupHide}
                                no={pageId}
                                searching={searching}
                                editTag={onEditTag}
                                // onDeleteSuccess={handleDeleteSuccess}
                                loading={loading}
                                selectGroup={selectGroup}
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


    // 通用递归渲染器 scaffold：支持任意深度的分组渲染
    // 后续步骤将逐步把 Tabs 渲染迁移到此函数，并引入按层 activeMap 与懒渲染策略。
    function RenderNode(node: any, pathKey?: string, level: number = 0) {
        const currentPath = pathKey || `${node.id}`;

        // 叶子节点：根层(render root) 使用 Card 包裹 tags；非根层只返回标签容器（由父层 Tabs 放置在 TabPane 中）
        if (!node.children || node.children.length === 0) {
            const data = node;
            if (level === 0) {//仅有一层根层
                return (
                    <>
                        <Card id={data.id} key={data.id}


                            title={data.name}

                            extra={
                                <div className='card-no-child-more'>
                                    {data.itemHide && <label style={{ margin: '5px 8px 0 15px', fontSize: '14px' }}>
                                        <Typography.Text style={{ color: 'var(--color-text-2)' }}>显示</Typography.Text>
                                        {/* <Switch size='small' style={{ marginLeft: 12, marginRight: 12 }} checked={showItem} onChange={switchShow}></Switch> */}
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
                            style={{ width: '100%' }}
                        >
                            {/* 搜索结果 Tab  */}
                            {searching ?
                                <Tabs
                                    type="card-gutter"
                                    onChange={TabChange}
                                    className={treeSelected && activeCardTab[0] == data.id ? 'treeActiveTabSelectedB' : null}
                                >
                                    <TabPane key={searchTabKey}
                                        title={
                                            // <span style={{ color: 'red' }}>{`搜索结果(${showSearchResult.length})`}</span>
                                            <span style={{ width: '100%', color: 'red', display: 'block', padding: '4px 16px' }}>{`搜索结果(${data.searchResult.length})`}</span>
                                        }>
                                        <div className={styles.container}>
                                            <div className={styles['single-content']}>
                                                {renderTags(data.searchResult, data.path, true)}
                                            </div>
                                        </div>
                                    </TabPane>
                                </Tabs>
                                :
                                // <div className={styles.container}>

                                <div className={styles['single-content-border']} style={{ backgroundColor: activeCardTab.includes(data.id) ? 'aliceblue' : '' }}>
                                    {renderTags(data.bookmarks, data.path, false)}
                                </div>
                                // </div>

                            }
                        </Card>

                    </>
                );
            }

            // 非根层叶子：返回 tags 容器，父层 TabPane 会放置该内容
            return (
                renderTags(searching ? data.searchResult : data.bookmarks, data.path, false)
            );
        }

        // 非叶子：使用 Card 包裹 Tabs（将 Card 放在顶部）
        const data = node;
        return (
            level == 0 ?
                <Card id={data.id} key={data.id}
                    title={data.name}
                    className={treeSelected && !searching && activeCardTab.length == 1
                        ? 'default-selected-card' : ''}
                    extra={
                        <Input.Search
                            allowClear
                            style={{ width: '240px' }}
                            placeholder={`在${data.name}中搜索`}
                            onChange={onInputChange}
                            value={searchInput}
                        />
                    }
                    style={{ width: '100%' }
                    }
                >
                    <TabsContainer
                        data={data}
                        currentPath={currentPath}
                        level={level}
                        RenderNode={RenderNode}
                        handleAddTab={handleAddTab}
                        onTabChange={TabChange}
                        activeTab={getActiveForPath(currentPath)}
                        onInputChange={onInputChange}
                        searchInput={searchInput}
                        determinShowTabOrNot={determinShowTabOrNot}
                        WrapTabNode={WrapTabNode}
                        searching={searching}
                        activeCardTab={activeCardTab}
                        treeSelected={treeSelected}
                        tabMore={tabMore}
                        showItem={showItem}
                        searchTabKey={searchTabKey}
                        showSearchResult={showSearchResult}
                        renderContent={(child: any, idx: number) => (
                            <div className={styles.container}>
                                <div className={styles['single-content']}>
                                    {RenderNode(child, `${currentPath}-${child.id}`, level + 1)}
                                </div>
                            </div>
                        )}
                        renderSearchContent={() => (
                            <div className={styles.container}>
                                <div className={styles['single-content']}>
                                    {renderTags(data.searchResult, data.path, true)}
                                </div>
                            </div>
                        )}
                    />

                </Card >
                :

                <TabsContainer
                    data={data}
                    currentPath={currentPath}
                    level={level}
                    RenderNode={RenderNode}
                    handleAddTab={handleAddTab}
                    activeTab={getActiveForPath(currentPath)}
                    onInputChange={onInputChange}
                    onTabChange={TabChange}
                    searchInput={searchInput}
                    determinShowTabOrNot={determinShowTabOrNot}
                    WrapTabNode={WrapTabNode}
                    searching={searching}
                    activeCardTab={activeCardTab}
                    treeSelected={treeSelected}
                    tabMore={tabMore}
                    showItem={showItem}
                    searchTabKey={searchTabKey}
                    showSearchResult={showSearchResult}
                    renderContent={(child: any, idx: number) => (
                        <div className={styles.container}>
                            <div className={styles['single-content']}>
                                {RenderNode(child, `${currentPath}-${child.id}`, level + 1)}
                            </div>
                        </div>
                    )}
                    renderSearchContent={() => (
                        <div className={styles.container}>
                            <div className={styles['single-content']}>
                                {renderTags(data.searchResult, data.path, true)}
                            </div>
                        </div>
                    )}
                />
        )
    }

    // 返回结果
    return (
        <>{cardShow && RenderNode(data, data.id, 0)}</>
    )

}

export default renderCard