import React, { useEffect, useState } from 'react';
import { Tabs, Card, Empty, Input, Typography, Link, Grid } from '@arco-design/web-react';
import styles from './style/index.module.less';

function emptyCard() {

    const [activeTab, setActiveTab] = useState('no-result');

    //有二级
    return (
        <Card id={activeTab} key={activeTab}
            title={'搜索结果'}
            // title={<span style={{ color: 'red' }}>{`搜索结果`}</span>}
            // extra={<Link>More</Link>}
            style={{
                width: '100%',
            }}
        >
            {/* <Tabs
                type="card-gutter"
                activeTab={activeTab}
            > */}

            {/* 搜索结果  */}
            <div className={styles.container}>
                <div className={styles['single-content']}>
                    <Empty></Empty>
                </div>
            </div>
            {/* </TabPane>} */}
            {/* </Tabs> */}
        </Card >
    )
}

export default emptyCard