# 回收站"恢复"功能实现说明

## 功能概述
实现了回收站视图中tab右键菜单的"恢复"功能。用户可以在回收站中对已删除的分组（tab）点击"恢复"，系统会恢复该分组及其所有（包括嵌套）子分组中的所有书签。

## 实现细节

### 1. 数据库层面的恢复 (`src/db/BookmarksPages.tsx`)

#### 新增函数: `restoreGroupBookmarksById(groupId)`

**功能**: 恢复指定分组及其所有子分组的书签

**实现方式**:
```typescript
export async function restoreGroupBookmarksById(groupId) {
    // 1. 递归遍历所有子分组
    // 2. 对每个书签移除 deleted 和 deletedAt 标记
    // 3. 对每个分组移除 deleted 和 deletedAt 标记
    // 4. 更新页面的 bookmarksNum 统计
}
```

**返回值**:
```typescript
{
    success: boolean,
    restoredBookmarks: number,  // 恢复的书签总数
    toRemoveTags: any[]         // 备用字段（暂未使用）
}
```

### 2. 业务逻辑层面 (`src/pages/navigate/user/card.tsx`)

#### 修改函数: `removeGroup1()`

**原功能**: 处理分组删除
**新功能**: 在回收站视图下处理分组恢复，否则处理删除

**逻辑流程**:
1. 检查 `recycleActive` 状态
2. 若在回收站 (`recycleActive === true`)：
   - 若 `dataType === 0`，调用恢复确认对话框
   - 参数: `processRestoreGroup00`
3. 若在正常视图：
   - 按原逻辑调用删除处理函数

#### 新增函数: `processRestoreGroup00(id: string)`

**功能**: 处理数据类型0的分组恢复

**实现流程**:
1. 调用 `restoreGroupBookmarksById(id)` 恢复书签
2. 显示成功提示：`Message.success('恢复成功，已恢复 ${n} 个书签')`
3. 更新Redux状态：
   - `fetchBookmarksPageDatas([0, 1, 2])` - 更新按默认/时间/域名分组的书签数据
   - `fetchRecycleBinData(pageId)` - 刷新回收站数据
   - `fetchBookmarksPageDataGoups(pageId)` - 更新分组树
4. 更新页面书签数量：`processUpdatePageBookmarksNum(pageId, restoredBookmarks)`

### 3. UI 菜单项配置

在 `RenderNode` 函数中，已有的菜单项：
```tsx
{dataType === 0 && recycleActive && <Menu.Item key='3' onClick={removeGroup1}>恢复</Menu.Item>}
```

该菜单项会在以下条件下显示：
- `dataType === 0`（标准分组视图）
- `recycleActive === true`（回收站激活）

## 使用流程

### 用户操作步骤

1. **进入回收站**: 在左侧树中点击"回收站"
2. **打开tab右键菜单**: 右键点击某个tab分组的标题
3. **选择"恢复"**: 点击弹出菜单中的"恢复"选项
4. **确认恢复**: 在确认对话框中点击"确定"
5. **等待完成**: 系统会：
   - 恢复该分组及所有子分组的书签
   - 显示成功提示
   - 自动刷新回收站和书签数据显示

### 恢复范围

当恢复一个tab分组时，系统会：
1. **查找所有子分组**: 通过 `getAllFromIndex('groups', 'pId', id)` 递归查找
2. **恢复该分组的书签**: 移除 `deleted` 标记
3. **恢复所有子分组的书签**: 递归处理每个子分组
4. **恢复分组本身**: 如果分组也被标记为删除，则恢复该分组

## 数据更新流程

### Redux状态更新顺序
```
1. fetchBookmarksPageDatas([0, 1, 2])
   ↓
2. fetchRecycleBinData(pageId)
   ↓
3. fetchBookmarksPageDataGoups(pageId)
   ↓
4. processUpdatePageBookmarksNum(pageId, restoredBookmarks)
```

### UI 刷新内容
- **Card组件**: 重新加载书签分组数据
- **Tree组件**: 更新分组树结构
- **回收站数据**: 刷新已删除书签数量统计

## 后续可实现功能

### 待完成项
1. **多选恢复**: 在多选模式下恢复多个分组
   - 对应菜单项 key='8'
   - 需要实现 `processRestoreMultiple()` 函数

2. **按时间分组的恢复** (dataType === 1)
   - 实现 `processRestoreGroup1()` 函数
   - 只恢复搜索结果中的书签（如果在搜索模式）

3. **按域名分组的恢复** (dataType === 2)
   - 实现 `processRestoreGroup2()` 函数
   - 恢复特定首字母域名的书签

## 代码文件变更

### 修改文件

1. **`src/db/BookmarksPages.tsx`**
   - 添加: `restoreGroupBookmarksById()` 函数（约 50 行）
   - 位置: `removeCopyGroupById()` 函数之后

2. **`src/pages/navigate/user/card.tsx`**
   - 导入更新: 添加 `restoreGroupBookmarksById` 和 `fetchRecycleBinData`
   - 修改: `removeGroup1()` 函数
   - 添加: `processRestoreGroup00()` 函数

## 测试清单

- [ ] 恢复单个分组
- [ ] 验证书签数量更新
- [ ] 验证树节点更新
- [ ] 验证回收站数据刷新
- [ ] 验证嵌套分组的书签都被恢复
- [ ] 验证分组本身被恢复（如果曾被删除）
- [ ] 测试并发恢复多个操作
- [ ] 测试撤销和重新进入回收站

## 相关函数参考

### 数据库函数
- `restoreGroupBookmarksById()` - 恢复书签
- `removeGroupById()` - 删除分组（已有）
- `getAllBookmarksByGroupId()` - 获取分组书签（已有）

### Redux Actions
- `fetchBookmarksPageDatas()` - 获取书签分组数据
- `fetchRecycleBinData()` - 获取回收站数据
- `fetchBookmarksPageDataGoups()` - 获取分组树
- `updatePageBookmarkTags()` - 更新标签（暂未用到）

### 工具函数
- `processUpdatePageBookmarksNum()` - 更新页面书签数量
- `removeConfirm()` - 显示删除/恢复确认对话框
