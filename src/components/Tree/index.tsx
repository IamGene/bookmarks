import { useState, useEffect } from 'react';
import { Tree, Switch, Input, Typography, Anchor, Select, Message, Space } from '@arco-design/web-react';
import { RootState } from '@/store';
import { useSelector } from 'react-redux';

const AnchorLink = Anchor.Link;
const TreeNode = Tree.Node;


const Option = Select.Option;
const options = ['按分组', '按时间'];
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
function App({ data, setTreeSelected, setTreeType, treeSelectedKeys, inputValue, setTreeInputValue }) {
    //所有树数据
    const [treeData, setTreeData] = useState(data);
    const globalState = useSelector((state: any) => state.global);
    const { dateGroups, groups1 } = globalState;
    // console.log('7777777777777777 Tree组件 ', groups1);

    //搜索输入内容
    const [groupType, setGroupType] = useState('按分组');

    const [checked, setChecked] = useState(true);
    const [expand, setExpand] = useState(false);

    const [tempExpand, setTempExpand] = useState(false);

    const [expandedKeys, setExpandedKeys] = useState([]);

    const switchExpand = () => {
        if (expand) { //当前是展开，切换为收起
            setExpandedKeys([])//收起时，清空展开项
        }
        setExpand(!expand)
    }

    /*  useEffect(() => {
     // let filteredData = filterChildrenArrayByPath(data);
     // setTreeData(filteredData);
     if (!inputValue || !inputValue.trim()) {
         setTempExpand(false);
         setTreeData(data);
     } else {
         let searchData1 = searchData(inputValue, data);
         setTreeData(searchData1);
         console.log('inputValue useEffect', inputValue, data, searchData1);
         if (searchData1.length) {
             setTempExpand(true);
         }
     }
 }, [inputValue]);
*/

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
        setTreeInputValue(inputValue)
    }
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


    const onTreeSelect = (selectedKeys, extra) => {
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
            setExpandedKeys(prev => {
                // const prevArr = Array.isArray(prev) ? prev : [];
                const merged = Array.from(new Set([...prev, ...output]));
                return merged;
            });
        }
    }

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

    useEffect(() => {
        // console.log('>>>>>>>>>>>>>>>>> treeData useEffect', data);
        // let filteredData = filterChildrenArrayByPath(data);
        setTreeData(data);
        if (!inputValue || !inputValue.trim()) {
            setTempExpand(false);
        } else if (data.length) {
            setTempExpand(true);
        }
    }, [data]);

    useEffect(() => {
        // 选中节点
        // console.log('treeSelectedKeys', treeSelectedKeys)
        setSelectedKeys(treeSelectedKeys)
        // 展开选中的节点
        if (treeSelectedKeys.length) {
            const arr = treeSelectedKeys[0].split(',');
            const expandKeys = [arr[0] + '']
            setExpandedKeys(expandKeys)
        }
    }, [treeSelectedKeys]);

    // 选中项
    const getAutoExpandTree = (treeData) => {
        // console.log('展开树被渲染了')
        return (
            <Tree
                treeData={treeData}
                showLine={checked}
                selectedKeys={selectedKeys}
                onSelect={onTreeSelect}
                // expandedKeys={expandedKeys}
                fieldNames={{
                    key: 'path',
                    // key: 'id',
                    title: 'name',
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
                            <AnchorLink href={`#${hrefId}`} onClick={(event) => scrollToAnchor(event, `${path}`)} title={<span>
                                {prefix}
                                <span style={{ color: 'var(--color-primary-light-4)' }}>
                                    {name.substr(index, inputValue.length)}
                                </span>
                                {suffix}
                            </span>} >
                            </AnchorLink>
                        );
                    }
                    // return <AnchorLink hash={false} href={`#${hrefId}`} onClick={(event) => scrollToAnchor(event, `${path}`)} title={name} />;
                    return <AnchorLink href={`#${hrefId}`} onClick={(event) => scrollToAnchor(event, `${path}`)} title={name} />;
                }}
            >
                <Anchor animation affix={false} hash={false} lineless></Anchor>
            </Tree>

        );
    }



    function onTypeSelectChange(value) {
        /* Message.info({
            content: `You select ${value}.`,
            showIcon: true,
        }); */
        setTreeType(value);
        setGroupType(value);
        if (value === '按分组') {
            setTreeData(data);
        } else {
            setTreeData(dateGroups);
        }
    }

    //入口
    function scrollToAnchor(event, path) {
        if (groupType === '按分组') {
            scrollToAnchor1(event, path);
        } else {
            scrollToAnchor2(event, path);
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
                treeData={treeData}
                autoExpandParent={autoExpandParent}
                showLine={checked}
                onSelect={onTreeSelect}

                expandedKeys={expandedKeys}
                onExpand={(keys, extra) => {
                    // console.log(keys, extra);
                    setExpandedKeys(keys);
                }}

                selectedKeys={selectedKeys}
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
                    defaultValue={options[0]}
                    style={{ width: 90 }}
                    size="small"
                    onChange={(value) => onTypeSelectChange(value)}
                >
                    {options.map((option) => (
                        <Option key={option} value={option}>
                            {option}
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
                // onChange={setInputValue}
                onChange={onInputChange}
            />

            {/* 展开/非展开树 */}
            {/* 1.设置为展开或(收起但)有搜索结果时<展开> */}
            {(expand || tempExpand) && getAutoExpandTree(treeData)}
            {/* 2.设置为收起且没有搜索结果时<收起> */}
            {(!expand && !tempExpand) && getTree(treeData)}
        </div>
    );
}

export default App;
