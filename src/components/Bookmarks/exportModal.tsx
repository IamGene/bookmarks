import { Modal, Button, Form, Input, Radio, Select, Message } from '@arco-design/web-react';
import { useRef, useState, useEffect } from 'react';
// import { Form, Input, Message, Radio, Button, Select } from '@arco-design/web-react';
import { exportPageJson, getPageBookmarks, generateBookmarkHTML } from '@/db/bookmarksPages';
const FormItem = Form.Item;

interface ExportModalProps {
    pageId: number;
    pageName: string;
    visible: boolean;
    onClose: () => void;
}

function ExportModal({ pageId, pageName, visible, onClose }: ExportModalProps) {
    // const [visible, setVisible] = useState(false);
    const [confirmLoading, setConfirmLoading] = useState(false);
    const [form] = Form.useForm();


    useEffect(() => {
        // 当 pageName 或 pageId 变化时，重置表单的 fileName 字段
        if (visible) {
            form.setFieldsValue({ fileName: pageName + '-导出' });
        }
    }, [pageId, pageName]);


    async function onOk() {
        try {
            // console.log(pageId, pageName);
            const res = await form.validate();
            setConfirmLoading(true);
            if (res.fileType === 'JSON') {
                await exportJsonPage(res.fileName);
            } else {
                await exportHtmlPage(res.fileName);
            }
            Message.success('导出成功！');
            onClose();
        } catch (error) {
            console.error('导出失败:', error);
            // The validation error is an object, so a generic message is better.
            // Message.error('导出失败，请检查表单或稍后重试');
            Message.error('导出失败');
        } finally {
            setConfirmLoading(false);
        }
    }

    const formItemLayout = {
        labelCol: {
            span: 4,
        },
        wrapperCol: {
            span: 20,
        },
    };

    async function exportHtmlPage(filename: string) {
        // 调用新的函数生成带层级结构的 HTML
        const htmlString = await generateBookmarkHTML(pageId);
        if (htmlString) {
            // 4. 创建 Blob 并触发下载
            const blob = new Blob([htmlString], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; // a.download = `${item.title}.html`; // 设置下载的文件名
            a.download = `${filename}.html`; // 设置下载的文件名

            a.click();
            URL.revokeObjectURL(url);
        } else {
            // 可以加入一个错误提示，例如
            // Message.error('导出失败，该书签页没有内容。');
        }
    }


    async function exportJsonPage(filename: string) {
        // 导出书签页
        const res = await exportPageJson(pageId);
        if (res && res.pages) {
            // 将 JSON 对象转换为格式化的字符串
            const jsonString = JSON.stringify(res, null, 2);
            // 创建一个 Blob 对象
            const blob = new Blob([jsonString], { type: 'application/json' });
            // 创建一个指向该 Blob 的 URL
            const url = URL.createObjectURL(blob);
            // 创建一个临时的 a 标签用于下载
            const a = document.createElement('a');
            a.href = url;
            // a.download = `${res.pages[0].title}.json`; // 设置下载的文件名
            a.download = `${filename}.json`; // 设置下载的文件名
            a.click(); // 触发下载
            // 释放 URL 对象
            URL.revokeObjectURL(url);
        }
    }

    return (
        /*  <Modal
             title='Export Bookmarks'
             visible={visible}
             onOk={onOk}
             confirmLoading={confirmLoading}
             onCancel={onClose}
         >
             <p>选择导出方式</p>
             <Button onClick={() => {
                 Message.success('Success export json!');
                 onClose();
             }} type='primary'>
                 导出JSON
             </Button>
         </Modal> */

        <Modal
            // title='Export Bookmarks'
            title='导出书签'
            visible={visible}
            onOk={onOk}
            confirmLoading={confirmLoading}
            // onCancel={() => setVisible(false)}
            onCancel={onClose}
        >

            <Form
                form={form}
                autoComplete='off'
                initialValues={{ fileType: 'JSON', fileName: pageName + '-导出' }}
                style={{ maxWidth: 650 }}
                onValuesChange={(_, vs) => {
                    console.log(vs);
                }}
            >
                {/* <Form.Item field='type' label='Type'> */}
                <Form.Item field='fileType' label='文件类型' rules={[{ required: true }]}>
                    <Radio.Group options={['JSON', 'HTML']}></Radio.Group>
                </Form.Item>
                <Form.Item field='fileName' label='文件名' rules={[{ required: true }]}>
                    <Input placeholder='请输入导出文件名' />
                </Form.Item>

                {/* <Form.Item noStyle shouldUpdate={(prev, next) => prev.type !== next.type}>
                    {(values) => {
                        return values.type ? (
                            <Form.Item field='remark' label='Remark'>
                                <Input.TextArea placeholder={values.type + ' remark'} />
                            </Form.Item>
                        ) : null;
                    }}
                </Form.Item> */}

                {/* <Form.Item wrapperCol={{ span: 17, offset: 5 }}>
                    <Button
                        onClick={() => {
                            console.log(form.getFieldsValue());
                        }}
                    >
                        OK
                    </Button>
                </Form.Item> */}
            </Form>
        </Modal>
    );
}

export default ExportModal;