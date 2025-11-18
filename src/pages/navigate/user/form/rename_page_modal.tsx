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

/**
 * 删除确认弹窗
 * @param id 要删除的项的ID
 * @param content 弹窗内容（标题）
 * @param extra 额外提示说明文字
 * @param type 删除对象类型（如“书签页”）
 * @param onOk 删除函数（需返回Promise<boolean>）
 * @returns Promise<boolean> 用户确认并删除成功后返回 true，否则 false
 */
export function renameConfirm(
    id: string,
    content: string,
    extra: string,
    type: string,
    onOk: (id?: string) => Promise<boolean>
): Promise<boolean> {

    const [disabled, setDisabled] = React.useState(true);
    // const { closeWithSuccess, bookmarkPage, visible } = props;

    const [confirmLoading, setConfirmLoading] = useState(false);

    const globalState = useSelector((state: any) => state.global);
    const cascaderOptions = globalState.treeData;
    const formItemLayout = {
        labelCol: {
            span: 4,
        },
        wrapperCol: {
            span: 20,
        },
    };
    //要显示的选择分组
    // const [optionValues, setOptionValues] = useState(selectGroup);

    const t = useLocale(locale);

    // 先声明 form，避免在 useEffect 中引用未定义的 form
    const [form] = Form.useForm();

    return new Promise((resolve) => {
        const handleOk = async () => {
            try {
                const success = await onOk(id);
                if (success) {
                    Message.success('删除成功');
                    resolve(true);
                } else {
                    Message.error('删除失败');
                    resolve(false);
                }
            } catch (error) {
                Message.error('删除失败');
                resolve(false);
            }
        };

        const handleCancel = () => {
            resolve(false);
        };

        const handleFocus = (event) => {
            // console.log('event 聚焦', event)
            setDisabled(true)//禁用拖动
        };


        /*  Modal.confirm({
             title: '删除确认',
             // TODO: 用t local改一下？',
             // 'Are you sure you want to delete the 3 selected items? Once you press the delete button, the items will be deleted immediately. You can’t undo this action.',
             // `确定删除标签"${tag.name}"吗？`,
             content: (
                 <p>
                     确定删除{type} "<span style={{ color: '#F53F3F' }}>{content}</span>" 吗？{extra}
                 </p>
             ),
             // disabled: true
             okButtonProps: { status: 'danger' },
             onOk: handleOk,
             onCancel: handleCancel,
         }); */

        // <Modal
        Modal.confirm({
            style={{ cursor: 'move' }}
            // title='Modal Title'
            // title={t['cardList.add.website.tag']}
            title = { t['cardList.edit.bookmark.group']}
            // visible={visible}
            // visible={true}
            onOk = { handleOk }
            // 显示提交 loading
            confirmLoading = { confirmLoading }
            // onCancel={cancel}
            onCancel = { handleCancel }
            autoFocus = { false}
            mountOnEnter = { false}
            onMouseOver = {() => {
        disabled && setDisabled(false);
}}
onMouseOut = {() => {
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

modalRender = {(modal) => <Draggable disabled={disabled}>{modal}</Draggable>}
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
             });
        // </Modal>

    });
}

export default renameConfirm;
