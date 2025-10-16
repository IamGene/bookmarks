import { getDB } from './db';

// 保存书签页及其节点
function uuid() {
    return Math.random().toString(36).substr(2, 9);
}

export async function savePageBookmarks(pageData) {
    try {
        const db = await getDB();
        const { pageId, title, createdAt, root, type } = pageData;
        await db.put('pages', { pageId, title, createdAt, updatedAt: createdAt, type });
        async function saveNode(node, parentId, order) {
            const nodeId = uuid();
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
                add_date: node.add_date,
                last_modified: node.last_modified,
                description: node.description,
                icon: node.icon,
            });
            // 顺序保存 urlList
            if (Array.isArray(node.urlList)) {
                for (let i = 0; i < node.urlList.length; i++) {
                    const url = node.urlList[i];
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
                        add_date: url.add_date,
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