# Arco Pro Navi Local — Copilot Instructions

## 项目架构与核心约定

- 本项目基于 React + Vite + Redux，采用 Arco Design 组件库，入口为 `src/main.tsx`。
- 路由由 `react-router-dom` 管理，主路由组件在 `src/main.tsx`，页面分布于 `src/pages/` 下。
- 主题与语言切换通过 `useStorage` 和 `changeTheme` 实现，相关上下文在 `src/context.tsx`。
- 状态管理使用 Redux，store 定义在 `src/store/`，部分用户相关状态在 `src/store1/user.Store.ts`。
- API 请求与模拟数据分别在 `src/api/` 和 `src/mock/`，实际开发可切换。
- 组件按功能分区，见 `src/components/`，如书签、图表、导航栏等。
- 数据持久化与浏览器交互（如 IndexedDB）在 `src/db/` 实现。

## 开发与构建流程

- 安装依赖：`npm install`
- 启动开发：`npm run dev`
- 构建生产包：`npm run build`
- 升级依赖：修改 `package.json`，执行 `yarn install`，如遇问题可删除 `yarn.lock`、`husky` 文件夹及 Yarn 缓存。

## 关键开发模式与约定

- 标签管理、树拖拽、分组排序等功能在 `src/pages/list/` 和 `src/components/BookmarksSwitch/`。
- 登录、权限校验在 `src/pages/login/` 和 `src/utils/authentication.ts`。
- 全局配置与 API 拦截器在 `src/api/`，如需全局变更优先在此处理。
- 组件样式采用 less，主样式入口为 `src/style/global.less`。
- 书签、导航等页面间数据流通过 Redux 和 Context 传递。
- 重要 UI 交互（如删除确认、批量操作）已封装，复用相关组件。

## 项目特有模式

- 标签、分组等操作均有“定位锚点”、“批量修改”、“分组排序”逻辑，注意相关状态同步与 UI 刷新。
- 页面跳转与权限校验需结合路由与登录状态，未登录自动跳转 `/login`。
- 组件复用优先，避免重复造轮子，参考 `src/components/` 下各功能模块。
- Mock 数据与真实 API 可切换，开发时优先用 `src/mock/`，上线前切换到 `src/api/`。

## 参考与学习资源

- 参考项目与教程见 README.md 末尾，包含 Vite+React 架构与 Umi3 企业级框架。

---

如遇不明确的约定或特殊模式，请优先查阅 `README.md`、`src/main.tsx`、`src/pages/` 及 `src/components/`，并保持与现有结构一致。
