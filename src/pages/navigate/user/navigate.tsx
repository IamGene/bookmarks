import { useEffect, useState, useMemo } from 'react';

import { Tabs, BackTop, Card, Input, Empty, Typography, Link, Grid, Button, Select, Space } from '@arco-design/web-react';
// import { IconCaretUp } from '@arco-design/web-react/icon';
import useLocale from '@/utils/useLocale';
//注意顺序在前以免样式被覆盖
// import './index.css'
import locale from './locale';
import styles from './style/index.module.less';
import CardBlock1 from './card-block1';
import CardItem from './card';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
// import CardEmpty from './card-empty';
import EmptyCard from '@/components/EmptyCard/index';
import SearchResult from '@/components/SearchResult/index';
import {
  updatePageGroupsDataByType
} from '@/store/modules/global';
import { useDispatch } from 'react-redux';
// const TabPane = Tabs.TabPane;
// import AddCard from './card-add';
import { WebTag } from './interface';
import { useSelector } from 'react-redux';
import './mock';

// tab标签类型
const TabPane = Tabs.TabPane;
const { Row, Col, GridItem } = Grid;
// tags
function ListCard({ activeCardTab, dataType, setCardTabActive, keyWord, list, loading }) {
  const t = useLocale(locale);

  const searchState = useSelector((state: any) => state.global.search);
  const selectedTags = useSelector((state: any) => state.global.tags.selectedTags);
  const { searchResultNum } = searchState;

  const dispatch = useDispatch();
  const [search, setSearch] = useState(false);

  useMemo(() => {
    const isEmpty = !keyWord?.trim();
    setSearch(!isEmpty);
    // console.log('zzzzzzzzzzzzzzzzzzzzzzzzzzz  keyWord search searchResultNum', keyWord, searchResultNum);
  }, [keyWord]);

  useEffect(() => {
    // const isEmpty = !keyWord?.trim();
    setSearch(selectedTags.length > 0 ? false : !(!keyWord?.trim()));
  }, [selectedTags]);



  const [cardList, setCardList] = useState(list);
  useEffect(() => {
    setCardList(list);
  }, [list]);
  // `search` 由 `selectedTags` 和 `keyWord` 派生，避免额外 setState 导致重复渲染

  const removeItem = async (gId: string) => {
    //按时间分组 删除card和子分组 gId(年-月) card只能决定月份节点的移除，
    if (dataType == 0) {//删除大分组
      setCardList(prev => prev.filter(item => item.id !== gId));
      // await dispatch(updatePageGroupsDataByType({ dataType: dataType, groupId: gId, action: 'remove' }));
    }
    else if (dataType == 1) {
      setCardList(prev => prev.filter(item => item.id !== gId));
      await dispatch(updatePageGroupsDataByType({ dataType: dataType, groupId: gId, action: 'remove' }));
    }
    else if (dataType == 2) {
      const parts = gId.split(',').map(s => s.trim()).filter(s => s !== '');
      if (parts.length == 0) {//传递父分组，直接删除字母大分组Card
        const pId = parts[0];
        setCardList(prev => prev.filter(item => item.id !== pId));//按域名分组，删除父分组 有子分组和父分组id
        await dispatch(updatePageGroupsDataByType({ dataType: dataType, pId: pId, groupId: null, action: 'remove' }));
      }
      else if (parts.length == 1) {//传递父分组，直接删除字母大分组Card
        const pId = parts[0];
        setCardList(prev => prev.filter(item => item.id !== pId));//按域名分组，删除父分组 有子分组和父分组id
        await dispatch(updatePageGroupsDataByType({ dataType: dataType, pId: pId, groupId: null, action: 'remove' }));
      } else if (parts.length == 2) {//传递子分组，仅删除子分组
        const pId = parts[0];
        const groupId = parts[1];
        await dispatch(updatePageGroupsDataByType({ dataType: dataType, pId: pId, groupId: groupId, action: 'remove' }));
      }
    }
    // await dispatch(updatePageGroupsDataByType({ dataType: dataType, groupId: pId, action: 'remove' }));
    //按域名分组，先删除子分组，再根据判断是否删除父分组

  };



  const getMockCardList = (
    list: Array<WebTag>
  ) => {
    return (
      <Row gutter={24} className={styles['card-content']}>
        {list.map((item, index) => (
          <Col xs={24} sm={12} md={8} lg={6} xl={6} xxl={6} key={index}>
            {/* <CardBlock1 card={item} loading={loading} /> */}
            <CardBlock1 card={item} loading={loading} />
          </Col>
        ))}
      </Row>
    );
  };

  const renderCards = (data, index) => {

    return (
      <Card key={index}
        title={'Tag-Group-' + index}
        extra={<Link>More</Link>}
        style={{
          width: '100%',
        }}
      >

        <Tabs
          type="card-gutter"
          extra={
            <Input.Search
              style={{ width: '240px' }}
            />
          }
        >

          {data.map((item, index) => (
            <TabPane key={index} title={'Tag-' + index} >
              <div className={styles.container}>
                <div className={styles['single-content']}>
                  {getMockCardList(item)}
                </div>
              </div>
            </TabPane>
          ))}
        </Tabs>
      </Card >
    )
  }


  /*  return (
     <div>
       <div id="custom_backtop0">
         {list.map((item, index) => {
           return <CardItem setCardTabActive={setCardTabActive} cardData={item} index={index} activeCardTab={activeCardTab} keyWord={keyWord} hasResult={hasResult}></CardItem>
         })}
 
         {!hasResult && <CardEmpty></CardEmpty>}
       </div>
     </div>
   ) */

  return (
    <div>

      {/*回到顶部 一 */}
      {/*回到顶部 四： 把navigate.tsx中的Footer注释掉 */}
      {/*  <BackTop
        easing={easing}
        duration={duration}
        style={{
          position: 'absolute',
          right: 60,
          bottom: 5,
        }}
        visibleHeight={400}
        target={() => document.getElementById('custom_backtop')}
      >
        <div className='custom-backtop' tabIndex={0} role='button' aria-label='scroll to top'>
          <IconCaretUp />
          <br />
          TOP
        </div>
      </BackTop>
 */}
      <div
        id='custom_backtop'
        style={{
          // 二
          // height: 820,//860?
          // overflow: 'auto',
        }}
      >

        {/* {(search && hasResult && (list && list.length > 0)) && <SearchResult></SearchResult>} */}
        {/* {(!hasResult || (list && list.length === 0)) && <EmptyCard search={search}></EmptyCard>} */}
        {(search && searchResultNum > 0 && (list && list.length > 0)) && <SearchResult></SearchResult>}
        {(search && searchResultNum == 0 || (!list || list.length === 0)) && <EmptyCard search={search}></EmptyCard>}

        {/* {list && list.length > 0 && list.map((item, index) => { */}
        {cardList && cardList.length > 0 && (
          <DndProvider backend={HTML5Backend}>
            {cardList.map((item, index) => {
              return <CardItem key={item.id}
                setCardTabActive={setCardTabActive}
                cardData={item}
                dataType={dataType}
                removeCard={removeItem}
                treeSelectedNode={activeCardTab}
                keyWord={keyWord}
              >
              </CardItem>
            })}
          </DndProvider>
        )}

        {/* {(!hasResult || (list && list.length === 0)) && <CardEmpty search={search}></CardEmpty>} */}

        {/* <Footer /> */}
        {/* 三 */}
        {/*  <Footer style={{
          position: 'absolute',
          bottom: 5,
          width: '85%',
          height: 30
        }} /> */}

      </div>
    </div>
  );

}


export default ListCard