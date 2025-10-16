# Arco Design Pro

## 快速开始

```
// 初始化项目
npm install

// 开发模式
npm run dev

// 构建
npm run build
```
### 用npm i 安装依赖


## 导航主页
<!-- 将导航数据缓存到浏览器 -->
自定义图标
字体样式修改
# 锚点定位ok
# 全局搜索搜索过程提到card的父组件上来，从而根据每个搜索结果是否为空是否展示空提示


## 标签管理
1.树拖拽
# 2.添加标签Card ok
# 3.标签可拖拽 ok

## 功能-组件
### redux

### todo
## 1.api全局配置 ok
# 2.记住我，记住密码ok
# 3.logOut 清除cookie ok
# 4.头像 user.Store.ts  ok
# 5.添加，修改用一个form表单 ok
# 7.删除确认，封装 ok
# 8.更换为批次号 ok
# 搜索/显隐切换的bug ok
# 自带标签的大分组的排序，排除该分组 ok
# 点击编辑没有展示ok
# 针对一级分组的添加、编辑、删除特殊处理ok
# modal区分添加/编辑标签分组 ok
# 从空的大分组开始 ok
# 分区修改上级报错 ok
# 修改分组字数限制20 ok
# 从无pid到无pid ok
# day11
# 添加完哪一个分组后tab切换到该分组
# 修改上级分组报错 ok
# 没有分组的大分组添加完标签后没有清除痕迹Mysql分组， ok
# 调整顺序后pid丢失 ok
# 只有1个分组隐藏怎么展示 ok
# 标签修改完成后切换/跳转到所属的分组 ok
# pid从无到有跳转到该分组 ok
# 修改分组后所有隐藏分组的所在的大组的activeTab变为空 ok
# 添加，修改标签，定位到所在的分组 ok
# 删除确认的提示有问题 ok
# 无子分组添加标签后应定位锚点 ok
# 添加大分组的标签没有切换到该Tab  ok
# 完善一级分组的 ok
# 添加空分组后，过一会才切换到该Tab,经过了一个空的，跟延迟有关系？ok 因为重新渲染之前设置了activeTab
# 回到顶部 ok
# 修改点击标签导致页面变化，重新渲染
上移、下移
标签页切换
# 顶部切换隐藏、显示左边Tree发生变化，应该不变
# 导入浏览器标签
请求拦截器
可选部分或全选，可选哪个标签页 组内多选
修改分组后，成为所在分组的最后一个序号
搜索结果中（批量）修改分组
测试部署
修改网站名称，图标
搜索，标题和描述变为空

6.获取图标改进
9.隐藏项背景色换为加标签
7.标签图标


### 参考别的项目


## 学习项目
1.ReactHook 第01节 Vite构建React项目
https://www.bilibili.com/video/BV1XR4y1D7Vp?p=14&vd_source=dc9d1d3cefc331e351d0a1537fc38bea
2.好程序员web前端react企业级前端框架Umi3教程，React项目教程架构师进阶之路
https://www.bilibili.com/video/BV1FP411o7kL/?spm_id_from=333.337.search-card.all.click&vd_source=dc9d1d3cefc331e351d0a1537fc38bea


## 学
promise
vite

## 打包部署
1.is.ts  isSSR
2.???



## 升级版本依赖
1.修改package.json的依赖版本
2.yarn install 删除yarn.lock,husky文件夹
不管用的话，删除缓存 C:\Users\zbj\AppData\Local\Yarn\Cache


 # if (typeof userInfo === 'undefined' || userInfo === null) {}