/*
 * @Author: Zhouhai 497675647@qq.com
 * @Date: 2022-09-27 15:16:16
 * @LastEditors: Zhouhai 497675647@qq.com
 * @LastEditTime: 2022-10-24 17:19:40
 */

//目前用到的：auth,common,request，JSEncrypt
export { default as errorCode } from "./errorCode"
// export { createIcon,getIcon } from './IconUtil';
export { encrypt, decrypt } from "./jsencrypt";
export { getToken, setToken, removeToken } from "./auth"  //auth
export { default as isValidKey } from "./common"
export { matchPermission, matchPerms, matchPerm, checkRole } from "./permission"