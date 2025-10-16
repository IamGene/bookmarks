/*
 * @Author: Zhouhai 497675647@qq.com
 * @Date: 2022-09-30 13:20:58
 * @LastEditors: 周海 zhouhaib@yonyou.com
 * @LastEditTime: 2022-11-05 00:32:35
 */
import request from '@/utils/request'

// 获取路由
export const getRouters = () => {
  return request({
    url: '/getRouters',
    method: 'get'
  })
}



export const getMenuNameByPath = (path: string) => {
  return request(`/system/menu/menuname`,{
    method: 'get',
    params: {path}
  });
}