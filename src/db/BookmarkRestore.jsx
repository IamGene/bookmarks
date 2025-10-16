import React, { useState } from "react";
import { getDB } from "./db";
import { getPageTree } from "./restoreTree";
import exampleData from "./exampleData";
import { setDefaultPage, savePageBookmarks } from "./bookmarksPages";

const PAGE_ID = "pageComplex";

export default function BookmarkRestore() {
  const [jsonData, setJsonData] = useState(null);
  const [loading, setLoading] = useState(false);

  // 保存数据到 IndexedDB
  const handleSave = async () => {
    setLoading(true);
    await savePageBookmarks(exampleData);
    setLoading(false);
    alert("数据已保存到IndexedDB");
  };

  // 查询还原
  const handleRestore = async () => {
    setLoading(true);
    const data = await getPageTree(PAGE_ID);
    setJsonData(data);
    // console.log('data', data);
    setLoading(false);
  };

  // 清空 IndexedDB
  const handleClear = async () => {
    setLoading(true);
    const db = await getDB();
    await db.clear('pages');
    await db.clear('nodes');
    setJsonData(null);
    setLoading(false);
    // alert("IndexedDB已清空");
  };

  // 设置默认页
  const setDefault = async () => {
    setLoading(true);
    // const db = await getDB();
    const data = await setDefaultPage(1760173696766);//chrome
    setLoading(false);
  };
  const setDefault1 = async () => {
    setLoading(true);
    const data = await setDefaultPage(1760173251111);//Edge
    setLoading(false);
  };


  return (
    <div>
      <button onClick={handleSave} disabled={loading}>
        保存复杂数据
      </button>
      <button onClick={handleRestore} disabled={loading}>
        {loading ? "正在还原..." : "还原并显示JSON"}
      </button>
      <button onClick={handleClear} disabled={loading}>
        清空IndexedDB
      </button>
      <button onClick={setDefault} disabled={loading}>
        设置默认页Chrome
      </button>
      <button onClick={setDefault1} disabled={loading}>
        设置默认页Edge
      </button>
      <pre style={{ maxHeight: 500, overflow: "auto", background: "#f7f7f7", padding: 10 }}>
        {jsonData ? JSON.stringify(jsonData, null, 2) : "未显示任何数据"}
      </pre>
    </div>
  );
}