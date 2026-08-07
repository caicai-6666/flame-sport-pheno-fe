<template>
  <section class="past-season-page" aria-label="过往赛季上传记录">
    <div class="past-season-hero">
      <span class="past-season-eyebrow">PAST SEASONS</span>
      <h1>过往赛季上传记录</h1>
      <p>{{ heroDescription }}</p>
    </div>

    <section class="review-section" aria-label="上传记录列表">
      <div class="review-section-heading">
        <div>
          <span>上传记录</span>
          <strong>{{ sortedRecords.length ? `${sortedRecords.length} 条已归档` : '暂无归档记录' }}</strong>
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

      <div v-if="sortedRecords.length" class="review-list">
        <div
          v-for="record in sortedRecords"
          :key="record.id"
          class="review-card-entry"
        >
          <article
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
import ProofImageViewer from './ProofImageViewer.vue'
import { getReviewStatusText } from '../utils/proofReview'

export default {
  name: 'PastSeasonReviewPage',
  components: {
    ProofImageViewer
  },
  props: {
    records: {
      type: Array,
      default: () => []
    },
    heroDescription: {
      type: String,
      default: '查看已归档赛季的上传记录与审核结果。'
    },
    showCurrentSeasonLink: {
      type: Boolean,
      default: true
    }
  },
  computed: {
    sortedRecords() {
      return [...this.records].sort((a, b) => new Date(b.proofDate || b.uploadedAt) - new Date(a.proofDate || a.uploadedAt))
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
      this.$router.push({ name: 'history' })
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
  height: calc(100vh - 188px);
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
  border: 1px solid rgba(23, 33, 27, 0.08);
  border-radius: 32px;
  background:
    radial-gradient(circle at 84% 18%, rgba(114, 216, 79, 0.28), transparent 27%),
    linear-gradient(140deg, rgba(255, 255, 255, 0.95), rgba(240, 249, 239, 0.88));
  box-shadow: 0 18px 44px rgba(38, 64, 45, 0.1);
}

.past-season-eyebrow {
  color: #2f8f32;
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 0.16em;
}

.past-season-hero h1 {
  margin: 10px 0 8px;
  font-size: clamp(28px, 7.4vw, 34px);
  line-height: 1.08;
  letter-spacing: -0.04em;
}

.past-season-hero p {
  max-width: 300px;
  margin: 0;
  color: #68766d;
  font-size: 13px;
  font-weight: 750;
  line-height: 1.6;
}

.review-section {
  min-height: 0;
  padding: 14px;
  border: 1px solid rgba(23, 33, 27, 0.08);
  border-radius: 30px;
  background: rgba(255, 255, 255, 0.58);
  box-shadow: 0 16px 34px rgba(38, 64, 45, 0.06);
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
  padding-right: 4px;
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
  box-shadow: 0 16px 38px rgba(38, 64, 45, 0.08);
}

.review-card-entry {
  flex-shrink: 0;
}

.review-card.is-previewable {
  cursor: pointer;
  border-color: color-mix(in srgb, var(--accent), #fff 72%);
  box-shadow:
    0 3px 0 color-mix(in srgb, var(--accent), #fff 80%),
    0 16px 38px rgba(38, 64, 45, 0.08);
  transition: transform 160ms cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 160ms ease, border-color 160ms ease;
}

.review-card.is-previewable:hover {
  border-color: color-mix(in srgb, var(--accent), #fff 48%);
  box-shadow:
    0 5px 0 color-mix(in srgb, var(--accent), #fff 80%),
    0 22px 42px rgba(38, 64, 45, 0.14);
  transform: translateY(-3px);
}

.review-card.is-previewable:active {
  box-shadow:
    0 1px 0 color-mix(in srgb, var(--accent), #fff 82%),
    0 8px 18px rgba(38, 64, 45, 0.1);
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

</style>
