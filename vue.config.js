const { defineConfig } = require('@vue/cli-service')

// 页面和接口统一部署在 /flame/ 下，开发与生产环境都必须保持相同的静态资源前缀，避免联调时遗漏子路径问题。
const publicPath = '/flame/'

module.exports = defineConfig({
  publicPath,
  transpileDependencies: true
})
