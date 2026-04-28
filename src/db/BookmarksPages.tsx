import { getDB } from './db';


// 保存书签页及其节点
function uuid() {
    return Math.random().toString(36).substr(2, 9);
}

/**
 * 判断结果：if(formatTimestamp(input))
 * @param input 
 * @returns string类型
 */
function formatTimestamp(input) {
    if (input === undefined || input === null || input === "") return "";

    // 如果是字符串且不是纯数字，优先尝试用 Date 解析（支持 YYYY-MM, YYYY-MM-DD, ISO 等）
    if (typeof input === "string") {
        const digitsOnly = /^\d+$/;
        if (!digitsOnly.test(input)) {
            const parsed = new Date(input);
            if (!isNaN(parsed.getTime())) {
                const year = parsed.getFullYear();
                const month = String(parsed.getMonth() + 1).padStart(2, "0");
                const day = String(parsed.getDate()).padStart(2, "0");
                return `${year}-${month}-${day}`;
            }
            // 如果解析失败，继续走数值化尝试（兼容字符串时间戳）
        }
    }

    // 转为数字（支持数字类型或数字字符串）
    let ts = typeof input === "number" ? input : Number(input);
    if (isNaN(ts)) return "";

    // 自动识别秒级（10位）或毫秒级（13位）
    if (ts < 1e11) {
        ts *= 1000; // 秒级 -> 毫秒级
    }

    const date = new Date(ts);
    if (isNaN(date.getTime())) return "";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


export async function addNewBookmark(bookmark) {
    const db = await getDB();
    try {
        bookmark.id = uuid();
        const gId = bookmark.gId;
        const group = await db.get('groups', gId);
        const dateNow = Date.now();
        const date = formatTimestamp(dateNow);
        const saveBookmark = {
            id: uuid(),
            pageId: group ? group.pageId : null,
            gId: bookmark.gId,
            type: "bookmark",
            name: bookmark.name,
            url: bookmark.url,
            // title: bookmark.title,
            description: bookmark.description,
            hide: bookmark.hide,
            icon: bookmark.icon,
            addDate: dateNow,
            date: date
        };
        await db.put('bookmarks', saveBookmark);
        // console.log('addNewBookmark', saveBookmark);
        return saveBookmark;
    } catch (e) {
        console.error('updateBookmarkById error', e);
        return null;
    }
}

export async function updateGroupById(group) {
    const db = await getDB();
    try {
        // 1. 根据 id 从 'groups' 表中获取现有的书签数据
        const existingGroup = await db.get('groups', group.id);
        if (!existingGroup) {
            console.error(`Group with id ${group.id} not found.`);
            return null;
        }
        //切换了书签页
        if (existingGroup.pageId !== group.pageId) {
            //查出该分组下的所有子分组和书签 扁平化数据结构
            const groupData = await getPageGroupData1(group);
            const groupList = groupData.groupList;
            const bookmarkList = groupData.bookmarkList;
            // console.log('--------------- updateGroupById getPageGroupData1,groupData', groupData);
            // console.log('--------------- updateGroupById getPageGroupData1,groupList', groupList);
            // console.log('--------------- updateGroupById getPageGroupData1,bookmarkList', bookmarkList);
            // console.log('--------------- updateGroupById getPageGroupData1,bookmarkList。length', bookmarkList.length);
            for (const bookmark of bookmarkList) {
                // 这样可以保留 'addDate' 等不在表单中的字段
                console.log('--------------- updateGroupById updateBookmark', bookmark);
                const updateBookmark = {
                    ...bookmark,
                    pageId: group.pageId,
                };
                await db.put('bookmarks', updateBookmark);//?????????????????????????
            }
            for (let i = 0; i < groupList.length; i++) {
                const group1 = groupList[i];
                const updateGroup = {
                    ...group1,
                    pageId: group.pageId,
                };
                await db.put('groups', updateGroup);//?????????????????????????
            }
            group.path = await getNodePath(group);
            return group;
        }


        //如果group.pId变为===group.id则新建一个子分组,并且将原来的书签数据转移到该子分组
        if (group.id === group.pId) {
            // const parentGroup = await db.get('groups', group.pId);
            const id = uuid(); //重新设置id（相当于新增分组）
            //重新设置书签的gId为新的id
            const urls = await db.getAllFromIndex('bookmarks', 'gId', group.pId);
            for (let i = 0; i < urls.length; i++) {
                const url = urls[i];
                url.gId = id;
                await db.put('bookmarks', url);///?????????????????????????
            }
            group.id = id;
        }

        // 2. 将传入的新数据与旧数据合并
        // 这样可以保留 'addDate' 等不在表单中的字段
        group.path = await getNodePath(group);
        const updatedGroup = {
            ...existingGroup,
            ...group,
        };
        // 3. 将更新后的数据存回数据库
        await db.put('groups', updatedGroup);//?????????????????????????
        return updatedGroup;
    } catch (e) {
        console.error('updateGroupById error', e);
        return null;
    }
}


export async function updateBookmarkById(bookmark) {
    const db = await getDB();
    try {
        // 1. 根据 id 从 'bookmarks' 表中获取现有的书签数据
        const existingBookmark = await db.get('bookmarks', bookmark.id);
        if (!existingBookmark) {
            console.error(`Bookmark with id ${bookmark.id} not found.`);
            return null;
        }
        // 2. 将传入的新数据与旧数据合并
        // 这样可以保留 'addDate' 等不在表单中的字段
        const updatedBookmark = {
            ...existingBookmark,
            ...bookmark,
        };
        // 3. 将更新后的数据存回数据库
        await db.put('bookmarks', updatedBookmark);
        return updatedBookmark;
    } catch (e) {
        console.error('updateBookmarkById error', e);
        return null;
    }
}


export async function renameBookmarkPageById(bookmarkPage) {
    const db = await getDB();
    try {
        const dateNow = Date.now();
        bookmarkPage.updatedAt = dateNow;
        // 1. 根据 id 从 'bookmarks' 表中获取现有的书签数据
        const existingBookmarkPage = await db.get('pages', bookmarkPage.pageId);
        if (!existingBookmarkPage) {
            console.error(`BookmarkPage with pageId ${bookmarkPage.id} not found.`);
            return null;
        }
        // 2. 将传入的新数据与旧数据合并
        // 这样可以保留 'addDate' 等不在表单中的字段
        const updatedBookmarkPage = {
            ...existingBookmarkPage,
            ...bookmarkPage,
        };
        // 3. 将更新后的数据存回数据库
        await db.put('pages', updatedBookmarkPage);
        return updatedBookmarkPage;
    } catch (e) {
        console.error('updateBookmarkById error', e);
        return null;
    }
}


export async function saveGroup(group) {
    const db = await getDB();
    const pId = group.pId;
    const id = uuid();
    // const path = pId ? `${pId}` + ',' + `${id}` : `${id}`;
    // const path = pId ? `${pId}` + ',' + `${id}` : `${id}`;

    group.id = id;
    const path = await getNodePath(group);

    let pageId = group.pageId;
    try {
        if (!pageId) {
            const newPageId = Date.now();
            const newPageData = {
                pageId: newPageId,
                title: '新建书签页', // 标题添加后缀以区分
                default: false, // 导入的页面不设为默认
                createdAt: newPageId,
                updatedAt: newPageId,
            };
            await db.put('pages', newPageData);
            group.pageId = newPageId;
            // return newPageData; // 返回所有新页面的 ID
        }
        const saveGroup = {
            id: id,
            pageId: group.pageId,
            type: "folder",
            name: group.name,
            hide: false,
            path: path,
            pId: pId,
            addDate: Date.now(),
        }
        console.log('save node', saveGroup);
        await db.put('groups', saveGroup);
        return saveGroup;
    } catch (e) {
        console.error('savePageBookmarks error', e);
        return null;
    }
}


export async function savePageBookmarks(pageData) {
    try {
        const db = await getDB();
        const { pageId, title, createdAt, root, type } = pageData;
        await db.put('pages', { pageId, title, createdAt, updatedAt: createdAt, type });
        async function saveNode(node, parentId, parentPath, order) {
            const nodeId = uuid();
            // console.log('node.addDate', node.addDate);
            const nodePath = parentPath ? `${parentPath},${nodeId}` : `${nodeId}`
            await db.put('groups', {
                id: nodeId,
                pageId,
                name: node.name,
                order,
                pId: parentId,
                addDate: node.addDate,
                lastModified: node.last_modified,
                // hide: false,
                // type: node.type,
                // description: node.description,
                // icon: node.icon,
                // title: node.title,
                // url: node.url || null,
                // path: parentId ? `${parentId},${nodeId}` : `${nodeId}`,
                path: nodePath,
            });
            // 顺序保存 urlList
            if (Array.isArray(node.urlList)) {
                for (let i = 0; i < node.urlList.length; i++) {
                    const url = node.urlList[i];
                    const date = formatTimestamp(url.addDate);
                    await db.put('bookmarks', {
                        id: uuid(),
                        pageId,
                        gId: nodeId,
                        // type: url.type,
                        // title: url.title,
                        // hide: url.hide,
                        name: url.name,
                        description: url.description,//和name相同
                        url: url.url,
                        icon: url.icon,
                        addDate: url.addDate,
                        date: date
                    });
                }
            }
            // 顺序保存 children
            if (Array.isArray(node.children)) {
                for (let i = 0; i < node.children.length; i++) {
                    await saveNode(node.children[i], nodeId, nodePath, i);
                }
            }
        }
        // root 顺序保存
        for (let i = 0; i < root.length; i++) {
            await saveNode(root[i], null, null, i);
        }
        return true;
    } catch (e) {
        console.error('savePageBookmarks error', e);
        return false;
    }
}

export async function getPages() {
    const db = await getDB();
    const tx = db.transaction('pages', 'readonly');
    const store = tx.objectStore('pages');
    const allPages = await store.getAll();
    return allPages; // 根节点
}

export async function getPage(pageId) {
    const db = await getDB();
    const page = await db.get('pages', pageId); 7

    if (!page) {
        console.error(`BookmarkPage with pageId ${pageId} not found.`);
        return null;
    }
    return page;
}


export async function setDefaultPage(pageId) {
    const db = await getDB();
    const tx = db.transaction('pages', 'readwrite');
    const store = tx.objectStore('pages');
    const allPages = await store.getAll();
    for (const page of allPages) {
        page.default = (page.pageId === pageId);
        await store.put(page);
    }
    await tx.done; // 确保事务完成
}

export async function setCurrentPage(pageId) {
    const db = await getDB();
    const tx = db.transaction('pages', 'readwrite');
    const store = tx.objectStore('pages');
    const allPages = await store.getAll();
    for (const page of allPages) {
        page.current = (page.pageId === pageId);
        await store.put(page);
    }
    await tx.done; // 确保事务完成
}

/**
 * 批量保存书签数组到 DB
 * @param {Array} urlsData - 数组，元素形如 { id?, title, url, icon?, groupId }
 * @returns {Promise<Array<{ok: boolean, data?: object, error?: string}>>}
 */
export async function saveBookmarksToDB(urlsData) {
    if (!Array.isArray(urlsData)) {
        throw new TypeError('saveBookmarksToDB expects an array');
    }

    const db = await getDB();
    const results = [];

    for (let i = 0; i < urlsData.length; i++) {
        const item = urlsData[i];
        try {
            if (!item || !item.url || !item.groupId) {
                results.push({ ok: false, error: 'missing url or groupId', data: item });
                continue;
            }

            // 读取 group 节点以获取 pageId
            const group = await db.get('groups', item.groupId);
            if (!group) {
                results.push({ ok: false, error: `group not found: ${item.groupId}`, data: item });
                continue;
            }

            const dateNow = Date.now();
            const date = formatTimestamp(dateNow);
            const entryId = item.id || uuid();

            const saveData = {
                id: entryId,
                pageId: group.pageId,
                gId: item.groupId,
                hide: false,
                icon: item.icon || '',
                addDate: dateNow,
                date: date,
                name: item.title || '',
                description: item.title || '',
                type: 'bookmark',
                url: item.url,
            };

            // 兼容现有代码风格：直接 put
            await db.put('bookmarks', saveData);
            // results.push({ ok: true, data: saveData });
            results.push(saveData);
        } catch (err) {
            console.error('saveBookmarksToDB item error', err, urlsData[i]);
            // results.push({ ok: false, error: String(err), data: urlsData[i] });
        }
    }
    return results;
}


export async function getSearchHistory() {
    const db = await getDB();
    const tx = db.transaction('history', 'readonly');
    const store = tx.objectStore('history');
    const allHistory = await store.getAll();
    // 按 date 降序排序并只提取 word 字段
    allHistory.sort((a, b) => (b?.date ?? 0) - (a?.date ?? 0));
    const words = allHistory.map(item => item?.word).filter(Boolean);
    return words;
}

export async function removeSearchHistory(word: string) {
    const db = await getDB();
    try {
        // console.log('zzzzzzzzzzzzzzzzz removeSearchHistory word', word);
        await db.delete('history', word);
        return true;
    }
    catch (e) {
        console.error('removeSearchHistory error', e);
        return false;
    }
}
export async function clearSearchHistory() {
    const db = await getDB();
    try {
        // console.log('zzzzzzzzzzzzzzzzz removeSearchHistory word', word);
        await db.clear('history');
        return true;
    }
    catch (e) {
        console.error('removeSearchHistory error', e);
        return false;
    }
}

export async function saveSearchHistory(word) {
    const db = await getDB();
    try {
        const dateNow = Date.now();
        // const date = formatTimestamp(dateNow);
        // 先尝试读取已有记录（keyPath 为 word）
        const existing = await db.get('history', word);
        if (existing) {
            existing.date = dateNow;
            await db.put('history', existing);
            return existing;
        } else {
            const saveData = {
                word: word,
                date: dateNow,
            };
            await db.put('history', saveData);
            return saveData;
        }
    } catch (e) {
        console.error('save error', e);
        return null;
    }
}

export async function saveBookmarkToDB(urlData) {
    const db = await getDB();
    const { id, title, url, icon, groupId, status } = urlData;
    try {
        // const nodes = await db.getKey('groups', 'id', groupId);
        const group = await db.get('groups', groupId);
        // const tx = db.transaction('bookmarks', 'readwrite');
        const dateNow = Date.now();
        const date = formatTimestamp(dateNow);
        const saveData = {
            id: id,
            pageId: group.pageId,
            gId: groupId,
            hide: false,
            icon: icon,
            addDate: dateNow,
            date: date,
            name: title,
            description: title,
            type: "bookmark",
            url: url,
            // tags: ['xxxx']
        };
        await db.put('bookmarks', saveData);
        // await tx.done; // 确保事务完成
        // console.log('save success', saveData);
        return saveData;
    } catch (e) {
        console.error('save error', e);
        return null;
    }
}

export async function getBookmarkById(id) {
    try {
        const db = await getDB();
        const url = await db.get('bookmarks', id);
        return url;
    } catch (e) {
        console.error('exportPageJson error', e);
        return null;
    }
}
export async function getBookmarkGroupById(id) {
    try {
        const db = await getDB();
        const group = await db.get('groups', id);
        group.path = await getNodePath(group);
        return group;
    } catch (e) {
        console.error('exportPageJson error', e);
        return null;
    }
}


export async function getNodePath(node: any) {
    // if (!node.pId) return node.id;
    if (!node.pId) return `${node.id}`;
    const db = await getDB();
    async function nodePath(pId: string, path: string) {
        if (pId) {
            const pGroup = await db.get('groups', pId);
            if (pGroup) {//存在
                return pGroup.pId ? nodePath(pGroup.pId, pGroup.id + "," + path)
                    : pGroup.id + "," + path;
            }
        }
        return path;
    }
    return nodePath(node.pId, node.id);
}

export async function getNodePathName(node: any) {
    let ans = node;
    if (!node.pId) return { pathNames: `${node.name}`, ans };
    const db = await getDB();
    async function nodePath(pId: string, pathName: string) {
        if (pId) {
            const pGroup = await db.get('groups', pId);

            if (pGroup) {//存在
                ans = pGroup;
                // console.log('xxxxxxxxxxxxxx ans 1', ans);
                const pathNames = pGroup.pId ? nodePath(pGroup.name, pGroup.name + "/" + pathName) : pGroup.name + "/" + pathName;
                return { pathNames, ans }
            }
        }
        return pathName;
    }
    // const pathName = nodePath(node.pId, node.name);
    const res = nodePath(node.pId, node.name);
    // console.log('xxxxxxxxxxxxxx ans', ans);
    return res;
}

export async function getBookmarksNumByGId(gId) {
    try {
        const db = await getDB();
        const urls = await db.getAllFromIndex('bookmarks', 'gId', gId);
        return urls.length;
    } catch (e) {
        console.error('getBookmarksNumByGId error', e);
        return 0;
    }
}

export async function getBookmarksByIds(ids: string[]) {
    try {
        const db = await getDB();
        const bookmarks = await Promise.all(ids.map(id => db.get('bookmarks', id)));
        return bookmarks;
    } catch (e) {
        console.error('getBookmarksByIds error', e);
        return [];
    }
}

export async function moveBookmarks(bookmarks: any[], gId: string) {
    try {
        const db = await getDB();
        const group = await db.get('groups', gId);
        if (!group) {
            console.error('Target group not found');
            return { success: false };
        }
        let path = await getNodePath(group);
        const nodes = await db.getAllFromIndex('groups', 'pId', gId);
        if (nodes.length > 0) {
            path = path + ',' + gId + '_copy';//如果目标分组下有子分组，则path需要加上子分组的id（因为书签的path是根据分组的path来的）
        }
        group.path = path;
        // Assuming bookmarks is an array of bookmark objects with an 'id' property
        const updatedBookmarks = await Promise.all(bookmarks.map(async (bookmark) => {
            const updatedBookmark = { ...bookmark, gId };
            await db.put('bookmarks', updatedBookmark);
            return updatedBookmark;
        }));
        return { success: true, group };
    } catch (e) {
        console.error('getBookmarksByIds error', e);
        return { success: false };
    }
}

export async function getBookmarksByGId(gId) {
    try {
        const db = await getDB();
        const urls = await db.getAllFromIndex('bookmarks', 'gId', gId);
        return urls;
    } catch (e) {
        console.error('getBookmarksByGId error', e);
        return [];
    }
}
export async function getBookmarkGroupsByPId(pId) {
    try {
        const db = await getDB();
        const nodes = await db.getAllFromIndex('groups', 'pId', pId);
        if (nodes.length > 0) {
            nodes.sort((a, b) => (b.addDate ?? 0) - (a.addDate ?? 0));
            const urls = await db.getAllFromIndex('bookmarks', 'gId', pId);
            if (urls.length > 0) {//复制分组
                const node = await db.get('groups', pId);
                node.copy = true;
                return [node, ...nodes]
                // return [...nodes, node];
            }
            return nodes;
        }
        return null;
    } catch (e) {
        console.error('getBookmarkGroupsByPId error', e);
        return null;
    }
}

export async function exportPageJson(pageId) {
    try {
        const db = await getDB();
        // 查询 pages 表
        const page = await db.get('pages', pageId);
        // 查询 nodes 表中所有 pageId 匹配的数据
        const nodes = await db.getAllFromIndex('groups', 'pageId', pageId);
        // const nodes = await db.getAllFromIndex('nodes', 'pageId', pageId);
        // 查询 urls 表中所有 pageId 匹配的数据
        const urls = await db.getAllFromIndex('bookmarks', 'pageId', pageId);

        // 规范化历史遗留字段：将 add_date -> addDate（覆盖），删除 add_date，
        // 并将 date 字段设置为 addDate/add_date 的 YYYY-MM-DD 形式；同时写回 DB 以保持持久化一致性
        if (Array.isArray(urls) && urls.length > 0) {
            for (const u of urls) {
                // 优先使用遗留字段 add_date，其次 addDate，再尝试已有的 date，最后使用当前时间
                const source = u.add_date ?? u.addDate ?? u.date ?? Date.now();

                // 将遗留字段迁移到统一字段 addDate
                u.addDate = source;
                // 删除遗留字段
                if (u.hasOwnProperty('add_date')) delete u.add_date;

                // 格式化为 YYYY-MM-DD
                try {
                    const formatted = formatTimestamp(source);
                    u.date = formatted || formatTimestamp(Date.now());
                } catch (err) {
                    u.date = formatTimestamp(Date.now());
                }

                // 写回数据库以移除遗留字段并保存规范化 date
                try {
                    await db.put('bookmarks', u);
                } catch (err) {
                    // 写入失败不阻止导出，记录错误
                    console.error('normalize url writeback error', err, u && u.id);
                }
            }
        }

        // 封装为 JSON 格式
        const result = {
            // page: page || null,
            pages: page ? [page] : [],
            // urls: urls || [],
            bookmarks: urls || [],
            // nodes: nodes || [],
            groups: nodes || [],
        };
        return result;
    } catch (e) {
        console.error('exportPageJson error', e);
        return null;
    }
}

/**
 * 导出所有书签页的数据为 JSON
 * @returns {Promise<object|null>}
 */
export async function exportAllPagesJson() {
    try {
        const db = await getDB();
        // 查询所有 pages
        const pages = await db.getAll('pages');
        // 查询所有 nodes
        const nodes = await db.getAll('groups');
        // 查询所有 urls
        const bookmarks = await db.getAll('bookmarks');
        // 封装为 JSON 格式
        const result = {
            pages: pages || [],
            bookmarks: bookmarks || [],
            groups: nodes || [],
        };
        return result;
    } catch (e) {
        console.error('exportAllPagesJson error', e);
        return null;
    }
}


//获取整个大分组的数据(包括子分组和书签)
export async function getAllBookmarksByGroupId(groupId) {
    try {
        let allBookmarks = 0;
        const toRemoveTags = [];

        // console.log('ssssssssssssssss removeGroupById groupId', groupId);
        const db = await getDB();
        const root = await db.get('groups', groupId);
        if (!root) return { success: false, bookmarksNum: 0, toRemoveTags };;

        // const seenGroupTag = new Set<string>(); // 用于去重： `${gId}:::${value}`

        // 递归深度优先删除：先遍历子分组，再当前分组及其书签
        async function getByGroupAndChildren(id) {
            const children = await db.getAllFromIndex('groups', 'pId', id);
            for (const child of children) {
                await getByGroupAndChildren(child.id);
            }

            const urls = await db.getAllFromIndex('bookmarks', 'gId', id);
            if (urls && urls.length > 0) {
                for (const url of urls) {
                    allBookmarks++;
                    // bookmarkList.push(url);
                    const tags = url.tags;
                    if (Array.isArray(tags) && tags.length > 0) {
                        // const newTags = tags.map(t => String(t).trim()).filter(Boolean);
                        for (const t of tags) toRemoveTags.push({ tag: t, add: false, id: url.id });
                    }
                }
            }
        }

        await getByGroupAndChildren(groupId);
        // return allBookmarks;
        return { success: true, bookmarksNum: allBookmarks, toRemoveTags };
    } catch (e) {
        return { success: false, bookmarksNum: 0, toRemoveTags: [] };
    }
}

//获取整个大分组的数据(包括子分组和书签)
export async function getBookmarksGroupById(groupId) {

    // 递归查找目标分组
    function findNode(nodes, id) {
        if (!Array.isArray(nodes) || nodes.length == 0) return null;
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            if (node.id === id) return node;
            if (node.children) {
                const found = findNode(node.children, id);
                if (found) return found;
            }
        }
        return null;
    }
    /////////////////////////////////

    try {
        const db = await getDB();
        const group = await db.get('groups', groupId);
        // console.log('group', group);
        if (!group) return null;//先校验存不存在

        // 读取整页树并规范化（合并因同时包含子文件夹和书签而分裂的节点）
        const pageId = group.pageId;
        const pageTreeData = await getPageTree(pageId);
        const groupsData = pageTreeData.data;
        // const normalized = processPageTree(pageTree);

        const groupData = findNode(groupsData, groupId);
        // return result || null;
        const data = {
            pageData: groupsData, groupData: groupData
        }
        //是否找到？
        return groupData ? data : null;
    } catch (e) {
        console.error('getBookmarksGroupById error', e);
        return null;
    }
}

export async function addBookmarksPage(title) {
    try {
        const db = await getDB();
        const newPageId = Date.now();
        // 1. 遍历并保存 pages，同时建立 pageId 映射
        const newPageData = {
            pageId: newPageId,
            // title: `${oldPage.title}-导入`, // 标题添加后缀以区分
            // title: `${page.name}`, // 标题添加后缀以区分
            title: title, // 标题添加后缀以区分
            default: false, // 导入的页面不设为默认
            createdAt: newPageId,
            updatedAt: newPageId,
            bookmarksNum: 0,
        };
        await db.put('pages', newPageData);
        return newPageData; // 返回所有新页面的 ID
    } catch (e) {
        console.error('addBookmarksPage error', e);
        return null;
    }
}

export async function resortNodes(sortData: any[]) {
    try {
        const db = await getDB();
        // console.log('sortData', sortData);
        for (let i = 0; i < sortData.length; i++) {
            const sortedNode = sortData[i];
            const group = await db.get('groups', sortedNode.id);
            const newGroup = {
                ...group,
                ...sortedNode
            }
            // console.log('sortData 1111111111', newGroup);
            await db.put('groups', newGroup);
        }
        return true;
    } catch (e) {
        console.error('addBookmarksPage error', e);
        return false;
    }
}

/**
 * 根据导出的 JSON 数据导入并保存为新的书签页
 * @param {object} jsonData - 从 exportPageJson 获取的数据结构 { page, nodes, urls }
 * @returns {Promise<number|null>} 成功则返回新的 pageId，失败则返回 null
 */
export async function importPageJson(jsonData) {
    try {
        const db = await getDB();
        // const { pages, nodes, urls } = jsonData;
        const { pages, groups, bookmarks } = jsonData;
        console.log('importPageJson jsonData', jsonData);
        console.log('importPageJson pages ', pages);
        console.log('importPageJson groups', groups);
        console.log('importPageJson bookmarks', bookmarks);
        // if (!Array.isArray(pages) || !Array.isArray(nodes) || !Array.isArray(urls)) {
        if (!Array.isArray(pages) || !Array.isArray(groups) || !Array.isArray(bookmarks)) {
            throw new Error("导入失败：JSON 数据格式无效。");
        }

        const pageIdMap = {}; // 存储旧 pageId 到新 pageId 的映射
        const nodeIdMap = {}; // 存储旧 nodeId 到新 nodeId 的映射
        const newlyImportedPageIds = []; // 存储所有新导入的 pageId
        const baseNewPageId = Date.now();
        let pageIdOffset = 0; // 用于生成唯一的 pageId
        // 1. 遍历并保存 pages，同时建立 pageId 映射
        for (const oldPage of pages) {
            // const newPageId = Date.now(); // 为新页面生成新 ID
            const newPageId = baseNewPageId + (pageIdOffset++); // 为新页面生成新 ID
            // pageIdOffset++;
            pageIdMap[oldPage.pageId] = newPageId;
            newlyImportedPageIds.push(newPageId);

            const newPageData = {
                ...oldPage,
                pageId: newPageId,
                // title: `${oldPage.title}-导入`, // 标题添加后缀以区分
                title: `${oldPage.title}`, // 标题添加后缀以区分
                default: false, // 导入的页面不设为默认
                createdAt: newPageId,
                updatedAt: newPageId,
            };
            await db.put('pages', newPageData);
        }

        // 关键优化：确保父节点总是在子节点之前被处理
        // 通过 pId 是否为 null/undefined 来将根节点排在前面
        // 过滤出属于已导入页面的节点，并进行排序
        // const nodesToImport = nodes.filter(node => pageIdMap[node.pageId]);
        const nodesToImport = groups.filter(node => pageIdMap[node.pageId]);
        nodesToImport.sort((a, b) => {
            if (a.pId === null && b.pId !== null) return -1;
            if (a.pId !== null && b.pId === null) return 1;
            return 0;
        });

        // 2. 遍历并保存 nodes，同时建立 nodeId 映射
        for (const node of nodesToImport) {
            // 确保该节点属于一个已导入的页面
            if (!pageIdMap[node.pageId]) {
                console.warn(`Skipping node ${node.id} as its pageId ${node.pageId} was not imported.`);
                continue;
            }

            const oldNodeId = node.id;
            const oldPath = node.path;

            let newNodeId = nodeIdMap[oldNodeId];
            if (!newNodeId) {
                newNodeId = uuid();
                nodeIdMap[oldNodeId] = newNodeId;
            }
            let newPath: string;
            const pathArr: string[] = oldPath && oldPath.split(",");
            if (pathArr && pathArr.length > 1) {
                let newPathArr: string[] = [];
                for (let i = 0; i < pathArr.length; i++) {
                    const path = pathArr[i];
                    if (!nodeIdMap[path]) {
                        const newPath = uuid();
                        nodeIdMap[path] = newPath;
                        newPathArr[i] = newPath;
                    } else {
                        newPathArr[i] = nodeIdMap[path];
                    }
                }
                newPath = newPathArr.join(',');
            } else {
                newPath = newNodeId;
            }

            // 获取新的 pageId
            const newPageId = pageIdMap[node.pageId];
            // 获取新的父节点 ID，如果父节点未导入或不存在，则为 null
            const newPId = node.pId ? nodeIdMap[node.pId] : null;

            // 如果父节点存在但其新的ID未被映射（意味着父节点可能未被导入或处理），则跳过此节点或将其视为根节点
            if (node.pId && !newPId) {
                console.warn(`Parent node ${node.pId} for node ${node.id} not found in mapping. Treating as root.`);
            }

            // await db.put('groups', {
            await db.put('groups', {
                ...node,
                id: newNodeId,
                pageId: newPageId, // 关联到新的页面 ID
                pId: newPId, // 使用映射后的新父 ID
                path: newPath // 根据新的父子ID生成path
            });
        }


        const pageBookmarkCountMap = {}; // pageId -> count
        // 3. 遍历并保存 urls，关联到新的 pageId 和 gId
        const urlsToImport = bookmarks.filter(url => pageIdMap[url.pageId]);
        for (const url of urlsToImport) {
            // 确保该 URL 属于一个已导入的页面
            if (!pageIdMap[url.pageId]) {
                console.warn(`Skipping URL ${url.id} as its pageId ${url.pageId} was not imported.`);
                continue;
            }

            const newPageId = pageIdMap[url.pageId];
            // 获取新的分组 ID，如果分组未导入或不存在，则为 null
            const newGId = url.gId ? nodeIdMap[url.gId] : null;
            if (url.gId && !newGId) {
                console.warn(`Group node ${url.gId} for URL ${url.id} not found in mapping.`);
            }

            // ⭐ 统计数量
            if (!pageBookmarkCountMap[newPageId]) {
                pageBookmarkCountMap[newPageId] = 0;
            }
            pageBookmarkCountMap[newPageId]++;

            // await db.put('bookmarks', {
            await db.put('bookmarks', {
                ...url,
                id: uuid(),
                pageId: newPageId,
                gId: newGId,
            });
        }


        // ⭐ 更新每个 page 的 bookmarksNum
        for (const newPageId of newlyImportedPageIds) {
            const page = await db.get('pages', newPageId);
            if (!page) continue;
            await db.put('pages', {
                ...page,
                bookmarksNum: pageBookmarkCountMap[newPageId] || 0,
            });
        }

        return newlyImportedPageIds; // 返回所有新页面的 ID
    } catch (e) {
        console.error('importJson error', e);
        return null;
    }
}

// 根据 pageId 删除 pages、nodes、urls 相关数据
export async function deletePageBookmarks(pageId) {
    try {
        const db = await getDB();
        // 删除 pages 表
        await db.delete('pages', pageId);
        // 删除 nodes 表中所有 pageId 匹配的数据
        const nodes = await db.getAllFromIndex('groups', 'pageId', pageId);
        for (const node of nodes) {
            await db.delete('groups', node.id);
        }
        // 删除 urls 表中所有 pageId 匹配的数据
        const urls = await db.getAllFromIndex('bookmarks', 'pageId', pageId);
        for (const url of urls) {
            await db.delete('bookmarks', url.id);
        }
        return true;
    } catch (e) {
        return false;
    }
}

export async function deletePageBookmarks1(pageId) {
    try {
        const db = await getDB();
        // 删除 pages 表
        await db.delete('pages', pageId);
        // 删除 nodes 表中所有 pageId 匹配的数据
        const nodes = await db.getAllFromIndex('groups', 'pageId', pageId);
        for (const node of nodes) {
            await db.delete('groups', node.id);
        }
        // 删除 urls 表中所有 pageId 匹配的数据
        const urls = await db.getAllFromIndex('bookmarks', 'pageId', pageId);
        for (const url of urls) {
            await db.delete('bookmarks', url.id);
        }
        return true;
    } catch (e) {
        return false;
    }
}


export async function getThroughChild(groupId: string, path: string) {

    async function getLastChild(group, db, path1) {
        //查询子分组
        const nodes = await db.getAllFromIndex('groups', 'pId', group.id);
        if (nodes && nodes.length > 0) {//b.其中一个子分组
            if (nodes.length > 1) {
                nodes.sort((a, b) => {
                    const aValue = a.order ?? a.addDate ?? 0;
                    const bValue = b.order ?? b.addDate ?? 0;
                    return aValue - bValue;
                });
            }
            const firstChildNode = nodes[0];
            //有子分组的情况再判断和书签自身分组的顺序
            //a.本身有书签数据且已排序在最前
            const bookmarks = await db.getAllFromIndex('bookmarks', 'gId', group.id);
            if (bookmarks.length > 0 && (!group.order1 || group.order1 < firstChildNode.order)) {//本身有书签数据，则这个本身的子分组为尽头
                //优先选择排序在前面的自身分组
                // return { ...group, path: path1 + ',' + group.id };//本身有书签数据，但排序不在最前，则返回本身层级加1
                return { ...group, path: path1 + ',' + group.id + '_copy' };//本身有书签数据，但排序不在最前，则返回本身层级加1
            } else {
                //选择继续递归子分组路径
                return getLastChild(firstChildNode, db, path1 + ',' + firstChildNode.id);
            }
        } else {//c.其他情况，叶子节点/无子分组： 不管有无书签数据都返回本身，结束了
            return { ...group, path: path1 };
        }
    }


    const db = await getDB();
    if (groupId.endsWith('_copy')) {
        const groupId1 = groupId.replace('_copy', '');
        const group = await db.get('groups', groupId1);
        const result = { ...group, path: path.replaceAll('-', ',') };
        // console.log('1111111111111111111 getThroughChild groupId path copy group', groupId, path, result);
        return result;
    }
    const paths = path.replaceAll('-', ',');//不需要修改路径中的copy标识，因为copy分组本身也需要被当做一个节点来处理
    const group = await db.get('groups', groupId);
    return getLastChild(group, db, paths); //起点
}


export async function clearGroupBookmarksById(groupId) {
    try {
        const db = await getDB();
        const urls = await db.getAllFromIndex('bookmarks', 'gId', groupId);
        if (urls.length > 0) {//删除标签
            for (const url of urls) {
                await db.delete('bookmarks', url.id);
            }
        }
        return true;
    } catch (e) {
        return false;
    }
}


/**
 * 根据 ID 删除一个书签 (url)
 * @param id 要删除的书签 ID
 * @returns {Promise<boolean>}
 */
export async function removeWebTag(id: string): Promise<boolean> {
    try {
        const db = await getDB();
        await db.delete('bookmarks', id);
        return true;
    } catch (e) {
        console.error('removeWebTag error', e);
        return false;
    }
}

// export async function removeWebTags(ids: string[]): Promise<boolean> {
export async function removeBookmarks(ids: string[]): Promise<boolean> {
    try {
        const db = await getDB();
        for (const id of ids) {
            await db.delete('bookmarks', id);
        }
        return true;
    } catch (e) {
        console.error('removeBookmarks error', e);
        return false;
    }
}


export async function removeWebTagsAndGroups(bookmarks: any[], allGroup: boolean): Promise<any> {
    try {
        const db = await getDB();
        const ids = (Array.isArray(bookmarks) ? bookmarks.map(b => b && b.id).filter(Boolean) : []);
        const gIds = (Array.isArray(bookmarks) ? Array.from(new Set(bookmarks.map(b => b && b.gId).filter(Boolean))) : []);
        // 删除书签
        for (const id of ids) {
            await db.delete('bookmarks', id);
        }

        // 递归向上删除没有书签且没有子分组的分组，同时统计被删除的分组数量
        let deletedGroups = 0;
        async function tryDeleteGroupIfEmpty(groupId: string | null | undefined) {
            if (!groupId) return;
            const group = await db.get('groups', groupId);
            if (!group) return;

            // 如果该分组还有书签，不删除
            const urls = await db.getAllFromIndex('bookmarks', 'gId', groupId);
            if (urls && urls.length > 0) return;

            // 如果该分组还有子分组，不删除
            const children = await db.getAllFromIndex('groups', 'pId', groupId);
            if (children && children.length > 0) return;

            // 可以删除当前分组
            await db.delete('groups', groupId);
            deletedGroups++;

            // 继续向上检查父分组
            if (allGroup) {
                const parentId = group.pId;
                if (parentId) await tryDeleteGroupIfEmpty(parentId);
            }
        }

        for (const gid of gIds) {
            await tryDeleteGroupIfEmpty(gid);
        }

        return { success: true, deletedGroups };
    } catch (e) {
        console.error('removeWebTags error', e);
        return { success: false, deletedGroups: 0 };
    }
}


export async function getPageGroupData(groupId: string) {
    const db = await getDB();
    const group = await db.get('groups', groupId);
    const pageId = group.pageId;
    const pageData = await getPageTree(pageId);
    const groupDatas = pageData.filter(node => node.id === groupId)
    return groupDatas[0];
}


export async function testUpdate() {
    // console.log('11111111111111 testUpdate');
    const db = await getDB();
    // const group = await db.get('groups', "i1bk37x58");
    // group.pId = "95rdpjwqy";
    //ysb4ng4i9  |  qrz3nhln3,v3zlzwr2f,ysb4ng4i9  //私密
    const group = await db.get('groups', "0halih6rr");//临时
    group.pId = null;
    // group.path = ;
    // group.pageId = 1760881337215;

    // const group1 = await db.get('groups', "0oawbeuhz");//
    // group1.pId = "ysb4ng4i9";//其他书签 0l5tbdjit
    // group1.path = "qrz3nhln3,v3zlzwr2f,ysb4ng4i9,0oawbeuhz";
    // const group1 = await db.get('groups', "0l5tbdjit");
    // group1.add_date = "1709921846";//其他书签 0l5tbdjit
    await db.put('groups', group);
    // await db.put('groups', group1);
}




/* export async function detectDuplicatedBookmarks(pageId) {
    const db = await getDB();
    const bookmarks = await db.getAllFromIndex('bookmarks', 'pageId', pageId);

    if (!Array.isArray(bookmarks) || bookmarks.length === 0) {
        return [];
    }

    // ✅ 更严谨的 URL 标准化
    function normalize(urlStr) {
        if (!urlStr) return '';

        try {
            const url = new URL(urlStr);

            let host = url.hostname
                .toLowerCase()
                .replace(/^www\./, '');

            // 移除默认端口
            let port = url.port;
            if ((url.protocol === 'http:' && port === '80') ||
                (url.protocol === 'https:' && port === '443')) {
                port = '';
            }

            let path = url.pathname || '/';

            // 去掉 index.html / index.htm
            path = path.replace(/\/index\.(html?|php)$/i, '/');

            // 去掉 trailing slash（非根路径）
            if (path.length > 1 && path.endsWith('/')) {
                path = path.slice(0, -1);
            }

            return `${host}${port ? ':' + port : ''}${path}`;
        } catch {
            // fallback
            return String(urlStr)
                .toLowerCase()
                .replace(/^https?:\/\//, '')
                .replace(/^www\./, '')
                .split(/[?#]/)[0]
                .replace(/\/$/, '');
        }
    }

    // ✅ 分组
    const map = new Map();

    for (const bm of bookmarks) {
        const key = normalize(bm.url);
        if (!key) continue;

        if (!map.has(key)) {
            map.set(key, []);
        }

        map.get(key).push(bm);
    }

    const groups = [];

    for (const [key, items] of map.entries()) {
        if (items.length < 2) continue;

        // ✅ 更合理的推荐策略
        const recommend = items.reduce((best, cur) => {
            if (!best) return cur;

            const score = (item) => {
                let s = 0;

                try {
                    const u = new URL(item.url);

                    // 没有 query/hash → 更干净
                    if (!u.search) s += 2;
                    if (!u.hash) s += 1;

                    // URL 越短越好
                    s += Math.max(0, 100 - item.url.length) / 100;

                    // 有 title 加分
                    if (item.title || item.name) s += 1;

                    // 时间更早加一点权重
                    if (item.addDate) {
                        s += 1 / (Number(item.addDate) || 1);
                    }

                } catch { }

                return s;
            };

            return score(cur) > score(best) ? cur : best;
        }, null);

        groups.push({
            id: `dup-${key}-${uuid()}`,
            key,
            title: `疑似重复：${key}`,
            recommendKeepId: recommend?.id,
            count: items.length,

            items: items.map(it => ({
                id: it.id,
                url: it.url,
                title: it.name || it.title || '',
                addDate: it.addDate,
            })),
        });
    }
    console.log('detectDuplicatedBookmarks result groups', groups);
    return groups;
} */


export async function detectDuplicatedBookmarks(pageId) {
    const db = await getDB();
    const bookmarks = await db.getAllFromIndex('bookmarks', 'pageId', pageId);

    if (!Array.isArray(bookmarks) || bookmarks.length === 0) {
        return [];
    }

    // ✅ 1. 忽略的 query 参数（可持续扩展）
    const IGNORE_PARAMS = [
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_term',
        'utm_content',
        'spm',
        'from',
        'ref',
        'referrer',
    ];

    // ✅ 2. 标准化（用于“强重复”判断）
    function normalize(urlStr: string) {
        if (!urlStr) return '';

        try {
            const url = new URL(urlStr);

            let host = url.hostname.toLowerCase().replace(/^www\./, '');

            // ✅ 判断是否为 IP 或 localhost
            const isIP = /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
            const isLocalhost = host === 'localhost';

            let port = url.port;

            // ✅ 关键逻辑
            if (!isIP && !isLocalhost) {
                // 只有“域名”才忽略默认端口
                if (
                    (url.protocol === 'http:' && port === '80') ||
                    (url.protocol === 'https:' && port === '443')
                ) {
                    port = '';
                }
            }
            // 👉 IP / localhost 一律保留端口（即使是80）

            let path = url.pathname || '/';

            path = path.replace(/\/index\.(html?|php)$/i, '/');

            if (path.length > 1 && path.endsWith('/')) {
                path = path.slice(0, -1);
            }

            const params = new URLSearchParams(url.search);

            IGNORE_PARAMS.forEach(p => params.delete(p));

            const sortedParams = [...params.entries()]
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([k, v]) => `${k}=${v}`);

            const query = sortedParams.length ? `?${sortedParams.join('&')}` : '';

            // ✅ 端口拼接回去
            return `${host}${port ? ':' + port : ''}${path}${query}`;

        } catch {
            return String(urlStr)
                .toLowerCase()
                .replace(/^https?:\/\//, '')
                .replace(/^www\./, '')
                .split('#')[0];
        }
    }
    // ✅ 3. 弱标准化（用于“弱重复”判断：忽略 query）
    function normalizeWeak(urlStr: string) {
        if (!urlStr) return '';

        try {
            const url = new URL(urlStr);

            let host = url.hostname.toLowerCase().replace(/^www\./, '');
            let path = url.pathname || '/';

            if (path.length > 1 && path.endsWith('/')) {
                path = path.slice(0, -1);
            }

            return `${host}${path}`;
        } catch {
            return String(urlStr)
                .toLowerCase()
                .replace(/^https?:\/\//, '')
                .replace(/^www\./, '')
                .split(/[?#]/)[0];
        }
    }

    // ✅ 4. 两套分组
    const strongMap = new Map(); // 完全重复
    const weakMap = new Map();   // 可能重复


    for (const bm of bookmarks) {
        const strongKey = normalize(bm.url);
        // const weakKey = normalizeWeak(bm.url);
        if (strongKey) {
            if (!strongMap.has(strongKey)) strongMap.set(strongKey, []);
            strongMap.get(strongKey).push(bm);
        }

        /*  if (weakKey) {
             if (!weakMap.has(weakKey)) weakMap.set(weakKey, []);
             weakMap.get(weakKey).push(bm);
         } */
    }

    // ✅ 5. 推荐保留策略（评分机制）
    function pickRecommend(items) {
        return items.reduce((best, cur) => {
            if (!best) return cur;

            const score = (item) => {
                let s = 0;

                try {
                    const u = new URL(item.url);

                    if (!u.search) s += 2; // 无 query 更干净
                    if (!u.hash) s += 1;

                    s += Math.max(0, 100 - item.url.length) / 100;

                    if (item.title || item.name) s += 1;

                    if (item.addDate) {
                        s += 1 / (Number(item.addDate) || 1);
                    }
                } catch { }

                return s;
            };

            return score(cur) > score(best) ? cur : best;
        }, null);
    }

    const groups = [];

    // ✅ 6. 强重复（完全重复）
    /*  for (const [key, items] of strongMap.entries()) {
         if (items.length < 2) continue;
 
         const recommend = pickRecommend(items);
 
         groups.push({
             id: `dup-strong-${key}-${uuid()}`,
             type: 'strong',
             title: `重复书签`,
             key,
             recommendKeepId: recommend?.id,
             count: items.length,
             items: items.map(it => ({
                 id: it.id,
                 url: it.url,
                 title: it.name || it.title || '',
                 addDate: it.addDate,
             })),
         });
     } */

    let groupIndex = 1;
    const groupMap = new Map(); // 完全重复
    const ppMap = new Map(); // 完全重复

    for (const [key, items] of strongMap.entries()) {
        if (items.length < 2) continue;

        const groupIds = new Set(items.map(bm => bm.gId));
        for (const gId of groupIds) {
            const groupName = groupMap.get(gId);
            if (!groupName) {
                const group = await getBookmarkGroupById(gId);
                // groupName = await getNodePathName(group);
                const res = await getNodePathName(group);
                // groupMap.set(gId, groupName);
                const ans = res.ans;
                console.log('xxxxxxxxxxxxxxx ans', ans);
                groupMap.set(gId, res.pathNames);
                ppMap.set(gId, res.ans.id);
            }
            // console.log('xxxxxxxxxxxxxxx', group);
        }
        // console.log('xxxxxxxxxxxxxxxxxx gIds', groupIds);
        const recommend = pickRecommend(items);
        const groupId = `dup-strong-${groupIndex++}`
        groups.push({
            // id: `dup-strong-${key}-${uuid()}`,
            id: groupId,
            type: 'strong',
            // title: `重复组 #${groupIndex++}`, // ✅ 关键修改
            title: `重复组`, // ✅ 关键修改
            key,
            recommendKeepId: recommend?.id,
            count: items.length,
            items: items.map(it => ({
                id: it.id,
                url: it.url,
                name: it.name || '',
                group: groupMap.get(it.gId),
                ppId: ppMap.get(it.gId),
                gId: groupId,
                addDate: it.addDate,
            })),
        });
    }

    // ✅ 7. 弱重复（同路径但 query 不同）
    /*  for (const [key, items] of weakMap.entries()) {
         if (items.length < 2) continue;
 
         // 如果已经是强重复，就跳过
         const hasStrong = items.every(it =>
             strongMap.get(normalize(it.url))?.length > 1
         );
 
         if (hasStrong) continue;
 
         const recommend = pickRecommend(items);
 
         groups.push({
             id: `dup-weak-${key}-${uuid()}`,
             type: 'weak',
             title: `可能重复（参数不同）`,
             key,
             recommendKeepId: recommend?.id,
             count: items.length,
             items: items.map(it => ({
                 id: it.id,
                 url: it.url,
                 title: it.name || it.title || '',
                 addDate: it.addDate,
             })),
         });
     } */

    // console.log('detectDuplicatedBookmarks result groups', groups);
    return groups;
}

export async function getPageNodesTree1(pageId, db, includeSelfAsChild = false) {
    // includeSelfAsChild: 如果为 true，则当某个分组有子分组时，
    // 会在其 children 数组末尾追加该分组自身（作为子元素，属性值保留），默认 false
    const nodes = await db.getAllFromIndex('groups', 'pageId', pageId);

    function buildTree(parentId, isRoot = false) {
        return nodes
            .filter(node => node.pId === parentId)
            // .sort((a, b) => isRoot ? (a.addDate ?? 0) - (b.addDate ?? 0) : (b.addDate ?? 0) - (a.addDate ?? 0))
            .sort((a, b) => isRoot ? (a.addDate ?? 0) - (b.addDate ?? 0) : (a.order ?? 0) - (b.order ?? 0))
            .map(node => {
                const children = buildTree(node.id, parentId == null);
                let finalChildren = children;
                if (includeSelfAsChild && Array.isArray(children) && children.length > 0) {
                    const selfNode = { ...node, name: node.name + '⌵' };
                    // 为避免循环引用，将作为子元素的自身的 children 置为空数组，😀
                    // 但保留其它属性值不变
                    selfNode.children = [];
                    finalChildren = [selfNode, ...children];
                }
                return {
                    ...node,
                    status: 1,
                    children: finalChildren,
                };
            });
    }
    return buildTree(null); // 根节点
}


export async function getCollectPageGroups() {
    const db = await getDB();
    const tx = db.transaction('pages', 'readonly');
    const store = tx.objectStore('pages');
    const pages = await store.getAll();
    if (pages.length > 0) {//只有用户存在标签数据才能查询
        const defaultPage = pages.find(page => page.default === true);
        const pageId = defaultPage ? defaultPage.pageId : pages[0].pageId; //选择默认或者第一个书签页
        const res = await getPageNodesTree1(pageId, db, true);
        // console.log('RRRRRRRRR res', res)
        return res;
    } else {
        // 返回一个与 getPageNodesTree 结构一致的默认分组
        return [
            {
                id: uuid(),
                name: "默认分组",
                type: 'folder',
                status: 0,
                children: [],
                // urlList: [],
            }];
    }

}

export async function getPageTreeGroups(pageId) {
    const db = await getDB();
    const nodes = await db.getAllFromIndex('groups', 'pageId', pageId);
    function buildTree(parentId, parentPath) {
        return nodes
            .filter(node => node.pId === parentId)
            .sort((a, b) => !parentId ? ((b.addDate ?? 0) - (a.addDate ?? 0)) : ((a.order ?? a.addDate ?? 0) - (b.order ?? b.addDate ?? 0)))
            .map(node => {
                const currentPath = parentPath ? parentPath + ',' + node.id : node.id;
                const children = buildTree(node.id, currentPath);
                node.path = currentPath;
                // 计算本节点 bookmarksNum：自身（若有）+ 子节点的 bookmarksNum
                let bookmarksNum = 0;
                if (node.bookmarks && Array.isArray(node.bookmarks)) bookmarksNum += node.bookmarks.length;
                for (const ch of children) {
                    if (typeof ch.bookmarksNum === 'number') bookmarksNum += ch.bookmarksNum;
                    else if (ch.bookmarks && Array.isArray(ch.bookmarks)) bookmarksNum += ch.bookmarks.length;
                }
                //大分组存在标签，复制新的对象，作为子分组
                return {
                    ...node,
                    children: children,
                    bookmarksNum,
                };
            });
    }
    return buildTree(null, null); // 根节点
}


export async function getPageTreeGroupsData(pageId) {
    const db = await getDB();
    const nodes = await db.getAllFromIndex('groups', 'pageId', pageId);
    const bookmarks = await db.getAllFromIndex('bookmarks', 'pageId', pageId);

    function buildTree(parentId, parentPath) {
        return nodes
            .filter(node => node.pId === parentId)
            .sort((a, b) => !parentId ? ((b.addDate ?? 0) - (a.addDate ?? 0)) : ((a.order ?? a.addDate ?? 0) - (b.order ?? b.addDate ?? 0)))
            .map(node => {
                const currentPath = parentPath ? parentPath + ',' + node.id : node.id;
                const children = buildTree(node.id, currentPath);
                const urlList = bookmarks.filter(n => n.gId === node.id);
                // 将该分组的书签加入汇总（若有）
                node.path = currentPath;
                const resultNode = {
                    ...node,
                    children: children,
                    list: urlList.length > 0 && children.length > 0, // 是否有书签列表
                    // urlList: urlList,
                };
                return resultNode;
            });
    }
    // 构建树并在构建完成后打印/返回汇总的书签
    const data = buildTree(null, null);
    return data; // 根节点
}



/* async function setBookmarksGroupPath(bookmarks, db) {
    const pathCache = new Map(); // gId -> pathArray
    const uniqueGIds = Array.from(new Set(bookmarks.map(b => b && b.gId).filter(Boolean)));
    for (const gid of uniqueGIds) {
        if (pathCache.has(gid)) continue;
        const pathArr = [];
        const seen = new Set();
        let cur = gid;
        while (cur) {
            if (seen.has(cur)) break;
            seen.add(cur);
            const group = await db.get('groups', cur);
            if (!group) break;
            pathArr.push(group.id);
            if (!group.pId) break;
            cur = group.pId;
        }
        pathCache.set(gid, pathArr.reverse());
    }
    for (const u of bookmarks) {
        const gid = u && u.gId;
        u.path = gid ? (pathCache.get(gid) || []) : [];
        // console.log('path', u.name, u.path)
    }
} */

async function setBookmarksGroupPath(bookmarks, db) {
    const pathCache = new Map();

    const uniqueGIds = Array.from(
        new Set(bookmarks.map(b => b?.gId).filter(Boolean))
    );

    for (const gid of uniqueGIds) {
        if (pathCache.has(gid)) continue;

        const pathArr = [];
        const seen = new Set();
        let cur = gid;

        while (cur) {
            if (seen.has(cur)) break;
            seen.add(cur);

            const group = await db.get('groups', cur);
            if (!group) break;

            pathArr.push(group.id);
            cur = group.pId;
        }

        pathCache.set(gid, pathArr.reverse());
    }


    // ✅ 👉 （函数最后 return）
    const result = bookmarks.map(u => {
        const gid = u?.gId;
        return {
            ...u,
            path: gid ? (pathCache.get(gid) || []) : []
        };
    });
    // console.log('11111111111111111111111 pathCache', pathCache, result);
    return result;
}

export async function testUpdateData(pageId) {
    // console.log('11111111111111 testUpdateData');
    const db = await getDB();
    const bookmarks = await db.getAllFromIndex('bookmarks', 'pageId', pageId);
    for (const bm of bookmarks) {
        if (bm.url.startsWith('https://www.etdown.net/')) {
            // console.log('11111111111111 updateBookmarksIcon', bm);
            bm.icon =
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAJmElEQVR4nJxWaVBb1xV+7+lJ4klIQitCC1qMQEIgsGOD2GzH2DSp3SZtEid2kjaLk0nSuEnTTGc6aRtnaaadzjSddpw0cXCz/SjEccxiwPY4jllsTOwaIQFCYAHaBUZYu/Sk914vyBAndfujd6Srp3fvPefc853vnINSFAXdMsBfGIZzD2CCIHjlC0HxWCSPkUdj0CkILJMQhMC5/WvnVndSJEEiCJKTcHO+VcG3niEITycRgqKzMLCNpEgERlZeUzAE59Zvql9eCv3pj28ppUWNzc2mqo254znp/0vB8nLo74f/4vMFiviF7ELRUijkdbnhRKphZ6PLF1wO3QAbNFpNXW3dnHNarZJkiezidfyxJ574jgIE+i/DZrXqy7T33X93sb6IwMNlG6SJZFSuU4xcHjna+iFEpqpNhnGb1WK5pC9T8gX8Gae3eWfzf8pBbyd85e6ZRIzDYaM0eolWI+TzM5kMhjEL+DyFTKpSFc/Oes6dH3x4348LeNzhkauzc66mmiaFUrF2HDjj5iXQ28hehctUanzl969odRumpmbKdDqRWPjow/ciYD+8AkJ9XU3A72ezMRqCjFom7r9vD5h9LrdcpV4F6RtXf9dF8FpcuBa9pTodj8dFUQYQFAqFnE4vOJuFyCxFZrNpqVQcSySHvx4DlxMW5G/fZj787rsBl/tW6dDtQF65g9Nq+9sH7zxw/+6F4OLMrKeqshSsoHQaCGEaDFMEAdNo0zPzBEGqixWJRLTvzJBaGo4Raq1E8fjPDtJQdB3n24CMJxJHPjrC4TICAf+xL/piicShN94+0X0mg2foNJrPF0RQFESttFC0uLB07ES3bWI6FbNXmaxbG2oiibB75to39PiuAhgwhej8Z5s/4BELyQXP6zbbFYqE9u176MUXfzl08SrGZLg9/ng8TWbhUYtdX27SajTA3jwMu+YyYVhe9SZj2+dtbo93Xce3FVBwMpn6uKOzocGczzUk02mZTAziRKMpViiKcYh96swABJETk47uU+flap3ZbM5kiEpj6YQj1dUbooPBpCtVkp6+vtvfAGAwPe8SS4QyhUIi5P3hbWr/vkeA631ez/DFoWgk7PEvDA5dHR2bBHYAsFtbWzn5HAShPff0w+O2seHBwye7P2AyGPPOaQBPTiaaAxngAX7n3N7uzs47qkqZTIbH6xeJxTKpBKFdP3v2wpTDefCZA/Puuf7zA8YKY82W2tbWDwoLi1KpmNPprq2pqqvhNzVeujK6Vyot5HB9oeWwRCyEVnmwmlIoCMfTn37cat6ov2wZpzOwVGIBRTLg/fLSjZra2pbvtRw/fvyN196KRGMYK+/1Q787cOBJhbyYzmAMXhiy2EYjUcaXg/vNtc3AUhgi3O75nAJkjV6Qz+fnsPNYXFZ93R2D/T2m0vc2V0XaPu/Rl9+xo3lXX+/px3/65PEvTgiFAolYtGnzFqfTdeTIO1MOe0N9g1ymGRtfNJTVrEQwSLYEkc3gN10EopUC6ZdaGUWFImDy8MioWCDvO1dnnbR/+PFLICJ7ezqrqzdlCVKlUv72N78uLzcCHUwmUyDgvvnGay+//Kvv79l99113URQBLM0Q2elp548f4OcU0A69+upqwodm55zJxJLDMUuR5MZNlYVSo1ZXjSCUzTZuKDf4fF4YobgcrkwmWrweymQS6XTW43bVN9b7PK6lpZCpqqq7u8tUaaDR0DGrHRihVChXXLQarhRBZk+e7OkfvBwILtbUbgIvB4aGmxrr7VPTLTt34TieiMV7e051dXX0D1zUl5URWWhufm52bnZw4EJJqdE+5cBYGELHIJiWIlItOxtHLbZc+ORAphz2GYpML4dC9/zkgXg8ns/C4vEkj8fb2tgUjSzPzc42Nm5VazZYLaMVJhOgnkwuZ7O4yVTc6ZwbHDhXY25yzkxy2GxgKkQiAiG/f+hcMplksVjoqn+oi5cuZPDU1gYz0Gofn9lYbUBoLElhobRIduyz9nA4HonEaAhcaTJ99ln77Ox8MOh/7tnnQP2qqKjQqFVjVguPy7WMni/XKxUKBYlAdDqSyeAUhaFAPElBkxOTxUohnsmAGEjjOEGRfAEXgWigHIKE+oMf7lkIeimSotHogAR79z5EElkGIy8HIzufvaXG3NnZIZNqlkIRuYxMpzPFxWoOh7PqIhgCdC8oALWEP3TxssFQIuDzQD3JphPWcWs4fKNEpyvZoDPojblkXrPFvOrbXC9AZQmip6dr4PxXJzq7jcZygAFEo0XjYR6vAF6p4atMBhkOpVH8Ah7KWCFwWam2q/fsjjsbDv/1z7EkzuFxf37whXKDHhR9INXtcsVikbIyA8gQqXT6aOvRpQW3RCrZsX2bSMSXiATAIbFoNJlmrFc0GAU1BeNFohGpWOCYmZMWSUq0qq7uM088thfPQsODb/7j8D6hfN+ulu2Dg8Pvv/d+Kp360T071Wrd3LxPUIAJBLyzXw48+sj+PCaEsTFQzzJ4llNQuJ7sgGfRp586gBOMG+EwoCLgnUgIyrjgo0+PBfwBGBaoS3Y5nTOHXn3taGurtEi8/8F7NYobCH5YVSwhIeTKFZtGo8qQOJvNBm4BdmeyhEgoWEt2q4mOzcLu3n1P7+lzEkGaDtMEQkH1xvJgUPThJ+0gKgp4OIOJ+P2BYpW8UCQCsRBNyu1Wuj/0ZYVRD7g0DzqZxT4eh6vXbzBVlkEIys3nrPNgBTyP19PR8UWVUeuYnqZghIQyQn4+k05nsdgwle3o6AU1BMBQWVEBAPP5A1ctQZ+P4XWPsDHGQw/eC3xSWqaJRmMjl8f8gSUQ8Si61hcB85dvhI61f4IiBJfDAnnKPjGF0tB5V9Dt8T371KMVFYZtW+vlCvmGEi3IuNksAeBdDkWvzVwrkhW99ItnvP6AUlmUymQm7M5NVXqtRh4MXA9HousughavL8cTKTydVspl4kLp5x19rxhKS3WaySmnbdKBYYzjHT3RSAR0eVxuPoPOiMVjqWQ6P58DOD/y9b8ufW3ZvLGCidIjkSioP/PznpO9Z8Cnra3NYCiHSZI8dfr0wYPP39WyHcvDVGoFSFVXr1peeP5JZbHi3fc+6h8Y3rGj2WyuUyiUWq26vb0dxNvm2vqKckP/V+cnJqwoM58iklKp5JrTK+TzYrE4u0BcXlqyZ3dLkVS6oiCNp6fsjvGJ8UAwMHThosM+dWdzM58vgCgcsP3O7U3btm1jMBg5buVq+VpvlZvgHAe/3Q9BuSYZKABxmdsB3dpurG+Ecy01DP9/Cv4NAAD//3NFBwkAAAAGSURBVAMAe+bOQmqYOp0AAAAASUVORK5CYII=";
            await db.put('bookmarks', bm);
        }
    }

    /* const group = await db.get('groups', "fvyj4l5j1");
    group.pId = "95rdpjwqy";
    group.pId = null;
    await db.put('groups', group); */
    /*  const db = await getDB();
     const page = await db.get('pages', 1774634741310);
     page.bookmarksNum = 167;
     await db.put('pages', page); */


    // console.log('11111111111111 bookmarks ', bookmarks);
    // console.log('------------------------------------------------------------ ');
    /* const page = await db.get('pages', pageId);
    page.bookmarksNum = bookmarksNum;
    await db.put('pages', page); */
    /*  const db = await getDB();
     const pId = '01xsz1ezn';
     const children = await db.getAllFromIndex('groups', 'pId', pId);
     console.log('11111111111111 updateData ............', children);
     for (const nd of children) {
         const bookmarks = await db.getAllFromIndex('bookmarks', 'gId', nd.id);
         for (const bookmark of bookmarks) {
             // const bookmark = await db.get('bookmarks', "01xsz1ezn");
             bookmark.pageId = 1774634741310;
             await db.put('bookmarks', bookmark);
         }
         // console.log('11111111111111 bookmarks ', bookmarks);
         // console.log('------------------------------------------------------------ ');
     } */
    //
}


export async function getPageTree(pageId) {

    const db = await getDB();
    const nodes = await db.getAllFromIndex('groups', 'pageId', pageId);
    const bookmarks = await db.getAllFromIndex('bookmarks', 'pageId', pageId);
    // testUpdateData(pageId);
    const page = await db.get('pages', pageId);
    page.bookmarksNum = bookmarks.length;
    db.put('pages', page);
    // updateBookmarksIcon(pageId, db, urls.length);//测试 更新
    const addUrls = [];
    /* const k = 'a';
    const regex = new RegExp(escapeRegExp(k), 'i');
    let count = 0;
    // if (node.urlList && node.urlList.length > 0) {
    for (let i = 0; i < urls.length; i++) {
        const navi = urls[i] || {};
        const name = (navi.name || '') + '';
        const description = (navi.description || '') + '';
        if (regex.test(name) || regex.test(description)) count++;
    }
     */

    // 为每个书签根据 gId 计算所在分组的祖先路径（从根到本组 id 的数组），并缓存复用
    const urls = await setBookmarksGroupPath(bookmarks, db);

    const expandedKeysSet = new Set();
    // 收集属于各分组的所有书签（展平为单个数组）

    function buildTree(parentId, parentPath) {
        return nodes
            .filter(node => node.pId === parentId)
            .sort((a, b) => !parentId ? ((b.addDate ?? 0) - (a.addDate ?? 0)) : ((a.order ?? a.addDate ?? 0) - (b.order ?? b.addDate ?? 0)))
            .map(node => {
                const currentPath = parentPath ? parentPath + ',' + node.id : node.id;
                const children = buildTree(node.id, currentPath);
                const urlList = urls.filter(n => n.gId === node.id);
                urlList.sort((a, b) => (a.addDate ?? 0) - (b.addDate ?? 0));
                // 将该分组的书签加入汇总（若有）
                if (Array.isArray(urlList) && urlList.length > 0) {
                    addUrls.push(...urlList);
                }
                // node.path = currentPath;
                let finalChildren = children;
                let resultNode;

                // 大分组存在标签，复制新的对象，作为子分组
                if (urlList && urlList.length > 0 && children.length > 0) {
                    node.list = true; // 有数组
                    const child1 = {
                        ...node,
                        children: [],
                        copy: true,
                        id: node.id + '_copy',
                        order: node.order1 ? node.order1 : 0,
                        list: false,
                        bookmarks: urlList,
                        bookmarksNum: urlList.length,
                        path: parentPath ? parentPath + ',' + node.id + ',' + node.id + '_copy' : node.id + ',' + node.id + '_copy'
                    };
                    if (node.order1) {
                        const idx = Math.max(0, Math.floor(node.order1));
                        const newChildren = [...children];
                        // 若索引超出范围，则追加到末尾；否则在指定位置插入
                        const insertIndex = Math.min(idx, newChildren.length);
                        newChildren.splice(insertIndex, 0, child1); // 插入一个
                        finalChildren = newChildren;
                    } else {
                        finalChildren = [child1, ...children];
                    }
                    resultNode = { ...node, children: finalChildren, path: parentPath ? parentPath + ',' + node.id : node.id };
                } else {
                    resultNode = {
                        ...node,
                        children: children,
                        bookmarks: urlList,
                        path: parentPath ? parentPath + ',' + node.id : node.id
                    };
                }

                // 收集子分组不为空的分组 id
                if (finalChildren && finalChildren.length > 0) {
                    // expandedKeysSet.add(node.path);
                    expandedKeysSet.add(node.id);
                }

                // 计算 bookmarksNum：自身 bookmarks（如果有）加上所有子分组的 bookmarksNum
                let bookmarksNum = 0;
                if (resultNode.bookmarks && Array.isArray(resultNode.bookmarks)) {
                    bookmarksNum += resultNode.bookmarks.length;
                }
                if (resultNode.children && Array.isArray(resultNode.children)) {
                    for (const ch of resultNode.children) {
                        if (ch && typeof ch.bookmarksNum === 'number') {
                            bookmarksNum += ch.bookmarksNum;
                        } else if (ch && ch.bookmarks && Array.isArray(ch.bookmarks)) {
                            bookmarksNum += ch.bookmarks.length;
                        }
                    }
                }
                resultNode.bookmarksNum = bookmarksNum;

                return resultNode;
            });
    }
    // 构建树并在构建完成后打印/返回汇总的书签
    const data = buildTree(null, null);


    // 为每个书签设置其所在分组的 path（groupPath），使用已构建的 tree (`data`) 中的 path 值
    const groupPathMap = new Map<string, string>();
    function collectPaths(nodesArray) {
        if (!Array.isArray(nodesArray)) return;
        for (const nd of nodesArray) {
            if (!nd) continue;
            if (nd.id) groupPathMap.set(nd.id, nd.path || '');
            if (Array.isArray(nd.children) && nd.children.length > 0) collectPaths(nd.children);
        }
    }
    collectPaths(data);

    //设置了groupPath(大分组的path)的bookmarkList
    const bookmarkList = (Array.isArray(urls) ? urls : []).map(u => {
        const gPath = u && u.gId ? (groupPathMap.get(u.gId) || '') : '';
        return { ...u, groupPath: gPath };// 返回新的对象，避免与原始 urls 共用引用
    });

    const tagsMapResult = collectBookmarksTags(bookmarkList);
    // 非空校验
    const tagsByGroupList = (tagsMapResult && Array.isArray(tagsMapResult.tagsList)) ? tagsMapResult.tagsList : [];
    if (tagsByGroupList.length > 0) {
        for (const nd of data) {//按大分组id（groupPath）获取其标签数组
            const tagsList = tagsByGroupList.filter(item => item.gId === nd.id);
            // console.log('xxxxxxxxxxxxxxxxxxxxxxx', nd.name, tagsList);
            nd.tagsList = tagsList;
        }
        // 递归将对应的 tagsList 赋给 data 的每个节点（使用节点 id 与 tagsByGidMap 的 key 对应）
    }

    // console.log('collected addUrls count:', addUrls, addUrls.length);
    // 计算 urls 与 addUrls 的差集（按 id 区分，得到未被归入 addUrls 的书签）
    try {
        const addUrlsIds = new Set(addUrls.map(u => u && u.id).filter(Boolean));
        // const urlsIds = new Set(urls.map(u => u && u.id).filter(Boolean));
        const urlsNotInAddUrls = urls.filter(u => !(u && addUrlsIds.has(u.id)));
        console.log('urls not in addUrls count:', urlsNotInAddUrls.length, urlsNotInAddUrls);
    } catch (e) {
        console.error('compute diff error', e);
    }

    return { page: page, data: data, tagsMap: (tagsMapResult && tagsMapResult.allTags) || new Map(), bookmarksNum: urls.length, expandedKeys: Array.from(expandedKeysSet) }; // 根节点

}

export async function getPageTreeByDate(pageId) {//pageId
    // 新实现：按书签的 addDate（年-月）分组，返回扁平的每月组数组，
    // 每组包含字段：id, date ("YYYY-MM"), name, bookmarks: []
    const db = await getDB();
    const bookmarks1 = await db.getAllFromIndex('bookmarks', 'pageId', pageId);

    const bookmarks = await setBookmarksGroupPath(bookmarks1, db);

    const seenGroupTag = new Set<string>(); // 用于去重： `${gId}:::${value}`
    const groupTags: Array<{ gId: string | null; value: string; }> = [];
    const map = new Map();
    // console.log(pageId, 'getPageTreeByDate bookmarks', bookmarks.length);
    for (const u of bookmarks) {
        const date = u.date;
        const ym = date && date.length >= 7 ? date.slice(0, 7) : Date.now();
        // const ym =oYearMonth1(u.date);
        if (!map.has(ym)) map.set(ym, []);
        map.get(ym).push(u);

        // 计算所属大分组 id：优先使用 groupPath 的第一个元素，否则回退到 gId
        const tags = u.tags;
        if (!tags) continue;
        function addKey(k: string) {
            const key = k && String(k).trim();
            if (!key) return;

            // tagsList 去重：相同 gId 下不添加相同 value
            const gidKey = ym;
            const uniqueKey = `${gidKey}:::${key}`;
            if (!seenGroupTag.has(uniqueKey)) {
                seenGroupTag.add(uniqueKey);
                groupTags.push({ gId: ym, value: key });
            }
        }
        if (Array.isArray(tags)) {
            for (const t of tags) {
                if (t === undefined || t === null) continue;
                addKey(String(t));
            }
        } else if (typeof tags === 'string') {
            const parts = tags.split(/[,;，；\s]+/).map(s => s.trim()).filter(Boolean);
            for (const p of parts) addKey(p);
        } else {
            addKey(String(tags));
        }
    }


    // 构建数组，每项为一个月的扁平组（无嵌套）
    const groups = Array.from(map.entries()).map(([date, items]) => {
        // 对组内书签按时间降序排序：从晚到早
        items.sort((a, b) => (b.addDate ?? 0) - (a.addDate ?? 0));

        const tagsList = groupTags.length > 0 && groupTags.filter(item => item.gId === date) || [];

        return {
            id: date,
            date: date,
            name: date,
            pageId: pageId,
            bookmarks: items,
            tagsList,
            bookmarksNum: items.length,//个数
        };
    });


    // 分组按日期降序（最近在前）排序
    groups.sort((a, b) => b.date.localeCompare(a.date));

    // 构建二层树：年 -> 月
    const yearMap = new Map();
    for (const g of groups) {
        const year = (g.date || '').split('-')[0] || g.date;
        if (!yearMap.has(year)) yearMap.set(year, []);
        yearMap.get(year).push(g);
    }

    const treeData = Array.from(yearMap.entries()).map(([year, months]) => {
        // months 可能按 groups 的顺序（降序），对月进行升序排序以便于阅读
        months.sort((a, b) => b.date.localeCompare(a.date));
        const children = months.map((m, idx) => ({
            id: m.date,
            path: m.date,
            date: m.date,
            name: m.date,
            pId: year,
            bookmarks: m.bookmarks,
            order: idx + 1,
            count: m.count,
        }));
        return {
            id: year,
            date: year,
            path: year,
            name: year,
            bookmarks: [],
            order: 1,
            children,
        };
    });

    // return { data: groups, treeData: treeData, tagsMap: tagsMap };
    return { data: groups, treeData: treeData, bookmarksNum: bookmarks.length };
}

export async function getPageTreeByDomain2(pageId) {
    const db = await getDB();
    const bookmarks = await db.getAllFromIndex('bookmarks', 'pageId', pageId);

    // console.log(pageId, 'getPageTreeByDomain bookmarks', bookmarks.length);
    setBookmarksGroupPath(bookmarks, db);
    // ========= 1. 构建 path 缓存 =========
    const pathCache = new Map();
    const uniqueGIds = Array.from(new Set(bookmarks.map(b => b && b.gId).filter(Boolean)));

    for (const gid of uniqueGIds) {
        if (pathCache.has(gid)) continue;

        const pathArr = [];
        const seen = new Set();
        let cur = gid;

        while (cur) {
            if (seen.has(cur)) break;
            seen.add(cur);

            const group = await db.get('groups', cur);
            if (!group) break;

            pathArr.push(group.id);

            if (!group.pId) break;
            cur = group.pId;
        }

        pathCache.set(gid, pathArr.reverse());
    }

    for (const u of bookmarks) {
        const gid = u && u.gId;
        u.path = gid ? (pathCache.get(gid) || []) : [];
    }

    // ========= 2. 提取域名 =========
    function extractDomain(url) {
        if (!url) return 'unknown';
        let tmp = String(url).trim();

        try {
            if (!/^https?:\/\//i.test(tmp)) tmp = 'http://' + tmp;
            const parsed = new URL(tmp);
            let host = parsed.hostname || '';
            host = host.replace(/^www\./i, '').toLowerCase();
            return host || 'unknown';
        } catch (e) {
            tmp = tmp.replace(/^.*?:\/\//, '').split('/')[0];
            tmp = tmp.replace(/^www\./i, '').toLowerCase();
            return tmp || 'unknown';
        }
    }

    // ========= 3. 分组 =========
    const map = new Map();

    const seenGroupTag = new Set();
    const groupTags = [];

    for (const u of bookmarks) {
        const domain = extractDomain(u.url);
        u.domain = domain;

        if (!map.has(domain)) map.set(domain, []);
        map.get(domain).push(u);

        // ========= tags 处理 =========
        const tags = u.tags;
        if (!tags) continue;

        function addKey(k) {
            const key = k && String(k).trim();
            if (!key) return;

            let gidKey = (domain && domain[0]) ? domain[0].toUpperCase() : '#';
            if (!/^[A-Z0-9]$/.test(gidKey)) gidKey = '#';

            const uniqueKey = `${gidKey}:::${key}`;
            if (!seenGroupTag.has(uniqueKey)) {
                seenGroupTag.add(uniqueKey);
                groupTags.push({ gId: gidKey, value: key });
            }
        }

        if (Array.isArray(tags)) {
            for (const t of tags) {
                if (t !== undefined && t !== null) addKey(t);
            }
        } else if (typeof tags === 'string') {
            const parts = tags.split(/[,;，；\s]+/).map(s => s.trim()).filter(Boolean);
            for (const p of parts) addKey(p);
        } else {
            addKey(tags);
        }
    }

    // ========= 4. 构建 domainGroups =========
    const domainGroups = Array.from(map.entries()).map(([domain, items]) => {
        items.sort((a, b) => (b.addDate ?? 0) - (a.addDate ?? 0));

        // ⭐ icon 取一个 bookmark 的
        const iconBookmark = items.find(b => b?.icon) || items[0];
        const icon = iconBookmark?.icon || '';

        return {
            id: uuid(),
            name: domain,
            pageId: pageId,
            bookmarks: items,
            icon,
            bookmarksNum: items.length,
        };
    });

    domainGroups.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    );

    // ========= 5. 生成 data（单层） =========
    const data = domainGroups.map((m, idx) => {
        const id = m.id || uuid();

        const bookmarksWithGId1 = Array.isArray(m.bookmarks)
            ? m.bookmarks.map(b => ({ ...b, gId1: id }))
            : [];

        let initial = (m.name && m.name[0]) ? m.name[0].toUpperCase() : '#';
        if (!/^[A-Z0-9]$/.test(initial)) initial = '#';

        return {
            ...m,
            id,
            bookmarks: bookmarksWithGId1,
            order: idx + 1,
            path: id,
            bookmarksNum: bookmarksWithGId1.length,
            tagsList: groupTags.filter(item => item.gId === initial),
        };
    });

    // ========= 6. 生成 treeData（单层树） =========
    const treeData = data.map((c, idx) => ({
        ...c,
        pId: null,
        order: idx + 1,
        bookmarksNum: typeof c.bookmarksNum === 'number'
            ? c.bookmarksNum
            : (Array.isArray(c.bookmarks) ? c.bookmarks.length : 0),
    }));
    return { data, treeData };
}

export async function getPageTreeByDomain(pageId) {
    // 新实现：按书签链接的域名分组（不包含协议），保持返回结构与原来相同
    const db = await getDB();
    const oriBookmarks = await db.getAllFromIndex('bookmarks', 'pageId', pageId);
    // await setBookmarksGroupPath(bookmarks, db);
    const bookmarks = await setBookmarksGroupPath(oriBookmarks, db);
    // console.log(pageId, 'getPageTreeByDomain bookmarks', bookmarks.length);

    // 为每个书签根据 gId 计算所在分组的祖先路径（从根到本组 id 的数组），并缓存复用
    // console.log('222222222222222 getPageTreeByDomain', bookmarks);

    // 域名提取器：去掉协议，去掉 www. 前缀，返回小写主机名
    function extractDomain(url) {
        if (!url) return 'unknown';
        let tmp = String(url).trim();
        try {
            if (!/^https?:\/\//i.test(tmp)) tmp = 'http://' + tmp;
            const parsed = new URL(tmp);
            let host = parsed.hostname || '';
            host = host.replace(/^www\./i, '').toLowerCase();
            return host || 'unknown';
        } catch (e) {
            // 回退：直接切掉路径
            tmp = tmp.replace(/^.*?:\/\//, '').split('/')[0];
            tmp = tmp.replace(/^www\./i, '').toLowerCase();
            return tmp || 'unknown';
        }
    }

    // 按域名分组
    const map = new Map(); // domain -> bookmarks[]

    const seenGroupTag = new Set<string>(); // 用于去重： `${gId}:::${value}`
    const groupTags: Array<{ gId: string | null; value: string; }> = [];

    for (const u of bookmarks) {

        const domain = extractDomain(u.url);
        u.domain = domain;
        if (!map.has(domain)) map.set(domain, []);
        map.get(domain).push(u);


        // 计算所属大分组 id：优先使用 groupPath 的第一个元素，否则回退到 gId
        const tags = u.tags;
        if (!tags) continue;
        function addKey(k: string) {
            const key = k && String(k).trim();
            if (!key) return;

            // tagsList 去重：相同 gId 下不添加相同 value
            let gidKey = (domain && domain[0]) ? domain[0].toUpperCase() : '#';
            if (!/^[A-Z0-9]$/.test(gidKey)) gidKey = '#';

            const uniqueKey = `${gidKey}:::${key}`;
            if (!seenGroupTag.has(uniqueKey)) {
                seenGroupTag.add(uniqueKey);
                groupTags.push({ gId: gidKey, value: key });
            }
        }
        if (Array.isArray(tags)) {
            for (const t of tags) {
                if (t === undefined || t === null) continue;
                addKey(String(t));
            }
        } else if (typeof tags === 'string') {
            const parts = tags.split(/[,;，；\s]+/).map(s => s.trim()).filter(Boolean);
            for (const p of parts) addKey(p);
        } else {
            addKey(String(tags));
        }
    }

    // 构建域名层级数据（首字母 -> 域名 -> bookmarks）
    const domainGroups = Array.from(map.entries()).map(([domain, items]) => {
        items.sort((a, b) => (b.addDate ?? 0) - (a.addDate ?? 0));

        // ⭐ 新增：从该域名分组中找一个有 icon 的书签
        const iconBookmark = items.find(b => b && b.icon);
        const icon = iconBookmark ? iconBookmark.icon : '';

        return {
            id: uuid(),
            name: domain,
            pageId: pageId,
            bookmarks: items,
            icon,
            // 每个域名分组（子分组）自身的书签数
            bookmarksNum: Array.isArray(items) ? items.length : 0,
        };
    });

    domainGroups.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

    // 按首字母分组，生成 data（两层嵌套）和 treeData（用于 UI 的树形结构）
    const initialMap = new Map();
    for (const g of domainGroups) {
        let initial = (g.name && g.name[0]) ? g.name[0].toUpperCase() : '#';
        if (!/^[A-Z0-9]$/.test(initial)) initial = '#';
        if (!initialMap.has(initial)) initialMap.set(initial, []);
        initialMap.get(initial).push(g);
    }

    // 为所有分组生成 uuid 作为 id，并设置 path：
    // - 第一级分组 path 为 null
    // - 第二级分组 path 为 "<parentId>,<childId>"
    const data = [];
    for (const [initial, domains] of initialMap.entries()) {
        domains.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
        const parentId = uuid();
        const children = domains.map((m, idx) => {
            const childId = m.id || uuid();
            // 为该域名分组下的每个 bookmark 添加 gId1 属性，指向所属（域名）分组 id
            const bookmarksWithGId1 = Array.isArray(m.bookmarks) ? m.bookmarks.map(b => ({ ...b, gId1: childId })) : [];
            return {
                ...m,
                id: childId,
                bookmarks: bookmarksWithGId1,
                // 子分组的书签总数
                bookmarksNum: Array.isArray(bookmarksWithGId1) ? bookmarksWithGId1.length : 0,
                order: idx + 1,
                path: `${parentId},${childId}`,
            };
        });

        const tagsList = groupTags.length > 0 && groupTags.filter(item => item.gId === initial) || [];
        // 父分组（首字母）没有自身书签，bookmarksNum 为其所有子分组的 bookmarksNum 之和
        const parentBookmarksNum = children.reduce((sum, ch) => sum + (typeof ch.bookmarksNum === 'number' ? ch.bookmarksNum : (Array.isArray(ch.bookmarks) ? ch.bookmarks.length : 0)), 0);
        data.push({
            id: parentId,
            name: initial,
            pageId: pageId,
            bookmarks: [],
            order: 1,
            path: parentId,
            children,
            tagsList,
            bookmarksNum: parentBookmarksNum,
        });
    }

    const treeData = data.map(d => ({
        id: d.id,
        date: d.id,
        path: d.path,
        name: d.name,
        bookmarks: [],
        order: d.order,
        bookmarksNum: typeof d.bookmarksNum === 'number' ? d.bookmarksNum : 0,
        children: d.children.map((c, idx) => ({
            ...c,
            pId: d.id,
            order: idx + 1,
            bookmarksNum: typeof c.bookmarksNum === 'number' ? c.bookmarksNum : (Array.isArray(c.bookmarks) ? c.bookmarks.length : 0),
        })),
    }));

    console.log('000000000000000 getPageTreeByDomain result', data);
    return { data: data, treeData: treeData, bookmarksNum: bookmarks.length };
}


export async function getPageGroupData1(group) {
    const db = await getDB();

    const bookmarkList: any[] = [];
    const groupList: any[] = [];

    // 👇 核心递归函数
    async function getChildrenData(currentGroup) {
        const gId = currentGroup.id;

        // 1️⃣ 获取当前分组下的书签
        const bookmarks = await db.getAllFromIndex('bookmarks', 'gId', gId);
        if (bookmarks?.length) {
            bookmarkList.push(...bookmarks);
        }

        // 2️⃣ 收集分组
        groupList.push(currentGroup);

        // 3️⃣ 获取子分组
        const children = await db.getAllFromIndex('groups', 'pId', gId);

        if (!children?.length) return;

        // 👉 ✅ 推荐：顺序递归（稳定、不会有并发问题）
        for (const child of children) {
            await getChildrenData(child);
        }

        // 👉 ❗ 如果你想用并发（可替换上面 for）
        // await Promise.all(children.map(child => getChildrenData(child)));
    }

    // 4️⃣ 从根节点开始
    await getChildrenData(group);

    console.log('✅ bookmarkList:', bookmarkList);
    console.log('✅ groupList:', groupList);

    return {
        bookmarkList,
        groupList
    };
}

/**
 * 处理 getPageTree 生成的树，将因同时包含子文件夹和书签而分裂的节点进行合并。
 * @param {Array} originalTree - 从 getPageTree 返回的原始树结构。
 * @returns {Array} - 返回一个新的、合并处理过的树结构。
 */
export function processPageTree(originalTree) {
    // 深拷贝以避免修改原始数据
    const tree = JSON.parse(JSON.stringify(originalTree));

    function traverse(nodes) {
        if (!Array.isArray(nodes)) {
            return;
        }
        for (let i = 0; i < nodes.length; i++) {
            const parentNode = nodes[i];
            parentNode.type = 'folder';
            // if (parentNode.type === 'folder' && Array.isArray(parentNode.children) && parentNode.children.length > 0) {
            if (Array.isArray(parentNode.children) && parentNode.children.length > 0) {
                // 查找并处理特殊子节点
                const specialChildIndex = parentNode.children.findIndex(child => child.path === parentNode.path);
                if (specialChildIndex !== -1) {
                    const specialChild = parentNode.children[specialChildIndex];
                    parentNode.urlList = specialChild.urlList; // 将 urlList 赋值给父节点
                    parentNode.children.splice(specialChildIndex, 1); // 从子节点中移除
                }
                traverse(parentNode.children); // 继续递归处理其他子节点
            }
        }
    }
    traverse(tree);
    return tree;
}

/**
 * 根据 pageId 获取扁平化的书签列表
 * @param pageId
 * @returns {Promise<Array<{url: string, title: string, createAt: number, updateAt: number}>>}
 */
export async function getPageBookmarks(pageId) {
    try {
        const db = await getDB();
        const urls = await db.getAllFromIndex('bookmarks', 'pageId', pageId);
        // 格式化数据以匹配 HTML 导出逻辑
        return urls.map(url => ({
            name: url.name,
            icon: url.icon,
            url: url.url,
            title: url.title,
            createAt: url.addDate || Date.now(), // 使用 addDate 作为创建时间
            updateAt: url.last_modified || url.addDate || Date.now(), // 优先使用 last_modified，其次是 addDate
        }));
    } catch (e) {
        console.error('getPageBookmarks error', e);
        return [];
    }
}


/**
 * 合并 urls 中所有元素的 tags 字段，返回 Map<tag, idArray>
 * @param {Array=} urls - 可选，若未传入则默认为空数组
 * @returns {Map<string, string[]>} tag -> 对应的 item id 数组
 */
export function collectUrlTags(urls?: any[]): Map<string, string[]> {
    const list = Array.isArray(urls) ? urls : [];
    const tagMap = new Map<string, Set<string>>();

    for (const item of list) {
        if (!item) continue;
        const tags = item.tags;
        if (!tags) continue;
        const itemId = item.id != null ? String(item.id) : null;

        function addKey(k: string) {
            const key = k && String(k).trim();
            if (!key) return;
            const s = tagMap.get(key) || new Set<string>();
            if (itemId) s.add(itemId);
            tagMap.set(key, s);
        }

        if (Array.isArray(tags)) {
            for (const t of tags) {
                if (t === undefined || t === null) continue;
                addKey(String(t));
            }
        } else if (typeof tags === 'string') {
            const parts = tags.split(/[,;，；\s]+/).map(s => s.trim()).filter(Boolean);
            for (const p of parts) addKey(p);
        } else {
            addKey(String(tags));
        }
    }

    // Convert Set values to arrays for easier serialization
    const result = new Map<string, string[]>();
    for (const [k, s] of tagMap.entries()) {
        result.set(k, Array.from(s));
    }
    return result;
}

export function collectBookmarksTags(bookmarks?: any[]): any {
    const list = Array.isArray(bookmarks) ? bookmarks : [];
    const tagMap = new Map<string, Set<string>>();

    const seenGroupTag = new Set<string>(); // 用于去重： `${gId}:::${value}`
    // const tagsList: Array<{ gId: string | null; value: string; index: number | null }> = [];
    // const tagsList: Array<{ gId: string | null; value: string; }> = [];
    const tagsList: Array<{ gId: string | null; value: string; num: number }> = [];

    const groupTagCount = new Map<string, number>();
    for (const item of list) {
        if (!item) continue;
        const tags = item.tags;
        if (!tags) continue;
        const itemId = item.id != null ? String(item.id) : null;

        // 计算所属大分组 id：优先使用 groupPath 的第一个元素，否则回退到 gId
        let topGId: string | null = null;
        if (item.groupPath && item.groupPath.length > 0) {
            const parts = item.groupPath.split(',');
            topGId = parts && parts.length > 0 ? parts[0] : null;
        }
        if (!topGId && item.gId) topGId = item.gId;

        /*  function addKey(k: string) {
             const key = k && String(k).trim();
             if (!key) return;
             const s = tagMap.get(key) || new Set<string>();
             if (itemId) s.add(itemId);
             tagMap.set(key, s);
 
             // tagsList 去重：相同 gId 下不添加相同 value
             const gidKey = topGId || '';
             const uniqueKey = `${gidKey}:::${key}`;
             if (!seenGroupTag.has(uniqueKey)) {
                 seenGroupTag.add(uniqueKey);
                 tagsList.push({ gId: topGId, value: key });
             }
         } */

        function addKey(k: string) {
            const key = k && String(k).trim();
            if (!key) return;

            const s = tagMap.get(key) || new Set<string>();
            if (itemId) s.add(itemId);
            tagMap.set(key, s);

            const gidKey = topGId || '';
            const uniqueKey = `${gidKey}:::${key}`;

            // ✅ 统计数量
            groupTagCount.set(uniqueKey, (groupTagCount.get(uniqueKey) || 0) + 1);

            // ✅ 去重 + 初始化 num
            if (!seenGroupTag.has(uniqueKey)) {
                seenGroupTag.add(uniqueKey);
                tagsList.push({ gId: topGId, value: key, num: 0 });
            }
        }

        if (Array.isArray(tags)) {
            for (const t of tags) {
                if (t === undefined || t === null) continue;
                addKey(String(t));
            }
        } else if (typeof tags === 'string') {
            const parts = tags.split(/[,;，；\s]+/).map(s => s.trim()).filter(Boolean);
            for (const p of parts) addKey(p);
        } else {
            addKey(String(tags));
        }
    }

    for (const item of tagsList) {
        const gidKey = item.gId || '';
        const uniqueKey = `${gidKey}:::${item.value}`;
        item.num = groupTagCount.get(uniqueKey) || 0;
    }

    // Convert Set values to arrays for easier serialization
    const result = new Map<string, string[]>();
    for (const [k, s] of tagMap.entries()) {
        result.set(k, Array.from(s));
    }

    // console.log('1111111111111111111 collectBookmarksTags tagsList', tagsList);
    // console.log('1111111111111111111 collectBookmarksTags  allTags', result);

    return { allTags: result, tagsList: tagsList };
}

// 填充 tagsList 的 idx：标签在整体 tagMap keys 中的索引（按 insertion order）
/*    const allKeys = Array.from(result.keys());
   for (const t of tagsList) {
       const index = allKeys.indexOf(t.value);
       t.index = index >= 0 ? index : -1;
   } */


export async function updatePageBookmarksNum(pageId, num) {
    try {
        console.log('ssssssssssssssss updatePageBookmarksNum ', num);
        const db = await getDB();
        const page = await db.get('pages', pageId);
        if (!page) return false;
        page.bookmarksNum = page.bookmarksNum + num;
        await db.put('pages', page);
        return true;
    } catch (e) {
        return false;
    }
}

export async function removeGroupById(groupId) {
    try {
        // console.log('ssssssssssssssss removeGroupById groupId', groupId);
        const db = await getDB();
        const root = await db.get('groups', groupId);
        if (!root) return { success: false, error: 'group not found' };

        let deletedBookmarks = 0;
        const toRemoveTags = [];
        // 递归深度优先删除：先删除子分组，再删除当前分组及其书签
        async function deleteGroupAndChildren(id) {
            const children = await db.getAllFromIndex('groups', 'pId', id);
            for (const child of children) {
                await deleteGroupAndChildren(child.id);
            }

            const urls = await db.getAllFromIndex('bookmarks', 'gId', id);
            if (urls && urls.length > 0) {
                for (const url of urls) {
                    await db.delete('bookmarks', url.id);
                    deletedBookmarks++;
                    const tags = url.tags;
                    if (Array.isArray(tags) && tags.length > 0) {
                        for (const t of tags) toRemoveTags.push({ tag: t, add: false, id: url.id });
                    }
                }
            }
            await db.delete('groups', id);
        }

        await deleteGroupAndChildren(groupId);
        return { success: true, deletedBookmarks: deletedBookmarks, toRemoveTags: toRemoveTags };
    } catch (e) {
        return { success: false, error: e };
    }
}


export async function removeCopyGroupById(groupId) {
    try {
        // console.log('ssssssssssssssss removeCopyGroupById groupId', groupId);
        const db = await getDB();
        const root = await db.get('groups', groupId);
        if (!root) return { success: false, error: 'group not found' };
        const toRemoveTags = [];
        let deletedBookmarks = 0;
        const urls = await db.getAllFromIndex('bookmarks', 'gId', groupId);
        if (urls && urls.length > 0) {
            for (const url of urls) {
                const tags = url.tags;
                if (Array.isArray(tags) && tags.length > 0) {
                    for (const t of tags) toRemoveTags.push({ tag: t, add: false, id: url.id });
                }
                await db.delete('bookmarks', url.id);
                deletedBookmarks++;
            }
        }
        return { success: true, deletedBookmarks: deletedBookmarks, toRemoveTags: toRemoveTags };
    } catch (e) {
        return { success: false, error: e };
    }
}

/**
 * 生成 HTML 书签，支持层级结构
 * @param pageId
 * @returns {Promise < string >}
            */
export async function generateBookmarkHTML(pageId: number): Promise<string> {
    const originalPageTree = await getPageTree(pageId);
    // console.log('generateBookmarkHTML originalPageTree ', originalPageTree);
    const pageTree = processPageTree(originalPageTree);
    // console.log('generateBookmarkHTML pageTree ', pageTree);

    const topLevelBookmarkBarNames = ['书签栏', '收藏夹栏', '书签工具栏'];//顶层书签栏
    const topLevelOtherBookmarkBarNames = ['移动设备和其他书签', '移动和其他收藏夹', '其他书签'];//移动设备和其他书签栏

    function generateHTML(nodes, level = 0) {
        let htmlStr = '';

        for (const node of nodes) {
            // ✅ 特殊处理顶层“书签栏”
            if (level === 0) {
                if (topLevelBookmarkBarNames.includes(node.name)) {
                    // 直接导出其子书签和文件夹内容，不生成 <H3>书签栏</H3>
                    if (node.urlList && node.urlList.length > 0) {
                        htmlStr += generateHTML(node.urlList, level);
                    }
                    if (node.children && node.children.length > 0) {
                        htmlStr += generateHTML(node.children, level);
                    }
                    continue; // 跳过后续默认处理
                }

                //其他书签(a,b,c,A,B,C)--->其他书签(a,b,c),A,B,C  与默认处理不同
                else if (topLevelOtherBookmarkBarNames.includes(node.name)) {
                    // console.log('其他书签(a,b,c,A,B,C)--->其他书签(a,b,c),A,B,C', node.name)
                    // 直接导出该分组名+子书签
                    if (node.urlList && node.urlList.length > 0) {
                        htmlStr += `${'  '.repeat(level)}<DT><H3>${node.name || node.title}</H3>\n`;
                        htmlStr += `${'  '.repeat(level)}<DL><p>\n`;
                        // 当前文件夹下的书签
                        if (node.urlList && node.urlList.length > 0) {
                            htmlStr += generateHTML(node.urlList, level + 1);
                        }
                        htmlStr += `${'  '.repeat(level)}</DL><p>\n`;
                    }
                    // 直接导出文件夹内容，不生成 <H3>书签栏</H3>
                    if (node.children && node.children.length > 0) {
                        htmlStr += generateHTML(node.children, level);
                    }
                    continue; // 跳过后续默认处理
                }
            }


            if (node.type === 'folder') {//处理文件夹
                htmlStr += `${'  '.repeat(level)}<DT><H3>${node.name || node.title}</H3>\n`;
                htmlStr += `${'  '.repeat(level)}<DL><p>\n`;

                // 递归子文件夹
                if (node.children && node.children.length > 0) {
                    htmlStr += generateHTML(node.children, level + 1);
                }
                // 当前文件夹下的书签
                if (node.urlList && node.urlList.length > 0) {
                    htmlStr += generateHTML(node.urlList, level + 1);
                }

                htmlStr += `${'  '.repeat(level)}</DL><p>\n`;
            } else {//处理书签
                const addDate = Math.floor((node.addDate || Date.now()) / 1000);
                const lastVisit = Math.floor((node.last_modified || node.addDate || Date.now()) / 1000);
                htmlStr += `${'  '.repeat(level)}<DT><A HREF="${node.url}" addDate="${addDate}" LAST_VISIT="${lastVisit}" ICON="${node.icon || ''}">${node.name || node.title}</A>\n`;
            }
        }

        return htmlStr;
    }

    let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
                            <META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
                                <TITLE>Bookmarks</TITLE>
                                <H1>Bookmarks</H1>
                                <DL><p>\n`;

    html += generateHTML(pageTree);
    // html += generateHTML(pageTree.slice(0, 3));

    html += `</DL><p>\n`;

    return html;
}
