import React from 'react';
import Draggable from 'react-draggable';
import { useState, useEffect, useRef } from 'react';
import { Modal, Input, Cascader, Switch, Form, Message } from '@arco-design/web-react';
import useLocale from '@/utils/useLocale';
import locale from '../locale';
import { GroupNode } from '@/store/modules/global';
import { updateBookmarkById, updateGroupById } from '@/db/bookmarksPages';
import { saveTagGroup } from '@/api/navigate';
import { useSelector } from 'react-redux';
const FormItem = Form.Item;

interface GroupFormParams {
    closeWithSuccess: Function;
    selectGroup: number[];//
    group: GroupNode;//
    pageId: number;
    // groupName: string;
    // noPid?: boolean;
    visible: boolean;
}

function App(props: GroupFormParams) {
    const [disabled, setDisabled] = React.useState(true);
    const { closeWithSuccess, pageId, visible, selectGroup, group } = props;

    console.log('tab form selectGroup', selectGroup);
    console.log('tab form group', group);
    // console.log('tab form noPid', noPid)
    // console.log('form group', group)
    // const [visible, setVisible] = React.useState(false);
    // const formRef = useRef<FormInstance>();
    const [confirmLoading, setConfirmLoading] = useState(false);

    const globalState = useSelector((state: any) => state.global);
    const cascaderOptions = globalState.groups;

    //要显示的选择分组
    const [optionValues, setOptionValues] = useState(selectGroup);

    const t = useLocale(locale);

    const processSaveSubGroup = async (data) => {
        // console.log('group form submit before_group', group)
        //返回成功
        // const res = await submitGroupData(data)
        const updatedGroup = await updateGroupById(data);
        if (group.id) {
            Message.success('修改成功');
        } else {
            Message.success('添加成功');
        }
        setConfirmLoading(false);
        // 修改：pid发生变化： 锚点pid ， pid不发生变化：Tab0
        // 新增：无pid, 锚点id； 有pid，Tab
        closeWithSuccess(true, updatedGroup)//相当于点击取消/关闭按钮
        return true;
    }

    const onOk = async () => {
        form.validate().then((res) => {
            setConfirmLoading(true);
            //截取字符串
            let name = res.name;
            if (name.length > 20) {
                res.name = name.substring(0, 20);;
            }
            // res.gid = res.group[res.group.length - 1];//取数组的最后一个为分组id
            // res.sort = sort;
            // if (res.pid && res.pid !== null) res.pid = res.pid[0];
            if (res.pId && res.pId.length > 0) res.pId = res.pId[0];
            console.log('group', res)
            processSaveSubGroup(res);
        });
    }

    //点击取消==>关闭窗口
    const cancel = () => {
        // onCancelAdd(false)
        closeWithSuccess(false)
    };

    useEffect(() => {
        console.log('form selectGroup', selectGroup)
        form.setFields({
            pId: {
                value: selectGroup ? selectGroup : null
            },
            id: {
                value: group ? group.id : null
            },
            name: {
                // value: group.name
                value: group ? group.name : ''
                // value: '分组s'
            },
            hide: {
                value: group ? group.hide : false
            },
            pageId: {
                // value: group ? group.pageId : pageId
                value: pageId
            }
        });
        selectGroup && setOptionValues(selectGroup);
    }, []);

    useEffect(() => {
        if (group) {
            form.setFields({
                pId: {
                    value: group.pId
                },
                name: {
                    value: group.name
                },
                id: {
                    value: group.id
                }
            });
        }
    }, [group]);

    const [form] = Form.useForm();
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
                title={group ? t['cardList.edit.website.group'] : t['cardList.add.website.group']}
                visible={visible}
                // visible={isVisible}
                // visible={true}
                // onOk={() => setVisible(false)}
                onOk={onOk}
                // onCancel={() => setVisible(false)}
                onCancel={cancel}
                autoFocus={false}
                mountOnEnter={false}
                onMouseOver={() => {
                    disabled && setDisabled(false);
                }}
                onMouseOut={() => {
                    !disabled && setDisabled(true);
                }}
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

                    {/* {(noPid == null || !noPid) && */}

                    <FormItem
                        label='上级'
                        field='pId'
                        rules={[
                            {
                                type: 'array',
                                required: false,
                                // required: require,
                            }
                        ]}
                    >

                        <Cascader
                            placeholder='请选择分组...'
                            options={cascaderOptions}
                            showSearch
                            // mode='multiple'
                            changeOnSelect  //选择即改变
                            allowClear
                            value={optionValues}
                            onChange={(value, options) => {
                                setOptionValues(value)
                            }}
                            filterOption={(input, node) => {
                                return node.value.indexOf(input) > -1 || node.label.indexOf(input) > -1;
                            }}
                            fieldNames={{
                                // children: 'child',
                                label: 'name',
                                value: 'id',
                            }}
                        />
                    </FormItem>

                    <FormItem label='名称' field='name' rules={[{ required: true }]}>
                        <Input
                            placeholder='请输入分组名称'
                            onFocus={handleFocus}
                            allowClear={true}
                            maxLength={20}
                            showWordLimit
                        />
                    </FormItem>

                    {/*    {(noPid != null && noPid) && <FormItem label='排序' field='sort' rules={[{ required: false }]}>
                        <Input
                            type='number'
                            min={1}
                            max={22}
                            placeholder='请输入序号，数字越小越靠前'
                            onFocus={handleFocus}
                            allowClear={true}
                        />
                    </FormItem>} */}

                    {/* 隐藏项 :id*/}
                    <FormItem label='id' field='id' hidden rules={[{ required: false }]}>
                        <Input
                            allowClear={true}
                        />
                    </FormItem>

                    {/* 隐藏项 :pageId*/}
                    <FormItem label='pageId' field='pageId' hidden rules={[{ required: true }]}>
                        <Input />
                    </FormItem>

                    <FormItem
                        label='隐藏'
                        field='hide'
                        initialValue={false}
                        triggerPropName='checked'
                    >
                        <Switch
                            defaultChecked={false}
                            checked={false} />
                    </FormItem>
                </Form>
            </Modal>
        </div >
    );
}

export default App;