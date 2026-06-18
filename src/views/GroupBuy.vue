<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useLanguage } from '../composables/useLanguage';
import { fetchJson } from '../utils';

interface Participant {
  id: number
  user_name: string
  user_phone: string
  lesson_bonus: number
  joined_at: string
}

interface GroupBuySession {
  id: number
  course_id: string
  share_id: string
  creator_name: string
  creator_phone: string
  participant_count: number
  participants?: Participant[]
  total_bonus?: number
  created_at: string
  my_join_time?: string
  my_bonus?: number
}

interface UserData {
  created: GroupBuySession[]
  joined: GroupBuySession[]
}

const route = useRoute();
const router = useRouter();
const { currentLang } = useLanguage();
const isZh = computed(() => currentLang.value === 'zh');

const courseId = computed(() => (route.params.courseId as string) || '');
const shareIdFromUrl = computed(() => (route.params.shareId as string) || '');

// ── localStorage 持久化名称 ──
const savedName = localStorage.getItem('groupbuy_user') || '';
const savedPhone = localStorage.getItem('groupbuy_phone') || '';

const localName = ref(savedName);
const localPhone = ref(savedPhone);
const nameConfirmed = ref(!!savedName);
const loading = ref(false);
const error = ref<string | null>(null);
const copyTip = ref(false);

const joinSuccess = ref(false);
const currentSession = ref<GroupBuySession | null>(null);
const userSessions = ref<UserData | null>(null);

const pageUrl = computed(() => window.location.origin);

function saveUser() {
  localStorage.setItem('groupbuy_user', localName.value.trim());
  localStorage.setItem('groupbuy_phone', localPhone.value.trim());
}

// ── 课程名称 ──
const courseName = ref('');
onMounted(async () => {
  if (courseId.value) {
    try {
      const d = await fetchJson<any>(`/api/courses/${courseId.value}`);
      if (d) courseName.value = isZh.value ? d.name : (d.name_en || d.name);
    } catch {}
  }
  if (nameConfirmed.value) {
    await loadUserSessions();
    if (shareIdFromUrl.value) await loadSession();
  }
});

async function loadUserSessions() {
  try {
    userSessions.value = await fetchJson<UserData>(`/api/group-buy/user/${encodeURIComponent(localName.value.trim())}`);
  } catch {}
}

async function loadSession() {
  if (!shareIdFromUrl.value) return;
  try {
    currentSession.value = await fetchJson<GroupBuySession>(`/api/group-buy/${shareIdFromUrl.value}`);
  } catch {
    error.value = '团购不存在或已失效';
  }
}

async function confirmName() {
  const name = localName.value.trim();
  if (!name) { error.value = '请输入你的名称'; return; }
  saveUser();
  nameConfirmed.value = true;
  error.value = null;
  await loadUserSessions();
  if (shareIdFromUrl.value) await loadSession();
}

async function createGroupBuy() {
  if (!courseId.value) return;
  loading.value = true; error.value = null;
  try {
    const data = await fetchJson<{ share_id: string }>('/api/group-buy/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        course_id: courseId.value,
        creator_name: localName.value.trim(),
        creator_phone: localPhone.value.trim()
      })
    });
    await loadUserSessions();
    // 跳转到这个团购详情
    router.push(`/group-buy/${courseId.value}/${data.share_id}`);
  } catch (err: any) {
    error.value = err.message || '创建失败';
  } finally { loading.value = false; }
}

async function joinGroupBuy() {
  if (!shareIdFromUrl.value) return;
  loading.value = true; error.value = null;
  try {
    await fetchJson(`/api/group-buy/${shareIdFromUrl.value}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_name: localName.value.trim(),
        user_phone: localPhone.value.trim()
      })
    });
    joinSuccess.value = true;
    await loadSession();
    await loadUserSessions();
  } catch (err: any) {
    error.value = err.message || '加入失败';
  } finally { loading.value = false; }
}

function copyLink(session: GroupBuySession) {
  const link = `${pageUrl.value}/group-buy/${session.course_id}/${session.share_id}`;
  navigator.clipboard.writeText(link).then(() => {
    copyTip.value = true;
    setTimeout(() => copyTip.value = false, 2000);
  });
}

function goBack() {
  router.push(courseId.value ? `/course/${courseId.value}` : '/');
}

function logout() {
  localStorage.removeItem('groupbuy_user');
  localStorage.removeItem('groupbuy_phone');
  localName.value = '';
  localPhone.value = '';
  nameConfirmed.value = false;
  userSessions.value = null;
  currentSession.value = null;
}

function viewSession(session: GroupBuySession) {
  router.push(`/group-buy/${session.course_id}/${session.share_id}`);
}

function isOwnSession(session: GroupBuySession) {
  return session.creator_name === localName.value.trim();
}
</script>

<template>
  <div class="gb-page">
    <div class="gb-container">
      <button class="gb-back" @click="goBack">← {{ isZh ? '返回' : 'Back' }}</button>
      <div class="gb-card">
        <h1 class="gb-title">{{ isZh ? '🎯 团购拼课' : '🎯 Group Buying' }}</h1>
        <p v-if="courseName" class="gb-course-name">{{ courseName }}</p>

        <!-- ── 登录 / 注册（名称即账户）── -->
        <div v-if="!nameConfirmed" class="gb-section">
          <label class="gb-label">{{ isZh ? '输入你的名称（名称即账户）' : 'Your name is your account' }}</label>
          <div class="gb-input-row">
            <input v-model="localName" class="gb-input" :placeholder="isZh ? '你的名称' : 'Your name'" @keyup.enter="confirmName" />
          </div>
          <label class="gb-label">{{ isZh ? '手机号（选填，用于预约联系）' : 'Phone (optional)' }}</label>
          <div class="gb-input-row">
            <input v-model="localPhone" class="gb-input" :placeholder="isZh ? '手机号' : 'Phone'" @keyup.enter="confirmName" />
          </div>
          <button class="gb-btn gb-btn-primary gb-btn-block" @click="confirmName">{{ isZh ? '进入' : 'Enter' }}</button>
          <p v-if="error" class="gb-error">{{ error }}</p>
        </div>

        <!-- ── 已登录 ── -->
        <div v-else class="gb-section">
          <div class="gb-user-bar">
            <span class="gb-user-name">👤 {{ localName }}</span>
            <button class="gb-btn gb-btn-text" @click="logout">{{ isZh ? '切换' : 'Switch' }}</button>
          </div>

          <!-- 当前团购详情（有 shareId 时） -->
          <template v-if="shareIdFromUrl">
            <div v-if="loading" class="gb-loading">{{ isZh ? '加载中...' : 'Loading...' }}</div>
            <div v-else-if="!currentSession" class="gb-error-text">{{ error || (isZh ? '团购不存在' : 'Not found') }}</div>
            <template v-else>
              <div class="gb-session-detail">
                <p class="gb-detail-creator">{{ isZh ? '发起人' : 'Host' }}: 👤 {{ currentSession.creator_name }}</p>
                <p class="gb-detail-count">{{ isZh ? '已参与' : 'Joined' }}: 👥 {{ currentSession.participant_count }} {{ isZh ? '人' : '' }}</p>
                <p class="gb-detail-bonus">{{ isZh ? '累计课时奖励' : 'Bonus' }}: 🎁 +{{ currentSession.total_bonus }}</p>
                <div class="gb-share-box" v-if="isOwnSession(currentSession)">
                  <code class="gb-link-text">{{ pageUrl }}/group-buy/{{ courseId }}/{{ currentSession.share_id }}</code>
                  <button class="gb-btn gb-btn-primary gb-btn-sm" @click="copyLink(currentSession)">
                    {{ copyTip ? (isZh ? '✓' : '✓') : (isZh ? '复制' : 'Copy') }}
                  </button>
                </div>
                <!-- 加入按钮 -->
                <button v-if="!joinSuccess && !isOwnSession(currentSession)" class="gb-btn gb-btn-primary gb-btn-block" @click="joinGroupBuy" :disabled="loading">
                  {{ loading ? (isZh ? '加入中...' : 'Joining...') : (isZh ? '加入团购' : 'Join') }}
                </button>
                <div v-else-if="joinSuccess" class="gb-success">✅ {{ isZh ? '你已加入该团购' : 'Joined!' }}</div>

                <!-- 参与者列表 -->
                <div v-if="currentSession.participants?.length" class="gb-participant-list">
                  <h3>{{ isZh ? '参与者' : 'Participants' }} ({{ currentSession.participants.length }})</h3>
                  <div v-for="p in currentSession.participants" :key="p.id" class="gb-participant-item">
                    <span>👤 {{ p.user_name }}</span>
                    <span class="gb-ptime">{{ p.joined_at.slice(0, 16).replace('T', ' ') }}</span>
                  </div>
                </div>
              </div>
            </template>
          </template>

          <!-- 无 shareId → 用户面板 -->
          <template v-else>
            <button class="gb-btn gb-btn-primary gb-btn-block" @click="createGroupBuy" :disabled="loading" style="margin-bottom:20px">
              {{ loading ? (isZh ? '创建中...' : 'Creating...') : (isZh ? '创建团购' : 'Create Group Buy') }}
            </button>

            <!-- 我创建的 -->
            <div v-if="userSessions?.created?.length" class="gb-list-section">
              <h3 class="gb-list-title">{{ isZh ? '我创建的团购' : 'My Created' }} ({{ userSessions.created.length }})</h3>
              <div v-for="s in userSessions.created" :key="s.id" class="gb-session-row" @click="viewSession(s)">
                <span class="gb-session-id">{{ s.share_id.slice(0, 8) }}...</span>
                <span class="gb-session-meta">👥 {{ s.participant_count }} / 🎁 +{{ s.total_bonus || 0 }}</span>
              </div>
            </div>

            <!-- 我加入的 -->
            <div v-if="userSessions?.joined?.length" class="gb-list-section">
              <h3 class="gb-list-title">{{ isZh ? '我加入的团购' : 'My Joined' }} ({{ userSessions.joined.length }})</h3>
              <div v-for="s in userSessions.joined" :key="s.id" class="gb-session-row" @click="viewSession(s)">
                <span class="gb-session-id">{{ s.creator_name }} → {{ s.share_id.slice(0, 8) }}...</span>
                <span class="gb-session-meta">👥 {{ s.participant_count }}</span>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gb-page {
  min-height: 100vh;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 80px 20px 40px;
  position: relative;
  z-index: 1;
}
.gb-container { width: 100%; max-width: 560px; }
.gb-back { background: none; border: none; color: rgba(255,255,255,0.7); font-size: 0.9rem; cursor: pointer; padding: 8px 0; margin-bottom: 16px; font-family: inherit; }
.gb-back:hover { color: #fff; }
.gb-card { background: rgba(255,255,255,0.45); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.5); border-radius: 24px; padding: 40px 32px; }
.gb-title { font-size: 1.8rem; font-weight: 700; text-align: center; margin: 0 0 8px; color: #1d1d1f; }
.gb-course-name { text-align: center; color: #6e6e73; font-size: 0.95rem; margin: 0 0 24px; }
.gb-section { margin-top: 16px; }
.gb-label { display: block; font-size: 0.85rem; color: #6e6e73; margin-bottom: 8px; }
.gb-input-row { display: flex; gap: 8px; margin-bottom: 12px; }
.gb-input { flex: 1; padding: 12px 16px; border: 1px solid #d2d2d7; border-radius: 12px; font-size: 1rem; background: rgba(255,255,255,0.8); outline: none; font-family: inherit; color: #1d1d1f; transition: border-color 0.2s; }
.gb-input:focus { border-color: #0071e3; }
.gb-btn { padding: 12px 24px; border: none; border-radius: 980px; font-size: 0.95rem; font-weight: 500; cursor: pointer; transition: all 0.2s; font-family: inherit; white-space: nowrap; }
.gb-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.gb-btn-primary { background: #0071e3; color: #fff; }
.gb-btn-primary:hover:not(:disabled) { background: #0077ed; }
.gb-btn-sm { padding: 8px 16px; font-size: 0.85rem; }
.gb-btn-block { width: 100%; justify-content: center; display: flex; }
.gb-btn-text { background: none; border: none; color: #0071e3; padding: 4px 8px; font-size: 0.8rem; cursor: pointer; }
.gb-error { color: #ff3b30; font-size: 0.85rem; margin-top: 8px; }
.gb-error-text { color: #ff3b30; font-size: 0.95rem; text-align: center; padding: 20px 0; }
.gb-loading { text-align: center; color: #6e6e73; padding: 40px 0; }

.gb-user-bar { display: flex; justify-content: space-between; align-items: center; padding: 12px; background: rgba(0,113,227,0.1); border-radius: 12px; margin-bottom: 20px; }
.gb-user-name { font-size: 1.1rem; font-weight: 600; color: #1d1d1f; }
.gb-success { text-align: center; color: #34c759; font-size: 1rem; font-weight: 500; padding: 12px; background: rgba(52,199,89,0.1); border-radius: 12px; margin: 12px 0; }

.gb-session-detail { }
.gb-detail-creator, .gb-detail-count, .gb-detail-bonus { font-size: 0.95rem; color: #1d1d1f; margin: 6px 0; }
.gb-share-box { display: flex; gap: 8px; align-items: center; background: rgba(0,0,0,0.05); padding: 12px 16px; border-radius: 12px; margin: 12px 0; }
.gb-link-text { flex: 1; font-size: 0.75rem; word-break: break-all; color: #1d1d1f; line-height: 1.4; }

.gb-participant-list { margin-top: 16px; }
.gb-participant-list h3 { font-size: 1rem; font-weight: 600; color: #1d1d1f; margin: 0 0 12px; }
.gb-participant-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border-radius: 10px; background: rgba(255,255,255,0.5); margin-bottom: 6px; }
.gb-ptime { font-size: 0.75rem; color: #86868b; }

.gb-list-section { margin-bottom: 20px; }
.gb-list-title { font-size: 1rem; font-weight: 600; color: #1d1d1f; margin: 0 0 8px; }
.gb-session-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-radius: 12px; background: rgba(255,255,255,0.5); margin-bottom: 6px; cursor: pointer; transition: background 0.2s; }
.gb-session-row:hover { background: rgba(255,255,255,0.7); }
.gb-session-id { font-size: 0.85rem; color: #1d1d1f; font-weight: 500; }
.gb-session-meta { font-size: 0.8rem; color: #6e6e73; }
</style>
