import React from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
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
    resort: boolean;
    onClickSort: Function;
    determinShowTabOrNot: Function;
    WrapTabNode: any;
    moveTabNode: Function;
    searching: boolean;
    searchResult: any[];
    cardData: any;
    activeCardTab: any;
    currentSearch: any;
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
        onInputChange,
        searchInput,
        resort,
        onClickSort,
        determinShowTabOrNot,
        WrapTabNode,
        moveTabNode,
        searching,
        searchResult,
        cardData,
        activeCardTab,
        currentSearch,
        tabMore,
        showItem,
        searchTabKey,
        renderContent,
        renderSearchContent,
    } = props;

    return (
        <DndProvider backend={HTML5Backend}>
            <Tabs
                editable
                type="card-gutter"
                onAddTab={() => handleAddTab && handleAddTab(data)}
                // onChange={(key) => onTabChange && onTabChange(key, props.data, props.currentPath)}
                onClickTab={(key) => onTabChange && onTabChange(key, props.data, props.currentPath)}
                activeTab={activeTab}
                deleteButton={<></>}
                extra={
                    <Input.Search
                        allowClear
                        style={{ width: '240px' }}
                        placeholder={data ? `在${data.name}中搜索` : '搜索'}
                        onChange={(e) => onInputChange && onInputChange((e as any).target.value)}
                        value={searchInput}
                    />
                }
            >
                {resort && (
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

                {data.children && data.children.map((child: any, idx: number) => (
                    determinShowTabOrNot(child) && (
                        <TabPane key={child.id}
                            title={<WrapTabNode key={child.id} index={idx} moveTabNode={moveTabNode}>{(searching && (searchResult.length !== 0 || cardData.id == activeCardTab[0])) ?
                                <span>
                                    <span>{currentSearch}</span>
                                    {tabMore(child)}
                                    <span style={{ color: 'red' }}>{`(${showItem ? child.urlList.length : child.notHideTabCount || 0})`}</span>
                                </span>
                                : tabMore(child)}</WrapTabNode>}>
                            {renderContent(child, idx)}
                        </TabPane>
                    )
                ))}

                {searching && (
                    <TabPane key={searchTabKey} title={<span style={{ color: 'red' }}>{`搜索结果(${props.showSearchResult ? props.showSearchResult.length : 0})`}</span>}>
                        {renderSearchContent()}
                    </TabPane>
                )}

            </Tabs>
        </DndProvider>
    );
}
