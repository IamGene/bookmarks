import { useState, useEffect } from 'react';
import { Tree, Switch, Input, Typography, Anchor } from '@arco-design/web-react';
import { set } from 'mobx';
const AnchorLink = Anchor.Link;
const TreeNode = Tree.Node;

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
    // 递归处理数组中的每个对象
    return arr.map(item => filterChildrenByPath(item));
}

function filterChildrenByPath(data) {
    if (!data.children || !Array.isArray(data.children)) return data;
    // 只保留 path 不同的 children
    data.children = data.children.filter(child => child.path !== data.path);
    // 递归处理每个子元素
    data.children = data.children.map(child => filterChildrenByPath(child));
    return data;
} */

function filterChildrenArrayByPath(arr) {
    // 返回一个新数组，避免修改原数组
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
        .filter(child => child.path !== data.path)
        .map(child => filterChildrenByPath(child));

    return newData;
}

// 示例用法
// const filteredArray = filterChildrenArrayByPath(jsonArray);
// function App({ data, setTreeSelected, treeSelectedKeys, treeInputValue, setTreeInputValue, setTreeSearchData }) {
function App({ data, setTreeSelected, treeSelectedKeys, inputValue, setTreeInputValue }) {
    //所有树数据
    const [treeData, setTreeData] = useState(data);
    //搜索输入内容
    // const [inputValue, setInputValue] = useState('');
    // const [inputValue, setInputValue] = useState(treeInputValue);

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

    const onInputChange = (inputValue) => {
        setTreeInputValue(inputValue)
    }
    const [selectedKeys, setSelectedKeys] = useState([]);

    const onTreeSelect = (selectedKeys, extra) => {
        console.log('==========selectedKeys', selectedKeys, extra)
        //回传当前选中项到父组件传递到兄弟组件展示对应的Card和Tab
        setTreeSelected(selectedKeys);
        //高亮选中的key
        setSelectedKeys(selectedKeys);
        // 如果当前是非叶子节点，则展开当前节点
        // （仅适合于不超过2层的树，如果超过2层，需要保留展开该节点的所有祖节点）
        if (!extra.node.props.isLeaf) {
            // setExpandedKeys(selectedKeys);
            const stringArray = selectedKeys[0].split(',');
            // const activeCardTab: number[] = stringArray.map(Number);
            const keys = stringArray.map(String);
            // console.log('=========onTreeSelect keys', keys);
            if (keys.length > 1) {
                setExpandedKeys([selectedKeys[0], keys[0]]);
            } else {
                setExpandedKeys(selectedKeys);
            }
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
        // console.log('treeData useEffect', data);
        let filteredData = filterChildrenArrayByPath(data);
        setTreeData(filteredData);
        if (!inputValue || !inputValue.trim()) {
            setTempExpand(false);
        } else if (data.length) {
            setTempExpand(true);
        }
    }, [data]);

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

                fieldNames={{
                    key: 'path',
                    title: 'name',
                }}

                renderTitle={({ id, name, pId }) => {
                    const hrefId = pId ? pId : id
                    if (inputValue) {
                        const index = name.toLowerCase().indexOf(inputValue.toLowerCase());
                        if (index === -1) {
                            return <AnchorLink href={`#${hrefId}`} title={name} />;;
                        }

                        const prefix = name.substr(0, index);
                        const suffix = name.substr(index + inputValue.length);

                        return (
                            <AnchorLink href={`#${hrefId}`} title={<span>
                                {prefix}
                                <span style={{ color: 'var(--color-primary-light-4)' }}>
                                    {name.substr(index, inputValue.length)}
                                </span>
                                {suffix}
                            </span>} >
                            </AnchorLink>
                        );
                    }
                    return <AnchorLink href={`#${hrefId}`} title={name} />;
                }}
            >
                <Anchor animation affix={false} hash={false} lineless></Anchor>
            </Tree>

        );
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
                    title: 'name',
                    // isLeaf: ''
                }}

                renderTitle={({ id, name, pId }) => {
                    const hrefId = pId ? pId : id
                    if (inputValue) {
                        const index = name.toLowerCase().indexOf(inputValue.toLowerCase());

                        if (index === -1) {
                            return <AnchorLink href={`#${hrefId}`} title={name} />;
                        }

                        const prefix = name.substr(0, index);
                        const suffix = name.substr(index + inputValue.length);

                        return (
                            <AnchorLink href={`#${hrefId}`} title={<span>
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
                    return <AnchorLink href={`#${hrefId}`} title={name} style={{ color: 'var(--color-primary-light-4)' }} />;
                }}
            >
                <Anchor hash={false} affix={false} animation lineless ></Anchor>
            </Tree>
        );
    }

    return (
        <div>
            {/* 设置项 */}
            {/* <div style={{ marginLeft: '5px' }}>
                <Typography.Text>显示连接线</Typography.Text>
                <Switch size='small' style={{ marginLeft: 12 }} checked={checked} onChange={setChecked}></Switch>
            </div> */}
            <div style={{ marginLeft: '15px', fontSize: '14px' }}>
                <Typography.Text style={{ color: 'var(--color-text-2)' }}>收起</Typography.Text>
                <Switch size='small' style={{ marginLeft: 12, marginRight: 12 }} checked={expand} onChange={switchExpand}></Switch>
                <Typography.Text style={{ color: 'var(--color-text-2)' }}>展开</Typography.Text>
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
