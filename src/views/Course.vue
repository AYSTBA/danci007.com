<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { Course, CourseReview, CourseInteraction } from '../types';
import { useLanguage } from '../composables/useLanguage';
import { getImageUrl, getAvatarUrl, formatDateShort, fetchJson } from '../utils';

const route = useRoute();
const router = useRouter();
const hasId = computed(() => !!route.params.id);
const courseId = computed(() => (route.params.id as string) || '');

const goBack = () => {
  router.push('/');
};

// ── 共享 composables ──
const { currentLang, showLangDropdown, toggleLanguage, selectLanguage } = useLanguage();
const isZh = computed(() => currentLang.value === 'zh');

// ── 列表状态 ──
const courseList = ref<Course[]>([]);
const listLoading = ref(false);
const listError = ref<string | null>(null);

// ── 详情状态 ──
const course = ref<Course | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const activeTab = ref('detail');

// 评价
const reviews = ref<CourseReview[]>([]);
const myRating = ref(5);
const myReview = ref('');
const myName = ref('');
const showReviewForm = ref(false);
const reviewSubmitted = ref(false);
const hoveredStar = ref(0);

// 互动
const interactions = ref<CourseInteraction[]>([]);
const newComment = ref('');
const commentName = ref('');
const commentSubmitted = ref(false);

// 分享 toast
const showCopyTip = ref(false);

// ── 图片 fallback ──
const handleImgError = (e: Event) => {
  const img = e.target as HTMLImageElement;
  img.src = 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="225" viewBox="0 0 400 225">'
    + '<rect width="400" height="225" fill="#e8eef3"/>'
    + '<text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="#94a3b8" font-family="sans-serif" font-size="16">Image</text>'
    + '</svg>'
  );
};

const handleListImgError = (e: Event) => {
  (e.target as HTMLImageElement).style.display = 'none';
};

// ── 列表加载 ──
const loadList = async () => {
  listLoading.value = true;
  listError.value = null;
  try {
    const data = await fetchJson<Course[]>('/api/courses');
    courseList.value = data;
  } catch (e: any) {
    listError.value = e.message || '加载失败';
  } finally {
    listLoading.value = false;
  }
};

// ── 详情加载 ──
const loadDetail = async () => {
  loading.value = true;
  error.value = null;
  try {
    const data = await fetchJson<Course>(`/api/courses/${courseId.value}`);
    try { data.features = JSON.parse((data as any).features || '[]'); } catch { data.features = []; }
    course.value = data;
  } catch (err: any) {
    error.value = err.message || '加载失败';
    course.value = {
      id: 0,
      course_id: courseId.value,
      name: '单词突击', name_en: 'Word Assault',
      subtitle: '中萱书店总部产品培训导师', subtitle_en: 'Zhongxuan HQ Product Training',
      description: '单词突击——采用科学记忆曲线算法，结合AI智能复习系统，让孩子高效掌握核心英语单词。每日30分钟，告别死记硬背。',
      description_en: 'Word Assault - using scientific memory curve algorithms combined with AI smart review system to help children efficiently master core English vocabulary.',
      price: '0', original_price: '0',
      teacher_name: '肖瑟平', teacher_name_en: 'Xiao Seping',
      teacher_title: '官方认证', teacher_title_en: 'Official Certified',
      teacher_avatar: '', banner_image: '',
      features: [],
      lesson_count: '1', student_count: '11',
      status: '已完结', validity: '长期有效',
      active: true, created_at: '', updated_at: ''
    };
  } finally {
    loading.value = false;
    loadReviews();
    loadInteractions();
  }
};

const loadReviews = async () => {
  if (!courseId.value) return;
  try {
    reviews.value = await fetchJson<CourseReview[]>(`/api/courses/${courseId.value}/reviews`);
  } catch { /* 静默 */ }
};

const loadInteractions = async () => {
  if (!courseId.value) return;
  try {
    interactions.value = await fetchJson<CourseInteraction[]>(`/api/courses/${courseId.value}/interactions`);
  } catch { /* 静默 */ }
};

// ── 表单 ──
const submitReview = async () => {
  if (!myName.value.trim() || !myReview.value.trim()) return;
  try {
    await fetch(`/api/courses/${courseId.value}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: myName.value, rating: myRating.value, content: myReview.value })
    });
    reviewSubmitted.value = true;
    myName.value = ''; myReview.value = ''; myRating.value = 5;
    loadReviews();
  } catch { /* 静默 */ }
};

const submitComment = async () => {
  if (!commentName.value.trim() || !newComment.value.trim()) return;
  try {
    await fetch(`/api/courses/${courseId.value}/interactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: commentName.value, content: newComment.value })
    });
    commentSubmitted.value = true;
    commentName.value = ''; newComment.value = '';
    loadInteractions();
  } catch { /* 静默 */ }
};

// ── 分享：友好文案 + 链接（不含任何 ID）──

// ── 预约：跳转到预约页并附带课程ID ──
const handleBook = () => {
  if (!course.value) return;
  router.push(`/booking?course=${encodeURIComponent(course.value.course_id)}`);
};

const sharePage = async () => {
  const c = course.value;
  if (!c) return;
  const url = window.location.href;
  const title = isZh.value ? c.name : c.name_en;
  const text = isZh.value
    ? `欢迎来体验【${title}】\n${url}`
    : `Welcome to try【${title}】\n${url}`;
  try {
    if (navigator.share) {
      await navigator.share({ title, text, url });
      return;
    }
  } catch (e: any) { /* 用户取消 */ }
  // 降级：复制到剪贴板
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // 极旧的浏览器
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
  showCopyTip.value = true;
  setTimeout(() => { showCopyTip.value = false; }, 2000);
};

// ── 计算 ──
const avgRating = computed(() => {
  if (!reviews.value.length) return '5.0';
  const sum = reviews.value.reduce((a, r) => a + r.rating, 0);
  return (sum / reviews.value.length).toFixed(1);
});

const renderStars = (rating: number) => {
  return '\u2605'.repeat(rating) + '\u2606'.repeat(5 - rating);
};

const t = (zh: string, en: string) => isZh.value ? zh : en;

watch(activeTab, (tab) => {
  if (tab === 'review') loadReviews();
  if (tab === 'interact') loadInteractions();
});

watch(() => route.params.id, (id) => {
  if (id) loadDetail();
  else loadList();
});

onMounted(() => {
  if (hasId.value) loadDetail();
  else loadList();
});
</script>

<template>
  <div class="course-page">
    <!-- ════════════════════════════════════════════════
         课程列表视图 (/course)
         ════════════════════════════════════════════════ -->
    <template v-if="!hasId">
      <header class="top-bar">
        <div class="top-left">
          <button class="back-btn" @click="goBack" :title="t('返回', 'Back')">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <span class="top-title">{{ t('课程中心', 'Courses') }}</span>
        </div>
        <div class="top-right">
          <div class="lang-dropdown" @click.stop>
            <button class="lang-btn" @click="toggleLanguage">
              {{ currentLang === 'zh' ? 'EN' : '中' }}
            </button>
            <div v-if="showLangDropdown" class="lang-menu">
              <div :class="['lang-option', { active: currentLang === 'zh' }]" @click="selectLanguage('zh')">中文</div>
              <div :class="['lang-option', { active: currentLang === 'en' }]" @click="selectLanguage('en')">English</div>
            </div>
          </div>
        </div>
      </header>

      <div v-if="listLoading" class="global-loading">
        <div class="spinner"></div>
        <span class="loading-text">{{ t('加载中...', 'Loading...') }}</span>
      </div>

      <div v-else-if="listError && courseList.length === 0" class="global-error">
        <div class="error-icon">!</div>
        <div class="error-title">{{ t('加载失败', 'Failed to load') }}</div>
        <div class="error-message">{{ listError }}</div>
        <button class="error-retry-btn" @click="loadList">{{ t('重新加载', 'Retry') }}</button>
      </div>

      <div v-else-if="courseList.length === 0" class="empty-state">
        <p>{{ t('暂无课程，敬请期待', 'No courses available') }}</p>
      </div>

      <div v-else class="course-list-wrap">
        <div class="course-list-header">
          <h2 class="list-title">{{ t('精选课程', 'Featured Courses') }}</h2>
          <p class="list-subtitle">{{ t('点击查看课程详情', 'Tap to view course details') }}</p>
        </div>
        <div class="course-list">
          <div
            v-for="c in courseList"
            :key="c.id"
            class="course-card"
            @click="router.push(`/course/${c.course_id}`)"
          >
            <div class="card-banner">
              <img
                v-if="c.banner_image"
                :src="getImageUrl(c.banner_image)"
                :alt="c.name"
                @error="handleListImgError"
              />
              <div v-else class="card-banner-placeholder">
                <span>{{ t(c.name, c.name_en).slice(0, 8) }}</span>
              </div>
              <div v-if="c.price === '0' || c.price === ''" class="card-tag-free">{{ t('免费', 'Free') }}</div>
              <div v-else class="card-tag-price">¥{{ c.price }}</div>
            </div>
            <div class="card-body">
              <h3 class="card-title">{{ t(c.name, c.name_en) }}</h3>
              <p v-if="c.subtitle || c.subtitle_en" class="card-subtitle">
                {{ t(c.subtitle, c.subtitle_en) }}
              </p>
              <div class="card-footer">
                <div class="card-teacher">
                  <img
                    v-if="c.teacher_avatar"
                    :src="getAvatarUrl(c.teacher_avatar)"
                    @error="handleListImgError"
                  />
                  <div v-else class="card-avatar-placeholder">
                    {{ t(c.teacher_name, c.teacher_name_en).charAt(0) }}
                  </div>
                  <span>{{ t(c.teacher_name, c.teacher_name_en) }}</span>
                </div>
                <span class="card-arrow">›</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 页脚 -->
        <footer class="page-footer">
          <p>© {{ new Date().getFullYear() }} {{ t('中萱文化', 'Zhongxuan Culture') }}</p>
          <a v-if="isZh" class="icp-link" href="https://icp.gov.moe/?keyword=20260235" target="_blank" rel="noopener noreferrer">✮ 萌ICP备20260235号 ✮</a>
        </footer>
      </div>
    </template>

    <!-- ════════════════════════════════════════════════
         课程详情视图 (/course/:id)
         ════════════════════════════════════════════════ -->
    <template v-else>
      <div v-if="loading" class="global-loading">
        <div class="spinner"></div>
        <span class="loading-text">{{ t('加载中...', 'Loading...') }}</span>
      </div>

      <div v-else-if="error && !course" class="global-error">
        <div class="error-icon">!</div>
        <div class="error-title">{{ t('加载失败', 'Failed to load') }}</div>
        <div class="error-message">{{ error }}</div>
        <button class="error-retry-btn" @click="loadDetail">{{ t('重新加载', 'Retry') }}</button>
      </div>

      <template v-else-if="course">
        <header class="top-bar">
          <div class="top-left">
            <button class="back-btn" @click="goBack" :title="t('返回', 'Back')">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span class="top-title">{{ t(course.name, course.name_en) }}</span>
          </div>
          <div class="top-right">
            <div class="lang-dropdown" @click.stop>
              <button class="lang-btn" @click="toggleLanguage">
                {{ currentLang === 'zh' ? 'EN' : '中' }}
              </button>
              <div v-if="showLangDropdown" class="lang-menu">
                <div :class="['lang-option', { active: currentLang === 'zh' }]" @click="selectLanguage('zh')">中文</div>
                <div :class="['lang-option', { active: currentLang === 'en' }]" @click="selectLanguage('en')">English</div>
              </div>
            </div>
          </div>
        </header>

        <div class="banner">
          <img v-if="course.banner_image" :src="getImageUrl(course.banner_image)" class="banner-img" @error="handleImgError" />
          <div v-else class="banner-placeholder">
            <div class="banner-inner">
              <span class="banner-tag">{{ t('中萱书店', 'Zhongxuan') }}</span>
              <h2 class="banner-main-title">{{ t(course.name, course.name_en) }}</h2>
              <div class="banner-teacher-info">
                <span class="banner-teacher-name">{{ t(course.teacher_name, course.teacher_name_en) }}</span>
                <span class="banner-teacher-title">{{ t(course.teacher_title, course.teacher_title_en) }}</span>
              </div>
            </div>
            <div class="banner-wave"></div>
          </div>
        </div>

        <div class="price-section">
          <div class="price-row">
            <span v-if="course.price === '0'" class="price-free">{{ t('免费', 'Free') }}</span>
            <span v-else class="price-val">&yen;{{ course.price }}</span>
            <span v-if="course.original_price && course.original_price !== '0' && course.original_price !== course.price" class="price-orig">&yen;{{ course.original_price }}</span>
          </div>
          <h1 class="course-title">{{ t(course.name, course.name_en) }}</h1>
        </div>

        <div class="teacher-card">
          <div class="teacher-card-header">
            <span class="teacher-tag">{{ t('老师信息', 'Teacher Info') }}</span>
            <span class="teacher-home" @click="router.push('/about')">{{ t('主页', 'Home') }} &rsaquo;</span>
          </div>
          <div class="teacher-body">
            <div class="teacher-left">
              <div class="teacher-name-row">
                <span class="teacher-name">{{ t(course.teacher_name, course.teacher_name_en) }}</span>
                <span class="verified-badge">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="var(--info-color)"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                  {{ t(course.teacher_title, course.teacher_title_en) }}
                </span>
              </div>
              <p class="teacher-lesson-count">{{ t('本课程共', 'Total') }}{{ course.lesson_count || '1' }}{{ t('课时', ' lessons') }}</p>
            </div>
            <div class="teacher-avatar">
              <img v-if="course.teacher_avatar" :src="getAvatarUrl(course.teacher_avatar)" @error="handleImgError" />
              <div v-else class="avatar-placeholder">
                <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="var(--text-light)" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-7 8-7s8 3 8 7"/></svg>
              </div>
            </div>
          </div>
          <div class="teacher-stats">
            <div class="stat">
              <span class="stat-val">{{ course.validity || t('长期有效', 'Permanent') }}</span>
              <span class="stat-label">{{ t('有效期', 'Validity') }}</span>
            </div>
            <div class="stat">
              <span class="stat-val">{{ course.status || t('已完结', 'Complete') }}</span>
              <span class="stat-label">{{ t('状态', 'Status') }}</span>
            </div>
            <div class="stat">
              <span class="stat-val">{{ course.lesson_count || '1' }}{{ t('课时', '') }}</span>
              <span class="stat-label">{{ t('课时数', 'Lessons') }}</span>
            </div>
            <div class="stat">
              <span class="stat-val">{{ course.student_count || '11' }}{{ t('人', '') }}</span>
              <span class="stat-label">{{ t('学习人数', 'Students') }}</span>
            </div>
          </div>
        </div>

        <div class="tab-nav">
          <button :class="['tab-btn', { active: activeTab === 'detail' }]" @click="activeTab = 'detail'">{{ t('详情', 'Details') }}</button>
          <button :class="['tab-btn', { active: activeTab === 'interact' }]" @click="activeTab = 'interact'">{{ t('互动', 'Discuss') }}</button>
          <button :class="['tab-btn', { active: activeTab === 'review' }]" @click="activeTab = 'review'">{{ t('评价', 'Reviews') }}</button>
        </div>

        <div class="tab-content">
          <div v-show="activeTab === 'detail'" class="detail-panel">
            <div v-if="course.banner_image" class="detail-banner">
              <img :src="getImageUrl(course.banner_image)" @error="handleImgError" />
            </div>
            <div class="detail-text">
              <p>{{ t(course.description, course.description_en) }}</p>
            </div>
            <div v-if="course.features?.length" class="detail-features">
              <div v-for="(f, i) in course.features" :key="i" class="feat-item">
                <span class="feat-icon">{{ f.icon }}</span>
                <div>
                  <h4>{{ f.title }}</h4>
                  <p>{{ f.desc }}</p>
                </div>
              </div>
            </div>
          </div>

          <div v-show="activeTab === 'interact'" class="interact-panel">
            <div class="comment-input-area">
              <input v-model="commentName" :placeholder="t('您的昵称', 'Your nickname')" class="comment-name-input" />
              <div class="comment-row">
                <input v-model="newComment" :placeholder="t('说点什么...', 'Say something...')" class="comment-input" @keyup.enter="submitComment" />
                <button class="comment-send" @click="submitComment">{{ t('发送', 'Send') }}</button>
              </div>
            </div>
            <div v-if="commentSubmitted" class="comment-tip">&check; {{ t('发布成功', 'Posted') }}</div>
            <div class="comment-list">
              <div v-if="!interactions.length" class="empty-tip">{{ t('暂无互动，快来抢沙发~', 'No comments yet, be the first!') }}</div>
              <div v-for="item in interactions" :key="item.id" class="comment-item">
                <div class="comment-avatar">{{ item.name?.charAt(0) || '?' }}</div>
                <div class="comment-body">
                  <div class="comment-meta">
                    <span class="comment-name">{{ item.name }}</span>
                    <span class="comment-time">{{ formatDateShort(item.created_at) }}</span>
                  </div>
                  <p class="comment-text">{{ item.content }}</p>
                </div>
              </div>
            </div>
          </div>

          <div v-show="activeTab === 'review'" class="review-panel">
            <div class="review-summary">
              <div class="summary-left">
                <span class="summary-score">{{ avgRating }}</span>
                <div class="summary-stars">{{ renderStars(Math.round(Number(avgRating))) }}</div>
                <span class="summary-count">{{ reviews.length }}{{ t('条评价', ' reviews') }}</span>
              </div>
              <button class="write-review-btn" @click="showReviewForm = !showReviewForm">{{ t('写评价', 'Write Review') }}</button>
            </div>

            <div v-if="showReviewForm" class="review-form">
              <input v-model="myName" :placeholder="t('您的昵称', 'Your nickname')" class="review-name-input" />
              <div class="rating-select">
                <span class="rating-label">{{ t('评分', 'Rating') }}</span>
                <div class="star-select">
                  <span v-for="s in 5" :key="s" class="star-btn" :class="{ active: s <= (hoveredStar || myRating) }" @click="myRating = s" @mouseenter="hoveredStar = s" @mouseleave="hoveredStar = 0">&starf;</span>
                </div>
                <span class="rating-text">{{ myRating }}.0</span>
              </div>
              <textarea v-model="myReview" :placeholder="t('分享您的学习体验...', 'Share your learning experience...')" class="review-textarea" rows="3"></textarea>
              <button class="review-submit" @click="submitReview">{{ t('提交评价', 'Submit Review') }}</button>
            </div>
            <div v-if="reviewSubmitted" class="review-tip">&check; {{ t('评价发布成功', 'Review submitted') }}</div>

            <div class="review-list">
              <div v-if="!reviews.length" class="empty-tip">{{ t('暂无评价', 'No reviews yet') }}</div>
              <div v-for="r in reviews" :key="r.id" class="review-item">
                <div class="review-header">
                  <span class="review-avatar">{{ r.name?.charAt(0) || '?' }}</span>
                  <div class="review-meta">
                    <span class="review-name">{{ r.name }}</span>
                    <span class="review-stars">{{ renderStars(r.rating) }}</span>
                  </div>
                  <span class="review-time">{{ formatDateShort(r.created_at) }}</span>
                </div>
                <p class="review-content">{{ r.content }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="safe-bottom"></div>

        <div class="bottom-bar">
          <div class="bottom-actions">
            <router-link to="/" class="action-item">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--text-secondary)" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              <span>{{ t('首页', 'Home') }}</span>
            </router-link>
            <div class="action-item" @click="sharePage">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--text-secondary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              <span>{{ t('分享', 'Share') }}</span>
            </div>
          </div>
          <button class="enter-btn" @click="handleBook">{{ t('立即预约', 'Book Now') }}</button>
        </div>

        <!-- 复制提示 toast -->
        <transition name="fade">
          <div v-if="showCopyTip" class="copy-tip">
            ✓ {{ t('链接已复制到剪贴板', 'Link copied to clipboard') }}
          </div>
        </transition>
      </template>
    </template>
  </div>
</template>

<style scoped>
.course-page {
  min-height: 100vh;
  background: var(--bg-secondary);
  padding-bottom: 72px;
}

/* ── 顶部栏 ── */
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px var(--sp-4);
  background: var(--bg-primary);
  position: sticky;
  top: 0;
  z-index: 50;
  border-bottom: 0.5px solid var(--border-light);
}
.top-left {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}
.top-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}
.top-right {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
}
.back-btn {
  background: none; border: none; padding: 4px;
  color: var(--text-primary); cursor: pointer;
  display: flex; align-items: center;
}

/* ── 语言切换 ── */
.lang-dropdown { position: relative; }
.lang-btn {
  padding: 4px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--sp-2);
  background: var(--bg-primary);
  font-size: var(--fs-sm);
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  min-height: 32px;
  transition: all 0.2s;
}
.lang-btn:hover { border-color: var(--primary-color); color: var(--primary-color); }
.lang-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--sp-2);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  z-index: 100;
  min-width: 100px;
}
.lang-option {
  padding: 10px 16px;
  font-size: var(--fs-sm);
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 0.15s;
}
.lang-option:hover { background: var(--bg-secondary); }
.lang-option.active { color: var(--primary-color); font-weight: 600; }

/* ════════════════════════════════════════════════
   课程列表视图
   ════════════════════════════════════════════════ */
.empty-state {
  text-align: center;
  padding: 80px 20px;
  color: var(--text-light);
}

.course-list-wrap {
  padding: var(--sp-4);
}
.course-list-header {
  margin-bottom: var(--sp-4);
}
.list-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 4px;
}
.list-subtitle {
  font-size: 13px;
  color: var(--text-light);
  margin: 0;
}

/* 课程列表：移动端竖向、桌面端网格 */
.course-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
  padding: 4px 0 16px;
}
@media (min-width: 900px) {
  .course-list {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--sp-4);
  }
}
@media (min-width: 1200px) {
  .course-list {
    grid-template-columns: repeat(4, 1fr);
  }
}
.course-card {
  width: 100%;
  background: var(--bg-primary);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  display: flex;
  flex-direction: column;
}
.course-card:active {
  transform: scale(0.98);
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.1);
}
.card-banner {
  position: relative;
  width: 100%;
  aspect-ratio: 16/9;
  overflow: hidden;
  background: linear-gradient(135deg, var(--primary-lighter), var(--primary-light));
}
.card-banner img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}
.card-banner-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 18px;
  font-weight: 700;
  background: linear-gradient(135deg, var(--primary-color), var(--primary-light));
}
.card-tag-free,
.card-tag-price {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 4px 10px;
  background: rgba(245, 158, 11, 0.95);
  color: white;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}
.card-tag-free { background: rgba(76, 175, 80, 0.95); }
.card-tag-price { background: rgba(245, 158, 11, 0.95); }

.card-body {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}
.card-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.card-subtitle {
  font-size: 13px;
  color: var(--text-light);
  margin: 0;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
  padding-top: 8px;
}
.card-teacher {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-secondary);
  flex: 1;
  overflow: hidden;
}
.card-teacher img,
.card-avatar-placeholder {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  flex-shrink: 0;
}
.card-avatar-placeholder {
  background: var(--primary-lighter);
  color: var(--primary-color);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
}
.card-teacher span {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.card-arrow {
  color: var(--text-light);
  font-size: 20px;
  font-weight: 300;
}

/* ── Banner ── */
.banner { width: 100%; aspect-ratio: 16/9; overflow: hidden; position: relative; background: #e8e8e8; }
.banner-img { width: 100%; height: 100%; object-fit: contain; }
.banner-placeholder {
  width: 100%; height: 100%;
  background: linear-gradient(to bottom, var(--primary-lighter), var(--primary-light), var(--primary-dark));
  position: relative; display: flex; align-items: center;
}
.banner-inner { padding: 24px; position: relative; z-index: 2; width: 100%; }
.banner-tag {
  display: inline-block; padding: 4px 12px;
  background: rgba(255,255,255,0.2); border-radius: 4px;
  color: white; font-size: 12px; margin-bottom: 12px;
}
.banner-main-title { color: white; font-size: 22px; font-weight: 700; margin: 0 0 8px; line-height: 1.3; }
.banner-teacher-info { display: flex; flex-direction: column; gap: 2px; }
.banner-teacher-name { color: rgba(255,255,255,0.9); font-size: 14px; }
.banner-teacher-title { color: rgba(255,255,255,0.7); font-size: 12px; }
.banner-wave {
  position: absolute; bottom: 0; left: 0; right: 0;
  height: 40px; background: var(--bg-secondary);
  border-radius: 20px 20px 0 0;
}

/* ── 价格 ── */
.price-section { padding: var(--sp-5) var(--sp-4) 12px; background: var(--bg-secondary); }
.price-row { display: flex; align-items: baseline; gap: var(--sp-2); margin-bottom: var(--sp-2); }
.price-free { font-size: 28px; font-weight: 700; color: var(--error-color); }
.price-val { font-size: 28px; font-weight: 700; color: var(--error-color); }
.price-orig { font-size: 14px; color: var(--text-light); text-decoration: line-through; }
.course-title { font-size: 18px; font-weight: 600; color: var(--text-primary); margin: 0; line-height: 1.4; }

/* ── 讲师卡片 ── */
.teacher-card {
  margin: 12px var(--sp-4) 0;
  background: var(--bg-primary);
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(139, 105, 20, 0.2);
}
.teacher-card-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px var(--sp-4);
  background: linear-gradient(135deg, #fdf6e3, #fef9ef);
}
.teacher-tag {
  font-size: 13px; font-weight: 600;
  color: var(--gold-color);
  background: var(--gold-bg);
  padding: 3px 10px; border-radius: 4px;
}
.teacher-home { font-size: 13px; color: var(--gold-color); cursor: pointer; }
.teacher-body { display: flex; align-items: center; justify-content: space-between; padding: var(--sp-4); }
.teacher-left { flex: 1; }
.teacher-name-row { display: flex; align-items: center; gap: var(--sp-2); margin-bottom: 6px; }
.teacher-name { font-size: 20px; font-weight: 700; color: var(--text-primary); }
.verified-badge {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 12px; color: var(--info-color);
  background: rgba(33, 150, 243, 0.1);
  padding: 2px 8px; border-radius: 4px;
}
.verified-badge svg { flex-shrink: 0; }
.teacher-lesson-count { font-size: 13px; color: var(--text-light); margin: 0; }
.teacher-avatar {
  width: 64px; height: 64px; border-radius: 50%;
  border: 2px solid rgba(139, 105, 20, 0.2);
  overflow: hidden; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: var(--bg-secondary);
}
.teacher-avatar img { width: 100%; height: 100%; object-fit: cover; }
.avatar-placeholder {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
}
.teacher-stats { display: flex; border-top: 0.5px solid rgba(139, 105, 20, 0.15); }
.stat { flex: 1; text-align: center; padding: 12px 4px; }
.stat-val { display: block; font-size: 14px; font-weight: 600; color: var(--text-primary); }
.stat-label { display: block; font-size: 11px; color: var(--text-light); margin-top: 2px; }

/* ── Tab 导航 ── */
.tab-nav {
  display: flex; background: var(--bg-primary); margin-top: 12px;
  padding: 0 var(--sp-4);
  border-bottom: 0.5px solid var(--border-light);
  position: sticky; top: 45px; z-index: 40;
}
.tab-btn {
  flex: 1; padding: 14px 0; background: none; border: none;
  font-size: 15px; color: var(--text-light);
  cursor: pointer; position: relative; transition: color 0.2s;
}
.tab-btn.active { color: var(--text-primary); font-weight: 600; }
.tab-btn.active::after {
  content: ''; position: absolute; bottom: 0; left: 50%;
  transform: translateX(-50%); width: 24px; height: 3px;
  background: var(--primary-color); border-radius: 2px;
}

/* ── Tab 内容 ── */
.tab-content { background: var(--bg-primary); margin-top: 12px; min-height: 200px; }
.detail-panel, .interact-panel, .review-panel { padding: var(--sp-4); }

/* 详情 */
.detail-banner { border-radius: 8px; overflow: hidden; margin-bottom: var(--sp-4); }
.detail-banner img { width: 100%; display: block; }
.detail-text { margin-bottom: var(--sp-4); }
.detail-text p { font-size: 14px; color: var(--text-secondary); line-height: 1.8; margin: 0; }
.detail-features { display: flex; flex-direction: column; gap: var(--sp-4); }
.feat-item { display: flex; gap: 12px; align-items: flex-start; }
.feat-icon { font-size: 24px; flex-shrink: 0; }
.feat-item h4 { font-size: 14px; font-weight: 600; color: var(--text-primary); margin: 0 0 4px; }
.feat-item p { font-size: 13px; color: var(--text-secondary); margin: 0; line-height: 1.5; }

/* 互动 */
.comment-input-area { margin-bottom: var(--sp-4); }
.comment-name-input {
  width: 100%; padding: 10px 12px;
  border: 1px solid var(--border-color); border-radius: 8px;
  font-size: 14px; margin-bottom: var(--sp-2);
  outline: none; box-sizing: border-box;
}
.comment-name-input:focus { border-color: var(--primary-color); }
.comment-row { display: flex; gap: var(--sp-2); }
.comment-input {
  flex: 1; padding: 10px 12px;
  border: 1px solid var(--border-color); border-radius: 8px;
  font-size: 14px; outline: none;
}
.comment-input:focus { border-color: var(--primary-color); }
.comment-send {
  padding: 10px 20px;
  background: var(--primary-color); color: white;
  border: none; border-radius: 8px;
  font-size: 14px; cursor: pointer;
  flex-shrink: 0; min-height: var(--touch-min);
}
.comment-send:active { opacity: 0.8; }
.comment-tip { text-align: center; color: var(--success-color); font-size: 13px; margin-bottom: 12px; }
.comment-list { display: flex; flex-direction: column; gap: var(--sp-4); }
.comment-item { display: flex; gap: 12px; }
.comment-avatar {
  width: 36px; height: 36px; border-radius: 50%;
  background: rgba(33, 150, 243, 0.1); color: var(--info-color);
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 600; flex-shrink: 0;
}
.comment-body { flex: 1; }
.comment-meta { display: flex; align-items: center; gap: var(--sp-2); margin-bottom: 4px; }
.comment-name { font-size: 13px; font-weight: 600; color: var(--text-primary); }
.comment-time { font-size: 11px; color: var(--text-light); }
.comment-text { font-size: 14px; color: var(--text-secondary); line-height: 1.6; margin: 0; }
.empty-tip { text-align: center; color: var(--text-light); font-size: 14px; padding: var(--sp-10) 0; }

/* 评价 */
.review-summary {
  display: flex; align-items: center; justify-content: space-between;
  padding: var(--sp-4); background: var(--bg-secondary);
  border-radius: 12px; margin-bottom: var(--sp-4);
}
.summary-left { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.summary-score { font-size: 36px; font-weight: 700; color: var(--text-primary); line-height: 1; }
.summary-stars { font-size: 16px; color: var(--accent-color); letter-spacing: 2px; }
.summary-count { font-size: 12px; color: var(--text-light); }
.write-review-btn {
  padding: 10px 20px;
  background: var(--bg-primary);
  border: 1px solid var(--primary-color);
  color: var(--primary-color);
  border-radius: 8px; font-size: 14px;
  cursor: pointer; min-height: var(--touch-min);
}
.write-review-btn:active { background: rgba(26, 107, 74, 0.06); }

.review-form {
  padding: var(--sp-4); background: var(--bg-secondary);
  border-radius: 12px; margin-bottom: var(--sp-4);
  display: flex; flex-direction: column; gap: 12px;
}
.review-name-input {
  padding: 10px 12px; border: 1px solid var(--border-color);
  border-radius: 8px; font-size: 14px; outline: none;
}
.review-name-input:focus { border-color: var(--primary-color); }
.rating-select { display: flex; align-items: center; gap: 12px; }
.rating-label { font-size: 14px; color: var(--text-primary); }
.star-select { display: flex; gap: 4px; }
.star-btn {
  font-size: 28px; color: var(--border-color);
  cursor: pointer; transition: color 0.15s; line-height: 1;
}
.star-btn.active { color: var(--accent-color); }
.rating-text { font-size: 14px; color: var(--accent-color); font-weight: 600; }
.review-textarea {
  padding: 10px 12px; border: 1px solid var(--border-color);
  border-radius: 8px; font-size: 14px; resize: none;
  outline: none; font-family: inherit;
}
.review-textarea:focus { border-color: var(--primary-color); }
.review-submit {
  padding: 12px;
  background: var(--primary-color); color: white;
  border: none; border-radius: 8px;
  font-size: 15px; font-weight: 500;
  cursor: pointer; min-height: var(--touch-min);
}
.review-submit:active { opacity: 0.8; }
.review-tip { text-align: center; color: var(--success-color); font-size: 13px; margin-bottom: 12px; }
.review-list { display: flex; flex-direction: column; gap: var(--sp-4); }
.review-item { padding-bottom: var(--sp-4); border-bottom: 0.5px solid var(--border-light); }
.review-item:last-child { border-bottom: none; }
.review-header { display: flex; align-items: center; gap: 10px; margin-bottom: var(--sp-2); }
.review-avatar {
  width: 36px; height: 36px; border-radius: 50%;
  background: rgba(245, 158, 11, 0.1); color: var(--accent-color);
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 600; flex-shrink: 0;
}
.review-meta { flex: 1; }
.review-name { font-size: 14px; font-weight: 600; color: var(--text-primary); }
.review-stars { display: block; font-size: 12px; color: var(--accent-color); letter-spacing: 1px; }
.review-time { font-size: 11px; color: var(--text-light); }
.review-content { font-size: 14px; color: var(--text-secondary); line-height: 1.6; margin: 0; }

/* ── 底部栏 ── */
.bottom-bar {
  position: fixed; bottom: 0; left: 0; right: 0;
  display: flex; align-items: center;
  padding: var(--sp-2) var(--sp-4);
  padding-bottom: calc(8px + var(--safe-bottom));
  background: var(--bg-primary);
  border-top: 0.5px solid var(--border-light);
  z-index: 100; gap: 12px;
}
.bottom-actions { display: flex; gap: var(--sp-5); }
.action-item {
  display: flex; flex-direction: column; align-items: center;
  gap: 2px; font-size: 11px; color: var(--text-secondary);
  cursor: pointer; min-width: var(--touch-min);
}
.enter-btn {
  flex: 1; padding: 14px;
  background: linear-gradient(to bottom, var(--primary-light), var(--primary-color));
  color: white; border: none; border-radius: 24px;
  font-size: 16px; font-weight: 600;
  cursor: pointer; min-height: 48px;
}
.enter-btn:active { opacity: 0.9; }
.safe-bottom { height: 20px; }

/* ── 课程列表页脚 ── */
.page-footer {
  text-align: center;
  padding: 24px 16px 16px;
  color: var(--text-light);
  font-size: 12px;
}
.page-footer p { margin: 0 0 4px; }
.page-footer .icp-link {
  color: var(--text-light);
  text-decoration: none;
  transition: color 0.2s;
}
.page-footer .icp-link:hover { color: var(--primary-color); }

/* ── 复制提示 ── */
.copy-tip {
  position: fixed;
  bottom: 96px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.85);
  color: white;
  padding: 10px 20px;
  border-radius: 22px;
  font-size: 14px;
  z-index: 200;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
