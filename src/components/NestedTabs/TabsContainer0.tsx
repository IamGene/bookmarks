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
    // cardData: any;
    // currentSearch: any;
    activeCardTab: string[];
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
        // moveTabNode,
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


    return (
        <Tabs
            // editable
            type="card-gutter"
            // onAddTab={() => handleAddTab && handleAddTab(data)}
            onChange={(key) => onTabChange && onTabChange(key, props.data, props.currentPath)}
            activeTab={activeTab ? activeTab : data.children[0].id}
            deleteButton={<></>}
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
                    title={
                        <div style={{ width: '100%' }} onMouseEnter={() => handleTabMouseEnter(child, true)} onMouseLeave={() => handleTabMouseEnter(child, false)}>
                            <span style={{ display: 'block', padding: '4px 16px' }}>
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


