import React from 'react';
import Draggable from 'react-draggable';
import { useState, useEffect, useRef } from 'react';
import { FormInstance } from '@arco-design/web-react/es/Form';
// import { Modal, Upload, Input, Cascader, Switch, Form, Select, Message } from '@arco-design/web-react';
import {
    Modal, Input, Typography, Cascader, List, Form, Message
} from '@arco-design/web-react';
import { IconDelete, IconDown } from '@arco-design/web-react/icon';
import useLocale from '@/utils/useLocale';
import locale from '../locale';
import { } from '@/api/navigate';
import { updateBookmarkById, addNewBookmark, moveBookmarks } from '@/db/BookmarksPages';
import { useSelector } from 'react-redux';
import { WebTag } from '../interface';
//注意顺序在前以免样式被覆盖 add

const FormItem = Form.Item;

interface TagDataParams {
    isVisible: boolean;
    selectGroup: string[];
    closeWithSuccess: Function;
    data: WebTag[];
}


function App(props: TagDataParams) {
    const { isVisible, selectGroup, data, closeWithSuccess } = props;

    const [disabled, setDisabled] = React.useState(true);
    // const [visible, setVisible] = React.useState(false);

    const globalState = useSelector((state: any) => state.global);
    const { dataGroups } = globalState;
    const cascaderOptions = dataGroups;
    //要显示的已选择分组
    const [optionValues, setOptionValues] = useState(selectGroup);

    const t = useLocale(locale);

    // 使用 state 存储列表数据，确保初始为数组
    const [dataSource, setDataSource] = useState<WebTag[]>(data || []);
    const removeBookmark = (item: WebTag) => {
        setDataSource(prevData => prevData.filter(bookmark => bookmark.id !== item.id));
    }

    const render = (item, index) => {
        const actions = [
            // <Button key="delete" onClick={() => removeBookmark(item)} icon={<IconDelete />}>删除</Button>
            <IconDelete onClick={() => removeBookmark(item)} />
        ];

        return (
            <List.Item key={index} actions={actions}>
                <List.Item.Meta
                    avatar={<img
                        src={item.icon}
                        referrerPolicy="no-referrer"
                        width="40"
                    />}
                    title={
                        <div title={item.name}>
                            <Typography.Paragraph
                                ellipsis={
                                    {
                                        // showTooltip: true,
                                        rows: 1,
                                        expandable: false,
                                        suffix: '',
                                        ellipsisStr: '...',
                                    }
                                }
                            >
                                {item.name}
                            </Typography.Paragraph>
                        </div>
                    }
                    description={
                        <div title={item.description}>
                            <Typography.Paragraph
                                ellipsis={
                                    {
                                        // showTooltip: true,
                                        rows: 1,
                                        expandable: false,
                                        suffix: '',
                                        ellipsisStr: '...',
                                    }
                                }
                            >
                                {item.description}
                            </Typography.Paragraph>
                        </div>
                    }
                />
            </List.Item>
        );
    };



    const processMoveBookmarks = async (bookmarks: WebTag[], gId: string) => {
        // console.log('form data', tag);
        const res = await moveBookmarks(bookmarks, gId);
        if (res) {
            Message.success(t['modal.message.move.bookmarks.success']);
            closeWithSuccess(true, res.group);
        }
    }

    const onOk = async () => {
        form.validate().then((res) => {
            // setConfirmLoading(true);
            if (dataSource.length === 0) {
                // Message.error('书签列表为空，请重新选择');
                Message.error(t['modal.message.move.bookmarks.empty']);
                // console.log('00000000000000000 processAddSaveTag res', res);
                return false;
            } else {
                const gId = res.gId[res.gId.length - 1];//取数组的最后一个为分组id
                const bookmarks = dataSource.filter((item) => item.gId != gId); //过滤出分组改变的书签
                // bookmarks 中的 gId 为 string 类型，直接收集并去重
                if (bookmarks.length > 0) {
                    processMoveBookmarks(bookmarks, gId);
                    // closeWithSuccess(true, res, bookmarks, 3); //相当于点击取消/关闭按钮 true:新增；false:更新
                    return true;
                } else {//如果没有书签的分组改变，则直接关闭窗口
                    closeWithSuccess(false, null);
                    return true;
                }
            }
        })
    };


    //点击取消==>关闭窗口
    const cancel = () => {
        // onCancelAdd(false)
        closeWithSuccess(false);
    };

    useEffect(() => {
        if (isVisible) {
            setDataSource(data || []);
            form.setFields({
                // group: {
                gId: {
                    value: selectGroup
                }
                /*   pageId: {
                      value: data ? data.pageId : null
                  },
                  tags: {
                      value: data ? data.tags : []
                  }, */
            });
        }
    }, [isVisible]);

    // 当外部传入的 data 变化时也同步更新本地 dataSource
    useEffect(() => {
        setDataSource(data || []);
    }, [data]);


    const [form] = Form.useForm();
    const formItemLayout = {
        labelCol: {
            span: 4,
        },
        wrapperCol: {
            span: 20,
        },
    };


    // 提交表单数据
    const updateBookmark = async (tag: WebTag): Promise<any> => {
        const newBookmark = await updateBookmarkById(tag);
        return newBookmark;
    }

    const addBookmark = async (tag: WebTag): Promise<any> => {
        const newBookmark = await addNewBookmark(tag);
        return newBookmark;
    }

    const submitTagData = async (tag: WebTag): Promise<any> => {
        try {
            const response = await saveWebTag(tag);
            // const response = await saveWebTag(tag);
            if (response.code === 200) {
                // console.log('response', response);
                // 设置表单数据，这里省略了...
                // return true;
                return response.data; // 直接返回整个响应对象
            } else {
                throw new Error('请求失败');
                return false;
                // 处理错误情况
            }
        } catch (error) {
            // 处理异常
            console.error('请求错误:', error);
            throw error;
        }
    };



    return (
        <div>
            <Modal
                style={{ cursor: 'move' }}
                title={t['cardList.move.bookmarks']}
                // title={'移动书签到'}
                // visible={visible}
                visible={isVisible}
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
                    // {...formItemLayout}
                    form={form}
                    style={{
                        maxWidth: 500,
                        marginTop: 20,
                        paddingRight: 16,
                        height: 400, //原300 这里加减多少  virtualListProps={{ height: 240, }} 也要增减多少
                        overflow: 'auto',
                    }}
                    autoComplete='off'
                    labelCol={{
                        // style: { flexBasis: 90 },
                        style: { flexBasis: 75 },
                    }}
                    wrapperCol={{
                        // style: { flexBasis: 'calc(100% - 90px)' },
                        style: { flexBasis: 'calc(100% - 75px)' },
                    }}
                >

                    <FormItem
                        label='分组'
                        // field='group'
                        field='gId'
                        rules={[
                            {
                                type: 'array',
                                required: true,
                            }
                            /* {
                                type: 'array',
                                length: 4,
                            }, */
                        ]}
                    >

                        <Cascader
                            placeholder='Please select ...'
                            options={cascaderOptions}
                            showSearch
                            // mode='multiple'
                            changeOnSelect  //选择即改变
                            allowClear
                            value={optionValues}
                            onChange={(value, options) => {
                                // console.log(value, options);
                                // setOptionValues(value)
                            }}

                            fieldNames={{
                                // children: 'child',
                                label: 'name',
                                value: 'id',
                            }}
                        />
                    </FormItem>

                    {/* <FormItem label='pageId' field='pageId' hidden rules={[{ required: false }]}>
                        <Input
                            // onFocus={handleFocus}
                            allowClear={false}
                        />
                    </FormItem> */}


                    <List
                        bordered
                        // header={'书签列表(' + dataSource.length + ')'}
                        header={t['cardList.move.bookmarks.list'] + ' (' + dataSource.length + ')'}
                        className='list-demo-actions'
                        // style={{ marginBottom: 48 }}
                        virtualListProps={{
                            height: 290,
                        }}
                        dataSource={dataSource}
                        render={render}
                    />
                </Form>
            </Modal>
        </div >
    );
}

export default App;
