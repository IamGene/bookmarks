import { getDB } from './db';

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