import { useState, useEffect, useMemo, useRef } from 'react';
import { Tree, Switch, Input, Modal, Message, Typography, Anchor, Select } from '@arco-design/web-react';
import { useDispatch, useSelector } from 'react-redux';
import { IconDelete, IconUndo, IconDriveFile, IconEmpty, IconFolder } from '@arco-design/web-react/icon';
import { fetchBookmarksPageData, fetchBookmarksPageData0, fetchBookmarksPageData1, updateSearchState, fetchBookmarksPageData2, updateRecycleBinState, fetchRecycleBinData, clearRecycleBinForPage } from '@/store/modules/global';
const AnchorLink = Anchor.Link;
// import { RootState } from '@/store';

const Option = Select.Option;
const RECYCLE_BIN_NODE_ID = '__bookmarks_tree_recycle_bin__';
const options = [
    { label: '按名称', value: 0 },
    { label: '按时间', value: 1 },
    { label: '按域名', value: 2 },
];

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



/* function filterChildrenArrayByPath(arr) {
    // 返回一个新数组，避免修改原数组
    if (!arr) return [];
    return arr.map(item => filterChildrenByPath(item));
} 
    
// 保证每层都新建对象，不引用原对象
function filterChildrenByPath(data) {
    // 先浅拷贝一份（不引用原对象）
    const newData = { ...data };

    if (!Array.isArray(data.children)) {
        // children不是数组，直接返回新对象
        return newData;
    }

    // 过滤并递归深拷贝子元素
    newData.children = data.children
        // .filter(child => child.path !== data.path)
        .filter(child => child.id !== data.id)
        .map(child => filterChildrenByPath(child));

    return newData;
}
*/


// 示例用法
// const filteredArray = filterChildrenArrayByPath(jsonArray);
// function App({ data, setTreeSelected, treeSelectedKeys, treeInputValue, setTreeInputValue, setTreeSearchData }) {
function App({ setTreeSelected, setTreeType, treeSelectedKeys }) {
    //所有树数据

    // derive pageId from currentPage when possible to avoid stale id when switching pages

    const [inputValue, setInputValue] = useState(null);
    const globalState = useSelector((state: any) => state.global);
    const { dateGroups, dataGroups, expandedKeys, domainGroups, toUpdateGroupTypes } = globalState;
    const pageId = globalState.currentPage?.pageId ?? (Array.isArray(dataGroups) && dataGroups.length ? dataGroups[0].pageId : null);
    const dispatch = useDispatch();

    /**
     *  
     *  useMemo优化性能，避免不必要的计算和渲染
        使用 useMemo 后，只有当真实的数据数组（依赖）变更时，该 effect 才会运行，这避免了被频繁覆盖的问题。
        原先 allDataGroups 每渲染都变，导致 useEffect([allDataGroups]) 无条件把原始数据写回 treeData，
        覆盖由搜索 useEffect([inputValue]) 写入的 result。
        useMemo 让 allDataGroups 保持稳定引用，useEffect([allDataGroups]) 
        只在真正的数据变动时运行，从而不会在每次搜索渲染后覆盖结果。
     */

    const allDataGroups = useMemo(() => ([
        { data: dataGroups, value: 0 },
        { data: dateGroups, value: 1 },
        { data: domainGroups, value: 2 }
    ]), [dataGroups, dateGroups, domainGroups]);


    useEffect(() => {
        const data = allDataGroups.find(g => g.value === groupType)?.data || []
        setTreeData(data);
        if (groupType == 2) setTreeExpandedKeys(data.map((item) => item.id));   //切换到按域名分组 自动展开
    }, [allDataGroups]);//书签页数据发生变化

    //搜索输入内容
    const [groupType, setGroupType] = useState(options[0].value);
    const [treeData, setTreeData] = useState(dataGroups);

    // const [recycleActive, setRecycleActive] = useState(false);

    // 不再把回收站节点加入到树数据中，改为在树外固定显示
    const treeDataWithRecycleBin = useMemo(() => {
        const recycleActive = !!globalState?.recycleBin?.active;
        const normalizedTreeData = recycleActive ?
            globalState.recycleBin.dataGroups
            : (Array.isArray(treeData) ? treeData : []);
        const deletedNum = globalState?.recycleBin?.deletedBookmarksNum || 0;
        return normalizedTreeData;
    }, [treeData, globalState?.recycleBin?.dataGroups, globalState?.recycleBin?.active]);

    // 当回收站被激活或其数据更新时，使用回收站的数据作为分组展示
    /*   useEffect(() => {
          const recycleActive = !!globalState?.recycleBin?.active;
          if (recycleActive) {
              const rbData = Array.isArray(globalState.recycleBin.dataGroups) ? globalState.recycleBin.dataGroups : [];
              setTreeData(rbData);
              // 激活回收站时默认展开回收站下所有分组（若有）
              setTreeExpandedKeys(Array.isArray(rbData) ? rbData.map((item) => item.id) : []);
          } else {
              // 退出回收站时，恢复为当前分组类型的数据
              const data = allDataGroups.find(g => g.value === groupType)?.data || [];
              setTreeData(data);
              if (!expand) setTreeExpandedKeys([]);
          }
      }, [globalState?.recycleBin?.active, globalState?.recycleBin?.dataGroups]); */


    useEffect(() => {
        const recycleActive = !!globalState?.recycleBin?.active;
        // console.log('gggggggggggggggggggg useEffect recycleActive', recycleActive);
        if (recycleActive) {
            const rbData = Array.isArray(globalState.recycleBin.dataGroups)
                ? globalState.recycleBin.dataGroups
                : [];

            setTreeData(rbData);
            // 激活回收站时默认展开回收站下所有分组（若有）
            setTreeExpandedKeys(
                Array.isArray(rbData)
                    ? rbData.map((item) => item.id)
                    : []
            );
        } else {
            // 退出回收站时，恢复为当前分组类型的数据
            const data = allDataGroups.find(g => g.value === groupType)?.data || [];
            setTreeData(data);
            if (!expand) {
                setTreeExpandedKeys([]);
            } else {
                setTreeExpandedKeys(
                    groupType === 0
                        ? (Array.isArray(expandedKeys) ? expandedKeys : [])
                        : data.map((item) => item.id)
                );
            }
        }
    }, [
        globalState?.recycleBin?.active,
        globalState?.recycleBin?.dataGroups,
        // recycleActive,
        groupType,
        allDataGroups,
        expandedKeys,
    ]);


    // console.log('>>>>>>>>>>>>>>>>>>>>> tree组件渲染了11, treeData', expandedKeys);
    const [checked, setChecked] = useState(true);

    // 监听全局书签删除事件，实时更新回收站计数并在回收站激活时刷新数据
    const lastDeletedRef = useRef<number>(globalState?.recycleBin?.deletedBookmarksNum || 0);

    useEffect(() => {
        lastDeletedRef.current = globalState?.recycleBin?.deletedBookmarksNum || 0;
    }, [globalState?.recycleBin?.deletedBookmarksNum]);

    useEffect(() => {
        const handler = async (event) => {
            try {
                const inc = event?.detail?.count || 0;
                if (inc > 0) {
                    const cur = globalState?.recycleBin?.deletedBookmarksNum || 0;
                    dispatch(updateRecycleBinState({ deletedBookmarksNum: cur + inc }));

                    // 如果当前没有激活回收站，应清空已预加载的回收站快照，标记为需要重新拉取
                    // 否则预加载的数据可能与最新的已删除条目不一致，导致进入回收站时显示过期数据
                    if (!globalState?.recycleBin?.active) {
                        try {
                            dispatch(updateRecycleBinState({ dataByGroup: [], dataGroups: [] }));
                        } catch (e) {
                            // ignore
                        }
                    }

                    // 如果当前正在显示回收站，则刷新回收站数据以确保 tree/dataGroups 同步
                    if (globalState?.recycleBin?.active && pageId != null) {
                        const res = await dispatch(fetchRecycleBinData(pageId));
                        try {
                            const newNum = (res && res.deletedBookmarksNum) || (globalState?.recycleBin?.deletedBookmarksNum || 0);
                            lastDeletedRef.current = newNum;
                        } catch (e) { }
                    }
                }
            } catch (e) {
                // ignore
            }
        };
        if (typeof window !== 'undefined' && window.addEventListener) {
            window.addEventListener('bookmarks-deleted', handler as EventListener);
        }
        return () => {
            if (typeof window !== 'undefined' && window.removeEventListener) {
                window.removeEventListener('bookmarks-deleted', handler as EventListener);
            }
        };
    }, [globalState?.recycleBin?.active, pageId, dispatch, globalState?.recycleBin?.deletedBookmarksNum]);

    const [expand, setExpand] = useState(false);
    // const [tempExpand, setTempExpand] = useState(false);
    const [treeExpandedKeys, setTreeExpandedKeys] = useState([]);

    const switchExpand = () => {
        // testUpdateData();
        if (expand) { //当前是展开，切换为收起
            setTreeExpandedKeys([])//收起时，清空展开项
        } else {
            if (groupType === 0) {
                setTreeExpandedKeys(Array.isArray(expandedKeys) ? expandedKeys : [])//展开时，展开所有项
            } else {
                setTreeExpandedKeys(Array.isArray(treeData) ? treeData.map((item) => item.id) : [])//展开时，展开所有项
            }
        }
        setExpand(!expand);
    }


    /*    useEffect(() => {
        // console.log('>>>>>>>>>>>>>>>>> treeData useEffect', data);
        // let filteredData = filterChildrenArrayByPath(data);
        setTreeData(data);
        if (!inputValue || !inputValue.trim()) {
            setTempExpand(false);
        } else if (data.length) {
            setTempExpand(true);
        }
    }, [data]);
    */


    async function onTypeSelectChange(value) {
        /* Message.info({
            content: `You select ${value}.`,
            showIcon: true,
        }); */

        setInputValue(null);
        if (toUpdateGroupTypes.length > 0) {
            if (value === 0 && toUpdateGroupTypes.includes(0)) {
                // console.log('xxxxxxxxxxxxxxxxxxx tree onTypeSelectChange fetchBookmarksPageData0')
                await dispatch(fetchBookmarksPageData0(pageId));
            } else if (value === 1 && toUpdateGroupTypes.includes(1)) {
                await dispatch(fetchBookmarksPageData1(pageId));
            } else if (value === 2 && toUpdateGroupTypes.includes(2)) {
                await dispatch(fetchBookmarksPageData2(pageId));
            }
        }

        const treeData = allDataGroups.find(g => g.value === value)?.data || []
        setTreeData(treeData);
        //切换分组类型时，默认展开该分组下的所有项
        if (expand) {
            setTreeExpandedKeys(value == 0 ? (Array.isArray(expandedKeys) ? expandedKeys : []) :
                treeData.map((item) => item.id)
            );//展开时，展开所有项
        } else {
            if (value == 2) {  //切换到按域名分组 自动展开
                setExpand(true);
                setTreeExpandedKeys(treeData.map((item) => item.id));
            }
            else setTreeExpandedKeys([])//收起时，清空展开项
        }

        dispatch(updateSearchState({ resetSearchResultNum: true }));
        setTreeType(value);
        setGroupType(value);
    }


    useEffect(() => {
        // console.log('>>>>>>>>>>>>>>>>>>>>> tree组件渲染了22, inputValue', inputValue);
        const data = allDataGroups.find(g => g.value === groupType)?.data || []
        if (!inputValue || !inputValue.trim()) {//搜索词为空
            setTreeData(data);
            //搜索清空时不能恢复到收起状态
            if (!expand) setTreeExpandedKeys([])//收起时，清空展开项
        } else {//搜索词不为空
            const result = searchData(inputValue.trim(), data);
            setTreeData(result);
            //展开所有结果
            setTreeExpandedKeys(
                groupType == 0 ? (Array.isArray(expandedKeys) ? expandedKeys : []) :
                    groupType == 1 ? (Array.isArray(dateGroups) ? dateGroups.map((item) => item.id) : []) :
                        (Array.isArray(domainGroups) ? domainGroups.map((item) => item.id) : [])
            );
        }
    }, [inputValue]);//书签页数据发生变化



    //切换隐藏/显示
    /*  useEffect(() => {
         //过滤隐藏的
         if (display) {
             setTreeData(data)
         } else {
             setTreeData(filterTreeData1)
         }
     }, [display]); */


    const onInputChange = (inputValue) => {
        setInputValue(inputValue);
    }
    // const [selectedKeys, setSelectedKeys] = useState(['si180dbs5', 'hndt1j4kw']);

    function getExpandedKeys(parts) {
        // console.log('buildActiveMap path', path);
        // const parts = path.split(',').map(s => s.trim());
        const result = [];
        // 前 n-1 个作为 standard key
        for (let i = 0; i < parts.length - 1; i++) {
            const key = parts.slice(0, i + 1).join(',');
            result[i] = key;
        }
        return result;
    }

    const processString = (input: string): string[] => {
        if (!input) return [];
        const parts: string[] = input.split(',');
        let current: string = '';

        return parts.map((part: string): string => {
            current = current ? `${current},${part}` : part;
            return current;
        });
    };

    /*  const onTreeSelect = (selectedKeys, extra) => {
         // console.log('==========selectedKeys', selectedKeys, extra)
         //回传当前选中项到父组件传递到兄弟组件展示对应的Card和Tab
         setTreeSelected(selectedKeys);
         //高亮选中的key
         setSelectedKeys(selectedKeys);
         // 如果当前是非叶子节点，则展开当前节点
         // （仅适合于不超过2层的树，如果超过2层，需要保留展开该节点的所有祖节点）
         if (!extra.node.props.isLeaf) {
             // setExpandedKeys(selectedKeys);
             const selectedKey: string = selectedKeys[0];
             const stringArray = selectedKey.split(',');
             // const keys = stringArray.map(String);
             // setExpandedKeys(selectedKeys.join(","));
             const output: string[] = processString(selectedKey);
             // console.log('=========onTreeSelect keys output', output);
             // 将 output 中的元素追加到现有 expandedKeys 中，去重保留已有顺序
             setTreeExpandedKeys(prev => {
                 // const prevArr = Array.isArray(prev) ? prev : [];
                 const merged = Array.from(new Set([...prev, ...output]));
                 return merged;
             });
         }
     }
    */


    //入口
    function scrollToAnchor(event, id, path, list: boolean) {
        const paths = !!list ? path + ',' + id + '_copy' : path
        // console.log('111111111111111 scrollToAnchor', id, path, list, paths);
        setTreeSelected(paths);
        if (groupType === 0) {
            scrollToAnchor1(event, path);
            // console.log('sssssssssssssssss', expandedKeys, id);
            if (expandedKeys && expandedKeys.includes(id)) {//有子分组
                if (!treeExpandedKeys.includes(id)) {//当前未展开
                    setTreeExpandedKeys(prev => {
                        const merged = Array.from(new Set([...prev, id]));
                        return merged;
                    });
                } else {//当前已展开
                    setTreeExpandedKeys(prev => {
                        const merged = Array.from(new Set(prev.filter(item => item !== id)));
                        return merged;
                    })
                }
            }
        }

        else if (groupType === 2) {
            scrollToAnchor1(event, path);
            // console.log('groupType', groupType, domainGroups);
            if (!treeExpandedKeys.includes(path)) {
                setTreeExpandedKeys(prev => {
                    const merged = Array.from(new Set([...prev, path]));
                    return merged;
                });
            } else {
                setTreeExpandedKeys(prev => {
                    const merged = Array.from(new Set(prev.filter(item => item !== path)));
                    return merged;
                })
            }
        }

        else if (groupType === 1) {
            scrollToAnchor2(event, path);
            if (path.length === 4) {
                if (!treeExpandedKeys.includes(path)) {
                    setTreeExpandedKeys(prev => {
                        const merged = Array.from(new Set([...prev, path]));
                        return merged;
                    });
                } else {
                    setTreeExpandedKeys(prev => {
                        const merged = Array.from(new Set(prev.filter(item => item !== path)));
                        return merged;
                    });
                }
            }
            // const expandedKeys = getExpandedKeys(path.split(',').map(s => s.trim()));
            // setExpandedKeys(expandedKeys);
        }

    }

    // 使用已预加载的回收站数据在本地展示（不改变 redux.recycleBin.active）
    function showPreloadedRecycleBin() {
        const rbData = Array.isArray(globalState.recycleBin.dataGroups) ? globalState.recycleBin.dataGroups : [];
        setTreeData(rbData);
        setTreeExpandedKeys(Array.isArray(rbData) ? rbData.map((item) => item.id) : []);
        // 设置回收站为激活态，以让界面显示“返回”并保持 redux 状态一致
        dispatch(updateRecycleBinState({ active: true }));
    }

    //按分组
    function scrollToAnchor1(event, path) {
        const pathArr: string[] = path.split(",");
        event.preventDefault(); // 阻止默认的锚点跳转
        const targetElement = document.getElementById(pathArr[0]);
        if (targetElement) {
            targetElement.scrollIntoView({
                behavior: 'smooth' // 可选：平滑滚动
            });
        }
    }


    function onTreeSelect(value, extra) {
        console.log('onTreeSelect', value, extra);
        //回传当前选中项到父组件传递到兄弟组件展示对应的Card和Tab
        /* setTreeSelected(selectedKeys);
        //高亮选中的key
        setSelectedKeys(selectedKeys);*/
        // 如果当前是非叶子节点，则展开当前节点
        // （仅适合于不超过2层的树，如果超过2层，需要保留展开该节点的所有祖节点）
        /* if (!extra.node.props.isLeaf) {
            // setExpandedKeys(selectedKeys);
            console.log('==========selectedKeys', value, extra);
            const selectedKey: string = selectedKeys[0];
            const stringArray = selectedKey.split(',');
            // const keys = stringArray.map(String);
            // setExpandedKeys(selectedKeys.join(","));
            const output: string[] = processString(selectedKey);
            // console.log('=========onTreeSelect keys output', output);
            // 将 output 中的元素追加到现有 expandedKeys 中，去重保留已有顺序
            setTreeExpandedKeys(prev => {
                // const prevArr = Array.isArray(prev) ? prev : [];
                const merged = Array.from(new Set([...prev, ...output]));
                return merged;
            });
        } */
    }

    function changeExpandedKeys(keys, extra) {
        const expanded = extra.expanded;
        if (!expanded) { //收起
            setTreeExpandedKeys(prev => {
                const merged = Array.from(new Set([...prev.filter(key => key !== extra.node.key)]));
                return merged;
            });
        } else {
            setTreeExpandedKeys(prev => {
                const merged = Array.from(new Set([...prev, extra.node.key]));
                return merged;
            });
        }
    }

    function scrollToAnchor2(event, path) {
        event.preventDefault(); // 阻止默认的锚点跳转
        // 若 path 看起来是年份（长度不超过4且为数字），则尝试从 treeData 中找到该年分组
        let targetId = path;
        try {
            if (path && String(path).length <= 4 && /^\d{1,4}$/.test(String(path))) {
                const yearKey = String(path);
                const yearNode = Array.isArray(treeData) ? treeData.find(n => String(n.id) === yearKey) : null;
                if (yearNode) {
                    // 优先使用子项的 path，其次 id
                    const firstChild = yearNode.children[0];
                    targetId = firstChild.path || firstChild.id || firstChild.date || targetId;
                }
            }
        } catch (e) {
            // ignore
        }
        const targetElement = document.getElementById(targetId);
        if (targetElement) {
            targetElement.scrollIntoView({
                // behavior: 'smooth' // 可选：平滑滚动
            });
        }
    }

    const getNodeIcons = (nodeProps: any) => {
        const { children, childrenData, dataRef, isLeaf, isRecycleBin } = nodeProps;
        const nodeIsRecycleBin = isRecycleBin || dataRef?.isRecycleBin;
        const hasChildren = Boolean(
            (Array.isArray(children) && children.length) ||
            (Array.isArray(childrenData) && childrenData.length) ||
            (Array.isArray(dataRef?.children) && dataRef.children.length)
        );

        if (nodeIsRecycleBin) {
            return {
                // switcherIcon: <IconDelete style={{ color: 'var(--color-text-3)' }} />
                switcherIcon: globalState?.recycleBin?.active ? <IconUndo style={{ color: 'var(--color-text-3)' }} />
                    : <IconDelete style={{ color: 'var(--color-text-3)' }} />
            };
        }

        if (isLeaf || !hasChildren) {
            return {
                switcherIcon: <IconDriveFile style={{ color: 'var(--color-text-3)' }} />,
            };
        }

        return {
            switcherIcon: <IconFolder style={{ color: 'var(--color-text-3)' }} />,
        };
    };

    const getTree = (treeData) => {
        // console.log('非展开树被渲染了')
        const autoExpandParent = false;
        return (
            <Tree
                // onSelect={onTreeSelect}
                treeData={treeData}
                autoExpandParent={autoExpandParent}
                showLine={checked}
                // selectedKeys={selectedKeys}
                expandedKeys={treeExpandedKeys}
                onExpand={(keys, extra) => {
                    changeExpandedKeys(keys, extra);
                }}
                onSelect={(value, extra) => {
                    const selectedKey = Array.isArray(value) ? value[0] : value;
                    const nodeIsRecycleBin = extra?.node?.props?.isRecycleBin || extra?.node?.props?.dataRef?.isRecycleBin || selectedKey === RECYCLE_BIN_NODE_ID;
                    // console.log('zzzzzzzzzzzzzzzzzzzzz onSelect recycleActive', nodeIsRecycleBin);
                    if (nodeIsRecycleBin) {
                        const deletedNum = globalState?.recycleBin?.deletedBookmarksNum || 0;
                        const recycleActive = !!globalState?.recycleBin?.active;
                        const preloaded = Array.isArray(globalState?.recycleBin?.dataGroups) && globalState.recycleBin.dataGroups.length > 0;
                        // 仅在当前不是回收站视图时，才激活回收站视图；优先使用已预加载的数据，避免重复请求 dispatch(updateRecycleBinState({ active: true }));
                        if (!recycleActive) {
                            if (deletedNum > 0 && preloaded) {
                                // 如果本地快照与当前已加载数据一致，直接使用预加载数据，否则重新拉取
                                if (deletedNum === lastDeletedRef.current) {
                                    showPreloadedRecycleBin();
                                } else {
                                    dispatch(fetchRecycleBinData(pageId));
                                }
                            } else if (deletedNum > 0) {
                                dispatch(fetchRecycleBinData(pageId));
                            }
                        }
                        return;
                    }
                    // 非回收站节点的选择逻辑（保留原行为）
                }}
                // virtualListProps={{ height: 780 }}
                virtualListProps={{ height: 755 }}
                icons={getNodeIcons}
                fieldNames={{
                    key: 'id',
                    title: 'name',
                }}

                renderExtra={({ bookmarksNum, isRecycleBin }) => {
                    // 当回收站视图被激活（页面显示“返回”）时，不显示任何数量
                    // if (globalState?.recycleBin?.active) return null;
                    return (
                        bookmarksNum > 0 && <span
                            style={{
                                position: 'absolute',
                                right: 8,
                                fontSize: 12,
                                top: 10,
                            }}
                        >{bookmarksNum}</span>
                    );
                }}


                renderTitle={({ id, name, bookmarksNum, pId, path, list, icon, isRecycleBin }) => {

                    const hrefId = pId ? pId : id
                    if (inputValue) {
                        const index = name.toLowerCase().indexOf(inputValue.toLowerCase());
                        if (index === -1) {
                            return <AnchorLink href={`#${hrefId}`} title={
                                <>
                                    {icon ? <img width={16} height={16} src={`${icon}`} alt="icon"></img> : ''}
                                    <span>{name}</span>
                                </>
                            }
                                onClick={(event) => scrollToAnchor(event, `${id}`, `${path}`, list)} />;
                        }

                        const prefix = name.substr(0, index);
                        const suffix = name.substr(index + inputValue.length);

                        return (
                            // <Anchor hash={false} affix={false} animation={false} lineless >
                            <AnchorLink href={`#${hrefId}`} onClick={(event) => scrollToAnchor(event, `${id}`, `${path}`, list)} title=
                                {<>
                                    {icon ? <img width={16} height={16} src={`${icon}`} alt="icon"></img> : ''}
                                    <span>
                                        {prefix}
                                        {/* 匹配词高亮 */}
                                        <span style={{ color: 'var(--color-primary-light-4)' }}>
                                            {name.substr(index, inputValue.length)}
                                        </span>
                                        {suffix}
                                    </span>
                                </>}
                            >
                            </AnchorLink>
                        );
                    }
                    return <AnchorLink href={`#${hrefId}`} title={
                        <>
                            {icon ? <img width={16} height={16} src={`${icon}`}></img> : ''}
                            <span> {name}  </span>
                        </>
                    } onClick={(event) => scrollToAnchor(event, `${id}`, `${path}`, list)} style={{ color: 'var(--color-primary-light-4)' }} />;
                    // return <AnchorLink href={`#${hrefId}`} title={name} style={{ color: 'var(--color-primary-light-4)' }} />;
                }}
            >
                {/* <Anchor hash={false} affix={false} animation={false} lineless ></Anchor> */}
            </Tree >
        );
    }


    function confirm() {
        Modal.confirm({
            title: '清空回收站',
            content:
                '确认清空回收站？此操作会永久删除当前页面的已删除书签，无法恢复。',
            okButtonProps: {
                status: 'danger',
            },
            onOk: async () => {

                try {
                    await dispatch(clearRecycleBinForPage(pageId));
                    Message.success('清空完成!');
                } catch (err) {
                    // ignore
                }
            },
        });
    }

    return (
        <div>
            {/* 设置项 */}
            {/* <div style={{ marginLeft: '5px' }}>
                <Typography.Text>显示连接线</Typography.Text>
                <Switch size='small' style={{ marginLeft: 12 }} checked={checked} onChange={setChecked}></Switch>
            </div> */}
            <div style={{ margin: '2px 0 2px 10px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Typography.Text style={{ color: 'var(--color-text-2)' }}>收起</Typography.Text>
                {/* <Switch size='small' checked={expand} onChange={switchExpand}></Switch> */}
                <Switch size='small' checked={expand} onChange={switchExpand}></Switch>
                <Typography.Text style={{ color: 'var(--color-text-2)' }}>展开</Typography.Text>
                <Select
                    defaultValue={options[0].value}
                    style={{ width: 90 }}
                    size="small"
                    onChange={(value) => onTypeSelectChange(value)}
                >
                    {options.map((option) => (
                        <Option key={option.value} value={option.value}>
                            {option.label}
                        </Option>
                    ))}
                </Select>
            </div>


            {/* 输入搜索框 */}
            <Input.Search
                style={{
                    // marginBottom: 8,
                    maxWidth: 240,
                }}
                allowClear
                value={inputValue}
                placeholder='输入关键词搜索'
                onChange={onInputChange}
            />

            <div style={{ position: 'relative' }}>
                {/* maxHeight: 790, */}
                {/* <div style={{ maxHeight: 520, maxHeight: 790,overflow: 'auto', paddingBottom: 56 }}> */}
                <div style={{ overflow: 'auto', paddingBottom: 40 }}>
                    {getTree(treeDataWithRecycleBin)}
                </div>
                {/* 回收站固定在底部的条，避免随树滚动被隐藏 */}
            </div>


            <div
                style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    // padding: '4px 12px',
                    padding: '4px 12px 4px 0px',
                    background: 'var(--color-bg-1)',
                    borderTop: '1px solid var(--color-border-2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-2)' }}>
                    <span
                        style={{ fontSize: 14, cursor: 'pointer', padding: '4px 8px', borderRadius: 4 }}
                        onClick={async () => {
                            // 退出回收站视图：先强制从 DB 拉取最新页面数据，确保 dataGroups/expandedKeys 与删除操作同步
                            // 以防当前有被删除书签的情况，所以当切换回redux快照数据的时候，应重新从db加载数据
                            // 时序：
                            // 书签被删除-- card数据局部更新+redux未同步（toUpdateGroupTypes标记） -- 回收站视图 -- 返回 -- 还原主页数据(先拉取更新)
                            if (globalState?.recycleBin?.active) {
                                try {
                                    // 仅在 Redux 标记需要更新该分组类型（包含 0）时，从 DB 强制拉取最新页面数据
                                    if (pageId != null && Array.isArray(toUpdateGroupTypes) && toUpdateGroupTypes.includes(0)) {
                                        await dispatch(fetchBookmarksPageData(pageId));
                                    }
                                } catch (e) {
                                    // ignore
                                }
                                // 再退出回收站，让 useEffect 使用 redux 中最新的 dataGroups 恢复 tree
                                dispatch(updateRecycleBinState({ active: false }));
                                if (typeof setTreeType === 'function') setTreeType(0);
                                setGroupType(0);
                                setTreeExpandedKeys(Array.isArray(expandedKeys) ? expandedKeys : []);
                            } else {
                                const deletedNum = globalState?.recycleBin?.deletedBookmarksNum || 0;
                                const preloaded = Array.isArray(globalState?.recycleBin?.dataGroups) && globalState.recycleBin.dataGroups.length > 0;
                                if (deletedNum > 0) {
                                    if (preloaded) {
                                        if (deletedNum === lastDeletedRef.current) {
                                            showPreloadedRecycleBin();
                                        } else {
                                            dispatch(fetchRecycleBinData(pageId)).then((res) => {
                                                try {
                                                    const newNum = (res && res.deletedBookmarksNum) || deletedNum;
                                                    lastDeletedRef.current = newNum;
                                                } catch (e) { }
                                            });
                                        }
                                    } else {
                                        dispatch(fetchRecycleBinData(pageId)).then((res) => {
                                            try {
                                                const newNum = (res && res.deletedBookmarksNum) || deletedNum;
                                                lastDeletedRef.current = newNum;
                                            } catch (e) { }
                                        });
                                    }
                                }
                            }
                        }}
                    >
                        {globalState?.recycleBin?.active ?
                            <span> <IconUndo></IconUndo>  <span style={{ paddingLeft: 10 }}> 返回 </span> </span> :
                            <span> <IconDelete></IconDelete ><span style={{ paddingLeft: 10 }}> 回收站 </span></span>}
                    </span>

                    {/* 清空按钮：仅在回收站激活且不为空时显示 */}
                    {globalState?.recycleBin?.active && (globalState?.recycleBin?.deletedBookmarksNum || 0) > 0 && (
                        <span
                            style={{ fontSize: 13, cursor: 'pointer', padding: '4px 8px', borderRadius: 4, color: 'var(--color-danger)' }}
                            onClick={confirm}
                        ><IconEmpty />清空</span>
                    )}
                </div>

                {!globalState?.recycleBin?.active && <span
                    // style={{ fontSize: 12, color: 'var(--color-text-3)' }}
                    style={{
                        cursor: (globalState?.recycleBin?.deletedBookmarksNum || 0) > 0 ? 'pointer' : 'default',
                        padding: '4px 8px', borderRadius: 4, color: (globalState?.recycleBin?.deletedBookmarksNum || 0) > 0 ? 'inherit' : 'var(--color-text-3)'
                    }}
                    onClick={() => {
                        const deletedNum = globalState?.recycleBin?.deletedBookmarksNum || 0;
                        if (deletedNum > 0) {
                            const preloaded = Array.isArray(globalState?.recycleBin?.dataGroups) && globalState.recycleBin.dataGroups.length > 0;
                            if (preloaded) {
                                showPreloadedRecycleBin();
                            } else {
                                dispatch(fetchRecycleBinData(pageId));
                            }
                        }
                    }}
                >
                    {globalState?.recycleBin?.deletedBookmarksNum || 0}
                </span>
                }
                {/*  <div>
                    {globalState?.recycleBin?.active ? (
                        <span
                            style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: 4 }}
                        >
                            返回
                        </span>
                    ) : (
                        <span
                            style={{ cursor: (globalState?.recycleBin?.deletedBookmarksNum || 0) > 0 ? 'pointer' : 'default', padding: '4px 8px', borderRadius: 4, color: (globalState?.recycleBin?.deletedBookmarksNum || 0) > 0 ? 'inherit' : 'var(--color-text-3)' }}
                        >
                            进入回收站
                        </span>
                    )}
                </div> */}
            </div>
        </div>
    );
}

export default App;
