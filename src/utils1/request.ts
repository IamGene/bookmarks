/*
 * @Author: Zhouhai 497675647@qq.com
 * @Date: 2022-09-23 14:24:23
 * @LastEditors: Zhouhai 497675647@qq.com
 * @LastEditTime: 2024-04-16 16:44:40
 */
import axios from 'axios'
import errorCode from './errorCode'
import cache from '@/plugins/cache'
import { saveAs } from 'file-saver'
import { blobValidate, tansParams } from './ruoyi';
import { default as isValidKey } from './common';
import { Modal, Message } from '@arco-design/web-react';
// import { notification, Modal, message } from 'antd';
// import { UserStore } from '@/store1/user.Store';
import { getToken } from './auth';

// 是否显示重新登录
export let isRelogin = { show: false };

axios.defaults.headers.common['Content-Type'] = 'application/json;charset=utf-8'
// 创建axios实例
const service = axios.create({
  // 超时
  timeout: 0
})

// 环境变量：请求前缀
const api = import.meta.env.VITE_REACT_APP_BASE_API;
// request拦截器
service.interceptors.request.use(config => {
  // 是否需要设置 token
  const isToken = (config.headers || {}).isToken === false
  // 是否需要防止数据重复提交
  const isRepeatSubmit = (config.headers || {}).repeatSubmit === false
  if (getToken() && !isToken && config.headers) {
    config.headers['Authorization'] = 'Bearer ' + getToken() // 让每个请求携带自定义token 请根据实际情况自行修改
  }
  // config.url = (process.env.REACT_APP_BASE_API || '/api') + config.url;
  // config.url = "/dev-api" + config.url;
  // config.url = `${api}` + config.url;

  // config.url = `${api}` + config.url;
  // 只保留相对路径，不加任何前缀
  config.url = config.url;
  // get请求映射params参数
  if (config.method === 'get' && config.params) {
    let url = config.url + '?' + tansParams(config.params);
    url = url.slice(0, -1);
    config.params = {};
    config.url = url;
  }
  if (!isRepeatSubmit && (config.method === 'post' || config.method === 'put')) {
    const requestObj = {
      url: config.url,
      data: typeof config.data === 'object' ? JSON.stringify(config.data) : config.data,
      time: new Date().getTime()
    }
    const sessionObj = cache.session.getJSON('sessionObj')
    if (sessionObj === undefined || sessionObj === null || sessionObj === '') {
      cache.session.setJSON('sessionObj', requestObj)
    } else {
      const s_url = sessionObj.url;                  // 请求地址
      const s_data = sessionObj.data;                // 请求数据
      const s_time = sessionObj.time;                // 请求时间
      const interval = 1000;                         // 间隔时间(ms)，小于此时间视为重复提交
      if (s_data === requestObj.data && requestObj.time - s_time < interval && s_url === requestObj.url) {
        const message = '数据正在处理，请勿重复提交';
        console.warn(`[${s_url}]: ` + message)
        return Promise.reject(new Error(message))
      } else {
        cache.session.setJSON('sessionObj', requestObj)
      }
    }
  }
  return config
}, error => {
  console.log(error)
  Promise.reject(error)
})

// 响应拦截器
service.interceptors.response.use(res => {
  // 未设置状态码则默认成功状态
  const code = res.data.code || 200;
  let msg = errorCode['default']
  if (isValidKey(code, errorCode)) {
    msg = errorCode[code] || res.data.msg;
  }
  // 二进制数据则直接返回
  if (res.request.responseType === 'blob' || res.request.responseType === 'arraybuffer') {
    return res.data
  }
  if (code === 401) {
    if (!isRelogin.show) {
      isRelogin.show = true;//展示重新登陆
      /*  Modal.confirm({
         okText: '重新登录',
         cancelText: '取消',
         title: '系统提示',
         content: '登录状态已过期，您可以继续留在该页面，或者重新登录',
         type: 'warning',
         onOk: () => {
           // TODO 需要做一些登出的处理，跳转到登录界面
           new UserStore().LogOut()
           //  eslint-disable-next-line no-restricted-globals
           location.href = '/login'
         }
       }
       ) */
    }
    // console.log('code === 401')
    return Promise.reject('无效的会话，或者会话已过期，请重新登录。')
  } else if (code === 500) {
    /*  notification['error']({
       message: '请求失败：',
       description: res.data.msg,
     }); */
    return Promise.reject(new Error(msg))
  } else if (code !== 200) {
    /*  notification['error']({
       message: '请求失败：',
       description: msg,
     }); */
    return Promise.reject('error')
  } else {
    return res.data
  }
},
  error => {
    console.log('err' + error)
    let { message } = error;
    if (message === "Network Error") {
      message = "后端接口连接异常";
    }
    else if (message.includes("timeout")) {
      message = "系统接口请求超时";
    }
    else if (message.includes("Request failed with status code")) {
      message = "系统接口" + message.substr(message.length - 3) + "异常";
    }
    /*  notification['error']({
       message: '请求失败：',
       description: message,
     }); */
    return Promise.reject(error)
  }
)

// 通用下载方法
export const download = (url: string, params: any, filename: string | undefined) => {

  return service.post(url, params, {
    transformRequest: [(params) => { return tansParams(params) }],
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    responseType: 'blob'
  }).then(async (data: any) => {
    const isLogin = await blobValidate(data);
    if (isLogin) {
      const blob = new Blob([data as unknown as BlobPart])
      saveAs(blob, filename)
    } else {
      const resText = await data.text();
      const rspObj = JSON.parse(resText);
      const errMsg = errorCode[rspObj.code as keyof typeof errorCode] || rspObj.msg || errorCode['default']
      // message.error(errMsg);
    }
  }).catch((r) => {
    console.error(r)
    // message.error('下载文件出现错误，请联系管理员！')
  }).finally(() => {
  })
}

export default service
