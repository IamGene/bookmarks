import React from 'react';
import Draggable from 'react-draggable';
import { useState, useEffect, useRef } from 'react';
import { Modal, Input, Cascader, Switch, Form, Message } from '@arco-design/web-react';
import useLocale from '@/utils/useLocale';
import locale from '../locale';
import { GroupNode } from '@/store/modules/global';
import { updateBookmarkById, renameBookmarkPageById } from '@/db/bookmarksPages';
import { saveTagGroup } from '@/api/navigate';
import { useSelector } from 'react-redux';
const FormItem = Form.Item;

interface GroupFormParams {
    closeWithSuccess: Function;
    bookmarkPage: any;
    visible: boolean;
}

function App(props: GroupFormParams) {
    const [disabled, setDisabled] = React.useState(true);
    const { closeWithSuccess, bookmarkPage, visible } = props;

    const [confirmLoading, setConfirmLoading] = useState(false);

    const globalState = useSelector((state: any) => state.global);
    const cascaderOptions = globalState.treeData;

    //要显示的选择分组
    // const [optionValues, setOptionValues] = useState(selectGroup);

    const t = useLocale(locale);

    // 先声明 form，避免在 useEffect 中引用未定义的 form
    const [form] = Form.useForm();

    const processRenameBookmarkPage = async (data: any) => {
        setConfirmLoading(true);
        try {
            let bookmarkPageData: any = null;
            bookmarkPageData = await renameBookmarkPageById(data);
            // Message.success('修改成功');
            setConfirmLoading(false);
            // 关闭并回传数据
            closeWithSuccess(true, bookmarkPageData);
            // return bookmarkPageData;
        } catch (err) {
            setConfirmLoading(false);
            Message.error('保存失败');
            return null;
        }
    };

    async function processRenameBookmarkPage1(data: any) {
        setConfirmLoading(true);
        try {
            let bookmarkPageData: any = null;
            bookmarkPageData = await renameBookmarkPageById(data);
            // Message.success('修改成功');
            setConfirmLoading(false);
            // 关闭并回传数据
            closeWithSuccess(true, bookmarkPageData);
            // return bookmarkPageData;
        } catch (err) {
            setConfirmLoading(false);
            Message.error('保存失败');
            return null;
        }
    };

    const onOk = async () => {
        try {
            const res = await form.validate();
            // 截断 title
            const title = res.title || '';
            if (title.length > 20) res.title = title.substring(0, 20);
            // console.log('bookmarkPage', res);
            await processRenameBookmarkPage1(res);
        } catch (err) {
            // 校验失败或保存异常会到这里
            console.error('onOk error', err);
        }
    };

    //点击取消==>关闭窗口
    const cancel = () => {
        closeWithSuccess(false);
    };

    // 在弹窗可见时或 bookmarkPage 发生变化时初始化表单
    useEffect(() => {
        if (visible) {
            form.setFields({
                pageId: { value: bookmarkPage ? bookmarkPage.pageId : null },
                title: { value: bookmarkPage ? bookmarkPage.title : '' },
            });
        }
    }, [visible, bookmarkPage, form]);
    const formItemLayout = {
        labelCol: {
            span: 4,
        },
        wrapperCol: {
            span: 20,
        },
    };


    // 处理失焦事件
    const handleBlur = async (event) => {
        // setInputValue(event.target.value);
        setDisabled(false)
        //不为空
    };

    // 提交表单数据
    const submitGroupData = async (group: GroupNode): Promise<any> => {
        try {
            const response = await saveTagGroup(group);
            if (response.code === 200) {
                // console.log('response', response);
                // return true;
                return response.data; // 直接返回整个响应对象
            } else {
                // return false;
                // 处理错误情况
                throw new Error('请求失败');
            }
        } catch (error) {
            // 处理异常
            console.error('请求错误:', error);
            throw error;
        }
    };

    const handleFocus = (event) => {
        // console.log('event 聚焦', event)
        setDisabled(true)//禁用拖动
    };


    const handleChange = (event) => {
        if (event && event.trim()) {
            // console.log('当前url', event)
            /*  if (!containsHttp(event)) {
                 setUrl('https://' + event)
             } else {
                 setUrl(event)
             } */
        } else {
            // setUrl('')
        }
    };

    return (
        <div>
            <Modal
                style={{ cursor: 'move' }}
                // title='Modal Title'
                // title={t['cardList.add.website.tag']}
                title={t['cardList.edit.bookmark.group']}
                visible={visible}
                // visible={true}
                onOk={onOk}
                // 显示提交 loading
                confirmLoading={confirmLoading}
                onCancel={cancel}
                autoFocus={false}
                mountOnEnter={false}
                onMouseOver={() => {
                    disabled && setDisabled(false);
                }}
                onMouseOut={() => {
                    !disabled && setDisabled(true);
                }}
                /*   modalRender={(modal) => (
                      <div
                          onMouseOver={() => {
                              disabled && setDisabled(false);
                          }}
                          onMouseOut={() => {
                              !disabled && setDisabled(true);
                          }}
                      >
                          <Draggable disabled={disabled}>{modal}</Draggable>
                      </div>
                  )} */

                modalRender={(modal) => <Draggable disabled={disabled}>{modal}</Draggable>}
            >
                <Form
                    {...formItemLayout}
                    form={form}
                    labelCol={{
                        // style: { flexBasis: 90 },
                        style: { flexBasis: 75 },
                    }}
                    wrapperCol={{
                        // style: { flexBasis: 'calc(100% - 90px)' },
                        style: { flexBasis: 'calc(100% - 75px)' },
                    }}
                >

                    <FormItem label='名称' field='title' rules={[{ required: true }]}>
                        <Input
                            placeholder='请输入书签页名称'
                            onFocus={handleFocus}
                            allowClear={true}
                            maxLength={20}
                            showWordLimit
                        />
                    </FormItem>


                    {/* 隐藏项 :id*/}
                    <FormItem label='pageId' field='pageId' hidden rules={[{ required: true }]}>
                        <Input
                            allowClear={false}
                        />
                    </FormItem>

                </Form>
            </Modal>
        </div >
    );
}

export default App;