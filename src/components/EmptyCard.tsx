import React, { useEffect, useState } from 'react';
import { Tabs, Card, Empty, Input, Typography, Link, Grid } from '@arco-design/web-react';
import styles from './style/index.module.less';

type CardEmptyProps = {
    search: boolean;
};

function EmptyCard({ search }: CardEmptyProps) {

    const [activeTab, setActiveTab] = useState('no-result');

    console.log('CardEmpty 渲染了', search)

    //有二级
    return (
        <Card id={activeTab} key={activeTab}
            title={search == true ? '搜索结果' : null}
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

export default EmptyCard