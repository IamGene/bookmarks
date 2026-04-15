import React, { Children, useState, useEffect } from 'react';
// Note: DndProvider should be provided once at a higher level; removed unused imports
import { Tabs, Input, Dropdown, Menu } from '@arco-design/web-react';
import { IconCheck } from '@arco-design/web-react/icon';
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
    // moveTabNode: Function;
    searching: boolean;
    // searchResult: any[];

    activeCardTab: string[];
    // searchTabMore: Function;
    treeSelected: boolean;

    // cardData: any;
    // currentSearch: any;
    tabMore: Function;
    showItem: boolean;
    searchTabKey: any;
    showSearchResult: any[];
    renderContent: (child: any, idx: number) => React.ReactNode;
    renderSearchContent: () => React.ReactNode;
}


export default function TabsContainer(props: Props) {
    const {
        data,
        handleAddTab,
        onTabChange,
        activeTab,
        level,
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
        // moveTabNode,
        treeSelected,
        activeCardTab,
        searching,
        tabMore,
        searchTabKey,
        renderContent,
        renderSearchContent,
    } = props;


    const children = [...data.children];
    const [hoveredId, setHoveredId] = useState<string | null>(null);

    function handleTabMouseEnter(child: any, entering: boolean) {
        // console.log('xxxxxxxxxxxxxxxxxxxxxxxxxxxxx handleTabMouseEnter', child);
        try {
            setHoveredId(entering ? child.id : null);
        } catch (err) {
            // ignore
        }
    }

    const getClassName = () => {
        if (treeSelected) {
            if (activeCardTab.length > 1) {//选中子节点
                return activeCardTab.includes(data.id) ? 'treeActiveTabSelectedA' : 'treeActiveTabUnSelected';
            } else if (activeCardTab.length == 1 && activeCardTab[0] === data.id) {//选中祖节点
                return searching ? 'treeActiveTabSelectedB' : ''//搜索/筛选结果tab 或 子分组tab
            }
        }
        return '';
    }

    return (
        <Tabs
            // editable
            type="card-gutter"
            // onAddTab={() => handleAddTab && handleAddTab(data)}
            onChange={(key) => onTabChange && onTabChange(key, props.data, props.currentPath)}
            activeTab={activeTab ? activeTab : data.children[0].id}
            deleteButton={<></>}
            className={getClassName()}
        /* extra={
            level == 0 && <Input.Search
                allowClear
                style={{ width: '240px' }}
                placeholder={data ? `在${data.name}中搜索` : '搜索'}
                onChange={(e) => onInputChange && onInputChange((e as any).target.value)}
                value={searchInput}
            />
        } */
        >
            {children && children.map((child: any, idx: number) => (
                // determinShowTabOrNot(child) && (
                //版本B:全部根据情况显示
                //a.搜索：有结果或Tree节点选中时显示该Tab；b.非搜索：全部显示
                (searching && (child.totalMatchCount > 0 || activeCardTab.includes(child.id))) || !searching) &&
                <TabPane key={child.id}
                    style={{
                        backgroundColor: treeSelected && activeCardTab.length > 0 && child.id == activeCardTab[activeCardTab.length - 1]
                            // && child.children.length == 0
                            ? 'aliceblue' : '#ffffff',
                    }}
                    className={treeSelected && activeCardTab.length > 1
                        ? (activeCardTab.includes(child.id) && child.id !== activeCardTab[activeCardTab.length - 1] ? 'treeActiveTabSelected' : 'treeActiveTabUnSelected')
                        : ''
                    }
                    title={
                        <div style={{ width: '100%' }} onMouseEnter={() => handleTabMouseEnter(child, true)} onMouseLeave={() => handleTabMouseEnter(child, false)}>
                            <span style={{
                                display: 'block', padding: '4px 16px',
                                backgroundColor: treeSelected && activeCardTab.length > 0 && activeCardTab.includes(child.id) ? 'aliceblue' : '',
                            }}>
                                {
                                    //搜索模式：有结果或Tree节点选中
                                    <>
                                        {tabMore(child, hoveredId === child.id)}
                                        {searching && <span style={{ color: 'red' }}>{`(${child.totalMatchCount})`}</span>}
                                    </>
                                }
                            </span>
                        </div>
                    }>
                    {/* 渲染单个tab内容,会递归调用RenderNode */}
                    {renderContent(child, idx)}
                </TabPane>
            )}


            {searching && level <= 0 && (
                // <TabPane key={searchTabKey} title={<span style={{ color: 'red' }}>{`搜索结果(${props.showSearchResult ? props.showSearchResult.length : 0})`}</span>}>
                <TabPane key={searchTabKey}
                    title={
                        // <div style={{ width: '100%' }} >
                        <span style={{ width: '100%', color: 'red', display: 'block', padding: '4px 16px' }}>{`搜索结果(${data.searchResult ? data.searchResult.length : 0})`}</span>
                        // </div>
                    }>
                    {/* <TabPane key={searchTabKey} title={<span style={{ color: 'red' }}>{`搜索结果(${data.searchResult ? props.searchResult.length : 0})`}</span>}> */}
                    {renderSearchContent()}
                </TabPane>
            )}
        </Tabs>
    );
}


