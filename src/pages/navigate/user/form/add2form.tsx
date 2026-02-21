import React from 'react';
import Draggable from 'react-draggable';
import { useState, useEffect } from 'react';
import { Modal, Upload, Input, Cascader, Radio, Switch, Form, Select, Message } from '@arco-design/web-react';
import useLocale from '@/utils/useLocale';
import locale from '../locale';
import { getUrlInfo, saveWebTag, saveTagGroup } from '@/api/navigate';
import isUrl from 'is-url';
import { useSelector } from 'react-redux';
import { WebTag } from '../interface';
import { GroupNode } from '@/store/modules/global';
import { saveGroup } from '@/db/bookmarksPages';
const FormItem = Form.Item;
const TextArea = Input.TextArea;
const api = import.meta.env.VITE_REACT_APP_BASE_API;
interface TagDataParams {
  isVisible: boolean;
  selectGroup: GroupNode;
  // selectGroup: string[];
  // selectGroup: GroupNode;
  pageId: number;
  // batchNo: number;
  closeWithSuccess: Function;
  data?: WebTag;
}

// const regex = /^(?:http(s)?:\/\/)/i;
const regex = /^(?:http(s)?:\/\/)/gi; // 添加全局匹配标志g

function App(props: TagDataParams) {
  const { isVisible, selectGroup, pageId, closeWithSuccess } = props;
  const selectGroupId = selectGroup.id;//选中的分组id数组
  const [disabled, setDisabled] = React.useState(true);
  // const [visible, setVisible] = React.useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const globalState = useSelector((state: any) => state.global);
  const { dataGroups } = globalState;
  // console.log('sssssssssss tag form data', selectGroup, groups)
  const cascaderOptions = dataGroups;

  //要显示的选择分组
  // const [optionValues, setOptionValues] = useState(selectGroup);
  const [optionValues, setOptionValues] = useState(selectGroupId);
  //要显示的选择分组
  const t = useLocale(locale);
  const [url, setUrl] = useState('')

  const [prefix, setPrefix] = useState<string>('https://')

  const processSaveTag = async (tag: WebTag) => {
    // const sucess = await submitTagData(tag)
    const saveData = await submitTagData(tag)
    Message.success('Success !');
    setConfirmLoading(false);
    closeWithSuccess(true, saveData)//相当于点击取消/关闭按钮
  }

  const onOk = async () => {

    if (type == 1) {
      tagForm.validate().then((res) => {
        setConfirmLoading(true);
        res.icon = res.icon.url;

        //截取字符串
        let name = res.name;
        if (name.length > 75) {
          res.name = name.substring(0, 75);;
        }
        let description = res.description;
        if (description.length > 200) {
          res.description = description.substring(0, 75);;
        }
        res.gid = res.group;//取数组的最后一个为分组id
        res.url = url;

        processSaveTag(res);

        /* setTimeout(() => {
            Message.success('Success !');
            setVisible(false);
            setConfirmLoading(false);
        }, 1500); */
      });
    } else if (type == 2) {
      groupForm.validate().then((res) => {
        setConfirmLoading(true);
        //截取字符串
        let name = res.name;
        if (name.length > 20) {
          res.name = name.substring(0, 20);
        }

        if (res.pId && res.pId.length > 0 && typeof res.pId !== 'string') {
          res.pId = res.pId[res.pId.length - 1];//取数组的最后一个为分组id
        }
        // console.log('group', res);
        processSaveSubGroup(res);
      })
    }
  }


  const processSaveSubGroup = async (group) => {
    // const data = await submitGroupData(group);
    const data = await saveGroup(group);
    Message.success('添加成功');
    // setConfirmLoading(false);
    closeWithSuccess(true, data)//相当于点击取消/关闭按钮
    // setType(0);
    return true;
  }

  // 提交表单数据
  const submitGroupData = async (group: GroupNode): Promise<any> => {
    try {
      const response = await saveTagGroup(group);
      if (response.code === 200) {
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


  //点击取消==>关闭窗口
  const cancel = () => {
    // onCancelAdd(false)
    closeWithSuccess(false)
  };

  useEffect(() => {
    if (isVisible) {
      let newUrl = '';

      tagForm.setFields({
        // group: {
        gId: {
          value: selectGroupId
        },
        url: {
          value: newUrl
        },
        //清空 标题，描述
        name: {
          value: ''
        },
        description: {
          value: ''
        }
      });

      groupForm.setFields({
        /*  pid: {
           value: selectGroup
         }, */

        pId: {
          value: selectGroupId
        },
        /*  batchNo: {
           value: batchNo
         }, */
        pageId: {
          value: pageId
        }
      });
    }
  }, [isVisible]);


  const [form] = Form.useForm();
  const [tagForm] = Form.useForm();
  const [groupForm] = Form.useForm();

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
    const result = await getUrlInfoFromAPI(url);
    // console.log('result', result);
    // 设置表单数据：标题、图标
    const { title, icon } = result;
    const newUrl = replaceHttp(url);

    tagForm.setFields({
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
      tagForm.setFields({
        name: {
          value: title
        },
        description: {
          value: title
        }
      })
    }
    /**
     *     
    tagForm.setFields({
      name: {
        value: title
      },
      description: {
        value: title
      },
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
     */
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
  const submitTagData = async (tag: WebTag): Promise<any> => {
    try {
      const response = await saveWebTag(tag);
      if (response.code === 200) {
        console.log('response', response);
        // 设置表单数据，这里省略了...
        return response.data;
        // return response.data; // 直接返回整个响应对象
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


  function containsHttp(str: string) {
    return regex.test(str);
  }

  const handleOptionChange = (value) => {
    if (!value) {
      groupForm.setFields({
        pId: { value: null },
      });
    } else {
      setOptionValues(value);
    }
  };



  function replaceHttp(url: string) {
    // return str.replaceAll(regex);
    return url.replace(regex, '');
  }

  const handleFocus = (event) => {
    // console.log('event 聚焦', event)
    setDisabled(true)//禁用拖动
  };

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

  const [type, setType] = useState(0);
  const onTypeChange = (value, event) => {
    if (value === "书签") {
      setType(1)
    } else {
      setType(2)
    }
  }

  return (
    <div>
      <Modal
        style={{ cursor: 'move' }}
        // title='Modal Title'
        // title={data ? t['cardList.edit.website.tag'] : t['cardList.add.website.tag']}
        title={t['cardList.add.bookmark.group']}
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
          labelCol={{
            style: { flexBasis: 75 },
          }}
          wrapperCol={{
            style: { flexBasis: 'calc(100% - 75px)' },
          }}
        >
          <Form.Item field='type' label='类型'>
            <Radio.Group onChange={onTypeChange} options={['书签', '分组']}></Radio.Group>
          </Form.Item>
        </Form>

        {type == 1 &&
          <Form
            {...formItemLayout}
            form={tagForm}
            labelCol={{
              style: { flexBasis: 75 },
            }}
            wrapperCol={{
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
                /* onChange={(value, options) => {
                  // console.log(value, options);
                  setOptionValues(value)
                }} */
                onChange={(value, options) => {
                  // setOptionValues(value)
                  // console.log('optionValues', value);
                  // handleOptionChange(value);
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
              <Input
                placeholder='请输入标题(建议25字以内，不能超过75字)'
                onFocus={handleFocus}
                allowClear={true}

                maxLength={75}
                showWordLimit
              />
            </FormItem>

            {/* 隐藏项 */}
            <FormItem label='id' field='id' hidden rules={[{ required: false }]}>
              <Input
                // onFocus={handleFocus}
                allowClear={true}
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
              <Upload
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
              />
            </Form.Item>

            {/*   <FormItem
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
              {/*  <Input
                            placeholder='请输入描述(可选)'
                            // value={inputValue}
                            // onChange={handleChange} onBlur={handleBlur} onFocus={handleFocus}
                            // style={{ width: 350, margin: 12 }}
                            allowClear={true}
                        /> */}
              {/* <TextArea
                            placeholder='请输入描述(可选)'
                            autoSize={{ minRows: 1, maxRows: 3 }}
                            onFocus={handleFocus}
                            defaultValue=''
                        /> */}

              <TextArea
                placeholder='请输入描述(可选)'
                maxLength={200}
                showWordLimit
                autoSize={{ minRows: 1, maxRows: 6 }}
                defaultValue=''
                onFocus={handleFocus}
              />
            </FormItem>

          </Form>}

        {type == 2 &&
          <Form
            {...formItemLayout}
            form={groupForm}
            labelCol={{
              style: { flexBasis: 75 },
            }}
            wrapperCol={{
              style: { flexBasis: 'calc(100% - 75px)' },
            }}
          >
            <FormItem
              label='上级'
              field='pId'
              rules={[
                {
                  type: 'array',
                  // required: true
                  // required: require,
                }
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
                /*  onChange={(value, options) => {
                   setOptionValues(value)
                 }} */
                onChange={(value, options) => {
                  handleOptionChange(value)
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

            {/* <FormItem label='batchNo' field='batchNo' hidden rules={[{ required: true }]}> */}
            <FormItem label='pageId' field='pageId' hidden rules={[{ required: true }]}>
              <Input
              />
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
        }
      </Modal>
    </div >
  );
}

export default App;
