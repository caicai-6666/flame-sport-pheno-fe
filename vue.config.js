const { defineConfig } = require('@vue/cli-service')

// 云服务器开发环境独立挂载在 /dev/flame/，避免开发资源误命中 /flame/ 下的生产容器。
const publicPath = process.env.NODE_ENV === 'development' ? '/dev/flame/' : '/flame/'
// Vue CLI 仅在构建时读取环境变量；空值回退到产品默认名称，避免页签显示 npm 包名。
const pageTitle = process.env.VUE_APP_PAGE_TITLE?.trim() || '燃动现象'

module.exports = defineConfig({
  publicPath,
  pages: {
    index: {
      // 钉钉 WebView 直接使用构建后的 document.title，避免展示 npm 包名。
      entry: 'src/main.js',
      template: 'public/index.html',
      filename: 'index.html',
      title: pageTitle,
    },
  },
  devServer: {
    // 开发服务只向本机 Nginx 开放，外部统一通过 HTTPS 反向代理访问。
    host: '127.0.0.1',
    port: 8080,
    client: {
      webSocketURL: {
        pathname: '/dev/flame/ws',
      },
    },
    webSocketServer: {
      options: {
        path: '/dev/flame/ws',
      },
    },
  },
  transpileDependencies: true
})
