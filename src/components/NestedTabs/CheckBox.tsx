import { Checkbox, Button } from '@arco-design/web-react';


interface Props {
    data: any;
    searching: boolean;
    currentTab: string;
    selectedMapChange?: (ids: string[]) => void;
    selectedMap?: Record<string, string[]>;
}

function MultiSelectCheckBox(props: Props) {
    const {
        data,
        searching,
        currentTab,
        selectedMapChange
    } = props;

    // selectedMap 来自父组件，onSelectedMapChange 用于通知父组件更新
    const { selectedMap } = props as any;
    const searchTabKey = 'search-result'

    return (
        <div style={{}}>
            <Checkbox
                onChange={(checked) => {
                    try {
                        let ids;
                        if (currentTab === searchTabKey) { //该(大)分组的所有搜索结果tab
                            ids = ((searching && data.searchResult ? data.searchResult : data.bookmarks) || []).map((b: any) => String(b.id))
                        } else {//普通分组 正常模式/搜索模式
                            const node = data.children.find((c: any) => c.id === currentTab);
                            ids = node ? ((searching && node.searchResult ? node.searchResult : node.bookmarks) || []).map((b: any) => String(b.id)) : [];
                        }
                        if (checked) {
                            // console.log('xxxxxxxxxxxxxxxx', currentTab, ids);
                            selectedMapChange && selectedMapChange(ids);
                        } else {
                            selectedMapChange && selectedMapChange([]);
                        }
                    } catch (e) {
                        // ignore
                    }
                }}
                checked={(() => {
                    let ids;
                    if (currentTab === searchTabKey) { //该(大)分组的所有搜索结果tab
                        ids = ((searching && data.searchResult ? data.searchResult : data.bookmarks) || []).map((b: any) => String(b.id))
                    } else {
                        const node = data.children.find((c: any) => c.id === currentTab);
                        ids = node ? ((searching && node.searchResult ? node.searchResult : node.bookmarks) || []).map((b: any) => String(b.id)) : [];
                    }
                    //当前tab下的所有id列表
                    const sel = (selectedMap && selectedMap[currentTab]) ? selectedMap[currentTab] : [];//当前tab已选的id列表
                    return ids.length > 0 && sel.length === ids.length;//全选状态：当前tab有数据，且已选数量等于数据总量
                })()}
                indeterminate={(() => {
                    let ids;
                    if (currentTab === searchTabKey) { //该(大)分组的所有搜索结果tab
                        ids = ((searching && data.searchResult ? data.searchResult : data.bookmarks) || []).map((b: any) => String(b.id))
                    } else {
                        const node = data.children.find((c: any) => c.id === currentTab);
                        ids = node ? ((searching && node.searchResult ? node.searchResult : node.bookmarks) || []).map((b: any) => String(b.id)) : [];
                    }
                    const sel = (selectedMap && selectedMap[currentTab]) ? selectedMap[currentTab] : [];
                    return sel.length > 0 && sel.length < ids.length;//半选状态：已选数量大于0且小于数据总量
                })()}
            >
                全选
            </Checkbox>
            <Button
                size='mini'
                type='primary'
                style={{ marginLeft: '12px' }}
                onClick={() => {

                    let ids;
                    if (currentTab === searchTabKey) { //该(大)分组的所有搜索结果tab
                        ids = ((searching && data.searchResult ? data.searchResult : data.bookmarks) || []).map((b: any) => String(b.id))
                    } else {
                        const node = data.children.find((c: any) => c.id === currentTab);
                        ids = node ? ((searching && node.searchResult ? node.searchResult : node.bookmarks) || []).map((b: any) => String(b.id)) : [];
                    }
                    // const node = data.children.find((c: any) => c.id === currentTab);
                    // const ids = node ? ((searching && node.searchResult ? node.searchResult : node.bookmarks) || []).map((b: any) => String(b.id)) : [];
                    const sel = (selectedMap && selectedMap[currentTab]) ? selectedMap[currentTab] : [];
                    const inverted = ids.filter((id: string) => !sel.includes(id));
                    // selectedMapChange && selectedMapChange(currentTab, inverted);
                    selectedMapChange && selectedMapChange(inverted);
                }}
            >
                反选
            </Button>
            {/* 全不选 操作已合并到上方 Checkbox 的取消动作，所以移除独立按钮 */}
        </div>
    );
}


export default MultiSelectCheckBox;