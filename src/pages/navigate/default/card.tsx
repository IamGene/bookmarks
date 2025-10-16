import React, { useEffect, useState, useRef } from 'react';
import { Tabs, Card, Switch, Space, Button, Empty, Input, Typography, Link, Grid } from '@arco-design/web-react';
import styles from './style/index.module.less';
import TagItem from './tag/card-tag';
import locale from './locale';
import useLocale from '@/utils/useLocale';
import { TagCard } from './interface';

const TabPane = Tabs.TabPane;
const { Title } = Typography;
const { Row, Col, GridItem } = Grid;

// 搜索结果tab-key
const searchTabKey = 'search-result'

// 根据关键词高亮文本数组
const Highlight = (parts, keyword) => {
    return (
        <span>
            {parts.map((part, index) => (
                <span key={index}>
                    {part.toLowerCase() === keyword.toLowerCase() ? (
                        <span className="highlight">{part}</span>
                    ) : (
                        part
                    )}
                </span>
            ))}
        </span>
    );
};


function searchData(inputValue, cardData) {
    // 必须返回新数据，包括所有属性，重新构造
    const searchResult = [];
    const search = (data) => {
        const newChildren = [];
        data.children.forEach((item) => {
            const urlListResult = [];
            const urlList = item.urlList;
            urlList.forEach((navi) => {
                let contains: boolean = false;
                let name = navi.name;
                let description = navi.description;
                // name或intro中包含inputValue关键字
                const regex = new RegExp(`(${inputValue})`, 'gi');
                const parts = name.split(regex);
                if (parts.length >= 3) {
                    contains = true;
                    name = Highlight(parts, inputValue)
                }

                const parts1 = description.split(regex);
                if (parts1.length >= 3) {
                    contains = true;
                    description = Highlight(parts1, inputValue)
                }

                if (contains) {
                    urlListResult.push({ ...navi, name, description });
                    searchResult.push({ ...navi, name, description });
                }
            });
            newChildren.push({ ...item, urlList: urlListResult });
        });
        return { ...data, children: newChildren, searchResult: searchResult };
    };

    const search1 = (data) => {
        const navis = [];
        const searchResult = [];
        data.urlList.forEach((navi) => {
            let contains: boolean = false;
            let name = navi.name;
            let description = navi.description;
            // name或intro中包含inputValue关键字
            const regex = new RegExp(`(${inputValue})`, 'gi');
            const parts = name.split(regex);
            // 处理高亮
            if (parts.length >= 3) {
                contains = true;
                name = Highlight(parts, inputValue)
            }
            const parts1 = description.split(regex);
            if (parts1.length >= 3) {
                contains = true;
                description = Highlight(parts1, inputValue)
            }
            if (contains) {
                navis.push({ ...navi, name, description })
                searchResult.push({ ...navi, name, description });
            }
        });
        return { ...data, urlList: navis, searchResult: searchResult };
    };

    // 没有二级
    if (cardData.urlList && cardData.children.length === 0) {
        return search1(cardData);
    }
    return search(cardData);
}

function renderCard({ cardData, index, activeCardTab, setCardTabActive, keyWord, hasResult }) {

    //搜索输入内容
    const [data, setData] = useState(cardData);
    // 当前搜索结果
    const [searchResult, setSearchResult] = useState([]);
    // 搜索中
    const [searching, setSearching] = useState(false);
    // 当前被tree选中
    const [treeSelected, setTreeSelected] = useState(false);
    // 当前搜索
    const [currentSearch, setCurrentSearch] = useState(false);

    const activeItem = data.children.length == 0 ? '' : data.children[0].id + ''
    const [activeTab, setActiveTab] = useState(activeItem);
    const [searchInput, setSearchInput] = useState('');

    //该Card是否展示(有搜索结果)
    const [show, setShow] = useState(true)

    // 处理非空字符串搜索
    const processNotEmptySearch = (keyWord) => {
        setSearching(true)
        const result = searchData(keyWord.trim(), cardData);
        setData(result);
        setSearchResult(result.searchResult)//搜索结果
        setActiveTab(searchTabKey)//激活<搜索结果>Tab
        return result.searchResult
    }

    // 处理空字符串搜索
    const processEmptySearch = () => {
        setSearching(false)
        setShow(true)
        setData(cardData);//展示原始的全部数据
        //恢复默认activeTabKey
        if (data.urlList && data.children.length === 0) {
            setActiveTab(data.id + '')
        } else {
            if (data.children.length > 0) setActiveTab(data.children[0].id + '')
        }
    }

    // 监听搜索输入框keyword变化
    const onInputChange = (inputValue) => {
        if (!inputValue || !inputValue.trim()) {
            processEmptySearch()
        } else {//keyword不为空
            processNotEmptySearch(inputValue.trim())
            setCurrentSearch(true)
        }
        //不再全局搜索
        //  setGlobalSearch(false)
        setSearchInput(inputValue)
    }

    const linkRef = useRef(null);
    //点击卡片标题
    const onCardTitleClick = (value) => {
        setCardTabActive([String(data.id)])
    }

    useEffect(() => {
        const cardActive: number = activeCardTab[0]
        const tabActive: number | null = activeCardTab[1]
        // 受控模式
        if (cardActive === data.id) {
            setTreeSelected(true)
            //如果在全局搜索模式下当前Card被tree选中且搜索结果为空 =>临时显示全部
            if (!show) {//当前没有搜索结果
                setData(cardData)//重置显示数据
                setActiveTab(searchTabKey)
                if (typeof tabActive !== 'number') {//展示示搜索结果Tab
                    setActiveTab(searchTabKey)
                }
            }
            //选中的Tab
            if (typeof tabActive === 'number') {
                setActiveTab(tabActive + '')
            }
        } else {//当前Card没有被选中了
            setTreeSelected(false)
        }
    }, [activeCardTab]);

    useEffect(() => {
        setSearchInput(keyWord)
        if (keyWord && keyWord.trim()) {//有关键词->搜索->展示?
            setCurrentSearch(false)
            setTreeSelected(false)
            if (hasResult) {
                const searchResult = processNotEmptySearch(keyWord)//处理搜索结果
                setShow(searchResult.length !== 0)
            }
            else {//没有搜索结果
                setShow(false)
            }
        } else {
            processEmptySearch()
        }
    }, [keyWord]);


    const [loading, setLoading] = useState(true);

    // 监听tab切换
    const onTabChange = (key: string) => {
        setActiveTab(key)
        if (key !== searchTabKey) {
            if (key === String(data.id)) {//没有二级
                setCardTabActive(['' + data.id])
            } else {
                setCardTabActive(['' + data.id + ',' + key])
            }
        }
    }

    // 渲染二级标签
    const render2sCard = (data, activeTab) => {
        return (
            // ((globalSearch && (searchResult.length > 0 || treeSelected)) || !globalSearch) &&
            show &&
            <Card id={data.id} key={index}
                title={data.name}
                extra={<Link>More</Link>}
                style={{
                    width: '100%',
                }}
            >
                <Tabs
                    type="card-gutter"
                    onChange={onTabChange}
                    activeTab={activeTab}
                    extra={
                        <Input.Search
                            allowClear
                            style={{ width: '240px' }}
                            placeholder={`在${data.name}中搜索`}
                            onChange={onInputChange}
                            value={searchInput}
                        />
                    }
                >

                    {data.children.map((item, index: number) => (
                        // Tab-Content展示？ 全局搜索且(结果不为空或左侧选中)  或 非全局搜索
                        // (!globalSearch || (globalSearch && (item.urlList.length > 0 || treeSelected))) &&
                        // 整个结果不为空且当前项不为空
                        (item.urlList.length > 0 || treeSelected) &&
                        <TabPane key={item.id + ''} title={(searching) ? <span style={{ color: 'red' }}>{`${item.name}(${item.urlList.length})`}</span> : item.name} >
                            <div className={styles.container}>
                                <div className={styles['single-content']}>
                                    {renderTags(item.urlList)}
                                </div>
                            </div>
                        </TabPane>
                    ))}

                    {/* 搜索结果  */}
                    {(searching) && <TabPane key={searchTabKey} title={<span style={{ color: 'red' }}>{`搜索结果(${searchResult.length})`}</span>}>
                        <div className={styles.container}>
                            <div className={styles['single-content']}>
                                {renderTags(searchResult)}
                            </div>
                        </div>
                    </TabPane>}
                </Tabs>
            </Card >
        )
    }


    // 渲染标签列表
    const renderTags = (
        list: Array<TagCard>
    ) => {
        if (list.length == 0) {
            return <Empty />;
        }
        return (
            <div style={{ width: '100%' }}>
                <Grid cols={{ xs: 1, sm: 2, md: 3, lg: 4, xl: 5, xxl: 6 }} colGap={12} rowGap={16} >
                    {list.map((item, index) => (
                        <GridItem key={index} className='demo-item'><TagItem tag={item} loading={loading} /></GridItem>
                    ))}
                </Grid>
            </div>
        );
    };


    // 返回结果
    // 没有二级 => 没有Tab
    if (data.urlList && data.children.length === 0) {
        return (
            // ((globalSearch && (searchResult.length > 0 || treeSelected)) || !globalSearch) &&
            (show || treeSelected) &&
            <Card id={data.id} key={index}
                // title={data.name}
                // title={<Space size='large'><Button href={data.id} type='text' onClick={onCardTitleClick}>{data.name}</Button></Space>}
                title={<a ref={linkRef} onClick={() => onCardTitleClick(data.id)}> <span>{data.name}</span></a>}
                extra={
                    <div className='card-no-child-more'>
                        <Link>More</Link>
                        <Input.Search
                            allowClear
                            style={{ width: '240px' }}
                            placeholder={`在${data.name}中搜索`}
                            onChange={onInputChange}
                            value={searchInput}
                        />
                    </div>
                }
                style={{
                    width: '100%',
                }}
            >


                {/* 搜索结果 Tab  */}
                {searching ?
                    <Tabs
                        type="card-gutter"
                        onChange={onTabChange}
                        activeTab={activeTab}
                    >
                        {
                            // (globalSearch && searchResult.length == 0 && treeSelected) &&
                            <TabPane key={cardData.id + ''}
                                title={(searching && (searchResult.length !== 0)) ? (<span><span>{cardData.name}</span> <span style={{ color: 'red' }}>{`(${searchResult.length})`}</span></span>) : cardData.name}>
                                <div className={styles.container}>
                                    <div className={styles['single-content']}>
                                        {/* {renderTags(cardData.urlList)} */}
                                        {renderTags(searchResult)}
                                    </div>
                                </div>
                            </TabPane>}

                        <TabPane key={searchTabKey} title={<span style={{ color: 'red' }}>{`搜索结果(${searchResult.length})`}</span>}>
                            <div className={styles.container}>
                                <div className={styles['single-content']}>
                                    {renderTags(searchResult)}
                                </div>
                            </div>
                        </TabPane>
                    </Tabs>
                    :
                    <div className={styles.container}>
                        <div className={styles['single-content-border']}>
                            {renderTags(data.urlList)}
                        </div>
                    </div>
                }
            </Card >
        )
    }

    //有二级
    return (
        // render2sCard(data, activeTab)
        (show || treeSelected) &&
        <Card id={data.id} key={index}
            title={data.name}
            extra={<Link>More</Link>}
            style={{
                width: '100%',
            }}
        >
            <Tabs
                type="card-gutter"
                onChange={onTabChange}
                activeTab={activeTab}
                extra={
                    <Input.Search
                        allowClear
                        style={{ width: '240px' }}
                        placeholder={`在${data.name}中搜索`}
                        onChange={onInputChange}
                        value={searchInput}
                    />
                }
            >

                {data.children.map((item, index: number) => (
                    (currentSearch || (item.urlList && item.urlList.length > 0) || treeSelected) &&
                    // <TabPane key={item.id + ''} title={(searching) ? `${item.name}(${item.urlList.length})` : item.name} >
                    <TabPane key={item.id + ''}
                        // 当前处于搜索状态且排除临时显示(搜索结果为0但是) 显示结果数量
                        title={(searching && (searchResult.length !== 0)) ? (<span><span>{item.name}</span> <span style={{ color: 'red' }}>{`(${item.urlList.length})`}</span></span>) : item.name}>
                        <div className={styles.container}>
                            <div className={styles['single-content']}>
                                {renderTags(item.urlList)}
                            </div>
                        </div>
                    </TabPane>
                ))}

                {/* 搜索结果  */}
                {(searching) && <TabPane key={searchTabKey} title={<span style={{ color: 'red' }}>{`搜索结果(${searchResult.length})`}</span>}>
                    <div className={styles.container}>
                        <div className={styles['single-content']}>
                            {renderTags(searchResult)}
                        </div>
                    </div>
                </TabPane>}
            </Tabs>
        </Card >
    )
}

export default renderCard