<template>
  <section class="past-season-page" aria-label="过往赛季上传记录">
    <div class="past-season-hero">
      <LiquidCardBackdrop variant="history" />
      <div class="past-season-hero-content">
        <span class="past-season-eyebrow">PAST SEASONS</span>
        <h1>过往赛季上传记录</h1>
        <p>{{ heroDescription }}</p>
      </div>
    </div>

    <section
      class="supplement-records-card"
      aria-label="可补传记录概况"
    >
      <LiquidCardBackdrop variant="supplement" />
      <span class="supplement-records-copy">
        <span>可补传记录</span>
        <strong>{{ supplementSummary }}</strong>
      </span>
    </section>

    <section class="review-section" aria-label="上传记录列表">
      <div class="review-section-heading">
        <div>
          <span>上传记录</span>
          <strong>{{ recordSummary }}</strong>
        </div>
        <button
          v-if="showCurrentSeasonLink"
          class="current-season-link"
          type="button"
          @click="openCurrentSeasonHistory"
        >
          返回本赛季
        </button>
      </div>

      <div v-if="displayedRecords.length" class="review-list">
        <div
          v-for="record in displayedRecords"
          :key="record.id"
          class="review-card-entry"
        >
          <SupplementRecordCard
            v-if="record.isSupplementEligible"
            :record="record"
            :project-tasks="projectTasks"
            :is-write-frozen="isSeasonWriteFrozen"
            @preview="openProofImage"
            @submitted="$emit('supplement-submitted', $event)"
          />
          <article
            v-else
            class="review-card"
            :class="{ 'is-previewable': canPreviewProof(record) }"
            :style="{ '--accent': record.accent || '#72d84f' }"
            :role="canPreviewProof(record) ? 'button' : undefined"
            :tabindex="canPreviewProof(record) ? 0 : undefined"
            @click="openProofImage(record)"
            @keydown.enter.prevent="openProofImage(record)"
            @keydown.space.prevent="openProofImage(record)"
          >
            <div class="review-card-top">
              <div>
                <span>{{ record.seasonName }}</span>
                <strong>{{ record.taskName }}</strong>
              </div>
              <em :class="`is-${record.result}`">{{ resultText(record.result) }}</em>
            </div>

            <p v-if="record.note">{{ record.note }}</p>
            <p v-if="record.reviewComment" class="review-comment">
              <span>审核意见</span>
              {{ record.reviewComment }}
            </p>

            <dl class="review-meta">
              <div>
                <dt>上传文件</dt>
                <dd>{{ record.fileName }}<em v-if="canPreviewProof(record)"> · 点击查看原图</em></dd>
              </div>
              <div>
                <dt>上传时间</dt>
                <dd>{{ formatDateTime(record.uploadedAt) }}</dd>
              </div>
            </dl>
          </article>
        </div>
      </div>

      <div v-else class="empty-review">
        <span>暂无过往赛季上传</span>
        <p>完成月末统一审核后，已归档的赛季记录会展示在这里。</p>
      </div>
    </section>

    <ProofImageViewer
      v-if="previewRecord"
      :image-url="previewRecord.imageUrl"
      :image-blob="previewRecord.temporaryImageBlob"
      :file-name="previewRecord.fileName"
      @close="closeProofImage"
    />
  </section>
</template>

<script>
import LiquidCardBackdrop from './LiquidCardBackdrop.vue'
import ProofImageViewer from './ProofImageViewer.vue'
import SupplementRecordCard from './SupplementRecordCard.vue'
import { prioritizeSupplementRecords } from '../utils/historyRecords'
import { getReviewStatusText } from '../utils/proofReview'

export default {
  name: 'PastSeasonReviewPage',
  emits: ['supplement-submitted'],
  components: {
    LiquidCardBackdrop,
    ProofImageViewer,
    SupplementRecordCard
  },
  props: {
    records: {
      type: Array,
      default: () => []
    },
    supplementRecords: {
      type: Array,
      default: () => []
    },
    isSupplementRecordsLoading: {
      type: Boolean,
      default: false
    },
    supplementRecordsError: {
      type: String,
      default: ''
    },
    heroDescription: {
      type: String,
      default: '查看已归档赛季的上传记录与审核结果。'
    },
    showCurrentSeasonLink: {
      type: Boolean,
      default: true
    },
    projectTasks: {
      type: Array,
      default: () => []
    },
    isSeasonWriteFrozen: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    sortedRecords() {
      return [...this.records].sort((a, b) => new Date(b.proofDate || b.uploadedAt) - new Date(a.proofDate || a.uploadedAt))
    },
    sortedSupplementRecords() {
      // 后端已经给出补传资格顺序，不能只按日期重排而打乱跨赛季优先级。
      return this.supplementRecords.map(record => ({
        ...record,
        isSupplementEligible: true
      }))
    },
    prioritizedRecords() {
      return prioritizeSupplementRecords(this.sortedRecords, this.sortedSupplementRecords)
    },
    displayedRecords() {
      return this.prioritizedRecords
    },
    supplementSummary() {
      if (this.isSupplementRecordsLoading) {
        return '正在查询…'
      }

      if (this.supplementRecordsError) {
        return '暂时无法获取'
      }

      return this.sortedSupplementRecords.length
        ? `${this.sortedSupplementRecords.length} 条可补传`
        : '当前无可补传记录'
    },
    recordSummary() {
      return this.displayedRecords.length ? `${this.displayedRecords.length} 条已归档` : '暂无归档记录'
    }
  },
  data() {
    return {
      previewRecord: null
    }
  },
  methods: {
    resultText(result) {
      return getReviewStatusText(result)
    },
    formatDateTime(value) {
      const date = new Date(value)

      if (Number.isNaN(date.getTime())) {
        return '--'
      }

      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hour = String(date.getHours()).padStart(2, '0')
      const minute = String(date.getMinutes()).padStart(2, '0')

      return `${date.getFullYear()}.${month}.${day} ${hour}:${minute}`
    },
    openCurrentSeasonHistory() {
      this.$router.replace({ name: 'history' })
    },
    openProofImage(record) {
      if (this.canPreviewProof(record)) {
        this.previewRecord = record
      }
    },
    canPreviewProof(record) {
      return Boolean(record?.imageUrl || record?.temporaryImageBlob?.size)
    },
    closeProofImage() {
      this.previewRecord = null
    }
  },
  beforeUnmount() {
    this.closeProofImage()
  }
}
</script>

<style scoped>
.past-season-page {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.past-season-hero {
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
  padding: 24px;
  border: 0;
  border-radius: 32px;
  background: linear-gradient(140deg, #211006, #713415);
  box-shadow:
    0 2px 5px rgba(55, 24, 7, 0.1),
    0 10px 24px rgba(55, 24, 7, 0.21);
}

.past-season-hero-content {
  position: relative;
  z-index: 2;
}

.past-season-eyebrow {
  color: #ffd28a;
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 0.16em;
  text-shadow: 0 0 18px rgba(255, 160, 68, 0.5);
}

.past-season-hero h1 {
  margin: 10px 0 8px;
  color: #fff;
  font-size: clamp(28px, 7.4vw, 34px);
  line-height: 1.08;
  letter-spacing: -0.04em;
}

.past-season-hero p {
  max-width: 300px;
  margin: 0;
  color: rgba(255, 241, 221, 0.74);
  font-size: 13px;
  font-weight: 750;
  line-height: 1.6;
}

.supplement-records-card {
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
  width: 100%;
  padding: 16px;
  border: 0;
  border-radius: 28px;
  background:
    radial-gradient(circle at 82% 18%, rgba(255, 112, 67, 0.46), transparent 34%),
    linear-gradient(138deg, #160d2e, #54216f 58%, #28103d);
  box-shadow:
    0 2px 5px rgba(49, 18, 76, 0.07),
    0 9px 22px rgba(49, 18, 76, 0.16);
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: default;
  pointer-events: none;
  user-select: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
}

.supplement-records-copy > span {
  position: relative;
  z-index: 2;
  color: rgba(255, 239, 194, 0.76);
  font-size: 12px;
  font-weight: 850;
}

.supplement-records-copy > strong {
  position: relative;
  z-index: 2;
  display: block;
  margin-top: 6px;
  color: #fff;
  font-size: 20px;
  font-weight: 950;
  line-height: 1.1;
}

.review-section {
  min-height: 0;
  padding: 14px;
  border: 1px solid rgba(23, 33, 27, 0.08);
  border-radius: 30px;
  background: rgba(255, 255, 255, 0.58);
  box-shadow:
    0 2px 5px rgba(38, 64, 45, 0.04),
    0 9px 22px rgba(38, 64, 45, 0.1);
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 12px;
}

.review-section-heading {
  flex-shrink: 0;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}

.review-section-heading span {
  color: #758078;
}

.review-section-heading strong {
  display: block;
  margin-top: 4px;
  color: #17211b;
  font-size: 16px;
  font-weight: 950;
  line-height: 1.1;
}

.current-season-link {
  flex-shrink: 0;
  padding: 7px 10px;
  border: 0;
  border-radius: 999px;
  background: rgba(23, 33, 27, 0.08);
  color: #17211b;
  font-size: 11px;
  font-weight: 950;
  cursor: pointer;
}

.current-season-link:hover {
  background: rgba(23, 33, 27, 0.12);
}

.current-season-link:active {
  transform: translateY(1px);
}

.current-season-link:focus-visible {
  outline: 3px solid rgba(114, 216, 79, 0.32);
  outline-offset: 2px;
}

.review-list {
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  /* 独立过往记录页与历史看板使用同一阴影安全区，避免底部暗带式鬼影。 */
  padding: 4px 8px var(--bottom-nav-space) 4px;
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 12px;
}

.review-list::-webkit-scrollbar {
  width: 4px;
}

.review-list::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(23, 33, 27, 0.14);
}

.review-card {
  position: relative;
  flex-shrink: 0;
  padding: 16px;
  border: 1px solid rgba(23, 33, 27, 0.08);
  border-radius: 28px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(255, 255, 255, 0.72)),
    #fff;
  box-shadow:
    0 2px 4px rgba(38, 64, 45, 0.06),
    0 8px 18px rgba(38, 64, 45, 0.11);
}

.review-card-entry {
  flex-shrink: 0;
}

.review-card.is-previewable {
  cursor: pointer;
  border-color: color-mix(in srgb, var(--accent), #fff 72%);
  box-shadow:
    0 2px 4px rgba(38, 64, 45, 0.06),
    0 8px 18px rgba(38, 64, 45, 0.11);
  transition: transform 160ms cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 160ms ease, border-color 160ms ease;
}

@media (hover: hover) and (pointer: fine) {
  .review-card.is-previewable:hover {
    border-color: color-mix(in srgb, var(--accent), #fff 48%);
    box-shadow:
      0 3px 6px rgba(38, 64, 45, 0.07),
      0 10px 22px rgba(38, 64, 45, 0.13);
    transform: translateY(-2px);
  }
}

.review-card.is-previewable:active {
  box-shadow:
    0 1px 3px rgba(38, 64, 45, 0.06),
    0 5px 12px rgba(38, 64, 45, 0.09);
  transform: translateY(2px) scale(0.988);
}

.review-card.is-previewable:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--accent), #fff 42%);
  outline-offset: 3px;
}

.review-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.review-card-top span {
  display: block;
  color: #77827b;
  font-size: 11px;
  font-weight: 850;
}

.review-card-top strong {
  display: block;
  margin-top: 5px;
  color: #17211b;
  font-size: 17px;
  font-weight: 950;
  line-height: 1.2;
}

.review-card-top em {
  flex-shrink: 0;
  box-sizing: border-box;
  width: 68px;
  height: 26px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-style: normal;
  font-weight: 950;
  line-height: 1;
}

.review-card-top em.is-approved {
  background: rgba(114, 216, 79, 0.16);
  color: #2f8f32;
}

.review-card-top em.is-rejected {
  background: rgba(255, 111, 145, 0.16);
  color: #c93c62;
}

.review-card-top em.is-pending {
  background: rgba(255, 159, 69, 0.16);
  color: #d67624;
}

.review-card-top em.is-preliminary_approved {
  background: rgba(79, 156, 255, 0.15);
  color: #3375c4;
}

.review-card-top em.is-preliminary_rejected {
  background: rgba(255, 111, 145, 0.16);
  color: #c93c62;
}

.review-card-top em.is-reviewed {
  background: rgba(23, 33, 27, 0.08);
  color: #5f6b64;
}

.review-card p {
  margin: 12px 0 0;
  color: #4a554e;
  font-size: 12px;
  line-height: 1.55;
}

.review-card .review-comment {
  padding: 8px 10px;
  border-radius: 12px;
  background: rgba(255, 159, 69, 0.09);
  color: #70513b;
}

.review-comment span {
  margin-right: 6px;
  color: #c65f1b;
  font-size: 11px;
  font-weight: 950;
}

.review-meta {
  margin: 14px 0 0;
  display: grid;
  gap: 8px;
}

.review-meta div {
  min-width: 0;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.review-meta dt {
  flex-shrink: 0;
  color: #8b958e;
  font-size: 11px;
  font-weight: 850;
}

.review-meta dd {
  min-width: 0;
  overflow: hidden;
  margin: 0;
  color: #17211b;
  font-size: 12px;
  font-weight: 850;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.review-meta dd em {
  color: #2f8f32;
  font-style: normal;
  font-weight: 950;
}

.empty-review {
  min-height: 0;
  padding: 28px 22px;
  border: 1px dashed rgba(23, 33, 27, 0.14);
  border-radius: 30px;
  background: rgba(255, 255, 255, 0.64);
  color: #68766d;
  display: grid;
  flex: 1;
  place-items: center;
  text-align: center;
}

.empty-review span {
  color: #17211b;
  font-size: 18px;
  font-weight: 950;
}

.empty-review p {
  max-width: 260px;
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.65;
}

@media (prefers-reduced-motion: reduce) {
  .supplement-records-card {
    transition: none;
  }
}

</style>
