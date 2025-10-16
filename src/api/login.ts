/*
 * @Author: Zhouhai 497675647@qq.com
 * @Date: 2022-09-23 16:01:38
 * @LastEditors: Zhouhai 497675647@qq.com
 * @LastEditTime: 2022-10-24 17:18:41
 */
import { LoginInfo } from "@/type.d/login";
import { encrypt } from "@/utils1";
import { AjaxResult } from '@/type.d'
import { AxiosPromise } from "axios";
import request from "@/utils1/request";

// 登录方法
export function login(loginInfo: LoginInfo) {
  const password = loginInfo.password;
  loginInfo.password = encrypt(password ? password : '');
  return request({
    url: "/login",
    method: "post",
    data: loginInfo,
    // headers: {
    //   isToken: false,
    // }
  });
}

// 注册方法
export function register(data: string) {
  return request({
    url: "/register",
    // headers: {
    //   isToken: false,
    // },
    method: "post",
    data: data,
  });
}

// 获取用户详细信息
export function getInfo() {
  return request({
    url: "/getInfo",
    method: "get",
  });
}

// 退出方法
export function logout() {
  return request({
    url: "/logout",
    method: "post",
  });
}

export type CaptchaCode = AjaxResult & {
  captchaOnOff: boolean;
  uuid: string;
  img: string;
};

// 获取验证码
/* export function getCodeImg(): AxiosPromise<CaptchaCode> {
  return request({
    url: "/captchaImage",
    // headers: {
    //   isToken: false,
    // },
    method: "get",
    timeout: 20000,
  });
} */
