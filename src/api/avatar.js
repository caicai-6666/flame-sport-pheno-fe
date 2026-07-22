import request from './request'

/**
 * 获取当前登录用户头像。
 *
 * auth_code 由全局请求拦截器统一放入请求头。
 * 后端直接返回图片二进制数据，因此这里使用 blob 接收，
 * 组件侧再转换为可用于 img 标签的 object URL。
 */
export function getAvatarImage() {
  return request.get('/image/avatar', {
    responseType: 'blob'
  })
}
