<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import type { Banner, PageContents, Teacher } from '../types';
import { normalizeActive } from '../types';
import { useLanguage } from '../composables/useLanguage';
import { useBannerCarousel } from '../composables/useBannerCarousel';
import { getImageUrl, getAvatarUrl, renderMarkdown, sanitizeHtml } from '../utils';
import { fetchJson } from '../utils';
import MobileTabBar from '../components/MobileTabBar.vue'

const router = useRouter();

// ── 共享 composables ──
const { currentLang, showLangDropdown, toggleLanguage, selectLanguage } = useLanguage();

// ── 数据 ──
const banners = ref<Banner[]>([]);
const pageContents = ref<PageContents>({});
const teachers = ref<Teacher[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

// ── 学员照片墙 ──
const galleryPhotos = Array.from({ length: 12 }, (_, i) => ({
  url: `/images/gallery/photo-${String(i + 1).padStart(2, '0')}.jpg`,
}));

function fallbackImg(e: Event) {
  const img = e.target as HTMLImageElement;
  const i = galleryPhotos.findIndex(p => p.url === img.src);
  const num = String(i + 1).padStart(2, '0');
  img.src = `/images/gallery/photo-${num}.svg`;
}

// ── Banner 轮播 ──
const { currentBannerIndex, stopAutoPlay, nextBanner, prevBanner } =
  useBannerCarousel(banners);

// ── 滚动 ──
const sections = ['hero', 'why', 'teachers', 'gallery'];
const activeBallIndex = ref(-1); // 默认不激活
const rotation = ref(0); // 初始位置
const lastScrollY = ref(0);
const isNavVisible = ref(true);
const showMobileMenu = ref(false);

const loadData = async () => {
  loading.value = true;
  error.value = null;
  try {
    const [bannerData, contents, teacherData] = await Promise.all([
      fetchJson<Banner[]>('/api/banners'),
      fetchJson<PageContents>('/api/pages/home/contents'),
      fetchJson<Teacher[]>('/api/teachers')
    ]);

    banners.value = bannerData.map((b: any) => ({
      ...b,
      active: normalizeActive(b.active)
    }));
    pageContents.value = contents;
    teachers.value = teacherData.map((t: any) => ({
      ...t,
      active: normalizeActive(t.active)
    }));
  } catch (e: any) {
    error.value = e.message || '加载失败，请检查网络连接';
  } finally {
    loading.value = false;
  }
};

const getParagraphs = (text: string) => {
  if (!text) return [];
  return renderMarkdown(text);
};

onMounted(() => {
  loadData();
  window.addEventListener('scroll', updateCurrentSection);
  updateCurrentSection();
});

onUnmounted(() => {
  window.removeEventListener('scroll', updateCurrentSection);
  stopAutoPlay();
});

const updateCurrentSection = () => {
  const scrollY = window.scrollY;

  if (scrollY > lastScrollY.value && scrollY > 100) {
    isNavVisible.value = false;
  } else {
    isNavVisible.value = true;
  }
  lastScrollY.value = scrollY;

  // 计算各个区域的位置
  const sectionPositions = [];

  for (let i = 0; i < sections.length; i++) {
    const section = document.getElementById(sections[i]);
    if (section) {
      const rect = section.getBoundingClientRect();
      const sectionTop = scrollY + rect.top;
      const sectionHeight = rect.height;
      const sectionMiddle = sectionTop + sectionHeight / 2;
      sectionPositions.push({
        index: i,
        top: sectionTop,
        middle: sectionMiddle,
        height: sectionHeight
      });
    }
  }

  const viewportCenter = scrollY + window.innerHeight / 2;

  // 球的初始位置（容器不旋转时）：
  // 0号球（hero）：rotate(90deg) → 右边
  // 1号球（why）：rotate(180deg) → 下边
  // 2号球（teachers）：rotate(270deg) → 左边
  // 3号球（gallery）：rotate(0deg) → 上边
  
  // 我们希望：
  // hero中间 → 0号在右 → 容器旋转0°
  // why中间 → 1号在右 → 容器逆时针旋转90°（-90°）
  // teachers中间 → 2号在右 → 容器旋转-180°
  // gallery中间 → 3号在右 → 容器旋转-270°
  
  if (sectionPositions.length >= 2) {
    const firstMiddle = sectionPositions[0].middle;
    const lastMiddle = sectionPositions[sectionPositions.length - 1].middle;
    const totalScrollDistance = lastMiddle - firstMiddle;
    
    let progress = 0;
    if (totalScrollDistance > 0) {
      progress = Math.max(0, Math.min(1, (viewportCenter - firstMiddle) / totalScrollDistance));
    }
    
    // 顺时针旋转（正值），每个区域对应90度
    rotation.value = progress * 360;
    
    // 激活球的逻辑：找到当前视口中心已经经过了几个中间点
    let activeIndex = 0; // 默认激活第一个球
    
    for (let i = sectionPositions.length - 1; i >= 0; i--) {
      if (viewportCenter >= sectionPositions[i].middle - 10) { // 减10是为了提前一点点切换
        activeIndex = i;
        break;
      }
    }
    
    activeBallIndex.value = activeIndex;
  } else {
    rotation.value = 0;
    activeBallIndex.value = 0;
  }
};

const siteTitle = computed(() => {
  return currentLang.value === 'zh'
    ? (pageContents.value.site_name || '中萱文化')
    : (pageContents.value.site_name_en || 'Zhongxuan Culture');
});
</script>

<template>
  <!-- Loading -->
  <div v-if="loading" class="global-loading">
    <div class="spinner"></div>
    <span class="loading-text">加载中...</span>
  </div>

  <!-- Error -->
  <div v-else-if="error" class="global-error">
    <div class="error-icon">⚠️</div>
    <div class="error-title">页面加载失败</div>
    <div class="error-message">{{ error }}</div>
    <button class="error-retry-btn" @click="loadData">重新加载</button>
  </div>

  <!-- 正常内容 -->
  <div v-else class="page-container">
    <!-- 顶部导航栏 -->
    <header class="page-header" :class="{ 'nav-hidden': !isNavVisible }">
      <div class="header-inner">
        <div class="header-left">
          <span class="site-title">{{ siteTitle }}</span>
        </div>
        <div class="header-right">
          <a href="/about" class="nav-link">{{ currentLang === 'zh' ? '关于我们' : 'About' }}</a>
          <a href="/enrollment" class="nav-link">{{ currentLang === 'zh' ? '课程报名' : 'Enroll' }}</a>
          <a href="/booking" class="nav-link">{{ currentLang === 'zh' ? '预约与联系' : 'Booking & Contact' }}</a>
          <div class="lang-dropdown">
            <button class="lang-dropdown-btn" @click.stop="toggleLanguage">
              <img src="/translate-languange-switch-svgrepo-com.svg" class="lang-icon" alt="语言切换" />
            </button>
            <div class="lang-dropdown-content" v-show="showLangDropdown">
              <a href="#" @click.prevent="selectLanguage('zh')">简体中文</a>
              <a href="#" @click.prevent="selectLanguage('en')">English</a>
            </div>
          </div>
          <button class="menu-btn" @click="showMobileMenu = !showMobileMenu">
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>
      <div v-if="showMobileMenu" class="mobile-nav">
        <a href="#hero" @click="showMobileMenu = false">{{ currentLang === 'zh' ? '首页' : 'Home' }}</a>
        <a href="/about" @click="showMobileMenu = false">{{ currentLang === 'zh' ? '关于我们' : 'About' }}</a>
        <a href="/enrollment" @click="showMobileMenu = false">{{ currentLang === 'zh' ? '课程报名' : 'Enroll' }}</a>
        <a href="/booking" @click="showMobileMenu = false">{{ currentLang === 'zh' ? '预约与联系' : 'Booking & Contact' }}</a>
      </div>
    </header>

    <!-- 左侧圆圈装饰 -->
    <div class="circle-container" :style="{ transform: `translateY(-50%) rotate(${rotation}deg)` }">
      <div class="circle-track"></div>
      <!-- 0号球 - hero: 右边 (3点钟) -->
      <div :class="['circle-dot', { active: activeBallIndex === 0, 'active-brand': activeBallIndex === 0 }]"
        style="transform: rotate(90deg) translateY(-140px)"></div>
      <!-- 1号球 - why: 下边 (6点钟) -->
      <div :class="['circle-dot', { active: activeBallIndex === 1, 'active-brand': activeBallIndex === 1 }]"
        style="transform: rotate(180deg) translateY(-140px)"></div>
      <!-- 2号球 - teachers: 左边 (9点钟) -->
      <div :class="['circle-dot', { active: activeBallIndex === 2, 'active-brand': activeBallIndex === 2 }]"
        style="transform: rotate(270deg) translateY(-140px)"></div>
      <!-- 3号球 - gallery: 上边 (12点钟) -->
      <div :class="['circle-dot', { active: activeBallIndex === 3, 'active-brand': activeBallIndex === 3 }]"
        style="transform: rotate(0deg) translateY(-140px)"></div>
    </div>

    <!-- Banner 轮播 -->
    <section id="hero" class="hero-section">
      <div class="hero-inner">
        <div class="hero-banner-wrapper">
          <div class="hero-banner">
            <img
              v-for="(banner, index) in banners"
              :key="banner.id"
              :src="getImageUrl(currentLang === 'en' && banner.image_url_en ? banner.image_url_en : banner.image_url)"
              :alt="currentLang === 'en' && banner.title_en ? banner.title_en : banner.title"
              :class="['banner-img', { active: index === currentBannerIndex }]"
            />
            <div v-if="banners.length === 0" class="banner-placeholder">
              <span>{{ currentLang === 'zh' ? '活动图片' : 'Activity Image' }}</span>
            </div>
            <button class="banner-nav-prev glass-btn" @click="prevBanner">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <button class="banner-nav-next glass-btn" @click="nextBanner">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 5l7 7-7 7"/>
              </svg>
            </button>
            <div v-if="banners.length > 1" class="banner-dots">
              <span
                v-for="(_, index) in banners"
                :key="index"
                :class="['dot', { active: index === currentBannerIndex }]"
              ></span>
            </div>
          </div>
          <img src="/down-arrow.svg" alt="Down Arrow" class="banner-arrow banner-arrow-left" />
          <img src="/down-arrow.svg" alt="Down Arrow" class="banner-arrow banner-arrow-right" />
        </div>
      </div>
    </section>

    <!-- 为什么选择我们 -->
    <section id="why" class="why-section">
      <div class="why-inner">
        <div class="why-content-wrapper">
          <h2 class="section-title">{{ currentLang === 'zh' ? (pageContents.why_title || '为什么选择我们') : (pageContents.why_title_en || 'Why Choose Us') }}</h2>
          <div class="why-content">
            <div class="md-text">
              <div v-for="(para, index) in getParagraphs(currentLang === 'zh' ? (pageContents.why_content || '') : (pageContents.why_content_en || ''))" :key="index">
                <h3 v-if="para.isTitle" v-html="sanitizeHtml(para.text)"></h3>
                <p v-else v-html="sanitizeHtml(para.text)"></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 师资力量 -->
    <section id="teachers" class="teachers-section">
      <div class="teachers-inner">
        <h2 class="section-title">{{ currentLang === 'zh' ? '我们的师资力量' : 'Our Teachers' }}</h2>
        <div class="teachers-grid">
          <div
            v-for="teacher in teachers"
            :key="teacher.id"
            class="teacher-card"
          >
            <div class="teacher-avatar">
              <img
                :src="getAvatarUrl(teacher.avatar)"
                :alt="currentLang === 'zh' ? teacher.name : teacher.name_en"
                @error="($event.target as HTMLImageElement).src = getAvatarUrl('')"
              />
            </div>
            <h3 class="teacher-name">{{ currentLang === 'zh' ? teacher.name : teacher.name_en }}</h3>
            <p class="teacher-title">{{ currentLang === 'zh' ? teacher.title : teacher.title_en }}</p>
            <p class="teacher-desc">{{ currentLang === 'zh' ? teacher.description : teacher.description_en }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 学员照片墙 -->
    <section id="gallery" class="gallery-section">
      <div class="container">
        <div class="gallery-header">
          <h2 class="section-title">{{ currentLang === 'zh' ? '学员风采' : 'Student Gallery' }}</h2>
          <p class="gallery-subtitle">{{ currentLang === 'zh' ? '记录每一位学员的成长瞬间' : 'Moments of every student\'s growth' }}</p>
        </div>
        <div class="gallery-grid">
          <div
            v-for="(photo, index) in galleryPhotos"
            :key="index"
            class="gallery-photo"
          >
            <div class="gallery-photo-inner">
              <img
                :src="photo.url"
                :alt="currentLang === 'zh' ? '学员风采' : 'Student Gallery'"
                loading="lazy"
                @error="fallbackImg($event)"
              />
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 页脚 -->
    <footer class="page-footer">
      <div class="footer-top">
        <span class="footer-brand">{{ currentLang === 'zh' ? (pageContents.site_name || '中萱文化') : (pageContents.site_name_en || 'Zhongxuan Culture') }}</span>
        <div class="footer-links">
          <router-link to="/" class="footer-link">{{ currentLang === 'zh' ? '首页' : 'Home' }}</router-link>
          <router-link to="/about" class="footer-link">{{ currentLang === 'zh' ? '关于我们' : 'About' }}</router-link>
          <router-link to="/enrollment" class="footer-link">{{ currentLang === 'zh' ? '课程报名' : 'Enrollment' }}</router-link>
          <router-link to="/booking" class="footer-link">{{ currentLang === 'zh' ? '预约联系' : 'Contact' }}</router-link>
          <router-link to="/admin" class="footer-link">{{ currentLang === 'zh' ? '后台管理' : 'Admin' }}</router-link>
        </div>
      </div>
      <div class="footer-bottom">
        <span class="footer-note">{{ currentLang === 'zh' ? (pageContents.site_note || '中萱百日学通文化的简称') : (pageContents.site_note_en || 'Abbreviation for Zhongxuan Bairixuetong Culture') }}</span>
        <span class="footer-copy">&copy; {{ new Date().getFullYear() }} {{ pageContents.site_name || '中萱文化' }}. All rights reserved.</span>
      </div>
    </footer>

    <!-- 移动端底部导航栏 -->
    <MobileTabBar />
  </div>
</template>

<style scoped>
/* ══════════════════════════════════════════════
   桌面端基础样式
   ══════════════════════════════════════════════ */
.page-container {
  min-height: 100vh;
  background: #ffffff;
  position: relative;
  overflow-x: hidden;
}

.page-container::before {
  content: '';
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background: linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%);
  pointer-events: none;
  z-index: 0;
}

.page-container::after {
  content: '';
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background:
    radial-gradient(circle at 20% 80%, rgba(255,182,193,0.25) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(173,216,230,0.25) 0%, transparent 50%),
    radial-gradient(circle at 40% 40%, rgba(221,160,221,0.2) 0%, transparent 50%),
    radial-gradient(circle at 60% 60%, rgba(255,228,181,0.2) 0%, transparent 50%);
  pointer-events: none;
  z-index: 0;
  animation: float 25s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-20px); }
}

/* ── 顶部导航 ── */
.page-header {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 100;
  background: linear-gradient(to bottom, rgba(76, 175, 80, 0.92), rgba(102, 187, 106, 0.45), transparent);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(12px);
  transition: transform 0.4s cubic-bezier(0.4,0,0.2,1);
}

.page-header.nav-hidden {
  transform: translateY(-100%);
}

.header-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 40px;
  max-width: 1800px;
  margin: 0 auto;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 4px;
}

.site-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
  letter-spacing: 0.5px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 30px;
}

.nav-link {
  color: #333;
  text-decoration: none;
  font-size: 0.9rem;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  transition: color 0.2s;
}

.nav-link:hover { color: var(--primary-color); }

.lang-dropdown { position: relative; }

.lang-dropdown-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  background: rgba(0,0,0,0.05);
  border: 1px solid #ddd;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
  padding: 0;
}

.lang-dropdown-btn:hover {
  background: rgba(0,0,0,0.1);
  border-color: #ccc;
}

.lang-icon { width: 20px; height: 20px; }

.lang-dropdown-content {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: white;
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.1);
  min-width: 140px;
  padding: 8px 0;
  z-index: 100;
}

.lang-dropdown-content a {
  display: block;
  padding: 12px 20px;
  color: #333;
  text-decoration: none;
  font-size: 0.9rem;
  min-height: 44px;
  display: flex;
  align-items: center;
  transition: background 0.2s;
}

.lang-dropdown-content a:hover {
  background: rgba(0,0,0,0.05);
}

.menu-btn {
  display: none;
  flex-direction: column;
  gap: 5px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 10px;
  min-width: 44px;
  min-height: 44px;
  align-items: center;
  justify-content: center;
}

.menu-btn span {
  width: 20px;
  height: 2px;
  background: #555;
  border-radius: 2px;
}

.mobile-nav {
  display: none;
  background: rgba(255,255,255,0.98);
  padding: 16px 20px;
  flex-direction: column;
  gap: 0;
  border-top: 1px solid #f0f0f0;
}

.mobile-nav a {
  color: #333;
  text-decoration: none;
  font-size: 16px;
  min-height: 48px;
  display: flex;
  align-items: center;
  padding: 0 4px;
  border-bottom: 1px solid #f5f5f5;
}

.mobile-nav a:last-child {
  border-bottom: none;
}

/* ── 左侧圆圈装饰 ── */
.circle-container {
  position: fixed;
  left: -150px;
  top: 50%;
  transform: translateY(-50%) rotate(0deg);
  z-index: 50;
  width: 350px;
  height: 350px;
  transition: transform 0.1s ease-out;
}

.circle-track {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%,-50%);
  width: 280px;
  height: 280px;
  border: 2px solid #e0e0e0;
  border-radius: 50%;
}

.circle-dot {
  position: absolute;
  top: 50%; left: 50%;
  width: 16px; height: 16px;
  background: #bbb;
  border-radius: 50%;
  margin-left: -8px; margin-top: -8px;
  transition: all 0.4s cubic-bezier(0.25,0.8,0.25,1);
}

.circle-dot.active {
  background: #1a1a1a;
  box-shadow: 0 0 0 6px rgba(26,26,26,0.1);
  width: 18px; height: 18px;
  margin-left: -9px; margin-top: -9px;
}

.circle-dot.active-brand {
  background: #3498db;
  box-shadow: 0 0 0 6px rgba(52, 152, 219, 0.15);
}

/* ── 左侧导航球 (备用) ── */
.nav-dots {
  position: fixed;
  left: 30px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 50;
  display: flex;
  flex-direction: column;
  gap: 16px;
  display: none;
}

.nav-dot {
  width: 12px;
  height: 12px;
  background: #bbb;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s ease;
}

.nav-dot:hover {
  background: #888;
  transform: scale(1.2);
}

.nav-dot.active {
  background: var(--primary-color);
  box-shadow: 0 0 0 6px rgba(67, 160, 71, 0.15);
  width: 14px;
  height: 14px;
}

/* ── Banner 轮播 ── */
.hero-section {
  min-height: 100vh;
  padding-top: 10px;
  display: flex;
  align-items: center;
  position: relative;
  z-index: 1;
}

.hero-inner {
  width: 100%;
  display: flex;
  justify-content: flex-end;
  padding: 0 45px 0 130px;
}

.hero-banner-wrapper {
  position: relative;
  width: 90%;
  max-width: 1450px;
}

.hero-banner {
  position: relative;
  width: 100%;
  height: 620px;
  background: #fafafa;
  border-radius: 20px;
  overflow: hidden;
}

.banner-img {
  position: absolute;
  width: 100%; height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 0.7s ease;
}

.banner-img.active { opacity: 1; }

.banner-placeholder {
  width: 100%; height: 100%;
  background: linear-gradient(to bottom, var(--primary-lighter), var(--primary-light), var(--primary-dark));
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255,255,255,0.6);
  font-size: 16px;
}

.banner-nav-prev,
.banner-nav-next {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 50px; height: 50px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.banner-nav-prev { left: 20px; }
.banner-nav-next { right: 20px; }

.glass-btn {
  background: rgba(255,255,255,0.3);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.5);
  border-radius: 50%;
  color: white;
}

.glass-btn:hover {
  background: rgba(255,255,255,0.5);
  border-color: rgba(255,255,255,0.8);
}

.banner-arrow {
  position: absolute;
  bottom: -70px;
  width: 40px; height: 40px;
  z-index: 10;
  pointer-events: none;
  animation: arrowBounce 2s ease-in-out infinite;
}

.banner-arrow-left { left: 20px; }
.banner-arrow-right { right: 20px; }

@keyframes arrowBounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.banner-dots {
  display: none;
}

/* ── 为什么选择我们 ── */
.why-section {
  min-height: 100vh;
  display: flex;
  align-items: center;
  width: 100%;
  justify-content: flex-end;
  padding: 80px 45px 80px 130px;
  background: transparent;
  position: relative;
  z-index: 1;
}

.why-inner {
  width: 90%;
  max-width: 1450px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.why-content-wrapper {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.why-content {
  width: 100%;
  padding: 60px 80px;
  border: 2px dashed #ddd;
  border-radius: 20px;
  background: white;
}

.section-title {
  font-size: 1.8rem;
  font-weight: 500;
  color: #333;
  margin-bottom: 40px;
  letter-spacing: 1px;
  text-align: center;
  position: relative;
}

.section-title::before,
.section-title::after {
  content: '';
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  width: 120px;
  height: 1px;
  background: #ddd;
}

.section-title::before { top: -20px; }
.section-title::after { bottom: -20px; }

.md-text {
  color: #555;
  line-height: 2.2;
  font-size: 1rem;
  text-align: center;
  width: 100%;
  margin: 0;
  padding: 0;
}

.md-text h3 {
  text-align: center;
  margin-top: 30px;
  margin-bottom: 15px;
  color: #333;
  font-size: 1.2rem;
  font-weight: 500;
  line-height: 1.5;
}

.md-text p {
  margin: 0 0 15px 0;
  padding: 0;
  line-height: 2.2;
}

.md-text p:last-child { margin-bottom: 0; }
.md-text strong { color: #333; font-weight: 600; }
.md-text br { display: block; content: ""; margin-top: 0.3em; }

/* ── 师资力量 ── */
.teachers-section {
  min-height: 100vh;
  display: flex;
  align-items: center;
  width: 100%;
  justify-content: flex-end;
  padding: 0 45px 0 130px;
  background: transparent;
  position: relative;
  z-index: 1;
}

.teachers-inner {
  width: 90%;
  max-width: 1450px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.teachers-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 30px;
  width: 100%;
  margin-top: 50px;
}

.teacher-card {
  background: #fafafa;
  border-radius: 20px;
  padding: 30px;
  text-align: center;
  box-shadow: 0 10px 40px rgba(0,0,0,0.06);
  transition: transform 0.3s, box-shadow 0.3s;
  border: 1px solid #f0f0f0;
}

.teacher-card:hover {
  transform: translateY(-10px);
  box-shadow: 0 20px 50px rgba(0,0,0,0.12);
}

.teacher-avatar {
  width: 150px; height: 150px;
  margin: 0 auto 20px;
  border-radius: 50%;
  overflow: hidden;
  border: 4px solid #e8eef3;
}

.teacher-avatar img { width: 100%; height: 100%; object-fit: cover; }

.teacher-name {
  font-size: 1.3rem;
  font-weight: 600;
  color: #2c3e50;
  margin: 0 0 10px;
}

.teacher-title {
  font-size: 1rem;
  color: var(--primary-color);
  margin: 0 0 15px;
  font-weight: 500;
}

.teacher-desc {
  font-size: 0.9rem;
  color: #666;
  line-height: 1.8;
  margin: 0;
}

/* ══════════════════════════════════════════════
   学员照片墙
   ══════════════════════════════════════════════ */
.gallery-section {
  position: relative;
  z-index: 1;
  padding: 60px 0 20px;
  width: 100%;
}

.gallery-header {
  text-align: center;
  margin-bottom: 32px;
}

.gallery-header .section-title {
  position: relative;
  display: inline-block;
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8px;
  letter-spacing: 2px;
}

.gallery-subtitle {
  font-size: 15px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  grid-auto-rows: 110px;
  gap: 12px;
}

.gallery-photo {
  position: relative;
  overflow: hidden;
  border-radius: 12px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  opacity: 0;
  animation: galleryFadeIn 0.8s ease forwards;
}

.gallery-photo:nth-child(1) { animation-delay: 0.05s; }
.gallery-photo:nth-child(2) { animation-delay: 0.1s; }
.gallery-photo:nth-child(3) { animation-delay: 0.15s; }
.gallery-photo:nth-child(4) { animation-delay: 0.2s; }
.gallery-photo:nth-child(5) { animation-delay: 0.25s; }
.gallery-photo:nth-child(6) { animation-delay: 0.3s; }
.gallery-photo:nth-child(7) { animation-delay: 0.35s; }
.gallery-photo:nth-child(8) { animation-delay: 0.4s; }
.gallery-photo:nth-child(9) { animation-delay: 0.45s; }
.gallery-photo:nth-child(10) { animation-delay: 0.5s; }
.gallery-photo:nth-child(11) { animation-delay: 0.55s; }
.gallery-photo:nth-child(12) { animation-delay: 0.6s; }

@keyframes galleryFadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.gallery-photo:hover {
  transform: scale(1.08);
  box-shadow: 0 12px 32px rgba(67, 160, 71, 0.25);
  z-index: 5;
}

.gallery-photo-inner {
  width: 100%;
  height: 100%;
}

.gallery-photo-inner img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.5s ease;
}

.gallery-photo:hover .gallery-photo-inner img {
  transform: scale(1.1);
}

/* ── 页脚 ── */
.page-footer {
  padding: 48px 40px 32px;
  text-align: center;
  border-top: none;
  background: linear-gradient(to top, rgba(76, 175, 80, 0.92), rgba(102, 187, 106, 0.45), transparent);
  position: relative;
  z-index: 1;
}

.footer-top {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  margin-bottom: 24px;
}

.footer-brand {
  font-size: 1.15rem;
  color: var(--primary-dark);
  font-weight: 600;
  letter-spacing: 1px;
}

.footer-links {
  display: flex;
  align-items: center;
  gap: 32px;
  flex-wrap: wrap;
  justify-content: center;
}

.footer-link {
  font-size: 0.92rem;
  color: var(--text-primary);
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s;
}
.footer-link:hover {
  color: var(--primary-color);
  text-decoration: underline;
}

.footer-bottom {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.footer-note {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.footer-copy {
  font-size: 0.72rem;
  color: var(--text-light);
}

/* ── 移动端底部 Tab Bar ── */
.mobile-tab-bar {
  display: none;
}

/* ══════════════════════════════════════════════
   桌面端滚动条
   ══════════════════════════════════════════════ */
@media (min-width: 769px) {
  ::-webkit-scrollbar { width: 10px; }
  ::-webkit-scrollbar-track { background: #f1f1f1; }
  ::-webkit-scrollbar-thumb { background: rgba(67, 160, 71, 0.4); border-radius: 5px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(67, 160, 71, 0.7); }
}

/* ══════════════════════════════════════════════
   平板端 992px
   ══════════════════════════════════════════════ */
@media (max-width: 992px) {
  .teachers-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* ══════════════════════════════════════════════
   移动端 App 模式 ≤768px
   ══════════════════════════════════════════════ */
@media (max-width: 768px) {
  /* 隐藏轨迹球（手机端不需要）*/
  .circle-container {
    display: none !important;
  }

  .page-container {
    padding-bottom: calc(var(--tab-bar-h) + var(--safe-bottom) + 8px);
  }

  .nav-dots,
  .pendant-container {
    display: none;
  }

  .header-inner {
    padding: 12px 16px;
    padding-top: calc(12px + var(--safe-top));
  }

  .header-right {
    gap: 8px;
  }

  .nav-link { display: none; }

  .menu-btn {
    display: flex;
  }

  .mobile-nav {
    display: flex;
  }

  /* ── Banner ── */
  .hero-section {
    padding-top: 0;
    min-height: auto;
    padding-bottom: 24px;
  }

  .hero-inner {
    padding: 0 16px;
    justify-content: center;
  }

  .hero-banner-wrapper {
    width: 100%;
  }

  .hero-banner {
    height: 56vw;
    min-height: 200px;
    max-height: 300px;
    border-radius: 16px;
  }

  .banner-nav-prev {
    left: 8px;
    width: 44px;
    height: 44px;
  }

  .banner-nav-next {
    right: 8px;
    width: 44px;
    height: 44px;
  }

  .banner-arrow { display: none; }

  .banner-nav-prev svg,
  .banner-nav-next svg {
    width: 20px;
    height: 20px;
  }

  .banner-dots {
    display: flex;
    justify-content: center;
    gap: 8px;
    position: absolute;
    bottom: 12px;
    left: 0; right: 0;
    z-index: 11;
  }

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: rgba(255,255,255,0.5);
    transition: all 0.3s;
  }

  .dot.active {
    width: 20px;
    border-radius: 3px;
    background: white;
  }

  /* ── 为什么选择我们 ── */
  .why-section {
    padding: 32px 16px;
    min-height: auto;
  }

  .why-inner {
    padding: 0;
    align-items: stretch;
    width: 100%;
  }

  .why-content-wrapper {
    width: 100%;
  }

  .why-content {
    width: 100%;
    padding: 24px 20px;
    border-radius: 16px;
  }

  .md-text {
    text-align: left;
    font-size: 15px;
    line-height: 1.7;
  }

  .md-text h3 {
    font-size: 17px;
    margin-top: 24px;
    margin-bottom: 12px;
    text-align: left;
  }

  .md-text p {
    line-height: 1.7;
    margin-bottom: 12px;
  }

  .section-title {
    font-size: 20px;
    margin-bottom: 24px;
    letter-spacing: 0.5px;
  }

  .section-title::before,
  .section-title::after {
    width: 60px;
  }

  .section-title::before { top: -16px; }
  .section-title::after { bottom: -16px; }

  /* ── 师资力量 ── */
  .teachers-section {
    padding: 32px 16px;
    min-height: auto;
    justify-content: center;
  }

  .teachers-inner {
    width: 100%;
  }

  .teachers-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    margin-top: 24px;
  }

  .teacher-card {
    padding: 20px 12px;
    border-radius: 16px;
  }

  .teacher-avatar {
    width: 88px; height: 88px;
    margin-bottom: 12px;
    border-width: 3px;
  }

  .teacher-name {
    font-size: 15px;
    margin-bottom: 4px;
  }

  .teacher-title {
    font-size: 13px;
    margin-bottom: 8px;
  }

  .teacher-desc {
    font-size: 12px;
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  /* ── 照片墙 ── */
  .gallery-section {
    padding: 40px 0 10px;
  }

  .gallery-header .section-title {
    font-size: 22px;
  }

  .gallery-subtitle {
    font-size: 13px;
  }

  .gallery-grid {
    grid-template-columns: repeat(3, 1fr);
    grid-auto-rows: 90px;
    gap: 8px;
  }

  .gallery-photo {
    border-radius: 8px;
  }

  /* ── 页脚 ── */
  .page-footer {
    padding: 32px 16px 24px;
  }

  .footer-links {
    gap: 20px;
  }

  .footer-link {
    font-size: 0.85rem;
  }

  .footer-bottom {
    gap: 4px;
  }

  .footer-link { font-size: 13px; }
  .footer-note { font-size: 11px; }

  /* ── 底部 Tab Bar - 磨砂玻璃效果 ── */
  .mobile-tab-bar {
    display: flex;
    position: fixed;
    bottom: 16px; /* 悬浮效果 */
    left: 16px;
    right: 16px;
    height: var(--tab-bar-h);
    background: rgba(255, 255, 255, 0.65);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border-radius: 24px; /* 圆角 */
    border: 1px solid rgba(255, 255, 255, 0.3);
    box-shadow: 
      0 8px 32px rgba(0, 0, 0, 0.08),
      0 2px 8px rgba(0, 0, 0, 0.04),
      inset 0 1px 0 rgba(255, 255, 255, 0.5);
    z-index: 200;
    justify-content: space-around;
    align-items: center;
    padding: 0 8px;
    margin-bottom: var(--safe-bottom);
  }

  .tab-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    color: rgba(0, 0, 0, 0.5);
    font-size: 11px;
    font-weight: 500;
    min-width: 64px;
    min-height: var(--tab-bar-h);
    gap: 4px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    -webkit-tap-highlight-color: transparent;
    border-radius: 16px;
    padding: 4px 12px;
  }

  .tab-item.router-link-active,
  .tab-item.active {
    color: #3498db;
    background: rgba(52, 152, 219, 0.12);
  }

  .tab-icon {
    width: 22px;
    height: 22px;
    stroke-width: 1.8;
    transition: all 0.3s ease;
  }

  .tab-item.router-link-active .tab-icon,
  .tab-item.active .tab-icon {
    stroke-width: 2.2;
    transform: scale(1.1);
  }

  .tab-cta {
    background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
    color: white !important;
    border-radius: 16px;
    padding: 6px 14px;
    box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
  }

  .tab-cta .tab-icon {
    color: white;
    stroke: white;
  }

  .tab-cta.router-link-active,
  .tab-cta.active {
    background: linear-gradient(135deg, #45a049 0%, #3d8b40 100%);
    box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4);
  }
}

/* ══════════════════════════════════════════════
   小屏手机 ≤480px
   ══════════════════════════════════════════════ */
@media (max-width: 480px) {
  .hero-banner {
    height: 52vw;
    min-height: 170px;
    max-height: 240px;
    border-radius: 14px;
  }

  .teachers-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .teacher-card {
    padding: 16px 10px;
  }

  .teacher-avatar {
    width: 72px; height: 72px;
  }

  .teacher-name { font-size: 14px; }
  .teacher-title { font-size: 12px; }
  .teacher-desc { font-size: 11px; }

  .section-title { font-size: 18px; }

  .why-content {
    padding: 20px 16px;
  }

  .md-text { font-size: 14px; }
  .md-text h3 { font-size: 16px; }
}
</style>
