# 答案之书

一个用 AI 辅助制作的手机网页小工具。想好问题，轻触封面，翻开一页答案。

[在线使用](https://tangent1231.github.io/answer-book/)

- 500 组原创中英文答案，顶部 ZH / EN 切换。
- 同轮不重复抽取；语言与抽取进度在本地保存。
- 书本翻页动画、轻柔背景音乐和纸张音效。
- 答案正文左对齐，适配手机；支持减少动画。
- 静态 HTML/CSS/JS，无需构建，无外部运行依赖。

## 本地运行

```sh
python3 -m http.server 8765 --directory dist
```

打开 http://127.0.0.1:8765/ 。首次点击封面后才会播放声音，可在右上角设置中关闭。

## 目录

- `dist/`：网页及小红书离线包使用的全部运行文件。
- `content/answers-bilingual.json`：可编辑的完整答案。运行数据在 `dist/assets/answers.js`。
- `artwork/`：图标与宣传封面。
- `qa/`：状态、声音、静态包检查，以及手机排版辅助页。

## 验证

```sh
node qa/state-test.cjs
node qa/sound-test.cjs
python3 qa/package-check.py
```

GitHub Actions 会执行检查，再将 `dist/` 发布到 GitHub Pages。

## 小红书离线包

从 [Releases](https://github.com/tangent1231/answer-book/releases) 下载小工具 ZIP，根目录直接包含 `index.html`。也可以从项目根目录运行：

```sh
(cd dist && zip -r ../answer-book-xiaohongshu.zip . -x '*.DS_Store')
```

小红书客户端支持时使用平台 Storage、安全区和振动接口；普通浏览器使用兼容路径。小红书平台模拟器、Android/iOS 真机验证仍需在上传后完成，浏览器预览不代表容器验收。

## 素材

答案为本项目原创内容，并非原版书籍摘录。书本、背景、纸页与宣传图片由 AI 生成。字体使用 Noto Serif SC 和 Cormorant Garamond，完整字体许可见 `dist/assets/font-licenses.json`。
