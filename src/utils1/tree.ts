/*
 * @Author: Zhouhai 497675647@qq.com
 * @Date: 2022-11-14 10:02:42
 * @LastEditors: Zhouhai 497675647@qq.com
 * @LastEditTime: 2022-11-22 12:15:27
 */
export const bulidTreeOptions = (datas: [], keyfield: string, labelfield: string, childrenfield: string): any[] => {
    if (datas && datas.length > 0) {
        return datas.map((data: any) => {
            return {
                label: data[labelfield],
                title: data[labelfield],
                value: data[keyfield],
                key: data[keyfield],
                children: data[childrenfield] && Array.isArray(data[childrenfield]) ? bulidTreeOptions(data[childrenfield], keyfield, labelfield, childrenfield) : []
            }
        });
    } else {
        return []
    }
}

export const arrToTree = (arr: any[], parentId = '') => {

    let newArr: any[] = []
    arr.forEach(item => {
        if (item.pkFather === parentId) {
            newArr.push({
                ...item,
                children: arrToTree(arr, item.key)
            })
        }
    })
    return newArr
}


export const arrTotreeNoPID = (cloneData: any[], keyfield: string, fatherfield: string, childrenfield: string) => {
    return cloneData.filter(parent => {
        const branchArr = cloneData.filter(child => parent[keyfield] === child[fatherfield]);
        parent[childrenfield] = branchArr.length > 0 ? branchArr : '';
        return cloneData.filter(child => parent[fatherfield] === child[keyfield]).length === 0;
    })
}
