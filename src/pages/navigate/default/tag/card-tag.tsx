import './bootstrap.min.css'
import './index.css'
import React, { useEffect, useState } from 'react';
import {
    IconMore, IconHeart
} from '@arco-design/web-react/icon';
import { Tooltip, Dropdown, Menu, Popover } from '@arco-design/web-react';
import { WebTag } from '../interface';
import { useDispatch } from 'react-redux'
import { fetchBookmarksPageData } from '@/store/modules/global';
// import useLocale from '@/utils/useLocale';
// import EditTagForm from '../form/tag-form';

const api = import.meta.env.VITE_REACT_APP_BASE_API;

interface CardBlockType {
    // card: QualityInspection & BasicCard;
    tag: WebTag;
    no: number;
    loading?: boolean;
    // parentHide?: boolean;
    // selectGroup: Array<string>;
    selectGroup: string;
    searching: boolean;
    editTag: Function;
    // onDeleteSuccess?: (WebTag) => void;
    // tag={item} parentHide={parentHide} 
}

const App = (props: CardBlockType) => {
    const { tag, no, searching, editTag, selectGroup } = props

    const [visible, setVisible] = useState(false);
    //配置编辑表单展示与否
    const [editVisible, setEditVisible] = useState(false);
    const [status, setStatus] = useState(tag.status);
    const [loading, setLoading] = useState(props.loading);
    const dispatch = useDispatch();
    function openUrl(url: string) {
        window.open(url, '_blank');
    }

    const onClickMenuItem = (key: string) => {
        if (key === '0') {//收藏
            // console.log('点击了菜单,编辑', key, searching)
            editTag(tag, selectGroup, searching);
        } else if (key === '1') {//删除
            //弹出确认框
            // console.log('点击了菜单,删除', key)
            // confirm(tag);
            // removeConfirm(tag.id, tag.name, '', '标签', handleDelete);
        }
    }


    /*  const deleteTagPromise = async (id: number) => {
         return await new Promise((resolve, reject) => {
             const success = removeTag(id)
             if (success) {
                 // Message.success('删除成功!');
                 getGroupData();
                 resolve('删除成功');//调用结果=字符串'删除成功'
             } else {
                 // Message.error('删除失败!');
                 reject(new Error('删除失败'));//调用结果=字符串'删除失败'
             }
         }).catch((e) => {
             Message.error({
                 content: 'Error occurs!',
             });
             throw e;
         });;
     } */

    // 提交表单数据
    /* const removeTag = async (id: number): Promise<boolean> => {
        try {
            const response = await removeWebTag(id);
            if (response.code === 200) {
                console.log('response', response);
                // 设置表单数据，这里省略了...
                return true;
                // return response.data; // 直接返回整个响应对象
            } else {
                return false;
                // 处理错误情况
                // throw new Error('请求失败');
            }
        } catch (error) {
            // 处理异常
            console.error('请求错误:', error);
            throw error;
        }
    }; */


    //提交成功后关闭或取消关闭Modal窗口
    function closeModal(success: boolean) {
        // console.log('close Modal', success)
        setEditVisible(false)
        if (success) {//刷新数据
            getGroupData();
        }
        // handleModalToggle();
    }

    // 确认删除模态框
    /* function confirm(tag: WebTag) {
        Modal.confirm({
            // TODO: 用t local改一下？',
            title: '删除确认',
            content: removeContentTips(tag.name),
            // 'Are you sure you want to delete the 3 selected items? Once you press the delete button, the items will be deleted immediately. You can’t undo this action.',
            // `确定删除标签"${tag.name}"吗？`,
            okButtonProps: {
                status: 'danger',
            },
            onOk: (e) => deleteTagPromise(tag.id)
        });
    } */


    /*  const removeContentTips = (name: string) => {
         // return `确定删除标签"${tag.name}"吗？`
         return <p>确定删除标签 "<span style={{ color: '#F53F3F' }}>{name}</span>" 吗？</p>
     }
  */
    const getGroupData = async () => {
        const data: any = await dispatch(fetchBookmarksPageData(no));
    }

    const [imgSrc, setImgSrc] = useState(tag.icon);
    const [triedProxy, setTriedProxy] = useState(false);

    // 当 tag.icon prop 发生变化时，同步更新内部的 imgSrc 状态
    useEffect(() => {
        setImgSrc(tag.icon);
        setTriedProxy(false); // 重置代理尝试状态
    }, [tag.icon]);

    // 当图片加载失败时自动回退到代理 API
    const handleImgError = () => {
        if (!triedProxy) {
            //fetch-icon
            // setImgSrc(`https://bookmarks-1nqv.vercel.app/api/fetch-icon?url=${encodeURIComponent(tag.icon)}`);
            setImgSrc(`/api/fetch-icon?url=${encodeURIComponent(tag.icon)}`);
            setTriedProxy(true);
        } else {
            // 兜底：显示默认图标
            setImgSrc("/default-favicon.png");
        }
    };

    return (
        <>
            <div className="xe-widget xe-conversations box2 label-info"
                // <div className="xe-widget box2"
                // style={{ backgroundColor: tag.hide || parentHide ? '#E8F3FF' : 'transparent' }}
                style={{ backgroundColor: tag.hide ? '#E8F3FF' : 'transparent' }}
                // onClick={() => openUrl(tag.url)}
                // 'var(--color-fill-3)'
                data-toggle="tooltip" data-placement="bottom" title="">
                <div className="xe-comment-entry">

                    <a className="xe-user-img" href={tag.url} target="_blank" >
                        {/* <img src={tag.icon && tag.icon.startsWith('/profile/icon/') ? `${api}${tag.icon}` : tag.icon} */}
                        {/*  <img src={tag.icon}
                            className="lozad img-circle"
                            width="40">
                        </img> */}
                        {/* <span className="date">{tag.date ? tag.date : ''}</span> */}
                        <img
                            src={imgSrc}
                            referrerPolicy="no-referrer"
                            onError={handleImgError}
                            className="lozad img-circle rounded-full object-cover"
                            width="40"
                        />
                    </a>


                    <div className="xe-comment">
                        <div style={{ paddingRight: "17px" }}>
                            <a href={tag.url} target='_blank'>
                                <strong className="overflowClip_2" >{tag.name}</strong>
                            </a>
                        </div>

                        {/*   <Popover
                            content={tag.date ? tag.date : ''}
                            title={
                                tag.name
                            }
                        >
                            <div style={{ paddingRight: "17px" }}>
                                <a href={tag.url} target='_blank'>
                                    <strong className="overflowClip_2" >{tag.name}</strong>
                                </a>
                            </div>
                        </Popover> */}
                        {/* target="_blank" */}
                        <Tooltip position='bottom' trigger='hover' content={tag.description}>
                            <p className="overflowClip_2">{tag.description}
                            </p>
                        </Tooltip>

                    </div>
                </div>



                <Dropdown
                    droplist={
                        <Menu
                            onClickMenuItem={onClickMenuItem}
                        >
                            {['收藏'].map((item, key) => (
                                <Menu.Item key={key.toString()} >{item}</Menu.Item>
                            ))}

                        </Menu>
                    }
                    trigger="hover"
                    onVisibleChange={setVisible}
                    popupVisible={visible}
                >
                    <div className="more">
                        {/* <IconHeart style={{ color: 'red' }} /> */}
                        <IconHeart />
                    </div>

                </Dropdown>

            </div>

        </>
    );
};

export default App;
