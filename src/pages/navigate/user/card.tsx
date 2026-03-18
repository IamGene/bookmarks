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
import { clearConfirm } from './form/clear-confirm-modal';
import { saveTagGroup, moveGroupTopBottom } from '@/api/navigate';
import { useDispatch } from 'react-redux';
import {
    fetchBookmarksPageDatas, fetchBookmarksPageData0, fetchBookmarksPageDataGoups, updateActiveGroup, updatePageBookmarkTags, updateSearchState
} from '@/store/modules/global';
import {
    getBookmarkGroupById, getBookmarksByGId, removeCopyGroupById, getBookmarksByIds, removeWebTags, removeWebTagsAndGroups, removeGroupById,
    getBookmarksGroupById, resortNodes, getBookmarksNumByGId, clearGroupBookmarksById, getThroughChild
} from '@/db/BookmarksPages';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import TabsContainer from '../../../components/NestedTabs/TabsContainer';
import { sortGroup } from '@/api/navigate';
import MultiSelectCheckBox from '@/components/NestedTabs/CheckBox';
import Search from '@arco-design/web-react/es/Input/search';
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



function renderCard({ cardData, dataType, display, tags, treeSelectedNode, setCardTabActive, keyWord }) {//hasResult
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



    // 重新计算祖先节点的选中书签集合（用于多选模式下祖先节点聚合其子孙节点的选中项）
    const recomputeAncestorsSelected = (
        pathStr: string,                        // 当前节点的路径字符串（用于解析祖先节点）
        selectedSnapshot: Record<string, string[]> // 当前选中状态的快照（key: 节点id, value: 该节点选中的bookmark id数组）
    ) => {

        // 根据路径字符串解析出祖先节点id列表
        const ancestors = getAncestorIdsFromPath(pathStr);

        // 如果没有祖先节点，则直接返回当前快照，不需要做任何聚合
        if (!ancestors?.length) return selectedSnapshot;

        // 基于当前选中状态复制一份新的对象，后续的祖先聚合结果都写入这里
        const nextSelected = { ...selectedSnapshot };

        // console.log('sssssssssssss recomputeAncestorsSelected 祖先节点', ancestors, '当前快照', selectedSnapshot, 'pathStr', pathStr);
        // 从最近的祖先开始向上遍历（从叶子往根节点方向）
        for (let i = ancestors.length - 1; i >= 0; i--) {
            // 当前处理的祖先节点 id
            const aid = ancestors[i];

            // 判断该祖先节点是否处于多选模式
            // multiSelectModeMap: 派生多选（例如祖先节点开启导致子自动进入多选） 即哪些分组的书签列表应该显示复选框（由上级传播或自身触发）
            // multiSelectMap: 显式开启多选 
            const ancestorEnabled =
                !!multiSelectModeMap[aid] || !!multiSelectMap[aid];

            // 如果该祖先没有开启多选模式，则不需要聚合它的选中项
            if (!ancestorEnabled) continue;

            // 根据 id 在数据树中查找该祖先节点
            const node = findNodeById(data, aid);

            // 如果节点不存在（理论上不应该发生），则跳过
            if (!node) continue;

            // 收集该祖先节点的所有子孙节点
            // 并且只保留那些处于多选模式的节点
            const descendants = collectDescendantNodes(node)
                .filter(n => !!multiSelectModeMap[n.id] || !!multiSelectMap[n.id]);

            // 使用 Set 来做去重，防止多个子节点包含相同的 bookmark id （理论上不应该发生）
            const unionSet = new Set<string>();

            // 遍历所有子孙节点
            descendants.forEach(d => {

                // 取出该子节点当前选中的 bookmark id 列表
                // 如果不存在或不是数组则使用空数组
                const arr = Array.isArray(nextSelected[d.id]) ? nextSelected[d.id] : [];

                // 将所有 bookmark id 加入 Set 中（自动去重）
                arr.forEach(id => unionSet.add(String(id)));
            });

            // 将去重后的 bookmark id 列表作为该祖先节点的选中集合
            nextSelected[aid] = Array.from(unionSet);
        }

        // 返回重新计算后的选中状态对象
        return nextSelected;
    };


    const onNodeSelectionChange = (nodeKey: string, ids: string[], nodePath?: string) => {
        // 先定位当前节点与路径
        const node = findNodeById(data, nodeKey);
        const path = nodePath || node?.path || '';

        // 获取严格意义上的祖先 id 列表（不包含当前节点自身）
        const ancestors = getAncestorIdsFromPath(path);
        const ancestorIds = ancestors.slice(0, Math.max(0, ancestors.length - 1));

        setSelectedMap(prev => {
            const prevNodeArr = Array.isArray(prev[nodeKey]) ? prev[nodeKey].map(String) : [];
            const newNodeArr = Array.isArray(ids) ? ids.map(String) : [];

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
                if (arr.length > 0) next[aid] = arr;
                else delete next[aid];
            }

            // 同步 ref 并返回新状态
            selectedMapRef.current = next;
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

    // if (cardData.id === 'vu2pi7002')
    // console.log(cardData.name + ' 渲染了>>>>>>>>>>>>>>', dataType, cardData, treeSelectedNode);

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

    // debug: trace cardShow changes to identify unexpected resets
    /*   useEffect(() => {
          try {
              // include related flags to help diagnose
              console.log(`[card:${cardData.id}] cardShow =>`, cardShow, `searching=${searching}`, `dataType=${dataType}`, `searchResultLen=${(searchResult && searchResult.length) || 0}`);
          } catch (e) {
              // ignore
          }
      }, [cardShow, searching, dataType, searchResult]); */

    // 当 dataType 变化（例如从 0->1/2）或搜索结果变化时，重新计算 cardShow
    useEffect(() => {
        // 只在搜索模式下需要特殊处理分组类型差异
        if (!searching) return;
        const len = (searchResult && Array.isArray(searchResult)) ? searchResult.length : 0;
        setCardShow(currentSearch || (!currentSearch && len !== 0));
    }, [dataType, searching, searchResult, currentSearch]);

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
            console.log('xxxxxxxxxxxxxxxxxxxxx moveTabNode updateChildern', updateChildern)
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

    /*  useEffect(() => {
         // if (data.id === 'vu2pi7002') console.log(data.name + ' useEffect data', data);
         // console.log(data.name + ' useEffect data', data);
     }, [data]); */

    useEffect(() => {
        // if (data.id === '4hzz2ngtw')
        //     console.log(data.name + ' sssssssssssssssssss useEffect treeSelectedNode', treeSelectedNode);
        setActiveCardTab(treeSelectedNode);//没有自动展开
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


    const processNotEmptySearch = (data, searchKeyWord, showItem, searchTab, currentSearch: boolean) => {
        // console.log(cardData.name + ' processNotEmptySearch 搜索关键词', keyWord, 'showItem', showItem, 'searchTab', searchTab);
        setSearching(true);
        // const result = searchData(keyWord.trim(), cardData);
        const result = searchDataAggregated(searchKeyWord, data);
        // console.log(cardData.name + ' processNotEmptySearch 搜索结果', result, data);
        if (result.totalMatchCount > 0) {//有搜索结果
            if (!currentSearch) dispatch(updateSearchState({ searchResultNum: result.totalMatchCount }));//全局搜索下 累加搜索结果数
            //局部搜索下，如果搜索关键词发生变得与搜索框中的关键词重新一致(原来不一致已减去搜索结果数)
            else if (searchKeyWord == keyWord && searchInput !== keyWord) {
                setCurrentSearch(false);//相当于全局搜索了
                dispatch(updateSearchState({ searchResultNum: result.totalMatchCount }));
            }
        }
        setData(result);
        setSearchResult(result.searchResult); //（全部）搜索结果
        setNoHiddenSearchResult(result.noHiddenSearchResult)//没有隐藏项的搜索结果
        setActiveMap(prev => ({ ...prev, [cardData.id]: searchTabKey })); //激活<搜索结果>Tab
        if (searchTab) setActiveMap({ [cardData.id]: searchTabKey }); //激活<搜索结果>Tab
        // console.log(cardData.name + '2222222222222222');
        if (showItem) {//显示隐藏项目的搜索结果
            return result.searchResult;
        } else {//不显示隐藏项的搜索结果
            return result.noHiddenSearchResult;
        }
    }

    //当cardData发生变化或keyword发生变化(包括清空)时调用
    const processSearchKeywordChange = (data: [], searchKeyword: string, currentSearch: boolean, searchTab: boolean,) => {
        // console.log("ggggggggggggggggggggggg processSearchInputChange", cardData.name, searchKeyword);
        if (searchKeyword) {//有关键词->搜索->展示?
            setTreeSelected(false);
            const searchResult = processNotEmptySearch(data, searchKeyword, showItem, searchTab, currentSearch)//处理搜索结果
            setShowSearchResult([...searchResult]);//展示搜索结果 默认展示所有搜索结果
            /*   if (hasResult) {//(全局？)有搜索结果时
                  //全局搜索时 有结果才显示
                  // const cardShow = currentSearch || (!currentSearch && searchResult.length !== 0);
                  // console.log(cardData.name + ' ' + searchKeyword + ' searchResult currentSearch=' + currentSearch, searchResult, cardShow)
                  // setCardShow(cardShow);
              } else {//全部没有搜索结果时,如果当前搜索则展示Card
                  // setCardShow(currentSearch);
              } */
        } else {//处理空字符串搜索 显示(可能改变的)data的bookmarks书签数据 不显示搜索数据 也不需要处理搜索
            setSearching(false);
            setCurrentSearch(false);
            setCardShow(true);
        }
    }

    /*  useEffect(() => {
     }, [cardShow]); */

    useEffect(() => {
        // console.log(cardData.name + ' useEffect >>>>>>>>>>>>>>>>>>>>>', cardData, tags);
        //重新进行一次搜索,考虑hasResult并未更新，所以该Card仍然展示
        setData(cardData);
        //当非标签筛选时，进行搜索
        if (!cardData.tags) processSearchKeywordChange(cardData, searchInput, currentSearch, false)//从data中搜索 根据当前Card展示与否
        // setShowByDisplayAndGroupHide(cardData.hide, display);
        setSelectedTags(cardData.tags);
        if (!activeMap[cardData.id] && dataType == 0) {
            initActiveMap(cardData.id);
        }//初始化第一层tabs的active项 

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


        //是否展示当前Card: 非隐藏或设置显示，再根据搜索结果判断
        // const showCard = !cardData.hide || display;
        //处理关键词搜索
        processSearchKeywordChange(data, keyword, currentSearch, true);

        if (keyword === '') {
            if (defaultActiveMap) setActiveMap(defaultActiveMap);
            else {
                if (!activeMap || activeMap[cardData.id] == searchTabKey) {
                    if (dataType == 0) initActiveMap(data.id);//初始化第一层tabs的activeTab
                    else if (dataType == 2) setActiveMap({ [cardData.id]: data.children[0].id });//初始化第一层tabs的activeTab
                }
            }
        } else {//搜索结果tab
            setActiveMap({ [data.id]: searchTabKey })
        }
    }

    const onInputChange = (inputValue) => {
        // console.log('222222222222222222220', data.totalMatchCount);
        if (keyWord && keyWord !== '') { //从全局搜索变为局部搜索
            if (inputValue.trim() !== keyWord && searchInput === keyWord && data.totalMatchCount > 0) {
                dispatch(updateSearchState({ searchResultNum: data.totalMatchCount * -1 }));
            }
        }
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
        /*  if (data.id === '4hzz2ngtw') {
             console.log('2222222222222222 getActiveForPath', path, activeMap, activeValue);
         } */
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

    const onLevel1TabChange = async (key: string, path: string) => {
        // console.log('onTabChange', key)
        setEnable(false);
        setDropdownVisible(false);
        setTimeout(() => {
            setEnable(true);
        }, 1000);
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
        if (dataType == 0) {//默认分组
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
        const bookmarksNum: number = await getBookmarksNumByGId(gId);
        const pathStr = bookmarksNum > 0 ? path + "," + gId : path;
        setActiveMap(buildActiveMap(pathStr));
    }

    useEffect(() => {
        const cardActive: string = activeCardTab[0];
        // 受控模式
        if (cardActive === data.id) {//当前Card被选中了
            // console.log(cardData.name + '被选中了 >>>>>>> useEffect cardActive', cardActive);
            setTreeSelected(true);
            setActiveMapByTreeSelected();
            setCardShow(true);//当前Card展示

            /*  if (searching) {//
                 if (dataType == 0) {
                     if (data.searchResult.length == 0) {//无搜索结果 ok
                         setActiveMap({ [data.id]: searchTabKey });
                     }
                 }
             } */
            // console.log(cardData.name + ' useEffect activeCardTab', activeCardTab, lastPath)
            //如果在全局搜索模式下当前Card被tree选中且搜索结果为空 =>临时显示全部
        } else {//当前Card没有被选中了

            //按域名分组时，点击树节点切换到另一个大分组，这时如果当前激活的Tab没有搜索结果了，则切换到搜索结果的Tab
            if (searching) {//
                if (dataType == 2) {
                    const activeTabs = data.children.filter(child => child.id === activeMap[cardData.id]);
                    if (activeTabs.length > 0 && activeTabs[0].totalMatchCount == 0) {//如果当前激活的Tab没有搜索结果了
                        setActiveMap(prev => ({ ...prev, [cardData.id]: searchTabKey }));
                    }
                } else if (dataType == 0 && treeSelected) {//上次被选中才需要重新检查切换
                    // console.log('xxxxxxxxxxxxxxxx', activeCardTab);
                    if (data.searchResult.length == 0) {//无搜索结果 ok
                        setActiveMap({ [data.id]: searchTabKey });
                        // setCardShow(false);//当前Card展示
                        if (currentSearch) {//当前tab的搜索结果变为空？
                        } else {
                            setCardShow(false);
                        }
                    } else {//有搜索结果 如果该分组无搜索结果了，切换到最近的有搜索结果的分组
                        const keys = Object.keys(activeMap);
                        const groupPath = keys.length ? keys.reduce((a, b) => (a.length > b.length ? a : b)) : undefined;//当前激活的Tab所属的分组路径
                        // console.log(cardData.name + '没有被选中了 >>>>>>> useEffect cardActive', cardActive, activeMap, groupPath);
                        if (groupPath) { //&& typeof groupPath === 'string'
                            const path = groupPath.split('-');
                            if (path.length >= 2) {//对应的分组从第二级开始
                                const pId = path[1];//适用于二级分组及以下的书签,path[0]是祖分组id，path[1]是第一层tabs的active项
                                data.children.forEach((item: any) => {
                                    //所属当前分组无搜索结果
                                    if (item.id === pId) {
                                        if (item.totalMatchCount == 0) setActiveMap({ [data.id]: searchTabKey });
                                        else {//该tab有搜索结果，继续路径匹配直到最底层 优先沿 path 深度匹配；若未命中则在同层找第一个有结果的兄弟并递归到底层
                                            const matchedPath = traverseForMatch(item, path, 2);//从path[2]第二个元素开始匹配
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

    //三、切换显示/隐藏部分 暂时停用==================================================================================== 
    /*  useEffect(() => {
         // if (cardData.id === 9) console.log(cardData.name + ' useEffect display1', display)
         setShowItem(display);//显示该分组下的隐藏项 重新渲染
         //如果当前ActiveKey为隐藏项且当前切换为隐藏 --> 切换到第一个tab项
         if (cardData.itemHide) processShowChange(display);//Card分部分组的切换显/隐
         //全局控制局部
         setShowByDisplayAndAll(cardData.hide, display, treeSelected);
     }, [display]); */


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

    const addGroup1Tag = () => {
        setAddTagVisible(true);
        setEditTag(null)
        setTagSelectGroup([cardData.id])
    }

    //删除大分组
    async function processRemoveGroup00(id: string) {
        try {
            if (searching) {//搜索模式 删除大分组中的所有搜索结果
                /* const bookmarkIds: string[] = Array.from(new Set(data.searchResult.map(b => (b && b.id) || null).filter(Boolean)));
                const response = await removeWebTags(bookmarkIds);
                if (response) {
                    const groupData = (await getBookmarksGroupById(id)).groupData;
                    const newData = { ...groupData, searchResult: [], totalMatchCount: 0 };
                    setData(newData);
                    if (currentSearch) {
                        setActiveMap({ [cardData.id]: searchTabKey }); //搜索结果变为0
                    } else {
                        dispatch(updateSearchState({ searchResultNum: bookmarkIds.length * -1 }));
                        setCardShow(false);
                    }
                    dispatch(fetchBookmarksPageDatas([0, 1, 2]));
                    return true;
                } */

                //当被删除的书签所在的分组为空时，需要删除该分组，并向上迭代删除直至祖分组
                const removeBookmarks = data.searchResult;
                const response = await removeWebTagsAndGroups(data.searchResult);
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
                        // console.log('组分组被删除了', resultData);
                        getGroupData();//刷新当前页面数据
                        dispatch(fetchBookmarksPageDatas([1, 2]));
                    }
                    if (response.deletedGroups > 0) dispatch(fetchBookmarksPageDataGoups(pageId));//删除了分组
                    if (!currentSearch) dispatch(updateSearchState({ searchResultNum: removeBookmarks.length * -1 }));
                    return true;
                }
                return false;
            } else {
                const response = await removeGroupById(id);
                if (response.success) {
                    getGroupData();//刷新书签页数据
                    // setCardShow(false);
                    //有书签被删除才需要同步按时间/域名分组数据
                    if (response.deletedBookmarks > 0) dispatch(fetchBookmarksPageDatas([1, 2]));//删除了书签
                    dispatch(fetchBookmarksPageDataGoups(pageId));//删除了分组
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
                    setCardShow(false);//删除了整个分组(年-月)的当前书签搜索结果
                    dispatch(fetchBookmarksPageDatas([0, 1, 2]));
                    if (!currentSearch) {//非局部搜索
                        dispatch(updateSearchState({ searchResultNum: bookmarkIds.length * -1 }));
                    }
                    return true;
                } else {
                    return false;
                }

            } else {
                // console.log('0000000000000000000-11 processRemoveGroup1 按时间分组 !searching');
                // return false;
                const bookmarkIds: string[] = Array.from(new Set(data.bookmarks.map(b => (b && b.id) || null).filter(Boolean)));
                const response = await removeWebTags(bookmarkIds);
                if (response) {
                    // Message.success('删除成功');
                    setCardShow(false);//删除了整个分组(年-月)
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
            if (searching) {//搜索模式：删除所有搜索结果

                const bookmarkIds: string[] = Array.from(new Set(data.searchResult.map(b => (b && b.id) || null).filter(Boolean)));
                allBookmarkIds.push(...bookmarkIds);
                const response = await removeWebTags(allBookmarkIds);
                if (response) {
                    // Message.success('删除成功');
                    const newChildren = data.children.reduce((acc, ch) => {
                        const itemBookmarkIds: string[] = Array.from(new Set((Array.isArray(ch.searchResult) ? ch.searchResult : []).map(b => (b && b.id) || null).filter(Boolean)));
                        if (itemBookmarkIds.length > 0 && itemBookmarkIds.every(id => allBookmarkIds.includes(id))) {//该域名子分组有搜索结果
                            // const currentBookmarks = Array.isArray(ch.bookmarks) ? ch.bookmarks : [];
                            const newBookmarks = ch.bookmarks.filter(b => !allBookmarkIds.includes(b.id));
                            // 删除搜索结果书签后，书签数组仍非空时才保留该域名子分组
                            if (newBookmarks.length > 0) {
                                acc.push({ ...ch, bookmarks: newBookmarks });
                            }
                        } else {//该子分组中不包含搜索结果(隐藏的)，则保留该子分组及其书签（没有书签被删除）以供下次默认/搜索展示
                            acc.push(ch);
                        }
                        return acc;
                    }, []);

                    const newData = { ...data, children: newChildren, searchResult: [], totalMatchCount: 0 };
                    setData(newData);

                    setCardShow(false);
                    dispatch(fetchBookmarksPageDatas([0, 1, 2]));
                    if (!currentSearch) {//非局部搜索
                        dispatch(updateSearchState({ searchResultNum: allBookmarkIds.length * -1 }));
                    }
                    return true;
                }


            } else {//非搜索模式：删除大分组的所有书签
                // console.log('0000000000000000000-22 processRemoveGroup1 按域名分组 非搜索模式');
                cardData.children.forEach(item => {
                    const bookmarkIds: string[] = Array.from(new Set(item.bookmarks.map(b => (b && b.id) || null).filter(Boolean)));
                    allBookmarkIds.push(...bookmarkIds);
                })
                const response = await removeWebTags(allBookmarkIds);
                if (response) {
                    // console.log('删除成功111');
                    // Message.success('删除成功');
                    // getGroupData();
                    setCardShow(false);
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
        if (dataType == 0) removeConfirm(cardData.id, cardData.name, true, searching ? '点击确定将删除该分组的书签搜索结果' : '点击确定将删除该分组及其所有书签', '分组', processRemoveGroup00);
        // if (dataType == 0) removeConfirm(cardData.id, cardData.name, '点击确定将删除该分组及其所有书签', '分组', processRemoveGroup00);
        else if (dataType == 1) removeConfirm(cardData.id, cardData.name, true, searching ? '点击确定将删除该时间段内的书签搜索结果' : '点击确定将删除该时间段内所有的书签', '分组', processRemoveGroup1);
        else if (dataType == 2) removeConfirm(cardData.id, cardData.name, true, searching ? '点击确定将删除该首字母域名的书签搜索结果' : '点击确定将删除该首字母域名的所有书签', '分组', processRemoveGroup2);
    }

    const clearGroup = () => {
        clearConfirm(cardData.id, cardData.name, '点击确定将清空该的所有书签', '分组', processClearGroup);
    }

    // 四、增删改部分 end====================================================================================


    const [moveFormVisible, setMoveFormVisible] = useState(false);//移动书签表单
    const [bookmarksToMove, setBookmarksToMove] = useState([]);//要移动的书签
    const [moveSelectGroup, setMoveSelectGroup] = useState(null);//待移动的选中书签所属当前(祖)分组

    //四、添加/编辑/删除Tab标签部分 
    const [addTagVisible, setAddTagVisible] = useState(false);//添加标签
    const [add2TypesVisible, setAdd2TypesVisible] = useState(false);//添加标签
    // const [addTabVisible, setAddTabVisible] = useState(false);//添加Tab
    const [tagSelectGroup, setTagSelectGroup] = useState([]);//添加Tab

    const [editTag, setEditTag] = useState(null);//添加Tab

    // const onEditTag = (tag: WebTag, nodePath: string, searching: boolean) => {
    const onEditTag = (tag: WebTag, nodePath: string[], searching: boolean) => {
        // console.log('aaaaaaaaaaaaaaa onEditTag searching', searching, nodePath, tag);
        setAddTagVisible(true);
        setEditTag(tag);
        // if (searching) setTagSelectGroup(tag.path.split(","));//搜索中
        if (searching) setTagSelectGroup(dataType >= 1 ? tag.path : nodePath);
        // else setTagSelectGroup(nodePath.split(","))
        else setTagSelectGroup(nodePath);
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
                     // setShowSearchResult(result.searchResult); //（全部）搜索结果
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


    async function updateCardData(groupPath?: string) {
        const resultData = await getBookmarksGroupById(data.id);
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
                // setShowSearchResult(result.searchResult); //（全部）搜索结果
                setData(result);
                return result;
            } else {//非搜索模式
                //如果删除的是复制子分组的
                setData(groupData);
                if (groupPath) {
                    const activeMap = buildActiveMap(groupPath);
                    setActiveMap(activeMap);
                    console.log('xxxxxxxxxxxxxxxxx 非搜索模式 1111 updateCardData groupData', groupPath, activeMap);
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

    //按时间/域名分组数据更新：修改了书签，可能影响按时间/域名分组数据，临时更新到一级分组列表 ok
    function updateCardData1(newTag: WebTag,) {
        const newBookmarks = cardData.bookmarks.filter(b => b.id !== newTag.id);
        newBookmarks.unshift(newTag);
        const newData = { ...data, bookmarks: newBookmarks };
        setData(newData);

        if (searching) {
            const result = searchDataAggregated(searchInput.trim(), newData);//在新数据的基础上搜索
            setData(result);
            if (currentSearch) {
            } else { //全局搜索：搜索结果数-1
                if (data.totalMatchCount && data.totalMatchCount - result.totalMatchCount == 1) {//原来的搜索结果data
                    dispatch(updateSearchState({ searchResultNum: -1 }));
                }
                if (result.totalMatchCount == 0) setCardShow(false); //局部搜索，修改后搜索结果为空
            }
            // setSearchResult(result.searchResult);
            // setShowSearchResult(result.searchResult);
            // setNoHiddenSearchResult(result.noHiddenSearchResult);
        }
    }


    //按时间/域名分组数据更新：
    function updateCardData2(newTag: WebTag) {
        // 将 newData 提升到方法作用域，以便后续分支使用
        let newData = data;
        data.children.some((item) => {
            if (item.id === newTag.gId1) {
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

        if (searching) {
            const result = searchDataAggregated(searchInput.trim(), newData);//在新数据的基础上搜索
            setData(result);
            if (currentSearch) {
                if (result.totalMatchCount == 0) {//局部搜索，修改后搜索结果为空
                    setActiveMap({ [data.id]: searchTabKey });
                }
            } else { //全局搜索：搜索结果数-1
                if (data.totalMatchCount && data.totalMatchCount - result.totalMatchCount == 1) {//原来的搜索结果data
                    dispatch(updateSearchState({ searchResultNum: -1 }));
                }
                if (result.totalMatchCount == 0) setCardShow(false); //局部搜索，修改后搜索结果为空
                else {
                    result.children.some((item) => {
                        if (item.id === newTag.gId1) {
                            if (item.totalMatchCount == 0)
                                setActiveMap({ [data.id]: searchTabKey });
                            return true;//终止遍历
                        }
                        return false;//继续遍历     
                    });
                    // setSearchResult(result.searchResult);
                    // setShowSearchResult(result.searchResult);
                    // setNoHiddenSearchResult(result.noHiddenSearchResult);
                }
            }
        }
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
                        // setShowSearchResult(result.searchResult);
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
    const updateDescendantNodesMultiSelect = (newData, subGroup) => {
        if (newData) {
            try {
                //从原分组数据data（可能仍包含实际不存在的复制子分组）但不影响查找分组和子分组路径的正确性
                const nodeToClear = findNodeById(newData, subGroup.id);
                console.log('bbbbbbbbbbbbbbbbb subGroup.id 删除选中书签 newData sss', newData, nodeToClear);
                if (nodeToClear) {
                    const nodesToClear = collectDescendantNodes(nodeToClear);//包括自身分组
                    setSelectedMap(prev => {
                        const next = { ...prev } as Record<string, string[]>;
                        nodesToClear.forEach(n => {
                            next[n.id] = [];
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
                }
            } catch (err) {
                console.error('清空 selectedMap 时出错', err);
            }
        }
    }


    // 关闭移动书签Modal窗口后的回调函数，根据移动结果和新分组数据决定是否刷新当前页面数据
    async function closeMoveModal(success: boolean, newGroup: any) {
        setMoveFormVisible(false);
        if (success && newGroup) {//移动书签到新分组成功
            if (newGroup.path.split(',')[0] === data.id) {//移动到当前大分组下的其他子分组，刷新当前card数据 搜索结果tab中的移动ok
                //moveSelectGroup: 被移动书签所属当前(祖)分组，
                const newData = await updateCardData(newGroup.path);// 搜索和非搜索模式
                //如果是从搜索结果tab中移动书签,更新搜索结果tab的多选状态
                if (moveSelectGroup.id === searchTabKey) {
                    //清空搜索结果tab已选中书签数据,使非其选中
                    setSelectedMap(prev => ({ ...prev, [searchTabKey]: [] }));
                } else {
                    updateDescendantNodesMultiSelect(newData, moveSelectGroup);
                }
            } else {//移动到其他大分组，刷新当前页面数据 兼容搜索模式/搜索模式：
                const result = await getGroupData();
                const newGroupData = result.data.find(group => group.id === data.id);
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
                    updateDescendantNodesMultiSelect(newGroupData, moveSelectGroup);
                }
            }
        }
    }


    async function closeTagModal(success: boolean, newTag: WebTag, oldTag: WebTag, type: number) {
        setAddTagVisible(false);
        if (success) {//刷新当前页面数据
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
                        if (dataType === 0) updateCardData(group.path);//可能导致搜索结果为空，切换到搜索结果tab
                        else if (dataType === 1) updateCardData1(newTag);
                        else if (dataType === 2) updateCardData2(newTag);
                    } else if (type == 2) { //新增书签:默认分组/按域名分组
                        if (dataType === 0) updateCardData();//搜索？一定是有搜索结果的，因此当前tab是激活的
                        else if (dataType === 2) updateCardData2AddBookmark(newTag);//按域名分组，在当前分组添加书签 搜索模式下？
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
    const processGroupChange = async (group, type: number) => {
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
                        // setActiveCardTab(group.path.split(',')); //适合新增，修改Group
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
                if (group.pageId !== pageId && type == 0) {//a.新增分组而且不在本书签页 
                    //跳转到对应书签页?
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

    //提交成功后关闭或取消关闭Modal窗口
    async function closeTabModal(success: boolean, group: any, type: number) {
        setTabForm(false);
        if (success) {//刷新当前页面数据
            // console.log('xxxxxxxxxxxxxxxxxx close Modal tab', group);
            // processReload(group);
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
        if (dataType == 0) {
            //先重新查询结果，获取最新的分组数据，更新到页面数据中，再根据最新数据进行切换tab等后续操作
            getBookmarksGroupById(data.id).then((resultData) => {
                const groupData = resultData.groupData;
                // 必须通过 dispatch 派发 thunk action
                // dispatch(updatePageDataState(resultData.pageData));//groups变化会触发重新渲染顶层组件(已订阅)
                if (searching) {//搜索模式
                    const keyword = searchInput.trim();
                    const result = searchDataAggregated(keyword, groupData);
                    if (result.searchResult.length == 0) {//搜索结果为空 ok
                        // setActiveMap({ [data.id]: searchTabKey });
                        setCardShow(false);//隐藏该选项卡
                    } else {//搜索结果不为空；
                        getBookmarksByGId(tag.gId).then((bookmarks) => {        //获取tag所在分组的最新数据
                            if (bookmarks.length != 0) {
                                let containsCount = 0;
                                bookmarks.forEach((bookmark) => {
                                    const regex = new RegExp(`(${keyword})`, 'gi');
                                    if (regex.test(bookmark.name) || regex.test(bookmark.description)) containsCount++;
                                });
                                if (containsCount == 0) setActiveMap({ [data.id]: searchTabKey }); //该tab已无搜索结果
                            }
                        });
                    }
                    setSearchResult(result.searchResult); //（全部）搜索结果
                    setShowSearchResult(result.searchResult); //（全部）搜索结果
                    setData(result);
                } else {
                    setData(groupData);
                }
            })
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
                    setSearchResult(result.searchResult); //（全部）搜索结果
                    setShowSearchResult(result.searchResult); //（全部）搜索结果
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
        }

        // 如果是新增（oldTag 为空或 oldTag.tags 为空）且 newTags 非空：全部视为新增（add: true）
        if (tag.tags && tag.tags.length > 0) {
            const updates = [];
            for (const t of tag.tags) updates.push({ tag: t, add: false, id: tag.id });
            dispatch(updatePageBookmarkTags(updates));
        }

        if (searching && !currentSearch) dispatch(updateSearchState({ searchResultNum: -1 }));//更新搜索结果数（-1）
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
        groupId: string,
        multiSelect: boolean,
        list: Array<WebTag>,
        // selectGroup: string,
        selectGroup: string | string[],
        dataType: number,
        searching: boolean
    ) => {
        if (!list || list.length == 0) {
            return <Empty />;
        }
        /*  const nodeKey = Array.isArray(selectGroup)
             ? String(selectGroup[selectGroup.length - 1])
             : (typeof selectGroup === 'string'
                 ? (String(selectGroup).split(',').filter(Boolean).pop() || String(pageId))
                 : String(pageId)); */
        const nodeKey = groupId;
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
                                        prevArr.splice(idx, 1)
                                        // console.log('sssssssssssss onSelectChange 取消选中', id, checked, nodeKey, prevArr, idx);
                                    };
                                    onNodeSelectionChange(nodeKey, prevArr);
                                }}
                                onDeleteSuccess={handleDeleteSuccess}
                                loading={loading}
                                selectGroup={dataType == 0 ? (typeof selectGroup === 'string' ? selectGroup.split(',') : []) : item.path}
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
            if (res) {//删除书签成功
                const newChildren = data.children.reduce((acc, ch) => {
                    if (ch.searchResult && ch.searchResult.length > 0) {//有搜索结果
                        const currentBookmarks = Array.isArray(ch.bookmarks) ? ch.bookmarks : [];
                        const newBookmarks = currentBookmarks.filter(b => !bookmarkIds.includes(b.id));//删除搜索结果后的剩余书签数组
                        // 仅当 newBookmarks 非空时保留该子元素
                        if (newBookmarks.length > 0) {
                            acc.push({ ...ch, bookmarks: newBookmarks, searchResult: [], totalMatchCount: 0 });
                        }
                    } else {//无搜索结果，不受影响，仍放回数组
                        acc.push(ch);
                    }
                    return acc;
                }, []);


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
            if (res) {//删除书签成功
                const newBookmarks = data.bookmarks.filter(b => !bookmarkIds.includes(b.id));//删除搜索结果后的剩余书签数组)
                setData({ ...data, bookmarks: newBookmarks, searchResult: [], totalMatchCount: 0 });
                if (currentSearch) {
                    // setActiveMap({ [data.id]: searchTabKey });
                } else {//全局搜索下
                    setCardShow(false);//隐藏整个Card
                    dispatch(updateSearchState({ searchResultNum: bookmarkIds.length * -1 }));
                }
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
            const res = await removeWebTags(bookmarkIds);//只删除书签 不删除分组
            // const res = true;//删除书签数组
            if (res) {//删除书签成功
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
                return true;
            }
        }
        return false;
    }

    /*  const removeSearchResultDataType0 = async () => {
         // const bookmarkIds = (Array.isArray(data.searchResult) ? data.searchResult.map(b => b && b.id).filter(Boolean) : []);
         const bookmarks = (Array.isArray(data.searchResult) ? data.searchResult : []);
         if (bookmarks.length > 0) {
             console.log('xxxxxxxxxxxxxxxxxxxxxx removeSearchResultDataType0 bookmarks', bookmarks);
             const res = await removeWebTagsAndGroups(bookmarks);//删除书签数组
             // const res = true;//删除书签数组
             if (res) {//删除书签成功
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
                     console.log('xxxxxxxxxxxxxxxxxxxxxx removeSearchResultDataType0', resultData)
                 });
                 return true;
             }
         }
         return false;
     } */


    //删除搜索结果中选中的书签，
    // 更新页面数据和搜索结果数据（如果数据为空则切换到搜索结果tab或隐藏该card），如果是全局搜索隐藏该card，否则切换到搜索结果Tab




    const [searchResultPopupVisible, setSearchResultPopupVisible] = useState(false);

    // multiSelect 按分组 id 存储，确保在 tab 的菜单中切换某个子分组时，影响的是该子分组对应的标签集合
    const [multiSelectMap, setMultiSelectMap] = useState<Record<string, boolean>>({});

    // selectedMap: 每个 nodeId 下被选中的 tag id 列表（字符串形式）
    const [selectedMap, setSelectedMap] = useState<Record<string, string[]>>({});

    // effective mode: 哪些分组的书签列表应该显示复选框（由上级传播或自身触发）
    const [multiSelectModeMap, setMultiSelectModeMap] = useState<Record<string, boolean>>({});

    const selectedMapRef = useRef<Record<string, string[]>>({});
    useEffect(() => { selectedMapRef.current = selectedMap; }, [selectedMap]);

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

        const tabMore = (subGroup, enter) => {
            // 创建自定义事件并分发
            // const bookmarksAndChildren = !!subGroup.list;
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


            /* const processRemoveSubGroup = async () => {
                if (dataType == 0) processRemoveGroup0();
                else if (dataType == 2) processRemoveGroup2();
            } */

            //删除子分组-按默认分组
            const processRemoveSubGroup0 = async () => {
                try {
                    //A.搜索模式
                    if (searching) {
                        //删除该分组的搜索结果，如果被删除书签所在的分组没有其他书签了则将该分组也删除，并向上迭代，直至祖先分组或父(祖)分组有书签数据 逻辑同 processRemoveGroup00
                        const removeBookmarks = subGroup.searchResult;
                        const response = await removeWebTagsAndGroups(removeBookmarks);
                        // const response = true;
                        // console.log('processRemoveSubGroup0 response', response);
                        if (response.success) {
                            getBookmarksGroupById(data.id).then((resultData) => {
                                if (resultData) {
                                    const newSearchResult = searchDataAggregated(searchInput.trim(), resultData.groupData);
                                    setData(newSearchResult);

                                    //A，如果被删除当前分组的搜索结果数==全部搜索结果个数，即全部搜索结果变为0？--因为只有当前被删除的分组才有搜索结果
                                    //a.全局搜索 隐藏 b.局部搜索 切换到SearchTab
                                    if (newSearchResult.searchResult.length == 0) {
                                        if (currentSearch) {
                                            setActiveMap({ [cardData.id]: searchTabKey });
                                        } else {
                                            setCardShow(false);
                                        }
                                    } else {
                                        //否则，切换到被删除数据的兄弟tab,否则如果在第一层tab则切换到搜索结果tab
                                        const path = subGroup.path.split(',');
                                        if (path.length >= 2) {//对应的分组从第二级开始
                                            const pId = path[1];//适用于二级分组及以下的书签,path[0]是祖分组id，path[1]是第一层tabs的active项
                                            let found = false;
                                            newSearchResult.children.forEach((item: any) => {
                                                //所属当前分组无搜索结果
                                                if (item.id === pId) {
                                                    found = true;//除了被删除的书签，仍有剩余书签数据，所以还存在该分组
                                                    // 其祖先分组无搜索结果(所有搜索结果书签数据被删除，但仍有未被搜索结果的书签数据)，切换到同级的searchTab
                                                    if (item.totalMatchCount == 0) setActiveMap({ [data.id]: searchTabKey });
                                                    else {//该tab（其祖先分组）有搜索结果，继续路径匹配直到最底层
                                                        // 优先沿 path 深度匹配；若未命中则在同层找第一个有结果的兄弟并递归到底层
                                                        const matchedPath = traverseForMatch(item, path, 2);//从path[2]第二个元素开始匹配
                                                        if (matchedPath) setActiveMap(buildActiveMap(matchedPath));
                                                        else setActiveMap({ [data.id]: searchTabKey });
                                                    }
                                                }
                                            });
                                            //没有找到对应的分组(因为该分组及其子分组的书签都被搜索到然后全被删除了)，切换到搜索结果tab
                                            if (!found) setActiveMap({ [data.id]: searchTabKey });
                                        }
                                        // 祖分组（path.length == 1）只有存在书签数据（subGroup.copy）和子分组才会出现在子分组的tab（第一层tabs）
                                        else if (path.length == 1 && subGroup.copy) { // 删除的是大分组的复制分组,在第一层tabs
                                            setActiveMap({ [data.id]: searchTabKey });
                                        }
                                    }
                                    dispatch(fetchBookmarksPageDatas([0, 1, 2]));//删除了书签+分组

                                } else {//整个大分组没有数据了（因为所有书签被清空导致分组也被删除）
                                    getGroupData();
                                    dispatch(fetchBookmarksPageDatas([1, 2]));//删除了书签+分组
                                }
                                // return true;
                            });

                            if (!currentSearch) dispatch(updateSearchState({ searchResultNum: removeBookmarks.length * -1 }));
                            if (response.deletedGroups > 0) await dispatch(fetchBookmarksPageDataGoups(pageId));
                            return true;
                        }
                        return false;
                    }

                    //B.非搜索模式  
                    else {
                        const copyGroup: boolean = subGroup.copy;
                        const response = copyGroup ? await removeCopyGroupById(subGroup.id.replace('_copy', ''))//removeCopyGroupById仅删除该(复制)分组的书签
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
                            if (response.deletedBookmarks > 0) dispatch(fetchBookmarksPageDatas([0, 1, 2]));//删除了书签+分组
                            else dispatch(fetchBookmarksPageDatas([0]));//仅删除了分组

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

            //按域名分组-删除子分组
            const processRemoveSubGroup2 = async () => {
                // console.log('222222222222222222222 processRemoveSubGroup2', subGroup);
                if (searching) {
                    for (const item of data.children) {
                        if (item.id === subGroup.id) {
                            // 收集所有该子分组当前搜索结果中的书签 id，批量删除一次
                            const bookmarkIds = (Array.isArray(item.searchResult) ? item.searchResult.map(b => b && b.id).filter(Boolean) : []);
                            if (bookmarkIds.length > 0) {
                                const res = await removeWebTags(bookmarkIds);//删除书签数组

                                if (res) {//删除书签成功
                                    const newChildren = data.children.reduce((acc, ch) => {
                                        if (ch.id === subGroup.id) {
                                            const currentBookmarks = Array.isArray(item.bookmarks) ? item.bookmarks : [];
                                            const newBookmarks = currentBookmarks.filter(b => !bookmarkIds.includes(b.id));//剩余书签数组
                                            // 仅当 newBookmarks 非空时保留该子元素
                                            if (newBookmarks.length > 0) {
                                                // const currentSearchResult = Array.isArray(item.searchResult) ? item.searchResult : [];
                                                // const newSearchResult = currentSearchResult.filter(b => !bookmarkIds.includes(b.id));
                                                // const totalMatchCount = Math.max(0, (item.totalMatchCount || 0) - bookmarkIds.length);
                                                acc.push({ ...ch, bookmarks: newBookmarks, searchResult: [], totalMatchCount: 0 });
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
                                    if (currentSearch) {
                                    } else {//全局搜索下
                                        if (newSearchResult.length == 0) {//全部中没有剩余的搜索结果了
                                            setCardShow(false);//如果没有子分组了，隐藏整个Card
                                        }
                                        dispatch(updateSearchState({ searchResultNum: bookmarkIds.length * -1 }));
                                    }
                                    dispatch(fetchBookmarksPageDatas([0, 1, 2]));//删除了书签
                                }
                                return true;
                            }
                        }
                    }
                    return false;
                } else {
                    try {
                        for (const item of data.children) {
                            if (item.id === subGroup.id) {
                                // 收集所有书签 id，批量删除一次，避免多次调用
                                const bookmarkIds = (Array.isArray(item.bookmarks) ? item.bookmarks.map(b => b && b.id).filter(Boolean) : []);
                                if (bookmarkIds.length > 0) {
                                    const res = await removeWebTags(bookmarkIds);
                                    if (res) {//删除书签成功
                                        const newChildren = data.children.filter(child => child.id !== subGroup.id);//过滤整个分组
                                        setData(prevData => ({ ...prevData, children: newChildren }));
                                        if (newChildren.length == 0) {
                                            setCardShow(false);//如果没有子分组了，隐藏整个Card
                                        } else {
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
                        /* if (subGroup.id.endsWith('_copy')) {
                           
                        } else {
                            setTabGroup(subGroup);
                        } */
                        setTabGroup(subGroup.id.endsWith('_copy') ? { ...subGroup, id: subGroup.id.replace('_copy', '') } : subGroup);
                        const parentPath: string[] = pathArr.length > 1 ? pathArr.slice(0, pathArr.length - 1) : null;
                        setSelectGroup(parentPath);//截取parent的path路径

                        if (dataType == 2) {
                            data.children.some((item) => {
                                if (item.id === subGroup.id) {//非隐藏的
                                    // console.log('111111111111111 添加Tag subGroup', item.bookmarks[0]);
                                    const tag = {
                                        // name: item.bookmarks[0].name,
                                        gId1: subGroup.id,
                                    };
                                    setEditTag(tag);
                                }
                            });
                        }
                    } else if (key === '2') {//删除子分组Group 或分组(及其子分组内)的书签(多选模式) 按分组/按域名分组
                        /*
                     console.log('>>>>>>>>>> 删除子分组Group subGroup', subGroup,
                            'selectedMap[subGroup.id]', selectedMap[subGroup.id],
                            'multiSelectMap[subGroup.id]', multiSelectMap[subGroup.id]);
                              */

                        if (multiSelectModeMap[subGroup.id] || multiSelectMap[subGroup.id]) {//删除书签(多选)
                            // const ids = Array.isArray(selectedMapRef.current[subGroup.id]) ? selectedMapRef.current[subGroup.id] : [];
                            const ids = Array.isArray(selectedMapRef.current[subGroup.id]) ? selectedMapRef.current[subGroup.id] : [];
                            if (ids.length > 0) {

                                getBookmarksByIds(ids).then(async (bookmarks) => {
                                    const names = bookmarks.map(b => b.name);
                                    //被删除的书签涉及的分组id列表 
                                    const gIds = [...new Set(bookmarks.map(b => b.gId))];// 使用 Set 去重，然后再转回数组
                                    const keys = Object.keys(activeMap);
                                    const longestKey = keys.length ? keys.reduce((a, b) => (a.length > b.length ? a : b)) : undefined;

                                    let result = names.length > 0 ? names[0] : '';
                                    for (let i = 1; i < names.length; i++) {
                                        const next = result ? result + '，' + names[i] : names[i];
                                        if (next.length > 100) {//字数超过，停止遍历
                                            result += '...'; break;
                                        }
                                        result = next;//下一循环
                                    }

                                    let groupPath = subGroup.path;//默认要切换的分组路径

                                    //A.非搜索模式：如果删除的书签涉及多个分组(有可能是复制子分组，删除仅剩的书签后该子分组会消失，需要指定设置切换activeTab的gruopPath)
                                    if (activeMap[longestKey].endsWith('_copy')) { //如果当前激活的tab是复制分组tab，
                                        const copyGroupId = activeMap[longestKey];
                                        const copyOriGId = copyGroupId.split('_copy')[0];
                                        if (gIds.includes(copyOriGId)) { // 且被删除的书签id列表包含了该复制分组内的书签
                                            const node = findNodeById(data, copyGroupId);//找到该复制分组子节点
                                            if (node.bookmarks.length == 1) {//如果被删除的书签之一是该复制分组（最后一层）内仅剩的一个书签
                                                groupPath = node.path.slice(0, node.path.lastIndexOf(","));//切换到该复制分组的父分组tab,再下层的activeTab不作设置，自动取第1个child
                                            }
                                        }
                                    } else {//activeTab不变
                                        groupPath = longestKey.replaceAll('-', ',') + ',' + activeMap[longestKey];
                                    }

                                    const newData = await removeConfirm(ids, result, true, '', '选中的' + ids.length + '个书签', deleteSelectedBookmarks, groupPath);//ok
                                    // 清空 subGroup 及其子孙在 selectedMap 中的已选中书签数据（置为空数组）...
                                    updateDescendantNodesMultiSelect(newData, subGroup);


                                    //B.搜索模式：todo
                                });
                            }
                        } else { //删除分组(默认)
                            removeConfirm(subGroup.id, subGroup.name, searching ? false : true,
                                searching ? '点击确定将删除该分组的书签搜索结果' : '点击确定将删除该分组及其所有书签',
                                searching ? '搜索结果' : '分组',
                                dataType == 0 ? processRemoveSubGroup0 : processRemoveSubGroup2);//ok
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

                    } else if (key === '5') {//打开选中标签
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

            return <Dropdown
                position={'top'}
                droplist={
                    <Menu onClickMenuItem={onClickMenuItem} mode='pop'>
                        {
                            // enable && (dropdownVisible || dropdownVisibleId === subGroup.id) && <>
                            enable && dropdownVisible && <>
                                {/* 排除有复制子分组的分组 未被多选或有书签数据(原分组非复制子分组)!multiSelectMap[subGroup.id] || bookmarksAndChildren */}
                                {multiSelectDisabled && <Menu.Item key={'0-' + json} >添加</Menu.Item>}
                                {dataType == 0 && multiSelectDisabled && <Menu.Item key={'1-' + json} >编辑</Menu.Item>}

                                {/* {subGroup.bookmarks && subGroup.bookmarks.length > 0 && multiSelectMap[subGroup.id] && ( */}
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
                                {/* {subGroup.bookmarks && subGroup.bookmarks.length > 0 && multiSelectMap[subGroup.id] && ( */}
                                {subGroup.bookmarksNum > 0 && multiSelectEffective && (
                                    <Menu.Item key={'5-' + json} disabled={getSelectedCountForNode(subGroup) === 0}>
                                        <span style={{ color: 'rgb(var(--arcoblue-6))' }}>打开</span>
                                    </Menu.Item>
                                )}

                                {/* 有书签数据 切换多选/取消 */}
                                {/* {subGroup.bookmarks && subGroup.bookmarks.length > 0 && <Menu.Item key={'4-' + json} > */}
                                {/* {((subGroup.bookmarks && subGroup.bookmarks.length > 0) || bookmarksAndChildren) && <Menu.Item key={'4-' + json} > */}
                                {subGroup.bookmarksNum > 0 && <Menu.Item key={'4-' + json} >
                                    {(multiSelectEffective) ? '取消' : <span style={{ color: 'rgb(var(--arcoblue-6))' }}>多选</span>}
                                </Menu.Item>}
                                {/* {selectedMap[subGroup.id] && selectedMap[subGroup.id].length > 0 && <Menu.Item key={'5-' + json} >{`删除选中(${selectedMap[subGroup.id].length})`}</Menu.Item>} */}
                            </>
                        }
                    </Menu >
                }
                trigger="hover"
                //不再由Dropdown组件控制visible状态，而是通过onTabMouseEnter事件在tab组件中由enter值(true/false)设置的popupVisible控制
                // onVisibleChange={handleDropdownVisibleChange} 
                // popupVisible={dropdownVisible}

                popupVisible={enter}
            >
                {/*  <div className="tab-more" style={{ display: 'inline-block', color: 'var(--color-text-2)' }}>
                    <IconMore />
                </div> */}
                {!!multiSelectMap[subGroup.id] && <IconSelectAll></IconSelectAll>}  {/* 全选图标 */}
                {subGroup.name}
                {/* {'(' + subGroup.bookmarksNum + ')'} 
                */}
                {subGroup.hide ? <IconEyeInvisible></IconEyeInvisible> : ''}
            </Dropdown >
        }





        const deleteSelectedBookmarks = async (ids, groupPath) => {
            try {
                const ok = await removeWebTags(ids);
                // const ok = true;
                if (ok) {
                    let newData;
                    if (dataType === 0) {//按默认分组方式
                        newData = await updateCardData(groupPath === searchTabKey ? null : groupPath);//可能导致搜索结果为空 如果全局搜索模式，则隐藏当前Card，否则
                        console.log(">>>>>>>>>>>>>>>>>>>>>>>>> 删除子分组Group subGroup 删除书签成功 newData", ids, groupPath, newData);
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

        const searchTabMore = (searchResult, enter) => {
            // 2级分组菜单
            const onClickSearchMenuItem = async (key: string, event) => {
                if (key == '1') {//删除搜索结果的所有书签
                    if (multiSelectMap[searchTabKey]) {//搜索结果多选模式下删除选中书签
                        // const ids = Array.isArray(selectedMapRef.current[searchTabKey]) ? selectedMapRef.current[searchTabKey] : [];
                        const ids = Array.isArray(selectedMapRef.current[searchTabKey])
                            ? selectedMapRef.current[searchTabKey]
                            : [];
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
                        setBookmarksToMove(bookmarks);
                        //把搜索结果tab当作一个特殊的分组传进去，移动时可以区分是从搜索结果移动还是从正常分组移动
                        // postResultNum: 当移动完成后搜索结果中剩余的书签数量=原搜索结果数量-被移动的书签数量
                        // 如果移动后搜索结果中没有剩余书签了，需要重置搜索结果tab的多选模式激活状态
                        setMoveSelectGroup({ id: searchTabKey, postResultNum: node.searchResult.length - bookmarks.length });
                    }
                }
            }


            return <Dropdown
                position={'top'}
                trigger="hover"
                // popupVisible={searchResultPopupVisible}
                popupVisible={enter}
                droplist={searchResult.length > 0 && <Menu mode='pop' onClickMenuItem={onClickSearchMenuItem}>

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

                    {searchResult.length > 0 && <Menu.Item key={'4'} >
                        {(multiSelectMap[searchTabKey]) ? '取消' : <span style={{ color: 'rgb(var(--arcoblue-6))' }}>多选</span>}
                    </Menu.Item>}
                </Menu>
                }
            >
                <span style={{ color: 'red' }}>{`搜索结果(${searchResult.length})`}</span>
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
                                    <a onClick={() => onCardTitleClick(data.id)}> <span>{data.name} {data.hide ? <IconEyeInvisible></IconEyeInvisible> : ''}</span>
                                    </a>
                                    {data.hide ? <IconEyeInvisible></IconEyeInvisible> : ''}

                                    <ButtonGroup style={{ marginLeft: "10px" }}>
                                        {dataType === 0 && <Button onClick={(e) => addTagOrGroup(data.id)} icon={<IconPlus />} >添加</Button>}
                                        {dataType === 0 && <Button onClick={() => editGroup1(data)} icon={<IconEdit />} >编辑</Button>}
                                        {data.hide && <Button onClick={switchGroup1} icon={<IconEye />} >展示</Button>}
                                        {/* {!data.hide && <Button onClick={switchGroup1} icon={<IconEyeInvisible />} >隐藏</Button>} */}
                                        <Button onClick={removeGroup1} icon={<IconDelete />} >删除</Button>
                                        {/* {data.urlList.length > 0 && <Button onClick={clearGroup} icon={<IconEraser />} >清空</Button>} */}
                                        {data.bookmarks && data.bookmarks.length > 0 && < Button onClick={(e) => openGroupAllTags(data)} icon={<IconLink />} >打开</Button>}
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

                                    extra={
                                        /* !!multiSelectMap[currentTab]//多选的tabs中包含当前tab
                                        && data.children
                                            .filter((child) => (child.id === currentTab) && child.bookmarks && child.bookmarks.length > 0)
                                            .length > 0 && */
                                        shouldShowExtra(searchTabKey, data.path) && <MultiSelectCheckBox
                                            data={data}
                                            searching={searching}
                                            currentTab={searchTabKey}
                                            // onSelectedMapChange={(nodeKey: string, ids: string[]) => setSelectedMap(prev => ({ ...prev, [nodeKey]: ids }))}
                                            selectedMapChange={(ids) => onNodeSelectionChange(searchTabKey, ids, data.path)}
                                            selectedMap={selectedMap}
                                        />
                                    }
                                // onChange={onLevel0TabChange}
                                >
                                    {/* <TabPane key={searchTabKey} title={<span style={{ color: 'red' }}>{`搜索结果(${data.searchResult.length})`}</span>}>
                                        <div className={styles.container}>
                                            <div className={styles['single-content']}>
                                                {renderTags(data.searchResult, data.path, dataType, true)}
                                            </div>
                                        </div>
                                    </TabPane> */}

                                    <TabPane key={searchTabKey}
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
                                    </TabPane>
                                </Tabs>
                                :
                                // <div className={styles.container}>
                                <div className={styles['single-content-border']}>
                                    {renderTags(data.id, multiSelect, data.bookmarks, data.path, dataType, false)}
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
                renderTags(data.id, multiSelect, searching ? data.searchResult : data.bookmarks, data.path, dataType, false)
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
                                {dataType == 0 && <Button onClick={() => editGroup1(data)} icon={<IconEdit />} >编辑</Button>}
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
                        dataType={dataType}
                        RenderNode={RenderNode}
                        handleAddTab={handleAddTab}
                        onTabChange={TabChange}
                        activeTab={getActiveForPath(currentPath)}
                        //根层的activeTab由currentPath控制，currentPath由RenderNode传入，初始值为`${node.id}`，
                        // 即根层id；当切换tab时，更新currentPath为对应子分组的path，从而切换根层activeTab
                        onInputChange={onInputChange}
                        searchInput={searchInput}
                        // onClickSearchMenuItem={onClickSearchMenuItem}
                        determinShowTabOrNot={determinShowTabOrNot}
                        WrapTabNode={WrapTabNode}
                        moveTabNode={moveTabNode}
                        searching={searching}
                        multiSelectMap={buildDerivedMultiSelectMap(data)}
                        activeMap={activeMap}
                        // currentSearch={currentSearch}
                        // resort={resort}
                        // onClickSort={onClickSort}
                        activeCardTab={activeCardTab}
                        tabMore={tabMore}
                        searchTabMore={searchTabMore}
                        showItem={showItem}
                        searchTabKey={searchTabKey}
                        selectedMap={selectedMap}
                        onSelectedMapChange={(nodeKey: string, ids: string[]) => onNodeSelectionChange(nodeKey, ids)}
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
                    // resort={resort}
                    // onClickSort={onClickSort}
                    determinShowTabOrNot={determinShowTabOrNot}
                    WrapTabNode={WrapTabNode}
                    moveTabNode={moveTabNode}
                    searching={searching}
                    // onClickSearchMenuItem={onClickSearchMenuItem}
                    // searchResult={searchResult}
                    // cardData={cardData}
                    // currentSearch={currentSearch}
                    activeCardTab={activeCardTab}
                    activeMap={activeMap}
                    tabMore={tabMore}
                    searchTabMore={searchTabMore}
                    showItem={showItem}
                    searchTabKey={searchTabKey}
                    selectedMap={selectedMap}
                    onSelectedMapChange={(nodeKey: string, ids: string[]) => onNodeSelectionChange(nodeKey, ids)}
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
                                {renderTags(data.id, multiSelect, data.searchResult, data.path, dataType, true)}
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
        <DndProvider backend={HTML5Backend}>
            {RenderNode(data, data.id, 0)}
            {/* 添加或编辑标签、分组 */}
            <TagForm isVisible={addTagVisible} selectGroup={tagSelectGroup} data={editTag} closeWithSuccess={closeTagModal}></TagForm>
            <TabGroupForm selectGroup={selectGroup} pageId={pageId} visible={tabForm} closeWithSuccess={closeTabModal} group={tabGroup}></TabGroupForm>
            {/* <BookmarksMoveForm isVisible={moveFormVisible} selectGroup={moveSelectGroup} data={bookmarksToMove} closeWithSuccess={closeMoveModal}></BookmarksMoveForm> */}
            <BookmarksMoveForm isVisible={moveFormVisible} selectGroup={[data.id]} data={bookmarksToMove} closeWithSuccess={closeMoveModal}></BookmarksMoveForm>
        </DndProvider>
    )
}

export default renderCard