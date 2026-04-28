import React, { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Checkbox,
  Collapse,
  Link,
  Divider,
  Drawer,
  List,
  Message,
  Layout,
  Space,
  Switch,
  Spin,
  Tag,
  Typography,
} from '@arco-design/web-react';
import { detectDuplicatedBookmarks, removeBookmarks } from '@/db/BookmarksPages';
import {
  setToUpdateCardGroups,
} from '@/store/modules/global';
import { useDispatch } from 'react-redux';
import { IconDelete, IconFindReplace } from '@arco-design/web-react/icon';
import IconButton from './IconButton';
import styles from './style/index.module.less';
import { center } from '@turf/turf';
const { Text } = Typography;
const { Item: CollapseItem } = Collapse;


function DuplicateDetectionDrawer({ currentPage }) {
  const [visible, setVisible] = useState(false);
  const [autoDetect, setAutoDetect] = useState(true);
  const [scanning, setScanning] = useState(false);
  const dispatch = useDispatch();
  const [duplicateGroups, setDuplicateGroups] = useState<any[]>([]);
  const [activeKeys, setActiveKeys] = useState<string[]>([]);
  const [allExpanded, setAllExpanded] = useState(false);
  // const [selectedValues, setSelectedValues] = useState({});
  const [selectedValues, setSelectedValues] = useState(null);
  // const [selectedAnsIds, setSelectedAnsIds] = useState(null);

  const totalDuplicateCount = useMemo(
    () => duplicateGroups.reduce((sum, group) => sum + (group.items?.length || 0), 0),
    [duplicateGroups]
  );

  const [loading, setLoading] = useState(false);

  const handleScan = async () => {
    setScanning(true);
    setLoading(!loading);
    try {
      const groups = await detectDuplicatedBookmarks(currentPage);
      // 初始化 selectedValues（按 group 分组）默认选中的
      const initialSelectedValues: Record<string, string[]> = {};
      groups.forEach((group) => {
        const { id: gId, items, recommendKeepId } = group;
        initialSelectedValues[gId] = items
          .filter((item) => item.id !== recommendKeepId)
          .map((item) => item.id);
      });
      // console.log('xxxxxxxxxxxxxxx handleScan', groups, initialSelectedValues);
      setSelectedValues(initialSelectedValues);
      const list = Array.isArray(groups) ? groups : [];
      setDuplicateGroups(list.length ? list : []);

      // 如果处于全部展开状态，扫描后仍保持全部展开
      if (allExpanded && list.length) {
        setActiveKeys(list.map((g: any) => g.id));
      }
      Message.success(`扫描完成，发现 ${list.length} 组疑似重复书签`);
    } catch (e) {
      console.error('detectDuplicatedBookmarks error', e);
      Message.error('扫描失败');
    } finally {
      setScanning(false);
      setLoading(false);
    }
  };


  const handleManualSelect = (gId: string, ids: string[]) => {
    setSelectedValues((prev) => ({
      ...prev,
      [gId]: ids,
    }));
  };


  const handleRemoveSelected = async (group: any) => {
    // console.log('选中...................', selectedValues?.[group.id]);
    const group1 = duplicateGroups.filter(item => item.id == group.id)[0];
    const items = group1.items;
    const ids = selectedValues?.[group.id];
    if (ids.length > 0) {
      const selectedItems = items.filter(item => ids.includes(item.id));
      const res = await removeBookmarks(ids);
      // const res = true;
      if (res) {
        if (selectedValues?.[group.id].length >= items.length - 1) {
          // console.log('xxxxxxxxxxxxxx 仅剩1条或全部删除', group1);
          setDuplicateGroups(prev => prev.filter(item => item.id !== group.id));
        } else {
          const next = (duplicateGroups).map(dg => {
            const newItems = dg.items.filter(b => !ids.includes(b.id));
            return dg.id === group.id ? { ...dg, items: newItems } : dg;
          });
          setDuplicateGroups(next);
        }

        Message.success('删除成功');
        const ansIds: string[] = Array.from(new Set(selectedItems.map(b => b.ppId)));// 使用 Set 去重，然后再转回数组
        await dispatch(setToUpdateCardGroups(ansIds));
      }
    };
  }




  const render = (actions, item, index) => (

    <List.Item key={item.id} actions={actions}>
      <List.Item.Meta
        avatar={
          <Checkbox
            // style={{ position: 'absolute', top: 2 }} selectedValues
            checked={(selectedValues[item.gId] || []).includes(item.id)}
            onChange={(checked) => {
              const groupIds = selectedValues[item.gId] || [];

              let nextGroupIds: string[];

              if (checked) {
                nextGroupIds = [...groupIds, item.id];
              } else {
                nextGroupIds = groupIds.filter((id) => id !== item.id);
              }
              handleManualSelect(item.gId, nextGroupIds);
            }}
          />
        }

        title={
          <div title={item.url}>
            <a href={item.url} target="_blank">
              <Typography.Text type='primary'
                ellipsis={
                  {
                    // showTooltip: true,
                    rows: 1,
                    expandable: false,
                    suffix: '',
                    ellipsisStr: '...',
                  }
                }
              >
                {item.url}
              </Typography.Text>
            </a>
          </div>
        }
        description={

          <Layout>
            <Typography.Text
              ellipsis={
                {
                  // showTooltip: true,
                  rows: 2,
                  expandable: true,
                  suffix: '',
                  ellipsisStr: '...',
                }
              }
            >
              {item.name}
            </Typography.Text>
            <Typography.Text underline>{item.group}</Typography.Text>
          </Layout>
        }
      />
    </List.Item>
  );


  return (
    <div id='de-duplicate'>
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
        bodyStyle={{
          overflowY: 'scroll',  // 关键
          height: '100%',
          transition: 'none! important'
        }}
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
            {/* 当前展示检测结果，共 {duplicateGroups.length} 组，涉及 {totalDuplicateCount} 条书签 */}
            {duplicateGroups.length > 0 ? `检测到 ${duplicateGroups.length} 组重复，涉及 ${totalDuplicateCount} 条书签` :
              '点击按钮开始检测'}
          </Text>
        </div>
        <Divider style={{ margin: '16px 0' }} />

        {
          selectedValues &&
          (Object.keys(selectedValues).length > 0 ?
            <div className={styles['duplicate-list-header']}>
              {/* <Text bold>重复分组列表</Text> */}
              <Typography.Title heading={6}>重复分组列表</Typography.Title>
              <div>
                <Button type="outline" size="small" onClick={() => {
                  if (allExpanded) {
                    setActiveKeys([]);
                    setAllExpanded(false);
                  } else {
                    const keys = duplicateGroups.map((g) => g.id);
                    setActiveKeys(keys);
                    setAllExpanded(true);
                  }
                }}>
                  {allExpanded ? '全部折叠' : '全部展开'}
                </Button>
              </div>
            </div> :
            <Typography.Title heading={6}>没有检测到重复书签</Typography.Title>)
        }

        {scanning &&
          <Space direction="vertical" size={16} style={{ width: '100%', textAlign: 'center' }}>
            <Spin loading={loading}>
            </Spin>
          </Space>
        }


        {duplicateGroups.length > 0 && <Collapse
          className={styles['duplicate-collapse']}
          activeKey={activeKeys}
          onChange={(keys) => {
            if (activeKeys.includes(keys)) setActiveKeys(prev => prev.filter(k => k !== keys));
            else setActiveKeys(prev => [...prev, keys as string]);
          }}
          bordered={false}
        >
          {duplicateGroups.map((group, index) => {
            const selectedCount = selectedValues?.[group.id]?.length ?? 0;

            return (
              <CollapseItem
                key={group.id}
                name={group.id}
                header={
                  <div className={styles['duplicate-collapse-header']}>
                    <span>{`重复组 #${index + 1}`}</span>
                    <Tag color="arcoblue">{group.items.length}条</Tag>
                  </div>
                }
              >
                <Card
                  size="small"
                  className={styles['duplicate-group-card']}
                >
                  <List
                    className='list-demo-actions'
                    dataSource={group.items}
                    render={render.bind(null, [
                    ])}
                  /*  virtualListProps={{
                     height: 500,//可视区高度 (2.11.0 开始支持如 80% 的 string 类型)
                   }} */
                  />
                  <Space wrap style={{ marginTop: '8px', marginLeft: '16px' }}>
                    <Button
                      status="danger"
                      icon={<IconDelete />}
                      // disabled={(!selectedValues || selectedValues[group.id]?.length === 0)}
                      disabled={selectedCount === 0}
                      onClick={() => handleRemoveSelected(group)}
                    // console.log('选中................... group1', group1);
                    // Message.info(`已删除 ${selectedValues[group.id]?.length || 0} 条书签（模拟）`);
                    // setManualSelections((prev) => ({ ...prev, [group.id]: [] }));
                    >
                      删除选中
                    </Button>
                  </Space>
                </Card>
              </CollapseItem>
            );
          })}
        </Collapse>}

      </Drawer>

    </div >
  );
}

export default DuplicateDetectionDrawer;
