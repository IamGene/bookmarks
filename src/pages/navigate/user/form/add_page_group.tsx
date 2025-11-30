import React from 'react';
import Draggable from 'react-draggable';
import { useState, useEffect } from 'react';
import { Modal, Upload, Input, Cascader, Radio, Switch, Form, Select, Message } from '@arco-design/web-react';
import useLocale from '@/utils/useLocale';
import locale from '../locale';
import { getUrlInfo, saveWebTag, saveTagGroup } from '@/api/navigate';
import { useSelector } from 'react-redux';
import { WebTag } from '../interface';
import { GroupNode } from '@/store/modules/global';
import { saveGroup, addBookmarksPage } from '@/db/bookmarksPages';
const FormItem = Form.Item;
const TextArea = Input.TextArea;
const api = import.meta.env.VITE_REACT_APP_BASE_API;
interface TagDataParams {
  isVisible: boolean;
  // selectGroup: GroupNode;
  // selectGroup: string[];
  // selectGroup: GroupNode;
  // pageId: number;
  // batchNo: number;
  closeWithSuccess: Function;
  // bookmarkPages: [];
}


function App(props: TagDataParams) {
  const { isVisible, closeWithSuccess } = props;
  const [disabled, setDisabled] = React.useState(true);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const globalState = useSelector((state: any) => state.global);
  const { currentPage, pages } = globalState;
  const cascaderOptions = pages;
  // console.log('sssssssssss tag form data', pages);

  //要显示的选择分组
  const t = useLocale(locale);

  const onOk = async () => {
    createForm.validate().then((res) => {
      setConfirmLoading(true);
      const { type, ...payload } = res;
      //截取字符串
      let name = res.name;
      if (name.length > 20) {
        res.name = name.substring(0, 20);
      }

      if (res.type === "分组") {
        payload.pId = null;
        processSaveSubGroup(payload);
      } else {//书签页
        processSavePage(res.name);
      }
    });
  }

  const processSaveSubGroup = async (group) => {
    // console.log('processSaveSubGroup', group);
    const data = await saveGroup(group);
    Message.success('添加成功');
    // setConfirmLoading(false);
    closeWithSuccess(true, group.pageId ? 1 : 2, data.pageId)//相当于点击取消/关闭按钮
    // closeWithSuccess(true, 2, 0)//相当于点击取消/关闭按钮
    // setType(0);
    return true;
  }

  const processSavePage = async (title) => {
    // console.log('data', title);
    const data = await addBookmarksPage(title);
    Message.success('添加成功');
    // setConfirmLoading(false);
    // console.log('data', data);
    closeWithSuccess(true, 1, data.pageId)//相当于点击取消/关闭按钮
    // setType(0);
    return true;
  }

  //点击取消==>关闭窗口
  const cancel = () => {
    closeWithSuccess(false);
  };

  /*  useEffect(() => {
     createForm.setFields({
       name: {
         value: ''
       },
       pageId: {
         value: pageId ? pageId : null
       }
     });
   }, [isVisible, pageId]); */

  useEffect(() => {
    createForm.setFields({
      /*  pId: {
         value: selectGroupId
       }, */
      name: {
        value: ''
      },
      pageId: {
        value: currentPage ? currentPage.pageId : null
      }
    });
  }, [isVisible, currentPage]);


  const [form] = Form.useForm();
  const [createForm] = Form.useForm();

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


  const handleOptionChange = (value) => {
    createForm.setFields({
      pageId: { value: value ? value[0] : null },
    });
  };

  const handleFocus = (event) => {
    // console.log('event 聚焦', event)
    setDisabled(true)//禁用拖动
  };


  // 默认展示为“分组”
  const [type, setType] = useState(2);
  const onTypeChange = (value, event) => {
    if (value === "书签页") {
      setType(1);
    } else {
      setType(2);
      // console.log('分组');
    }
  }

  return (
    <div>
      <Modal
        style={{ cursor: 'move' }}
        // title={t['cardList.add.bookmark.group']}
        title={t['cardList.add.page.group']}
        visible={isVisible}
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
          form={createForm}
          labelCol={{
            style: { flexBasis: 75 },
          }}
          wrapperCol={{
            style: { flexBasis: 'calc(100% - 75px)' },
          }}
        >
          {/*  */}
          <Form.Item field='type' label='类型' initialValue={type == 2 ? '分组' : '书签页'}>
            <Radio.Group onChange={onTypeChange} options={['分组', '书签页']}></Radio.Group>
          </Form.Item>

          <FormItem label='名称' field='name' rules={[{ required: true }]}>
            <Input
              placeholder='请输入名称'
              onFocus={handleFocus}
              allowClear={true}
              maxLength={20}
              showWordLimit
            />
          </FormItem>

          {type == 2 && pages.length > 0 && <FormItem
            label='书签页'
            // field='group'
            field='pageId'
            rules={[
              {
                type: 'number',
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
              value={currentPage ? currentPage.pageId : null}
              /* onChange={(value, options) => {
                // console.log(value, options);
                setOptionValues(value)
              }} */
              onChange={(value, options) => {
                // setOptionValues(value)
                // console.log('optionValues', value);
                handleOptionChange(value);
              }}

              fieldNames={{
                // children: 'child',
                label: 'title',
                value: 'pageId',
              }}
            />
          </FormItem>
          }


          {/* <FormItem label='pageId' field='pageId' hidden rules={[{ required: false }]}>
            <Input
            />
          </FormItem> */}

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
        </Form>
      </Modal>
    </div >
  );
}

export default App;
