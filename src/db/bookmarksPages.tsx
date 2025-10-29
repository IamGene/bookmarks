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

    // 转为数字
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
        const group = await db.get('nodes', gId);
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
        await db.put('urls', saveBookmark);
        console.log('addNewBookmark', saveBookmark);
        return saveBookmark;
    } catch (e) {
        console.error('updateBookmarkById error', e);
        return null;
    }
}
export async function updateGroupById(group) {
    const db = await getDB();
    try {
        // 1. 根据 id 从 'nodes' 表中获取现有的书签数据
        const existingGroup = await db.get('nodes', group.id);
        if (!existingGroup) {
            console.error(`Group with id ${group.id} not found.`);
            return null;
        }
        if (group.pId) {
            const parentGroup = await db.get('nodes', group.pId);
            if (parentGroup) {
                group.path = parentGroup.path + ',' + group.id;
            }
        } else {
            group.path = `${group.id}`;
        }
        // 2. 将传入的新数据与旧数据合并
        // 这样可以保留 'addDate' 等不在表单中的字段
        const updatedGroup = {
            ...existingGroup,
            ...group,
        };
        // 3. 将更新后的数据存回数据库
        await db.put('nodes', updatedGroup);
        return updatedGroup;
    } catch (e) {
        console.error('updateGroupById error', e);
        return null;
    }
}


export async function updateBookmarkById(bookmark) {

    const db = await getDB();
    try {
        // 1. 根据 id 从 'urls' 表中获取现有的书签数据
        const existingBookmark = await db.get('urls', bookmark.id);
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
        await db.put('urls', updatedBookmark);
        return updatedBookmark;
    } catch (e) {
        console.error('updateBookmarkById error', e);
        return null;
    }

}

export async function saveSubGroup(group) {
    const db = await getDB();
    const pId = group.pId;
    const id = uuid();
    const path = `${pId}` + ',' + `${id}`;
    try {
        await db.put('nodes', {
            id: id,
            pageId: group.pageId,
            type: "folder",
            name: group.name,
            hide: false,
            path: path,
            pId: pId,
            addDate: Date.now(),
        });
        return group;
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
        async function saveNode(node, parentId, order) {
            const nodeId = uuid();
            // console.log('node.addDate', node.addDate);
            await db.put('nodes', {
                id: nodeId,
                pageId,
                type: node.type,
                name: node.name,
                order,
                title: node.title,
                url: node.url || null,
                hide: false,
                path: parentId ? `${parentId},${nodeId}` : `${nodeId}`,
                pId: parentId,
                addDate: node.addDate,
                last_modified: node.last_modified,
                description: node.description,
                icon: node.icon,
            });
            // 顺序保存 urlList
            if (Array.isArray(node.urlList)) {
                for (let i = 0; i < node.urlList.length; i++) {
                    const url = node.urlList[i];
                    const date = formatTimestamp(url.addDate);
                    await db.put('urls', {
                        id: uuid(),
                        pageId,
                        gId: nodeId,
                        type: url.type,
                        name: url.name,
                        url: url.url,
                        title: url.title,
                        description: url.description,
                        hide: url.hide,
                        icon: url.icon,
                        addDate: url.addDate,
                        date: date
                    });
                }
            }
            // 顺序保存 children
            if (Array.isArray(node.children)) {
                for (let i = 0; i < node.children.length; i++) {
                    await saveNode(node.children[i], nodeId, i);
                }
            }
        }
        // root 顺序保存
        for (let i = 0; i < root.length; i++) {
            await saveNode(root[i], null, i);
        }
        return true;
    } catch (e) {
        console.error('savePageBookmarks error', e);
        return false;
    }
}

async function getPageNodesTree(pageId, db) {
    const nodes = await db.getAllFromIndex('nodes', 'pageId', pageId);
    nodes.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    function buildTree(parentId) {
        return nodes
            .filter(node => node.pId === parentId)
            .map(node => {
                if (node.type === 'folder') {
                    const children = buildTree(node.id);
                    return {
                        ...node,
                        status: 1,
                        children: children,
                        // urlList: urlList,
                    };
                } else {
                    return node;
                }
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
        const res = await getPageNodesTree(pageId, db);
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


export async function getPages() {
    const db = await getDB();
    const tx = db.transaction('pages', 'readonly');
    const store = tx.objectStore('pages');
    const allPages = await store.getAll();
    return allPages; // 根节点
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
            const group = await db.get('nodes', item.groupId);
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
            await db.put('urls', saveData);
            // results.push({ ok: true, data: saveData });
            results.push(saveData);
        } catch (err) {
            console.error('saveBookmarksToDB item error', err, urlsData[i]);
            // results.push({ ok: false, error: String(err), data: urlsData[i] });
        }
    }
    return results;
}


export async function saveBookmarkToDB(urlData) {
    const db = await getDB();
    const { id, title, url, icon, groupId, status } = urlData;
    try {
        // const nodes = await db.getKey('nodes', 'id', groupId);
        const group = await db.get('nodes', groupId);
        // console.log('!!!! saving', group);
        // const tx = db.transaction('urls', 'readwrite');
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
        await db.put('urls', saveData);
        // await tx.done; // 确保事务完成
        console.log('save success', saveData);
        return saveData;
    } catch (e) {
        console.error('save error', e);
        return null;
    }
}

export async function getBookmarkById(id) {
    try {
        const db = await getDB();
        const url = await db.get('urls', id);
        return url;
    } catch (e) {
        console.error('exportPageJson error', e);
        return null;
    }
}

export async function exportPageJson(pageId) {
    try {
        const db = await getDB();
        // 查询 pages 表
        const page = await db.get('pages', pageId);
        // 查询 nodes 表中所有 pageId 匹配的数据
        const nodes = await db.getAllFromIndex('nodes', 'pageId', pageId);
        // 查询 urls 表中所有 pageId 匹配的数据
        const urls = await db.getAllFromIndex('urls', 'pageId', pageId);
        // 封装为 JSON 格式
        const result = {
            // page: page || null,
            pages: page ? [page] : [],
            urls: urls || [],
            nodes: nodes || [],
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
        const nodes = await db.getAll('nodes');
        // 查询所有 urls
        const urls = await db.getAll('urls');
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

/**
 * 根据导出的 JSON 数据导入并保存为新的书签页
 * @param {object} jsonData - 从 exportPageJson 获取的数据结构 { page, nodes, urls }
 * @returns {Promise<number|null>} 成功则返回新的 pageId，失败则返回 null
 */
export async function importPageJson(jsonData) {
    try {
        const db = await getDB();
        const { pages, nodes, urls } = jsonData;

        if (!Array.isArray(pages) || !Array.isArray(nodes) || !Array.isArray(urls)) {
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
        const nodesToImport = nodes.filter(node => pageIdMap[node.pageId]);
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
            const newNodeId = uuid(); // 使用文件顶部的 uuid 函数
            nodeIdMap[oldNodeId] = newNodeId;

            // 获取新的 pageId
            const newPageId = pageIdMap[node.pageId];
            // 获取新的父节点 ID，如果父节点未导入或不存在，则为 null
            const newPId = node.pId ? nodeIdMap[node.pId] : null;
            // 如果父节点存在但其新的ID未被映射（意味着父节点可能未被导入或处理），则跳过此节点或将其视为根节点
            if (node.pId && !newPId) {
                console.warn(`Parent node ${node.pId} for node ${node.id} not found in mapping. Treating as root.`);
            }

            await db.put('nodes', {
                ...node,
                id: newNodeId,
                pageId: newPageId, // 关联到新的页面 ID
                pId: newPId, // 使用映射后的新父 ID
                path: newPId ? `${newPId},${newNodeId}` : `${newNodeId}`, // 根据新的父子ID生成path
            });
        }

        // 3. 遍历并保存 urls，关联到新的 pageId 和 gId
        const urlsToImport = urls.filter(url => pageIdMap[url.pageId]);
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

            await db.put('urls', {
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
        const nodes = await db.getAllFromIndex('nodes', 'pageId', pageId);
        for (const node of nodes) {
            await db.delete('nodes', node.id);
        }
        // 删除 urls 表中所有 pageId 匹配的数据
        const urls = await db.getAllFromIndex('urls', 'pageId', pageId);
        for (const url of urls) {
            await db.delete('urls', url.id);
        }
        // console.log('!!!!!!!!!!!!!! deletePageBookmarks');
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
        await db.delete('urls', id);
        return true;
    } catch (e) {
        console.error('removeWebTag error', e);
        return false;
    }
}


export async function getPageGroupData(groupId: string) {
    const db = await getDB();
    const group = await db.get('nodes', groupId);
    const pageId = group.pageId;
    const pageData = await getPageTree(pageId);
    const groupDatas = pageData.filter(node => node.id === groupId)
    return groupDatas[0];
}

export async function getPageTree(pageId) {
    const db = await getDB();
    const nodes = await db.getAllFromIndex('nodes', 'pageId', pageId);
    nodes.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const urls = await db.getAllFromIndex('urls', 'pageId', pageId);

    function buildTree(parentId) {
        return nodes
            .filter(node => node.pId === parentId)
            .map(node => {
                if (node.type === 'folder') {
                    const children = buildTree(node.id);
                    const urlList = urls.filter(n => n.gId === node.id);
                    urls.sort((a, b) => (a.addDate ?? 0) - (b.addDate ?? 0));
                    //大分组存在标签，复制新的对象，作为子分组
                    if (urlList && urlList.length > 0 && children.length > 0) {
                        const child1 = {
                            ...node,
                            children: [],
                            urlList: urlList,
                        };
                        return {
                            ...node,
                            children: [child1, ...children]
                        };
                    } else return {
                        ...node,
                        children: children,
                        urlList: urlList,
                    };
                } else {
                    return node;
                }
            });
    }
    return buildTree(null); // 根节点
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
            if (parentNode.type === 'folder' && Array.isArray(parentNode.children) && parentNode.children.length > 0) {
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
        const urls = await db.getAllFromIndex('urls', 'pageId', pageId);
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
 * 生成 HTML 书签，支持层级结构
 * @param pageId
 * @returns {Promise<string>}
 */
export async function generateBookmarkHTML(pageId: number): Promise<string> {
    const originalPageTree = await getPageTree(pageId);
    const pageTree = processPageTree(originalPageTree);
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


            if (node.type === 'folder') {
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
            } else {
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
