import request from './request'

function normalizePosterError(error) {
  const status = error?.status || error?.response?.status

  if (status === 401) {
    return {
      ...error,
      message: '登录状态无效或已过期，请重新登录'
    }
  }

  if (status === 404) {
    return {
      ...error,
      message: '活动海报文件不存在'
    }
  }

  return error
}

/**
 * 获取后台维护的固定活动海报。
 *
 * 接口不接收文件名或路径，服务端会自行定位唯一海报资源；
 * responseType 使用 blob，组件只负责创建和释放临时 object URL。
 */
export async function getActivityPosterImage() {
  try {
    const posterBlob = await request.get('/image/poster', {
      responseType: 'blob'
    })

    if (!(posterBlob instanceof Blob) || !posterBlob.size) {
      throw new Error('活动海报内容为空')
    }

    return posterBlob
  } catch (error) {
    throw normalizePosterError(error)
  }
}
