function recordIdentity(record) {
  if (record.proofRecordId) {
    return `proof:${record.proofRecordId}`
  }

  if (record.imageUrl) {
    return `image:${record.imageUrl}`
  }

  return [
    record.seasonName,
    record.taskName,
    record.proofDate,
    record.uploadedAt
  ].join('|')
}

/**
 * 补传接口可能返回也可能补足历史接口中的同一凭证。优先采用补传接口的完整资格信息，
 * 并按稳定身份去重，避免一条凭证同时出现在置顶区和普通归档区。
 */
export function prioritizeSupplementRecords(historyRecords, supplementRecords) {
  const prioritizedRecords = supplementRecords.map(record => ({
    ...record,
    isSupplementEligible: true
  }))
  const supplementKeys = new Set(prioritizedRecords.map(recordIdentity))
  const archivedRecords = historyRecords
    .filter(record => !supplementKeys.has(recordIdentity(record)))
    .map(record => ({
      ...record,
      isSupplementEligible: false
    }))

  return [...prioritizedRecords, ...archivedRecords]
}
