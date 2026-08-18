# Flame Sport Pheno

Flame Sport Pheno 是一个面向企业健康挑战场景的移动端 Web 应用。员工可以在赛季内选择运动项目、锁定挑战等级、上传运动凭证、查看排行榜与审核记录，并使用获得的积分兑换奖品。

项目主要运行于钉钉 H5 环境，同时保留普通浏览器下的本地开发登录方式。当前核心业务流程已接入真实接口；没有激活赛季时，应用仍可浏览项目规则、过往审核、商品与积分流水，并以“敬请期待”阻断赛季相关操作。

赛季正式开始倒计时期间，应用会展示“将在 N 小时后正式开始”，并暂时关闭报名、上传和兑换入口；项目与规则等内容仍可提前浏览，健康资料和意见提交不受影响。

## 核心功能

- **赛季与项目挑战**：获取当前赛季及可选运动项目，按赛季要求锁定项目并统一选择青铜、白银或黄金挑战等级；可随时查看活动规则长图。
- **运动凭证上传**：根据项目配置选择记录类型，完成图片预览、压缩和备注后提交运动凭证。
- **赛季排行榜**：按照当前赛季有效打卡次数展示所有用户的排名，并高亮当前用户。
- **上传与审核历史**：查看当前赛季和过往赛季的凭证记录、审核状态与审核意见，并在结算中赛季对开放资格的记录补交图片和备注。
- **积分商城**：按积分档位浏览奖品，查看积分流水，并通过二次确认完成商品兑换。
- **意见收集**：在项目首页提交对活动规则与体验的建议。

应用启动时还会完成钉钉免登、会话失效自动重登，以及必要的健康基础信息采集。

---

## 页面预览

以下图片展示当前四个主要页面的移动端界面。

### 项目页面

![项目页面](./description/preview-image/项目页面.jpg)

### 排行页面

![排行页面](./description/preview-image/排行页面.jpg)

### 历史页面

![历史页面](./description/preview-image/历史页面.jpg)

### 商城页面

![商城页面](./description/preview-image/商城页面.jpg)

---

## 技术栈

- Vue 3 与 Vue Router 4
- Vue CLI 5
- JavaScript
- Axios
- PixiJS 8
- Scoped CSS、CSS 动画与响应式布局

项目未引入额外 UI 组件库。路由页面负责业务数据编排，组件负责页面呈现与交互，接口响应在 `src/api/` 中统一转换为前端数据模型，跨页面状态由 `src/state/` 中的轻量响应式状态维护。

项目、排行、历史和商城按照底部导航的左右位置播放整页滑动过渡；进入右侧页面时内容向左推进，返回左侧页面时方向反转。底部导航以带轻微流动高光的玻璃框标记当前入口，作为悬浮组件覆盖在内容上方，切换时玻璃框会连续滑动到目标位置。详情页面沿用所属模块的层级顺序，系统开启“减少动态效果”时自动取消横向位移和流动动画。

顶部导航左侧提供关机样式的退出按钮，移动端钉钉内会关闭当前 H5。用户从屏幕左右边缘向内滑动时也会走同一退出流程；应用内导航不会累积浏览器历史，因此系统接管边缘手势时也不会退回项目内上一页。普通浏览器开发环境不支持脚本可靠关闭当前标签页时，会保留页面并给出提示。

项目卡片会区分轻点和滚动：手指从卡片开始滑动时不会在结束后误开上传面板。上传面板作为全局模态层显示，顶部按 Header 实际高度和设备安全区动态避让，不会再被顶部导航覆盖。

历史页面的当前、过往和可补传运动记录使用适配内部滚动容器的短距离双层阴影。触摸设备不会残留桌面悬停阴影，补传卡翻面时也只渲染当前可见面的阴影，避免移动端 WebView 出现向下拉长的暗色重影。

---

## 目录结构

```text
src/
  api/          # 登录鉴权、请求封装和各业务域接口
  components/   # 页面组件与交互面板
  router/       # 路由与页面缓存配置
  state/        # 跨页面共享状态
  utils/        # 业务辅助函数
  views/        # 路由页面与数据编排
concept/        # 初始产品线框与挑战规则参考
description/    # 接口、页面流程和数据库设计文档
  preview-image/ # README 页面预览图
```

详细的项目逻辑、接口接入范围和维护约定请参阅 [项目概况](./description/project.md)；Agent 阅读路径及完整文档入口请参阅 [文档地图](./description/README.md)。

---

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务
npm run serve

# 生产构建
npm run build

# 代码检查
npm run lint
```

开发环境通过 `.env` 配置带 `/flame/api` 前缀的普通后端基础地址、登录模式及钉钉 H5 参数。`VUE_APP_MODE=development` 时，请求层会自动在标准 `/flame/api` 路径前插入 `/dev`。云服务器上的 Vue CLI 开发服务固定监听 `127.0.0.1:8080`，由宿主机 Nginx 通过 `https://pheno.szkl.com/dev/flame/` 对外提供访问；开发 API 经 `/dev/flame/api` 转发到 `http://127.0.0.1:8000/flame/api`，因此浏览器不会产生跨域请求。Vue Dev Server 仅允许已配置的开发代理域名，新增域名时需要同步更新 `vue.config.js` 的 `devServer.allowedHosts`。

应用静态位图统一使用 WebP。启动时会展示约 80 KB 的 `src/assets/cover.webp` 全屏封面，图片完整显示后至少停留 1 秒再淡出；登录和首屏业务请求在封面显示期间照常执行。上传凭证优先使用浏览器原生 Canvas WebP 编码；钉钉 WebView 不具备该编码能力时，会按需加载基于 libwebp 的 WebAssembly 编码器，最终接口格式保持不变。生产环境会对带内容哈希的图片、脚本、样式和 WASM 设置一年不可变缓存，资源更新后通过新哈希 URL 自动失效。

推荐将浏览器联调配置放入 `.env.development`。通过 `VUE_APP_MODE` 指定登录模式：`development` 会直接使用 `VUE_APP_AUTH_CODE` 调用后端登录接口，不会向钉钉请求免登码；`production` 会走钉钉免登。修改环境变量后需要重启开发服务。

```env
VUE_APP_MODE=development
VUE_APP_API_BASE_URL=https://www.phenosolar.cloud/flame/api
VUE_APP_AUTH_CODE=<后端提供的开发 auth_code>
VUE_APP_ACTIVE_SEASON_CONFIG_EDIT_WINDOW_HOURS=480
```

`VUE_APP_ACTIVE_SEASON_CONFIG_EDIT_WINDOW_HOURS` 用于在前端计算赛季开始后的配置保护期，开发联调时应与客户后端 `.env` 中的 `ACTIVE_SEASON_CONFIG_EDIT_WINDOW_HOURS` 保持一致。修改后需要重启前端开发服务。

生产构建部署在 `/flame/` 子路径；`npm run serve` 的开发资源独立使用 `/dev/flame/` 前缀。`VUE_APP_API_BASE_URL` 始终填写普通 `/flame/api` 地址；开发模式自动转换为 `/dev/flame/api`，生产模式保持原值。未配置时默认值同样为 `/flame/api`。生产入口为 `https://<host>/flame/`，云服务器开发入口为 `https://pheno.szkl.com/dev/flame/`。

商城默认仅在赛季开始日起的前 7 个自然日开放兑换。可通过 `.env` 或生产构建环境变量调整，修改后需要重新启动开发服务或重新构建：

```env
VUE_APP_SHOP_REDEEM_WINDOW_DAYS=7
```

页面标题可在 `.env.development`（本地开发）或对应的构建环境中配置；不配置时为“燃动现象”。

```env
VUE_APP_PAGE_TITLE=燃动现象
```

---

## Docker 部署

项目提供前端专用的两阶段 `Dockerfile`：Node 负责构建，Nginx 只负责提供静态资源。镜像默认将接口基地址编译为同域的 `/flame/api`。Vue CLI 在构建期读取 `VUE_APP_*`，因此需要在构建镜像时传入钉钉 Corp ID 与 Client ID。

```bash
docker build \
  --build-arg VUE_APP_SHOP_REDEEM_WINDOW_DAYS=7 \
  --build-arg VUE_APP_ACTIVE_SEASON_CONFIG_EDIT_WINDOW_HOURS=24 \
  --build-arg VUE_APP_PAGE_TITLE=燃动现象 \
  --build-arg VUE_APP_DINGTALK_CORP_ID=<钉钉企业 CorpId> \
  --build-arg VUE_APP_DINGTALK_CLIENT_ID=<钉钉 H5 应用 ClientId> \
  -t flame-sport-pheno-fe .
docker run --rm --name flame-sport-pheno-fe -p 8080:80 flame-sport-pheno-fe
```

容器访问入口为 `http://localhost:8080/flame/`。若接口不与前端同域，可在构建时覆盖 API 基地址：

```bash
docker build \
  --build-arg VUE_APP_API_BASE_URL=https://api.example.com/flame/api \
  --build-arg VUE_APP_SHOP_REDEEM_WINDOW_DAYS=7 \
  --build-arg VUE_APP_ACTIVE_SEASON_CONFIG_EDIT_WINDOW_HOURS=24 \
  --build-arg VUE_APP_PAGE_TITLE=燃动现象 \
  --build-arg VUE_APP_DINGTALK_CORP_ID=<钉钉企业 CorpId> \
  --build-arg VUE_APP_DINGTALK_CLIENT_ID=<钉钉 H5 应用 ClientId> \
  -t flame-sport-pheno-fe .
```

钉钉 JSAPI 地址使用代码内置的官方默认值，不需要传入构建参数；如需升级版本或切换 CDN，再额外配置 `VUE_APP_DINGTALK_JSAPI_URL`。

该容器处理 `/flame/` 的前端静态资源，并将 `/flame/api/` 代理到 Docker Compose 中的 `backend:8000`。完整的前后端与 MySQL 统一部署方式见上级目录的 `docker-compose.yml`。单独部署前端镜像时，需为 Nginx 提供名为 `backend` 的可解析上游服务。

---

## 浏览器支持

目标运行环境为现代移动端浏览器及钉钉 H5 WebView。全屏模式会覆盖设备顶部与底部安全区，将根页面锁定在动态视口内；顶部导航完整避让设备安全区，并将安全区后的额外顶部间距缩短为 `8px`。顶部导航与内容视口共享同一高度边界，不使用额外的固定渐隐遮罩，首屏间距会随页面内容正常滚动。路由内容延伸至悬浮底栏后方，页面末尾保留可滚动避让空间，避免最后一项被底栏遮挡。项目会在不支持 CSS `color-mix()` 的旧版 Android WebView 中自动降级为实色卡片并关闭背景模糊，避免未知颜色函数导致整块背景声明失效、内容透出；支持这些能力的设备保持原有玻璃质感和动画。项目、排行榜、历史和商城顶部卡片以及可补传入口共用按需加载的 PixiJS 液体视觉，并通过颜色、波形、位移方向和流速形成不同变体；WebGL 不可用、上下文丢失或系统开启“减少动态效果”时自动保留对应的 CSS 静态渐变。仅支持 WebP 解码、无法通过 Canvas 编码 WebP 的钉钉 WebView 会自动使用 WebAssembly 兼容编码；若运行环境不支持 WebAssembly，则上传面板会显示明确错误并阻止提交无效文件。
