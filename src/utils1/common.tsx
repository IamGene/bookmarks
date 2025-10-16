/*
 * @Author: Zhouhai 497675647@qq.com
 * @Date: 2022-09-23 15:37:18
 * @LastEditors: Zhouhai 497675647@qq.com
 * @LastEditTime: 2022-10-24 17:04:12
 */
export default function isValidKey(key: string | number | symbol,object : object) : key is keyof typeof object {
    return key in object
}