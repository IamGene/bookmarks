import React, { useEffect, useState, useCallback, useMemo, useRef, Children } from 'react';
import TagItem from './tag/card-tag';
import { WebTag } from './interface';
import { Tabs, Card, Switch, Empty, Input, Link, Tag, Dropdown, Menu, Typography, Message, Grid, Form, Button, Space } from '@arco-design/web-react';
import { IconEyeInvisible, IconSelectAll, IconToTop, IconMore, IconPlus, IconEraser, IconToBottom, IconLink, IconDelete, IconEdit, IconEye, IconCheck } from '@arco-design/web-react/icon';
import styles from './style/index.module.less';
import TagForm from './form/tag-form';
import BookmarksMoveForm from './form/bookmarks-move';
import TabGroupForm from './form/tab-group-form';
import Add2Form from './form/add2form';
import { removeConfirm } from './form/remove-confirm-modal';
import { saveTagGroup, moveGroupTopBottom } from '@/api/navigate';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import {
    fetchBookmarksPageDatas, fetchBookmarksPageData0, groupTagUnselected, groupTagSelected, updateBookmarksPage, fetchBookmarksPageDataGoups, updateActiveGroup, updatePageBookmarkTags, updateSearchState
} from '@/store/modules/global';
import {
    getBookmarkGroupById, updatePageBookmarksNum, getAllBookmarksByGroupId, removeCopyGroupById, getBookmarksByIds, removeWebTags, removeWebTagsAndGroups, removeGroupById,
    getBookmarksGroupById, resortNodes, getBookmarksNumByGId, clearGroupBookmarksById, getThroughChild
} from '@/db/BookmarksPages';
import { useDrag, useDrop } from 'react-dnd';
import TabsContainer from '../../../components/NestedTabs/TabsContainer';
import { sortGroup } from '@/api/navigate';
import { RootState } from '@/store';
import MultiSelectCheckBox from '@/components/NestedTabs/CheckBox';
const TabPane = Tabs.TabPane;
const ButtonGroup = Button.Group;
const { GridItem } = Grid;
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
        /* hover(item, monitor) {
            if (!ref.current) {
                return (
                    <>{cardShow && RenderNode(data, data.id, 0)}</>
                )
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
        } */

        hover(item, monitor) {
            if (!ref.current) {
                return;
                /* return (
                    <>{cardShow && RenderNode(data, data.id, 0)}</>
                ) */
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
function searchDataAggregated(inputValue, searchType, cardData) {
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
                // 兼容旧字段名：noHiddenSearchResult
                noHiddenSearchResult: aggregatedFilterHidden,
                totalMatchCount,
            };
            return res;
        }

        // 无 children 且无 urlList 的节点
        return { ...node, searchResult: [], filterHiddenSearchResult: [], childrenMatchCount: 0, totalMatchCount: 0 };
    }

    // 入口：保留和 searchData 一致的判断逻辑
    if (cardData.bookmarks && (!cardData.children || cardData.children.length === 0)) {
        return processLeaf(cardData);
    }
    return processNode(cardData, 0);
}

function filterDataByTags(tags: any[], cardData) {
    // const regex = new RegExp(`(${inputValue})`, 'gi');

    function getfilteredBookmarkIdsFromTags(tags: any[]) {
        const all: any[] = [];//标签包含的所有书签id
        //对标签数组进行遍历，如当前标签被选中 将其对应的书签id进行汇总
        tags.forEach((t: any) => {
            if (t.selected && t.checked && Array.isArray(t.bookmarks) && t.bookmarks.length > 0) all.push(...t.bookmarks);
        });
        const dedup = new Set<string>();
        all.forEach(item => {//去重书签bookmarkId
            const key = String(item);
            if (!dedup.has(key)) dedup.add(key);
        });
        return Array.from(dedup);
    }

    const tagsBookmarksIds: string[] = getfilteredBookmarkIdsFromTags(tags);
    // console.log('111111111 filterDataByTags getfilteredBookmarkIdsFromTags tags tagsBookmarksIds', tags, tagsBookmarksIds);

    function processLeaf(data) {
        // const bookmarks = [];
        // const searchResult = [];
        // const filterHiddenSearchResult = [];
        // let totalMatchCount = 0;
        const searchResult = data.bookmarks.filter(b => tagsBookmarksIds.includes(String(b.id)));

        return {
            ...data,
            // bookmarks: data.bookmarks,
            searchResult,
            // filterHiddenSearchResult,
            // 兼容旧字段名：noHiddenSearchResult
            // noHiddenSearchResult: filterHiddenSearchResult,
            // childrenMatchCount: 0,
            totalMatchCount: searchResult.length,
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
                // filterHiddenSearchResult: aggregatedFilterHidden,
                // 兼容旧字段名：noHiddenSearchResult
                // noHiddenSearchResult: aggregatedFilterHidden,
                totalMatchCount,
            };
            return res;
        }

        // 无 children 且无 urlList 的节点
        return { ...node, searchResult: [], filterHiddenSearchResult: [], childrenMatchCount: 0, totalMatchCount: 0 };
    }

    // 入口：保留和 searchData 一致的判断逻辑
    if (cardData.bookmarks && (!cardData.children || cardData.children.length === 0)) {
        return processLeaf(cardData);
    }
    return processNode(cardData, 0);
}

// tags
function renderCard({ cardData, dataType, removeCard, treeSelectedNode, setCardTabActive, searchKeyWord }) {//hasResult
    // 抽离的子组件：显示选中的 tags

    const SelectedTags = ({ groupTags }: { groupTags: Array<any> }) => {
        return (
            //展示标签 且当前大分组的书签存在标签
            tagsFilter && groupTags.length > 0 &&
            <>
                {groupTags.map((item) => (
                    item.selected && <Tag
                        key={item.value}
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
                        checkable={true}
                        defaultChecked={item.checked}
                        onCheck={(checked: boolean) => handleTagOnChecked(checked, item)}
                        color={item.color}
                    >
                        {item.value}
                    </Tag>
                ))}
            </>
        );
    };

    // ----- 辅助函数（提升到 renderCard 作用域，供 renderTags 与 RenderNode 共用） -----
    const getAncestorIdsFromPath = (pathStr: string): string[] => {
        if (!pathStr) return [];
        return String(pathStr).split(',').filter(Boolean);
    };

    //判断传入节点路径的“祖先”中是否有任一节点在 multiSelectMap 中被用户显式开启了多选（即 multiSelectMap[ancestor] 为真）。
    const hasAncestorUserToggle = (pathStr: string) => {
        const ancestors = getAncestorIdsFromPath(pathStr);
        for (let i = 0; i < Math.max(0, ancestors.length - 1); i++) {
            if (multiSelectMap[ancestors[i]]) return true;
        }
        return false;
    };

    const findNodeById = (root: any, id: string) => {
        if (!root) return null;
        let found = null;
        function dfs(n) {
            if (!n || found) return;
            if (String(n.id) === String(id)) { found = n; return; }
            if (Array.isArray(n.children)) {
                for (const c of n.children) {
                    dfs(c);
                    if (found) return;
                }
            }
        }
        dfs(root);
        return found;
    };

    const collectDescendantNodes = (rootNode: any) => {
        const nodes: any[] = [];
        function dfs(n) {
            if (!n) return;
            nodes.push(n);//包括自身
            if (Array.isArray(n.children)) n.children.forEach(c => dfs(c));
        }
        dfs(rootNode);
        return nodes;
    };

    const enableModeForSubtree = (groupId: string) => {
        const root = findNodeById(data, groupId);
        if (!root) return;
        const nodes = collectDescendantNodes(root);
        setMultiSelectModeMap(prev => {
            const next = { ...prev };
            nodes.forEach(n => {
                if ((n.bookmarks && n.bookmarks.length > 0) || n.bookmarksNum > 0) next[n.id] = true;
            });
            next[groupId] = true;
            return next;
        });
    };


    // 强制取消某分组及其子孙的多选模式（由用户在该分组上点击“取消”触发）
    // 不应影响祖先或同级分组的多选状态
    const disableModeForSubtreeForce = (groupId: string) => {
        const root = findNodeById(data, groupId);
        if (!root) return;
        const nodes = collectDescendantNodes(root);
        // 清除 multiSelectModeMap 中的子树条目 -> 不再显示复选框（由祖先传播的结果） 
        setMultiSelectModeMap(prev => {
            const next = { ...prev };
            nodes.forEach(n => {
                if (next[n.id]) delete next[n.id];
            });
            // 也删除自身
            if (next[groupId]) delete next[groupId];
            return next;
        });
        // 清除用户显式的 multiSelectMap 标记（多选关闭）（避免后续被祖先重新计算恢复）
        setMultiSelectMap(prev => {
            const next = { ...prev };
            nodes.forEach(n => {
                if (n && next[n.id]) delete next[n.id];
            });
            if (next[groupId]) delete next[groupId];//也删除自身
            return next;
        });
    };



    //参数：ids
    const onNodeSelectionChange = (nodeKey: string, ids: string[], nodePath: string) => {
        // 先定位当前节点与路径
        // const node = findNodeById(data, nodeKey);
        // const path = nodePath || node?.path || '';
        const path = nodePath;
        console.log('xxxxxxxxxxxxxxx onNodeSelectionChange', nodeKey, ids);
        // 获取严格意义上的祖先 id 列表（不包含当前节点自身）
        const ancestors = getAncestorIdsFromPath(path);
        const ancestorIds = ancestors.slice(0, Math.max(0, ancestors.length - 1));
        // console.log('aaaaaaaaaaaaaaaaaaa onNodeSelectionChange path nodeKey ids', path, nodeKey, ids);
        setSelectedMap(prev => {
            // console.log
            // console.log('aaaaaaaaaaaaaaaaaaa onNodeSelectionChange nodeKey ancestorIds ancestors prev', nodeKey, ancestorIds, ancestors, prev);
            const prevNodeArr = Array.isArray(prev[nodeKey]) ? prev[nodeKey].map(String) : [];
            const newNodeArr = Array.isArray(ids) ? ids.map(String) : [];
            // console.log('aaaaaaaaaaaaaaaaaaa prevNodeArr newNodeArr', prevNodeArr, newNodeArr);
            // 当前节点的新增选中与取消选中集合
            const selectedIds = newNodeArr.slice();
            const unSelectedIds = prevNodeArr.filter(s => !newNodeArr.includes(s));

            // 把当前节点的最新选中写入 next（为空则删除键）
            const next = { ...prev } as Record<string, string[]>;
            if (newNodeArr.length > 0) next[nodeKey] = newNodeArr;
            else delete next[nodeKey];

            // 对每个启用多选的祖先，直接应用 selectedIds（添加）和 unSelectedIds（删除）
            for (let i = ancestorIds.length - 1; i >= 0; i--) {
                const aid = ancestorIds[i];
                if (!aid) continue;
                const ancestorEnabled = !!multiSelectModeMap[aid] || !!multiSelectMap[aid];
                if (!ancestorEnabled) continue;
                const cur = Array.isArray(next[aid]) ? next[aid].map(String) : [];
                const setAncestor = new Set<string>(cur);

                // 添加当前节点的选中 id
                selectedIds.forEach(id => setAncestor.add(String(id)));

                // 直接删除当前节点取消选中的 id（不再检查子孙）
                unSelectedIds.forEach(id => setAncestor.delete(String(id)));

                const arr = Array.from(setAncestor);
                // console.log('gggggggggggggggggggggggg  selectedIds unSelectedIds 222', selectedIds, unSelectedIds)
                if (arr.length > 0) next[aid] = arr;
                else delete next[aid];
            }

            // 同步 ref 并返回新状态
            selectedMapRef.current = next;
            // console.log('aaaaaaaaaaaaaaaaaaaaaaaaaaa onNodeSelectionChange', next);
            return next;
        });
    };


    // 获取某节点及其子孙在 selectedMap 中被聚合的选中数量（去重）
    const getSelectedCountForNode = (node: any, snapshot?: Record<string, string[]>): number => {
        const mapSnapshot = snapshot || selectedMap;
        if (!node) return 0;
        const nodes = collectDescendantNodes(node);
        const union = new Set<string>();
        nodes.forEach(n => {
            const arr = Array.isArray(mapSnapshot[n.id]) ? mapSnapshot[n.id] : [];
            arr.forEach(id => union.add(String(id)));
        });
        return union.size;
    };



    const shouldShowExtra = (tabKey: string, pathStr: string) => {
        return !!multiSelectMap[tabKey] && !hasAncestorUserToggle(pathStr);
    };

    const buildDerivedMultiSelectMap = (rootNode: any) => {
        const map: Record<string, boolean> = {};
        function dfs(n) {
            if (!n || !Array.isArray(n.children)) return;
            n.children.forEach(child => {
                map[child.id] = shouldShowExtra(child.id, child.path || '');
                dfs(child);
            });
        }
        map[searchTabKey] = shouldShowExtra(searchTabKey, rootNode.path || '');
        dfs(rootNode);
        return map;
    };



    const dispatch = useDispatch();
    const pageId = cardData.pageId;


    const [data, setData] = useState(cardData);

    // 用于在局部调用 setData 后阻止监听 selectedTags 的 useEffect 覆盖刚设置的数据
    const skipSelectedTagsEffectRef = useRef(false);


    if (cardData.name === 'AAAAA')
        console.log(cardData.name + ' 渲染了>>>>>>>>>>>>>>', data);

    const [activeCardTab, setActiveCardTab] = useState(treeSelectedNode);
    const [treeSelected, setTreeSelected] = useState(false);//当前card是被tree选中
    // 当前搜索结果
    // const [searchResult, setSearchResult] = useState([]);
    // 搜索中
    const [searching, setSearching] = useState(false);
    const [tagsFilter, setTagsFilter] = useState(false);//展示标签数组
    const [filterTags, setFilterTags] = useState(cardData.tagsList || []);
    // const [NavTags, setNavTags] = useState([]);
    // const [filter, setFilter] = useState(false);//有标签筛选结果
    const [filter, setFilter] = useState(false);//全局标签筛选
    const [currentFilter, setCurrentFilter] = useState(false);//当前card标签筛选： 有无标签高亮 可以局部控制
    // 当前被tree选中

    // 当前Card搜索
    const [currentSearch, setCurrentSearch] = useState(false);
    const [searchInput, setSearchInput] = useState('');
    // const [inputDisabled, setInputDisabled] = useState(false);
    // const linkRef = useRef(null);
    //该Card是否展示(有搜索结果)
    const [cardShow, setCardShow] = useState(true);
    // 本Card(Group)显示/隐藏 隐藏项
    const [showItem, setShowItem] = useState(true);//默认false

    // debug: trace cardShow changes to identify unexpected resets

    // 当 dataType 变化（例如从 0->1/2）或搜索结果变化时，重新计算 cardShow


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
            sorting[i] = node.copy ? { id: node.id.replace('_copy', ''), order1: i } : { id: node.id, order: i };
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

    /*   const getResortData = (parentData: any, dragIndex: number, hoverIndex: number, pId: string) => {
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
      } */

    const getResortedData = (parentData: any, dragIndex: number, hoverIndex: number, pId: string) => {
        // 目标层直接重新排序 children
        if (!parentData) return { updated: false, data: parentData, updateChildern: [] };
        if (parentData.id === pId) {
            if (!Array.isArray(parentData.children)) return parentData;
            const newChildren = [...parentData.children];
            // 防护：确保索引在范围内
            newChildren.splice(hoverIndex, 0, ...newChildren.splice(dragIndex, 1));
            // 为保持顺序一致性：按当前顺序为每个子项设置 order 字段（0,1,2...）
            const updatedChildren = newChildren.map((child, idx) => ({ ...child, order: idx }));
            // console.log('11111111111111111111111111', 'updatedChildren', updatedChildren);
            // 异步持久化排序（仍然使用 resortOrders），并把带 order 的数组返回用于更新本地 state
            // await resortOrders(updatedChildren);
            return { updated: true, data: { ...parentData, children: updatedChildren }, updateChildern: updatedChildren };
        }

        // 否则递归到子节点，若某个子节点发生变化则返回新的 parent 节点
        if (Array.isArray(parentData.children) && parentData.children.length > 0) {
            let changed = false;
            let updateChildern = [];
            const newChildren = parentData.children.map(child => {
                const updatedChildResult = getResortedData(child, dragIndex, hoverIndex, pId);
                if (updatedChildResult.updated) {
                    changed = true;
                    updateChildern = [...updatedChildResult.updateChildern];
                    return updatedChildResult.data;
                }
                return child;
            });
            if (changed) {
                return { updated: true, data: { ...parentData, children: newChildren }, updateChildern: updateChildern };
            }
        }
        // 未命中，返回原节点
        return { updated: false, data: parentData, updateChildern: [] };
    }


    const moveTabNode = async (dragIndex: number, hoverIndex: number, node: any) => {
        let updated: boolean = false;
        let updateChildern: [] = [];
        setData(preData => {
            //如果拖动位置tab是复制分组，则父分组其实是它的原始分组
            const result = getResortedData(preData, dragIndex, hoverIndex, node.copy ? node.id : node.pId);
            updated = result.updated;
            updateChildern = result.updateChildern;
            return result.data;
        });
        if (updated) {
            // console.log('xxxxxxxxxxxxxxxxxxxxx moveTabNode updateChildern', updateChildern)
            if (updateChildern.length > 0) await resortOrders(updateChildern);
            await dispatch(fetchBookmarksPageDataGoups(pageId));//可以优化为通过大分组增量更新tree数据
        }
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


    const processNotEmptySearch = (data, searchKeyWord, searchTab, currentSearch: boolean) => {

        setSearching(true);// processNotEmptySearch
        // const result = searchData(keyWord.trim(), cardData);
        const searchType = searchTypeRef.current; // 始终是最新值

        // if (data.name === '测试A')
        //     // console.log(cardData.id, cardData.name + ' processNotEmptySearch 搜索关键词', keyWord, 'showItem', showItem, 'searchTab', searchTab);
        console.log(cardData.id, cardData.name + ' processNotEmptySearch 搜索关键词', keyWord, searchType);

        const result = searchDataAggregated(searchKeyWord, searchType, data);
        // console.log(cardData.name + ' processNotEmptySearch 搜索结果', result, data);
        if (result.totalMatchCount > 0) {//有搜索结果
            if (!currentSearch) dispatch(updateSearchState({ searchResultNum: result.totalMatchCount }));//全局搜索下 累加搜索结果数
            //局部搜索下，如果搜索关键词发生变得与搜索框中的关键词重新一致(原来不一致已减去搜索结果数)
            // const keyWord = searchKeyWord ? searchKeyWord.keyword?.trim() : ''; 
            else if (searchKeyWord == keyWord && searchInput !== keyWord) {
                setCurrentSearch(false);//相当于全局搜索了
                dispatch(updateSearchState({ searchResultNum: result.totalMatchCount }));
            }
        }
        setData(result);
        // setSearchResult(result.searchResult); //（全部）搜索结果
        // setNoHiddenSearchResult(result.noHiddenSearchResult)//没有隐藏项的搜索结果
        // setActiveMap(prev => ({ ...prev, [cardData.id]: searchTabKey })); //激活<搜索结果>Tab
        // if (searchTab) setActiveMap({ [cardData.id]: searchTabKey }); //激活<搜索结果>Tab
        setActiveMap({ [data.id]: searchTabKey });
        // console.log(cardData.name + '2222222222222222');
        return result;
    }

    //当cardData发生变化或keyword发生变化(包括清空)时调用
    const processSearchKeywordChange = (data: [], searchKeyword: string, currentSearch: boolean, searchTab: boolean) => {
        // console.log("ggggggggggggggggggggggg processSearchInputChange", cardData.name, searchKeyword);
        if (searchKeyword) {//有关键词->搜索->展示?
            // setTreeSelected(false);
            const searchResult = processNotEmptySearch(data, searchKeyword, searchTab, currentSearch)//处理搜索结果
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

    //导航栏选中的标签（优先使用按页缓存的 selectedTagsByPage）
    const selectedTags = useSelector(
        (state: RootState) => {
            const pageKey = state.global.currentPage?.pageId ?? state.global.pageId ?? cardData.pageId;
            const key = pageKey != null ? String(pageKey) : null;
            if (key) return state.global.tags.selectedTagsByPage?.[key] ?? [];
            return state.global.tags.selectedTags ?? [];
        },
        shallowEqual
    );

    // 当前全局 pageId（切换书签页时用于触发本组件的重新初始化）
    const currentGlobalPageId = useSelector((state: RootState) => state.global.currentPage?.pageId ?? state.global.pageId);
    // console.log('bbbbbbbbbbbbbbbbbbbbbbbbbb currentGlobalPageId', currentGlobalPageId);
    useEffect(() => {
        //重新进行一次搜索
        // console.log('bbbbbbbbbbbbbbbbbbbbbbbbbb useEffect >>>>>>>>>>>>>>>>>>>>> cardData tags currentGlobalPageId', cardData.name, cardData.id, currentGlobalPageId);
        setData(cardData);
        setFilterTags(cardData.tagsList || []);
        if (selectedTags && selectedTags.length > 0) {//导航栏中标签筛选
            onNavTagsFilterChange(selectedTags, cardData.tagsList || [], cardData, searchInput);
        } else {
            processSearchKeywordChange(cardData, searchInput, currentSearch, false);//从data中搜索 根据当前Card展示与否
        }
        //当非标签筛选时，进行搜索
        // setShowByDisplayAndGroupHide(cardData.hide, display);
        /*  if (cardData.tags && cardData.tags.length > 0) {
             setSelectedTags(cardData.tags);
         } else */
        if (!activeMap[cardData.id] && dataType == 0) {
            initActiveMap(cardData.id);
        }//初始化第一层tabs的active项
        //标签筛选与关键词筛选互斥
    }, [cardData, currentGlobalPageId]);//cardData 或 全局当前 pageId 发生变化时，重新处理（解决同 id 不更新问题）

    const getThroughChildHasResult = (data) => {
        if (!data || !Array.isArray(data.children) || data.children.length === 0) {
            return null;
        }
        for (const item of data.children) {
            if (item.totalMatchCount > 0) {
                const childResult = getThroughChildHasResult(item);
                if (childResult) {
                    return childResult;
                } else {
                    return item;
                }
            }
        }
        return null;
    };

    const getThroughChildFirst = (data) => {
        if (!data || !Array.isArray(data.children) || data.children.length === 0) {
            return data;
        }
        return getThroughChildFirst(data.children[0]);
    };


    const handleTagOnChecked = (checked: boolean, item) => {
        const checkedItems = filterTags.filter(item => item.checked);//当前选中的标签
        const next = (filterTags).map(ft => {
            return ft.value === item.value ? { ...ft, checked: checked } : ft;
        });
        setFilterTags(next);

        //card中标签选中与否不会改变state中selectedTags的数据，只会更新popUp组件中展示的tags选中状态
        //并且将未选中标签暂存到state.tags.toBeUnselectedNextTime中，待popUp中标签选中或非选导致selectedTags变化时一齐更新

        const bookmarkIds = data.searchResult.map(item => item.id);
        if (bookmarkIds.length > 0) {
            const newBookmarks = item.bookmarks.filter(b => bookmarkIds.includes(b));
            // console.log('xxxxxxxxxxxxxxxxxxxx handleTagOncheck 取消筛选', item, bookmarkIds, newBookmarks);
            const theTag = { ...item, bookmarks: newBookmarks, checked: checked };

            if (checked) {
                //从item中过滤搜索结果中的
                dispatch(groupTagSelected(theTag));
            } else {
                dispatch(groupTagUnselected(theTag));
            }
            // console.log('xxxxxxxxxxxxxxxxxxxx handleTagOncheck 取消筛选 unSelectedTag', unSelectedTag, selectedTags);
        }

        //取消选中 且仅剩一个标签被选中
        if (!checked && checkedItems.length === 1 && checkedItems[0].value === item.value) {
            //仅剩一个，不需要进行筛选
            // console.log('xxxxxxxxxxxxxxxxxxxx handleTagOncheck setFilter(false) next', checkedItems, next);
            setCurrentFilter(false);
            if (searchInput) {//有关键词搜索
                onKeywordChange(searchInput, searchType, false);
            } else {//清空筛选
                const last = getThroughChildFirst(data);
                setActiveMap(buildActiveMap(last.path));
            }
        } else {//其他情况: 仍有标签
            const result = filterDataByTags(next, data);
            setData(result);//筛选结果
            if (result.totalMatchCount > 0) {
                // const child = getThroughChildHasResult(result);
                // if (child) setActiveMap(buildActiveMap(child.path));
                setActiveMap({ [data.id]: searchTabKey });
            }
            setCurrentFilter(true);
        }
    };

    // 保持对最新 selectedTags 的引用，确保在触发筛选时使用最新的 tags
    const latestSelectedTagsRef = useRef(selectedTags);
    // 容器 ref：用于在卡片被激活时滚动到该卡片顶部
    const containerRef = useRef<HTMLDivElement | null>(null);
    //now 1111

    useEffect(() => {
        // 确保在主动用最新的 newGroupData 更新组件时，
        // 不会被紧接着触发的 selectedTags（在这里是变为空时） effect 用旧 data 覆盖，因为这里已经主动调用了 onNavTagsFilterChange 进行筛选了。
        // 之后 effect 会自动复位，保持正常响应 Redux 的 selectedTags 变更。
        // if (data.name === 'AAAAA')
        // console.log('00000000000000   latestSelectedTagsRef.current', data.name, selectedTags);
        latestSelectedTagsRef.current = selectedTags;
        if (skipSelectedTagsEffectRef.current) { // 跳过一次自动触发的 selectedTags effect
            //  ==>前面执行了删除子分组手动触发onNavTagsFilterChange 进行筛选了，所以这里跳过selectedTags的effect，
            // 避免被这个effect用旧的data进行未预期的筛选覆盖了。
            skipSelectedTagsEffectRef.current = false;
            return;
        }
        // if (data.name === 'AAAAA') console.log('00000000000000   selectedTags', selectedTags);
        onNavTagsFilterChange(selectedTags, filterTags, data, searchInput);
    }, [selectedTags]);

    const [keyWord, setKeyWord] = useState('');
    // const [searchType, setSearchType] = useState(0);
    //now1  搜索关键词为空时先判断当前是否标签筛选模式，如果是只需要清空搜索输入框即可


    const searchTypeRef = useRef<number>(0);
    const [searchType, setSearchType] = useState<number>(0);

    /*  const handleSelectChange = (val) => {
         const next = Number(val);
         setSearchType(next);
         searchTypeRef.current = next;
     }; */

    // const type = searchTypeRef.current; // 始终是最新值


    useEffect(() => {
        const keyWord = searchKeyWord ? searchKeyWord.keyword : '';
        const searchType = searchKeyWord ? searchKeyWord.searchType : 0;
        // console.log('xxxxxxxxxxxxxxxxxx useEffect keyWord', keyWord, searchKeyWord, cardData.name);
        setKeyWord(keyWord);
        setSearchType(searchType);
        searchTypeRef.current = searchType;

        onKeywordChange(keyWord, false);
        if (keyWord) {
            inactiveTagsFilter(); //分组的所有展示的标签取消高亮
        } else {
            if (selectedTags.length > 0) {
                onNavTagsFilterChange(selectedTags, filterTags, data, keyWord);
                // console.log('xxxxxxxxxxxxxxxxxx 搜索关键词为空，有标签筛选', cardData.name, keyWord, selectedTags);
            }
        }
    }, [searchKeyWord]);//第一次渲染就会触发,全局搜索关键词


    /*  useEffect(() => {
         // 只在搜索模式下需要特殊处理分组类型差异
         if (!searching) return;
         const len = (searchResult && Array.isArray(searchResult)) ? searchResult.length : 0;
         // console.log('xxxxxxxxxxxxxxxxxxxxxxx searching  useEffect searchResult', cardData.name, searchResult, len);
         setCardShow(currentSearch || (!currentSearch && len !== 0));
         // }, [dataType,searching, searchResult, currentSearch]);
     }, [searching, searchResult, currentSearch]); */

    //分组的所有展示的标签取消高亮
    const inactiveTagsFilter = () => {
        if (Array.isArray(filterTags) && filterTags.length > 0) {
            const next = (filterTags).map(ft => {
                return { ...ft, checked: false };
            });
            setFilterTags(next);
            setCurrentFilter(false);
        }
    }

    const onKeywordChange = (searchKeyword: string, currentSearch: boolean) => {
        // const keyword = searchKeyword ? searchKeyword.trim() : '';
        const keyword = searchKeyword;
        setSearchInput(keyword);
        setCurrentSearch(currentSearch);
        setActiveCardTab([]);//相当于tree选中节点失效,除非重新点击
        //点击搜索后点击tab后应恢复到默认tabs

        //是否展示当前Card: 非隐藏或设置显示，再根据搜索结果判断
        // const showCard = !cardData.hide || display;
        //处理关键词搜索
        processSearchKeywordChange(data, keyword, currentSearch, true);
        if (keyword === '') {
            if (defaultActiveMap) setActiveMap(defaultActiveMap);
            else {
                if (!activeMap || activeMap[cardData.id] == searchTabKey) {
                    if (dataType == 0) initActiveMap(cardData.id);//初始化第一层tabs的activeTab
                    else if (dataType == 2) setActiveMap({ [cardData.id]: data.children[0].id });//初始化第一层tabs的activeTab
                }
            }
        } else {//搜索结果tab
            setActiveMap({ [cardData.id]: searchTabKey })
        }
    }

    const onInputChange = (inputValue) => {
        // console.log('222222222222222222220', data.totalMatchCount);
        let currentSearch: boolean = true;
        if (keyWord && keyWord !== '') { //从全局搜索变为局部搜索
            if (inputValue.trim() !== keyWord && searchInput === keyWord && data.totalMatchCount > 0) {
                dispatch(updateSearchState({ searchResultNum: data.totalMatchCount * -1 }));
            } else if (inputValue.trim() === keyWord && searchInput !== keyWord) {
                // currentSearch = false;
                // console.log('111111111111111 onInputChange 局部搜索关键词==全局搜索关键词 inputValue,keyWord,searchInput', inputValue, keyWord, searchInput);
            }
        }
        setTreeSelected(true);
        inactiveTagsFilter();
        onKeywordChange(inputValue, currentSearch);
        // setShowItem(true);
    }

    //导航栏标签筛选变化时的处理逻辑：同步 filterTags 的 selected/checked 状态，进行数据筛选，并控制当前 Card 的展示与标签高亮
    const onNavTagsFilterChange = (tags: any[], filterTags, data: any, keyword: string) => {
        // if (data.name === 'AAAAA')
        // console.log('11111111111111111111 onNavTagsFilterChange data', data.name, filterTags, tags);
        if (tags && tags.length > 0) {
            setFilter(true);
            let filterResult: boolean = false; let result: any = data; let activeMap: any = null;
            let cardShow: boolean = false; let tagsFilter: boolean = false; let currentFilter: boolean = false;
            if (filterTags.length > 0) {//当前分组存在标签
                // 同步 filterTags 的 selected 状态：如果 tags 中存在相同的 index 则选中
                //首先判断该tags是否包含本分组自身的tags
                let hasSelected: boolean = false;
                try {
                    const nextFilterTags = (filterTags).map(ft => {
                        const matchedTag = Array.isArray(tags)
                            ? tags.find(t => t.key === ft.value)
                            : undefined;

                        return {
                            ...ft,
                            selected: !!matchedTag,//导航栏选中-> 展示
                            checked: !!matchedTag,//当前选中-> 高亮，进行筛选
                            color: matchedTag?.color || ft.color,
                            bookmarks: matchedTag?.bookmarks || ft.bookmarks
                        };
                    });

                    // if (cardData.id === '4d8yh1ft7') console.log('xxxxxxxxxxxxxxxxxxxxx nextFilterTags', cardData.name, nextFilterTags);
                    setFilterTags(nextFilterTags);
                    if (nextFilterTags.some(tag => tag.selected)) {
                        hasSelected = true;
                    }

                    // console.log('xxxxxxxxxxxxxxxxxxxxx filterDataByTags result hasSelected', data, hasSelected);
                    // console.log('-----------------------------------');
                    if (hasSelected) {//分组存在相同的标签
                        result = filterDataByTags(nextFilterTags, data);

                        if (result.totalMatchCount > 0) {//必然的
                            filterResult = true;
                            /*  const child = getThroughChildHasResult(result);
                             if (child) {
                                 activeMap = buildActiveMap(child.path);
                                 setActiveMap(activeMap);
                             } */
                            setActiveMap({ [data.id]: searchTabKey });
                        }

                        cardShow = filterResult; //filterTags为空则不展示
                        currentFilter = filterResult; //filterTags为空则不展示
                        tagsFilter = hasSelected; //filterTags为空则不展示
                    }
                    // else { }//无标签筛选结果 也无搜索关键词
                } catch (e) {
                    console.error('同步 filterTags selected 失败', e); // 容错：若处理出错，不影响后续逻辑
                }
            }
            // else { } //分组无标签


            // console.log('xxxxxxxxxxxxxx filterResult', data.name, filterResult);
            setData(result);
            setCardShow(cardShow); //filterTags为空则不展示
            setTagsFilter(tagsFilter);//展示标签项?
            setCurrentFilter(currentFilter);
            // if (data.name === 'AAAAA') console.log('11111111111111111111 notEmpty result', result);
            // console.log('--------------aaaa filter result', result);
            // return { hasResult: filterResult, data: result, activeMap: activeMap };
        }


        //导航栏筛选清空  切换到搜索模式
        else {
            if (keyword && keyword !== '') {
                const result = processNotEmptySearch(data, searchInput, searchTabKey, false)//处理搜索结果
                setCardShow(result.totalMatchCount > 0);
                setTagsFilter(false);//不展示标签项
                setFilter(false);
                setCurrentFilter(false);
                // return { hasResult: false, data: result, activeMap: null };
                // // console.log('xxxxxxxxxxxxx tagsFilter 2 searchInput result', searchInput, data.name, result)
                // cardShow = result.totalMatchCount > 0; //filterTags为空则不展示
            } else {
                setCardShow(true);
                setTagsFilter(false);//不展示标签项
                setFilter(false);
                setCurrentFilter(false);
                /*  if (searchInput) {
                     console.log('11111111111111111111 empty data searchInput', data.name);
                     onKeywordChange(searchInput, false);
                 } else */
                setData(data);
                // return { hasResult: false, data: data, activeMap: null };
            }
            // if (data.name === 'AAAAA') console.log('11111111111111111111 empty result', data);

        }
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
        /*  if (data.id === '4hzz2ngtw') {
             console.log('2222222222222222 getActiveForPath', path, activeMap, activeValue);
         } */
        return activeValue;
    }


    /* const setActiveMapThroughChildren = async (key: string, path: string,) => {
        const lastIndex = path.lastIndexOf('-');
        if (lastIndex > -1) {//A.点击的是：3级和以下分组
            const last = path.substring(lastIndex + 1).trim();
            if (last === key) { //是复制分组，本身无子分组
                const result = buildActiveMap(path.replaceAll('-', ',') + ',' + key);
                setActiveMap(result);
            } else {
                const lastChild = await getThroughChild(key, path + ',' + key);
                // console.log('222222222222222222 setActiveMapThroughChildren path key lastChild', path, key, lastChild);
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
    } */

    const setActiveMapThroughChildren = async (key: string, path: string,) => {
        // console.log('1111111111111111 setActiveMapThroughChildren path key ',);
        const lastChild = await getThroughChild(key, path + ',' + key);
        const result = buildActiveMap(lastChild.path);
        // console.log('5555555555555555555555 setActiveMapThroughChildren activeMap , path, key', path, key, result);
        setActiveMap(result);
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


    // 层级 onChange：根层沿用原有 onTabChange 逻辑，非根层仅更新 activeMap
    const TabChange = (key: string, node: any, path: string,) => {
        // console.log('9999999999 getActiveForPath node path key', node, path, key);
        setTreeSelected(false);//使树节点选中的tab及内容背景色失效
        if (dataType == 0) {//默认分组
            if (searching) {
                if (key === searchTabKey) {//搜索结果tab
                    setActiveMap(prev => ({ ...prev, [cardData.id]: searchTabKey }))
                } else {
                    // console.log('9999999999-111111111 getActiveForPath node', node, path, key);
                    // setActiveMapThroughChildrenForSearch(key, path);
                    const children = node.children.filter(child => child.id === key);
                    if (children && children.length > 0) {
                        const child = children[0];
                        const target = getLastChildForSearchResult(child);
                        setActiveMap(buildActiveMap(target.path));
                    }
                }
            } else if (currentFilter) {//筛选结果
                // console.log('9999999999-111111111 getActiveForPath node currentFilter', data, path, key);
                if (key === searchTabKey) {//搜索结果tab
                    setActiveMap(prev => ({ ...prev, [cardData.id]: searchTabKey }))
                } else {
                    const children = node.children.filter(child => child.id === key);
                    if (children && children.length > 0) {
                        const child = children[0];
                        const target = getLastChildForSearchResult(child);
                        setActiveMap(buildActiveMap(target.path));
                    }
                }
                // setActiveMap(null);
            }
            else {
                setActiveMapThroughChildren(key, path);
                // setDropdownVisible(false);
                setEnable(false);
                setTimeout(() => {
                    setEnable(true);
                }, 2000);
            }
        } else if (dataType == 2) {//按域名分组
            setActiveMap(prev => ({ ...prev, [cardData.id]: key }))
            // console.log('9999999999 getActiveForPath node', node, path, key);
        }
    }


    const switchShow = () => {
        processShowChange(!showItem);//Card分组内的切换显/隐
        setShowItem(!showItem)//触发重新渲染
        // console.log(cardData.name + '<<<<<<<<<<<<<<<<<<<<<<<<<< switchShow change', showItem)
    }
    const [defaultActiveMap, setDefaultActiveMap] = useState(null);

    const [enable, setEnable] = useState(true); // 控制所有 Dropdown 的禁用
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

    function getLastChidFromTreeSelected(startNode: any, pathArr: string[], idx: number): any | null {
        if (!startNode) return null;

        // 递归：从 node 开始，优先选择 children 中 first(totalMatchCount>0)，否则 first(totalMatchCount==0)，直到叶子
        const descendToPreferred = (n: any): any => {
            if (!n || !Array.isArray(n.children) || n.children.length === 0) return n;
            // 优先匹配 totalMatchCount > 0
            let preferred = n.children.find((c: any) => (c && Number(c.totalMatchCount) > 0));
            if (!preferred) {
                preferred = n.children.find((c: any) => (c && Number(c.totalMatchCount) === 0));
            }
            // 如果仍未找到，则退而求其次取第一个子节点
            // if (!preferred) preferred = n.children[0];
            return descendToPreferred(preferred);
        };

        if (!Array.isArray(startNode.children) || startNode.children.length === 0) {
            return startNode;
        }

        let node = startNode;
        for (let i = idx; i < pathArr.length; i++) {
            const targetId = pathArr[i];
            const child = Array.isArray(node.children) ? node.children.find((c: any) => c.id == targetId) : null;
            // console.log('------------child', child);
            if (child) {
                // 沿 path 继续深入
                node = child;
                if (i == pathArr.length - 1) {
                    // console.log('------------- 最后一个', child);
                    // 如果已经到底层，直接返回；否则基于子树按优先策略递归查找并返回最终叶子元素
                    if (!child.children || child.children.length == 0) return child;
                    return descendToPreferred(child);
                }
                continue; // 沿着 for 循环进行下一次遍历，node 随之深入
            }
        }

        // 若循环结束仍未直接返回，则尝试在当前 node 上寻找优先的后代并返回
        return descendToPreferred(node) || null;
    }


    function setActiveMapByTreeSelected() {
        const pathLevels = activeCardTab.length;
        const paths = activeCardTab.join(",");
        if (searching) {
            // console.log('setActiveMapByTreeSelected searching  activeCardTab path ', activeCardTab, paths);
            //根据paths循迹找到node节点，如果它还有子节点则自动active
            if (pathLevels == 1) {
                // if (data.list) setActiveMap(buildActiveMap(paths + "," + data.id));//分组有书签数据
                // else
                setActiveMap(buildActiveMap(paths));
            } else {
                const groupId: string = activeCardTab[pathLevels - 1];
                setActiveMapByBookmarksNum(groupId, paths);
            }
        } else {
            if (pathLevels == 1) {
                // if (data.list) setActiveMap(buildActiveMap(paths + "," + data.id));//分组有书签数据
                // else
                setActiveMap(buildActiveMap(paths));
            } else {
                const groupId: string = activeCardTab[pathLevels - 1];
                setActiveMapByBookmarksNum(groupId, paths);
            }
        }
    }

    async function setActiveMapByBookmarksNum(gId: string, path: string) {
        const bookmarksNum: number = await getBookmarksNumByGId(gId);
        const pathStr = bookmarksNum > 0 ? path + "," + gId : path;
        // console.log('================= setActiveMapByBookmarksNum', pathStr);
        setActiveMap(buildActiveMap(pathStr));
    }

    useEffect(() => {
        // if (data.name === '测试A')
        //     console.log('xxxxxxxxxxxxxxxxxx useEffect activeCardTab 被选中了', activeCardTab, cardData.name);
        if (activeCardTab.length == 0) return;
        const cardActive: string = activeCardTab[0];
        // 受控模式
        if (cardActive === data.id) {//当前Card被选中了
            console.log(data.name + '被选中了 >>>>>>>  cardActive', cardActive);
            setTreeSelected(true);
            setCardShow(true);//当前Card展示
            // console.log('xxxxxxxxxxxxxxxxxx useEffect activeCardTab 被选中了', activeCardTab, cardData.name, cardShow);
            if (dataType == 0 || dataType == 2) {
                if (searching || currentFilter) {
                    if (activeCardTab.length == 1) {//选中父节点
                        setActiveMap({ [data.id]: searchTabKey });
                    } else {
                        const lastChild = getLastChidFromTreeSelected(data, activeCardTab, 0);
                        const path = buildActiveMap(lastChild.path)
                        path[lastChild.path.replaceAll(',', '-')] = lastChild.id;//用于作判断，被tree选中节点的子节点
                        setActiveMap(path);
                    }

                } else {
                    const paths = activeCardTab.join(",");
                    setActiveMap(buildActiveMap(paths));
                }
            }
            // else if (dataType == 1) {     }


            // 激活后滚动到该卡片顶部，确保可见（使用 requestAnimationFrame 更可靠地等待 DOM 更新）
            // if (!cardShow) {
            try {
                const doScroll = () => {
                    if (containerRef && containerRef.current) {
                        containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                };
                if (typeof window !== 'undefined' && window.requestAnimationFrame) {
                    window.requestAnimationFrame(() => {
                        // 再次用 setTimeout 保底，保证在 React 布局后执行
                        setTimeout(doScroll, 0);
                    });
                } else {
                    setTimeout(doScroll, 0);
                }
            } catch (e) {
                // noop
            }
            // }
            //如果在全局搜索模式下当前Card被tree选中且搜索结果为空 =>临时显示全部
        } else {//当前Card没有被选中了
            //按域名分组时，点击树节点切换到另一个大分组，这时如果当前激活的Tab没有搜索结果了，则切换到搜索结果的Tab
            if (searching) {//
                // console.log('xxxxxxxxxxxxxxxx 没有被选中了 searching', activeCardTab, cardData.name, treeSelected);
                if (dataType == 2) {//按域名分组
                    //如果当前激活的Tab没有搜索结果了
                    const activeTabs = data.children.filter(child => child.id === activeMap[cardData.id]);//当前展示的tab
                    if (activeTabs.length > 0 && activeTabs[0].totalMatchCount == 0) {//如果当前激活的Tab没有搜索结果了
                        setActiveMap({ [cardData.id]: searchTabKey });
                    }
                    if (!currentSearch && data.totalMatchCount == 0) setCardShow(false);
                } if (dataType == 1) {//按时间分组
                    if (data.totalMatchCount == 0) {//如果当前激活的Tab没有搜索结果了
                        setCardShow(false);
                    }
                }
                else if (dataType == 0 && treeSelected) {//上次被选中才需要重新检查切换
                    if (data.searchResult.length == 0) {//无搜索结果 ok
                        setActiveMap({ [data.id]: searchTabKey });
                        // setCardShow(false);//当前Card展示
                        // console.log('xxxxxxxxxxxxxxxx 没有被选中了 searching currentSearch', cardData.name, data, currentSearch);
                        if (currentSearch && searchInput !== keyWord) {//当前搜索结果 不能与全局搜索关键词一样，否则==全局搜索
                        } else {//相当于全局搜索
                            // console.log('xxxxxxxxxxxxxxxx 没有被选中了 searching 1111111', cardData.name, treeSelected);
                            setCardShow(false);
                        }
                    } else {//有搜索结果 如果该分组无搜索结果了，切换到最近的有搜索结果的分组
                        const keys = Object.keys(activeMap);
                        const groupPath = keys.length ? keys.reduce((a, b) => (a.length > b.length ? a : b)) : undefined;//当前激活的Tab所属的分组路径
                        // console.log(cardData.name + '没有被选中了 >>>>>>>  cardActive', cardActive, activeMap, groupPath);
                        if (groupPath) { //&& typeof groupPath === 'string'
                            const path = groupPath.split('-');
                            if (path.length >= 2) {//对应的分组从第二级开始
                                const pId = path[1];//适用于二级分组及以下的书签,path[0]是祖分组id，path[1]是第一层tabs的active项
                                data.children.forEach((item: any) => {
                                    //所属当前分组无搜索结果
                                    if (item.id === pId) {
                                        if (item.totalMatchCount == 0) setActiveMap({ [data.id]: searchTabKey });
                                        else {//该tab有搜索结果，继续路径匹配直到最底层 优先沿 path 深度匹配；若未命中则在同层找第一个有结果的兄弟并递归到底层
                                            const matchedPath = traverseForMatch(item, path, 2);//从path[2]第3个元素开始匹配
                                            if (matchedPath) setActiveMap(buildActiveMap(matchedPath));
                                        }
                                    }
                                })
                            } else if (path.length == 1) {//一级分组，
                                const pId = path[0];//但是因为因为一级分组本身有子分组，所有children至少有2个元素
                                if (data.children.length >= 2 && pId === data.id) {
                                    const toFind = data.children.filter(item => item.id === activeMap[pId]);
                                    if (toFind.length > 0 && toFind[0].totalMatchCount == 0) {
                                        setActiveMap({ [data.id]: searchTabKey });
                                    }
                                }
                            }
                        }
                    }
                }
            }

            //B.标签筛选模式
            else if (filter) {
                if (dataType == 2) {//按域名分组
                    if (!data.totalMatchCount || data.totalMatchCount == 0) setCardShow(false);
                    else if (treeSelected) { //原来被选中
                        // console.log('xxxxxxxxxxxxxxxx 按域名分组')
                        const activeTabs = data.children.filter(child => child.id === activeMap[cardData.id]);
                        if (activeTabs.length > 0 && activeTabs[0].totalMatchCount == 0) {//如果当前激活的Tab没有搜索结果了
                            const toActiveTabs = data.children.filter(child => child.totalMatchCount > 0);
                            if (toActiveTabs.length > 0) setActiveMap(buildActiveMap(toActiveTabs[0].path));
                        }
                    }
                } if (dataType == 1) {//按时间分组
                    if (treeSelected) {
                        if (!data.totalMatchCount || data.totalMatchCount == 0) setCardShow(false);
                    }
                } else if (dataType == 0 && treeSelected) {//上次被选中才需要重新检查切换
                    // console.log('xxxxxxxxxxxxxxxx 没有被选中了', cardData.name);
                    // if (!currentFilter) {//无筛选结果/无高亮标签
                    if (!tagsFilter) {//tagsFilter 分组有筛选标签=>可有筛选结果
                        setCardShow(false);
                    } else {//有搜索结果 如果该分组无搜索结果了，切换到最近的有搜索结果的分组
                        const keys = Object.keys(activeMap);
                        const groupPath = keys.length ? keys.reduce((a, b) => (a.length > b.length ? a : b)) : undefined;//当前激活的Tab所属的分组路径
                        // console.log(cardData.name + '没有被选中了 >>>>>>>  cardActive', cardActive, activeMap, groupPath);
                        // console.log('xxxxxxxxxxxxxxx groupPath 没有被选中了1111111 >>>>>>>', data.name, groupPath, activeMap);
                        if (groupPath) { //path.length >= 2 或 undefined
                            const path = groupPath.split('-');
                            if (path.length >= 2) {//对应的分组从第二级开始
                                const pId = path[1];//适用于二级分组及以下的书签,path[0]是祖分组id，path[1]是第一层tabs的active项
                                data.children.forEach((item: any) => {
                                    //所属当前分组无搜索结果
                                    if (item.id === pId) {
                                        if (item.totalMatchCount == 0) {//可能是tree选中的无筛选结果tab,切换到兄弟tab
                                            const matchedPath = traverseForMatch(data, path, 1);//从path[1]第2个元素开始匹配
                                            if (matchedPath) setActiveMap(buildActiveMap(matchedPath));
                                            // console.log('xxxxxxxxxxxxxxx totalMatchCount >>>>>>> item', path, item, matchedPath);
                                        }
                                        else {//该tab有搜索结果，继续路径匹配直到最底层 优先沿 path 深度匹配；若未命中则在同层找第一个有结果的兄弟并递归到底层
                                            const matchedPath = traverseForMatch(item, path, 2);//从path[2]第3个元素开始匹配
                                            if (matchedPath) setActiveMap(buildActiveMap(matchedPath));
                                        }
                                    }
                                })
                            } else if (path.length == 1) {//一级分组，
                                const pId = path[0];//但是因为因为一级分组本身有子分组，所有children至少有2个元素
                                if (data.children.length >= 2 && pId === data.id) {
                                    const toFind = data.children.filter(item => item.id === activeMap[pId]);//该层所有tabs中找到该原来的选中分组tab
                                    if (toFind.length > 0 && toFind[0].totalMatchCount == 0) {//原来选中的分组没有筛选结果
                                        const bros = data.children.filter(item => item.totalMatchCount > 0);//选中兄弟tab
                                        if (bros.length > 0) setActiveMap(buildActiveMap(bros[0].path));
                                    }
                                }
                            }
                        }
                    }
                }
            }
            setTreeSelected(false);
        }
        // setShowByDisplayAndAll(cardData.hide, display, treeSelected1);
    }, [activeCardTab]);

    useEffect(() => {
        // if (data.id === '4hzz2ngtw')
        // console.log(data.name + ' sssssssssssssssssss  treeSelectedNode', treeSelectedNode);
        setActiveCardTab(treeSelectedNode);//没有自动展开
    }, [treeSelectedNode]);

    /* useEffect(() => {
        // console.log(cardData.name + '  display', display)
        //重新进行一次搜索,考虑hasResult并未更新，所以该Card仍然展示
        setDataFromProps();
        //重置默认激活Tab项
        let defaultKey = true;
        if (activeGroup) {
            //编辑或新增的Tag所属的要激活的Tab,属于当前Card 一级或二级
            if (activeGroup.id === cardData.id || cardData.id === activeGroup.pId) {
                if (!activeGroup.hide || showItem) {//当前不隐藏
                    // if (cardData.id === '0l5tbdjit') console.log(cardData.name + ' cardData activeGroup setActiveTab=', activeGroup.id + '')
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

    //三、切换显示/隐藏部分 暂时停用==================================================================================== 
    /*  useEffect(() => {
         // if (cardData.id === 9) console.log(cardData.name + '  display1', display)
         setShowItem(display);//显示该分组下的隐藏项 重新渲染
         //如果当前ActiveKey为隐藏项且当前切换为隐藏 --> 切换到第一个tab项
         if (cardData.itemHide) processShowChange(display);//Card分部分组的切换显/隐
         //全局控制局部
         setShowByDisplayAndAll(cardData.hide, display, treeSelected);
     }, [display]); */



    //根据所有条件决定该Card是否展示
    const setShowByDisplayAndAll = (groupHide: boolean, display: boolean, treeSelected1: boolean) => {
        // const setShowByDisplayAndAll = (groupHide: boolean, display: boolean) => {
        // const toShow: boolean = (!groupHide) || (display && !noSearchResult);
        let toShow = false;
        if (searching) {//正在搜索：
            //有搜索结果
            if (data.searchResult.length > 0) {//如果搜结果都是隐藏item,继续判断
                if (display) {//切换为显示隐藏项
                    toShow = true;
                } else {//切换为隐藏隐藏项:整体和分组都要判断
                    if (!groupHide) {//整个分组不隐藏
                        for (const item of data.searchResult) {
                            if (!item.hide) {//搜索结果中有不隐藏的
                                toShow = true;
                                break; // 直接跳出循环
                            }
                        }
                    }
                }
            } else { //无搜索结果：
                // 对按时间/按域名分组，搜索时如果没有匹配项应隐藏整个 Card
                if (dataType === 1 || dataType === 2) {
                    toShow = false;
                } else {
                    // console.log(cardData.name + '--------------- searchResult= 0 ', groupHide, display, treeSelected1);
                    toShow = groupHide ? display && treeSelected1 : treeSelected1;
                }
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
                    // setActiveTab(searchTabKey);
                }
                else if (unHiddenGroupArr.length > 0) {
                    // const replaceActiveKey = unHiddenGroupArr[0] + '';
                    // setActiveTab(replaceActiveKey);
                }
            }
        }
        //情况B.切换为显示
        else {
            if (searching) {
                // console.log(cardData.name + ' processShowChange setActiveTab= 切换为显示', searchResult);
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
             console.log('bbbbbbbbbbbbbbbbbbbbbbbb [] initActiveMap', activeMap);
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
    // const [selectedTags, setSelectedTags] = useState<any[]>(cardData.tags);
    // const [selectedTags, setSelectedTags] = useState<any[]>(cardData.tagsList);
    //添加2级分组Tab
    /* const handleAddTab = () => {
        // console.log('添加2级分组Tab handleAddTab');
        setTabForm(true);
        // setTabGroup({null});
        setTabGroup({ pId: cardData.id });
        // setSelectGroup([cardData.id]);
        setSelectGroup(cardData.id);
    }; */

    /**
     * 处理添加标签页的操作
     * @param group - 分组对象，包含id、pageId和path等属性
     */
    /**
        console.log('xxxxxxxxxxxxxxxx', group); // 打印分组对象信息，用于调试
        setTabForm(true); // 设置标签表单为可见状态
        setTabGroup({ pId: group.id, pageId: group.pageId }); // 设置标签页的父ID和页面ID
        const pathArr: string[] = group.path.split(","); // 将分组路径字符串按逗号分割成数组
        setSelectGroup(pathArr); // 设置选中的分组为路径数组
        // console.log('添加分组Tab handleAddTab', group, pathArr); // 注释掉的调试代码
     */
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
            getGroupData();
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
        console.log('打开全部标签', group.bookmarks);
        openUrls(group.bookmarks);
    }


    //删除大分组
    async function processRemoveGroup00(id: string) {
        try {
            if (searching) {//搜索模式 删除大分组中的所有搜索结果
                //当被删除的书签所在的分组为空时，需要删除该分组，并向上迭代删除直至祖分组
                const removeBookmarks = data.searchResult;
                const toRemoveTags = [];
                for (const bookmark of removeBookmarks) {
                    const tags = bookmark.tags;
                    if (Array.isArray(tags) && tags.length > 0) {
                        for (const t of tags) toRemoveTags.push({ tag: t, add: false, id: bookmark.id });
                    }
                }

                const response = await removeWebTagsAndGroups(data.searchResult, true);//删除搜索结果书签，并迭代删除空分组
                if (response.success) {
                    const resultData = await getBookmarksGroupById(id);
                    if (resultData) {
                        const groupData = resultData.groupData;
                        const newData = { ...groupData, searchResult: [], totalMatchCount: 0 };

                        setData(newData);
                        if (currentSearch) {
                            setActiveMap({ [data.id]: searchTabKey }); //搜索结果变为0
                        } else {
                            setCardShow(false);
                        }
                        dispatch(fetchBookmarksPageDatas([0, 1, 2]));
                    } else {
                        // console.log('祖分组被删除了', resultData);
                        removeCard(data.id);//刷新当前页面数据
                        dispatch(fetchBookmarksPageDatas([1, 2]));//哪种分组方式的书签页数据待更新
                    }

                    if (toRemoveTags.length > 0) dispatch(updatePageBookmarkTags(toRemoveTags));//删除标签
                    if (response.deletedGroups > 0) dispatch(fetchBookmarksPageDataGoups(pageId));//删除了分组(包括大分组被删除removeCard(data.id);) 更新分组树列表
                    if (!currentSearch) dispatch(updateSearchState({ searchResultNum: removeBookmarks.length * -1 }));//更新搜索结果数量
                    return true;
                }
                return false;
            } else {
                const response = await removeGroupById(id);
                // console.log('111111111111111111111' + cardData.name + ' processRemoveGroup00 response', response);
                if (response.success) {
                    // getGroupData();//刷新书签页数据
                    // 

                    removeCard(data.id);//移除card
                    // setCardShow(false);
                    //有书签被删除才需要同步按时间/域名分组数据
                    if (response.deletedBookmarks > 0) {
                        dispatch(fetchBookmarksPageDatas([1, 2]));//删除了书签
                        await processUpdatePageBookmarksNum(pageId, -1 * response.deletedBookmarks);
                    }
                    if (response.toRemoveTags.length > 0) {
                        dispatch(updatePageBookmarkTags(response.toRemoveTags));//删除标签
                    }
                    dispatch(fetchBookmarksPageDataGoups(pageId));//删除了分组 更新分组树列表
                    return true;

                }
                return false;
            }
        } catch (error) {
            return false;
        }
    }

    async function processRemoveGroup1() {//按时间(年-月)分组-删除大分组
        try {
            if (searching) {//搜索模式
                const bookmarkIds: string[] = Array.from(new Set(data.searchResult.map(b => (b && b.id) || null).filter(Boolean)));
                // console.log('0000000000000000000-11 processRemoveGroup1 按时间分组 searching', bookmarkIds);
                const response = await removeWebTags(bookmarkIds);
                if (response) {
                    setData(prev => {
                        const newSearchResult = [];
                        const newBookmarks = prev.bookmarks.filter(b => !bookmarkIds.includes(b.id));
                        return { ...prev, searchResult: newSearchResult, totalMatchCount: newSearchResult.length, bookmarks: newBookmarks };
                    });
                    if (data.bookmarks.length == bookmarkIds.length) {//全部搜索结果被删除了
                        removeCard(data.id);//删除了整个分组(年-月)的当前书签搜索结果 移除card
                    } else {
                        setCardShow(false);//删除了部分书签
                    }
                    // dispatch(fetchBookmarksPageDatas([0, 1, 2]));
                    dispatch(fetchBookmarksPageDatas([0, 1, 2]));
                    if (!currentSearch) {//非局部搜索
                        dispatch(updateSearchState({ searchResultNum: bookmarkIds.length * -1 }));
                    }
                    return true;
                } else {
                    return false;
                }

            } else {//非搜索模式
                // console.log('0000000000000000000-11 processRemoveGroup1 按时间分组 !searching');
                // return false;
                const bookmarkIds: string[] = Array.from(new Set(data.bookmarks.map(b => (b && b.id) || null).filter(Boolean)));
                const bookmarks: WebTag[] = data.bookmarks;

                const toRemoveTags = [];
                for (const bookmark of bookmarks) {
                    const tags = bookmark.tags;
                    if (Array.isArray(tags) && tags.length > 0) {
                        for (const t of tags) toRemoveTags.push({ tag: t, add: false, id: bookmark.id });
                    }
                }
                const response = await removeWebTags(bookmarkIds);
                if (response) {
                    if (toRemoveTags.length > 0) {
                        // console.log('0000000000000000000-11 processRemoveGroup1 按时间分组 !searching toRemoveTags', toRemoveTags);
                        dispatch(updatePageBookmarkTags(toRemoveTags));//删除标签
                    }
                    await processUpdatePageBookmarksNum(pageId, -1 * bookmarkIds.length);
                    // Message.success('删除成功');
                    removeCard(data.id);//移除card
                    dispatch(fetchBookmarksPageDatas([0, 1, 2]));
                    return true;
                } else {
                    return false;
                }
            }
        } catch (error) {
            return false;
        }
    }


    async function processRemoveGroup2() {//按域名分组删除大分组，实际只删除书签，不需要删除分组
        // console.log('0000000000000000000-22 processRemoveGroup1 按域名分组');
        try {
            const allBookmarkIds = [];
            const allBookmarks: WebTag[] = [];
            if (searching || currentFilter) {//搜索模式：删除所有搜索结果

                const bookmarkIds: string[] = Array.from(new Set(data.searchResult.map(b => (b && b.id) || null).filter(Boolean)));
                allBookmarkIds.push(...bookmarkIds);
                const allBookmarks: WebTag[] = data.searchResult;

                const toRemoveTags = [];
                for (const bookmark of allBookmarks) {
                    const tags = bookmark.tags;
                    if (Array.isArray(tags) && tags.length > 0) {
                        for (const t of tags) toRemoveTags.push({ tag: t, add: false, id: bookmark.id });
                    }
                }

                const response = await removeWebTags(allBookmarkIds);//删除全部筛选/搜索结果
                // console.log('0000000000000000000-22 processRemoveGroup1 按域名分组 搜索模式 删除大分组的搜索结果', allBookmarks);
                // const response = false;
                if (response) {
                    // Message.success('删除成功');

                    await processUpdatePageBookmarksNum(pageId, -1 * allBookmarkIds.length);
                    let dataBookmarksNum = 0;
                    const newChildren = data.children.reduce((acc, ch) => {
                        const itemBookmarkIds: string[] = Array.from(new Set((Array.isArray(ch.searchResult) ? ch.searchResult : []).map(b => (b && b.id) || null).filter(Boolean)));
                        if (itemBookmarkIds.length > 0 && itemBookmarkIds.every(id => allBookmarkIds.includes(id))) {//该域名子分组有搜索结果
                            // const currentBookmarks = Array.isArray(ch.bookmarks) ? ch.bookmarks : [];
                            const newBookmarks = ch.bookmarks.filter(b => !allBookmarkIds.includes(b.id));
                            // 删除搜索结果书签后，书签数组仍非空时才保留该域名子分组
                            if (newBookmarks.length > 0) {
                                acc.push({ ...ch, bookmarks: newBookmarks, bookmarksNum: newBookmarks.length, searchResult: [], totalMatchCount: 0 });
                                dataBookmarksNum += newBookmarks.length;
                            }
                        } else {//该子分组中不包含搜索结果(隐藏的)，则保留该子分组及其书签（没有书签被删除）以供下次默认/搜索展示
                            acc.push(ch);
                            dataBookmarksNum += ch.bookmarks.length;
                        }
                        return acc;
                    }, []);

                    const newData = { ...data, bookmarksNum: dataBookmarksNum, children: newChildren, searchResult: [], totalMatchCount: 0 };


                    if (searching) {
                        setCardShow(false);
                        if (!currentSearch) {//非局部搜索
                            dispatch(updateSearchState({ searchResultNum: allBookmarkIds.length * -1 }));
                        }
                    } else if (currentFilter) {
                        // console.log('xxxxxxxxxxxxxxxxxxxxxxxxxxx currentFilter newData', newData);
                        //card有剩余数据 如果唯一标签被删除，标签筛选数组置空，会触发重新筛选
                        setCardShow(false);//仅隐藏 剩余数据 card
                        setCurrentFilter(false);
                    }
                    if (data.bookmarksNum == data.searchResult.length) {//全部被删除
                        removeCard(data.id); //todo 更新左侧树
                    }

                    setData(newData);

                    dispatch(fetchBookmarksPageDatas([0, 1, 2]));
                    if (toRemoveTags.length > 0) {
                        setCurrentFilter(false);//清除当前过滤状态
                        dispatch(updatePageBookmarkTags(toRemoveTags));//删除标签
                    }
                    return true;
                }

            } else {//非搜索模式：删除大分组的所有书签
                // console.log('0000000000000000000-22 processRemoveGroup1 按域名分组 非搜索模式');
                data.children.forEach(item => {
                    const bookmarkIds: string[] = Array.from(new Set(item.bookmarks.map(b => (b && b.id) || null).filter(Boolean)));
                    allBookmarkIds.push(...bookmarkIds);
                    allBookmarks.push(...item.bookmarks);
                })

                const toRemoveTags = [];
                for (const bookmark of allBookmarks) {
                    const tags = bookmark.tags;
                    if (Array.isArray(tags) && tags.length > 0) {
                        for (const t of tags) toRemoveTags.push({ tag: t, add: false, id: bookmark.id });
                    }
                }

                // console.log('0000000000000000000-22 processRemoveGroup1 按域名分组 非搜索模式 toRemoveTags', allBookmarks, toRemoveTags);
                const response = await removeWebTags(allBookmarkIds);
                if (response) {
                    if (toRemoveTags.length > 0) {
                        dispatch(updatePageBookmarkTags(toRemoveTags));//删除标签
                    }
                    await processUpdatePageBookmarksNum(pageId, -1 * allBookmarkIds.length);
                    // Message.success('删除成功');
                    // getGroupData();
                    // setCardShow(false);
                    removeCard(data.id);//删除了整个分组(首字母域名)，
                    dispatch(fetchBookmarksPageDatas([0, 1, 2]));
                    return true;
                }
                return false;
            }
        } catch (error) {
            return false;
        }
    }
    /*   const processRemoveGroup00 = async () => {
          try {
              console.log('0000000000000000000-1 processRemoveGroup0');
              const response = await removeGroupById(subGroup.id);
              if (response.success) {
                  // getGroupData();
                  updateCardData();
                  //有书签被删除才需要同步按时间/域名分组数据
                  if (response.deletedBookmarks > 0)
                      dispatch(fetchBookmarksPageDatas([0, 1, 2]));//删除了书签
                  else dispatch(fetchBookmarksPageDatas([0]));//仅删除了分组
                  // console.log('删除成功', subGroup);
                  const pId = subGroup.pId;
                  const str = subGroup.path;
                  const lastIndex = str.lastIndexOf(',');
                  if (lastIndex > -1) {
                      const part1 = str.substring(0, lastIndex);
                      const key = part1.replaceAll(',', '-');
                      const part2 = str.substring(lastIndex + 1); // +1 是为了跳过逗号本身
  
                      if (activeMap[key] === part2) {  //如果被删除的分组为active,则切换到兄弟tab
                          const lastChild = await getThroughChild(pId, part2);
                          setActiveMap(buildActiveMap(lastChild.path));
                      } else {
                          setActiveMap(activeMap);//点击下拉菜单之前的数据
                      }
                  }
                  return true;
              } else {
                  return false;
              }
          } catch (error) {
              return false;
          }
      } */

    /**
     * 移除分组的处理函数
     * 根据不同的数据类型调用不同的删除确认和处理逻辑
     */
    const removeGroup1 = () => {
        // 如果数据类型为0，调用删除分组的确认函数，处理分组及其所有书签的删除
        if (dataType == 0) removeConfirm(cardData.id, cardData.name, true,
            searching ? '点击确定将删除该分组的书签搜索结果' : '点击确定将删除该分组及其所有书签', '分组', processRemoveGroup00);
        // if (dataType == 0) removeConfirm(cardData.id, cardData.name, '点击确定将删除该分组及其所有书签', '分组', processRemoveGroup00);
        else if (dataType == 1) removeConfirm(cardData.id, cardData.name, true,
            searching ? '点击确定将删除该时间段内的书签搜索结果' : '点击确定将删除该时间段内所有的书签', '分组', processRemoveGroup1);
        else if (dataType == 2) removeConfirm(cardData.id, cardData.name, true,
            searching ? '点击确定将删除该首字母域名的书签搜索结果' : '点击确定将删除该首字母域名的所有书签', '分组', processRemoveGroup2);
    }


    // 四、增删改部分 end====================================================================================


    const [moveFormVisible, setMoveFormVisible] = useState(false);//移动书签表单
    const [bookmarksToMove, setBookmarksToMove] = useState([]);//要移动的书签
    const [moveSelectGroup, setMoveSelectGroup] = useState(null);//待移动的选中书签所属当前(祖)分组

    //四、添加/编辑/删除Tab标签部分 
    const [addTagVisible, setAddTagVisible] = useState(false);//添加标签
    const [add2TypesVisible, setAdd2TypesVisible] = useState(false);//添加标签
    const [tagSelectGroup, setTagSelectGroup] = useState([]);//添加Tab

    const [editTag, setEditTag] = useState(null);//添加Tab

    const onEditTag = (tag: WebTag, nodePath: string[], searching: boolean) => {
        // console.log('aaaaaaaaaaaaaaa onEditTag searching', searching, tag);
        setAddTagVisible(true);
        setEditTag(tag);
        // if (searching) setTagSelectGroup(dataType >= 1 ? tag.path : nodePath);
        // else setTagSelectGroup(nodePath);
        setTagSelectGroup(tag.path);
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


    const [loading, setLoading] = useState(true);


    function findFirstWithMatches(node: any): string | null {
        if (!node) return null;
        if (node.totalMatchCount > 0) {
            // 尽量返回最深的第一个含结果的后代路径
            let cur = node;
            while (Array.isArray(cur.children) && cur.children.length > 0) {
                const next = cur.children.find((c: any) => c.totalMatchCount > 0);
                if (!next) break;
                cur = next;
            }
            return cur.path;
        }
        return null;
    }

    // 在给定的树形节点 startNode 上，沿着由 pathArr（ID 序列）指定的路径从索引 idx 开始寻找第一个包含搜索结果（totalMatchCount>0）的节点路径 path完全匹配；
    // 失败时按备选策略返回最近有结果的后代路径或 null。
    function traverseForMatch(startNode: any, pathArr: string[], idx: number): string | null {
        if (!startNode) return null;
        if (!Array.isArray(startNode.children) || startNode.children.length === 0) {
            return startNode.totalMatchCount > 0 ? startNode.path : null;
        }

        let node = startNode;
        for (let i = idx; i < pathArr.length; i++) {
            const targetId = pathArr[i];
            const child = Array.isArray(node.children) ? node.children.find((c: any) => c.id == targetId) : null;
            if (!child) {
                // path 在此层未命中，尝试在同层寻找第一个有结果的兄弟并从其深度查找
                const sibling = Array.isArray(node.children) ? node.children.find((c: any) => c.totalMatchCount > 0) : null;
                return sibling ? findFirstWithMatches(sibling) : null;
            }

            if (child.totalMatchCount > 0) {
                // 沿 path 继续深入
                node = child;
                continue;//沿着for循环进行下一次遍历 node随之深入寻找到
            } else {
                // child 存在但无结果，优先在同层找有结果的兄弟
                const sibling = Array.isArray(node.children) ? node.children.find((c: any) => c.id !== child.id && c.totalMatchCount > 0) : null;
                if (sibling) return findFirstWithMatches(sibling);
                // 否则在 child 的后代中尝试查找
                return findFirstWithMatches(child);
            }
        }

        // 沿 path 完全匹配(for完全循环遍历)，返回该节点或其第一个深层含结果的后代路径
        return findFirstWithMatches(node) || node.path;
    }


    //提交成功后关闭或取消关闭Modal窗口
    //适用于：新增/修改书签(除了修改所属大分组)，
    /*  async function updateCardData(groupPath?: string) {
         getBookmarksGroupById(data.id).then((resultData) => {
             if (resultData) {
                 const groupData = resultData.groupData;
                 if (searching) {//搜索模式
                     const result = searchDataAggregated(searchInput.trim(), groupData);
                     if (result.searchResult.length == 0) {//无搜索结果 ok
                         setActiveMap({ [data.id]: searchTabKey });
                         if (currentSearch) {//当前tab的搜索结果变为空？
                         } else {
                             setCardShow(false);
                         }
                     } else {//有搜索结果 如果该分组无搜索结果了，切换到最近的有搜索结果的分组
                         if (groupPath) { //&& typeof groupPath === 'string'
                             const path = groupPath.split(',');
                             // console.log('11 xxxxxxxxxxxxxxxxx updateCardData groupPath', groupPath, path);
                             if (path.length >= 2) {//对应的分组从第二级开始
                                 const pId = path[1];//适用于二级分组及以下的书签,path[0]是祖分组id，path[1]是第一层tabs的active项
                                 result.children.forEach((item: any) => {
                                     //所属当前分组无搜索结果
                                     if (item.id === pId) {
                                         if (item.totalMatchCount == 0) setActiveMap({ [data.id]: searchTabKey });
                                         else {//该tab有搜索结果，继续路径匹配直到最底层
                                             // 优先沿 path 深度匹配；若未命中则在同层找第一个有结果的兄弟并递归到底层
                                             const matchedPath = traverseForMatch(item, path, 2);//从path[2]第二个元素开始匹配
                                             if (matchedPath) setActiveMap(buildActiveMap(matchedPath));
                                             // else setActiveMap({ [data.id]: searchTabKey });
                                         }
                                     }
                                 })
                             } else if (path.length == 1) {//书签属于一级分组，
                                 const pId = path[0];//但是因为因为一级分组本身有子分组，所有children至少有2个元素
                                 if (result.children.length >= 2 && pId === data.id) {
                                     result.children.forEach((item: any) => {
                                         //所属当前分组无搜索结果
                                         if (item.id === pId && item.totalMatchCount == 0) {
                                             setActiveMap({ [data.id]: searchTabKey });
                                         } //else {}
                                     })
                                 }
                             }
                         }
                     }
 
                     if (currentSearch) {//当前tab的搜索结果变为空？
                         // setActiveMap({ [data.id]: searchTabKey });
                     } else {
                         dispatch(updateSearchState({ searchResultNum: result.searchResult.length - data.totalMatchCount }));
                     }
 
                     //a.只有一个搜索结果->0个搜索结果 全局搜索/局部搜索 ok
                     //b.n个搜索结果->n+1个搜索结果： 新增 ok
                     //c.n个搜索结果->n个搜索结果： 新增 ok
                     //d.全部搜索结果>0的情况下，书签所在分组不变 且当前tab搜索结果1变为0，切换到有搜索结果的最近兄弟分组 tab ok
                     //e.全部搜索结果>0的情况下，书签所在分组变化 且切换后的tab搜索结果为0，切换到搜索结果tab ok
 
                     // setSearchResult(result.searchResult); //（全部）搜索结果
                     setData(result);
                     return result;
                 } else {//非搜索模式
                     //如果删除的是复制子分组的
                     setData(groupData);
                     if (groupPath) {
                         setActiveMap(buildActiveMap(groupPath));
                         // console.log('xxxxxxxxxxxxxxxxx 非搜索模式 1111 updateCardData groupData', groupData, groupPath, buildActiveMap(groupPath));
                     }
                     return groupData;
                 }
             } else {
                 // 删除子分组(默认分组方式) ?
                 // getGroupData();
                 return null;
             }
         })
     } */


    // async function updateCardData(groupPath?: string) {
    async function updateCardData(groupPath?: string, filterTags?: []) {
        const resultData = await getBookmarksGroupById(data.id);
        // console.log('xxxxxxxxxxxxxxxxxxxxx updateCardData resultData ', resultData.groupData);
        if (resultData) {
            const groupData = resultData.groupData;
            if (currentFilter) {//筛选模式
                if (filterTags.length > 0 && filterTags.some(tag => tag?.selected)) {//仍然高亮显示的标签 进行筛选
                    const result = filterDataByTags(filterTags, groupData);
                    // console.log('xxxxxxxxxxxxxxxxxxxxx updateCardData  filter result ', groupData, result);
                    setData(result);
                } else {
                    setData(groupData);
                }
            }
            else if (searching) {//搜索模式
                const result = searchDataAggregated(searchInput.trim(), groupData);
                if (result.searchResult.length == 0) {//无搜索结果 ok
                    setActiveMap({ [data.id]: searchTabKey });
                    if (currentSearch) {//当前tab的搜索结果变为空？
                    } else setCardShow(false);
                } else {//有搜索结果 如果该分组无搜索结果了，切换到最近的有搜索结果的分组
                    if (groupPath) { //&& typeof groupPath === 'string'
                        const path = groupPath.split(',');
                        // console.log('11 xxxxxxxxxxxxxxxxx updateCardData groupPath', groupPath, path);
                        if (path.length >= 2) {//对应的分组从第二级开始
                            const pId = path[1];//适用于二级分组及以下的书签,path[0]是祖分组id，path[1]是第一层tabs的active项
                            result.children.forEach((item: any) => {
                                //所属当前分组无搜索结果
                                if (item.id === pId) {
                                    if (item.totalMatchCount == 0) setActiveMap({ [data.id]: searchTabKey });
                                    else {//该tab有搜索结果，继续路径匹配直到最底层
                                        // 优先沿 path 深度匹配；若未命中则在同层找第一个有结果的兄弟并递归到底层
                                        const matchedPath = traverseForMatch(item, path, 2);//从path[2]第二个元素开始匹配
                                        if (matchedPath) setActiveMap(buildActiveMap(matchedPath));
                                        // else setActiveMap({ [data.id]: searchTabKey });
                                    }
                                }
                            })
                        } else if (path.length == 1) {//书签属于一级分组，
                            const pId = path[0];//但是因为因为一级分组本身有子分组，所有children至少有2个元素
                            if (result.children.length >= 2 && pId === data.id) {
                                result.children.forEach((item: any) => {
                                    //所属当前分组无搜索结果
                                    if (item.id === pId && item.totalMatchCount == 0) {
                                        setActiveMap({ [data.id]: searchTabKey });
                                    } //else {}
                                })
                            }
                        }
                    }
                }

                if (currentSearch) {//当前tab的搜索结果变为空？
                    // setActiveMap({ [data.id]: searchTabKey });
                } else {
                    dispatch(updateSearchState({ searchResultNum: result.searchResult.length - data.totalMatchCount }));
                }

                //a.只有一个搜索结果->0个搜索结果 全局搜索/局部搜索 ok
                //b.n个搜索结果->n+1个搜索结果： 新增 ok
                //c.n个搜索结果->n个搜索结果： 新增 ok
                //d.全部搜索结果>0的情况下，书签所在分组不变 且当前tab搜索结果1变为0，切换到有搜索结果的最近兄弟分组 tab ok
                //e.全部搜索结果>0的情况下，书签所在分组变化 且切换后的tab搜索结果为0，切换到搜索结果tab ok

                // setSearchResult(result.searchResult); //（全部）搜索结果
                setData(result);
                return result;
            } else {//非搜索模式
                //如果删除的是复制子分组的
                setData(groupData);
                if (groupPath) {
                    const activeMap = buildActiveMap(groupPath);
                    setActiveMap(activeMap);
                    // console.log('xxxxxxxxxxxxxxxxx 非搜索模式 1111 updateCardData groupData', groupPath, activeMap);
                }
                return groupData;
            }
        } else {
            // 删除子分组(默认分组方式) ?
            // getGroupData();
            return null;
        }
    }
    // 

    //按时间分组数据更新：修改/移除书签，可能影响按时间/域名分组数据，临时更新到一级分组列表 ok
    function updateCardData1(newTag?: WebTag, removeBookmarkIds?: string[]) {
        const currentBookmarks = data.bookmarks;
        let newBookmarks = currentBookmarks;
        if (newTag) {//A.编辑书签
            newBookmarks = currentBookmarks.filter(b => String(b?.id) !== String(newTag.id));
            newBookmarks.unshift(newTag);
        } else if (removeBookmarkIds && removeBookmarkIds.length > 0) {//B.删除书签
            const removeSet = new Set(removeBookmarkIds.map(String));
            newBookmarks = currentBookmarks.filter(b => !removeSet.has(String(b?.id)));
        }

        const newData = { ...data, bookmarks: newBookmarks, bookmarksNum: newBookmarks.length };
        setData(newData);

        if (searching) {
            const result = searchDataAggregated(searchInput, newData);//在新数据的基础上搜索
            setData(result);
            if (currentSearch) {
            } else { //全局搜索：搜索结果数-1
                if (data.totalMatchCount && data.totalMatchCount - result.totalMatchCount == 1) {//原来的搜索结果data
                    dispatch(updateSearchState({ searchResultNum: -1 }));
                }
                if (result.totalMatchCount == 0) setCardShow(false); //局部搜索，修改后搜索结果为空
            }
            return result;
            // setSearchResult(result.searchResult);
            // setNoHiddenSearchResult(result.noHiddenSearchResult);
        }
        return newData;
    }


    //按域名子分组数据更新：更新card数据和搜索结果数(如果搜索中)
    function updateCardData22(groupPath: string, removeBookmarkIds: string[]) {
        if (groupPath && removeBookmarkIds && removeBookmarkIds.length > 0) {//删除选中的书签
            const removeSet = new Set(removeBookmarkIds.map(String));
            // newBookmarks = currentBookmarks.filter(b => !removeSet.has(String(b?.id)));
            let newData; let empty = false; let itemSearchResultNum = 0;
            const gId = groupPath.split(',').pop();
            // console.log('xxxxxxxxxxxxxxxxxxxxx updateCardData2 groupPath', groupPath, removeBookmarkIds);
            data.children.some((item) => {
                if (item.id === gId) {
                    const newChildren = data.children.reduce((arr, ch) => {
                        if (ch.id === gId) {
                            const newBookmarks = ch.bookmarks.filter(b => !removeSet.has(String(b?.id)));
                            empty = newBookmarks.length === 0;

                            if (empty) return arr; // 直接跳过，不加入数组

                            if (searching || currentFilter) {
                                const newSearchResult = Array.isArray(ch.searchResult) ? ch.searchResult.filter(b => !removeSet.has(String(b?.id))) : [];
                                itemSearchResultNum = newSearchResult.length;
                                arr.push({
                                    ...ch,
                                    bookmarks: newBookmarks,
                                    bookmarksNum: newBookmarks.length,
                                    searchResult: newSearchResult,
                                    totalMatchCount: newSearchResult.length
                                });
                            } else {
                                arr.push({
                                    ...ch,
                                    bookmarks: newBookmarks,
                                    bookmarksNum: newBookmarks.length
                                });
                            }

                            return arr;
                        }
                        arr.push(ch);
                        return arr;
                    }, []);


                    if (newChildren.length == 0) {//如果该子分组的书签被删除后变为空，说明该大分组下没有书签了，且没有其他子分组
                        removeCard(data.id);//如果该子分组的搜索结果被删除后变为空，移除card
                    } else {
                        if (searching) {//搜索模式

                            if (itemSearchResultNum == 0 || empty) { //书签数据非空但搜索结果为空或书签数据为空，切换到搜索结果tab
                                setActiveMap({ [data.id]: searchTabKey });
                            }
                            if (empty) {//
                                removeCard(groupPath);//如果该子分组的搜索结果被删除后变为空，移除card
                            }

                            const newSearchResult = data.searchResult.filter(b => !removeSet.has(String(b?.id)));
                            const result = { ...data, children: newChildren, searchResult: newSearchResult, totalMatchCount: newSearchResult.length };

                            if (currentSearch) {
                            } else { //全局搜索：搜索结果数-删除的搜索结果数
                                dispatch(updateSearchState({ searchResultNum: -1 * removeBookmarkIds.length }));
                                if (result.totalMatchCount == 0) setCardShow(false);//隐藏
                            }

                            newData = result;
                        } else if (currentFilter) {//标签筛选模式
                            if (empty) {
                                removeCard(groupPath);//如果该子分组的搜索结果被删除后变为空，移除card
                                setActiveMap({ [data.id]: newChildren[0].id });//如果该子分组的搜索结果被删除后变为空，切换到搜索结果tab
                            }
                            else if (itemSearchResultNum == 0) {
                                const others = newChildren.filter(item => item.id !== gId);
                                setActiveMap({ [data.id]: others[0]?.id || newChildren[0].id });
                            }
                            const result = { ...data, children: newChildren };
                            newData = result;
                        }

                        else {
                            if (empty) {
                                removeCard(groupPath);//如果该子分组的搜索结果被删除后变为空，移除card
                                setActiveMap({ [data.id]: newChildren[0].id });//如果该子分组的搜索结果被删除后变为空，切换到搜索结果tab
                            }
                            newData = { ...data, children: newChildren };
                        }
                    }
                    return true;//找到子分组 终止遍历
                }
                return false;//继续遍历
            });

            return newData;
        }
    }

    function updateCardData2(newTag: WebTag) {
        // 将 newData 提升到方法作用域，以便后续分支使用
        let newData = data;
        //A.编辑更新
        data.children.some((item) => {
            if (item.id === newTag?.gId1) {
                // 保持 newTag 在原有位置，只替换对应元素，不改变数组顺序
                const newChildren = data.children.map(ch => {
                    if (ch.id === newTag.gId1) {
                        const newBookmarks = Array.isArray(ch.bookmarks)
                            ? ch.bookmarks.map(b => (b && b.id === newTag.id) ? { ...newTag } : b)
                            : ch.bookmarks;
                        return { ...ch, bookmarks: newBookmarks };
                    }
                    return ch;
                });
                newData = { ...data, children: newChildren };
                setData(newData);
                return true;//终止遍历
            }
            return false;//继续遍历
        });
        if (searching) {//搜索中
            const result = searchDataAggregated(searchInput.trim(), newData);//在新数据的基础上搜索
            setData(result);
            if (currentSearch) {
                if (result.totalMatchCount == 0) {//局部搜索，修改后搜索结果为空
                    setActiveMap({ [data.id]: searchTabKey });
                }
            } else { //全局搜索：搜索结果数-1
                if (data.totalMatchCount && data.totalMatchCount - result.totalMatchCount == 1) {//原来的搜索结果data
                    dispatch(updateSearchState({ searchResultNum: -1 }));//搜索结果数-1
                }
                if (result.totalMatchCount == 0) setCardShow(false); //修改后搜索结果为空 隐藏
                else {//如果修改后仍有搜索结果，且该书签所在分组的搜索结果由0变为1，切换到该分组tab
                    result.children.some((item) => {
                        if (item.id === newTag.gId1) {
                            if (item.totalMatchCount == 0)
                                setActiveMap({ [data.id]: searchTabKey });
                            return true;//终止遍历
                        }
                        return false;//继续遍历     
                    });
                }
            }
            return result;
        }
        return newData;
    }


    function updateCardData2AddBookmark(newTag: WebTag) {//ok
        data.children.some((item) => {
            if (item.id === newTag.gId1) {//
                // 基于当前 `data` 构建不可变的新 children，并追加 newTag 到目标子项的 bookmarks
                const newChildren = data.children.map(ch => {
                    if (ch.id === newTag.gId1) {
                        const newBookmarks = Array.isArray(ch.bookmarks) ? [newTag, ...ch.bookmarks] : [newTag];
                        return { ...ch, bookmarks: newBookmarks };
                    }
                    return ch;
                });
                const newData = { ...data, children: newChildren };
                setData(newData);
                // 如果当前处于搜索状态，需要同时刷新搜索结果集合以立即展示新增项
                if (searching) {
                    try {
                        const result = searchDataAggregated(searchInput.trim(), newData);
                        if (!currentSearch) {
                            if (data.totalMatchCount && data.totalMatchCount < result.totalMatchCount) {//原来的搜索结果data
                                dispatch(updateSearchState({ searchResultNum: result.totalMatchCount - data.totalMatchCount }));
                            }
                            // if (result.totalMatchCount == 0) setCardShow(false); //局部搜索，修改后搜索结果为空
                        }
                        setData(result);
                        // setSearchResult(result.searchResult);
                        // setNoHiddenSearchResult(result.noHiddenSearchResult);
                    } catch (e) {
                        // ignore
                    }
                }
                return true;//终止遍历
            } else {
                return false;//继续遍历
            }
        });
    }


    // 在删除分组或删除/移动分组内已选择的聚合书签后，清空该分组及其子孙在 selectedMap 中的已选中书签数据（置为空数组），并根据子分组是否有剩余书签数据决定是否禁用多选模式
    const updateAncestorAndDescendantNodesMultiSelect = (newData, subGroup, self: boolean) => {
        if (newData) {
            try {
                //从原分组数据data（可能仍包含实际不存在的复制子分组）但不影响查找分组和子分组路径的正确性
                const nodeToClear = findNodeById(newData, subGroup.id);

                if (nodeToClear) {
                    const nodesToClear = collectDescendantNodes(nodeToClear);//包括自身分组

                    setSelectedMap(prev => {
                        const next = { ...prev } as Record<string, string[]>;
                        nodesToClear.forEach(n => {
                            //    if() next[n.id] = (n.id == subGroup.id && self) ? prev[n.id] : [];
                            if (n.id === subGroup.id) {
                                if (self) next[n.id] = [];
                            } else {
                                next[n.id] = [];
                            }
                        });
                        return next;
                    });
                    setMultiSelectModeMap(prev => {
                        const next = { ...prev } as Record<string, boolean>;
                        nodesToClear.forEach(n => {
                            if (n.bookmarksNum == 0) {
                                next[n.id] = false;
                            }
                        });
                        return next;
                    });
                    setMultiSelectMap(prev => {
                        const next = { ...prev } as Record<string, boolean>;
                        nodesToClear.forEach(n => {
                            if (n.bookmarksNum == 0) {
                                next[n.id] = false;
                            }
                        });
                        return next;
                    });

                    // 额外：根据 subGroup.path 在 newData 中查找其祖先分组，并将祖先中 bookmarksNum==0 的分组的多选状态设置为 false
                    if (newData && subGroup && subGroup.path) {
                        // 计算祖先 id 列表，去除第一个元素（根card.id）并排除 path 中的最后一项（它是 subGroup 本身）
                        const ancestorIds = (String(subGroup.path) || '').split(',').filter(Boolean).slice(1, -1);
                        // console.log('xxxxxxxxxxxxxxxxxxxxxxx ancestorIds', ancestorIds);
                        if (ancestorIds.length > 0) {
                            setMultiSelectModeMap(prev => {
                                const next = { ...prev } as Record<string, boolean>;
                                ancestorIds.forEach(aid => {
                                    const ancNode = findNodeById(newData, aid);
                                    if (ancNode && ancNode.bookmarksNum === 0) next[aid] = false;
                                });
                                return next;
                            });

                            setMultiSelectMap(prev => {
                                const next = { ...prev } as Record<string, boolean>;
                                ancestorIds.forEach(aid => {
                                    const ancNode = findNodeById(newData, aid);
                                    if (ancNode && ancNode.bookmarksNum === 0) next[aid] = false;
                                });
                                return next;
                            });
                        }
                    }
                }
            } catch (err) {
                console.error('清空 selectedMap 时出错', err);
            }
        }
    }


    // 关闭移动书签Modal窗口后的回调函数，根据移动结果和新分组数据决定是否刷新当前页面数据
    async function closeMoveModal(success: boolean, newGroup: any) {
        setMoveFormVisible(false);
        // console.log('closeMoveModal success, newGroup', success, newGroup);
        if (success && newGroup) {// 移动书签到新分组成功 
            if (dataType == 0) { //按默认分组
                if (newGroup.path.split(',')[0] === data.id) {//移动到当前大分组下的其他子分组，刷新当前card数据 搜索结果tab中的移动ok
                    //moveSelectGroup: 被移动书签所属当前(祖)分组，
                    const newData = await updateCardData(newGroup.path);// 搜索和非搜索模式
                    //如果是从搜索结果tab中移动书签,更新搜索结果tab的多选状态
                    if (moveSelectGroup.id === searchTabKey) {
                        //清空搜索结果tab已选中书签数据,使非其选中
                        setSelectedMap(prev => ({ ...prev, [searchTabKey]: [] }));
                    } else {
                        updateAncestorAndDescendantNodesMultiSelect(newData, moveSelectGroup, false);
                        onNodeSelectionChange(moveSelectGroup.id, [], moveSelectGroup.path);
                    }
                }
                else {//移动到其他大分组，刷新当前页面数据 兼容搜索模式/搜索模式：
                    const result = await getGroupData();
                    // console.log();
                    const newGroupData = result.data.find(group => group.id === data.id);
                    // console.log('000000000000000000000 移动到其他大分组', newGroupData);
                    if (moveSelectGroup.id === searchTabKey) {//从搜索结果tab中移动书签,更新搜索结果tab的多选状态
                        //清空搜索结果tab已选中书签数据，
                        setSelectedMap(prev => ({ ...prev, [searchTabKey]: [] }));
                        //根据搜索结果tab是否有剩余书签数据决定是否禁用多选模式
                        if (moveSelectGroup.postResultNum == 0) {
                            // console.log('333333333333333333333333 Move Modal 移动后当前分组的搜索结果数量为0禁用该分组的多选模式');
                            setMultiSelectModeMap(prev => ({ ...prev, [searchTabKey]: false }));
                            setMultiSelectMap(prev => ({ ...prev, [searchTabKey]: false }));
                        }
                    } else if (newGroup) {//从普通分组tab中移动书签，更新当前分组及其子孙分组tabs的多选状态
                        //  console.log('22222222222222222222222close Move Modal newGroupData moveSelectGroup ', newGroupData, moveSelectGroup);
                        updateAncestorAndDescendantNodesMultiSelect(newGroupData, moveSelectGroup, false);
                        onNodeSelectionChange(moveSelectGroup.id, [], moveSelectGroup.path);
                        // onNodeSelectionChange();
                    }
                }
            } else {//按其他方式(按域名)分组

                if (moveSelectGroup.id === searchTabKey) {
                    //清空搜索结果tab已选中书签数据,使非其选中
                    selectedMapRef.current = { ...selectedMapRef.current, [searchTabKey]: [] };
                } else {
                    // updateAncestorAndDescendantNodesMultiSelect(newData, moveSelectGroup, false);
                    onNodeSelectionChange(moveSelectGroup.id, [], moveSelectGroup.path);//取消勾选
                }

                const moveIds = new Set((Array.isArray(bookmarksToMove) ? bookmarksToMove : [])
                    .map((b: any) => b && b.id).filter(Boolean).map((id: any) => String(id)));
                const gIds = new Set((Array.isArray(bookmarksToMove) ? bookmarksToMove : [])
                    .map((b: any) => b && b.gId1).filter(Boolean).map((gId1: string) => String(gId1)));
                // console.log('xxxxxxxxxxxxxxxxxxxxxxxxx  bookmarksToMove moveSelectGroup gIds moveSelectGroup', bookmarksToMove, gIds, moveSelectGroup);
                const newPath = newGroup.path.split(',')
                if (moveSelectGroup.id === searchTabKey) {  //在搜索结果tab中移动

                    const searchResult = data.searchResult
                        .filter((b: any) => b && moveIds.has(String(b.id)))
                        .map((b: any) => ({ ...b, gId: newGroup.id, path: newPath }));

                    const newChildren = data.children.map(ch => {
                        if (gIds.has(ch.id)) {
                            const searchResult = ch.searchResult
                                .filter((b: any) => b && moveIds.has(String(b.id)))
                                .map((b: any) => ({ ...b, gId: newGroup.id, path: newPath }));
                            return { ...ch, searchResult: searchResult };
                        }
                        return ch;
                    });
                    setData({ ...data, searchResult: searchResult, children: newChildren });
                }

                else {//在普通分组中移动
                    //↓ 分组tab 的bookmarks和searchResult; 非搜索结果的tab   按域名分组： 过滤移动书签的分组，找到其选中的书签，设置新的所属分组 path
                    const newChildren = data.children.map(ch => {
                        if (ch.id === moveSelectGroup.id) {
                            if (searching) {
                                const searchResult = ch.searchResult
                                    .filter((b: any) => b && moveIds.has(String(b.id)))
                                    .map((b: any) => ({ ...b, gId: newGroup.id, path: newPath }));
                                return { ...ch, searchResult: searchResult };
                            } else {
                                const newBookmarks = ch.bookmarks
                                    .filter((b: any) => b && moveIds.has(String(b.id)))
                                    .map((b: any) => ({ ...b, gId: newGroup.id, path: newPath }));
                                return { ...ch, bookmarks: newBookmarks };
                            }
                        }
                        return ch;
                    });

                    if (searching) {//如果是在搜索中，还要将数据变化同步到搜索结果中
                        const searchResult = data.searchResult
                            .filter((b: any) => b && moveIds.has(String(b.id)))
                            .map((b: any) => ({ ...b, gId: newGroup.id, path: newPath }));
                        setData({ ...data, children: newChildren, searchResult: searchResult });
                    } else {
                        setData({ ...data, children: newChildren });
                    }
                }
                dispatch(fetchBookmarksPageDatas([0]));//修改了书签的分组数据，按默认方式分组待拉取更新数据
            }
        }
    }

    // 新增ok，删除一条书签ok， 插件保存书签1条ok，从插件缓存加载保存的n条书签ok，
    // 删除大分组及书签 ok 
    // 删除大分组cardData的搜索结果书签 removeSearchResultDataType0/1/2 ok
    // 删除非叶子分组及其书签ok，删除叶子分组及书签ok，删除复制子分组ok
    // 多选删除书签 a.普通分组 b.搜索结果分组 ok deleteSelectedBookmarks
    // 删除子分组 processRemoveSubGroup0 processRemoveSubGroup2 搜索 ok | 非搜索 ok
    // 移动分组到其他书签页 涉及2个书签页
    // 加载书签页数据时更新最新书签数 todo
    async function processUpdatePageBookmarksNum(pageId, addNum) {
        const res: boolean = await updatePageBookmarksNum(pageId, addNum);
        await dispatch(updateBookmarksPage({ pageId, addNum }));
    }

    async function closeTagModal(success: boolean, newTag: WebTag, oldTag: WebTag, type: number) {
        setAddTagVisible(false);

        // 根据 newTag 与 oldTag 的 tags 字段计算 tagsUpdate 并更新全局 tagsMap
        const updateFilterTags = (newTags, oldTags) => {
            const newSet = new Set(newTags);
            const oldSet = new Set(oldTags);

            //如果被移除的标签正在用于筛选，则去掉这些被移除的标签后，如果不为空再筛选一次，如果为空则重置数据
            // console.log('删除更新前 filterTags', filterTags);
            let newFilterTags = filterTags;
            for (const t of newSet) {//新增的标签
                if (!oldSet.has(t)) {
                    // newFilterTags = [...newFilterTags, { gId: cardData.id, value: t }];
                    const index = newFilterTags.findIndex(item => item?.value === t);
                    if (index === -1) {
                        // 不存在 → 新增，num = 1
                        newFilterTags = [
                            ...newFilterTags,
                            { gId: cardData.id, value: t, num: 1 }
                        ];
                    } else {
                        // 已存在 → num + 1
                        const item = newFilterTags[index];
                        const nextItem = { ...item, num: (item?.num ?? 0) + 1 };

                        newFilterTags = [
                            ...newFilterTags.slice(0, index),
                            nextItem,
                            ...newFilterTags.slice(index + 1)
                        ];
                    }
                }
            };
            for (const t of oldSet) {//被删除的标签 当大分组内有此标签的个数减为0则移除该分组标签
                if (!newSet.has(t)) {
                    newFilterTags = newFilterTags
                        .map(item => {
                            if (item?.value === t) {
                                const nextNum = (item?.num ?? 0) - 1;

                                // const index = item.bookmarks.findIndex(b => b === newTag.id);
                                if (item.bookmarks && item.bookmarks.length > 0) {
                                    // 不存在 → 新增，num = 1
                                    const newBookmarks = item.bookmarks.filter(b => b !== newTag.id)
                                    return { ...item, num: nextNum, bookmarks: newBookmarks };
                                }
                                // console.log('xxxxxxxxxx 被删除的标签 当大分组内有此标签的个数减为0则移除该分组标签', item);
                                return { ...item, num: nextNum };
                            }
                            return item;
                        })
                        .filter(item => (item?.num ?? 0) > 0);
                }
            }

            // console.log('删除更新后 filterTags', newFilterTags);
            return newFilterTags;
        }

        if (success) {//刷新当前页面数据

            const newTags = Array.isArray(newTag && newTag.tags) ? newTag.tags.map(t => String(t).trim()).filter(Boolean) : [];
            const oldTags = Array.isArray(oldTag && oldTag.tags) ? oldTag.tags.map(t => String(t).trim()).filter(Boolean) : [];
            const newFilterTags = updateFilterTags(newTags, oldTags);
            setFilterTags(newFilterTags);

            // console.log('close Modal group', newTag);
            if (newTag) {//所在的分组，重置位置

                const group = await getBookmarkGroupById(newTag.gId);
                const path = group.path.split(',');//更新path
                newTag.path = path;
                const pId = path[0];

                if (type === 0) {//修改了所属分组，gId发生变化

                    if (pId !== data.id) { //变为属于别的大分组
                        if (dataType === 0) {
                            await getGroupData();
                            dispatch(fetchBookmarksPageDatas([1, 2]));//修改了分组，可能影响按时间/域名分组数据
                        } else if (dataType === 1) {
                            //临时更新该时间分组数据
                            updateCardData1(newTag);
                            dispatch(fetchBookmarksPageDatas([0, 1, 2]));//修改了分组，可能影响按时间/域名分组数据
                        } else if (dataType === 2) {
                            //临时更新域名分组数据
                            updateCardData2(newTag);
                            dispatch(fetchBookmarksPageDatas([0, 1, 2]));//修改了分组，可能影响按时间/域名分组数据
                        }
                    } else {//active所属新的tab分组（无论搜索中与否）
                        if (dataType === 0) updateCardData(group.path); //仅重置Card(搜索)数据 修改了所属（子）分组
                        else if (dataType === 1) updateCardData1(newTag); //临时更新该时间分组数据
                        else if (dataType === 2) updateCardData2(newTag); //临时更新该域名分组数据
                        dispatch(fetchBookmarksPageDatas([0, 1, 2]));//修改了分组，可能影响按时间/域名分组数据
                    }
                } else {//  if (type >= 1) 修改书签1 新增书签2 -> 重置(搜索)数据
                    if (type == 1) { //修改书签除分组外的其他属性 ok
                        if (dataType === 0) {
                            updateCardData(group.path, newFilterTags);
                            // console.log('xxxxxxxxxxxxxxxxx updateCardData 修改书签除分组外的其他属性');
                        }//可能导致搜索结果为空，切换到搜索结果tab
                        else if (dataType === 1) updateCardData1(newTag);
                        else if (dataType === 2) updateCardData2(newTag);
                    } else if (type == 2) { //新增书签:默认分组/按域名分组
                        await processUpdatePageBookmarksNum(pageId, 1);
                        if (dataType === 0) updateCardData();//搜索？一定是有搜索结果的，因此当前tab是激活的
                        else if (dataType === 2) {
                            updateCardData2AddBookmark(newTag);//按域名分组，在当前分组添加书签 搜索模式下？
                        }
                        // console.log('xxxxxxxxxxxxxxxxxx', newTag);
                    }
                    dispatch(fetchBookmarksPageDatas([0, 1, 2]));//修改了分组，可能影响按时间/域名分组数据
                    // refreshDataByAddBookmark(newTag);//新增书签
                }
            }

            //a.修改了所在大分组：按分组：刷新页面；按时间/按域名：不用刷新页面，只更新类型toUPdates012,临时更新到一级分组列表 ok
            //b.修改了所在的所在的小分组 ok
            //c.修改了书签其他属性，按分组/按时间/按域名updateCardData1():    -> d.修改了域名：按域名分组
            //e.新增了书签：按分组，更新所在大分组ok，更新类型toUPdates012 ok

            const computeTagsUpdate = (newTagObj, oldTagObj) => {
                const updates = [];

                // 如果是新增（oldTag 为空或 oldTag.tags 为空）且 newTags 非空：全部视为新增（add: true）
                if ((!oldTagObj || oldTags.length === 0) && newTags.length > 0) {
                    for (const t of newTags) updates.push({ tag: t, add: true, id: newTagObj && newTagObj.id ? newTagObj.id : null });
                    return updates;
                }

                // 否则比较差异：newTags 中相对于 oldTags 新增的 -> add: true
                // oldTags 中相对于 newTags 减少的 -> add: false
                const newSet = new Set(newTags);
                const oldSet = new Set(oldTags);
                // console.log('1111111111111111111 computeTagsUpdate newTag,  data.tagsList filterTags', newTag, data.tagsList, filterTags);
                // console.log('1111111111111111111 computeTagsUpdate newSet, oldSet ', newSet, oldSet,);

                for (const t of newSet) {//新增的标签
                    if (!oldSet.has(t)) updates.push({ tag: t, add: true, id: newTagObj && newTagObj.id ? newTagObj.id : null });
                };

                for (const t of oldSet) {//删除的标签
                    if (!newSet.has(t)) updates.push({ tag: t, add: false, id: oldTagObj && oldTagObj.id ? oldTagObj.id : null });
                }
                // console.log('close Modal newTag', newTag, oldTag);
                return updates;
            }

            const tagsUpdate = computeTagsUpdate(newTag, oldTag);

            if (tagsUpdate && tagsUpdate.length > 0) {
                console.log('11 xxxxxxxxxxxxxxxxxxxxxx computeTagsUpdate updatePageBookmarkTags', tagsUpdate);
                dispatch(updatePageBookmarkTags(tagsUpdate));
            }
        }
    }

    /**
       * 处理重新加载数据的函数
       * @param group 可选参数，表示要处理的分组对象
       */
    const processReload = async (group?) => {
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


    // type == 0 新增分组 type == 1 修改分组
    const processGroupChange1 = async (group, type: number) => {
        // await getGroupData();
        if (group) {//更新/新增分组成功
            //仍然在本页书签
            const pathArr = group.path.split(',');
            console.log('555555555555555555 processReload1 pathArr', group, pathArr, pathArr[0]);
            //A.仍然在本大分组
            if (pathArr[0] === data.id) {
                getBookmarksGroupById(data.id).then((resultData) => {
                    const groupData = resultData.groupData;
                    if (searching) {//搜索中 当前分组应该有搜索结果？否则不会展示该tab
                        setActiveCardTab(group.path.split(','));//相当于tree选中当前节点，无论有无搜索结果都展示该分组；否则无搜索结果的情况下是不显示该分组的
                        //  //适合新增，修改Group
                        const result = searchDataAggregated(searchInput, groupData);
                        setData(result);
                    } else {//非搜索中 ok
                        setData(groupData);
                    }
                    const activeMap = buildActiveMap(group.path);//当前路径
                    setActiveMap(activeMap); //适合新增，修改Group
                });
                await dispatch(fetchBookmarksPageDataGoups(pageId));//仅更新分组数据tree，书签数据不变
                // await dispatch(fetchBookmarksPageDataGoups(pageId));//更新分组数据tree
            }
            else { //B.不在本大分组
                if (group.pageId !== pageId) {//a.新增分组而且不在本书签页
                    //跳转到对应书签页?
                    if (type == 0) {//新增
                        // console.log('xxxxxxxxxxxxxxxxxx 新增分组而且不在本书签页', group.pageId)
                    } else { //编辑修改
                        // const bookmarksNum = await getAllBookmarksByGroupId(group.id);
                        const res: any = await getAllBookmarksByGroupId(group.id);
                        // const bookmarksList = res.bookmarks;
                        if (res.success) {
                            const bookmarksNum = res.bookmarksNum;
                            if (bookmarksNum > 0) {
                                await processUpdatePageBookmarksNum(pageId, bookmarksNum);//增加
                                await processUpdatePageBookmarksNum(group.pageId, -1 * bookmarksNum);//减少
                            }
                            console.log('xxxxxxxxxxxxxxxxxx 编辑分组而且不在本书签页 bookmarksNum', pageId, group.pageId, bookmarksNum);
                        }

                    }
                    // console.log('xxxxxxxxxxxxxxxxxx 新增分组不在本书签页，跳转到对应书签页', group);
                } else {//b.新增分组而且在本书签页; c.d.修改分组(原来一定在本书签页)
                    await getGroupData();//搜索与否均ok （本书签页）
                    //重新设置该大分组的activeMap
                    initActiveMap(data.id);//ok 非搜索模式
                    await dispatch(fetchBookmarksPageDataGoups(pageId));
                }
            }
            dispatch(updateActiveGroup(group));
        }
    }


    //type: 0新增，1修改
    const processGroupChange = async (group, type: number) => {
        // await getGroupData();
        if (group) {//更新/新增分组成功
            //仍然在本页书签
            const pathArr = group.path.split(',');
            if (group.pageId !== pageId) {//一、属于别的书签页
                //跳转到对应书签页?
                if (type == 0) {//新增 //A.新增分组而且不在本书签页 ok
                    // console.log('xxxxxxxxxxxxxxxxxx 新增分组而且不在本书签页', group.pageId)
                } else { //B.编辑修改 至不在本书签页
                    const res = await getAllBookmarksByGroupId(group.id);
                    if (res.success && res.bookmarksNum > 0) {
                        // console.log('66666666666666666666 processGroupChange', res);
                        if (res.toRemoveTags.length > 0) {   //更新导航栏标签(已选)
                            dispatch(updatePageBookmarkTags(res.toRemoveTags));
                        }
                        await processUpdatePageBookmarksNum(pageId, -1 * res.bookmarksNum);//减少
                        await processUpdatePageBookmarksNum(group.pageId, res.bookmarksNum);//增加
                    }
                    // console.log('xxxxxxxxxxxxxxxxxx 编辑分组而且不在本书签页 bookmarksNum', pageId, group.pageId, bookmarksNum);
                    if (pathArr[0] === group.id) { //修改/移动的是大分组
                        // setCardShow(false);
                        // setCardShow(false);
                        removeCard(data.id);
                    }
                    //更新左侧的树列表
                    await dispatch(fetchBookmarksPageDataGoups(pageId));//可以优化为通过大分组增量更新tree数据
                }
                // console.log('xxxxxxxxxxxxxxxxxx 新增分组不在本书签页，跳转到对应书签页', group);
            }
            else { //二、仍在本书签页
                // console.log('555555555555555555 processReload1 pathArr', group, pathArr, pathArr[0]);
                //A.仍然在本大分组
                if (pathArr[0] === data.id) {
                    getBookmarksGroupById(data.id).then((resultData) => {
                        const groupData = resultData.groupData;
                        console.log('666666666666666 新增/编辑分组，本大分组', group, groupData);
                        if (searching) {//搜索中 当前分组应该有搜索结果？否则不会展示该tab
                            //适合新增，修改Group
                            const result = searchDataAggregated(searchInput, groupData);
                            setData(result);
                            setActiveCardTab(group.path.split(','));//相当于tree选中当前节点，无论有无搜索结果都展示该分组；默认情况下无搜索结果的时候下是不显示该分组的
                        } if (currentFilter) {//筛选中 当前分组应该有搜索结果？否则不会展示该tab
                            //适合新增，修改Group
                            const result = filterDataByTags(filterTags, groupData);
                            setData(result);
                            const activeMap = buildActiveMap(group.path);//当前路径
                            console.log('xxxxxxxxxxxx buildActiveMap 新增分组', activeMap);
                            setActiveMap(activeMap); //适合新增，修改Group
                            setActiveCardTab(group.path.split(','));//相当于tree选中当前节点，无论有无搜索结果都展示该分组；默认情况下无搜索结果的时候下是不显示该分组的
                        } else {//非搜索中 ok
                            setData(groupData);
                            const activeMap = buildActiveMap(group.path);//当前路径
                            setActiveMap(activeMap); //适合新增，修改Group
                        }
                    });
                    await dispatch(fetchBookmarksPageDataGoups(pageId));//仅更新分组数据tree，书签数据不变
                } else {

                }
            }
            dispatch(updateActiveGroup(group));
        }

        /*   else {//b.新增分组而且在本书签页; c.d.修改分组(原来一定在本书签页)
              await getGroupData();//搜索与否均ok （本书签页）
              //重新设置该大分组的activeMap
              initActiveMap(data.id);//ok 非搜索模式
              await dispatch(fetchBookmarksPageDataGoups(pageId));
          } */

    }

    //提交成功后关闭或取消关闭Modal窗口
    async function closeTabModal(success: boolean, group: any, type: number) {
        setTabForm(false);
        if (success) {//刷新当前页面数据
            // console.log('xxxxxxxxxxxxxxxxxx close Modal tab', group);
            processGroupChange(group, type);
        }
    }

    const getGroupData = async () => {
        const data: any = await dispatch(fetchBookmarksPageData0(pageId));
        return data;
    }

    /*   const getGroupData1 = async () => {
          // console.log('card getGroupData')
          const data: any = await dispatch(fetchBookmarksPageData(pageId));
      } */

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

    async function handleDeleteSuccess(tag: WebTag, selectGroup) {
        // refreshData1(tag);//设置data数据与db保持一致
        //当前所属分组变为空?切换到兄弟节点tab
        //查询所在分组的urlList,若为空，则切换到搜索结果tab（根据pId）
        await processUpdatePageBookmarksNum(pageId, -1);
        if (dataType == 0) {
            // console.log('222222222222222222222222222222 handleDeleteSuccess,tag selectGroup', tag, selectGroup);
            updateCardData(selectGroup ? selectGroup.join(',') : null, null);
        }

        else if (dataType == 1) {
            const newBookmarks = data.bookmarks.filter(b => b.id !== tag.id);
            if (newBookmarks.length == 0) {//分组内已无数据
                setCardShow(false);//隐藏该选项卡
            } else {
                // setData({ ...data, bookmarks: newBookmarks });
                const newData = { ...data, bookmarks: newBookmarks };
                if (searching) {//搜索模式中删除，结果数-1
                    const result = searchDataAggregated(searchInput.trim(), newData);
                    // setSearchResult(result.searchResult); //（全部）搜索结果
                    setData(result);
                    if (result.searchResult.length == 0) {//搜索结果为空
                        // setActiveMap({ [data.id]: searchTabKey });
                        setCardShow(false);//隐藏该选项卡
                    }
                } else {
                    setData(newData);
                    // setData({ ...data, bookmarks: newBookmarks });
                }
            }

            if (searching && !currentSearch) dispatch(updateSearchState({ searchResultNum: -1 }));//更新搜索结果数（-1）
        }

        else if (dataType == 2) {//按域名分组 ok
            data.children.some((item) => {
                if (item.id === tag.gId1) {//非隐藏的
                    //该分组内还有其他书签数据
                    const newBookmarks = item.bookmarks.filter(b => b.id !== tag.id);//删除后的书签数组
                    if (searching) {//搜索模式
                        const searchResult = data.searchResult.filter(b => b.id !== tag.id);//剩余全部搜索结果
                        const itemSearchResult = item.searchResult.filter(b => b.id !== tag.id);//该子分组的剩余搜索结果

                        setData(prev => {
                            const totalMatchCount = itemSearchResult.length;
                            const newChildren = prev.children.map(ch => ch.id === item.id ? { ...ch, bookmarks: newBookmarks, searchResult: itemSearchResult, totalMatchCount } : ch);
                            const searchResult = prev.searchResult.filter(b => b.id !== tag.id);
                            return { ...prev, children: newChildren, searchResult, totalMatchCount: prev.totalMatchCount - 1 };
                        });

                        //如果是局部搜索模式，则
                        if (searchResult.length == 0) {//全部搜索结果为空
                            if (currentSearch) setActiveMap({ [data.id]: searchTabKey }); //局部搜索模式:切换到搜索结果tab  or 切换到兄弟分组tab  //
                            else setCardShow(false);//全局搜索模式，隐藏该卡片
                            //隐藏该选项卡
                        } else {//仍有全部搜索结果但该分组无搜索结果
                            if (itemSearchResult.length == 0) setActiveMap({ [data.id]: searchTabKey }); //切换到搜索结果tab  or 切换到兄弟分组tab
                            // else { } //当前分组还有其他搜索结果
                        }
                    } else {//非搜索模式
                        setData(prev => {
                            const newChildren = prev.children.map(ch => ch.id === item.id ? { ...ch, bookmarks: newBookmarks } : ch);
                            return { ...prev, children: newChildren };
                        });
                        if (newBookmarks.length == 0) {//分组内已无数据
                            if (data.children.length == 1) {//只有一个子分组
                                setCardShow(false);//隐藏该选项卡
                            } else {
                                const siblings = data.children.filter(ch => ch.id !== item.id);
                                if (siblings.length > 0) setActiveMap({ [data.id]: siblings[0].id }); //切换到兄弟分组tab
                                else setCardShow(false); //隐藏该选项卡
                            }
                            //尚未同步到Tree分组数据...
                        } //else { }
                    }

                    return true;//终止遍历
                } else {//当前项隐藏
                    return false;//继续遍历
                }
            });

            if (searching && !currentSearch) dispatch(updateSearchState({ searchResultNum: -1 }));//更新搜索结果数（-1）
        }

        //删除导航栏的书签
        if (tag.tags && tag.tags.length > 0) {
            const updates = [];
            for (const t of tag.tags) updates.push({ tag: t, add: false, id: tag.id });
            dispatch(updatePageBookmarkTags(updates));
        }

        dispatch(fetchBookmarksPageDatas([0, 1, 2]));
        // getGroupData();//重置pageData数据，触发重新渲染
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
        // selectOperation: string,
        // dataType: number,
        groupId: string,
        multiSelect: boolean,
        list: Array<WebTag>,
        selectGroup: string | string[],
        searching: boolean
    ) => {
        if (!list || list.length == 0) {
            return <Empty />;
        }
        const nodeKey = groupId;
        const type0path = typeof selectGroup === 'string' ? selectGroup : null;
        return (
            <div style={{ width: '100%' }}>
                <Grid cols={{ xs: 1, sm: 2, md: 3, lg: 4, xl: 5, xxl: 6 }} colGap={12} rowGap={16} >
                    {list.map((item, index) => (
                        ((!item.hide) || (item.hide && showItem)) &&
                        <GridItem key={item.id} className='demo-item'>
                            <TagItem tag={item}
                                no={pageId}
                                groupId={groupId}
                                searching={searching}
                                editTag={onEditTag}
                                select={multiSelect}//显示复选框
                                //该书签是否被选中
                                selected={Array.isArray(selectedMapRef.current[nodeKey]) ? selectedMapRef.current[nodeKey].includes(String(item.id)) : false}
                                //选中状态变化时更新selectedMap
                                onSelectChange={(id, checked) => {
                                    // console.log('sssssssssssss onSelectChange', id, checked, nodeKey, selectedMap[nodeKey]);
                                    const prevArr = Array.isArray(selectedMapRef.current[nodeKey]) ? [...selectedMapRef.current[nodeKey]] : [];
                                    const sid = String(id);
                                    const idx = prevArr.indexOf(sid);
                                    if (checked && idx === -1) prevArr.push(sid);
                                    else if (!checked && idx !== -1) {
                                        prevArr.splice(idx, 1);
                                        // console.log('sssssssssssss onSelectChange 取消选中', id, checked, nodeKey, prevArr, idx);
                                    };
                                    onNodeSelectionChange(nodeKey, prevArr, type0path);//适用于dataType==0
                                }}
                                onDeleteSuccess={handleDeleteSuccess}
                                loading={loading}
                            // path={type0path}
                            // selectGroup={dataType == 0 ? (typeof selectGroup === 'string' ? selectGroup.split(',') : []) : item.path}
                            // selectGroup={item.path}
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


    const removeSearchResultDataType2 = async () => {
        // 删除书签，更新所有子分组的书签数据（如果数据为空则将该子分组剔除），如果是全局搜索隐藏该card，否则切换到搜索结果Tab
        // 逻辑同搜索模式下删除大分组 processRemoveSubGroup2
        // 收集所有该子分组当前搜索结果中的书签 id，批量删除一次
        const bookmarkIds = (Array.isArray(data.searchResult) ? data.searchResult.map(b => b && b.id).filter(Boolean) : []);
        if (bookmarkIds.length > 0) {
            // const res = true;//删除书签数组
            const res = await removeWebTags(bookmarkIds);//删除书签数组

            const toRemoveTags = [];
            for (const bookmark of data.searchResult) {
                const tags = bookmark.tags;
                if (Array.isArray(tags) && tags.length > 0) {
                    for (const t of tags) toRemoveTags.push({ tag: t, add: false, id: bookmark.id });
                }
            }

            if (res) {//删除书签成功

                await processUpdatePageBookmarksNum(pageId, -1 * bookmarkIds.length);

                if (toRemoveTags.length > 0) dispatch(updatePageBookmarkTags(toRemoveTags));

                const newChildren = data.children.reduce((acc, ch) => {
                    if (ch.searchResult && ch.searchResult.length > 0) {//有搜索结果
                        const currentBookmarks = Array.isArray(ch.bookmarks) ? ch.bookmarks : [];
                        const newBookmarks = currentBookmarks.filter(b => !bookmarkIds.includes(b.id));//删除搜索结果后的剩余书签数组
                        // 仅当 newBookmarks 非空时保留该子元素
                        if (newBookmarks.length > 0) {
                            acc.push({ ...ch, bookmarks: newBookmarks, bookmarksNum: newBookmarks.length, searchResult: [], totalMatchCount: 0 });
                        }
                    } else {//无搜索结果，不受影响，仍放回数组
                        acc.push(ch);
                    }
                    return acc;
                }, []);
                if (data.bookmarksNum == bookmarkIds.length) {//当前分组的全部书签被删除
                    removeCard(data.id);
                }
                if (currentSearch) {
                    setActiveMap({ [data.id]: searchTabKey });
                } else {//全局搜索下
                    setCardShow(false);//隐藏整个Card
                    dispatch(updateSearchState({ searchResultNum: bookmarkIds.length * -1 }));
                    if (data.children.length > 0) {//为
                        setActiveMap({ [data.id]: data.children[0].id });
                    }
                }

                const newData = { ...data, children: newChildren, totalMatchCount: 0, searchResult: [] };
                setData(newData);

                /*  if (newChildren.length == 0) {//已无子分组和书签数据 渲染时会判断不再展示Card
                     setCardShow(false);//如果没有子分组了，隐藏整个Card
                 } */

                dispatch(fetchBookmarksPageDatas([0, 1, 2]));//删除了书签，同步数据
                return true;
            }
        }
        return false;
    }

    const removeSearchResultDataType1 = async () => {
        const bookmarkIds = (Array.isArray(data.searchResult) ? data.searchResult.map(b => b && b.id).filter(Boolean) : []);
        if (bookmarkIds.length > 0) {
            const res = await removeWebTags(bookmarkIds);//删除书签数组
            // const res = true;//删除书签数组

            const toRemoveTags = [];
            for (const bookmark of data.searchResult) {
                const tags = bookmark.tags;
                if (Array.isArray(tags) && tags.length > 0) {
                    for (const t of tags) toRemoveTags.push({ tag: t, add: false, id: bookmark.id });
                }
            }

            if (res) {//删除书签成功
                await processUpdatePageBookmarksNum(pageId, -1 * bookmarkIds.length);
                const newBookmarks = data.bookmarks.filter(b => !bookmarkIds.includes(b.id));//删除搜索结果后的剩余书签数组)
                setData({ ...data, bookmarks: newBookmarks, searchResult: [], totalMatchCount: 0 });
                if (currentSearch) {
                    // setActiveMap({ [data.id]: searchTabKey });
                } else {//全局搜索下
                    setCardShow(false);//隐藏整个Card
                    dispatch(updateSearchState({ searchResultNum: bookmarkIds.length * -1 }));
                }

                if (data.bookmarks.length == bookmarkIds.length) {//当前分组的全部书签被删除
                    removeCard(data.id);
                }

                if (toRemoveTags.length > 0) dispatch(updatePageBookmarkTags(toRemoveTags));
                dispatch(fetchBookmarksPageDatas([0, 1, 2]));//删除了书签，同步数据
                return true;
            }
        }
        return false;
    }


    const processSearchTabSelectedMove = (bookmarks: WebTag[]) => {
        setMoveFormVisible(true);
    }

    const removeSearchResultDataType0 = async () => {
        const bookmarkIds = (Array.isArray(data.searchResult) ? data.searchResult.map(b => b && b.id).filter(Boolean) : []);
        if (bookmarkIds.length > 0) {
            // const bookmarks = await getBookmarksByIds(bookmarkIds);
            const toRemoveTags = [];
            for (const bookmark of data.searchResult) {
                const tags = bookmark.tags;
                if (Array.isArray(tags) && tags.length > 0) {
                    for (const t of tags) toRemoveTags.push({ tag: t, add: false, id: bookmark.id });
                }
            }
            const res = await removeWebTags(bookmarkIds);//只删除书签 不删除分组

            // const res = true;//删除书签数组
            if (res) {//删除书签成功

                await processUpdatePageBookmarksNum(pageId, -1 * bookmarkIds.length);

                getBookmarksGroupById(data.id).then((resultData) => {
                    setData(resultData.groupData);
                    if (currentSearch) {
                        setActiveMap({ [data.id]: searchTabKey });
                    } else {
                        setCardShow(false);
                        initActiveMap(data.id);
                        //如果全部书签被删除
                        dispatch(updateSearchState({ searchResultNum: bookmarkIds.length * -1 }));
                    }
                });
                if (toRemoveTags.length > 0) dispatch(updatePageBookmarkTags(toRemoveTags));

                return true;
            }
        }
        return false;
    }




    // multiSelect 按分组 id 存储，确保在 tab 的菜单中切换某个子分组时，影响的是该子分组对应的标签集合
    const [multiSelectMap, setMultiSelectMap] = useState<Record<string, boolean>>({});

    // selectedMap: 每个 nodeId 下被选中的 tag id 列表（字符串形式）
    const [selectedMap, setSelectedMap] = useState<Record<string, string[]>>({});

    // effective mode: 哪些分组的书签列表应该显示复选框（由上级传播或自身触发）
    const [multiSelectModeMap, setMultiSelectModeMap] = useState<Record<string, boolean>>({});

    const selectedMapRef = useRef<Record<string, string[]>>({});
    useEffect(() => { selectedMapRef.current = selectedMap; }, [selectedMap]);

    // 汇总指定节点及其子孙在 selectedMap 中的已选书签 id（去重）
    const aggregateSelectedFromDescendants = (rootId: string) => {
        try {
            const rootNode = findNodeById(data, rootId);
            if (!rootNode) return [];
            const descendants = collectDescendantNodes(rootNode); // 包含自身
            const selMap = selectedMapRef.current || {};
            const aggregated: any[] = [];
            descendants.forEach((n: any) => {
                const s = selMap[n.id];
                if (Array.isArray(s) && s.length > 0) aggregated.push(...s);
            });
            return Array.from(new Set(aggregated));
        } catch (e) {
            return [];
        }
    };

    // 通用递归渲染器 scaffold：支持任意深度的分组渲染
    // 后续步骤将逐步把 Tabs 渲染迁移到此函数，并引入按层 activeMap 与懒渲染策略。
    // function RenderNode(node: any, pathKey?: string, level: number = 0) {
    function RenderNode(node: any, pathKey?: string, level: number = 0, showCard?: boolean) {

        // 计算当前节点是否处于多选“显示复选框”模式（优先使用 modeMap）
        const multiSelect = !!multiSelectModeMap[node.id] || !!multiSelectMap[node.id];

        /*  const onClickSearchMenuItem = async (key: string, event) => {
             if (key == '1') {//删除搜索结果的所有书签
                 if (multiSelectMap[searchTabKey]) {//搜索结果多选模式下删除选中书签
                     const ids = Array.isArray(selectedMapRef.current[searchTabKey]) ? selectedMapRef.current[searchTabKey] : [];
                     if (ids.length > 0) {
                         // console.log('要删除的书签id', ids);
                         const names = node.searchResult.filter(b => ids.includes(b.id)).map(b => b.originalName || b.name);
                         let result = '';
                         for (let i = 0; i < names.length; i++) {
                             const next = result ? result + '，' + names[i] : names[i];
                             if (next.length > 100) {
                                 result += '...'; break;
                             }
                             result = next;
                         }
                         const success = removeConfirm(ids, result, true, '', '选中的' + ids.length + '个书签', deleteSelectedBookmarks, searchTabKey);//ok
                     }
                 } else {
                     removeConfirm(node.id, node.name, true,
                         '点击确定将删除该分组的书签搜索结果',
                         '分组',
                         dataType == 0 ? removeSearchResultDataType0 : (dataType == 1 ? removeSearchResultDataType1 : removeSearchResultDataType2),
                         null,
                         '搜索结果',
                     );//ok
                 }
             } else if (key == '2') {//打开搜索结果的所有书签
                 const urls = node.searchResult.map(b => (b && b.url) || null);
                 if (urls.length > 0) {
                     urls.forEach((url, index) => {
                         window.open(url, '_blank');
                     });
                 }
             } else if (key == '4') {//点击了多选
                 // 基于有效的多选状态切换（考虑 multiSelectModeMap 与 multiSelectMap）
                 const currentEffective = !!multiSelectModeMap[searchTabKey] || !!multiSelectMap[searchTabKey];
                 const newVal = !currentEffective;
                 const nextUserMap = { ...multiSelectMap, [searchTabKey]: newVal };
                 setMultiSelectMap(nextUserMap);
                 if (newVal) enableModeForSubtree(searchTabKey);
                 else disableModeForSubtreeForce(searchTabKey);
             } else if (key == '5') {//打开 多选模式
                 const ids = Array.isArray(selectedMapRef.current[searchTabKey]) ? selectedMapRef.current[searchTabKey] : [];
                 if (ids.length > 0) {
                     let tags = [];
                     node.searchResult.filter((b) => ids.includes(b.id)).forEach((b) => tags.push(b));
                     openUrls(tags);
                 }
             } else if (key == '3') {//移动 多选模式
                 const ids = Array.isArray(selectedMapRef.current[searchTabKey]) ? selectedMapRef.current[searchTabKey] : [];
                 if (ids.length > 0) {
                     // setMoveSelectGroup(data);
                     const bookmarks = getBookmarksByIds(ids);
                     console.log('sssssssssssssssss 要移动的书签id', ids, bookmarks);
                 }
             }
         } */

        function tabMoreMenus(subGroup) {
            // 创建自定义事件并分发
            // const bookmarksAndChildren = !!subGroup.list;
            const json = JSON.stringify({ id: subGroup.id, name: subGroup.name, pageId: subGroup.pageId, hide: subGroup.hide, path: subGroup.path, pId: subGroup.pId });

            //删除子分组-按默认分组
            const processRemoveSubGroup0 = async () => {
                try {
                    //A.搜索模式:删除分组的搜索结果
                    if (searching) {
                        //删除该分组的搜索结果，如果被删除书签所在的分组没有其他书签了则将该分组也删除，
                        // 并向上迭代，直至祖先分组或父(祖)分组有书签数据 逻辑同 processRemoveGroup00
                        const removeBookmarks = subGroup.searchResult;
                        const response = await removeWebTagsAndGroups(removeBookmarks, false);
                        const toRemoveTags = [];
                        // const response = true;
                        for (const bookmark of removeBookmarks) {
                            const tags = bookmark.tags;
                            if (Array.isArray(tags) && tags.length > 0) {
                                for (const t of tags) toRemoveTags.push({ tag: t, add: false, id: bookmark.id });
                            }
                        }

                        if (response.success) {
                            await processUpdatePageBookmarksNum(pageId, -1 * removeBookmarks.length);
                            const resultData = await getBookmarksGroupById(cardData.id);

                            if (resultData) {//获取最新的分组数据
                                const newSearchResult = searchDataAggregated(searchInput.trim(), resultData.groupData);
                                // console.log('----------------- processRemoveSubGroup0 resultData removeBookmarks', removeBookmarks);
                                setData(newSearchResult);
                                //A，如果被删除当前分组的搜索结果数==全部搜索结果个数，即全部搜索结果变为0？--因为只有当前被删除的分组才有搜索结果
                                //a.全局搜索 隐藏 b.局部搜索 切换到SearchTab
                                if (newSearchResult.searchResult.length == 0) {
                                    if (currentSearch) {
                                        setActiveMap({ [cardData.id]: searchTabKey });
                                    } else {
                                        setCardShow(false);
                                    }
                                } else {//搜索模式 删除分组的搜索结果后，仍有剩余搜索结果
                                    //否则，切换到被删除数据的兄弟tab,否则如果在第一层tab则切换到搜索结果tab
                                    const path = subGroup.path.split(',');
                                    // console.log('1111111111111111111 processRemoveSubGroup0 搜索模式删除搜索结果 response 剩余数据', response, subGroup, path);
                                    if (path.length >= 2) {//对应的分组从第二级开始
                                        // const pId = path[1];//适用于二级分组及以下的书签,path[0]是祖分组id(cardName)，path[1]是第一层tabs的active项
                                        const toFind = newSearchResult.children.filter((item: any) => item.id == path[1]);
                                        if (toFind.length > 0) {
                                            const item = toFind[0];
                                            if (item.totalMatchCount == 0) setActiveMap({ [path[0]]: searchTabKey });//该二级分组没有搜索结果
                                            else if (path.length >= 3) {//该tab（其祖分组）有搜索结果，继续路径匹配直到最底层
                                                // 优先沿 path 深度匹配；若未命中则在同层找第一个有结果的兄弟并递归到底层
                                                // console.log('22222222222222222222 processRemoveSubGroup0  优先沿 path 深度匹配；path.length >= 3',);
                                                const matchedPath = traverseForMatch(item, path, 2);//从path[2]第二个元素开始匹配，第2层tab开始
                                                if (matchedPath) setActiveMap(buildActiveMap(matchedPath));
                                                else setActiveMap({ [path[0]]: searchTabKey });
                                            }
                                        } else setActiveMap({ [path[0]]: searchTabKey });
                                    }
                                    // 祖分组（path.length == 1）只有存在书签数据（subGroup.copy）和子分组才会出现在子分组的tab（第一层tabs）
                                    /* else if (path.length == 1 && subGroup.copy) { // 删除的是大分组的复制分组,在第一层tabs
                                        setActiveMap({ [data.id]: searchTabKey });
                                    } */
                                }
                                dispatch(fetchBookmarksPageDatas([0, 1, 2]));//删除了书签+分组

                            } else {//整个大分组没有数据了（因为所有书签被清空导致分组也被删除）
                                // getGroupData();
                                removeCard(data.id);
                                dispatch(fetchBookmarksPageDatas([1, 2]));//删除了书签+分组
                            }
                            // return true;
                            if (toRemoveTags.length > 0) dispatch(updatePageBookmarkTags(toRemoveTags));
                            if (!currentSearch) dispatch(updateSearchState({ searchResultNum: removeBookmarks.length * -1 }));
                            if (response.deletedGroups > 0) await dispatch(fetchBookmarksPageDataGoups(pageId));
                            return true;
                        }
                        return false;
                    }

                    else if (currentFilter) {//标签筛选模式
                        //删除该分组的搜索结果，如果被删除书签所在的分组没有其他书签了则将该分组也删除，
                        // 并向上迭代，直至祖先分组或父(祖)分组有书签数据 逻辑同 processRemoveGroup00
                        const removeBookmarks = subGroup.searchResult;
                        const response = await removeWebTagsAndGroups(removeBookmarks, false);//不向上迭代删除父分组
                        if (response.success) {
                            return { success: true, removeBookmarks, response };
                        } else {
                            return { success: false };
                        }
                    }
                    //B.非搜索/标签筛选模式  
                    else {
                        const copyGroup: boolean = subGroup.copy;
                        const response = copyGroup ? await removeCopyGroupById(subGroup.id.replace('_copy', ''))//仅删除该(复制)分组的书签
                            : await removeGroupById(subGroup.id);//迭代删除分组和书签
                        // const response = { success: false, deletedBookmarks: 1 };
                        if (response.success) {//删除成功

                            getBookmarksGroupById(cardData.id).then((resultData) => {
                                if (resultData) {
                                    // console.log('aaaaaaaaaaaaaaaaaaaa processRemoveSubGroup0 resultData', resultData);
                                    setData(resultData.groupData);
                                }
                                //  else setCardShow(false);//正常来说不会走到这里，因为没有删除大分组
                            });

                            //有书签被删除才需要同步按时间/域名分组数据
                            if (response.deletedBookmarks > 0) {
                                dispatch(fetchBookmarksPageDatas([0, 1, 2]));//删除了书签+分组
                                await processUpdatePageBookmarksNum(pageId, -1 * response.deletedBookmarks);
                            }
                            else dispatch(fetchBookmarksPageDatas([0]));//仅删除了分组

                            if (response.toRemoveTags && response.toRemoveTags.length > 0) dispatch(updatePageBookmarkTags(response.toRemoveTags));

                            if (copyGroup) {//被删除的是复制分组(id,path属性都是原分组的值)，它本身不会有子分组的了
                                const activeMap = buildActiveMap(subGroup.path.slice(0, subGroup.path.lastIndexOf(',')));//切换到被删除分组的父分组tab 自动选择剩余子分组
                                setActiveMap(activeMap);
                            } else {
                                //从被删除的子分组，根据其path从其父节点开始,重新计算activeMap激活tabs路径
                                const pId = subGroup.pId;
                                const str = subGroup.path;
                                const lastIndex = str.lastIndexOf(',');
                                if (lastIndex > -1) {//说明被删除的分组不是第一层分组，才需要切换到父分组tab
                                    const part1 = str.substring(0, lastIndex);//part1:从root到父节点位置的路径path
                                    const lastChild = await getThroughChild(pId, part1);//从该分组的父分组中直至找到最后一个子分组
                                    const activeMap = buildActiveMap(lastChild.path);
                                    setActiveMap(activeMap);
                                }
                            }
                            if (!copyGroup) await dispatch(fetchBookmarksPageDataGoups(pageId));
                            return true;//删除完成
                        }
                        return false;
                    }
                } catch (error) {
                    return false;
                }
            }

            //按域名分组-删除子分组 按域名分组
            const processRemoveSubGroup2 = async () => {
                // console.log('222222222222222222222 processRemoveSubGroup2', subGroup);
                if (searching) {//搜索模式：删除搜索结果的书签
                    for (const item of data.children) {
                        if (item.id === subGroup.id) {
                            // 收集所有该子分组当前搜索结果中的书签 id，批量删除一次
                            const bookmarkIds = (Array.isArray(item.searchResult) ? item.searchResult.map(b => b && b.id).filter(Boolean) : []);
                            const bookmarks = item.searchResult;
                            if (bookmarkIds.length > 0) {

                                const toRemoveTags = [];
                                for (const bookmark of bookmarks) {
                                    const tags = bookmark.tags;
                                    if (Array.isArray(tags) && tags.length > 0) {
                                        for (const t of tags) toRemoveTags.push({ tag: t, add: false, id: bookmark.id });
                                    }
                                }

                                const res = await removeWebTags(bookmarkIds);//删除书签数组
                                if (res) {//删除书签成功
                                    await processUpdatePageBookmarksNum(pageId, -1 * bookmarkIds.length);
                                    if (toRemoveTags.length > 0) dispatch(updatePageBookmarkTags(toRemoveTags));

                                    let leftBookmarksNum = item.bookmarks.length;//剩余书签数量
                                    const newChildren = data.children.reduce((acc, ch) => {
                                        if (ch.id === subGroup.id) {
                                            const currentBookmarks = Array.isArray(item.bookmarks) ? item.bookmarks : [];
                                            const newBookmarks = currentBookmarks.filter(b => !bookmarkIds.includes(b.id));//剩余书签数组
                                            leftBookmarksNum = newBookmarks.length;
                                            // 仅当 newBookmarks 非空时保留该子元素
                                            if (newBookmarks.length > 0) {
                                                // const currentSearchResult = Array.isArray(item.searchResult) ? item.searchResult : [];
                                                // const newSearchResult = currentSearchResult.filter(b => !bookmarkIds.includes(b.id));
                                                // const totalMatchCount = Math.max(0, (item.totalMatchCount || 0) - bookmarkIds.length);
                                                acc.push({ ...ch, bookmarks: newBookmarks, bookmarksNum: newBookmarks.length, searchResult: [], totalMatchCount: 0 });
                                            }
                                        } else {
                                            acc.push(ch);
                                        }
                                        return acc;
                                    }, []);

                                    const newSearchResult = data.searchResult.filter(b => !bookmarkIds.includes(b.id));
                                    const newData = { ...data, children: newChildren, totalMatchCount: newSearchResult.length, searchResult: newSearchResult };
                                    setData(newData);

                                    setActiveMap({ [cardData.id]: searchTabKey });
                                    /*  if (currentSearch) {
                                     } else {//全局搜索下
                                         if (newSearchResult.length == 0) {//全部中没有剩余的搜索结果了
                                             // setCardShow(false);//如果没有子分组了，隐藏整个Card
                                             removeCard(data.id);
                                         }
                                         dispatch(updateSearchState({ searchResultNum: bookmarkIds.length * -1 }));
                                     } */
                                    if (leftBookmarksNum == 0) {//当前分组没有剩余书签了
                                        if (data.bookmarksNum == bookmarkIds.length) {//如果当前分组的全部书签被删除了
                                            // （即使有子分组，但当前分组没有书签了，也隐藏该分组tab）
                                            removeCard(data.id);
                                        } else {
                                            removeCard(data.id + ',' + subGroup.id);
                                            setCardShow(false);
                                        }
                                    }
                                    if (currentSearch) {
                                    } else {//全局搜索下
                                        dispatch(updateSearchState({ searchResultNum: bookmarkIds.length * -1 }));
                                    }
                                    dispatch(fetchBookmarksPageDatas([0, 1, 2]));//删除了书签
                                }
                                return true;
                            }
                        }
                    }
                    return false;
                } else {//非搜索模式
                    try {
                        for (const item of data.children) {
                            if (item.id === subGroup.id) {
                                // 收集所有书签 id，批量删除一次，避免多次调用
                                const bookmarkIds = item.bookmarks.map(b => b && b.id).filter(Boolean);
                                const bookmarks = item.bookmarks;
                                if (bookmarkIds.length > 0) {

                                    const toRemoveTags = [];
                                    for (const bookmark of bookmarks) {
                                        const tags = bookmark.tags;
                                        if (Array.isArray(tags) && tags.length > 0) {
                                            for (const t of tags) toRemoveTags.push({ tag: t, add: false, id: bookmark.id });
                                        }
                                    }

                                    const res = await removeWebTags(bookmarkIds);

                                    if (res) {//删除书签成功
                                        await processUpdatePageBookmarksNum(pageId, -1 * bookmarkIds.length);

                                        if (toRemoveTags.length > 0) dispatch(updatePageBookmarkTags(toRemoveTags));

                                        const newChildren = data.children.filter(child => child.id !== subGroup.id);//过滤整个分组
                                        setData(prevData => ({ ...prevData, children: newChildren }));
                                        removeCard(data.id + ',' + subGroup.id);//
                                        if (newChildren.length == 0) {
                                            removeCard(data.id);
                                            // setCardShow(false);//如果没有子分组了，隐藏整个Card
                                        } else {
                                            removeCard(data.id + ',' + subGroup.id);//仅删除子节点
                                            setActiveMap({ [cardData.id]: newChildren[0]?.id || null });
                                        }
                                        dispatch(fetchBookmarksPageDatas([0, 1, 2]));//删除了书签
                                    }
                                    return true;
                                }
                            }
                        }
                        return false;
                    } catch (error) {
                        return false;
                    }
                }
            }


            // 2级分组菜单
            const onClickMenuItem = async (key: string, event) => {
                const index = key.indexOf('-');
                if (index !== -1) {
                    const [part1, ...rest] = key.split('-');
                    // 2. 使用 join 将 rest 数组重新组合成一个字符串
                    //    ["123", "profile"].join('-') 会变成 "123-profile"
                    const part2 = rest.join('-');
                    const subGroup1 = JSON.parse(part2);
                    key = part1;

                    let pathArr: string[] = subGroup1.path.split(",");
                    if (pathArr[pathArr.length - 1].endsWith('_copy')) {
                        pathArr = [...pathArr.slice(0, pathArr.length - 1)];//去掉最后一个（复制子分组）
                    };
                    // console.log('111111111111111 点击菜单 key', key, subGroup);
                    if (key === '0') {//添加Tag
                        setAddTagVisible(true);
                        setEditTag(null);
                        // console.log('111111111111111 添加Tag subGroup', subGroup);
                        // setTagSelectGroup(cardData.id === subGroup.id ? [subGroup.id] : [cardData.id, subGroup.id]);
                        setTagSelectGroup(dataType == 0 ? pathArr : null);
                        if (dataType == 2) {
                            data.children.some((item) => {
                                if (item.id === subGroup.id) {//非隐藏的
                                    // console.log('111111111111111 添加Tag subGroup', item.bookmarks[0]);
                                    const tag = {
                                        // name: item.bookmarks[0].name,
                                        id: null,
                                        gId1: subGroup.id,
                                        icon: item.bookmarks[0].icon,
                                        url: (() => {
                                            try {
                                                const host = new URL(item.bookmarks[0].url).hostname || '';
                                                return host.endsWith('/') ? host : host + '/';
                                            } catch (e) {
                                                const raw = item.bookmarks[0].url || '';
                                                const m = raw.match(/^(?:https?:\/\/)?(?:www\.)?([^\/]+)/i);
                                                const host = m ? m[1] : raw;
                                                return host.endsWith('/') ? host : host + '/';
                                            }
                                        })(),
                                        pageId: subGroup.pageId,
                                    };
                                    setEditTag(tag);
                                }
                            });
                        }

                    } else if (key === '1') {//编辑Group
                        setTabForm(true);
                        setTabGroup(subGroup.id.endsWith('_copy') ? { ...subGroup, id: subGroup.id.replace('_copy', '') } : subGroup);
                        const parentPath: string[] = pathArr.length > 1 ? pathArr.slice(0, pathArr.length - 1) : null;
                        setSelectGroup(parentPath);//截取parent的path路径

                        if (dataType == 2) {
                            data.children.some((item) => {
                                if (item.id === subGroup.id) {//非隐藏的
                                    // console.log('111111111111111 添加Tag subGroup', item.bookmarks[0]);
                                    const tag = {
                                        gId1: subGroup.id,
                                    };
                                    setEditTag(tag);
                                }
                            });
                        }
                    } else if (key === '2') {//删除子分组Group 或分组(及其子分组内)的书签(多选模式) 按分组/按域名分组
                        if (multiSelectModeMap[subGroup.id] || multiSelectMap[subGroup.id]) {//删除书签(多选)
                            const ids = Array.isArray(selectedMapRef.current[subGroup.id]) ? selectedMapRef.current[subGroup.id] : [];
                            // console.log('xxxxxxxxxxxxxxxx selectedMapRef', selectedMapRef, selectedMapRef.current[subGroup.id]);
                            if (ids.length > 0) {
                                const bookmarks = await getBookmarksByIds(ids);
                                // console.log('xxxxxxxxxxxxxxxxxxx 111 ids  bookmarks', ids, bookmarks);
                                if (!bookmarks || bookmarks.length == 0) return;
                                const names = bookmarks.map(b => b.name);
                                //被删除的书签涉及的分组id列表 
                                const gIds = [...new Set(bookmarks.map(b => b.gId))];// 使用 Set 去重，然后再转回数组

                                let result = names.length > 0 ? names[0] : '';
                                for (let i = 1; i < names.length; i++) {
                                    const next = result ? result + '，' + names[i] : names[i];
                                    if (next.length > 100) {//字数超过，停止遍历
                                        result += '...'; break;
                                    }
                                    result = next;//下一循环
                                }

                                const toRemoveTags = [];
                                for (const bookmark of bookmarks) {
                                    const tags = bookmark.tags;
                                    if (Array.isArray(tags) && tags.length > 0) {
                                        for (const t of tags) toRemoveTags.push({ tag: t, add: false, id: bookmark.id });
                                    }
                                }

                                let groupPath = subGroup.path;//默认要切换的分组路径

                                // console.log('xxxxxxxxxxxxxxxxxx 删除书签(多选) activeMap', activeMap);
                                //A.非搜索模式：如果删除的书签涉及多个分组(有可能是复制子分组，删除仅剩的书签后该子分组会消失，需要指定设置切换activeTab的gruopPath)
                                if (activeMap) {
                                    const keys = Object.keys(activeMap);
                                    const longestKey = keys.length ? keys.reduce((a, b) => (a.length > b.length ? a : b)) : undefined;
                                    if (longestKey) {
                                        if (activeMap[longestKey].endsWith('_copy')) { //如果当前激活的tab是复制分组tab，
                                            const copyGroupId = activeMap[longestKey];
                                            const copyOriGId = copyGroupId.split('_copy')[0];
                                            if (gIds.includes(copyOriGId)) { // 且被删除的书签id列表包含了该复制分组内的书签
                                                const node = findNodeById(data, copyGroupId);//找到该复制分组子节点
                                                if (node.bookmarks.length == 1) {//如果被删除的书签之一是该复制分组（最后一层）内仅剩的一个书签
                                                    groupPath = node.path.slice(0, node.path.lastIndexOf(","));//切换到该复制分组的父分组tab,再下层的activeTab不作设置，自动取第1个child
                                                }
                                            }
                                            else {//activeTab不变
                                                groupPath = longestKey.replaceAll('-', ',') + ',' + activeMap[longestKey];
                                            }
                                        }
                                    }
                                }
                                //执行成功：返回newData；失败/取消：返回false
                                console.log('xxxxxxxxxxxxxxxxxx 删除书签(多选) subGroup groupPath', subGroup, groupPath);
                                const newData = await removeConfirm(ids, result, true, '', '选中的' + ids.length + '个书签', deleteSelectedBookmarks, groupPath);//ok
                                // 清空 subGroup 及其子孙在 selectedMap 中的已选中书签数据（置为空数组）...
                                if (newData) {//删除成功后的newData
                                    // false：本身节点在selectMap中的选中数据不清除， 留给onNodeSelectionChange进行判断和更新该节点的selectMap数据
                                    updateAncestorAndDescendantNodesMultiSelect(newData, subGroup, false);//更新子分组的多选状态 
                                    onNodeSelectionChange(subGroup.id, [], subGroup.path);//将选择状态中的父分组的已选中书签变为空[]
                                    setData(newData);
                                    if (toRemoveTags.length > 0) {
                                        // console.log('xxxxxxxxxxxxxxxxxx 删除书签(多选)', toRemoveTags);
                                        dispatch(updatePageBookmarkTags(toRemoveTags));
                                    }
                                }
                                //B.搜索模式：todo

                            }
                        } else { //删除分组(默认) ：分组及其书签或分组的搜索/筛选结果

                            /*   removeConfirm(subGroup.id, subGroup.name, searching ? false : true,
                                  searching ? '点击确定将删除该分组的书签搜索结果' : '点击确定将删除该分组及其所有书签',
                                  searching ? '搜索结果' : '分组',
                                  dataType == 0 ? processRemoveSubGroup0 : processRemoveSubGroup2);//ok */

                            const result = await removeConfirm(subGroup.id, subGroup.name, searching || currentFilter ? false : true,
                                searching ? '点击确定将删除该分组的书签搜索结果' : (currentFilter ? '点击确定将删除该分组的筛选结果' : '点击确定将删除该分组及其所有书签'),
                                searching ? '搜索结果' : (currentFilter ? '筛选结果' : '分组'),
                                dataType == 0 ? processRemoveSubGroup0 : processRemoveSubGroup2);//ok


                            if (dataType == 0 && currentFilter && result && result.success) {
                                const removeBookmarks = result.removeBookmarks;
                                const toRemoveTags = [];
                                for (const bookmark of removeBookmarks) {
                                    const tags = bookmark.tags;
                                    if (Array.isArray(tags) && tags.length > 0) {
                                        for (const t of tags) toRemoveTags.push({ tag: t, add: false, id: bookmark.id });
                                    }
                                }
                                //如果被删除的书签包含当前筛选标签，则需要重新获取数据进行筛选，否则不需要了
                                const resultData = await getBookmarksGroupById(cardData.id);
                                processUpdatePageBookmarksNum(pageId, -1 * removeBookmarks.length);//更新书签总数

                                if (toRemoveTags.length > 0) {
                                    dispatch(updatePageBookmarkTags(toRemoveTags));
                                    // dispatch(fetchBookmarksPageDatas([0, 1, 2]));//删除了书签+分组,如果导航栏选中标签变少，需要重新加载最新数据进行筛选
                                }

                                if (resultData) {//获取最新的分组数据
                                    const newGroupData = resultData.groupData;
                                    // console.log('22222222222222222 after removeGroup newGroupData', newGroupData);
                                    // 在这里标记，避免随后 selectedTags 的 useEffect 覆盖刚设置的新数据
                                    skipSelectedTagsEffectRef.current = true;
                                    setData(newGroupData);
                                    setFilterTags(newGroupData.tagsList);
                                    // const result =
                                    //重新执行筛选
                                    const ids = removeBookmarks.map(bm => bm.id);
                                    let nextSelectedTags = latestSelectedTagsRef.current;
                                    console.log('-----------latestSelectedTags', latestSelectedTagsRef.current);
                                    if (toRemoveTags.length > 0 && nextSelectedTags.length > 0) {
                                        const ts = toRemoveTags.map(t => t.tag);
                                        // 基于被删除书签的 ids，局部计算新的 selectedTags（不写回 redux）
                                        // 如果 selectedTags 中某项的 key 在 ts 中，则从该项的 bookmarks 中移除 ids
                                        // 若移除后 bookmarks 为空，则从结果中移除该 selectedTag
                                        nextSelectedTags = nextSelectedTags.map(a => {
                                            if (a && a.key && ts.includes(a.key)) {
                                                const orig = Array.isArray(a.bookmarks) ? a.bookmarks : [];
                                                const filtered = orig.filter(bid => !ids.includes(bid));
                                                return { ...a, bookmarks: filtered };
                                            }
                                            return a;
                                        }).filter(a => !(Array.isArray(a.bookmarks) && a.bookmarks.length === 0));
                                        // console.log('-----------nextSelectedTags after removals removeBookmarks', nextSelectedTags, removeBookmarks);
                                        // console.log('-----------toRemoveTags', toRemoveTags);
                                        latestSelectedTagsRef.current = nextSelectedTags;//更新最新的 selectedTags 数据，供后续使用
                                    }
                                    //now0
                                    //主动触发筛选，不等待selectedTags的useEffect了，用来更新card的数据
                                    //至于其他cards，会响应selectedTags的useEffect触发更新
                                    onNavTagsFilterChange(nextSelectedTags, newGroupData.tagsList, newGroupData, searchInput);
                                } else {//整个大分组没有数据了（因为所有书签被清空导致分组也被删除）
                                    removeCard(data.id);
                                }
                                if (result.response.deletedGroups > 0) dispatch(fetchBookmarksPageDataGoups(pageId));//删除了分组才需要同步分组数据
                            }
                        }

                    } else if (key === '3') {//打开全部书签(包括子分组的书签)
                        //test
                        const nodeToClear = findNodeById(data, subGroup.id);
                        const descendantNodes = collectDescendantNodes(nodeToClear);//包括自身分组
                        // 汇总 descendantNodes 中所有元素的 bookmarks 数组
                        const tags = descendantNodes.reduce((acc: any[], n: any) => {
                            if (Array.isArray(n.bookmarks) && n.bookmarks.length > 0) acc.push(...n.bookmarks);
                            return acc;
                        }, []);
                        openUrls(tags);

                    } else if (key === '5') {//打开选中书签
                        const ids = Array.isArray(selectedMapRef.current[subGroup.id]) ? selectedMapRef.current[subGroup.id] : [];
                        if (ids.length > 0) {
                            getBookmarksByIds(ids).then(bookmarks => {
                                openUrls(bookmarks);
                            });
                        }
                    }
                    else if (key === '4') {//多选/取消的切换
                        // 切换对应 subGroup 的多选状态（存储到 multiSelectMap）
                        // multiSelectModeMap：由祖先调用 enableModeForSubtree 在子孙上设置的“生效模式”（表示列表应显示复选框，祖先传播的结果）。
                        // multiSelectMap：用户在某个 tab 上显式点击“多选 / 取消”产生的用户意图（true / false）。
                        const currentEffectiveSub = !!multiSelectModeMap[subGroup.id] || !!multiSelectMap[subGroup.id];//计算得出当前tab的有效多选状态
                        const newVal = !currentEffectiveSub;//取反
                        const nextUserMap = { ...multiSelectMap, [subGroup.id]: newVal };
                        setMultiSelectMap(nextUserMap);
                        if (newVal) {//如果切换后是多选状态，则启用以该分组为根的子树的多选模式（显示复选框，启用相关功能）
                            enableModeForSubtree(subGroup.id);
                            // 将子孙节点已选中的书签汇总到该节点
                            // 汇总子孙已选并写回当前节点的 selectedMap
                            const unique = aggregateSelectedFromDescendants(subGroup.id);
                            if (unique && unique.length > 0) {
                                setSelectedMap(prev => ({ ...prev, [subGroup.id]: unique }));
                            }
                        } else {//如果切换后不是多选状态，则强制禁用以该分组为根的子树的多选模式（隐藏复选框，禁用相关功能，并清空相关状态）
                            disableModeForSubtreeForce(subGroup.id);
                        }
                    } else if (key === '6') {//移动选中书签(多选模式)
                        const ids = Array.isArray(selectedMapRef.current[subGroup.id]) ? selectedMapRef.current[subGroup.id] : [];
                        // console.log('666666666666666666ssss 要移动的书签ids', ids, subGroup);
                        if (ids.length > 0) {
                            setMoveFormVisible(true);
                            setMoveSelectGroup(subGroup);
                            const bookamrks = await getBookmarksByIds(ids);
                            setBookmarksToMove(bookamrks);
                        }
                    }
                };
            }

            // 当祖级开启多选时，子孙的“列表复选框显示”由 multiSelectModeMap 控制。
            // multiSelectEffective 表示当前分组是否处于多选模式（由祖先传播或自身触发）
            const multiSelectEffective: boolean = !!multiSelectModeMap[subGroup.id] || !!multiSelectMap[subGroup.id];
            // const multiSelectEnabled: boolean = !!multiSelectMap[subGroup.id]; // 当前 tab 用户显式开启状态
            const multiSelectDisabled: boolean = !multiSelectEffective;

            return (
                <Menu onClickMenuItem={onClickMenuItem} mode='pop'>
                    {
                        enable && dropdownVisible && <>
                            {/* 排除有复制子分组的分组 未被多选或有书签数据(原分组非复制子分组)!multiSelectMap[subGroup.id] || bookmarksAndChildren */}
                            {multiSelectDisabled && <Menu.Item key={'0-' + json} >添加</Menu.Item>}
                            {dataType == 0 && multiSelectDisabled && <Menu.Item key={'1-' + json} >编辑</Menu.Item>}

                            {subGroup.bookmarksNum > 0 && multiSelectEffective && (
                                <Menu.Item key={'6-' + json} disabled={getSelectedCountForNode(subGroup) === 0}>
                                    <span style={{ color: 'rgb(var(--arcoblue-6))' }}>移动</span>
                                </Menu.Item>
                            )}

                            {/* 正常/多选模式 删除， 当多选模式下无选中书签时禁用删除按钮 */}
                            <Menu.Item key={'2-' + json}
                                // 当任一祖先或自身处于多选时，删除按钮的禁用基于本节点及其子孙的聚合选中数
                                disabled={multiSelectEffective ? getSelectedCountForNode(subGroup) === 0 : false} >
                                {multiSelectEffective ? <span style={{ color: 'rgb(var(--arcoblue-6))' }}>删除</span> : '删除'}
                            </Menu.Item>

                            {/* 正常模式 打开 全部书签 */}
                            {subGroup.bookmarksNum > 0 && !multiSelectEffective && (
                                <Menu.Item key={'3-' + json}>打开</Menu.Item>
                            )}

                            {/* 多选模式 打开 选中书签为0时禁用按钮 */}
                            {subGroup.bookmarksNum > 0 && multiSelectEffective && (
                                <Menu.Item key={'5-' + json} disabled={getSelectedCountForNode(subGroup) === 0}>
                                    <span style={{ color: 'rgb(var(--arcoblue-6))' }}>打开</span>
                                </Menu.Item>
                            )}

                            {/* 有书签数据 切换多选/取消 */}
                            {subGroup.bookmarksNum > 0 && <Menu.Item key={'4-' + json} >
                                {(multiSelectEffective) ? '取消' : <span style={{ color: 'rgb(var(--arcoblue-6))' }}>多选</span>}
                            </Menu.Item>}
                        </>
                    }
                </Menu >);
        }


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
                                {/* {subGroup.urlList && subGroup.urlList.length > 0 && <Menu.Item key={'3-' + json} >打开</Menu.Item>} */}
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

        const deleteSelectedBookmarks = async (ids, groupPath) => {
            try {
                const ok = await removeWebTags(ids);
                // const ok = true;
                if (ok) {

                    await processUpdatePageBookmarksNum(pageId, -1 * ids.length);

                    let newData;
                    if (dataType === 0) {//按默认分组方式
                        newData = await updateCardData(groupPath === searchTabKey ? null : groupPath);//可能导致搜索结果为空 如果全局搜索模式，则隐藏当前Card，否则
                        // console.log(">>>>>>>>>>>>>>>>>>>>>>>>> 删除子分组Group subGroup 删除书签成功 newData", ids, groupPath, newData);
                    } else if (dataType === 1) {//按时间分组方式
                        // newData = await updateCardData(groupPath === searchTabKey ? null : groupPath);
                        newData = updateCardData1(null, ids);
                    } else if (dataType === 2) {//按域名分组方式
                        newData = await updateCardData22(groupPath, ids);
                    }
                    //如果该分组的书签被删空 取消该tab多选状态（如果有的话）->隐藏全选/反选
                    // if (ids.length == data.searchResult.length) setMultiSelectMap(prev => ({ ...prev, [searchTabKey]: false }));
                    dispatch(fetchBookmarksPageDatas([0, 1, 2]));//切换分组方式时，需要重新加载书签页数据
                    // return { success: true, newData };
                    return newData;
                } else {
                    return null;
                }
            } catch (error) {
                return null;
            }
        }


        const searchTabMoreMenus = (searchResult) => {
            // function searchTabMoreMenus(searchResult) {
            // 2级分组菜单
            const onClickSearchMenuItem = async (key: string, event) => {
                if (key == '1') {//删除搜索结果的选中书签
                    if (multiSelectMap[searchTabKey]) {//搜索结果多选模式下删除选中书签
                        // const ids = Array.isArray(selectedMapRef.current[searchTabKey]) ? selectedMapRef.current[searchTabKey] : [];
                        const ids = Array.isArray(selectedMapRef.current[searchTabKey])
                            ? selectedMapRef.current[searchTabKey]
                            : [];
                        if (ids.length > 0) {
                            // console.log('要删除的书签id', ids);
                            const bookmarks = node.searchResult.filter(b => ids.includes(b.id));
                            const names = bookmarks.filter(b => ids.includes(b.id)).map(b => b.originalName || b.name);
                            let result = '';
                            for (let i = 0; i < names.length; i++) {
                                const next = result ? result + '，' + names[i] : names[i];
                                if (next.length > 100) {
                                    result += '...'; break;
                                }
                                result = next;
                            }

                            const toRemoveTags = [];
                            for (const bookmark of bookmarks) {
                                const tags = bookmark.tags;
                                if (Array.isArray(tags) && tags.length > 0) {
                                    for (const t of tags) toRemoveTags.push({ tag: t, add: false, id: bookmark.id });
                                }
                            }

                            const newData = await removeConfirm(ids, result, true, '', '选中的' + ids.length + '个书签', deleteSelectedBookmarks, searchTabKey);//ok
                            // console.log('ssssssssssssssss 删除搜索结果tab的选中书签', bookmarks, toRemoveTags, newData);
                            if (newData) {
                                if (toRemoveTags.length > 0) dispatch(updatePageBookmarkTags(toRemoveTags));//更新被删除书签的标签数据到redux
                                if (node.searchResult.length == ids.length) {//已删除全部搜索结果
                                    //如果删除后搜索结果中没有剩余书签了，移除整个Card
                                    removeCard(newData.id);
                                }
                            }

                        }
                    } else {//删除搜索结果的所有书签
                        const typeName = false;//先类型后名字
                        removeConfirm(node.id, node.name, typeName,
                            '点击确定将删除该分组的书签搜索结果',
                            '搜索结果',
                            dataType == 0 ? removeSearchResultDataType0 : (dataType == 1 ? removeSearchResultDataType1 : removeSearchResultDataType2),
                        );//ok
                    }
                } else if (key == '2') {//打开搜索结果的所有书签
                    const urls = node.searchResult.map(b => (b && b.url) || null);
                    if (urls.length > 0) {
                        urls.forEach((url, index) => {
                            window.open(url, '_blank');
                        });
                    }
                } else if (key == '4') {//点击了多选
                    const currentEffective2 = !!multiSelectModeMap[searchTabKey] || !!multiSelectMap[searchTabKey];
                    const newVal = !currentEffective2;
                    const nextUserMap = { ...multiSelectMap, [searchTabKey]: newVal };
                    setMultiSelectMap(nextUserMap);
                    if (newVal) enableModeForSubtree(searchTabKey);
                    else disableModeForSubtreeForce(searchTabKey);
                } else if (key == '5') {//打开 多选模式
                    const ids = Array.isArray(selectedMapRef.current[searchTabKey]) ? selectedMapRef.current[searchTabKey] : [];
                    if (ids.length > 0) {
                        let tags = [];
                        node.searchResult.filter((b) => ids.includes(b.id)).forEach((b) => tags.push(b));
                        openUrls(tags);
                    }
                } else if (key == '3') {//移动 多选模式
                    const ids = Array.isArray(selectedMapRef.current[searchTabKey]) ? selectedMapRef.current[searchTabKey] : [];
                    if (ids.length > 0) {
                        setMoveFormVisible(true);
                        const bookmarks: WebTag[] = await getBookmarksByIds(ids);

                        //把搜索结果tab当作一个特殊的分组传进去，移动时可以区分是从搜索结果移动还是从正常分组移动
                        // postResultNum: 当移动完成后搜索结果中剩余的书签数量=原搜索结果数量-被移动的书签数量
                        // 如果移动后搜索结果中没有剩余书签了，需要重置搜索结果tab的多选模式激活状态
                        setMoveSelectGroup({ id: searchTabKey, postResultNum: node.searchResult.length - bookmarks.length });

                        if (dataType === 2) {//当前是搜索结果tab
                            const bookmarkGroups = data.children.filter(item => item.totalMatchCount > 0);
                            bookmarks.forEach((b: any) => {
                                const group = bookmarkGroups.find((item: any) => Array.isArray(item.searchResult)
                                    && item.searchResult.some((sr: any) => sr && String(sr.id) === String(b.id))
                                );
                                if (group && group.id) b.gId1 = group.id;//找到对应的域名子分组id,待移动成功后用于将数据同步到子分组
                            });
                            // console.log('11111111111111111111  dataType > 0 && subGroup.id === searchTabKey bookmarks', bookmarks);
                        }
                        setBookmarksToMove(bookmarks);
                    }
                }
            };

            return <Menu mode='pop' onClickMenuItem={onClickSearchMenuItem}>

                {multiSelectMap[searchTabKey] && (
                    <Menu.Item key={'3'} disabled={!selectedMapRef.current[searchTabKey] || selectedMapRef.current[searchTabKey].length == 0}>
                        <span style={{ color: 'rgb(var(--arcoblue-6))' }}>移动</span>
                    </Menu.Item>
                )}

                <Menu.Item key={'1'}
                    //当前tab(非复制组分组的原分组)开启多选且选中书签个数为0时禁用删除按钮
                    disabled={multiSelectMap[searchTabKey] ? (!selectedMapRef.current[searchTabKey] || selectedMapRef.current[searchTabKey].length == 0) : false} >
                    {multiSelectMap[searchTabKey] ? <span style={{ color: 'rgb(var(--arcoblue-6))' }}>删除</span> : '删除'}
                </Menu.Item>

                {!multiSelectMap[searchTabKey] && (
                    <Menu.Item key={'2'}>打开</Menu.Item>
                )}

                {/* 多选模式 打开 选中书签为0时禁用按钮 */}
                {multiSelectMap[searchTabKey] && (
                    <Menu.Item key={'5'} disabled={!selectedMapRef.current[searchTabKey] || selectedMapRef.current[searchTabKey].length == 0}>
                        <span style={{ color: 'rgb(var(--arcoblue-6))' }}>打开</span>
                    </Menu.Item>
                )}

                {searchResult && searchResult.length > 0 && <Menu.Item key={'4'} >
                    {(multiSelectMap[searchTabKey]) ? '取消' : <span style={{ color: 'rgb(var(--arcoblue-6))' }}>多选</span>}
                </Menu.Item>}
            </Menu>
        }


        const searchTabMore = (searchResult, enter) => {
            // 2级分组菜单
            const onClickSearchMenuItem = async (key: string, event) => {
                if (key == '1') {//删除搜索结果的选中书签
                    if (multiSelectMap[searchTabKey]) {//搜索结果多选模式下删除选中书签
                        // const ids = Array.isArray(selectedMapRef.current[searchTabKey]) ? selectedMapRef.current[searchTabKey] : [];
                        const ids = Array.isArray(selectedMapRef.current[searchTabKey])
                            ? selectedMapRef.current[searchTabKey]
                            : [];
                        if (ids.length > 0) {
                            // console.log('要删除的书签id', ids);
                            const bookmarks = node.searchResult.filter(b => ids.includes(b.id));
                            const names = bookmarks.filter(b => ids.includes(b.id)).map(b => b.originalName || b.name);
                            let result = '';
                            for (let i = 0; i < names.length; i++) {
                                const next = result ? result + '，' + names[i] : names[i];
                                if (next.length > 100) {
                                    result += '...'; break;
                                }
                                result = next;
                            }

                            const toRemoveTags = [];
                            for (const bookmark of bookmarks) {
                                const tags = bookmark.tags;
                                if (Array.isArray(tags) && tags.length > 0) {
                                    for (const t of tags) toRemoveTags.push({ tag: t, add: false, id: bookmark.id });
                                }
                            }

                            const newData = await removeConfirm(ids, result, true, '', '选中的' + ids.length + '个书签', deleteSelectedBookmarks, searchTabKey);//ok
                            // console.log('ssssssssssssssss 删除搜索结果tab的选中书签', bookmarks, toRemoveTags, newData);
                            if (newData) {
                                if (toRemoveTags.length > 0) dispatch(updatePageBookmarkTags(toRemoveTags));//更新被删除书签的标签数据到redux
                                if (node.searchResult.length == ids.length) {//已删除全部搜索结果
                                    //如果删除后搜索结果中没有剩余书签了，移除整个Card
                                    removeCard(newData.id);
                                }
                            }

                        }
                    } else {//删除搜索结果的所有书签
                        const typeName = false;//先类型后名字
                        removeConfirm(node.id, node.name, typeName,
                            '点击确定将删除该分组的书签搜索结果',
                            '搜索结果',
                            dataType == 0 ? removeSearchResultDataType0 : (dataType == 1 ? removeSearchResultDataType1 : removeSearchResultDataType2),
                        );//ok
                    }
                } else if (key == '2') {//打开搜索结果的所有书签
                    const urls = node.searchResult.map(b => (b && b.url) || null);
                    if (urls.length > 0) {
                        urls.forEach((url, index) => {
                            window.open(url, '_blank');
                        });
                    }
                } else if (key == '4') {//点击了多选
                    const currentEffective2 = !!multiSelectModeMap[searchTabKey] || !!multiSelectMap[searchTabKey];
                    const newVal = !currentEffective2;
                    const nextUserMap = { ...multiSelectMap, [searchTabKey]: newVal };
                    setMultiSelectMap(nextUserMap);
                    if (newVal) enableModeForSubtree(searchTabKey);
                    else disableModeForSubtreeForce(searchTabKey);
                } else if (key == '5') {//打开 多选模式
                    const ids = Array.isArray(selectedMapRef.current[searchTabKey]) ? selectedMapRef.current[searchTabKey] : [];
                    if (ids.length > 0) {
                        let tags = [];
                        node.searchResult.filter((b) => ids.includes(b.id)).forEach((b) => tags.push(b));
                        openUrls(tags);
                    }
                } else if (key == '3') {//移动 多选模式
                    const ids = Array.isArray(selectedMapRef.current[searchTabKey]) ? selectedMapRef.current[searchTabKey] : [];
                    if (ids.length > 0) {
                        setMoveFormVisible(true);
                        const bookmarks: WebTag[] = await getBookmarksByIds(ids);

                        //把搜索结果tab当作一个特殊的分组传进去，移动时可以区分是从搜索结果移动还是从正常分组移动
                        // postResultNum: 当移动完成后搜索结果中剩余的书签数量=原搜索结果数量-被移动的书签数量
                        // 如果移动后搜索结果中没有剩余书签了，需要重置搜索结果tab的多选模式激活状态
                        setMoveSelectGroup({ id: searchTabKey, postResultNum: node.searchResult.length - bookmarks.length });

                        if (dataType === 2) {//当前是搜索结果tab
                            const bookmarkGroups = data.children.filter(item => item.totalMatchCount > 0);
                            bookmarks.forEach((b: any) => {
                                const group = bookmarkGroups.find((item: any) => Array.isArray(item.searchResult)
                                    && item.searchResult.some((sr: any) => sr && String(sr.id) === String(b.id))
                                );
                                if (group && group.id) b.gId1 = group.id;//找到对应的域名子分组id,待移动成功后用于将数据同步到子分组
                            });
                            // console.log('11111111111111111111  dataType > 0 && subGroup.id === searchTabKey bookmarks', bookmarks);
                        }
                        setBookmarksToMove(bookmarks);
                    }
                }
            };


            return <Dropdown
                position={'top'}
                trigger="hover"
                // popupVisible={searchResultPopupVisible}
                popupVisible={enter}
                droplist={searchResult && searchResult.length > 0 && <Menu mode='pop' onClickMenuItem={onClickSearchMenuItem}>

                    {multiSelectMap[searchTabKey] && (
                        <Menu.Item key={'3'} disabled={!selectedMapRef.current[searchTabKey] || selectedMapRef.current[searchTabKey].length == 0}>
                            <span style={{ color: 'rgb(var(--arcoblue-6))' }}>移动</span>
                        </Menu.Item>
                    )}

                    <Menu.Item key={'1'}
                        //当前tab(非复制组分组的原分组)开启多选且选中书签个数为0时禁用删除按钮
                        disabled={multiSelectMap[searchTabKey] ? (!selectedMapRef.current[searchTabKey] || selectedMapRef.current[searchTabKey].length == 0) : false} >
                        {multiSelectMap[searchTabKey] ? <span style={{ color: 'rgb(var(--arcoblue-6))' }}>删除</span> : '删除'}
                    </Menu.Item>

                    {!multiSelectMap[searchTabKey] && (
                        <Menu.Item key={'2'}>打开</Menu.Item>
                    )}

                    {/* 多选模式 打开 选中书签为0时禁用按钮 */}
                    {multiSelectMap[searchTabKey] && (
                        <Menu.Item key={'5'} disabled={!selectedMapRef.current[searchTabKey] || selectedMapRef.current[searchTabKey].length == 0}>
                            <span style={{ color: 'rgb(var(--arcoblue-6))' }}>打开</span>
                        </Menu.Item>
                    )}

                    {searchResult && searchResult.length > 0 && <Menu.Item key={'4'} >
                        {(multiSelectMap[searchTabKey]) ? '取消' : <span style={{ color: 'rgb(var(--arcoblue-6))' }}>多选</span>}
                    </Menu.Item>}
                </Menu>
                }
            >
                <span style={{ color: 'red' }}>{`${filter ? '筛选' : '搜索'}结果(${searchResult.length})`}</span>
            </Dropdown>;
        }

        const currentPath = pathKey || `${node.id}`;


        // 叶子节点：根层(render root) 使用 Card 包裹 tags；非根层只返回标签容器（由父层 Tabs 放置在 TabPane 中）
        if (!node.children || node.children.length === 0) {
            const data = node;
            if (level === 0) {//仅有一层根层
                if (dataType == 2 && searching && !currentSearch) return <></>;//按域名分组，非局部搜索模式:当子分组为空时不展示
                else if (dataType == 1 && node.bookmarks.length == 0 && !currentSearch) return <></>;//按时间分组，非局部搜索模式:当子分组为空时不展示

                return (
                    <>
                        <Card id={data.id} key={data.id}

                            title={
                                <>
                                    {/* <span>{data.name}</span> */}

                                    {/* {data.hide ? <IconEyeInvisible></IconEyeInvisible> : ''} */}

                                    {/*  <ButtonGroup style={{ marginLeft: "10px" }}>
                                        {dataType === 0 && <Button onClick={(e) => addTagOrGroup(data.id)} icon={<IconPlus />} >添加</Button>}
                                        {dataType === 0 && <Button onClick={() => editGroup1(data)} icon={<IconEdit />} >编辑</Button>}
                                        {data.hide && <Button onClick={switchGroup1} icon={<IconEye />} >展示</Button>}
                                        <Button onClick={removeGroup1} icon={<IconDelete />} >删除</Button>
                                        {data.bookmarks && data.bookmarks.length > 0 && < Button onClick={(e) => openGroupAllTags(data)} icon={<IconLink />} >打开</Button>}
                                    </ButtonGroup> */}


                                    <Dropdown
                                        trigger='contextMenu'
                                        position='bl'
                                        droplist={
                                            <Menu>
                                                {dataType === 0 && <Menu.Item key='1' onClick={(e) => addTagOrGroup(data.id)}>添加</Menu.Item>}
                                                {dataType === 0 && <Menu.Item key='0' onClick={() => editGroup1(data)}>编辑</Menu.Item>}
                                                {dataType === 0 && <Menu.Item key='3' onClick={removeGroup1}>删除</Menu.Item>}
                                                {data.bookmarks && data.bookmarks.length > 0 && <Menu.Item key='4' onClick={(e) => openGroupAllTags(data)}>打开</Menu.Item>}
                                            </Menu>
                                        }
                                    >
                                        <Grid.Row
                                            // align='center'
                                            // justify='center'
                                            style={{
                                                color: 'var(--color-text-1)',
                                            }}
                                        >
                                            <a onClick={() => onCardTitleClick(data.id)}> <span>{data.name} {data.hide ? <IconEyeInvisible></IconEyeInvisible> : ''}</span>
                                            </a>
                                            {/* <span>Right-click</span> */}
                                        </Grid.Row>
                                    </Dropdown>
                                </>
                            }
                            extra={
                                // className = 'card-no-child-more' tagsFilter：展示标签项
                                <div className={!currentFilter && tagsFilter && searchInput ? 'input-search' : ''}>
                                    {data.itemHide && <label style={{ margin: '5px 8px 0 15px', fontSize: '14px' }}>
                                        <Typography.Text style={{ color: 'var(--color-text-2)' }}>显示</Typography.Text>
                                        <Switch size='small' style={{ marginLeft: 12, marginRight: 12 }} checked={showItem} onChange={switchShow}></Switch>
                                    </label>}
                                    <SelectedTags groupTags={filterTags} />

                                    <Input.Search
                                        allowClear
                                        style={{ width: '240px' }}
                                        placeholder={`在${data.name}中搜索`}
                                        onChange={onInputChange}
                                        // disabled={inputDisabled}
                                        value={searchInput}
                                    />
                                </div>
                            }
                            style={{ width: '100%' }}
                        >
                            {/* 搜索结果 Tab  */}
                            {/* {searching || currentFilter ? */}
                            {searching || currentFilter ?
                                <Tabs
                                    type="card-gutter"
                                    onChange={TabChange}
                                    className={treeSelected && activeCardTab[0] == data.id ? 'treeActiveTabSelectedB' : null}
                                    extra={
                                        /* !!multiSelectMap[currentTab]//多选的tabs中包含当前tab
                                        && data.children
                                            .filter((child) => (child.id === currentTab) && child.bookmarks && child.bookmarks.length > 0)
                                            .length > 0 && */
                                        shouldShowExtra(searchTabKey, data.path) &&
                                        <MultiSelectCheckBox
                                            data={data}
                                            searching={searching}
                                            filtering={currentFilter}
                                            currentTab={searchTabKey}
                                            // forward nodeKey and ids
                                            selectedMapChange={(nodeKey: string, ids: string[], path: string) => {
                                                onNodeSelectionChange(nodeKey, ids, path);
                                                // console.log('xxxxxxxxxxxxxxxxx aaaaaaaaaaaaaaaaaaaaa', nodeKey, ids, path)
                                            }
                                            }
                                            selectedMap={selectedMap}
                                            activeMap={activeMap}
                                        />

                                    }
                                // onChange={onLevel0TabChange}
                                >

                                    {/* <TabPane key={searchTabKey}
                                        title={
                                            <span style={{ display: 'block', padding: '4px 16px' }}
                                                onMouseEnter={(e) => setSearchResultPopupVisible(true)}
                                                onMouseLeave={(e) => setSearchResultPopupVisible(false)}>
                                                {searchTabMore(data.searchResult, searchResultPopupVisible)}
                                            </span>
                                        }
                                    >
                                        <div className={styles.container}>
                                            <div className={styles['single-content']}>
                                                {renderTags(searchTabKey, !!multiSelectModeMap[searchTabKey] || !!multiSelectMap[searchTabKey], data.searchResult, data.path, dataType, true)}
                                            </div>
                                        </div>
                                    </TabPane> */}

                                    <TabPane
                                        key={searchTabKey}
                                        title={
                                            <Dropdown
                                                trigger='contextMenu'
                                                position='bl'
                                                droplist={searchTabMoreMenus(data.searchResult)}
                                            >
                                                <Grid.Row style={{ color: 'var(--color-text-1)', }} >
                                                    <span style={{
                                                        display: 'block', padding: '4px 16px',
                                                        backgroundColor: activeCardTab.includes(data.id) ? 'aliceblue' : ''
                                                    }}>
                                                        {!!multiSelectMap[searchTabKey] && <IconSelectAll></IconSelectAll>}
                                                        <span style={{ color: 'red' }}>
                                                            {`${currentFilter ? '筛选' : '搜索'}结果(${data.searchResult && data.searchResult.length})`}
                                                            {/* {`'treeSelected'(${treeSelected})`} */}
                                                        </span>
                                                    </span>
                                                </Grid.Row>
                                            </Dropdown>
                                        }>
                                        <div className={styles.container} style={{ backgroundColor: activeCardTab.includes(data.id) ? 'aliceblue' : '' }}>
                                            <div className={styles['single-content']}>
                                                {renderTags(searchTabKey, !!multiSelectModeMap[searchTabKey] || !!multiSelectMap[searchTabKey], data.searchResult, data.path, dataType, true)}
                                            </div>
                                        </div>
                                    </TabPane>
                                </Tabs>
                                :
                                <div className={styles['single-content-border']} style={{ backgroundColor: activeCardTab.includes(data.id) ? 'aliceblue' : '' }}>
                                    {renderTags(data.id, multiSelect, data.bookmarks, data.path, false)}
                                </div>
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
                // renderTags(data.id, multiSelect, searching  ? data.searchResult : data.bookmarks, data.path, dataType, false)
                renderTags(data.id, multiSelect, (searching || currentFilter) ? data.searchResult : data.bookmarks, data.path, false)
            );
        }

        // 非叶子：使用 Card 包裹 Tabs（将 Card 放在顶部）
        const data = node;
        return (
            level == 0 ?
                <Card id={data.id} key={data.id}
                    className={treeSelected && !currentFilter && !searching && activeCardTab.length == 1
                        ? 'default-selected-card' : ''}
                    title={
                        <>
                            {/* <span>{data.name}</span>
                            {data.hide ? <IconEyeInvisible></IconEyeInvisible> : ''} */}
                            {/*  <ButtonGroup style={{ marginLeft: "10px" }}>
                                {dataType == 0 && <Button onClick={() => editGroup1(data)} icon={<IconEdit />} >编辑</Button>}
                                <Button onClick={removeGroup1} icon={<IconDelete />} >删除</Button>
                            </ButtonGroup> */}
                            <Dropdown
                                trigger='contextMenu'
                                position='bl'
                                droplist={
                                    <Menu>
                                        {dataType === 0 && <Menu.Item key='0' onClick={() => editGroup1(data)}>编辑</Menu.Item>}
                                        {dataType === 0 && <Menu.Item key='3' onClick={removeGroup1}>删除</Menu.Item>}
                                    </Menu>
                                }
                            >
                                <Grid.Row
                                    // align='center'
                                    // justify='center'
                                    style={{
                                        color: 'var(--color-text-1)',
                                    }}
                                >
                                    <a onClick={() => onCardTitleClick(data.id)}> {data.name}
                                    </a>
                                </Grid.Row>
                            </Dropdown>
                        </>
                    }
                    extra={
                        // <div className='input-search'>
                        <div className={!currentFilter && tagsFilter && searchInput ? 'input-search' : ''}>
                            {/*   data.itemHide && <div style={{ marginLeft: '15px', fontSize: '14px' }}>
                                <Typography.Text style={{ color: 'var(--color-text-2)' }}>显示</Typography.Text>
                                <Switch size='small' style={{ marginLeft: 12, marginRight: 12 }} checked={showItem} onChange={switchShow}></Switch>
                            </div> */}
                            <SelectedTags groupTags={filterTags} />
                            <Input.Search
                                allowClear
                                style={{ width: '240px' }}
                                placeholder={`在${data.name}中搜索`}
                                onChange={onInputChange}
                                value={searchInput}
                            />
                        </div>
                    }
                    style={{ width: '100%' }
                    }
                >
                    <TabsContainer
                        data={data}
                        currentPath={currentPath}
                        level={level}
                        dataType={dataType}
                        RenderNode={RenderNode}
                        handleAddTab={handleAddTab}
                        onTabChange={TabChange}
                        activeTab={getActiveForPath(currentPath)}
                        //根层的activeTab由currentPath控制，currentPath由RenderNode传入，初始值为`${node.id}`，
                        // 即根层id；当切换tab时，更新currentPath为对应子分组的path，从而切换根层activeTab
                        onInputChange={onInputChange}
                        searchInput={searchInput}
                        determinShowTabOrNot={determinShowTabOrNot}
                        WrapTabNode={WrapTabNode}
                        moveTabNode={moveTabNode}
                        searching={searching}
                        filterByTags={currentFilter}
                        multiSelectMap={buildDerivedMultiSelectMap(data)}
                        activeMap={activeMap}
                        activeCardTab={activeCardTab}
                        treeSelected={treeSelected}
                        tabMoreMenus={tabMoreMenus}
                        tabMore={tabMore}
                        searchTabMoreMenus={searchTabMoreMenus}
                        showItem={showItem}
                        searchTabKey={searchTabKey}
                        selectedMap={selectedMap}
                        onSelectedMapChange={(nodeKey: string, ids: string[], path: string) => onNodeSelectionChange(nodeKey, ids, path)}
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
                                    {renderTags('search-result', !!multiSelectModeMap[searchTabKey] || !!multiSelectMap[searchTabKey], data.searchResult, data.path, dataType, true)}
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
                    dataType={dataType}
                    RenderNode={RenderNode}
                    handleAddTab={handleAddTab}
                    multiSelectMap={buildDerivedMultiSelectMap(data)}
                    onTabChange={TabChange}
                    activeTab={getActiveForPath(currentPath)}
                    onInputChange={onInputChange}
                    searchInput={searchInput}
                    // globalActiveTabId={globalActiveTabId}
                    // onClickSort={onClickSort}
                    determinShowTabOrNot={determinShowTabOrNot}
                    WrapTabNode={WrapTabNode}
                    moveTabNode={moveTabNode}
                    searching={searching}
                    filterByTags={currentFilter}
                    activeCardTab={activeCardTab}
                    activeMap={activeMap}
                    treeSelected={treeSelected}
                    // tabMore={tabMore}
                    // searchTabMore={searchTabMore}
                    tabMoreMenus={tabMoreMenus}
                    searchTabMoreMenus={searchTabMoreMenus}
                    showItem={showItem}
                    searchTabKey={searchTabKey}
                    selectedMap={selectedMap}
                    onSelectedMapChange={(nodeKey: string, ids: string[], path: string) => onNodeSelectionChange(nodeKey, ids, path)}
                    // showSearchResult={data.searchResult}
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
                                {/* {renderTags(showSearchResult, data.path, dataType, true)} */}
                                {renderTags(data.id, multiSelect, data.searchResult, data.path, true)}
                            </div>
                        </div>
                    )}
                />
        )
    }

    // 返回结果
    if (!cardShow) {
        return null;
    }

    return (
        <div ref={containerRef}>
            {RenderNode(data, data.id, 0)}
            {/* 添加或编辑标签、分组 */}
            <TagForm isVisible={addTagVisible} selectGroup={tagSelectGroup} data={editTag} closeWithSuccess={closeTagModal}></TagForm>
            <TabGroupForm selectGroup={selectGroup} pageId={pageId} visible={tabForm} closeWithSuccess={closeTabModal} group={tabGroup}></TabGroupForm>
            {/* <BookmarksMoveForm isVisible={moveFormVisible} selectGroup={moveSelectGroup} data={bookmarksToMove} closeWithSuccess={closeMoveModal}></BookmarksMoveForm> */}
            <BookmarksMoveForm isVisible={moveFormVisible}
                selectGroup={dataType == 0 ? [data.id] : null}
                data={bookmarksToMove}
                closeWithSuccess={closeMoveModal}></BookmarksMoveForm>
        </div>
    )
}

export default renderCard
