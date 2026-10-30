# 毛概自习室

200道课程选择题在线练习：131道单选、69道多选。

## 功能

- 全部题目：按课程原文顺序，从第1题练到第200题，自动保存当前进度。
- 章节练习：按章节、题型和题量筛选，支持顺序或随机出题。
- 模拟考试：自选时长，时间结束自动交卷，统一判分和回顾答案。
- 错题复习：错题自动收录，重新答对后移出。
- 练习记录：保存最近50次报告。

多选题需完全选对才得分。题库按课程文档的原答案判分，存在歧义的题目附有提示。记录保存在当前浏览器，不会自动跨设备同步。

## 本地运行

直接打开 `docs/index.html`，或使用任意静态服务器提供 `docs/` 目录。无需安装依赖或构建。

```sh
python -m http.server 8000 --directory docs
```

## 验证

```sh
node tests/core.test.cjs
node tests/session.test.cjs
```

## GitHub Pages

在仓库 Settings → Pages 中选择 Deploy from a branch，分支 `main`，目录 `/docs`。更新主分支后，GitHub 会自动发布最新网站。

网站使用相对资源路径，兼容 GitHub Pages 项目子路径。
