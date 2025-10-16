import React, { useEffect, useState } from 'react';
import axios from 'axios';
import groupBy from 'lodash/groupBy';
import {
  Trigger,
  Badge,
  Tabs,
  Avatar,
  Spin,
  Button,
} from '@arco-design/web-react';
import {
  IconMessage,
  IconCustomerService,
  IconFile,
  IconDesktop,
} from '@arco-design/web-react/icon';
import useLocale from '../../utils/useLocale';
import MessageList, { MessageListType } from './list';
import styles from './style/index.module.less';



const haveReadIds = [1];
const messageList =
  [
    {
      id: 1,
      type: 'message',
      title: '郑曦月',
      subTitle: '的私信',
      avatar:
        '//p1-arco.byteimg.com/tos-cn-i-uwbnlip3yd/8361eeb82904210b4f55fab888fe8416.png~tplv-uwbnlip3yd-webp.webp',
      content: '审批请求已发送，请查收',
      time: '今天 12:30:01',
    },
    {
      id: 2,
      type: 'message',
      title: '宁波',
      subTitle: '的回复',
      avatar:
        '//p1-arco.byteimg.com/tos-cn-i-uwbnlip3yd/3ee5f13fb09879ecb5185e440cef6eb9.png~tplv-uwbnlip3yd-webp.webp',
      content:
        '此处 bug 已经修复，如有问题请查阅文档或者继续 github 提 issue～',
      time: '今天 12:30:01',
    },
    {
      id: 3,
      type: 'message',
      title: '宁波',
      subTitle: '的回复',
      avatar:
        '//p1-arco.byteimg.com/tos-cn-i-uwbnlip3yd/3ee5f13fb09879ecb5185e440cef6eb9.png~tplv-uwbnlip3yd-webp.webp',
      content: '此处 bug 已经修复',
      time: '今天 12:20:01',
    },

    {
      id: 4,
      type: 'todo',
      title: '域名服务',
      content: '内容质检队列于 2021-12-01 19:50:23 进行变更，请重新',
      tag: {
        text: '未开始',
        color: 'gray',
      },
    },
    {
      id: 5,
      type: 'todo',
      title: '内容审批通知',
      content: '宁静提交于 2021-11-05，需要您在 2011-11-07之前审批',
      tag: {
        text: '进行中',
        color: 'arcoblue',
      },
    },
    {
      id: 6,
      type: 'notice',
      title: '质检队列变更',
      content: '您的产品使用期限即将截止，如需继续使用产品请前往购…',
      tag: {
        text: '即将到期',
        color: 'red',
      },
    },
    {
      id: 7,
      type: 'notice',
      title: '规则开通成功1',
      subTitle: '',
      avatar: '',
      content: '内容屏蔽规则于 2021-12-01 开通成功并生效。',
      tag: {
        text: '已开通',
        color: 'green',
      },
    },
  ].map((item) => ({
    ...item,
    // messageList 中 id 是 number，需要转换为 string
    id: String(item.id),
    status: haveReadIds.indexOf(item.id) === -1 ? 0 : 1,
  }));

function DropContent() {
  const t = useLocale();
  const [loading, setLoading] = useState(false);
  const [groupData, setGroupData] = useState<{
    [key: string]: MessageListType;
  }>({});
  const [sourceData, setSourceData] = useState<MessageListType>([]);

  function fetchSourceData(showLoading = true) {
    showLoading && setLoading(true);
    axios
      .get('/api/message/list')
      .then((res) => {
        console.log('getMessageList res', res);
        setSourceData(res.data);
      })
      .finally(() => {
        showLoading && setLoading(false);
      });
  }

  function fetchSourceData1(showLoading = true) {
    // showLoading && setLoading(true);
    setSourceData(messageList);
    // showLoading && setLoading(false);
  }

  function readMessage(data: MessageListType) {
    const ids = data.map((item) => item.id);
    axios
      .post('/api/message/read', {
        ids,
      })
      .then(() => {
        fetchSourceData();
      });
  }

  useEffect(() => {
    // fetchSourceData();
    fetchSourceData1();
  }, []);

  useEffect(() => {
    const groupData: { [key: string]: MessageListType } = groupBy(
      sourceData,
      'type'
    );
    setGroupData(groupData);
  }, [sourceData]);

  const tabList = [
    {
      key: 'message',
      title: t['message.tab.title.message'],
      titleIcon: <IconMessage />,
    },
    {
      key: 'notice',
      title: t['message.tab.title.notice'],
      titleIcon: <IconCustomerService />,
    },
    {
      key: 'todo',
      title: t['message.tab.title.todo'],
      titleIcon: <IconFile />,
      avatar: (
        <Avatar style={{ backgroundColor: '#0FC6C2' }}>
          <IconDesktop />
        </Avatar>
      ),
    },
  ];

  return (
    <div className={styles['message-box']}>
      <Spin loading={loading} style={{ display: 'block' }}>
        <Tabs
          overflow="dropdown"
          type="rounded"
          defaultActiveTab="message"
          destroyOnHide
          extra={
            <Button type="text" onClick={() => setSourceData([])}>
              {t['message.empty']}
            </Button>
          }
        >
          {tabList.map((item) => {
            const { key, title, avatar } = item;
            const data = groupData[key] || [];
            const unReadData = data.filter((item) => !item.status);
            return (
              <Tabs.TabPane
                key={key}
                title={
                  <span>
                    {title}
                    {unReadData.length ? `(${unReadData.length})` : ''}
                  </span>
                }
              >
                <MessageList
                  data={data}
                  unReadData={unReadData}
                  onItemClick={(item) => {
                    readMessage([item]);
                  }}
                  onAllBtnClick={(unReadData) => {
                    readMessage(unReadData);
                  }}
                />
              </Tabs.TabPane>
            );
          })}
        </Tabs>
      </Spin>
    </div>
  );
}

function MessageBox({ children }) {
  return (
    <Trigger
      trigger="hover"
      popup={() => <DropContent />}
      position="br"
      unmountOnExit={false}
      popupAlign={{ bottom: 4 }}
    >
      <Badge count={9} dot>
        {children}
      </Badge>
    </Trigger>
  );
}

export default MessageBox;
