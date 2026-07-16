# 五子棋 H5

一个无需构建工具、打开即玩的静态五子棋小游戏。

## 功能

- 15 × 15 标准棋盘
- 人机对战与本地双人对战
- 悔棋、重新开局、落子音效
- 自动判断横、竖、斜线五子连珠
- 本地保存不同模式的胜负战绩
- 适配手机、平板和桌面浏览器

## 本地运行

直接打开 `index.html` 即可，或在项目目录启动静态服务器：

```bash
python3 -m http.server 8080
```

然后访问 <http://localhost:8080>。

## 发布到 GitHub Pages

项目已包含 GitHub Actions 发布流程。推送到 GitHub 的 `main` 分支后，在仓库的 **Settings → Pages → Build and deployment → Source** 中选择 **GitHub Actions**，之后每次推送都会自动发布。

发布地址通常为：

```text
https://你的用户名.github.io/仓库名/
```

## 技术栈

纯 HTML、CSS 和 JavaScript，无第三方依赖。
