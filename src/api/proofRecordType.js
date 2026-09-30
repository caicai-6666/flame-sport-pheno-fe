export function normalizeProofRecordType(value) {
  const recordType = String(value || '').trim()

  // 旧版类型编码统一转为展示名称，上传配置和历史记录保持一致，不依赖项目名称。
  if (recordType === 'month-start') return '月初记录'
  if (recordType === 'month-end') return '月末记录'

  return recordType
}
