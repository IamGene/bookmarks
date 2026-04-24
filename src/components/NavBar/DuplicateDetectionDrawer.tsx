import React, { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Checkbox,
  Collapse,
  Divider,
  Drawer,
  List,
  Message,
  Space,
  Switch,
  Tag,
  Typography,
} from '@arco-design/web-react';
import { IconDelete, IconFindReplace } from '@arco-design/web-react/icon';
import IconButton from './IconButton';
import styles from './style/index.module.less';

const { Text } = Typography;
const { Item: CollapseItem } = Collapse;

const mockDuplicateGroups = [
  {
    id: 'duplicate-group-1',
    title: '重复组 #1',
    recommendKeepId: 'bookmark-1',
    items: [
      { id: 'bookmark-1', url: 'https://xxx.com/abc', title: '产品主页' },
      { id: 'bookmark-2', url: 'https://xxx.com/abc?from=xx', title: '产品主页-来源参数' },
      { id: 'bookmark-3', url: 'https://xxx.com/abc#top', title: '产品主页-锚点链接' },
    ],
  },
  {
    id: 'duplicate-group-2',
    title: '重复组 #2',
    recommendKeepId: 'bookmark-4',
    items: [
      { id: 'bookmark-4', url: 'https://docs.demo.dev/start', title: '文档首页' },
      { id: 'bookmark-5', url: 'https://docs.demo.dev/start/', title: '文档首页/' },
      { id: 'bookmark-6', url: 'https://docs.demo.dev/start?utm=mail', title: '文档首页-活动入口' },
    ],
  },
  {
    id: 'duplicate-group-3',
    title: '重复组 #3',
    recommendKeepId: 'bookmark-7',
    items: [
      { id: 'bookmark-7', url: 'https://community.site.ai/topic/123', title: '社区帖子' },
      { id: 'bookmark-8', url: 'https://community.site.ai/topic/123#reply-2', title: '社区帖子-回复楼层' },
    ],
  },
];

function DuplicateDetectionDrawer() {
  const [visible, setVisible] = useState(false);
  const [autoDetect, setAutoDetect] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [manualSelections, setManualSelections] = useState<Record<string, string[]>>({});

  const totalDuplicateCount = useMemo(
    () => mockDuplicateGroups.reduce((sum, group) => sum + group.items.length, 0),
    []
  );

  const handleScan = () => {
    setScanning(true);
    window.setTimeout(() => {
      setScanning(false);
      Message.success(`扫描完成，发现 ${mockDuplicateGroups.length} 组疑似重复书签`);
    }, 800);
  };

  const handleDeleteOthers = (groupId: string, recommendKeepId: string) => {
    const group = mockDuplicateGroups.find((item) => item.id === groupId);
    const selectedIds =
      group?.items.filter((item) => item.id !== recommendKeepId).map((item) => item.id) || [];
    setManualSelections((prev) => ({ ...prev, [groupId]: selectedIds }));
    Message.info('已选中推荐保留项之外的书签，当前为模拟界面');
  };

  const handleManualSelect = (groupId: string, values: string[]) => {
    setManualSelections((prev) => ({ ...prev, [groupId]: values }));
  };

  return (
    <>
      <IconButton
        // type="outline"
        icon={<IconFindReplace />}
        // className={styles['duplicate-entry-btn']}
        onClick={() => setVisible(true)}
      >
        {/* 重复检测 */}
      </IconButton>

      <Drawer
        width={450}
        title="重复书签检测"
        visible={visible}
        onCancel={() => setVisible(false)}
        footer={null}
      >
        <div className={styles['duplicate-drawer-toolbar']}>
          <Space size={12}>
            <Button type="primary" loading={scanning} icon={<IconFindReplace />} onClick={handleScan}>
              扫描
            </Button>
            <div className={styles['duplicate-switch-wrap']}>
              <span>自动检测</span>
              <Switch checked={autoDetect} onChange={setAutoDetect} />
            </div>
          </Space>
          <Text type="secondary">
            当前展示模拟结果，共 {mockDuplicateGroups.length} 组，涉及 {totalDuplicateCount} 条书签
          </Text>
        </div>

        <Divider style={{ margin: '16px 0' }} />

        <div className={styles['duplicate-list-header']}>
          <Text bold>重复分组列表</Text>
        </div>

        <Collapse
          className={styles['duplicate-collapse']}
          defaultActiveKey={mockDuplicateGroups.map((group) => group.id)}
          bordered={false}
        >
          {mockDuplicateGroups.map((group) => {
            const selectedValues = manualSelections[group.id] || [];
            const recommendIndex =
              group.items.findIndex((item) => item.id === group.recommendKeepId) + 1;

            return (
              <CollapseItem
                key={group.id}
                name={group.id}
                header={
                  <div className={styles['duplicate-collapse-header']}>
                    <span>{group.title}</span>
                    <Tag color="arcoblue">{group.items.length}条</Tag>
                  </div>
                }
              >
                <Card
                  size="small"
                  className={styles['duplicate-group-card']}
                // title={`${group.title}（${group.items.length}条）`}
                >
                  <List
                    dataSource={group.items}
                    render={(item, itemIndex) => (
                      <List.Item key={item.id}>
                        <div className={styles['duplicate-item-row']}>
                          <div className={styles['duplicate-item-main']}>
                            <Text className={styles['duplicate-item-url']}>{item.url}</Text>
                            <Text type="secondary" className={styles['duplicate-item-title']}>
                              {item.title}
                            </Text>
                          </div>
                          <Space size={8}>
                            {item.id === group.recommendKeepId && <Tag color="green">推荐保留</Tag>}
                            {item.id === group.recommendKeepId && (
                              <Tag bordered color="orangered">
                                第{itemIndex + 1}条
                              </Tag>
                            )}
                          </Space>
                        </div>
                      </List.Item>
                    )}
                  />

                  <div className={styles['duplicate-action-row']}>
                    {/* <Tag color="green">保留建议：第{recommendIndex}条</Tag> */}
                    <Space wrap>
                      <Button
                        status="danger"
                        icon={<IconDelete />}
                        onClick={() => handleDeleteOthers(group.id, group.recommendKeepId)}
                      >
                        删除其余
                      </Button>
                      <Button type="outline">手动选择</Button>
                    </Space>
                  </div>

                  <div className={styles['duplicate-manual-panel']}>
                    <Text type="secondary">手动选择待删除项</Text>
                    <Checkbox.Group
                      direction="vertical"
                      value={selectedValues}
                      onChange={(values) => handleManualSelect(group.id, values as string[])}
                    >
                      {group.items.map((item) => (
                        <Checkbox
                          key={item.id}
                          value={item.id}
                          disabled={item.id === group.recommendKeepId}
                        >
                          {item.url}
                        </Checkbox>
                      ))}
                    </Checkbox.Group>
                    <Text type="secondary">已选择 {selectedValues.length} 条待删除</Text>
                  </div>
                </Card>
              </CollapseItem>
            );
          })}
        </Collapse>
      </Drawer>
    </>
  );
}

export default DuplicateDetectionDrawer;
