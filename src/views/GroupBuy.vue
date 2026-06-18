<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useLanguage } from '../composables/useLanguage';
import { fetchJson } from '../utils';

interface Joiner {
  name: string
  joined_at: string
}

interface GroupBuyData {
  id: number
  course_id: number
  share_id: string
  inviter_name: string
  inviter_session_bonus: number
  joiners: Joiner[]
  joiner_count: number
  created_at: string
}

interface CourseData {
  id: number
  name: string
  name_en: string
  lesson_count: string
}

const route = useRoute();
const router = useRouter();
const { currentLang } = useLanguage();
const isZh = computed(() => currentLang.value === 'zh');

const courseId = computed(() => (route.params.courseId as string) || '');
const shareIdFromUrl = computed(() => (route.params.shareId as string) || '');

const localName = ref('');
const nameConfirmed = ref(false);
const loading = ref(false);
const error = ref<string | null>(null);
const copyTip = ref(false);

const groupBuy = ref<GroupBuyData | null>(null);
const course = ref<CourseData | null>(null);
const hasJoined = ref(false);
const created = ref(false);

const pageUrl = computed(() => window.location.origin);

async function loadCourse() {
  if (!courseId.value) return;
  try {
    const data = await fetchJson<any>(`/api/courses/${courseId.value}`);
    if (data && data.id) course.value = data;
  } catch {}
}

async function loadGroupBuy() {
  if (!shareIdFromUrl.value) return;
  try {
    groupBuy.value = await fetchJson<GroupBuyData>(`/api/group-buy/${shareIdFromUrl.value}`);
    if (groupBuy.value) {
      await loadCourse();
    }
  } catch (err) {
    error.value = '团购不存在或已失效';
  }
}

async function confirmName() {
  const name = localName.value.trim();
  if (!name) {
    error.value = '请输入你的名称';
    return;
  }
  nameConfirmed.value = true;
  error.value = null;

  if (shareIdFromUrl.value) {
    loading.value = true;
    await loadGroupBuy();
    loading.value = false;
    if (groupBuy.value) {
      hasJoined.value = groupBuy.value.joiners.some(j => j.name === name);
    }
  }
}

async function createGroupBuy() {
  if (!courseId.value) return;
  loading.value = true;
  error.value = null;
  try {
    const data = await fetchJson<{ share_id: string }>('/api/group-buy/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ course_id: courseId.value, inviter_name: localName.value.trim() })
    });
    created.value = true;
    await loadGroupBuyInfo(data.share_id);
  } catch (err: any) {
    error.value = err.message || '创建失败';
  } finally {
    loading.value = false;
  }
}

async function loadGroupBuyInfo(shareId: string) {
  try {
    groupBuy.value = await fetchJson<GroupBuyData>(`/api/group-buy/${shareId}`);
  } catch {}
}

async function joinGroupBuy() {
  if (!shareIdFromUrl.value) return;
  loading.value = true;
  error.value = null;
  try {
    await fetchJson(`/api/group-buy/${shareIdFromUrl.value}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ joiner_name: localName.value.trim() })
    });
    hasJoined.value = true;
    await loadGroupBuy();
  } catch (err: any) {
    error.value = err.message || '加入失败';
  } finally {
    loading.value = false;
  }
}

async function submitShareId() {
  const input = (document.getElementById('share-input') as HTMLInputElement)?.value?.trim();
  if (!input) return;
  router.push(`/group-buy/${courseId.value}/${input}`);
}

function copyLink() {
  if (!groupBuy.value) return;
  const link = `${pageUrl.value}/group-buy/${courseId.value}/${groupBuy.value.share_id}`;
  navigator.clipboard.writeText(link).then(() => {
    copyTip.value = true;
    setTimeout(() => copyTip.value = false, 2000);
  });
}

function goBack() {
  router.push(courseId.value ? `/course/${courseId.value}` : '/');
}

onMounted(async () => {
  if (courseId.value) await loadCourse();
});
</script>

<template>
  <div class="group-buy-page">
    <div class="gb-container">
      <button class="gb-back" @click="goBack">← {{ isZh ? '返回' : 'Back' }}</button>

      <div class="gb-card">
        <h1 class="gb-title">{{ isZh ? '🎯 团购拼课' : '🎯 Group Buying' }}</h1>
        <p v-if="course" class="gb-course-name">{{ isZh ? course.name : (course.name_en || course.name) }}</p>

        <!-- 未输入名称 -->
        <div v-if="!nameConfirmed" class="gb-section">
          <label class="gb-label">{{ isZh ? '输入你的名称开始' : 'Enter your name to start' }}</label>
          <div class="gb-input-row">
            <input v-model="localName" class="gb-input" :placeholder="isZh ? '你的名称' : 'Your name'" @keyup.enter="confirmName" />
            <button class="gb-btn gb-btn-primary" @click="confirmName">{{ isZh ? '确认' : 'Confirm' }}</button>
          </div>
          <p v-if="error" class="gb-error">{{ error }}</p>
        </div>

        <!-- 已确认名称 -->
        <div v-else class="gb-section">
          <div class="gb-name-badge">👤 {{ localName }}</div>

          <!-- 无 shareId → 创建模式 -->
          <template v-if="!shareIdFromUrl && !created">
            <button class="gb-btn gb-btn-primary gb-btn-block" @click="createGroupBuy" :disabled="loading">
              {{ loading ? (isZh ? '创建中...' : 'Creating...') : (isZh ? '创建团购' : 'Create Group Buy') }}
            </button>
            <div class="gb-divider">{{ isZh ? '或者加入已有团购' : 'Or join an existing group buy' }}</div>
            <label class="gb-label">{{ isZh ? '输入分享ID' : 'Enter share ID' }}</label>
            <div class="gb-input-row">
              <input id="share-input" class="gb-input" :placeholder="isZh ? '粘贴分享ID' : 'Paste share ID'" @keyup.enter="submitShareId" />
              <button class="gb-btn gb-btn-secondary" @click="submitShareId">{{ isZh ? '加入' : 'Join' }}</button>
            </div>
          </template>

          <!-- 已创建团购 -->
          <template v-else-if="created && groupBuy">
            <div class="gb-success">{{ isZh ? '✅ 团购已创建！分享链接给朋友' : '✅ Group buy created! Share the link' }}</div>
            <div class="gb-share-box">
              <code class="gb-link-text">{{ pageUrl }}/group-buy/{{ courseId }}/{{ groupBuy.share_id }}</code>
              <button class="gb-btn gb-btn-primary gb-btn-sm" @click="copyLink">{{ copyTip ? (isZh ? '已复制 ✓' : 'Copied ✓') : (isZh ? '复制' : 'Copy') }}</button>
            </div>
            <div class="gb-stats">
              <span class="gb-stat">👥 {{ groupBuy.joiner_count }} {{ isZh ? '人已加入' : 'joined' }}</span>
              <span class="gb-stat">🎁 {{ isZh ? '累计课时 +' : 'Bonus +' }}{{ groupBuy.inviter_session_bonus }}</span>
            </div>
            <div v-if="groupBuy.joiners.length" class="gb-joiner-list">
              <h3>{{ isZh ? '已加入' : 'Participants' }}</h3>
              <div v-for="(joiner, i) in groupBuy.joiners" :key="i" class="gb-joiner-item">
                <span class="gb-joiner-name">👤 {{ joiner.name }}</span>
                <span class="gb-joiner-time">{{ joiner.joined_at.slice(0, 16).replace('T', ' ') }}</span>
              </div>
            </div>
          </template>

          <!-- 有 shareId → 加入模式 -->
          <template v-else-if="shareIdFromUrl">
            <div v-if="loading" class="gb-loading">{{ isZh ? '加载中...' : 'Loading...' }}</div>
            <div v-else-if="!groupBuy" class="gb-error-text">{{ error || (isZh ? '团购信息加载失败' : 'Failed to load group buy') }}</div>
            <template v-else>
              <div class="gb-info">
                <p><strong>{{ isZh ? '发起人' : 'Host' }}:</strong> 👤 {{ groupBuy.inviter_name }}</p>
                <p><strong>{{ isZh ? '累计课时奖励' : 'Session Bonus' }}:</strong> 🎁 +{{ groupBuy.inviter_session_bonus }}</p>
                <p><strong>{{ isZh ? '已参与人数' : 'Participants' }}:</strong> 👥 {{ groupBuy.joiner_count }}</p>
              </div>

              <div v-if="!hasJoined" class="gb-join-area">
                <button class="gb-btn gb-btn-primary gb-btn-block" @click="joinGroupBuy" :disabled="loading">
                  {{ loading ? (isZh ? '加入中...' : 'Joining...') : (isZh ? '加入团购' : 'Join Group Buy') }}
                </button>
              </div>
              <div v-else class="gb-success">{{ isZh ? '✅ 你已加入该团购' : '✅ You have joined' }}</div>

              <div v-if="groupBuy.joiners.length" class="gb-joiner-list">
                <h3>{{ isZh ? '群聊成员' : 'Group Members' }}</h3>
                <div v-for="(joiner, i) in groupBuy.joiners" :key="i" class="gb-joiner-item">
                  <span class="gb-joiner-name">👤 {{ joiner.name }}</span>
                  <span class="gb-joiner-time">{{ joiner.joined_at.slice(0, 16).replace('T', ' ') }}</span>
                </div>
              </div>
            </template>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.group-buy-page {
  min-height: 100vh;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 80px 20px 40px;
  position: relative;
  z-index: 1;
}

.gb-container {
  width: 100%;
  max-width: 560px;
}

.gb-back {
  background: none;
  border: none;
  color: rgba(255,255,255,0.7);
  font-size: 0.9rem;
  cursor: pointer;
  padding: 8px 0;
  margin-bottom: 16px;
  font-family: inherit;
}

.gb-back:hover { color: #fff; }

.gb-card {
  background: rgba(255,255,255,0.45);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.5);
  border-radius: 24px;
  padding: 40px 32px;
}

.gb-title {
  font-size: 1.8rem;
  font-weight: 700;
  text-align: center;
  margin: 0 0 8px;
  color: #1d1d1f;
}

.gb-course-name {
  text-align: center;
  color: #6e6e73;
  font-size: 0.95rem;
  margin: 0 0 24px;
}

.gb-section { margin-top: 16px; }

.gb-label {
  display: block;
  font-size: 0.85rem;
  color: #6e6e73;
  margin-bottom: 8px;
}

.gb-input-row {
  display: flex;
  gap: 8px;
}

.gb-input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #d2d2d7;
  border-radius: 12px;
  font-size: 1rem;
  background: rgba(255,255,255,0.8);
  outline: none;
  font-family: inherit;
  color: #1d1d1f;
  transition: border-color 0.2s;
}

.gb-input:focus {
  border-color: #0071e3;
}

.gb-btn {
  padding: 12px 24px;
  border: none;
  border-radius: 980px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
  white-space: nowrap;
}

.gb-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.gb-btn-primary {
  background: #0071e3;
  color: #fff;
}

.gb-btn-primary:hover:not(:disabled) {
  background: #0077ed;
}

.gb-btn-secondary {
  background: transparent;
  border: 1px solid #0071e3;
  color: #0071e3;
}

.gb-btn-secondary:hover { background: #0071e3; color: #fff; }

.gb-btn-sm { padding: 8px 16px; font-size: 0.85rem; }

.gb-btn-block { width: 100%; justify-content: center; display: flex; }

.gb-error {
  color: #ff3b30;
  font-size: 0.85rem;
  margin-top: 8px;
}

.gb-error-text {
  color: #ff3b30;
  font-size: 0.95rem;
  text-align: center;
  padding: 20px 0;
}

.gb-name-badge {
  text-align: center;
  font-size: 1.1rem;
  font-weight: 600;
  color: #1d1d1f;
  margin-bottom: 20px;
  padding: 12px;
  background: rgba(0,113,227,0.1);
  border-radius: 12px;
}

.gb-divider {
  text-align: center;
  color: #86868b;
  font-size: 0.8rem;
  margin: 20px 0;
  position: relative;
}

.gb-divider::before,
.gb-divider::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 35%;
  height: 1px;
  background: rgba(255,255,255,0.3);
}

.gb-divider::before { left: 0; }
.gb-divider::after { right: 0; }

.gb-success {
  text-align: center;
  color: #34c759;
  font-size: 1rem;
  font-weight: 500;
  padding: 12px;
  background: rgba(52,199,89,0.1);
  border-radius: 12px;
  margin-bottom: 16px;
}

.gb-share-box {
  display: flex;
  gap: 8px;
  align-items: center;
  background: rgba(0,0,0,0.05);
  padding: 12px 16px;
  border-radius: 12px;
  margin-bottom: 16px;
}

.gb-link-text {
  flex: 1;
  font-size: 0.75rem;
  word-break: break-all;
  color: #1d1d1f;
  line-height: 1.4;
}

.gb-stats {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-bottom: 16px;
}

.gb-stat {
  font-size: 0.9rem;
  color: #6e6e73;
}

.gb-info {
  padding: 16px;
  background: rgba(0,0,0,0.03);
  border-radius: 12px;
  margin-bottom: 16px;
}

.gb-info p {
  margin: 6px 0;
  font-size: 0.9rem;
  color: #1d1d1f;
}

.gb-join-area { margin-bottom: 16px; }

.gb-joiner-list h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #1d1d1f;
  margin: 20px 0 12px;
}

.gb-joiner-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(255,255,255,0.5);
  margin-bottom: 6px;
}

.gb-joiner-name {
  font-size: 0.9rem;
  color: #1d1d1f;
  font-weight: 500;
}

.gb-joiner-time {
  font-size: 0.75rem;
  color: #86868b;
}

.gb-loading {
  text-align: center;
  color: #6e6e73;
  padding: 40px 0;
}
</style>
