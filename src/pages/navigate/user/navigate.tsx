import React, { useEffect, useRef, useState } from 'react';

import { Tabs, BackTop, Card, Input, Empty, Typography, Link, Grid, Button, Select, Space } from '@arco-design/web-react';
// import { IconCaretUp } from '@arco-design/web-react/icon';
import useLocale from '@/utils/useLocale';
//注意顺序在前以免样式被覆盖
// import './index.css'
import locale from './locale';
import styles from './style/index.module.less';
import CardBlock1 from './card-block1';
import CardItem from './card';
// import CardEmpty from './card-empty';
import EmptyCard from '@/components/EmptyCard/index';
import SearchResult from '@/components/SearchResult/index';
// import CardEmpty from './;
// const TabPane = Tabs.TabPane;
// import AddCard from './card-add';
import { WebTag } from './interface';
import './mock';

// tab标签类型
const TabPane = Tabs.TabPane;
const { Row, Col, GridItem } = Grid;
// import { BackTop, Button, Select, Input, Typography, Space } from '@arco-design/web-react';

function ListCard({ activeCardTab, dataType, display, setCardTabActive, keyWord, list, hasResult, loading }) {
  const t = useLocale(locale);

  // console.log('zzzzzzzzzzz has dataType', dataType);

  let search: boolean = keyWord && keyWord.length > 0;

  const [activeKey, setActiveKey] = useState('tags');

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

  const renderMockCard = (data, index) => {
    const onTabChange = (key: string) => {
      // console.log('activeKey', key)
      setActiveKey(activeKey)
    }

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
          onChange={onTabChange}
          extra={
            <Input.Search
              style={{ width: '240px' }}
              placeholder={t[`cardList.tab.${activeKey}.placeholder`]}
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

  /*  const getCardItems = (list) => {
 
     const result = [];
 
     list.map((item, index) => {
       //显示(不隐藏) 
       // let eachDisplay = display && hasResult;
       result.push(<CardItem key={index}
         setCardTabActive={setCardTabActive}
         cardData={item}
         index={index}
         last={index == list.length - 1}
         first={index == 0}
         // display={display}
         display={display}
         activeCardTab={activeCardTab}
         keyWord={keyWord}
         hasResult={hasResult}
         activeGroup={activeGroup}
       // pageNo={pageNo}
       >
       </CardItem>)
     })
     return result;
   } 
  
   const result = getCardItems(list);
   */


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

        {(search && hasResult && (list && list.length > 0)) && <SearchResult search={search}></SearchResult>}

        {list && list.length > 0 && list.map((item, index) => {
          return <CardItem key={index}
            setCardTabActive={setCardTabActive}
            cardData={item}
            dataType={dataType}
            // index={index}
            // last={index == list.length - 1}
            // first={index == 0}
            // activeGroup={activeGroup}
            display={display}
            treeSelectedNode={activeCardTab}
            keyWord={keyWord}
            hasResult={hasResult}
          >
          </CardItem>
        })}

        {/* {(!hasResult || (list && list.length === 0)) && <CardEmpty search={search}></CardEmpty>} */}
        {(!hasResult || (list && list.length === 0)) && <EmptyCard search={search}></EmptyCard>}


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