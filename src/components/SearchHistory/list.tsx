import React, { useEffect, useState } from 'react';
import {
  List,
  Button,
  Space,
  Result,
  Badge,
  Tag,
} from '@arco-design/web-react';
import useLocale from '@/utils/useLocale';
import styles from './style/index.module.less';
// 导入自定义 Hook
import { removeSearchHistory, clearSearchHistory } from '@/db/BookmarksPages';
import { useSelector } from 'react-redux'
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
  keyword: string;
  onItemClick?: (item: any, index: number) => void;
  onAllBtnClick?: (data: BookmarksPageData[]) => void;
  clearSignal?: number;
  onEmpty?: (isEmpty: boolean) => void;
}

function History(props: BookmarksPageProps) {
  const t = useLocale();
  const { keyword } = props;

  const searchState = useSelector((state: any) => state.global.search);
  const { searchHistory } = searchState;
  const [words, setWords] = useState(searchHistory);//初始化数据

  // console.log("1111111111111111111 SearchHistory History  searchHistory:", searchHistory);
  useEffect(() => {//增加搜索记录
    setWords(searchHistory);
  }, [searchHistory]);
  function onItemClick(item: string, index: number) {
    props.onItemClick(item, index);
  }



  function onItemClose(item: string, index: number) {
    // 先从本地 state 中移除，提升响应速度
    setWords(prev => {
      const list = Array.isArray(prev) ? [...prev] : [];
      const idx = list.findIndex(i => i === item);
      if (idx > -1) list.splice(idx, 1);
      return list;
    });
    // 再调用数据库方法删除持久化的历史记录（异步）
    try {
      removeSearchHistory(item);
    } catch (e) {
      console.error('removeSearchHistory failed', e);
    }
  }

  // 监听父组件发来的清空信号：清空本地 words 并从 DB 中删除每一项
  useEffect(() => {
    const sig = props.clearSignal;
    if (!sig) return; // 仅当信号为正整数时触发
    setWords(prev => {
      // 并发删除持久化历史（异步）
      clearSearchHistory().catch(e => console.error('clearSearchHistory failed', e));
      return [];
    });
  }, [props.clearSignal]);


  useEffect(() => {//增加搜索记录
    if (!keyword || !String(keyword).trim()) return;
    const list = Array.isArray(words) ? [...words] : [];
    const idx = list.findIndex(item => item === keyword);
    if (idx > -1) list.splice(idx, 1);
    list.unshift(keyword);
    setWords(list);
  }, [keyword]);

  useEffect(() => {
    // 监听本地 words 变化，通知父组件当前是否为空
    const isEmpty = !(Array.isArray(words) && words.length > 0);
    try {
      props.onEmpty && props.onEmpty(isEmpty);
    } catch (e) {
      console.error('onEmpty callback error', e);
    }
  }, [words]);


  const {
    'tag-list': tagList,
    'tag-item': tagItem,
    'tag-text': tagText,
    'tag-close': tagClose,
  } = styles;

  return (
    <List
      noDataElement={<Result status="404" subTitle={t['message.empty.tips']} />}
    >
      <List.Item
        key={'1'}
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
        >
          <List.Item.Meta
            title={
              <div className={styles['message-title']}>
                <Space size={4} wrap>
                  <div className={tagList}>
                    {words.map((k, idx) => (
                      <div key={idx} className={tagItem} onClick={() => {
                        onItemClick(k, idx);
                      }}>
                        <span className={tagText}>{k}</span>
                        <span className={tagClose} onClick={(e) => {
                          e.stopPropagation();      // 🔑 关键：阻止冒泡
                          onItemClose(k, idx);
                        }}>×</span>
                      </div>
                    ))}
                  </div>

                </Space>
              </div>
            }
          />
        </div>
      </List.Item>
    </List>

  );


}

export default History;