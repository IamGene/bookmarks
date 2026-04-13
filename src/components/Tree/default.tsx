import { useState, useEffect, useMemo } from 'react';
import { Tree, Switch, Input, Typography, Anchor, Select, Message, Space } from '@arco-design/web-react';
const AnchorLink = Anchor.Link;

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
function App({ setTreeSelected, data }) {
    //所有树数据
    const [inputValue, setInputValue] = useState(null);

    //搜索输入内容
    const [treeData, setTreeData] = useState(data);
    const [treeExpandedKeys, setTreeExpandedKeys] = useState([]);
    const [dataExpandedKeys, setDataExpandedKeys] = useState([]);

    const [checked, setChecked] = useState(true);
    const [expand, setExpand] = useState(false);

    const switchExpand = () => {
        if (expand) { //当前是展开，切换为收起
            setTreeExpandedKeys([])//收起时，清空展开项
        } else {
            setTreeExpandedKeys(dataExpandedKeys)//展开时，展开所有项
        }
        setExpand(!expand);
    }

    useEffect(() => {
        // console.log('>>>>>>>>>>>>>>>>> expandedKeys useEffect', expandedKeys);
        setTreeData(data);
        if (data.length > 0) {
            const expandedKeys = data.filter(item => item.children && item.children.length > 0).map(g => g.id);
            console.log('>>>>>>>>>>>>>>>>>>>>> index useEffect expandedKeys', expandedKeys);
            setDataExpandedKeys(expandedKeys);
        }
        // setTreeExpandedKeys(expandedKeys);
    }, [data]);

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



    useEffect(() => {
        // console.log('>>>>>>>>>>>>>>>>>>>>> tree组件渲染了22, inputValue', inputValue);
        if (!inputValue || !inputValue.trim()) {//搜索词为空
            setTreeData(data);
            //搜索清空时不能恢复到收起状态
            if (!expand) setTreeExpandedKeys([])//收起时，清空展开项
        } else {//搜索词不为空
            const result = searchData(inputValue.trim(), data);
            setTreeData(result);
            //展开所有结果
            setTreeExpandedKeys(dataExpandedKeys);
        }
    }, [inputValue]);//书签页数据发生变化


    const onInputChange = (inputValue) => {
        setInputValue(inputValue);
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
        scrollToAnchor1(event, path);
        if (dataExpandedKeys && dataExpandedKeys.includes(id)) {//有子分组
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


    const getTree1 = (treeData) => {
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
                    // console.log('aaaaaaaaaaaaaaaaaaaaaaaaas', value, extra);
                    // setSelectedKeys(value);
                    // onTreeSelect(value, extra);
                }}
                virtualListProps={{ height: 780 }}
                fieldNames={{
                    key: 'id',
                    title: 'name',
                }}
                renderTitle={({ id, name, pId, path, list, icon }) => {
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

            {getTree1(treeData)}

            {/*   <Tree
                fieldNames={{
                    key: 'path',
                    // key: 'id',
                    title: 'name',
                    // isLeaf: ''
                }}
                treeData={treeData}
                showLine={checked}>
                selectedKeys={selectedKeys}
                actionOnClick="expand"
                expandedKeys={treeExpandedKeys}
            </Tree> */}
        </div>
    );
}

export default App;
