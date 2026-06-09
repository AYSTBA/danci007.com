<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { Banner, PageContents, Teacher } from '../types';
import { normalizeActive } from '../types';
import { useLanguage } from '../composables/useLanguage';
import { useBannerCarousel } from '../composables/useBannerCarousel';
import { getImageUrl, getAvatarUrl, renderMarkdown, sanitizeHtml, fetchJson } from '../utils';
import DomeGallery from '../components/DomeGallery.vue';
import Grainient from '../components/Grainient.vue';

gsap.registerPlugin(ScrollTrigger);

const router = useRouter();
const { currentLang, showLangDropdown, toggleLanguage, selectLanguage } = useLanguage();

const banners = ref<Banner[]>([]);
const pageContents = ref<PageContents>({});
const teachers = ref<Teacher[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

const galleryPhotos = Array.from({ length: 12 }, (_, i) => ({
  url: `/images/gallery/photo-${String(i + 1).padStart(2, '0')}.jpg`,
}));

const { currentBannerIndex, stopAutoPlay, nextBanner, prevBanner } = useBannerCarousel(banners);

let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchStartTime = 0;

const onTouchStart = (e: TouchEvent) => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
  touchStartTime = Date.now();
  stopAutoPlay();
};

const onTouchMove = (e: TouchEvent) => {
  const dx = Math.abs(e.touches[0].clientX - touchStartX);
  const dy = Math.abs(e.touches[0].clientY - touchStartY);
  if (dx > dy && dx > 10) e.preventDefault();
};

const onTouchEnd = (e: TouchEvent) => {
  touchEndX = e.changedTouches[0].clientX;
  const dx = touchStartX - touchEndX;
  const dy = Math.abs(e.changedTouches[0].clientY - touchStartY);
  const elapsed = Date.now() - touchStartTime;
  if (Math.abs(dx) > 40 && Math.abs(dx) > dy * 1.5 && elapsed < 800) {
    if (dx > 0) nextBanner();
    else prevBanner();
  }
};

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
    banners.value = bannerData.map((b: any) => ({ ...b, active: normalizeActive(b.active) }));
    pageContents.value = contents;
    teachers.value = teacherData.map((t: any) => ({ ...t, active: normalizeActive(t.active) }));
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

const getBannerImage = (banner: Banner) => {
  if (currentLang.value === 'en') return banner.image_url_en || banner.image_url;
  return banner.image_url || banner.image_url_en;
};

const getBannerTitle = (banner: Banner) => {
  if (currentLang.value === 'en') return banner.title_en || banner.title;
  return banner.title || banner.title_en;
};

// ── Animation refs ──
const heroRef = ref<HTMLElement | null>(null);
const heroTextOverlayRef = ref<HTMLElement | null>(null);
const heroTitleRef = ref<HTMLElement | null>(null);
const heroSubRef = ref<HTMLElement | null>(null);
const whySectionRef = ref<HTMLElement | null>(null);
const whyTitleRef = ref<HTMLElement | null>(null);
const whyContentRef = ref<HTMLElement | null>(null);
const teachersSectionRef = ref<HTMLElement | null>(null);
const teachersTitleRef = ref<HTMLElement | null>(null);
const teachersGridRef = ref<HTMLElement | null>(null);
const gallerySectionRef = ref<HTMLElement | null>(null);
const galleryTitleRef = ref<HTMLElement | null>(null);
const galleryGridRef = ref<HTMLElement | null>(null);
const curtainRef = ref<HTMLElement | null>(null);

const shouldAnimate = !sessionStorage.getItem('home_animated');

const isMobile = ref(window.innerWidth < 769);
const domeMinRadius = computed(() => isMobile.value ? 250 : 600);

let ctx: gsap.Context | null = null;

function initAnimations() {
  ctx = gsap.context(() => {
    const isMobile = window.innerWidth < 769;
    const mm = ScrollTrigger.matchMedia();

    if (shouldAnimate) {
      // ── Opening animation (only on fresh page load) ──
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      // Curtain slides up
      if (curtainRef.value) {
        tl.to(curtainRef.value, {
          y: '-100%',
          duration: 1.4,
          ease: 'power4.inOut',
        });
      }

      // Hero title: compress-restore entrance
      if (heroTitleRef.value) {
        tl.fromTo(heroTitleRef.value,
          { scaleX: 0.6, scaleY: 1.4, y: 60, opacity: 0 },
          { scaleX: 1, scaleY: 1, y: 0, opacity: 1, duration: 1.2, ease: 'power4.out' },
          '-=0.6'
        );
      }

      // Hero subtitle
      if (heroSubRef.value) {
        tl.fromTo(heroSubRef.value,
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.9, ease: 'power2.out' },
          '-=0.4'
        );
      }

      // Banner fade in
      if (heroRef.value) {
        tl.fromTo(heroRef.value.querySelector('.hero-banner-wrapper'),
          { opacity: 0, scale: 0.95 },
          { opacity: 1, scale: 1, duration: 1.2, ease: 'power2.out' },
          '-=0.5'
        );
      }

      // Hero text fades out after banner appears
      if (heroTextOverlayRef.value) {
        tl.to(heroTextOverlayRef.value, {
          opacity: 0,
          y: -20,
          duration: 0.5,
          ease: 'power2.in',
        }, '-=0.3');
      }
    } else {
      // SPA navigation — no welcome animation, show final state immediately
      if (curtainRef.value) curtainRef.value.style.display = 'none';
      if (heroTextOverlayRef.value) {
        gsap.set(heroTextOverlayRef.value, { opacity: 0 });
      }
      if (heroRef.value) {
        const wrapper = heroRef.value.querySelector('.hero-banner-wrapper');
        if (wrapper) gsap.set(wrapper, { opacity: 1, scale: 1 });
      }
    }

    // ── Scroll-triggered: Why section ──
    if (!isMobile) {
      // Why section title
      if (whyTitleRef.value) {
        gsap.fromTo(whyTitleRef.value,
          { y: 100, opacity: 0, scale: 0.9 },
          {
            y: 0, opacity: 1, scale: 1,
            duration: 1.2, ease: 'power3.out',
            scrollTrigger: {
              trigger: whySectionRef.value,
              start: 'top 75%',
              toggleActions: 'play none none none',
            }
          }
        );
      }

      // Why content stagger
      if (whyContentRef.value) {
        const items = whyContentRef.value.querySelectorAll('h3, p');
        gsap.fromTo(items,
          { y: 50, opacity: 0, rotateX: 5 },
          {
            y: 0, opacity: 1, rotateX: 0,
            duration: 0.9, stagger: 0.15,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: whyContentRef.value,
              start: 'top 80%',
              toggleActions: 'play none none none',
            }
          }
        );
      }

      // ── Teachers section ──
      if (teachersTitleRef.value) {
        gsap.fromTo(teachersTitleRef.value,
          { y: 100, opacity: 0, scale: 0.9 },
          {
            y: 0, opacity: 1, scale: 1,
            duration: 1.2, ease: 'power3.out',
            scrollTrigger: {
              trigger: teachersSectionRef.value,
              start: 'top 75%',
              toggleActions: 'play none none none',
            }
          }
        );
      }

      if (teachersGridRef.value) {
        const cards = teachersGridRef.value.querySelectorAll('.teacher-card');
        gsap.fromTo(cards,
          { y: 80, opacity: 0, scale: 0.92 },
          {
            y: 0, opacity: 1, scale: 1,
            duration: 0.9, stagger: 0.12,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: teachersGridRef.value,
              start: 'top 80%',
              toggleActions: 'play none none none',
            }
          }
        );
      }

      // ── Gallery section ──
      if (galleryTitleRef.value) {
        gsap.fromTo(galleryTitleRef.value,
          { y: 80, opacity: 0 },
          {
            y: 0, opacity: 1, duration: 1, ease: 'power3.out',
            scrollTrigger: {
              trigger: gallerySectionRef.value,
              start: 'top 75%',
              toggleActions: 'play none none none',
            }
          }
        );
      }
    } else {
      // Mobile: no scroll-triggered animations
    }

    ScrollTrigger.refresh();
  }, document.getElementById('home-root') || undefined);
}

onMounted(async () => {
  await loadData();
  await nextTick();
  initAnimations();
  if (shouldAnimate) sessionStorage.setItem('home_animated', 'true');
  window.addEventListener('scroll', updateNavVisibility);
  updateNavVisibility();
});

onUnmounted(() => {
  if (ctx) ctx.revert();
  window.removeEventListener('scroll', updateNavVisibility);
  stopAutoPlay();
});

const updateNavVisibility = () => {
  const scrollY = window.scrollY;
  if (scrollY > lastScrollY.value && scrollY > 100) {
    isNavVisible.value = false;
  } else {
    isNavVisible.value = true;
  }
  lastScrollY.value = scrollY;
};

const siteTitle = computed(() => {
  return currentLang.value === 'zh'
    ? (pageContents.value.site_name || '中萱文化')
    : (pageContents.value.site_name_en || 'Zhongxuan Culture');
});
</script>

<template>
  <div id="home-root">
    <!-- Background -->
    <Grainient
      color1="#c1c2c1"
      color2="#6ad67b"
      color3="#5584cf"
      :timeSpeed="1"
      :colorBalance="0"
      :warpStrength="0.8"
      :warpFrequency="5"
      :warpSpeed="1.9"
      :warpAmplitude="50"
      :blendAngle="0"
      :blendSoftness="0.38"
      :rotationAmount="850"
      :noiseScale="2"
      :grainAmount="0"
      :grainScale="2"
      :grainAnimated="false"
      :contrast="1.55"
      :gamma="0.95"
      :saturation="0.95"
      :centerX="0.09"
      :centerY="0"
      :zoom="0.85"
      class="page-bg"
    />

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

    <div v-else class="page-container">
      <!-- Curtain overlay -->
      <div ref="curtainRef" class="curtain-overlay"></div>

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

      <!-- Banner 轮播 -->
      <section ref="heroRef" id="hero" class="hero-section">
        <div ref="heroTextOverlayRef" class="hero-text-overlay">
          <h1 ref="heroTitleRef" class="hero-main-title">
            {{ currentLang === 'zh'
              ? (pageContents.hero_title || '欢迎来到深圳市龙岗区教学点')
              : (pageContents.hero_title_en || 'Welcome to Longgang District Teaching Center') }}
          </h1>
          <p ref="heroSubRef" class="hero-subtitle">
            {{ currentLang === 'zh'
              ? (pageContents.hero_subtitle || '单词突击007 - 智能单词学习系统')
              : (pageContents.hero_subtitle_en || 'Word Assault 007 - Intelligent Word Learning System') }}
          </p>
        </div>
        <div class="hero-inner">
          <div class="hero-banner-wrapper">
            <div class="hero-banner" @touchstart="onTouchStart" @touchmove="onTouchMove" @touchend="onTouchEnd">
              <img
                v-for="(banner, index) in banners"
                :key="banner.id"
                :src="getImageUrl(getBannerImage(banner))"
                :alt="getBannerTitle(banner)"
                :class="['banner-img', { active: index === currentBannerIndex }]"
                draggable="false"
              />
              <div v-if="banners.length === 0" class="banner-placeholder">
                <span>{{ currentLang === 'zh' ? '活动图片' : 'Activity Image' }}</span>
              </div>
              <button class="banner-nav-prev glass-btn" @click.stop="prevBanner">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M15 19l-7-7 7-7"/>
                </svg>
              </button>
              <button class="banner-nav-next glass-btn" @click.stop="nextBanner">
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
      <section ref="whySectionRef" id="why" class="why-section">
        <div class="why-inner">
          <div class="why-content-wrapper">
            <h2 ref="whyTitleRef" class="section-title">{{ currentLang === 'zh' ? (pageContents.why_title || '为什么选择我们') : (pageContents.why_title_en || 'Why Choose Us') }}</h2>
            <div ref="whyContentRef" class="why-content">
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
      <section ref="teachersSectionRef" id="teachers" class="teachers-section">
        <div class="teachers-inner">
          <h2 ref="teachersTitleRef" class="section-title">{{ currentLang === 'zh' ? '我们的师资力量' : 'Our Teachers' }}</h2>
          <div ref="teachersGridRef" class="teachers-grid">
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
      <section ref="gallerySectionRef" id="gallery" class="gallery-section">
        <div class="gallery-header">
          <h2 ref="galleryTitleRef" class="section-title">{{ currentLang === 'zh' ? '学员风采' : 'Student Gallery' }}</h2>
          <p class="gallery-subtitle">{{ currentLang === 'zh' ? '记录每一位学员的成长瞬间' : 'Moments of every student\'s growth' }}</p>
        </div>
        <div ref="galleryGridRef" class="dome-container">
          <DomeGallery
            :images="galleryPhotos.map(p => p.url)"
            :fit="0.5"
            :min-radius="domeMinRadius"
            :max-vertical-rotation-deg="9"
            :segments="20"
            :drag-sensitivity="12"
            :drag-dampening="3.8"
            :grayscale="false"
          />
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
          <a v-if="currentLang === 'zh'" class="footer-icp" href="https://icp.gov.moe/?keyword=20260235" target="_blank" rel="noopener noreferrer">✮ 萌ICP备20260235号 ✮</a>
        </div>
      </footer>
    </div>
  </div>
</template>

<style scoped>
/* ══════════════════════════════════════════════
   Curtain overlay
   ══════════════════════════════════════════════ */
.curtain-overlay {
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background: #1a1a2e;
  z-index: 999;
  pointer-events: none;
}

/* ══════════════════════════════════════════════
   Page background (Grainient)
   ══════════════════════════════════════════════ */
.page-bg {
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  z-index: 0;
  pointer-events: none;
}

/* ══════════════════════════════════════════════
   桌面端基础样式
   ══════════════════════════════════════════════ */
.page-container {
  min-height: 100vh;
  background: transparent;
  position: relative;
  z-index: 1;
  overflow-x: hidden;
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

.header-left { display: flex; align-items: center; gap: 4px; }

.site-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
  letter-spacing: 0.5px;
}

.header-right { display: flex; align-items: center; gap: 30px; }

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
  width: 44px; height: 44px;
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

.lang-dropdown-content a:hover { background: rgba(0,0,0,0.05); }

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

.menu-btn span { width: 20px; height: 2px; background: #555; border-radius: 2px; }

.mobile-nav {
  display: none;
  background: rgba(255,255,255,0.98);
  padding: 16px 20px;
  flex-direction: column;
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

.mobile-nav a:last-child { border-bottom: none; }

/* ── Hero text overlay ── */
.hero-text-overlay {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  z-index: 15;
  text-align: center;
  pointer-events: none;
  width: 100%;
  max-width: 900px;
  padding: 20px 40px;
}

.hero-main-title {
  font-size: clamp(2rem, 4vw, 3.5rem);
  font-weight: 700;
  color: #2c3e50;
  letter-spacing: 2px;
  line-height: 1.3;
  margin: 0 0 20px;
  text-shadow: 0 2px 12px rgba(255,255,255,0.5);
  will-change: transform, opacity;
}

.hero-subtitle {
  font-size: clamp(1rem, 1.8vw, 1.4rem);
  color: #555;
  font-weight: 400;
  letter-spacing: 4px;
  margin: 0;
  will-change: transform, opacity;
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
  justify-content: center;
  padding: 0 45px;
}

.hero-banner-wrapper {
  position: relative;
  width: 100%;
  max-width: 1600px;
}

.hero-banner {
  position: relative;
  width: 100%;
  aspect-ratio: 21/9;
  background: #e8e8e8;
  border-radius: 20px;
  overflow: hidden;
}

.banner-img {
  position: absolute;
  width: 100%; height: 100%;
  object-fit: contain;
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

.banner-dots { display: none; }

/* ── 为什么选择我们 ── */
.why-section {
  min-height: 100vh;
  display: flex;
  align-items: center;
  width: 100%;
  justify-content: center;
  padding: 80px 45px;
  background: transparent;
  position: relative;
  z-index: 1;
}

.why-inner {
  width: 100%;
  max-width: 1600px;
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
  border-radius: 24px;
  background: rgba(255,255,255,0.5);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.7);
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

.md-text p { margin: 0 0 15px 0; padding: 0; line-height: 2.2; }
.md-text p:last-child { margin-bottom: 0; }
.md-text strong { color: #333; font-weight: 600; }
.md-text br { display: block; content: ""; margin-top: 0.3em; }

/* ── 师资力量 ── */
.teachers-section {
  min-height: 100vh;
  display: flex;
  align-items: center;
  width: 100%;
  justify-content: center;
  padding: 0 45px;
  background: transparent;
  position: relative;
  z-index: 1;
}

.teachers-inner {
  width: 100%;
  max-width: 1600px;
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
  background: rgba(255,255,255,0.5);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.7);
  border-radius: 20px;
  padding: 30px;
  text-align: center;
  box-shadow: 0 10px 40px rgba(0,0,0,0.06);
  transition: transform 0.3s, box-shadow 0.3s;
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

.gallery-section {
  position: relative;
  z-index: 1;
  padding: 60px 0 20px;
  width: 100%;
}

.gallery-header {
  text-align: center;
  margin-bottom: 0;
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

.dome-container {
  width: 100%;
  height: 80vh;
  min-height: 500px;
  max-height: 800px;
  position: relative;
  overflow: hidden;
}

/* ══════════════════════════════════════════════
   页脚
   ══════════════════════════════════════════════ */
.page-footer {
  padding: 48px 40px 32px;
  text-align: center;
  border-top: none;
  background: transparent;
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

.footer-link:hover { color: var(--primary-color); text-decoration: underline; }

.footer-bottom {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.footer-note { font-size: 0.75rem; color: var(--text-secondary); }
.footer-copy { font-size: 0.72rem; color: var(--text-light); }
.footer-icp { font-size: 0.72rem; color: var(--text-light); text-decoration: none; transition: color 0.2s; }
.footer-icp:hover { color: var(--primary-color); }

.mobile-tab-bar { display: none; }

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
   平板端
   ══════════════════════════════════════════════ */
@media (max-width: 992px) {
  .teachers-grid { grid-template-columns: repeat(2, 1fr); }
}

/* ══════════════════════════════════════════════
   移动端
   ══════════════════════════════════════════════ */
@media (max-width: 768px) {
  .page-container { padding-bottom: calc(var(--tab-bar-h) + var(--safe-bottom) + 8px); }

  .header-inner { padding: 12px 16px; padding-top: calc(12px + var(--safe-top)); }
  .header-right { gap: 8px; }
  .nav-link { display: none; }
  .menu-btn { display: flex; }
  .mobile-nav { display: flex; }

  .hero-text-overlay {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    padding: 0 16px;
    width: 100%;
    max-width: 100%;
    text-align: center;
    pointer-events: none;
  }

  .hero-section {
    padding-top: 60px;
    min-height: auto;
    padding-bottom: 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .hero-inner { padding: 0 16px; justify-content: center; }
  .hero-banner-wrapper { width: 100%; }
  .hero-banner { border-radius: 16px; touch-action: pan-y; }

  .banner-nav-prev { left: 8px; width: 44px; height: 44px; }
  .banner-nav-next { right: 8px; width: 44px; height: 44px; }
  .banner-arrow { display: none; }
  .banner-nav-prev svg, .banner-nav-next svg { width: 20px; height: 20px; }

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
    width: 6px; height: 6px;
    border-radius: 50%;
    background: rgba(255,255,255,0.5);
    transition: all 0.3s;
  }

  .dot.active {
    width: 20px;
    border-radius: 3px;
    background: white;
  }

  .why-section {
    padding: 32px 16px;
    min-height: auto;
  }

  .why-inner { padding: 0; align-items: stretch; width: 100%; }
  .why-content-wrapper { width: 100%; }
  .why-content { width: 100%; padding: 24px 20px; border-radius: 16px; }

  .md-text {
    text-align: left;
    font-size: 15px;
    line-height: 1.7;
  }

  .md-text h3 { font-size: 17px; margin-top: 24px; margin-bottom: 12px; text-align: left; }
  .md-text p { line-height: 1.7; margin-bottom: 12px; }

  .section-title { font-size: 20px; margin-bottom: 24px; letter-spacing: 0.5px; }
  .section-title::before,
  .section-title::after { width: 60px; }
  .section-title::before { top: -16px; }
  .section-title::after { bottom: -16px; }

  .teachers-section {
    padding: 32px 16px;
    min-height: auto;
    justify-content: center;
  }

  .teachers-inner { width: 100%; }
  .teachers-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 24px; }
  .teacher-card { padding: 20px 12px; border-radius: 16px; }
  .teacher-avatar { width: 88px; height: 88px; margin-bottom: 12px; border-width: 3px; }
  .teacher-name { font-size: 15px; margin-bottom: 4px; }
  .teacher-title { font-size: 13px; margin-bottom: 8px; }
  .teacher-desc { font-size: 12px; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }

  .gallery-section { padding: 40px 0 10px; }
  .gallery-header .section-title { font-size: 22px; }
  .gallery-subtitle { font-size: 13px; }
  .dome-container { height: 80vh; min-height: 400px; max-height: 700px; }

  .page-footer { padding: 32px 16px 24px; }
  .footer-links { gap: 20px; }
  .footer-link { font-size: 0.85rem; }
  .footer-bottom { gap: 4px; }
  .footer-link { font-size: 13px; }
  .footer-note { font-size: 11px; }

  .mobile-tab-bar {
    display: flex;
    position: fixed;
    bottom: 16px;
    left: 16px;
    right: 16px;
    height: var(--tab-bar-h);
    background: rgba(255, 255, 255, 0.65);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border-radius: 24px;
    border: 1px solid rgba(255, 255, 255, 0.3);
    box-shadow: 0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.5);
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
    color: rgba(0,0,0,0.5);
    font-size: 11px;
    font-weight: 500;
    min-width: 64px;
    min-height: var(--tab-bar-h);
    gap: 4px;
    transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
    -webkit-tap-highlight-color: transparent;
    border-radius: 16px;
    padding: 4px 12px;
  }

  .tab-item.router-link-active,
  .tab-item.active {
    color: #3498db;
    background: rgba(52,152,219,0.12);
  }

  .tab-icon { width: 22px; height: 22px; stroke-width: 1.8; transition: all 0.3s ease; }

  .tab-item.router-link-active .tab-icon,
  .tab-item.active .tab-icon { stroke-width: 2.2; transform: scale(1.1); }

  .tab-cta {
    background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
    color: white !important;
    border-radius: 16px;
    padding: 6px 14px;
    box-shadow: 0 4px 12px rgba(76,175,80,0.3);
  }

  .tab-cta .tab-icon { color: white; stroke: white; }

  .tab-cta.router-link-active,
  .tab-cta.active {
    background: linear-gradient(135deg, #45a049 0%, #3d8b40 100%);
    box-shadow: 0 6px 20px rgba(76,175,80,0.4);
  }
}

@media (max-width: 480px) {
  .hero-banner { border-radius: 14px; }
  .teachers-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .teacher-card { padding: 16px 10px; }
  .teacher-avatar { width: 72px; height: 72px; }
  .teacher-name { font-size: 14px; }
  .teacher-title { font-size: 12px; }
  .teacher-desc { font-size: 11px; }
  .section-title { font-size: 18px; }
  .why-content { padding: 20px 16px; }
  .md-text { font-size: 14px; }
  .md-text h3 { font-size: 16px; }
}
</style>
