import React, { Children, useState, useEffect } from 'react';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DndProvider } from 'react-dnd';
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
    moveTabNode: Function;
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
        moveTabNode,
        searching,
        tabMore,
        searchTabKey,
        renderContent,
        renderSearchContent,
    } = props;


    const children = [...data.children];
    /*  if (children.length > 0 && !searching) {//非搜索，按原始顺序，排序，保持稳定性；搜索时有结果的排在前面，方便选择activeTab
         children.sort((a, b) => ((a.order ?? a.addDate ?? 0) - (b.order ?? b.addDate ?? 0)));
     } */


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
                        <WrapTabNode key={child.id} index={idx} node={child} moveTabNode={moveTabNode}>{
                            //搜索模式：有结果或Tree节点选中
                            // searching && (child.totalMatchCount !== 0) ?
                            <>
                                {tabMore(child)}
                                {/* <span style={{ color: 'red' }}>{`(${showItem ? child.urlList.length : child.notHideTabCount || 0})`}</span> */}
                                {searching && <span style={{ color: 'red' }}>{`(${child.totalMatchCount})`}</span>}
                            </>
                        } </WrapTabNode>

                    }>
                    {/* 渲染单个tab内容,会递归调用RenderNode */}
                    {renderContent(child, idx)}
                </TabPane>

            )}


            {searching && level <= 0 && (
                <TabPane key={searchTabKey} title={<span style={{ color: 'red' }}>{`搜索结果(${props.showSearchResult ? props.showSearchResult.length : 0})`}</span>}>
                    {/* <TabPane key={searchTabKey} title={<span style={{ color: 'red' }}>{`搜索结果(${data.searchResult ? props.searchResult.length : 0})`}</span>}> */}
                    {renderSearchContent()}
                </TabPane>
            )}
        </Tabs>
    );
}


