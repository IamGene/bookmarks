import React, { useEffect, useState, useRef } from 'react';
import {
    List,
    Button,
    Message,
    Space,
} from '@arco-design/web-react';
import useLocale from '@/utils/useLocale';
import styles from '../style/index.module.less';
import { handleFile } from './parseBookmarks';
import { savePageBookmarks, importPageJson } from '@/db/bookmarksPages';

export interface MessageItemData {
    id: string;
    title: string;
    subTitle?: string;
    avatar?: string;
    content: string;
    time?: string;
    status: number;
    tag?: {
        text?: string;
        color?: string;
    };
}

export interface BookmarksPageData {
    pageId: number;
    title: string;
    default: boolean
    createAt: number;
    updateAt: number;
    tag?: {
        text?: string;
        color?: string;
    };
}

export type MessageListType = MessageItemData[];
export type BookmarksPagesType = BookmarksPageData[];


interface BookmarksPageProps {
    data: BookmarksPageData[];
    onImportSuccess: (pageIds: number[]) => void;
    onItemClick?: (item: BookmarksPageData, index: number) => void;
    onAllBtnClick?: (
        // unReadData: BookmarksPageData[],
        data: BookmarksPageData[]
    ) => void;
}

function Imports(props: BookmarksPageProps) {
    const t = useLocale();
    // 状态：记录导入的浏览器类型 (1: Chrome, 2: Edge, 3: Firefox)
    const [type, setType] = useState<number>(1);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const jsonFileInputRef = useRef<HTMLInputElement>(null);

    // 处理 HTML 导入按钮点击，触发隐藏的文件选择框
    const handleClick = (type: number) => {
        setType(type);
        fileInputRef.current?.click();
    };

    // 处理 JSON 导入按钮点击，触发隐藏的文件选择框
    const handleJsonClick = (type: number) => {
        setType(type);
        jsonFileInputRef.current?.click();
    };

    // 当用户选择了一个 JSON 文件后触发
    const handleJsonChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        // console.log('file', file);
        if (!file) return;
        Message.info(`已选择JSON文件：${file.name}`);

        // 使用 FileReader API 异步读取文件内容
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                // 将读取到的文本内容解析为 JSON 对象
                const jsonData = JSON.parse(event.target.result as string);
                // 调用数据库方法，将 JSON 数据导入为一个新的书签页
                const newPageIds: number[] = await importPageJson(jsonData); // newPageIds will be number[] | null
                if (newPageIds && newPageIds.length > 0) {
                    Message.success('JSON 书签导入成功');
                    // 导入成功后，调用父组件的回调函数，并传入新页面的 ID
                    props.onImportSuccess(newPageIds); // Pass the first imported page ID
                } else {
                    Message.error('JSON 书签导入失败，请检查文件格式是否正确。');
                }
            } catch (error) {
                console.error("解析或导入JSON失败:", error);
                Message.error('JSON 书签导入失败，文件内容格式错误。');
            }
        };
        // 以文本格式开始读取文件
        reader.readAsText(file);//
        // 清空 input 的值，确保下次选择同一个文件时也能触发 onChange 事件
        e.target.value = '';
    };

    // 当用户选择了一个 HTML 书签文件后触发
    const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        Message.info(`已选择文件：${file.name}`);

        // 调用外部方法解析 HTML 文件，返回 JSON 结构的数据
        const json = await handleFile(file, type);
        if (json && json.length > 0) {
            const id = Date.now();
            const typeMap = { 1: 'Chrome', 2: 'Edge', 3: 'Firefox' };
            const browserName = typeMap[type] || '其他';

            // const cTitle = `${browserName}书签-${id}`;

            const now = new Date();
            const pad = (n: number) => n < 10 ? '0' + n : n;
            // const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
            // const cTitleBase = `${browserName}书签-${dateStr}`;

            // 检查已有title前缀
            /*  const existCount = Array.isArray(props.data)
                 ? props.data.filter(item => typeof item.title === 'string' && item.title.startsWith(cTitle)).length
                 : 0;
             if (existCount > 0) { } */

            // 生成一个唯一的页面标题
            let cTitle = `${browserName}-${now.getFullYear().toString().slice(-2)}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
            const saveData = {
                pageId: id,
                title: cTitle,
                type,
                createdAt: id,
                root: json,
            };

            // 调用数据库方法，保存解析后的书签数据
            const res = await savePageBookmarks(saveData);
            if (res) {
                Message.success('书签导入成功');
                // 导入成功后，调用父组件的回调函数
                props.onImportSuccess([id]);
            } else {
                Message.error('书签导入失败');
            }
        }
        // 清空 input 的值，确保下次选择同一个文件时也能触发 onChange 事件
        e.target.value = '';
    };

    return (
        <List>
            <List.Item>
                <div style={{ cursor: 'pointer' }}>
                    {/* 隐藏的文件选择框，用于导入 HTML */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".html,.htm"
                        style={{ display: 'none' }}
                        onClick={(e) => (e.currentTarget.value = '')}
                        onChange={handleChange}
                    />
                    {/* 隐藏的文件选择框，用于导入 JSON */}
                    <input
                        ref={jsonFileInputRef}
                        type="file"
                        accept=".json"
                        style={{ display: 'none' }}
                        onClick={(e) => (e.currentTarget.value = '')}
                        onChange={handleJsonChange}
                    />
                    <List.Item.Meta
                        title={
                            <div className={styles['message-title']}>
                                <Space size={4}>
                                    {/* HTML 导入按钮组 */}
                                    <div
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(3, 100px)',
                                            gridRowGap: 24,
                                            gridColumnGap: 24,
                                        }}
                                    >
                                        <Button status='danger' onClick={() => handleClick(1)}>Chrome书签</Button>
                                        <Button status='success' onClick={() => handleClick(2)}>Edge书签</Button>
                                        <Button status='warning' onClick={() => handleClick(3)}>Firefox书签</Button>
                                    </div>
                                </Space>
                            </div>
                        }
                    />

                    <List.Item.Meta
                        title={
                            <div className={styles['message-title']}>
                                <Space size={4}>
                                    <div
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(3, 100px)',
                                            gridRowGap: 24,
                                            gridColumnGap: 24,
                                        }}
                                    >
                                        <Button status='default' onClick={() => handleJsonClick(4)}>JSON</Button>
                                    </div>
                                </Space>
                            </div>
                        }
                    />
                </div>
            </List.Item>
        </List>
    );
}

export default Imports;
