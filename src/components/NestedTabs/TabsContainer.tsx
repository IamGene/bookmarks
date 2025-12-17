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
    if (children.length > 0 && !searching) {//非搜索，按原始顺序，排序，保持稳定性；搜索时有结果的排在前面，方便选择activeTab
        children.sort((a, b) => ((a.order ?? a.addDate ?? 0) - (b.order ?? b.addDate ?? 0)));
    }

    function processBeforeRenderWhileSearching(item: any) {
        //tree选中有复制子分组的父分组，且只有复制分组包含所有结果,将书签数据上提到原始分组

        if (!searching && item.children && Array.isArray(item.children) && item.children.length > 0) {
            const children = [...item.children];
            children.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));//按原来的顺序排列
            return {
                ...item,
                children: children,//children为空，就会渲染自身的searchResult(所有子分组的searchResult的汇总) RenderNode
            }
        }

        //选中的tree节点paths(activeCardTab)不包含tab.id(index === -1),或选中的tree节点刚好与tab.id
        //或 const yes = searching && item.id === activeTab && (activeCardTab.length == 0 || !(index > -1 && index < activeCardTab.length - 1)); //
        const totalMatchCount = item.totalMatchCount;
        const index = activeCardTab.indexOf(item.id);
        const yes = searching && (activeCardTab.length == 0 || index === -1 || index === activeCardTab.length - 1); //Tree中当前node的子节点未被选中的情况下

        if (yes && totalMatchCount > 0 && item.children.length > 1) {//包括子分组和复制分组（全部搜索结果）？
            const res = item.children.filter(item1 => { // 复制子分组包含全部搜索结果
                return item1.copy && item1.totalMatchCount == totalMatchCount;
            });
            if (res.length > 0) {
                return {
                    ...item,
                    children: [],//children为空，就会渲染自身self的searchResult(所有子分组的searchResult的汇总) RenderNode
                    // urlList: res[0].urlList,
                    // searchResult: res[0].searchResult
                }
            }
        }
        return item;
    }

    return (
        <Tabs
            editable
            type="card-gutter"
            onAddTab={() => handleAddTab && handleAddTab(data)}
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
            {/* {data.children && data.children.map((child: any, idx: number) => ( */}
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
                    {/* {renderContent(child, idx)} */}
                    {renderContent(processBeforeRenderWhileSearching(child), idx)}
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


