// 保存
await savePageBookmarks(pageData);
// 查询还原
const restored = await getPageTree('page1');
console.log(JSON.stringify(restored, null, 2));