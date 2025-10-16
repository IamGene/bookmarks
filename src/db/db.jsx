import { openDB } from 'idb';

export async function getDB() {
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