import React, { useEffect } from 'react';
import { getCollectPageGroups } from '../db/bookmarksPages';
// TODO: 后续可以引入 saveBookmarkToDB 函数用于保存书签

const ExtensionHelper: React.FC = () => {
  useEffect(() => {
    console.log('✅ Extension Helper 加载成功');

    const handleMessage = async (event: MessageEvent) => {
      console.log('收到消息:', event.origin, event.source);

      // 安全校验：同源消息
      if (event.origin !== window.location.origin) return;

      const { type, payload } = event.data || {};
      console.log('消息 type:', type);

      switch (type) {
        case 'PING':
          handlePing(event);
          break;
        case 'LIST_GROUPS':
          await handleListGroups(event);
          break;
        case 'SAVE_BOOKMARK':
          await handleSaveBookmark(event, payload);
          break;
        default:
          console.warn('未知消息类型:', type);
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  /** 心跳检测 */
  const handlePing = (event: MessageEvent) => {
    console.log('PING 收到，回复 PONG');
    window.parent.postMessage({ type: 'PONG' }, '*');
  };

  /** 获取分组列表 */
  const handleListGroups = async (event: MessageEvent) => {
    console.log('开始获取分组数据...');
    try {
      const groups = await getCollectPageGroups();
      console.log('helper 已返回分组数据', groups);
      window.parent.postMessage({ type: 'GROUPS_RESPONSE', payload: groups }, '*');
    } catch (err) {
      console.error('获取分组失败:', err);
      window.parent.postMessage({ type: 'GROUPS_RESPONSE', payload: [] }, '*');
    }
  };

  /** 保存书签 */
  const handleSaveBookmark = async (event: MessageEvent, payload: any) => {
    console.log('准备保存书签:', payload);
    try {
      // TODO: 这里可以调用 saveBookmarkToDB(payload)
      console.log('书签保存成功（模拟）');
      window.parent.postMessage({ type: 'SAVE_RESULT', payload: { ok: true } }, '*');
    } catch (err: any) {
      console.error('保存书签失败:', err);
      window.parent.postMessage({ type: 'SAVE_RESULT', payload: { ok: false, error: err.message } }, '*');
    }
  };

  return null; // 不需要渲染 UI
};

export default ExtensionHelper;
