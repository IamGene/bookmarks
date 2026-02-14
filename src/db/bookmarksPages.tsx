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
            //查出该分组下的所有子分组和书签
            const groupData = await getPageGroupData1(group);
            const groupList = groupData.bookmarkGroupList;
            const bookmarkList = groupData.bookmarkList;
            for (let i = 0; i < bookmarkList.length; i++) {
                const bookmark = bookmarkList[i];
                // bookmark.pageId = group.pageId;
                // 这样可以保留 'addDate' 等不在表单中的字段
                const updateBookmark = {
                    ...bookmark,
                    pageId: group.pageId,
                };
                await db.put('bookmarks', updateBookmark);
            }
            for (let i = 0; i < groupList.length; i++) {
                const group1 = groupList[i];
                const updateGroup = {
                    ...group1,
                    pageId: group.pageId,
                };
                await db.put('groups', updateGroup);
            }
            return null;
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
    const page = await db.get('pages', pageId);
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
            url: url
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
        const pGroup = await db.get('groups', pId);
        if (pGroup) {//存在
            return pGroup.pId ? nodePath(pGroup.pId, pGroup.id + "," + path)
                : pGroup.id + "," + path;
        }
        return path;
    }
    return nodePath(node.pId, node.id);
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
        const urls = await db.getAll('bookmarks');
        // 封装为 JSON 格式
        const result = {
            pages: pages || [],
            urls: urls || [],
            nodes: nodes || [],
        };
        return result;
    } catch (e) {
        console.error('exportAllPagesJson error', e);
        return null;
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
        // console.log('importPageJson jsonData', jsonData);
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

            // await db.put('bookmarks', {
            await db.put('bookmarks', {
                ...url,
                id: uuid(),
                pageId: newPageId,
                gId: newGId,
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


export async function getThroughChild(groupId, path) {

    async function getLastChild(group, db, path1) {
        const urls = await db.getAllFromIndex('bookmarks', 'gId', group.id);
        //a.本身有书签数据且已排序在最前
        if (urls.length > 0 && group.order1 == 0) {//已排序在最前
            return { ...group, path: path1.length > 0 ? path1 + ',' + group.id : group.id };
        }
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
            if (urls.length > 0 && group.order1 < firstChildNode.order) {//优先选择排序在前面的
                return { ...group, path: path1 + ',' + group.id };//本身有书签数据，但排序不在最前，则返回本身
            }
            //继续返回子分组
            return getLastChild(firstChildNode, db, path1 + ',' + firstChildNode.id);
        } else {//c.其他情况，叶子节点： 返回本身，结束了
            return { ...group, path: path1 };
        }
    }

    const paths = path.replaceAll('-', ',');
    const db = await getDB();
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

export async function removeWebTags(ids: string[]): Promise<boolean> {
    try {
        const db = await getDB();
        for (const id of ids) {
            await db.delete('bookmarks', id);
        }
        return true;
    } catch (e) {
        console.error('removeWebTags error', e);
        return false;
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
    const db = await getDB();
    // const group = await db.get('groups', "i1bk37x58");
    // group.pId = "95rdpjwqy";
    //ysb4ng4i9  |  qrz3nhln3,v3zlzwr2f,ysb4ng4i9  //私密
    const group = await db.get('groups', "coudbwbr4");//临时
    group.pId = "y0gl7ixv9";
    // group.pageId = 1760881337215;

    // const group1 = await db.get('groups', "0oawbeuhz");//
    // group1.pId = "ysb4ng4i9";//其他书签 0l5tbdjit
    // group1.path = "qrz3nhln3,v3zlzwr2f,ysb4ng4i9,0oawbeuhz";
    // const group1 = await db.get('groups', "0l5tbdjit");
    // group1.add_date = "1709921846";//其他书签 0l5tbdjit

    await db.put('groups', group);
    // await db.put('groups', group1);
}

export async function getPageNodesTree1(pageId, db) {
    // const db = await getDB();
    const nodes = await db.getAllFromIndex('groups', 'pageId', pageId);

    function buildTree(parentId, isRoot = false) {
        return nodes
            .filter(node => node.pId === parentId)
            // .sort((a, b) => isRoot ? (a.addDate ?? 0) - (b.addDate ?? 0) : (b.addDate ?? 0) - (a.addDate ?? 0))
            .sort((a, b) => isRoot ? (a.addDate ?? 0) - (b.addDate ?? 0) : (a.order ?? 0) - (b.order ?? 0))
            .map(node => {
                // if (node.type === 'folder') {
                const children = buildTree(node.id, parentId == null);
                return {
                    ...node,
                    status: 1,
                    children: children,
                    // urlList: urlList,
                };
                /*  } else {
                     return node;
                 } */
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
        const res = await getPageNodesTree1(pageId, db);
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
                //大分组存在标签，复制新的对象，作为子分组
                return {
                    ...node,
                    children: children
                };
            });
    }
    return buildTree(null, null); // 根节点
}

export async function getPageTree(pageId) {

    const db = await getDB();
    const nodes = await db.getAllFromIndex('groups', 'pageId', pageId);
    // nodes.sort((a, b) => (a.addDate ?? 0) - (b.addDate ?? 0));
    const urls = await db.getAllFromIndex('bookmarks', 'pageId', pageId);

    const tagsMap = collectUrlTags(urls);
    // console.log('getPageTree tags', tagsMap);
    // function buildTree(parentId, parentPath, isRoot = false) {
    function buildTree(parentId, parentPath) {
        return nodes
            .filter(node => node.pId === parentId)
            .sort((a, b) => !parentId ? ((b.addDate ?? 0) - (a.addDate ?? 0)) : ((a.order ?? a.addDate ?? 0) - (b.order ?? b.addDate ?? 0)))

            .map(node => {
                const currentPath = parentPath ? parentPath + ',' + node.id : node.id;
                const children = buildTree(node.id, currentPath);
                const urlList = urls.filter(n => n.gId === node.id);
                urls.sort((a, b) => (a.addDate ?? 0) - (b.addDate ?? 0));
                node.path = currentPath;
                //大分组存在标签，复制新的对象，作为子分组
                if (urlList && urlList.length > 0 && children.length > 0) {
                    node.list = true;//有数组
                    const child1 = {
                        ...node,
                        children: [],
                        copy: true,
                        order: node.order1 ? node.order1 : 0,
                        list: false,
                        // urlList: urlList,
                        bookmarks: urlList,
                    };
                    if (node.order1) {
                        const idx = Math.max(0, Math.floor(node.order1));
                        const newChildren = [...children];
                        // 若索引超出范围，则追加到末尾；否则在指定位置插入
                        const insertIndex = Math.min(idx, newChildren.length);
                        newChildren.splice(insertIndex, 0, child1);//插入一个
                        return { ...node, children: newChildren };
                    }
                    return {
                        ...node,
                        children: [child1, ...children]
                    };
                } else return {
                    ...node,
                    children: children,
                    bookmarks: urlList,
                };
            });
    }
    // return buildTree(null, null); // 根节点
    return { data: buildTree(null, null), tagsMap: tagsMap }; // 根节点
}


export async function getPageTreeByDate(pageId) {
    // 新实现：按书签的 addDate（年-月）分组，返回扁平的每月组数组，
    // 每组包含字段：id, date ("YYYY-MM"), name, bookmarks: []
    const db = await getDB();
    const bookmarks = await db.getAllFromIndex('bookmarks', 'pageId', pageId);
    // const tagsMap = collectUrlTags(urls);
    // 将时间规范化为 "YYYY-MM"
    const map = new Map();
    // 为每个书签根据 gId 计算所在分组的祖先路径（从根到本组 id 的数组），并缓存复用
    const pathCache = new Map(); // gId -> pathArray
    // 收集所有不同的 gId（排除空值）
    const uniqueGIds = Array.from(new Set(bookmarks.map(b => b && b.gId).filter(Boolean)));
    for (const gid of uniqueGIds) {
        if (pathCache.has(gid)) continue;
        const pathArr = [];
        const seen = new Set();
        let cur = gid;
        while (cur) {
            if (seen.has(cur)) break; // 防止循环引用导致死循环
            seen.add(cur);
            const group = await db.get('groups', cur);
            if (!group) break;
            pathArr.push(group.id);
            if (!group.pId) break;
            cur = group.pId;
        }
        // 需要从根到叶的顺序，所以反转
        pathCache.set(gid, pathArr.reverse());
    }

    // 将计算好的 path 赋值给每个书签元素（若无 gId 则为空数组）
    for (const u of bookmarks) {
        const gid = u && u.gId;
        u.path = gid ? (pathCache.get(gid) || []) : [];
    }
    // console.log(pageId, 'getPageTreeByDate bookmarks', bookmarks.length);
    for (const u of bookmarks) {
        const date = u.date;
        const ym = date && date.length >= 7 ? date.slice(0, 7) : Date.now();
        // const ym =oYearMonth1(u.date);
        if (!map.has(ym)) map.set(ym, []);
        map.get(ym).push(u);
    }

    // 构建数组，每项为一个月的扁平组（无嵌套）
    const groups = Array.from(map.entries()).map(([date, items]) => {
        // 对组内书签按时间降序排序：从晚到早
        items.sort((a, b) => (b.addDate ?? 0) - (a.addDate ?? 0));
        return {
            id: date,
            date: date,
            name: date,
            pageId: pageId,
            bookmarks: items,
            count: items.length,//个数
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
    return { data: groups, treeData: treeData };
}

export async function getPageGroupData1(group) {
    const db = await getDB();
    const bookmarkList = [];
    const bookmarkGroupList = [];

    async function getChildrenData(group, bookmarkList, bookmarkGroupList) {
        const gId = group.id;

        const bookmarks = await db.getAllFromIndex('bookmarks', 'gId', gId);
        if (bookmarks.length > 0) {
            bookmarkList.push(...bookmarks);
        }

        bookmarkGroupList.push(group);
        const children = await db.getAllFromIndex('groups', 'pId', gId);
        children.forEach(child => {
            // bookmarkGroupList.push(child);
            getChildrenData(child, bookmarkList, bookmarkGroupList);
        });

    }

    await getChildrenData(group, bookmarkList, bookmarkGroupList); // 根节点
    // console.log(bookmarkList);
    // console.log(bookmarkList[0]);
    return {
        bookmarkList,
        bookmarkGroupList
    }
    // console.log('getPageGroupData1 groupList', bookmarkGroupList);
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

/* export async function removeGroupById1(groupId) {
    return true;
}
 */

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

export async function removeGroupById(groupId) {
    try {
        const db = await getDB();
        const group = await db.get('groups', groupId);
        const childGroups = await db.getAllFromIndex('groups', 'pId', groupId);
        if (group.pId === null) { //删除祖节点
            const urls = await db.getAllFromIndex('bookmarks', 'gId', groupId);
            if (urls.length > 0 && childGroups.length > 0) {//仅仅删除其标签

                /**
                 * 合并 urls 中所有元素的 tags 字段，返回不重复的 tag 数组
                 * @param {Array=} urls 可选，若未传入则读取全部 `urls` 表数据
                 * @returns {Promise<string[]>}
                 */

                for (const url of urls) {
                    await db.delete('bookmarks', url.id);
                }
                return true;
            }
        }
        await db.delete('groups', groupId);
        // 删除 urls 表中所有 pageId 匹配的数据
        const urls = await db.getAllFromIndex('bookmarks', 'gId', groupId);
        for (const url of urls) {
            await db.delete('bookmarks', url.id);
        }
        const childNodes = await db.getAllFromIndex('groups', 'pId', groupId);
        if (childNodes.length > 0) {
            for (const node of childNodes) {
                await db.delete('groups', node.id);
                const urls = await db.getAllFromIndex('bookmarks', 'gId', node.id);
                if (urls.length > 0) {
                    for (const url of urls) {
                        await db.delete('bookmarks', url.id);
                    }
                }
            }
        }
        return true;
    } catch (e) {
        return false;
    }
}


/**
 * 生成 HTML 书签，支持层级结构
 * @param pageId
 * @returns {Promise<string>}
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
