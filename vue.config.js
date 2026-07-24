const { defineConfig } = require('@vue/cli-service')

// 页面和接口统一部署在 /flame/ 下，开发与生产环境都必须保持相同的静态资源前缀，避免联调时遗漏子路径问题。
const publicPath = '/flame/'
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
  transpileDependencies: true
})
