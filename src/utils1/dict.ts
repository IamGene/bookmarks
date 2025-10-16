/*
 * @Author: Zhouhai 497675647@qq.com
 * @Date: 2022-10-31 13:42:51
 * @LastEditors: Zhouhai 497675647@qq.com
 * @LastEditTime: 2022-10-31 13:47:54
 */
import request from "./request"

export function getOptions(dictType: string){
    return request({ url: `/system/dict/data/type/${dictType}`, method: 'get' }).then(
        (res) => {
            if (res && res.data) {
                return res.data.map((item: any) => {
                    return {
                        label: item.dictLabel,
                        value: item.dictValue
                    }
                })
            }
        }
    )
}