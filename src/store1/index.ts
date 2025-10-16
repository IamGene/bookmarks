/*
 * @Author: 周海 zhouhaib@yonyou.com
 * @Date: 2022-09-23 19:52:19
 * @LastEditors: zhouhai 497675647@qq.com
 * @LastEditTime: 2023-04-23 15:59:52
 */
//把所有的模块统一处理
//导出一个统一的方法useStore
import React from "react";
// import { LayoutStore } from "./Layout.Store";
// import { LayoutColorStore } from "./LayoutColor.Store";
import { UserStore } from "./user.Store"

class RootStore {
  userStore: UserStore;
  // layoutStore: LayoutStore;
  // layoutColorStore: LayoutColorStore;

  constructor() {
    this.userStore = new UserStore();
    // this.layoutStore = new LayoutStore();
    // this.layoutColorStore = new LayoutColorStore();
    //..
  }
}

//实例化根
//导出useStore context
const rootStore = new RootStore();
const context = React.createContext(rootStore);

const useStore = () => React.useContext(context);

export { useStore };
