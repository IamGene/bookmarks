/**
 * 解析上传的书签文件，返回解析后的 JSON
 * @param file HTML 文件对象
 * @param type 1-Chrome 2-Edge 3-Firefox
 * @returns Promise<any[]>
 */
export function handleFile(file: File, type: number): Promise<any[]> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const html = e.target?.result as string;
                const bookmarks = type === 1 ? "书签栏" : (type === 2 ? "收藏夹栏" : "书签工具栏");
                const toolBar = type === 1 ? "书签栏" : (type === 2 ? "收藏夹栏" : "Bookmarks Toolbar");
                const others = type === 1 ? "移动设备和其他书签栏" : (type === 2 ? "移动和其他收藏夹" : "其他书签");
                const json = parseBookmarksAll(html, bookmarks, toolBar, others, type);
                resolve(json);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = function () {
            reject(new Error('文件读取失败'));
        };
        reader.readAsText(file, 'utf-8');
    });
}
// 书签解析工具

/**
 * 为书签树结构添加 id 和 path
 */
export function addIdAndPath(data: any[]): any[] {
    let id = 1;      // 主树节点自增 id
    // let naviId = 1;  // urlList 子项自增 id

    function traverse(nodes: any[], parentId: number | null): any[] {
        return nodes.map(item => {
            const currentId = id++;
            const currentPath = parentId === null ? `${currentId}` : `${parentId},${currentId}`;
            const pid = parentId;
            let result: any = {
                ...item,
                id: currentId,
                path: currentPath,
                pid: pid,
            };
            if (item.urlList && item.urlList.length > 0) {
                result.urlList = item.urlList.map(naviItem => ({
                    ...naviItem,
                    id: id++,
                }));
            }
            if (item.children && item.children.length > 0) {
                result.children = traverse(item.children, currentId);
                //大分组存在标签，复制新的对象，作为子分组
                if (item.urlList && item.urlList.length > 0) {
                    const result1 = {
                        ...result,
                        children: [],
                    };
                    result.children = [result1, ...result.children];
                    delete result.urlList;
                }
            } else {
                result.children = [];
            }
            return result;
        });
    }
    return traverse(data, null);
}

/**
 * 解析书签 HTML，支持 Chrome/Edge/Firefox
 * @param html HTML 字符串
 * @param bookmarks 书签栏名
 * @param toolBar 工具栏名
 * @param others 其他书签栏名
 * @param type 1-Chrome 2-Edge 3-Firefox
 */
export function parseBookmarksAll(html: string, bookmarks: string, toolBar: string, others: string, type: number): any[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    function parseDL(dlNode: Element, level: number, parentResult: any[], pChildren: any[], main: boolean): any[] {
        const result: any[] = [];
        let singleBookMarks = null;
        let otherBookMarks: any;
        if (level == 0) {
            otherBookMarks = {
                type: "folder",
                name: others,
                title: others,
                addDate: null,
                last_modified: null,
                children: [],
                urlList: []
            };
        }
        if (level == 1 && main) {
            singleBookMarks = {
                type: "folder",
                name: bookmarks,
                title: bookmarks,
                addDate: null,
                last_modified: null,
                children: [],
                urlList: []
            };
        }
        let i = 0;
        const children = Array.from(dlNode.children);
        while (i < children.length) {
            const node = children[i];
            if (node.tagName === "DT") {
                const h3 = node.querySelector("h3");
                const a = node.querySelector("a");
                if (h3) {
                    let folder: any = {
                        type: "folder",
                        name: h3.textContent,
                        description: h3.textContent,
                        addDate: h3.getAttribute("ADD_DATE"),
                        last_modified: h3.getAttribute("LAST_MODIFIED"),
                        children: [],
                        urlList: []
                    };
                    if (level == 0) {
                        let childLength = node.children.length;
                        let j = 0;
                        while (j < childLength) {
                            let node1 = node.children[j];
                            if (node1.tagName === "DL") {
                                if (h3.textContent === toolBar) {
                                    parseDL(node1, level + 1, result, pChildren, true);
                                } else {
                                    let result0 = parseDL(node1, level + 1, folder.children, pChildren, main);
                                    folder.urlList = result0;
                                    if (type == 3) {
                                        if (folder.name === "Other Bookmarks") {
                                            folder.name = "其他书签";
                                            folder.title = "其他书签";
                                            folder.description = "其他书签";
                                        }
                                        result.push(folder);
                                    } else {
                                        otherBookMarks.children.push(folder);
                                    }
                                }
                            }
                            j++;
                        }
                    } else {
                        let childLength = node.children.length;
                        let j = 0;
                        const children1 = Array.from(node.children);
                        while (j < children1.length) {
                            const node1 = children1[j];
                            if (node1.tagName === "DL") {
                                let result1 = parseDL(node1, level + 1, folder.children, folder.children, main);
                                if (result1) {
                                    if (level == 0) {
                                        result.push(...pChildren);
                                    } else if (level == 1) {
                                        folder.urlList = result1;
                                        parentResult.push(folder);
                                    } else if (level == 2) {
                                        folder.urlList = result1;
                                        pChildren.push(folder);
                                    }
                                }
                            }
                            j++;
                        }
                    }
                } else if (a) {
                    if (level == 0) {
                        otherBookMarks.urlList.push({
                            type: "bookmark",
                            description: a.textContent,
                            name: a.textContent,
                            url: a.getAttribute("HREF"),
                            addDate: a.getAttribute("ADD_DATE"),
                            icon: a.getAttribute("ICON") || null
                        });
                    } else if (level == 1) {
                        if (main) {
                            singleBookMarks.urlList.push({
                                type: "bookmark",
                                description: a.textContent,
                                name: a.textContent,
                                url: a.getAttribute("HREF"),
                                addDate: a.getAttribute("ADD_DATE"),
                                icon: a.getAttribute("ICON") || null
                            });
                        } else {
                            result.push({
                                type: "bookmark",
                                description: a.textContent,
                                name: a.textContent,
                                url: a.getAttribute("HREF"),
                                addDate: a.getAttribute("ADD_DATE"),
                                icon: a.getAttribute("ICON") || null
                            });
                        }
                    } else {
                        result.push({
                            type: "bookmark",
                            name: a.textContent,
                            description: a.textContent,
                            url: a.getAttribute("HREF"),
                            addDate: a.getAttribute("ADD_DATE"),
                            icon: a.getAttribute("ICON") || null
                        });
                    }
                }
            } else if (node.tagName === "DL") {
                result.push(...parseDL(node, level + 1, parentResult, children, main));
            }
            i++;
        }
        if (singleBookMarks) {
            parentResult.unshift(singleBookMarks);
        }
        if (otherBookMarks && (otherBookMarks.urlList.length > 0 || otherBookMarks.children.length > 0)) {
            let result1 = [...result, otherBookMarks];
            return result1;
        }
        return result;
    }
    const topDL = doc.querySelector("DL");
    if (!topDL) return [];
    let results = parseDL(topDL, 0, [], [], false);

    // console.log('results', results);
    return results;
}
