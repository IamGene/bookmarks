import React, { useEffect, useState, useContext } from 'react';
import { TagContext } from './context';

import {
  List,
  Space,
  Result,
  Tag,
  Empty
} from '@arco-design/web-react';
import useLocale from '@/utils/useLocale';
import styles from './style/index.module.less';
// 导入自定义 Hook
import { useFetchPageData } from '@/hooks/fetchPageData';
import { useSelector } from 'react-redux';

export interface MessageItemData {
  id: string;
  title: string;
  subTitle?: string;
  avatar?: string;
  content: string;
  time?: string;
  status: number;
  tag?: {
    text?: string;
    color?: string;
  };
}

export interface BookmarksPageData {
  pageId: number;
  title: string;
  default: boolean
  createAt: number;
  updateAt: number;
  new?: boolean;
  tag?: {
    text?: string;
    color?: string;
  };
}

export type MessageListType = MessageItemData[];
export type BookmarksPagesType = BookmarksPageData[];


interface BookmarksPageProps {
  currentPageId: number;
  // addedPageIds: number[];
  onItemClick?: (any) => void;
  onAllBtnClick?: (data: BookmarksPageData[]) => void;
}

const COLORS = [
  'red',
  'orangered',
  'orange',
  'gold',
  'lime',
  'green',
  'cyan',
  'blue',
  'arcoblue',
  'purple',
  'pinkpurple',
  'magenta',
  'gray',
];

function TagList(props: BookmarksPageProps) {
  const t = useLocale();
  // console.log('useEffect BookmarksPages addedPageIds', addedPageIds);
  // console.log("BookmarksPages currentPageId=", currentPageId);

  const globalState = useSelector((state: any) => state.global);
  const { tagsMap } = globalState;
  const keys = tagsMap ? Array.from(new Set(Object.keys(tagsMap))) : [];
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const item = useContext(TagContext);
  // debug: console.log('3333333333333 TagList item=', item);

  // 当外部通过 TagContext 传入要取消/选择的 tag 时作出响应
  useEffect(() => {
    if (!item) return;
    // debug: console.log('3333333333333 TagList item=', item);
    // 如果外部要求取消选中，则从 selectedTags 中移除
    setSelectedTags(prev => prev.filter(x => x !== item));
    // 同步触发父回调，通知外部该 tag 已取消选中
    // props.onItemClick && props.onItemClick({ key, index: -1, color: undefined, selected: false });
  }, [item]);

  function onItemClick(k: any, color: string, index: number) {
    let selected = selectedTags.includes(k);//原来已/未选中
    setSelectedTags(prev => {
      if (!selected) return [...prev, k];
      return prev.filter(x => x !== k);
    });
    // props.onItemClick && props.onItemClick(k, index, !selected);
    props.onItemClick && props.onItemClick({ key: k, index, color, selected: !selected });
  }

  useEffect(() => {
    // console.log('useEffect currentPageId', currentPageId)
  }, [selectedTags]);

  return (
    keys.length === 0 ?
      <Empty description={t['bookmark.noTags']} style={{ alignContent: 'center' }}></Empty> :
      <List
        noDataElement={<Result status="404" subTitle={t['message.empty.tips']} />}
      >
        <List.Item
          key={'tags'}
          actionLayout="vertical"
          style={{
            // opacity: item.status ? 0.5 : 1,//0.5:半透明
            opacity: 1,
          }}
        >
          <div
            style={{
              cursor: 'pointer',
            }}
          /*  onClick={() => {
             onItemClick('tag', 1);
           }} */
          >
            <List.Item.Meta
              title={
                <div className={styles['message-title']}>
                  <Space size={4} wrap>
                    {keys.map((k, idx) => {
                      const checked = selectedTags.includes(k);
                      const color = checked ? COLORS[idx % COLORS.length] : undefined;
                      return (
                        <Tag
                          key={k}
                          bordered
                          checked={checked}
                          size="medium"
                          color={color}
                          onClick={(nextChecked) => {
                            onItemClick(k, COLORS[idx % COLORS.length], idx);
                          }}
                        >
                          {k}
                        </Tag>
                      );
                    })}



                  </Space>
                </div>
              }
            />
          </div>
        </List.Item>
      </List>
  );


}

export default TagList;