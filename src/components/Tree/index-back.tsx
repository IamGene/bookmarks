import { useState, useEffect, useMemo } from 'react';
import { Tree, Switch, Input, Typography, Anchor, Select, Message, Space } from '@arco-design/web-react';
import { RootState } from '@/store';
import { useDispatch, useSelector } from 'react-redux';
import { fetchBookmarksPageData0, fetchBookmarksPageData1, fetchBookmarksPageData2 } from '@/store/modules/global';
const AnchorLink = Anchor.Link;
const TreeNode = Tree.Node;


const Option = Select.Option;
const options = [
    { label: '按分组', value: 0 },
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

    const [pageId, setPageId] = useState(null);
    const [inputValue, setInputValue] = useState(null);
    const globalState = useSelector((state: any) => state.global);
    const { dateGroups, dataGroups, expandedKeys, domainGroups, toUpdateGroupTypes } = globalState;
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
        if (dataGroups && dataGroups.length > 0) {
            setPageId(dataGroups[0].pageId);
        }
        setTreeData(data);
    }, [allDataGroups]);//书签页数据发生变化


    //搜索输入内容
    const [groupType, setGroupType] = useState(options[0].value);
    const [treeData, setTreeData] = useState(dataGroups);
    // console.log('>>>>>>>>>>>>>>>>>>>>> tree组件渲染了11, treeData', expandedKeys);
    const [checked, setChecked] = useState(true);
    const [expand, setExpand] = useState(false);
    // const [tempExpand, setTempExpand] = useState(false);
    const [treeExpandedKeys, setTreeExpandedKeys] = useState([]);

    const switchExpand = () => {
        if (expand) { //当前是展开，切换为收起
            setTreeExpandedKeys([])//收起时，清空展开项
        } else {
            if (groupType === 0) {
                setTreeExpandedKeys(expandedKeys)//展开时，展开所有项
            } else {
                setTreeExpandedKeys(treeData.map((item) => item.id))//展开时，展开所有项
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
                await dispatch(fetchBookmarksPageData0(pageId));
            } else if (value === 1 && toUpdateGroupTypes.includes(1)) {
                await dispatch(fetchBookmarksPageData1(pageId));
            } else if (value === 2 && toUpdateGroupTypes.includes(2)) {
                await dispatch(fetchBookmarksPageData2(pageId));
            }
        }
        setTreeData(allDataGroups.find(g => g.value === value)?.data || []);
        //切换分组类型时，默认展开该分组下的所有项
        if (expand) {
            setTreeExpandedKeys(value == 0 ? expandedKeys :
                value == 1 ? dateGroups.map((item) => item.id) :
                    domainGroups.map((item) => item.id)//展开时，展开所有项
            )
        } else {
            setTreeExpandedKeys([])//收起时，清空展开项
        }
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
            setTreeExpandedKeys(groupType == 0 ? expandedKeys :
                groupType == 1 ?
                    dateGroups.map((item) => item.id) ://展开时，展开所有项
                    domainGroups.map((item) => item.id));
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
    const [selectedKeys, setSelectedKeys] = useState([]);

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
    /*  useEffect(() => {
         console.log('treeData useEffect', data, inputValue);
         let filteredData = filterChildrenArrayByPath(data);
         setTreeData(filteredData);
 
         if (!inputValue || !inputValue.trim()) {
             setTempExpand(false);
         }
         else if (data.length) {
             setTempExpand(true);
         }
     }, [data, inputValue]); */


    /*   useEffect(() => {
          // 选中节点
          // console.log('treeSelectedKeys', treeSelectedKeys)
          setSelectedKeys(treeSelectedKeys);
          // 展开选中的节点
          if (treeSelectedKeys.length) {
              const arr = treeSelectedKeys[0].split(',');
              const expandKeys = [arr[0] + '']
              setTreeExpandedKeys(expandKeys)
          }
      }, [treeSelectedKeys]); */



    //入口
    function scrollToAnchor(event, path) {
        // const paths = getExpandedKeys(path.split(',').map(s => s.trim()))
        setTreeSelected(path);
        // setSelectedKeys(path);

        if (groupType === 0) {
            // console.log('aaaaaaaaaaaaaaaaaaaaa scrollToAnchor', event, path, groupType, path);
            scrollToAnchor1(event, path);
        }
        else if (groupType === 2) {
            scrollToAnchor1(event, path);
        }
        else if (groupType === 1) {
            // console.log('groupType', groupType, path);
            scrollToAnchor2(event, path);
            /* if (path.length == 4) {
                if (!expandedKeys.includes(path)) {
                    setExpandedKeys(prev => {
                        const merged = Array.from(new Set([...prev, path]));
                        return merged;
                    });
                }
            } */
            // const expandedKeys = getExpandedKeys(path.split(',').map(s => s.trim()));
            // setExpandedKeys(expandedKeys);
        }
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



    function onTreeSelect(selectedKeys, info) {
        console.log('onTreeSelect', selectedKeys, info);
        //回传当前选中项到父组件传递到兄弟组件展示对应的Card和Tab
        setTreeSelected(selectedKeys);
        //高亮选中的key
        setSelectedKeys(selectedKeys);
        // 如果当前是非叶子节点，则展开当前节点
        // （仅适合于不超过2层的树，如果超过2层，需要保留展开该节点的所有祖节点）
        if (!info.node.props.isLeaf) {
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
                behavior: 'smooth' // 可选：平滑滚动
            });
        }
    }

    const getTree = (treeData) => {
        // console.log('非展开树被渲染了')
        const autoExpandParent = false;
        return (
            <Tree
                // onSelect={onTreeSelect}
                treeData={treeData}
                autoExpandParent={autoExpandParent}
                showLine={checked}
                selectedKeys={selectedKeys}
                actionOnClick="expand"
                onExpand={(keys, extra) => {
                    changeExpandedKeys(keys, extra);
                }}
                expandedKeys={treeExpandedKeys}
                onSelect={(value, extra) => {
                    console.log('aaaaaaaaaaaaaaaaaaaaaaaaas', value, extra);
                    setSelectedKeys(value);
                }}
                fieldNames={{
                    key: 'path',
                    // key: 'id',
                    title: 'name',
                    // isLeaf: ''
                }}

                renderTitle={({ id, name, pId, path }) => {
                    const hrefId = pId ? pId : id
                    if (inputValue) {
                        const index = name.toLowerCase().indexOf(inputValue.toLowerCase());
                        if (index === -1) {
                            return <AnchorLink href={`#${hrefId}`} title={name} onClick={(event) => scrollToAnchor(event, `${path}`)} />;
                        }

                        const prefix = name.substr(0, index);
                        const suffix = name.substr(index + inputValue.length);

                        return (
                            // <Anchor hash={false} affix={false} animation={false} lineless >
                            <AnchorLink href={`#${hrefId}`} onClick={(event) => scrollToAnchor(event, `${path}`)} title={<span>
                                {prefix}
                                {/* 匹配词高亮 */}
                                <span style={{ color: 'var(--color-primary-light-4)' }}>
                                    {name.substr(index, inputValue.length)}
                                </span>
                                {suffix}
                            </span>} >
                            </AnchorLink>
                        );
                    }
                    return <AnchorLink href={`#${hrefId}`} title={name} onClick={(event) => scrollToAnchor(event, `${path}`)} style={{ color: 'var(--color-primary-light-4)' }} />;
                    // return <AnchorLink href={`#${hrefId}`} title={name} style={{ color: 'var(--color-primary-light-4)' }} />;
                }}
            >
                {/* <Anchor hash={false} affix={false} animation={false} lineless ></Anchor> */}
            </Tree >
        );
    }


    const [treeData1, setTreeData1] = useState(TreeData1);
    const [checked1, setChecked1] = useState(true);
    const getTree1 = (treeData) => {
        // console.log('非展开树被渲染了')
        const autoExpandParent = false;
        return (
            <div>
                <div>
                    <Typography.Text>showLine</Typography.Text>
                    <Switch style={{ marginLeft: 12 }} checked={checked1} onChange={setChecked1}></Switch>
                </div>
                <Tree defaultSelectedKeys={['0-0-1']} treeData={treeData1} showLine={checked1}></Tree>
            </div>
        );
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
                    marginBottom: 8,
                    maxWidth: 240,
                }}
                allowClear
                value={inputValue}
                placeholder='输入关键词搜索'
                onChange={onInputChange}
            />

            {/* {getTree(treeData)} */}
            {getTree1(treeData)}
        </div>
    );
}

export default App;
