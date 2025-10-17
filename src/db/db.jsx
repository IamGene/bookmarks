import { openDB } from 'idb';

import { Modal, Button, Message } from '@arco-design/web-react';

let checkedPersistence = false;

async function ensurePersistenceOnce() {
  if (!checkedPersistence) {
    checkedPersistence = true;
    await enablePersistence();
  }
}


/**
 * 检查并启用持久化存储（仅在首次初始化时执行）
 */
async function enablePersistence() {
  if (!navigator.storage?.persisted || !navigator.storage?.persist) {
    console.warn('⚠️ 当前浏览器不支持持久化存储 API');
    return;
  }

  const isPersisted = await navigator.storage.persisted();
  console.log('🔍 当前持久化状态:', isPersisted);

  if (isPersisted) {
    console.log('✅ IndexedDB 已是持久化模式');
    return;
  }

  const granted = await navigator.storage.persist();
  console.log('🔍 请求持久化结果:', granted);

  if (granted) {
    console.log('✅ 已成功启用持久化存储（数据不会被自动清除）');
  } else {
    console.warn('⚠️ 用户未授权持久化，数据仍可能被清理');
  }

  console.warn('⚠️ 浏览器拒绝持久化，建议用户点击“启用持久化”或安装为 PWA');
  // 提示用户操作

  Modal.confirm({
    title: '数据持久化',
    content: (
      <div>
        <p>⚠️您的浏览器暂未授权持久化存储。</p>
        <p>请点击下方按钮启用，以防止数据被自动清除。</p>
        <Button
          type="primary"
          style={{ marginTop: 10 }}
          onClick={async () => {
            const ok = await navigator.storage.persist();
            if (ok) {
              Message.success('✅ 持久化已启用');
            } else {
              Message.warning('⚠️ 持久化请求仍被拒绝!!!');
            }
          }}
        >
          启用持久化
        </Button>
      </div>
    ),
    // disabled: true
    okButtonProps: { status: 'danger' },
    onOk: handleOk,
    onCancel: handleCancel,
  });

}

function handleOk() {
  /* navigator.storage.persist().then(() => {
    Message.success('✅ 已启用持久化存储，数据不会被自动清除');
  }).catch(() => {
    Message.error('⚠️ 用户未授权持久化，数据仍可能被清理');
  }); */
}

function handleCancel() {
  Message.info('ℹ️ 您取消了持久化存储的启用操作');
}

export async function getDB() {
  // ✅ 第一步：确保持久化检测（仅执行一次，不影响性能）
  // await ensurePersistenceOnce();
  // ✅ 第二步：打开数据库
  return await openDB('BookmarksDB', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('pages')) {
        db.createObjectStore('pages', { keyPath: 'pageId' });
      }
      if (!db.objectStoreNames.contains('nodes')) {
        // const store = db.createObjectStore('nodes', { keyPath: 'id', autoIncrement: true });
        const store = db.createObjectStore('nodes', { keyPath: 'id' });
        store.createIndex('pageId', 'pageId');
        store.createIndex('pId', 'pId');
      }
      if (!db.objectStoreNames.contains('urls')) {
        const store = db.createObjectStore('urls', { keyPath: 'id' });
        store.createIndex('pageId', 'pageId');
        store.createIndex('gId', 'gId');
      }
    }
  });
}

