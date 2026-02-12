import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import TagItem from './tag/card-tag';
import { WebTag } from './interface';
import { Tabs, Card, Switch, Empty, Input, Tag, Dropdown, Menu, Typography, Message, Grid, Form, Button, Space } from '@arco-design/web-react';
import { IconEyeInvisible, IconToTop, IconMore, IconPlus, IconEraser, IconToBottom, IconLink, IconDelete, IconEdit, IconEye, IconCheck } from '@arco-design/web-react/icon';
import styles from './style/index.module.less';
import TagForm from './form/tag-form';
import TabGroupForm from './form/tab-group-form';
import Add2Form from './form/add2form';
import { removeConfirm } from './form/remove-confirm-modal';
import { clearConfirm } from './form/clear-confirm-modal';
import { removeGroup, saveTagGroup, moveGroupTopBottom } from '@/api/navigate';
import { useDispatch } from 'react-redux'
import { fetchBookmarksPageData, updateActiveGroup, updatePageBookmarkTags, updateSearchState, updatePageDataState } from '@/store/modules/global';
import { getBookmarkGroupById, removeGroupById, getBookmarksGroupById, resortNodes, getBookmarksNumByGId, clearGroupBookmarksById, getThroughChild } from '@/db/bookmarksPages';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import TabsContainer from '../../../components/NestedTabs/TabsContainer';
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
                const resultBookmark = { ...bookmark, path: data.path, nameLength: (displayName || '').length, originalName, originalDescription, name: displayName, description };
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
            // childrenMatchCount: 0,
            totalMatchCount,
        };
    }

    function processNode(node, level = 0) {
        // 叶子（只有 urlList）：处理搜索
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
                totalMatchCount,
            };
            return res;
        }

        // 无 children 且无 urlList 的节点
        return { ...node, searchResult: [], filterHiddenSearchResult: [], childrenMatchCount: 0, totalMatchCount: 0 };
    }

    // 入口：保留和 searchData 一致的判断逻辑
    if (cardData.bookmarks && cardData.children.length === 0) {
        return processLeaf(cardData);
    }
    return processNode(cardData, 0);
}



// function renderCard({ cardData, display, activeCardTab, setCardTabActive, keyWord, hasResult }) {//hasResult
function renderCard({ cardData, display, tags, treeSelectedNode, setCardTabActive, keyWord, hasResult }) {//hasResult

    // 抽离的子组件：显示选中的 tags
    const SelectedTags = ({ tags }: { tags: Array<any> }) => {
        if (!tags || tags.length === 0) return null;
        return (
            <>
                {tags.map((item) => (
                    <Tag
                        key={item.key}
                        style={{
                            marginRight: '16px',
                            marginTop: '5px',
                            flex: '0 0 auto',
                            maxWidth: '160px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            display: 'inline-block',
                        }}
                        color={item.color}
                    >
                        {item.key}
                    </Tag>
                ))}
            </>
        );
    };

    // if (cardData.id === 'vu2pi7002')
    // console.log(cardData.name + ' 渲染了>>>>>>>>>>>>>>', keyWord, cardData);

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

    const resortOrders = async (nodes: any[]) => {
        const sorting = [];
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            sorting[i] = node.copy ? { id: node.id, order1: i } : { id: node.id, order: i };
        }
        await resortNodes(sorting);
    }

    function buildActiveMap(path) {
        const parts = path.split(',').map(s => s.trim());
        const result = {};
        // 前 n-1 个作为 standard key
        for (let i = 0; i < parts.length - 1; i++) {
            const key = parts.slice(0, i + 1).join('-');
            const value = parts[i + 1];
            result[key] = value;
        }
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
            resortOrders(updatedChildren);
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

        if (result.totalMatchCount > 0) {
            console.log(cardData.name + "search keyword=" + keyWord + ",result=", result.searchResult, result.totalMatchCount);
            dispatch(updateSearchState({ searchResultNum: result.totalMatchCount }));
        }

        setData(result);
        setSearchResult(result.searchResult); //（全部）搜索结果
        setNoHiddenSearchResult(result.noHiddenSearchResult)//没有隐藏项的搜索结果
        // setActiveMap(prev => ({ ...prev, [cardData.id]: searchTabKey })); //激活<搜索结果>Tab
        if (searchTab) setActiveMap({ [cardData.id]: searchTabKey }); //激活<搜索结果>Tab
        if (showItem) {//显示隐藏项目的搜索结果
            return result.searchResult;
        } else {//不显示隐藏项的搜索结果
            return result.noHiddenSearchResult;
        }
    }

    //当cardData发生变化或keyword发生变化(包括清空)时调用
    const processSearchKeywordChange = (data: [], searchKeyword: string, currentSearch: boolean, searchTab: boolean,) => {
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
        } else {//处理空字符串搜索 显示(可能改变的)data的urlList数据 不显示搜索数据 也不需要处理搜索
            setSearching(false);
            setCardShow(true);
        }
    }

    useEffect(() => {
        // console.log(cardData.name + ' useEffect >>>>>>>>>>>>>>>>>>>>>', cardData, tags);
        //重新进行一次搜索,考虑hasResult并未更新，所以该Card仍然展示
        setData(cardData);
        //当非标签筛选时，进行搜索
        if (!cardData.tags) processSearchKeywordChange(cardData, searchInput, currentSearch, false)//从data中搜索 根据当前Card展示与否
        // setShowByDisplayAndGroupHide(cardData.hide, display);
        setSelectedTags(cardData.tags);
        // console.log('!!!!!!!!!!!! activeMap', activeMap);
        /*  if (!activeMap[cardData.id]) {
             // initActiveMap(cardData.id);//初始化第一层tabs的activeTab{
             initActiveMap(cardData.id);
         }//初始化第一层tabs的active项 */

        // if (activeTab) setActiveMap(prev => ({ ...prev, [cardData.id]: activeTab }))
    }, [cardData]);//cardData发生变化，


    useEffect(() => {
        onKeywordChange(keyWord, false);
    }, [keyWord]);//第一次渲染就会触发,全局搜索关键词


    const onKeywordChange = (searchKeyword: string, currentSearch: boolean) => {
        const keyword = searchKeyword ? searchKeyword.trim() : '';
        setSearchInput(keyword);
        setCurrentSearch(currentSearch);
        setActiveCardTab([]);//相当于tree选中节点失效,除非重新点击
        //点击搜索后点击tab后应恢复到默认tabs
        if (keyword === '') {
            if (defaultActiveMap) setActiveMap(defaultActiveMap);
            else {
                if (!activeMap || activeMap[cardData.id] == searchTabKey)
                    initActiveMap(cardData.id);//初始化第一层tabs的activeTab
            }
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

    //////////////////////////////////////////////////////////////////////

    /*     const defaultActiveKey = useMemo(() => {
            let defaultActiveKey = '';
            // if (cardData.id === '')
            // console.log('defaultActiveKey activeTab', activeTab)
            const okActiveKeys = [];
            const backupActiveKeys = [];
     
            if (cardData.children && cardData.children.length !== 0) {
                if (showItem) {//显示隐藏的分组
                    cardData.children.some((item) => {
                   chKeywo     const currentKey = item.id + '';
                    });
                } else {//不显示隐藏的分组
                    // const backupActiveKeys = [];
                    cardData.children.some((item) => {
                        const currentKey = item.id + '';
                        if (!item.hide) {//该项不是隐藏的
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
        }, [cardData]);//依赖项 */


    // 每层 Tabs 的 active 状态映射，key 使用 currentPath（如 'id1-id2-id3'）
    /*  const [activeMap, setActiveMap] = useState<Record<string, string>>(() => ({//空的map
         [cardData.id]: getInitialDefaultActiveKeyFromCardData(cardData)
     })); */

    // 一、切换Tab标签部分 end#=====================================================================

    const [activeMap, setActiveMap] = useState<Record<string, string>>({});

    const getActiveForPath = (path: string) => {
        if (!path) return undefined;
        const activeValue = activeMap[path];
        return activeValue;
    }

    // 监听tab切换
    const onLevel0TabChange = async (key: string) => {
        // console.log('onTabChange', key)
        setEnable(false);
        setDropdownVisible(false);
        setTimeout(() => {
            setEnable(true);
        }, 1000);

        // if (cardData.id === 27) console.log(cardData.name + ' onTabChange  setActiveTab=', key)
        // setActiveTab(key);
        if (key !== searchTabKey) {
            if (key === String(data.id)) {//没有二级
                setCardTabActive(['' + data.id])
            } else {
                setCardTabActive(['' + data.id + ',' + key])
            }
        }
    }

    /*     useEffect(() => {
            if (data.id === 'vu2pi7002') console.log('777777777777 useEffect activeMap ', cardData.name, activeMap)
        }, [activeMap]);
     */
    const setActiveMapThroughChildren = async (key: string, path: string,) => {
        const lastIndex = path.lastIndexOf('-');
        if (lastIndex > -1) {//A.点击的是：3级和以下分组
            const last = path.substring(lastIndex + 1).trim();
            if (last === key) { //是复制分组，本身无子分组
                const result = buildActiveMap(path.replaceAll('-', ',') + ',' + key);
                setActiveMap(result);
            } else {
                const lastChild = await getThroughChild(key, path + ',' + key);
                setActiveMap(buildActiveMap(lastChild.path));
            }
        } else {//B.点击的是：2级分组
            if (path === key) { //切换到复制分组，本身无子分组
                setActiveMap(buildActiveMap(path + ',' + key));
            } else { //非复制分组，可能有子分组
                const lastChild = await getThroughChild(key, path + ',' + key);
                setActiveMap(buildActiveMap(lastChild.path));
            }
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

    /*    function getThroughSearchResult(paths: string[], groupId) {
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
       } */

    const setActiveMapThroughChildrenForSearch = async (key: string, path: string,) => {
        const paths = path.split('-');
        const key1 = paths.shift();//去掉第一个元素，得到第一层分组
        // const lastChild = getThroughSearchResult(paths, key);
        const tabNode = getNodeByTabForSearch(paths, key);
        const lastChild = getLastChildForSearchResult(tabNode);
        // console.log('000000000000000000 setActiveMapThroughChildrenForSearch  path key lastChild', path, key, lastChild);
        setActiveMap(prev => ({ ...prev, ...buildActiveMap(lastChild.copy ? lastChild.path + ',' + lastChild.id : lastChild.path) }));
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
    const [dropdownVisible, setDropdownVisible] = useState(false); // 控制所有 Dropdown 的禁用
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
            console.log('setActiveMapByTreeSelected searching  activeCardTab path ', activeCardTab, paths);
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
        const bookmarksNum: number = await getBookmarksNumByGId(gId);
        const pathStr = bookmarksNum > 0 ? path + "," + gId : path;
        setActiveMap(buildActiveMap(pathStr));
    }

    useEffect(() => {
        const cardActive: string = activeCardTab[0];
        // 受控模式
        if (cardActive === data.id) {//当前Card被选中了
            setTreeSelected(true);
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
    useEffect(() => {
        // if (cardData.id === 9) console.log(cardData.name + ' useEffect display1', display)
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
            getGroupData();
        }
        // return success;
    }


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


    async function initActiveMap(pGroupId: string) {
        const lastChild = await getThroughChild(pGroupId, "");
        const activeMap = buildActiveMap(lastChild.path);
        /*  if (pGroupId === 'vu2pi7002') {
             console.log('bbbbbbbbbbbbbbbbbbbbbbbb useEffect[] initActiveMap', activeMap);
         } */
        setActiveMap(activeMap);
        setDefaultActiveMap(activeMap);//默认的 缓存起来
    }

    //二、关键词搜索部分end ====================================================================================


    // 四、增删改部分====================================================================================
    const [tabGroup, setTabGroup] = useState(null);//添加Tab
    const [tabForm, setTabForm] = useState(false);//添加Tab
    const [selectGroup, setSelectGroup] = useState(null);//添加Tab
    // const [requirePid, setRequirePid] = useState(true);//添加Tab
    const [selectedTags, setSelectedTags] = useState<any[]>(cardData.tags);
    //添加2级分组Tab
    /* const handleAddTab = () => {
        // console.log('添加2级分组Tab handleAddTab');
        setTabForm(true);
        // setTabGroup({null});
        setTabGroup({ pId: cardData.id });
        // setSelectGroup([cardData.id]);
        setSelectGroup(cardData.id);
    }; */

    const handleAddTab = (group) => {
        setTabForm(true);
        setTabGroup({ pId: group.id, pageId: group.pageId });
        const pathArr: string[] = group.path.split(",");
        setSelectGroup(pathArr);
        // console.log('添加分组Tab handleAddTab', group, pathArr);
        // setSelectGroup([group.id]);
    };

    //test
    const editGroup1 = (node) => {
        // console.log('----------group1', node);
        setTabForm(true)
        // setTabGroup(cardData);
        setTabGroup(node);
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
        openUrls(group.bookmarks);
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

    const onEditTag = (tag: WebTag, nodePath: string, searching: boolean) => {
        // console.log('onEditTag searching', searching, tag);
        setAddTagVisible(true);
        setEditTag(tag);
        if (searching) {
            setTagSelectGroup(tag.path.split(","))
        } else setTagSelectGroup(nodePath.split(","))
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


    // const [visible, setVisible] = useState(false);
    const tabMore = (subGroup) => {
        // 创建自定义事件并分发
        const json = JSON.stringify({ id: subGroup.id, name: subGroup.name, pageId: subGroup.pageId, hide: subGroup.hide, path: subGroup.path, pId: subGroup.pId });

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
                // const response = await removeGroupById(subGroup.id);
                const response = await removeGroupById(subGroup.id);
                if (response) {
                    getGroupData();
                    // console.log('删除成功', subGroup);
                    const pId = subGroup.pId;
                    const str = subGroup.path;
                    const lastIndex = str.lastIndexOf(',');
                    if (lastIndex > -1) {
                        const part1 = str.substring(0, lastIndex);
                        const key = part1.replaceAll(',', '-');
                        const part2 = str.substring(lastIndex + 1); // +1 是为了跳过逗号本身

                        if (activeMap[key] === part2) {  //如果被删除的分组为active,则切换到兄弟tab
                            // console.log('444444444444444444444 如果被删除的分组为active', part2);
                            const lastChild = await getThroughChild(pId, part2);
                            setActiveMap(buildActiveMap(lastChild.path));
                        } else {
                            // console.log('66666666666666666666 broGroup newActiveMap 11', activeMap);
                            setActiveMap(activeMap);//点击下拉菜单之前的数据
                        }
                    }
                    // else { } //parentTab -->''
                    return true;
                } else {
                    return false;
                }
            } catch (error) {
                return false;
            }
        }

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

                if (key === '0') {//添加Tag
                    setAddTagVisible(true);
                    setEditTag(null)
                    // setTagSelectGroup(cardData.id === subGroup.id ? [subGroup.id] : [cardData.id, subGroup.id]);
                    setTagSelectGroup(pathArr);
                } else if (key === '1') {//编辑Group
                    setTabForm(true);
                    setTabGroup(subGroup);
                    const parentPath: string[] = pathArr.length > 1 ? pathArr.slice(0, pathArr.length - 1) : null;
                    setSelectGroup(parentPath);//截取parent的path路径
                } else if (key === '2') {//删除Group
                    //弹出确认框
                    // removeConfirm(sub subGroup.name, '点击确定将删除该分组及其所有标签', '分组', processRemoveGroup);
                    removeConfirm(subGroup.id, subGroup.name, '点击确定将删除该分组及其所有标签', '分组', processRemoveGroup1);
                } else if (key === '3') {//打开全部标签
                    //test
                    let tags = [];
                    data.children.some((item) => {
                        if (item.id === subGroup.id) {//非隐藏的
                            // tags = item.bookmarks;
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
                            <Menu.Item key={'0-' + json} >添加</Menu.Item>
                            <Menu.Item key={'1-' + json} >编辑</Menu.Item>
                            <Menu.Item key={'2-' + json} >删除</Menu.Item>
                            {subGroup.bookmarks && subGroup.bookmarks.length > 0 && <Menu.Item key={'3-' + json} >打开</Menu.Item>}
                        </>
                    }

                </Menu>
            }
            trigger="hover"
            // onVisibleChange={setVisible}
            onVisibleChange={handleDropdownVisibleChange}
        // popupVisible={visible}
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
    async function updateCardData() {
        getBookmarksGroupById(data.id).then((resultData) => {
            const groupData = resultData.groupData;
            // 必须通过 dispatch 派发 thunk action
            // dispatch(updatePageDataState(resultData.pageData));//groups变化会触发重新渲染顶层组件(已订阅)
            if (searching) {//搜索模式
                const result = searchDataAggregated(searchInput.trim(), groupData);
                // console.log('close Modal searchDataAggregated searchResult', result.searchResult);
                if (result.searchResult.length == 0) {//ok
                    setActiveMap({ [data.id]: searchTabKey });
                }
                setSearchResult(result.searchResult); //（全部）搜索结果
                setShowSearchResult(result.searchResult); //（全部）搜索结果
                setData(result);
            } else {
                setData(groupData);
            }
        })
    }


    async function closeTagModal(success: boolean, newTag: WebTag, oldTag: WebTag, type: number) {
        setAddTagVisible(false);
        if (success) {//刷新当前页面数据
            // console.log('close Modal group', newTag);
            if (newTag) {//所在的分组，重置位置
                if (type === 0) {//修改了分组,更新整个页面的数据
                    const group = await getBookmarkGroupById(newTag.gId);
                    const pId = group.path.split(',')[0];
                    if (pId !== data.id) { //变为属于别的大分组
                        await getGroupData();
                    } else {//active所属新的tab分组（无论搜索中与否）
                        const activeMap = buildActiveMap(group.path);
                        setActiveMap(activeMap);
                        updateCardData(); //仅重置Card(搜索)数据
                    }
                } else {//  if (type >= 1) 修改书签1 新增书签2 重置(搜索)数据
                    updateCardData();
                    // refreshDataByAddBookmark(newTag);//新增书签
                }
            }


            // 根据 newTag 与 oldTag 的 tags 字段计算 tagsUpdate 并更新全局 tagsMap
            const computeTagsUpdate = (newTagObj, oldTagObj) => {
                const updates = [];
                const newTags = Array.isArray(newTagObj && newTagObj.tags) ? newTagObj.tags.map(t => String(t).trim()).filter(Boolean) : [];
                const oldTags = Array.isArray(oldTagObj && oldTagObj.tags) ? oldTagObj.tags.map(t => String(t).trim()).filter(Boolean) : [];

                // 如果是新增（oldTag 为空或 oldTag.tags 为空）且 newTags 非空：全部视为新增（add: true）
                if ((!oldTagObj || oldTags.length === 0) && newTags.length > 0) {
                    for (const t of newTags) updates.push({ tag: t, add: true, id: newTagObj && newTagObj.id ? newTagObj.id : null });
                    return updates;
                }

                // 否则比较差异：newTags 中相对于 oldTags 新增的 -> add: true
                // oldTags 中相对于 newTags 减少的 -> add: false
                const newSet = new Set(newTags);
                const oldSet = new Set(oldTags);

                for (const t of newSet) {//新增的标签
                    if (!oldSet.has(t)) updates.push({ tag: t, add: true, id: newTagObj && newTagObj.id ? newTagObj.id : null });
                }
                for (const t of oldSet) {//删除的标签
                    if (!newSet.has(t)) updates.push({ tag: t, add: false, id: oldTagObj && oldTagObj.id ? oldTagObj.id : null });
                }

                return updates;
            };

            const tagsUpdate = computeTagsUpdate(newTag, oldTag);
            if (tagsUpdate && tagsUpdate.length > 0) {
                dispatch(updatePageBookmarkTags(tagsUpdate));
            }
            // console.log('close Modal newTag', newTag, oldTag);
        }
    }


    const processReload = async (group) => {
        await getGroupData();
        if (group) {
            // console.log('3333333333333333333  processReload', group);
            if (group.pageId === pageId) {
                dispatch(updateActiveGroup(group));
                if (searching) {//搜索中
                    setActiveCardTab(group.path.split(',')); //适合新增，修改Group
                } else {
                    const activeMap = buildActiveMap(group.path);
                    setActiveMap(activeMap); //适合新增，修改Group
                }
            } else {
                if (group.id === tabGroup.id && tabGroup.pId) { //父分组，重新设置activeTab
                    getBookmarkGroupById(tabGroup.pId).then((pGroup) => {
                        getThroughChild(pGroup.id, pGroup.path).then((lastChild) => {
                            // console.log('3333333333333333333  lastChild', lastChild);
                            const activeMap = buildActiveMap(lastChild.path);
                            setActiveMap(activeMap);
                        })
                        // dispatch(updatePageDataState(resultData.pageData));//groups变化会触发重新渲染顶层组件(已订阅)
                    })
                }
            }
            // 设置新的定时器
            // clearTimeout(timeoutId);
            // timeoutId = setTimeout(() => {
            // }, 500);
        }
    }

    //提交成功后关闭或取消关闭Modal窗口
    async function closeTabModal(success: boolean, group: any) {

        setTabForm(false);
        if (success) {//刷新当前页面数据
            processReload(group);
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
                    const updatedBookmark = {
                        ...updatedItem,
                        ...bookmark,
                    };
                    const newUrlList = [...node.urlList];
                    newUrlList[idx] = updatedBookmark;

                    if (searching) {
                        const idx1 = node.searchResult.findIndex((item: any) => item.id === tagId);
                        if (idx1 !== -1) {
                            const searchBookmark = node.searchResult[idx1];
                            const resultList = [...node.searchResult];
                            const updatedSearchBookmark = {
                                ...searchBookmark,
                                ...bookmark,
                            };
                            resultList[idx1] = updatedSearchBookmark;
                            return {
                                node: { ...node, urlList: newUrlList, searchResult: resultList },
                                updated: true,
                            };
                        }
                    }
                    else return {
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
        function removeTagFromNode(node: any, tagId: string | number): { node: any; removed: boolean, empty?: boolean } {
            // function removeTagFromNode(node: any, tagId: string | number): { node: any; removed: boolean } {
            // 如果当前节点有 urlList，优先在此层尝试删除
            if (Array.isArray(node.urlList) && node.urlList.length > 0) {
                const idx = node.urlList.findIndex((item: any) => item.id === tagId);
                if (idx !== -1) {//

                    //搜索模式下,可能是复制子节点数据上移到原分组导致实际删除失败
                    // const removedItem = node.urlList[idx];
                    // const newUrlList = node.urlList.filter((item: any) => item.id !== tagId);
                    // 仅当被删除项不是隐藏项时，才减少 notHideTabCount
                    // const decrease = removedItem && removedItem.hide ? 0 : 1;
                    // const newNotHide = Math.max(0, (node.notHideTabCount || 0) - decrease);
                    const list = [...node.urlList];
                    list.splice(idx, 1);

                    // 返回新的节点并标记已删除，终止进一步递归
                    if (searching) {

                        const idx1 = node.searchResult.findIndex((item: any) => item.id === tagId);
                        // node.searchResult.splice(idx1, 1);//会修改原数组
                        const list1 = [...node.searchResult];
                        list1.splice(idx1, 1);

                        return {
                            node: { ...node, urlList: list, searchResult: list1, totalMatchCount: list1.length },
                            removed: true,
                            // empty: node.searchResult.length === 0//当前节点搜索结果为空
                            empty: list1.length === 0//当前节点搜索结果为空
                        }
                    }

                    else return {
                        node: { ...node, urlList: list },
                        removed: true,
                    };
                }
            }

            // 如果有 children，则遍历 children，递归处理；一旦在某个子树中删除成功则停止后续遍历
            if (Array.isArray(node.children) && node.children.length > 0) {
                const newChildren: any[] = [];
                let removedFlag = false;

                let emptyNode: boolean = false;
                let removedIndex = -1;
                let removedChildId = null;
                for (let i = 0; i < node.children.length; i++) {
                    const child = node.children[i];
                    if (removedFlag) {
                        // 已删除过，后续子项保持原样（避免不必要的深拷贝）
                        newChildren.push(child);
                        continue;
                    }
                    const res = removeTagFromNode(child, tagId);

                    //搜索模式下，子节点变空，不加入newChildren
                    newChildren.push(res.node);

                    // 记录被删除的子节点索引与 id，供后续切换逻辑使用
                    if (res.removed) {
                        removedFlag = true;
                        removedIndex = i;
                        removedChildId = child && child.id;
                    }
                    emptyNode = res.empty;//子节点数据为空
                }


                //遍历完子节点后处理↓
                if (removedFlag) {
                    if (searching) {

                        //节点的总搜索结果过滤删除项
                        const idx1 = node.searchResult.findIndex((item: any) => item.id === tagId);
                        if (idx1 !== -1) {
                            const list1 = [...node.searchResult];
                            list1.splice(idx1, 1);
                            node.searchResult = list1;
                        }

                        if (emptyNode && node.totalMatchCount > 1) { //子tab变空-->切换到switchNode（兄弟tab）
                            let switchNode = null; // 要切换为 activeTab 的节点

                            // 从 newChildren 中筛选出除了被删除子节点外，仍有数据的兄弟分组
                            const candidates = newChildren.filter((c, idx) => {
                                // 排除被删除的子节点
                                if (removedChildId != null && c && c.id === removedChildId) return false;
                                return Number(c.totalMatchCount || 0) > 0;
                            });

                            if (candidates.length > 0) {
                                // 若只有一个候选且该候选是复制分组(copy===true)，则优先切换到父分组(node)
                                if (candidates.length === 1 && candidates[0].copy) {
                                    switchNode = node;
                                } else {
                                    // 否则选第一个候选（保持原有顺序的稳定性）
                                    switchNode = candidates[0];
                                }
                            }
                            // console.log('000000000 要切换为 activeTab 的节点', switchNode);
                            if (switchNode) {
                                const path = switchNode.path || '';
                                // 计算父层 path（去掉最后一段），作为 setActiveMapThroughChildrenForSearch 的路径参数
                                const lastIdx = path.lastIndexOf(',');
                                const paths = lastIdx > -1 ? path.substring(0, lastIdx) : path;
                                setActiveMapThroughChildrenForSearch(switchNode.id, paths.replaceAll(',', '-'));
                            }
                        }
                        //返回处理后的node
                        return {
                            node: { ...node, children: newChildren, totalMatchCount: node.totalMatchCount - 1 },//结果数-1
                            removed: true,
                            //搜索模式增加字段：
                            empty: node.totalMatchCount - 1 === 0,//无数据：空,留给父节点判断是否要加入children
                        };
                    }
                    else return { node: { ...node, children: newChildren }, removed: true };
                }
            }
            // 未找到，返回原节点并标记未删除
            return { node, removed: false };
        }

        //更新cardData数据
        setData(prev => {
            if (!prev) return prev;
            // 从根节点开始递归查找并删除，找到后立即停止进一步修改
            const result = removeTagFromNode(prev, tag.id);//已删除的结果和其他信息
            if (searching && result.removed) {//已删除
                //更新搜索结果(总)
                const newSearchResult = result.node.searchResult.filter(item => item.id !== tag.id);
                setShowSearchResult(newSearchResult);
                if (newSearchResult.length === 0) {//搜索结果为空
                    setActiveMap({ [prev.id]: searchTabKey }); //搜索结果为空，切换到搜索结果tab
                }
                // console.log('1111111111111111111111 result.node.empty newSearchResult result.node', result.empty, result.node);//搜索结果为空
                return {
                    ...result.node,
                    searchResult: newSearchResult,
                    totalMatchCount: result.node.totalMatchCount - 1
                }
            }
            return result.removed ? result.node : prev;
        });
    }

    function handleDeleteSuccess(tag: WebTag) {
        // refreshData1(tag);//设置data数据与db保持一致
        //当前所属分组变为空?切换到兄弟节点tab
        //查询所在分组的urlList,若为空，则切换到搜索结果tab（根据pId）
        // console.log('aaaaaaaaaaaaaaaaaaaa', tag);

        getBookmarksGroupById(data.id).then((resultData) => {
            const groupData = resultData.groupData;
            // 必须通过 dispatch 派发 thunk action
            // dispatch(updatePageDataState(resultData.pageData));//groups变化会触发重新渲染顶层组件(已订阅)
            if (searching) {//搜索模式
                const result = searchDataAggregated(searchInput.trim(), groupData);
                if (result.searchResult.length == 0) {//ok
                    setActiveMap({ [data.id]: searchTabKey });
                }
                setSearchResult(result.searchResult); //（全部）搜索结果
                setShowSearchResult(result.searchResult); //（全部）搜索结果
                setData(result);
            } else {
                setData(groupData);
            }
        })

        // 如果是新增（oldTag 为空或 oldTag.tags 为空）且 newTags 非空：全部视为新增（add: true）
        if (tag.tags && tag.tags.length > 0) {
            const updates = [];
            for (const t of tag.tags) updates.push({ tag: t, add: false, id: tag.id });
            dispatch(updatePageBookmarkTags(updates));
        }
    }

    function determinShowTabOrNot(item: any) {
        let dis: boolean = false;
        if (searching) {
            // 正在搜索，有数据或当前tab被（Tree）激活  
            //展示隐藏的分分组
            if (showItem) {//展示隐藏的分分组（但搜索结果urlList不能为空）
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
                                onDeleteSuccess={handleDeleteSuccess}
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

                            title={
                                <>
                                    {/* <span>{data.name}</span> */}
                                    <a onClick={() => onCardTitleClick(data.id)}> <span>{data.name} {data.hide ? <IconEyeInvisible></IconEyeInvisible> : ''}</span>
                                    </a>
                                    {data.hide ? <IconEyeInvisible></IconEyeInvisible> : ''}

                                    <ButtonGroup style={{ marginLeft: "10px" }}>
                                        <Button onClick={(e) => addTagOrGroup(data.id)} icon={<IconPlus />} >添加</Button>
                                        <Button onClick={() => editGroup1(data)} icon={<IconEdit />} >编辑</Button>
                                        {data.hide && <Button onClick={switchGroup1} icon={<IconEye />} >展示</Button>}
                                        {/* {!data.hide && <Button onClick={switchGroup1} icon={<IconEyeInvisible />} >隐藏</Button>} */}
                                        <Button onClick={removeGroup1} icon={<IconDelete />} >删除</Button>
                                        {/* {data.urlList.length > 0 && <Button onClick={clearGroup} icon={<IconEraser />} >清空</Button>} */}
                                        {data.bookmarks.length > 0 && < Button onClick={(e) => openGroupAllTags(data)} icon={<IconLink />} >打开</Button>}
                                    </ButtonGroup>
                                </>
                            }
                            extra={
                                <div className='card-no-child-more'>
                                    {data.itemHide && <label style={{ margin: '5px 8px 0 15px', fontSize: '14px' }}>
                                        <Typography.Text style={{ color: 'var(--color-text-2)' }}>显示</Typography.Text>
                                        <Switch size='small' style={{ marginLeft: 12, marginRight: 12 }} checked={showItem} onChange={switchShow}></Switch>
                                    </label>}


                                    <SelectedTags tags={selectedTags} />

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
                                // onChange={onLevel0TabChange}
                                >
                                    <TabPane key={searchTabKey} title={<span style={{ color: 'red' }}>{`搜索结果(${showSearchResult.length})`}</span>}>
                                        <div className={styles.container}>
                                            <div className={styles['single-content']}>
                                                {renderTags(showSearchResult, data.path, true)}
                                            </div>
                                        </div>
                                    </TabPane>
                                </Tabs>
                                :
                                // <div className={styles.container}>
                                <div className={styles['single-content-border']}>
                                    {renderTags(data.bookmarks, data.path, false)}
                                </div>
                                // </div>

                            }
                        </Card>

                        <Add2Form
                            isVisible={add2TypesVisible}
                            selectGroup={data}
                            pageId={data.pageId}
                            closeWithSuccess={closeAdd2TypesModal}>
                        </Add2Form>
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
                    title={
                        <>
                            <span>{data.name}</span>
                            {data.hide ? <IconEyeInvisible></IconEyeInvisible> : ''}
                            <ButtonGroup style={{ marginLeft: "10px" }}>
                                {/* <Button onClick={editGroup1} icon={<IconEdit />} >编辑</Button> */}
                                <Button onClick={() => editGroup1(data)} icon={<IconEdit />} >编辑</Button>
                                {/* {<Button onClick={switchGroup1} icon={data.hide ? <IconEye /> : <IconEyeInvisible />}>{data.hide ? '展示' : '隐藏'}</Button>} */}
                                <Button onClick={removeGroup1} icon={<IconDelete />} >删除</Button>
                            </ButtonGroup>
                        </>
                    }
                    extra={
                        <>
                            {/*   data.itemHide && <div style={{ marginLeft: '15px', fontSize: '14px' }}>
                                <Typography.Text style={{ color: 'var(--color-text-2)' }}>显示</Typography.Text>
                                <Switch size='small' style={{ marginLeft: 12, marginRight: 12 }} checked={showItem} onChange={switchShow}></Switch>
                            </div> */}

                            <SelectedTags tags={selectedTags} />

                            <Input.Search
                                allowClear
                                style={{ width: '240px' }}
                                placeholder={`在${data.name}中搜索`}
                                onChange={onInputChange}
                                value={searchInput}
                            />
                        </>
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
                        moveTabNode={moveTabNode}
                        searching={searching}
                        // searchResult={searchResult}
                        // cardData={cardData}
                        // currentSearch={currentSearch}
                        // resort={resort}
                        // onClickSort={onClickSort}
                        activeCardTab={activeCardTab}
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
                                    {renderTags(showSearchResult, data.path, true)}
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
                    onTabChange={TabChange}
                    activeTab={getActiveForPath(currentPath)}
                    onInputChange={onInputChange}
                    searchInput={searchInput}
                    // globalActiveTabId={globalActiveTabId}
                    // resort={resort}
                    // onClickSort={onClickSort}
                    determinShowTabOrNot={determinShowTabOrNot}
                    WrapTabNode={WrapTabNode}
                    moveTabNode={moveTabNode}
                    searching={searching}
                    // searchResult={searchResult}
                    // cardData={cardData}
                    activeCardTab={activeCardTab}
                    // currentSearch={currentSearch}
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
                                {renderTags(showSearchResult, data.path, true)}
                            </div>
                        </div>
                    )}
                />
        )
    }

    // 返回结果
    return (
        <DndProvider backend={HTML5Backend}>
            {cardShow && RenderNode(data, data.id, 0)}
            {/* 添加或编辑标签、分组 */}
            <TagForm isVisible={addTagVisible} selectGroup={tagSelectGroup} data={editTag} closeWithSuccess={closeTagModal}></TagForm>
            <TabGroupForm selectGroup={selectGroup} pageId={pageId} visible={tabForm} closeWithSuccess={closeTabModal} group={tabGroup}></TabGroupForm>
        </DndProvider>
    )
}

export default renderCard