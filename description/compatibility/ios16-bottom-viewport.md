# iPhone 16 Pro 底部视口兼容性

## 1. 问题概述

部分 iPhone 16 Pro 用户在钉钉工作台打开应用时，页面底部没有延伸到设备屏幕底部。底部导航栏提前停在内容区域上方，导航栏下方出现大块空白；项目、历史、排行榜和商城等路由页面均可能受到影响。

问题截图见仓库根目录的 [`页面不兼容性.JPG`](../../页面不兼容性.JPG)。该问题在 iPhone 15 Pro Max 和 iPhone 17 Air 上未复现，但不能据此把兼容性判断限定为单一机型，实际表现还受到 iOS 版本和钉钉 WebView 版本影响。

## 2. 根因分析

应用壳层曾直接使用 `window.visualViewport.height` 设置固定像素高度。部分 iOS 钉钉 WebView 返回的 `visualViewport` 只覆盖当前可视子区域，没有包含完整的大视口高度。

页面根节点同时设置了 `overflow: hidden`，因此壳层、路由内容和底部栏都会基于这个偏小高度布局，多出来的屏幕区域无法绘制应用背景。底栏使用 `position: fixed` 时还可能继续以短 visual viewport 为定位基准，进一步放大底部空白。

## 3. 修复方案

当前实现采用以下策略：

- Apple 移动端支持 `100lvh` 时，应用根节点和壳层使用 large viewport，避免将短 visual viewport 当成整页高度。
- 不支持 `100lvh` 的旧 WebView 回退到 `innerHeight`、`documentElement.clientHeight` 等布局视口候选值，并在 iOS 上取候选中的较大值。
- 根节点使用 `100dvh` 作为基础声明；Apple 移动端通过运行时标记补充 `100lvh` 最小高度。
- 底部导航改为应用壳层内的绝对定位。应用壳层本身不滚动，业务列表仍在各自的滚动容器中，因此底栏不会随页面内容移动，也不会受短 visual viewport 影响。
- 路由页面和历史、排行榜、过往记录列表统一使用 `--bottom-nav-space` 预留避让空间，避免重复叠加 `safe-area-inset-bottom`。
- 底栏与屏幕底部保持约 `12px` 的悬浮间距；该间距小于原先直接使用 iPhone 底部安全区时的常见距离，同时避免玻璃栏贴边。

## 4. 相关代码

| 文件 | 职责 |
| ---- | ---- |
| `src/App.vue` | 视口候选值、`100lvh` 降级、底栏间距变量和根节点高度 |
| `src/components/BottomNav.vue` | 应用壳层内的悬浮底部导航 |
| `src/components/HistoryPage.vue` | 历史列表底部避让空间 |
| `src/components/RankPage.vue` | 排行榜列表底部避让空间 |
| `src/components/PastSeasonReviewPage.vue` | 过往赛季列表底部避让空间 |
| `public/index.html` | 入口脚本加载失败时的一次缓存刷新与错误提示 |
| `nginx.conf` | 入口 HTML 的 `no-store` 响应头与哈希资源长期缓存 |

## 5. 验证方式

代码修改后应执行：

```bash
npm run lint
npm run build
git diff --check
```

真机复测时，建议在钉钉中重新打开应用或强制刷新资源，重点检查以下页面：

1. 历史页：底部导航是否保持悬浮，列表末尾是否可滚动到导航栏上方。
2. 项目页：长列表滚动到最底部时，导航栏是否仍保持约 `12px` 间距。
3. 排行榜和商城：页面背景及内容是否延伸到屏幕最底部，没有白色断层。

## 6. 启动白屏恢复

若用户连启动封面都看不到，说明 Vue 应用尚未挂载，问题不在页面布局、登录流程或 PixiJS 渲染。此时优先排查入口 HTML 与带哈希脚本是否来自同一构建版本。

当前容器通过 `/flame/` 目录入口和 `/flame/index.html` 显式入口返回 `Cache-Control: no-store, max-age=0`，哈希脚本、样式、图片和 WASM 仍使用长期不可变缓存。入口 HTML 内还会在主脚本加载失败且 `#app` 为空时，自动携带缓存参数刷新一次；第二次仍失败时展示“页面资源加载失败”和重新加载按钮，不保留空白页面。

> **注意**
>
> `/flame/` 必须保留目录形式的 `alias` 与 `index` 配置。不能将带尾部斜杠的精确路由直接 `alias` 到 `index.html` 文件，否则 Nginx 的索引处理会拼出 `index.htmlindex.html`，使容器健康检查返回 `500`。

已部署的旧版本不具备该恢复逻辑。出现白屏时，可先让用户完全退出钉钉工作台中的应用后重新打开；部署当前版本后应验证该设备能正常显示启动封面。

## 7. 已知边界

该修复针对钉钉移动端 WebView 的视口报告差异，不改变后端接口或业务权限。若后续仍出现特定机型异常，应记录设备型号、iOS 版本、钉钉版本和运行时视口值，再判断是否需要增加针对该 WebView 的兼容分支。
