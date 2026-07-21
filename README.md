# Flame Winter Pheno

Flame Winter Pheno 是一个面向企业健康挑战场景的移动端 Web 应用。员工可以在赛季内选择运动项目、锁定挑战等级、上传运动凭证、查看排行榜与审核记录，并使用获得的积分兑换奖品。

项目主要运行于钉钉 H5 环境，同时保留普通浏览器下的本地开发登录方式。当前核心业务流程已接入真实接口，历史页面的赛季进度仍使用前端模拟数据。

## 核心功能

- **赛季与项目挑战**：获取当前赛季及可选运动项目，按赛季要求锁定项目并统一选择青铜、白银或黄金挑战等级。
- **运动凭证上传**：根据项目配置选择记录类型，完成图片预览、压缩和备注后提交运动凭证。
- **赛季排行榜**：按照当前赛季有效打卡次数展示排名，高亮当前用户，并在用户未进入前 15 名时补充展示其实际名次。
- **上传与审核历史**：查看当前赛季和过往赛季的凭证记录、审核状态与审核意见。
- **积分商城**：按积分档位浏览奖品，查看积分流水，并通过二次确认完成商品兑换。

应用启动时还会完成钉钉免登、会话失效自动重登，以及必要的健康基础信息采集。

## 页面预览

<table>
  <tr>
    <th>项目</th>
    <th>排行</th>
    <th>历史</th>
    <th>商城</th>
  </tr>
  <tr>
    <td><img src="./description/preview-image/项目页面.jpg" alt="项目页面" width="220"></td>
    <td><img src="./description/preview-image/排行页面.jpg" alt="排行页面" width="220"></td>
    <td><img src="./description/preview-image/历史页面.jpg" alt="历史页面" width="220"></td>
    <td><img src="./description/preview-image/商城页面.jpg" alt="商城页面" width="220"></td>
  </tr>
</table>

## 技术栈

- Vue 3 与 Vue Router 4
- Vue CLI 5
- JavaScript
- Axios
- Scoped CSS、CSS 动画与响应式布局

项目未引入额外 UI 组件库。路由页面负责业务数据编排，组件负责页面呈现与交互，接口响应在 `src/api/` 中统一转换为前端数据模型，跨页面状态由 `src/state/` 中的轻量响应式状态维护。

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

详细的项目逻辑、接口接入范围、Agent 阅读路径和维护约定请参阅 [description/project.md](./description/project.md)。

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

开发环境通过 `.env.development` 配置 API 代理、登录模式及钉钉 H5 参数。启动后根据终端输出访问本地地址，默认通常为 `http://localhost:8080`。

## 浏览器支持

目标运行环境为现代移动端浏览器及钉钉 H5 WebView。项目使用 CSS 自定义属性、`backdrop-filter` 和现代 CSS 动画，旧版浏览器可能需要额外的样式降级处理。
