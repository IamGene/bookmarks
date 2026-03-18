import React, { useState, useEffect } from 'react';
import { Tabs, Dropdown, Menu, Checkbox, Button, } from '@arco-design/web-react';
import MultiSelectCheckBox from './CheckBox';
const TabPane = Tabs.TabPane;

interface Props {
    data: any;
    currentPath: string;
    level: number;
    RenderNode: Function;
    handleAddTab: Function;
    onTabChange: Function;
    activeTab: any;
    onInputChange: Function;
    searchInput: string;
    // resort: boolean;
    // globalActiveTabId: string;
    // onClickSort: Function;
    determinShowTabOrNot: Function;
    WrapTabNode: any;
    moveTabNode: Function;
    onTabMouseEnter?: (child: any, e?: React.MouseEvent) => void;
    // onClickSearchMenuItem: any;
    searching: boolean;
    dataType: number;
    // showItem
    // searchResult: any[];
    // cardData: any;
    // currentSearch: any;
    activeCardTab: string[];
    tabMore: Function;
    searchTabMore: Function;
    showItem: boolean;
    searchTabKey: any;
    multiSelectMap: Record<string, boolean>;// selectedMap: any;
    selectedMap?: Record<string, string[]>;
    activeMap?: Record<string, string>;
    onSelectedMapChange?: (nodeKey: string, ids: string[]) => void;
    renderContent: (child: any, idx: number, operation?: string) => React.ReactNode;
    renderSearchContent: (operation?: string) => React.ReactNode;
}


export default function TabsContainer(props: Props) {
    const {
        data,
        handleAddTab,
        onTabChange,
        multiSelectMap,
        activeTab,
        level,
        activeCardTab,
        // resort,
        // onClickSort,
        // determinShowTabOrNot,
        // searchResult,
        // onInputChange,
        // searchInput,
        // cardData,
        // showItem,
        // currentSearch,//当前card搜索
        WrapTabNode,
        moveTabNode,
        searching,
        dataType,
        tabMore,
        searchTabMore,
        searchTabKey,
        // onClickSearchMenuItem,
        // tabMouseEnter,
        renderContent,
        renderSearchContent,
    } = props;

    const [hoveredId, setHoveredId] = useState<string | null>(null);


    function handleTabMouseEnter(child: any, entering: boolean, e?: React.MouseEvent) {
        // entering: true 表示悬浮进入，false 表示离开
        // console.log('handleTabMouseEnter, child', child, ' entering=', entering);
        try {
            const childIsArray = Array.isArray(child);
            if (childIsArray) {//搜索结果tab
                // console.log('handleTabMouseEnter: child is an array');
                // 当 child 为数组时，避免访问 .id，保持 hoveredId 为 null
                setHoveredId(entering ? 'searchResultTab' : null);
            } else {
                setHoveredId(entering ? child.id : null);
            }
        } catch (err) {
            // ignore
        }
    }

    // const multiSelect = !!multiSelectMap[node.id];
    const children = [...data.children];
    // console.log('TabsContainer render, data.name=', data.name, ' children=', children);
    if (children.length > 0 && !searching) {//非搜索，按原始顺序，排序，保持稳定性；搜索时有结果的排在前面，方便选择activeTab
        children.sort((a, b) => ((a.order ?? a.addDate ?? 0) - (b.order ?? b.addDate ?? 0)));
    }

    // function processBeforeRender(item: any, operation?: string) {
    function processBeforeRender(item: any, idx?: number) {
        // tree选中有复制子分组的父分组，且只有复制分组包含所有结果,将书签数据上提到原始分组
        if (!searching && item.children && Array.isArray(item.children) && item.children.length > 0) {
            const children = [...item.children];
            children.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));//按原来的顺序排列
            return {
                ...item,
                children: children//children为空，就会渲染自身的searchResult(所有子分组的searchResult的汇总) RenderNode
            }
        }

        //选中的tree节点paths(activeCardTab)不包含tab.id(index === -1),或选中的tree节点刚好与tab.id
        //或 const yes = searching && item.id === activeTab && (activeCardTab.length == 0 || !(index > -1 && index < activeCardTab.length - 1)); //
        const totalMatchCount = item.totalMatchCount;
        const index = activeCardTab.indexOf(item.id);
        const yes = searching && (activeCardTab.length == 0 || index === -1 || index === activeCardTab.length - 1); //Tree中当前node的子节点未被选中的情况下

        if (yes && totalMatchCount > 0 && item.children && item.children.length > 1) {//包括子分组和复制分组（全部搜索结果）？
            const res = item.children.filter(item1 => { // 复制子分组包含全部搜索结果
                return item1.copy && item1.totalMatchCount == totalMatchCount;
            });
            if (res.length > 0) {
                return {
                    ...item,
                    children: []
                }
            }
        }
        return item;
    }

    // selectedMap 来自父组件，onSelectedMapChange 用于通知父组件更新
    const { selectedMap, onSelectedMapChange } = props as any;

    const [currentTab, setCurrentTab] = useState<string>(activeTab ? activeTab : data.children[0].id);

    useEffect(() => {
        /* if (data.id === '4hzz2ngtw') {
            console.log('aaaaaaaaaaaaaaaaaaaaa TabsContainer useEffect, activeTab=', activeTab, ' currentTab=', currentTab, ' searchTabKey=', searchTabKey, ' searching=', searching);
        } */
        //从非搜索切换到搜索 只有第一层tabs才有搜索结果tab
        if (searching && !data.pId) {
            setCurrentTab(searchTabKey);
        } else {
            setCurrentTab(activeTab || data.children[0].id);
        }
        // console.log('TabsContainer useEffect, activeTab=', activeTab, ' currentTab=', currentTab, ' searchTabKey=', searchTabKey, ' searching=', searching);
    }, [searching]);


    const [direction, setDirection] = useState('horizontal');

    const showExtra = () => {
        if (!!multiSelectMap[currentTab]) {//当前tab开启多选
            return currentTab === searchTabKey //肯定是有搜索结果的，因为多选按钮只在有搜索结果时才显示
                // || (data.children && data.children.filter((child) => (child.id === currentTab) && child.bookmarks && child.bookmarks.length > 0).length > 0);
                || (data.children && data.children.filter((child) => (child.id === currentTab)).length > 0);
        }
        return false;
    }


    return (
        <Tabs
            editable
            type="card-gutter"
            showAddButton={dataType == 0}
            onAddTab={() => handleAddTab && handleAddTab(data)}
            onChange={(key) => {
                // console.log('aaaaaaaaaaaaaaa TabsContainer onChange, key=', key);
                setCurrentTab(key);//设置当前选中的tab，控制多选按钮的显示
                onTabChange && onTabChange(key, props.data, props.currentPath)
            }}
            overflow={"scroll"}
            activeTab={activeTab ? activeTab : data.children[0].id}
            deleteButton={<></>}//覆盖原有的关闭图标
            // Check All Inverse Check

            extra={
                showExtra() &&
                <MultiSelectCheckBox
                    data={data}
                    searching={searching}
                    currentTab={currentTab}
                    // forward nodeKey and ids
                    selectedMapChange={(nodeKey: string, ids: string[]) => onSelectedMapChange && onSelectedMapChange(nodeKey, ids)}
                    selectedMap={selectedMap}
                    activeMap={props.activeMap}
                />
            }
        >
            {/*  {resort && (
                <TabPane isActive key={'0'}
                    title={
                        <Dropdown
                            position='bottom'
                            droplist={
                                <Menu mode='pop' onClickMenuItem={(k) => onClickSort && onClickSort(k)}>
                                    {['保存', '取消'].map((item, index) => (
                                        <Menu.Item key={index.toString()} >{item}</Menu.Item>
                                    ))}
                                </Menu>
                            }
                            trigger="click"
                        >
                            <IconCheck />
                        </Dropdown>
                    }>
                </TabPane>
            )}
 */}
            {/* <span onMouseEnter={(e) => handleTabMouseEnter(child, true, e)} onMouseLeave={(e) => handleTabMouseEnter(child, false, e)}> */}
            {/* {data.children && data.children.map((child: any, idx: number) => ( */}
            {
                children && children.map((child: any, idx: number) => (
                    // determinShowTabOrNot(child) && (
                    //版本B:全部根据情况显示
                    //a.搜索：有结果或Tree节点选中时显示该Tab；b.非搜索：全部显示
                    (searching && (child.totalMatchCount > 0 || activeCardTab.includes(child.id))) || !searching) &&
                    // onMouseEnter={(e) => handleTabMouseEnter(child, e)}//鼠标移近该tab
                    // style={{ display: 'block', width: '100%' }} style={{ display: 'inline-block' }}
                    <TabPane
                        key={child.id}
                        title={
                            // <span>元素包裹解决了鼠标移近tabs展开menu菜单而不是移近tab标题才展开的问题，
                            //搭配样式修改：增加了pages/navigate/user/index.css的 card-tab(搜索,注释) 部分对arco原生样式的覆盖
                            //修改方案是: 1.将删除图标(隐藏)的margin-left改为0,从而让标题的左右两边距离tab边界的宽度padding相等；
                            //2.tab标题的padding改为0，使得arco自动生成的title元素(span)与tab的宽度相等；
                            //3.在真正的tab标题上包一个span(能触发鼠标悬浮事件的)，设置其padding和display:block，使鼠标移近整个tab标题区域都能触发onMouseEnter事件。

                            // .arco-tabs-header-title-text 增加样式：width:100%
                            // .tabs-header-title 去掉样式 padding 4px 16px 
                            //.arco-tabs-header-title-editable 去掉样式 padding-right:12px;
                            // <span style={{ display: 'block', padding: '4px 16px 4px 16px' }} onMouseEnter={(e) => handleTabMouseEnter(child, true, e)} onMouseLeave={(e) => handleTabMouseEnter(child, false, e)}>
                            <span style={{ display: 'block', padding: '4px 16px' }} onMouseEnter={(e) => handleTabMouseEnter(child, true, e)} onMouseLeave={(e) => handleTabMouseEnter(child, false, e)}>
                                <WrapTabNode key={child.id} index={idx} node={child} moveTabNode={moveTabNode} >
                                    {
                                        //搜索模式：有结果或Tree节点选中
                                        <>
                                            {tabMore(child, hoveredId === child.id)}
                                            {/* {child.id}  // : `(${child.bookmarksNum})`}*/}
                                            {searching ? <span style={{ color: 'red' }}>{`(${child.totalMatchCount})`}</span>
                                                : `(${child.bookmarksNum})`}
                                            {/* : `[${child.id}](${child.path})`} */}



                                        </>
                                    } </WrapTabNode>
                            </span>
                        }>
                        {renderContent(processBeforeRender(child), idx)}
                        {/* {renderContent(processed, idx, op)} */}

                    </TabPane>
                )
            }

            {
                searching && level <= 0 && (
                    /*  <TabPane key={searchTabKey} title={<span style={{ color: 'red' }}>{`搜索结果(${props.showSearchResult ? props.showSearchResult.length : 0})`}</span>}>
                         {renderSearchContent()}
                     </TabPane> */
                    <TabPane key={searchTabKey}
                        title={
                            <span style={{ display: 'block', padding: '4px 16px' }} onMouseEnter={(e) => handleTabMouseEnter(data.searchResult, true, e)} onMouseLeave={(e) => handleTabMouseEnter(data.searchResult, false, e)}>
                                {searchTabMore(data.searchResult, hoveredId === 'searchResultTab')}
                            </span>
                        }
                    >
                        {renderSearchContent(undefined)}
                    </TabPane>
                )
            }
        </Tabs >
    );
}


