import React from 'react';
import Draggable from 'react-draggable';
import { useState, useEffect, useRef } from 'react';
import { FormInstance } from '@arco-design/web-react/es/Form';
// import { Modal, Upload, Input, Cascader, Switch, Form, Select, Message } from '@arco-design/web-react';
import { Modal, Upload, Input, Cascader, Switch, Form, Select, Message } from '@arco-design/web-react';
import useLocale from '@/utils/useLocale';
import locale from '../locale';
import { getUrlInfo, saveWebTag } from '@/api/navigate';
import { updateBookmarkById, addNewBookmark } from '@/db/bookmarksPages';
import isUrl from 'is-url';
import { useSelector } from 'react-redux';
import { WebTag } from '../interface';
const FormItem = Form.Item;
const TextArea = Input.TextArea;

const api = import.meta.env.VITE_REACT_APP_BASE_API;
interface TagDataParams {
    isVisible: boolean;
    selectGroup: number[];
    closeWithSuccess: Function;
    data?: WebTag;
}

// const regex = /^(?:http(s)?:\/\/)/i;
const regex = /^(?:http(s)?:\/\/)/gi; // 添加全局匹配标志g

function App(props: TagDataParams) {
    const { isVisible, selectGroup, data, closeWithSuccess } = props;

    const [disabled, setDisabled] = React.useState(true);
    // const [visible, setVisible] = React.useState(false);
    // const [confirmLoading, setConfirmLoading] = useState(false);
    // const formRef = useRef<FormInstance>();

    const globalState = useSelector((state: any) => state.global);
    const { dataGroups, tagsMap } = globalState;
    const cascaderOptions = dataGroups;
    const keys = tagsMap && Object.keys(tagsMap) || [];
    // console.log('44444444 tag form data', data);
    // console.log('44444444 tag form cascaderOptions', cascaderOptions);
    // console.log('44444444 tag form selectGroup', selectGroup);
    //要显示的已选择分组
    const [optionValues, setOptionValues] = useState(selectGroup);

    const t = useLocale(locale);
    const [url, setUrl] = useState('')

    const [prefix, setPrefix] = useState<string>('https://')

    const processAddSaveTag = async (tag: WebTag) => {
        // console.log('form data', tag);
        const newTag = await addBookmark(tag);
        Message.success('Success !');
        // setConfirmLoading(false);
        closeWithSuccess(true, newTag, data, 2);//相当于点击取消/关闭按钮 true:新增；false:更新
    }

    const processUpdateSaveTag = async (tag: WebTag) => {
        // const group = await submitTagData(tag)
        const newTag = await updateBookmark(tag);
        // const group = await saveTagData(tag)
        Message.success('Success !');
        // setConfirmLoading(false);
        // console.log('processUpdateSaveTag', tag);
        // setVisible(false);
        if (newTag) {
            if (data.gId !== newTag.gId) {
                closeWithSuccess(true, newTag, data, 0);
            } else {
                closeWithSuccess(true, newTag, data, 1);
            }
        }
        //相当于点击取消/关闭按钮
    }


    const onOk = async () => {
        form.validate().then((res) => {
            // setConfirmLoading(true);
            res.icon = res.icon.url;

            //截取字符串
            let name = res.name;
            if (name.length > 75) {
                res.name = name.substring(0, 75);;
            }

            let description = res.description;
            if (description.length > 200) {
                res.description = description.substring(0, 200);;
            }
            // res.gId = res.group[res.group.length - 1];//取数组的最后一个为分组id
            res.gId = res.gId[res.gId.length - 1];//取数组的最后一个为分组id
            // res.sort = sort;
            // res.group = null;
            res.url = url;
            // res.pageId = selectGroup.pageId;
            // res.icon = "data:image/png;base64,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"
            if (res.id) {
                processUpdateSaveTag(res);
                return;
            } else {
                processAddSaveTag(res);
                return;
            }
            /* setTimeout(() => {
                Message.success('Success !');
                setVisible(false);
                setConfirmLoading(false);
            }, 1500); */
        });
    }

    //点击取消==>关闭窗口
    const cancel = () => {
        // onCancelAdd(false)
        closeWithSuccess(false);
    };

    useEffect(() => {
        if (isVisible) {
            let newUrl = '';
            let iconUrl = '';
            if (data) {
                const { id, name, hide, icon, description, url } = data;

                iconUrl = icon && icon.startsWith('/profile/icon/') ? `${api}${icon}` : icon;

                setUrl(url);//保存完整的url
                newUrl = url;
                if (url !== null && url !== undefined && url !== '') {
                    newUrl = url.replace(regex, '');//去掉http(s)://

                    if (url.slice(0, 8) === 'https://') {
                        setPrefix('https://')
                    } else if (url.slice(0, 7) === 'http://') {
                        setPrefix('http://')
                    }
                }
            }


            form.setFields({
                // group: {
                gId: {
                    value: selectGroup
                },
                id: {
                    value: data ? data.id : null
                },
                pageId: {
                    value: data ? data.pageId : null
                },
                name: {
                    // value: data ? data.name : ''
                    value: data ? (data.originalName ? data.originalName : data.name) : ''
                },
                tags: {
                    value: data ? data.tags : []
                },
                description: {
                    value: data ? (data.originalDescription ? data.originalDescription : data.description) : ''
                },
                hide: {
                    value: data ? data.hide : false
                },
                icon: {
                    value: data ? {
                        uid: '-1',
                        url: iconUrl,
                        name: '20240731',
                    } : []
                },
                url: {
                    value: newUrl
                }
            });
        }
    }, [isVisible]);


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
        if (url && url.trim()) {
            if (isUrl(url)) {
                if (url.slice(0, 8) === 'https://') {
                    setPrefix('https://')
                } else if (url.slice(0, 7) === 'http://') {
                    setPrefix('http://')
                }
                setUrlInfo2Form(url);
            } else {
                // console.log('失焦判断', url + '不是网址')
            }
        }
    };

    //将url解析的图标、标题设置到表单
    const setUrlInfo2Form = async (url: string) => {
        // 这里直接得到解析后的响应对象
        // console.log('setUrlInfo2Form url', url)
        const result = await getUrlInfoFromAPI(url);
        // console.log('result', result);
        // 设置表单数据：标题、图标
        const { title, icon } = result;
        const newUrl = replaceHttp(url);

        form.setFields({
            icon: {
                value: {
                    uid: '-1',
                    url: icon,
                    name: '20240731',
                }
            },
            url: {
                value: newUrl
            }
        });

        if (title !== '') {
            form.setFields({
                name: {
                    value: title
                },
                description: {
                    value: title
                }
            })
        }
    }

    const getUrlInfoFromAPI = async (url: String): Promise<any> => {
        try {
            const response = await getUrlInfo({ url });
            if (response.code === 200) {
                // console.log('response', response);
                // 设置表单数据，这里省略了...
                return response.data; // 直接返回整个响应对象
            } else {
                // 处理错误情况
                // throw new Error('请求失败');
            }
        } catch (error) {
            // 处理异常
            console.error('请求错误:', error);
            throw error;
        }
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


    function containsHttp(str: string) {
        return regex.test(str);
    }


    function onImgChange(fileList, file) {
        if (file.originFile) {
            const reader = new FileReader();
            reader.readAsDataURL(file.originFile);
            reader.onload = () => {
                const base64 = reader.result as string;
                console.log('Image converted to base64.', base64);
                // Update the form field with the new file object containing the base64 URL
                /* form.setFieldsValue({
                    icon: [{ ...file, url: base64 }],
                }); */

                form.setFields({
                    icon: {
                        value: {
                            uid: '-1',
                            url: base64,
                            name: '20250731',
                        }
                    }
                });
            };
            reader.onerror = (error) => {
                Message.error('Failed to convert image to base64.');
            };
        }
    }

    function replaceHttp(url: string) {
        // return str.replaceAll(regex);
        return url.replace(regex, '');
    }

    const handleFocus = (event) => {
        // console.log('event 聚焦', event)
        setDisabled(true)//禁用拖动
    };

    // 在这里获取并使用最新的 url 值
    /*   useEffect(() => {
          console.log('>>>>>>>>>>>>最新的 urlInfo 值：', urlInfo);
      }, [urlInfo]);
   */
    const handleChange = (event) => {
        if (event && event.trim()) {
            // console.log('当前url', event)
            if (!containsHttp(event)) {
                setUrl('https://' + event)
            } else {
                setUrl(event)
            }
        } else {
            setUrl('')
        }
    };

    return (
        <div>
            <Modal
                style={{ cursor: 'move' }}
                // title='Modal Title'
                title={data ? t['cardList.edit.website.tag'] : t['cardList.add.website.tag']}
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

                    <FormItem label='网址' field='url' rules={[{ required: true }]}>
                        {/* <Input placeholder='请输入网址url' value={inputValue} onChange={handleChange} onBlur={handleBlur} /> */}
                        <Input
                            placeholder='请输入网址url'
                            onChange={handleChange} onBlur={handleBlur}
                            onFocus={handleFocus}
                            addBefore={
                                <Select value={prefix} size={'default'} placeholder='Select protocol' style={{ width: 90 }}>
                                    <Select.Option value='http://'>http://</Select.Option>
                                    <Select.Option value='https://'>https://</Select.Option>
                                </Select>
                            }
                            allowClear={true}
                        />
                    </FormItem>
                    <FormItem label='标题' field='name' rules={[{ required: true }]}>
                        {/*   <Input
                            placeholder='请输入标题(建议25字以内，不能超过75字)'
                            onFocus={handleFocus}
                            allowClear={true}

                            maxLength={75}
                            showWordLimit
                        /> */}

                        <TextArea
                            placeholder='请输入标题(建议25字以内，不能超过75字)'
                            maxLength={75}
                            showWordLimit
                            autoSize={{ minRows: 1, maxRows: 2 }}
                            defaultValue=''
                            onFocus={handleFocus}
                        />
                    </FormItem>

                    <FormItem
                        label='标签'
                        required={false}
                        field='tags'
                        rules={[{ type: 'array', minLength: 0 }]}
                    >
                        <Select
                            mode='multiple'
                            allowCreate
                            placeholder='请选择或输入标签'
                            options={keys}
                        // options={[]}
                        />
                    </FormItem>

                    {/* 隐藏项 */}
                    <FormItem label='id' field='id' hidden rules={[{ required: false }]}>
                        <Input
                            // onFocus={handleFocus}
                            allowClear={true}
                        />
                    </FormItem>


                    <FormItem label='pageId' field='pageId' hidden rules={[{ required: false }]}>
                        <Input
                            // onFocus={handleFocus}
                            allowClear={false}
                        />
                    </FormItem>
                    <Form.Item
                        label='图标'
                        field='icon'
                        triggerPropName='fileList'
                    /*  initialValue={[
                         {
                             uid: '-1',
                             url: '//p1-arco.byteimg.com/tos-cn-i-uwbnlip3yd/e278888093bef8910e829486fb45dd69.png~tplv-uwbnlip3yd-webp.webp',
                             name: '20200717',
                         },
                     ]} */
                    >
                        {/*  <Upload
                            listType='picture-card'
                            name='files'
                            action='/'
                            multiple={false}
                            limit={1}
                            onPreview={(file) => {
                                Modal.info({
                                    title: 'Preview',
                                    content: (
                                        <img
                                            src={file.url || URL.createObjectURL(file.originFile)}
                                            style={{
                                                maxWidth: '100%',
                                            }}
                                        ></img>
                                    ),
                                });
                            }}
                        /> */}

                        <Upload
                            imagePreview
                            limit={1}
                            name='icon'
                            multiple={false}
                            /* defaultFileList={[
                                {
                                    uid: '-2',
                                    name: '20200717-103937.png',
                                    url: '//p1-arco.byteimg.com/tos-cn-i-uwbnlip3yd/a8c8cdb109cb051163646151a4a5083b.png~tplv-uwbnlip3yd-webp.webp',
                                },
                                {
                                    uid: '-1',
                                    name: 'hahhahahahaha.png',
                                    url: '//p1-arco.byteimg.com/tos-cn-i-uwbnlip3yd/e278888093bef8910e829486fb45dd69.png~tplv-uwbnlip3yd-webp.webp',
                                },
                            ]} */
                            // action='/'
                            customRequest={(option) => {
                                // This function overrides the default upload behavior.
                                // We call onSuccess to mark the upload as "successful" without sending any data.
                                option.onSuccess(null);
                            }}
                            listType='picture-card'
                            onChange={onImgChange}
                            onPreview={(file) => {
                                Message.info('click preview icon')
                            }}
                        />
                    </Form.Item>

                    {/*  <FormItem
                        label='隐藏'
                        field='hide'
                        initialValue={false}
                        triggerPropName='checked'
                    >
                        <Switch
                            defaultChecked={false}
                            checked={false} />
                    </FormItem> */}

                    <FormItem label='描述' field='description' >
                        <TextArea
                            placeholder='请输入描述(可选)'
                            maxLength={200}
                            showWordLimit
                            autoSize={{ minRows: 1, maxRows: 6 }}
                            defaultValue=''
                            onFocus={handleFocus}
                        />
                    </FormItem>
                </Form>
            </Modal>
        </div >
    );
}

export default App;
