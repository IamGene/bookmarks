import { openDB } from 'idb';

export async function getDB() {
  // IndexedDB 版本号从 1 改为 2，以触发 upgrade 并创建 history 对象存储。
  return await openDB('BookmarksDB', 2, {
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
      if (!db.objectStoreNames.contains('history')) {
        db.createObjectStore('history', { keyPath: 'word' });
      }
    }
  });
}