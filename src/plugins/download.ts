/*
 * @Author: Zhouhai 497675647@qq.com
 * @Date: 2022-11-10 14:51:19
 * @LastEditors: Zhouhai 497675647@qq.com
 * @LastEditTime: 2022-11-10 14:55:18
 */
/* eslint-disable import/no-anonymous-default-export */
import axios from 'axios'
import { FileSaverOptions, saveAs } from 'file-saver'
import { getToken } from '@/utils/auth'
import errorCode from '@/utils/errorCode'
import { blobValidate } from "@/utils/ruoyi";
import { message } from 'antd';

const baseURL = process.env.REACT_APP_BASE_API || ''

export default {
  name(name: string, isDelete = true) {
    const url = baseURL + "/common/download?fileName=" + encodeURI(name) + "&delete=" + isDelete
    axios({
      method: 'get',
      url: url,
      responseType: 'blob',
      headers: { 'Authorization': 'Bearer ' + getToken() }
    }).then(async (res) => {
      const isLogin = await blobValidate(res.data);
      if (isLogin) {
        const blob = new Blob([res.data])
        saveAs(blob, decodeURI(res.headers['download-filename']))
      } else {
        this.printErrMsg(res.data);
      }
    })
  },
  resource(resource: string) {
    const url = baseURL + "/common/download/resource?resource=" + encodeURI(resource);
    axios({
      method: 'get',
      url: url,
      responseType: 'blob',
      headers: { 'Authorization': 'Bearer ' + getToken() }
    }).then(async (res) => {
      const isLogin = await blobValidate(res.data);
      if (isLogin) {
        const blob = new Blob([res.data])
        saveAs(blob, decodeURI(res.headers['download-filename']))
      } else {
        this.printErrMsg(res.data);
      }
    })
  },
  zip(_url: string | number, name: any) {
    const url = baseURL + _url
    axios({
      method: 'get',
      url: url,
      responseType: 'blob',
      headers: { 'Authorization': 'Bearer ' + getToken() }
    }).then(async (res) => {
      const isLogin = await blobValidate(res.data);
      if (isLogin) {
        const blob = new Blob([res.data], { type: 'application/zip' })
        saveAs(blob, name)
      } else {
        this.printErrMsg(res.data);
      }
    })
  },
  saveAs(text: string | Blob, name: string | undefined, opts: FileSaverOptions | undefined) {
    saveAs(text, name, opts);
  },
  async printErrMsg(data: { text: () => any; }) {
    const resText = await data.text();
    const rspObj = JSON.parse(resText);
    const errMsg = errorCode[rspObj.code as keyof typeof errorCode] || rspObj.msg || errorCode['default']
    message.error(errMsg);
  }
}

