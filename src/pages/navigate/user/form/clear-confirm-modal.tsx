import React from 'react';
import { Modal, Message } from '@arco-design/web-react';

/**
 * 删除确认弹窗
 * @param id 要删除的项的ID
 * @param content 弹窗内容（标题）
 * @param extra 额外提示说明文字
 * @param type 删除对象类型（如“书签页”）
 * @param onOk 删除函数（需返回Promise<boolean>）
 * @returns Promise<boolean> 用户确认并删除成功后返回 true，否则 false
 */
export function clearConfirm(
    id: string,
    content: string,
    extra: string,
    type: string,
    onOk: (id?: string) => Promise<boolean>
): Promise<boolean> {
    return new Promise((resolve) => {
        const handleOk = async () => {
            try {
                const success = await onOk(id);
                if (success) {
                    Message.success('清空成功');
                    resolve(true);
                } else {
                    Message.error('清空失败');
                    resolve(false);
                }
            } catch (error) {
                Message.error('清空失败');
                resolve(false);
            }
        };

        const handleCancel = () => {
            resolve(false);
        };

        Modal.confirm({
            title: '清空确认',
            // TODO: 用t local改一下？',
            // 'Are you sure you want to delete the 3 selected items? Once you press the delete button, the items will be deleted immediately. You can’t undo this action.',
            // `确定删除标签"${tag.name}"吗？`,
            content: (
                <p>
                    确定清空{type} "<span style={{ color: '#F53F3F' }}>{content}</span>" 吗？{extra}
                </p>
            ),
            // disabled: true
            okButtonProps: { status: 'danger' },
            onOk: handleOk,
            onCancel: handleCancel,
        });
    });
}

export default clearConfirm;
