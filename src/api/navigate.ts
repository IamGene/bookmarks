/*
 * @Author: Zhouhai 497675647@qq.com
 * @Date: 2022-09-23 16:01:38
 * @LastEditors: Zhouhai 497675647@qq.com
 * @LastEditTime: 2022-10-24 17:18:41
 */
// import { LoginInfo } from "@/type.d/login";
// import { encrypt } from "@/utils1";
// import { AjaxResult } from '@/type.d'
// import { AxiosPromise } from "axios";
import { TagCard } from "@/pages/navigate/default/interface";
import { GroupNode } from "@/store/modules/global";
import request from "@/utils1/request";

// 获取默认导航页数据
export function getNaviate() {
  return request({
    url: "/navigation/default/1",
    method: "get",
  });
}

// 获取用户书签数据
export function getUserNaviate(no?: number) {
  return request({
    // url: `/navigation/user/${no}`,
    url: `/bookmarks/${no}`,
    // url: `/bookmarks`,
    method: "get",
  });
}

export function getUserNaviate2(no?: number) {
  return request({
    // url: `/navigation/user/${no}`,
    // url: `/bookmarks/${no}`,
    url: `/bookmarks2/${no}`,
    method: "get",
  });
}

// 根据分组id
export function getGroupTags(id: number) {
  return request({
    url: "/navigation/group/" + id + "/tags",
    method: "get",
  });
}

export function getUrlInfo(params) {
  // console.log(params)
  return request({
    url: "/url/info",
    method: "post",
    data: params
  });
}

export function saveWebTag(params: TagCard) {
  // console.log(params)
  return request({
    url: "/navi/save",
    method: "post",
    data: params
  });
}



export function sortGroup(params) {
  // console.log(params)
  return request({
    url: `/navigation/group/sort/${params.pid}`,
    method: "post",
    data: params.ids
  });
}


export function saveTagGroup(params: GroupNode) {
  return request({
    url: "/navigation/group/save",
    method: "post",
    data: params
  });
}


//删除标签
export function removeWebTag(id: number) {
  return request({
    url: `/navi/remove/${id}`,
    method: "delete",
  });
}

export function removeGroup(id: number) {
  return request({
    url: `/navigation/group/remove/${id}`,
    method: "delete",
  });
}


export function moveGroupTopBottom(topBottom: boolean, data: object) {
  return request({
    // url: `/navigation/group/move/${topBottom ? 1 : 0}`,
    url: `/navigation/group/move/${topBottom}`,
    method: "post",
    data: data
  });
}