import { Checkbox, Button } from '@arco-design/web-react';


interface Props {
    data: any;
    searching: boolean;
    currentTab: string;
    // first arg: nodeKey (the tab id to operate on), second arg: ids array
    selectedMapChange?: (nodeKey: string, ids: string[], path: string) => void;
    selectedMap?: Record<string, string[]>;
    activeMap?: Record<string, string>;
}

function MultiSelectCheckBox(props: Props) {
    const {
        data,
        searching,
        currentTab,
        selectedMapChange,
        activeMap
    } = props;

    // selectedMap 来自父组件，onSelectedMapChange 用于通知父组件更新
    const { selectedMap } = props as any;
    const searchTabKey = 'search-result';

    return (
        <div style={{}}>
            <Checkbox
                onChange={(checked) => {// 全选/全不选逻辑
                    try {
                        // 计算要作用的最内层 tab id
                        let targetNodeKey = currentTab;//currentTab:checkbox所在tabs层的activeTab
                        let path = null;
                        if (currentTab !== searchTabKey && activeMap) {//非搜索结果tab且有activeMap时，寻找最内层activeTab
                            // const rootId = String(data.id);
                            //过滤出以当前tabs根节点id开头的activeMap键（即当前tabs及其子tabs的activeTab）
                            const keys = Object.keys(activeMap || {});//.filter(k => k && k.indexOf(rootId) === 0);
                            if (keys.length > 0) {
                                const longest = keys.reduce((a, b) => a.length >= b.length ? a : b);
                                path = longest.replaceAll('-', ',') + ',' + currentTab;
                                const val = activeMap[longest];
                                if (val) targetNodeKey = val;
                            }
                        }

                        // 查找目标节点（递归）
                        const findNodeById = (root: any, id: string) => {
                            if (!root) return null;
                            let found = null;
                            function dfs(n) {
                                if (!n || found) return;
                                if (String(n.id) === String(id)) { found = n; return; }
                                if (Array.isArray(n.children)) {
                                    for (const c of n.children) {
                                        dfs(c);
                                        if (found) return;
                                    }
                                }
                            }
                            dfs(root);
                            return found;
                        };

                        if (checked) {
                            let ids: string[] = [];
                            if (targetNodeKey === searchTabKey) {
                                ids = ((searching && data.searchResult ? data.searchResult : data.bookmarks) || []).map((b: any) => String(b.id));
                            } else {
                                const node = findNodeById(data, targetNodeKey);
                                ids = node ? ((searching && node.searchResult ? node.searchResult : node.bookmarks) || []).map((b: any) => String(b.id)) : [];
                            }
                            selectedMapChange && selectedMapChange(targetNodeKey, ids, path);//全选
                        } else {
                            selectedMapChange && selectedMapChange(targetNodeKey, [], path);//全不选
                        }
                    } catch (e) {
                        // ignore
                    }
                }}
                checked={(() => {
                    try {
                        let targetNodeKey = currentTab;
                        if (currentTab !== searchTabKey && activeMap) {
                            // const rootId = String(data.id);
                            const keys = Object.keys(activeMap || {});//.filter(k => k && k.indexOf(rootId) === 0);
                            if (keys.length > 0) {
                                const longest = keys.reduce((a, b) => a.length >= b.length ? a : b);
                                const val = activeMap[longest];
                                if (val) targetNodeKey = val;
                            }
                        }
                        const findNodeById = (root: any, id: string) => {
                            if (!root) return null;
                            let found = null;
                            function dfs(n) {
                                if (!n || found) return;
                                if (String(n.id) === String(id)) { found = n; return; }
                                if (Array.isArray(n.children)) {
                                    for (const c of n.children) {
                                        dfs(c);
                                        if (found) return;
                                    }
                                }
                            }
                            dfs(root);
                            return found;
                        };
                        let ids = [];
                        if (targetNodeKey === searchTabKey) {
                            ids = ((searching && data.searchResult ? data.searchResult : data.bookmarks) || []).map((b: any) => String(b.id));
                        } else {
                            const node = findNodeById(data, targetNodeKey);
                            ids = node ? ((searching && node.searchResult ? node.searchResult : node.bookmarks) || []).map((b: any) => String(b.id)) : [];
                        }
                        const sel = (selectedMap && selectedMap[targetNodeKey]) ? selectedMap[targetNodeKey] : [];
                        return ids.length > 0 && sel.length === ids.length;// 全选条件：当前节点下有书签，且已选中的书签数量等于总书签数量
                    } catch (e) {
                        return false;
                    }
                })()}
                indeterminate={(() => {// 半选条件：已选中的书签数量大于0且小于总书签数量
                    try {
                        let targetNodeKey = currentTab;
                        if (currentTab !== searchTabKey && activeMap) {
                            // const rootId = String(data.id);
                            const keys = Object.keys(activeMap || {});//.filter(k => k && k.indexOf(rootId) === 0);
                            if (keys.length > 0) {
                                const longest = keys.reduce((a, b) => a.length >= b.length ? a : b);
                                const val = activeMap[longest];
                                if (val) targetNodeKey = val;
                            }
                        }
                        const findNodeById = (root: any, id: string) => {
                            if (!root) return null;
                            let found = null;
                            function dfs(n) {
                                if (!n || found) return;
                                if (String(n.id) === String(id)) { found = n; return; }
                                if (Array.isArray(n.children)) {
                                    for (const c of n.children) {
                                        dfs(c);
                                        if (found) return;
                                    }
                                }
                            }
                            dfs(root);
                            return found;
                        };
                        let ids = [];
                        if (targetNodeKey === searchTabKey) {
                            ids = ((searching && data.searchResult ? data.searchResult : data.bookmarks) || []).map((b: any) => String(b.id));
                        } else {
                            const node = findNodeById(data, targetNodeKey);
                            ids = node ? ((searching && node.searchResult ? node.searchResult : node.bookmarks) || []).map((b: any) => String(b.id)) : [];
                        }
                        const sel = (selectedMap && selectedMap[targetNodeKey]) ? selectedMap[targetNodeKey] : [];// 已选中的 id 数组
                        return sel.length > 0 && sel.length < ids.length;// 部分选中
                    } catch (e) {
                        return false;
                    }
                })()}
            >
                全选
            </Checkbox>
            <Button
                size='mini'
                type='primary'
                style={{ marginLeft: '12px' }}
                onClick={() => {
                    try {
                        let targetNodeKey = currentTab;
                        let path = null;
                        if (currentTab !== searchTabKey && activeMap) {
                            // const rootId = String(data.id);
                            const keys = Object.keys(activeMap || {});//.filter(k => k && k.indexOf(rootId) === 0);
                            if (keys.length > 0) {
                                const longest = keys.reduce((a, b) => a.length >= b.length ? a : b);
                                const val = activeMap[longest];
                                path = longest.replaceAll('-', ',') + ',' + currentTab;
                                if (val) targetNodeKey = val;
                            }
                        }
                        const findNodeById = (root: any, id: string) => {
                            if (!root) return null;
                            let found = null;
                            function dfs(n) {
                                if (!n || found) return;
                                if (String(n.id) === String(id)) { found = n; return; }
                                if (Array.isArray(n.children)) {
                                    for (const c of n.children) {
                                        dfs(c);
                                        if (found) return;
                                    }
                                }
                            }
                            dfs(root);
                            return found;
                        };
                        let ids: string[] = [];
                        if (targetNodeKey === searchTabKey) {
                            ids = ((searching && data.searchResult ? data.searchResult : data.bookmarks) || []).map((b: any) => String(b.id));
                        } else {
                            const node = findNodeById(data, targetNodeKey);
                            ids = node ? ((searching && node.searchResult ? node.searchResult : node.bookmarks) || []).map((b: any) => String(b.id)) : [];
                        }
                        const sel = (selectedMap && selectedMap[targetNodeKey]) ? selectedMap[targetNodeKey] : [];
                        const inverted = ids.filter((id: string) => !sel.includes(id));
                        selectedMapChange && selectedMapChange(targetNodeKey, inverted, path);
                    } catch (e) {
                        // ignore
                    }
                }}
            >
                反选
            </Button>
            {/* 全不选 操作已合并到上方 Checkbox 的取消动作，所以移除独立按钮 */}
        </div>
    );
}


export default MultiSelectCheckBox;