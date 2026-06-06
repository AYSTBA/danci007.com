<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import type { Banner, PageContents } from '../types'
import { normalizeActive } from '../types'
import { useLanguage } from '../composables/useLanguage'
import { useBannerCarousel } from '../composables/useBannerCarousel'
import { getImageUrl, goBack, fetchJson } from '../utils'

const router = useRouter()
const { currentLang } = useLanguage()

const banners = ref<Banner[]>([])
const pageContents = ref<PageContents>({})
const loading = ref(true)
const error = ref<string | null>(null)

const { currentBannerIndex, stopBannerAutoPlay, nextBanner, prevBanner } =
  useBannerCarousel(banners)

const loadData = async () => {
  loading.value = true
  error.value = null
  try {
    const [bannerData, contents] = await Promise.all([
      fetchJson<Banner[]>('/api/banners'),
      fetchJson<PageContents>('/api/pages/home/contents')
    ])
    banners.value = bannerData.map((b: any) => ({
      ...b,
      active: normalizeActive(b.active)
    }))
    pageContents.value = contents
  } catch (e: any) {
    error.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}

const siteName = computed(() => currentLang.value === 'zh'
  ? (pageContents.value.site_name || '中萱文化')
  : (pageContents.value.site_name_en || 'Zhongxuan Culture'))

const siteNote = computed(() => currentLang.value === 'zh'
  ? (pageContents.value.site_note || '中萱百日学通文化的简称')
  : (pageContents.value.site_note_en || 'Abbreviation for Zhongxuan Bairixuetong Culture'))

const t = computed(() => {
  const isZh = currentLang.value === 'zh'
  return {
    about: isZh ? '关于我们' : 'About Us',
    features_title: isZh ? '我们的特色与优势' : 'Our Features & Advantages',
    brand: siteName.value,
    slogan: isZh ? '让每个孩子都能轻松学好英语' : 'Making English easy for every child',
    description: isZh
      ? '中萱文化（原单词突击007）是一家深耕AI智能英语教育领域十年的专业机构，以德国心理学家赫尔曼·艾宾浩斯的遗忘曲线理论为基石，深度融合大数据、AI人工智能与遗传学算法，为全国中小学生提供精准化、个性化的英语单词学习解决方案。'
      : 'Zhongxuan Culture (formerly Danci007) is a professional institution with 10 years of deep experience in AI-powered English education. Based on Hermann Ebbinghaus\' Forgetting Curve theory, it integrates big data, AI, and genetic algorithms to provide precise, personalized English vocabulary learning solutions for students nationwide.',
    course1_desc: isZh
      ? '系统采用线上AI智能训练+线下专业老师指导的OMO双轨教学模式，涵盖全方位语音识别、多维度语音测评、高精准度语音纠错及AI智能MRS记忆雷达系统，覆盖单词、词组、短语、句子、作文等全维度英语学习。'
      : 'The system adopts an OMO dual-track model combining online AI training with offline professional guidance. It features comprehensive voice recognition, multi-dimensional voice assessment, high-precision pronunciation correction, and AI MRS Memory Radar, covering words, phrases, sentences, essays, and more.',
    facts: isZh ? '数据说话' : 'Numbers Speak',
    textbooks: isZh ? '教材' : 'Textbooks',
    words: isZh ? '单词' : 'Words',
    students: isZh ? '学生' : 'Students',
    teachers_: isZh ? '老师' : 'Teachers',
    agents: isZh ? '合作机构' : 'Agents',
    features: isZh ? '课程特色' : 'Course Features',
    personal_title: isZh ? 'AI个性化学习' : 'AI Personalized Learning',
    personal_desc: isZh ? '基于艾宾浩斯遗忘曲线与抓错定位算法，精准界定熟词/夹生词/陌生词，AI自动生成复习方案，让每一次学习都高效' : 'Based on Ebbinghaus Forgetting Curve and error-detection algorithm, precisely categorizes words and auto-generates review plans',
    fourdim_title: isZh ? '四维记忆体系' : '4D Memory System',
    fourdim_desc: isZh ? '全方位语音识别+多维度语音测评+高精准纠错系统+遗传算法，四维一体形成完整记忆画面' : 'Voice recognition, voice assessment, pronunciation correction, and genetic algorithms form a complete memory picture',
    alpha_title: isZh ? '阿尔法波音乐' : 'Alpha Brainwave Music',
    alpha_desc: isZh ? '科学激活右脑记忆区，提升专注力与记忆效率，缓解学习压力，让学习更轻松' : 'Activates right-brain memory areas scientifically, improving focus and memory efficiency',
    supervision_title: isZh ? 'OMO全程督学' : 'OMO Full Supervision',
    supervision_desc: isZh ? '线上AI智能训练+线下专业老师指导，即时掌握学习进度，标准化流程确保每个孩子不掉队' : 'Online AI training + offline professional guidance, real-time progress tracking for every student',
    mission: isZh ? '我们的使命' : 'Our Mission',
    mission_desc: isZh
      ? '致力于通过最科学的记忆方法与最前沿的AI技术，帮助每一位学生轻松掌握英语单词、提升英语能力。十年技术沉淀，1800万+学员验证，我们坚信：每个孩子都有学好英语的潜力，而科学的工具与方法能让这一过程事半功倍。'
      : 'Dedicated to helping every student master English words and improve their abilities through the most scientific memory methods and cutting-edge AI technology. With 10 years of technical积淀, proven by 18 million+ students, we believe every child has the potential to learn English well.'
  }
})

const stats = computed(() => [
  { value: '1852+', label: t.value.textbooks },
  { value: '67万+', label: t.value.words },
  { value: '882万+', label: t.value.students },
  { value: '10万+', label: t.value.teachers_ },
  { value: '8600+', label: t.value.agents }
])

const features = computed(() => [
  { id: 1, title: t.value.personal_title, desc: t.value.personal_desc },
  { id: 2, title: t.value.fourdim_title, desc: t.value.fourdim_desc },
  { id: 3, title: t.value.alpha_title, desc: t.value.alpha_desc },
  { id: 4, title: t.value.supervision_title, desc: t.value.supervision_desc }
])

onMounted(loadData)
onUnmounted(stopBannerAutoPlay)
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
  <div v-else class="about-page">
    <!-- 顶部导航 -->
    <header class="about-header">
      <div class="header-inner">
        <button class="back-btn" @click="goBack">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
        </button>
        <span class="header-title">{{ t.about }}</span>
        <div class="lang-dropdown" style="margin-left:auto">
          <div class="lang-dropdown" v-if="currentLang">
            <span class="lang-badge">{{ currentLang === 'zh' ? '中' : 'EN' }}</span>
          </div>
        </div>
      </div>
    </header>

    <!-- Banner 轮播 -->
    <section class="banner-section">
      <div class="banner-wrapper">
        <div class="banner-slider">
          <img
            v-for="(banner, index) in banners"
            :key="banner.id"
            :src="getImageUrl(currentLang === 'en' && banner.image_url_en ? banner.image_url_en : banner.image_url)"
            :alt="currentLang === 'en' && banner.title_en ? banner.title_en : banner.title"
            :class="['banner-img', { active: index === currentBannerIndex }]"
          />
          <div v-if="banners.length === 0" class="banner-placeholder">
            <span>{{ currentLang === 'zh' ? '活动展示' : 'Activity Display' }}</span>
          </div>
          <button class="banner-nav banner-nav-prev" @click="prevBanner">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 19l-7-7 7-7"/></svg>
          </button>
          <button class="banner-nav banner-nav-next" @click="nextBanner">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5l7 7-7 7"/></svg>
          </button>
          <div v-if="banners.length > 1" class="banner-dots">
            <span v-for="(_, index) in banners" :key="index" :class="['dot', { active: index === currentBannerIndex }]"></span>
          </div>
        </div>
      </div>
    </section>

    <!-- 品牌介绍 -->
    <section class="about-intro">
      <div class="container">
        <div class="intro-content">
          <div class="intro-text">
            <h2>{{ t.brand }}</h2>
            <p class="slogan">{{ t.slogan }}</p>
            <p>{{ t.description }}</p>
            <p>{{ t.course1_desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 数据统计 -->
    <section class="stats-section">
      <div class="container">
        <h2 class="section-title">{{ t.facts }}</h2>
        <div class="stats-grid">
          <div v-for="stat in stats" :key="stat.label" class="stat-card">
            <div class="stat-value">{{ stat.value }}</div>
            <div class="stat-label">{{ stat.label }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- 课程特色 -->
    <section class="about-features">
      <div class="container">
        <h2 class="section-title">{{ t.features }}</h2>
        <div class="features-grid">
          <div v-for="feature in features" :key="feature.id" class="feature-card">
            <h3>{{ feature.title }}</h3>
            <p>{{ feature.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 使命 -->
    <section class="about-mission">
      <div class="container">
        <div class="mission-content">
          <h2>{{ t.mission }}</h2>
          <p>{{ t.mission_desc }}</p>
        </div>
      </div>
    </section>

    <!-- 底部信息 -->
    <footer class="about-footer">
      <span>{{ siteName }}</span>
      <span class="footer-note">{{ siteNote }}</span>
      <a class="icp-link" href="https://icp.gov.moe/?keyword=20260235" target="_blank" rel="noopener noreferrer">✮ 萌ICP备20260235号 ✮</a>
    </footer>

  </div>
</template>

<style scoped>
.about-page {
  min-height: 100vh;
  background: var(--bg-secondary);
}

/* ── 顶部导航 ── */
.about-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: #fff;
  border-bottom: 0.5px solid var(--border-light);
}

.header-inner {
  display: flex;
  align-items: center;
  height: 48px;
  padding: 0 8px;
  padding-top: env(safe-area-inset-top, 0px);
}

.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  background: none;
  border: none;
  cursor: pointer;
  color: #333;
  flex-shrink: 0;
}

.back-btn:active { opacity: 0.6; }

.header-title {
  flex: 1;
  text-align: center;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  padding-right: 44px;
}

.lang-badge {
  font-size: 11px;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  padding: 2px 8px;
  border-radius: 4px;
}

/* ── Banner ── */
.banner-section {
  padding: 16px;
}

.banner-wrapper {
  width: 100%;
}

.banner-slider {
  position: relative;
  width: 100%;
  height: 56vw;
  max-height: 300px;
  min-height: 200px;
  background: #e8e8e8;
  border-radius: 16px;
  overflow: hidden;
}

.banner-img {
  position: absolute;
  width: 100%;
  height: 100%;
  object-fit: contain;
  opacity: 0;
  transition: opacity 0.7s ease;
}

.banner-img.active { opacity: 1; }

.banner-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(to bottom, var(--primary-lighter), var(--primary-light), var(--primary-dark));
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255,255,255,0.6);
  font-size: 16px;
}

.banner-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 44px;
  height: 44px;
  cursor: pointer;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.3);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.5);
  border-radius: 50%;
  color: white;
  transition: all 0.3s;
}

.banner-nav:active { background: rgba(255,255,255,0.5); }
.banner-nav-prev { left: 8px; }
.banner-nav-next { right: 8px; }

.banner-dots {
  display: flex;
  justify-content: center;
  gap: 8px;
  position: absolute;
  bottom: 12px;
  left: 0;
  right: 0;
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

/* ── 内容区域 ── */
.container {
  padding: 0 16px;
  max-width: 800px;
  margin: 0 auto;
}

/* ── 品牌介绍 ── */
.about-intro {
  padding: 32px 0;
}

.intro-content {
  text-align: center;
}

.intro-text h2 {
  font-size: 22px;
  margin-bottom: 12px;
  color: #333;
}

.intro-text .slogan {
  font-size: 15px;
  color: var(--primary-color);
  font-weight: 500;
  margin-bottom: 16px;
}

.intro-text p {
  font-size: 14px;
  color: #666;
  line-height: 1.8;
  margin-bottom: 12px;
}

/* ── 数据统计 ── */
.stats-section {
  padding: 32px 0;
  background: #fff;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  text-align: center;
  margin-bottom: 24px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.stat-card {
  text-align: center;
  padding: 20px 12px;
  background: #fafafa;
  border-radius: 12px;
  transition: all 0.3s;
}

.stat-card:active { transform: scale(0.95); }

.stat-value {
  font-size: 22px;
  font-weight: 700;
  color: var(--primary-color);
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: #999;
}

/* ── 课程特色 ── */
.about-features {
  padding: 32px 0;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.feature-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px 16px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  transition: all 0.3s;
}

.feature-card:active { transform: scale(0.97); }

.feature-card h3 {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.feature-card p {
  font-size: 13px;
  color: #888;
  line-height: 1.6;
  margin: 0;
}

/* ── 使命 ── */
.about-mission {
  padding: 48px 16px;
  background: linear-gradient(to bottom, var(--primary-light), var(--primary-dark));
  text-align: center;
}

.mission-content h2 {
  font-size: 20px;
  font-weight: 600;
  color: white;
  margin-bottom: 12px;
}

.mission-content p {
  max-width: 600px;
  margin: 0 auto;
  color: rgba(255,255,255,0.9);
  font-size: 14px;
  line-height: 1.8;
}

/* ── 底部 ── */
.about-footer {
  padding: 24px 16px;
  padding-bottom: calc(24px + env(safe-area-inset-bottom, 0px));
  text-align: center;
  font-size: 13px;
  color: #999;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.footer-note {
  font-size: 11px;
  color: #bbb;
}

.icp-link {
  font-size: 11px;
  color: #bbb;
  text-decoration: none;
  transition: color 0.2s;
}
.icp-link:hover { color: var(--primary-color); }

/* ── PC 适配 ── */
@media (min-width: 768px) {
  .header-inner {
    height: 60px;
    padding: 0 24px;
    max-width: 1200px;
    margin: 0 auto;
  }

  .back-btn {
    width: 48px;
    height: 48px;
  }

  .header-title {
    font-size: 20px;
    font-weight: 700;
  }

  .banner-section {
    padding: 24px;
    max-width: 1200px;
    margin: 0 auto;
  }

  .banner-slider {
    height: 420px;
    max-height: none;
    min-height: 300px;
    border-radius: 20px;
  }

  .banner-nav {
    width: 48px;
    height: 48px;
  }
  .banner-nav-prev { left: 16px; }
  .banner-nav-next { right: 16px; }

  .banner-dots { bottom: 20px; }
  .dot { width: 10px; height: 10px; }
  .dot.active { width: 32px; border-radius: 5px; }

  .container {
    padding: 0 24px;
    max-width: 1200px;
  }

  .about-intro { padding: 60px 0; }

  .intro-text h2 { font-size: 32px; }

  .intro-text .slogan {
    font-size: 20px;
    margin-bottom: 24px;
  }

  .intro-text p {
    font-size: 16px;
    max-width: 800px;
    margin-left: auto;
    margin-right: auto;
  }

  .stats-section { padding: 60px 0; }

  .section-title { font-size: 28px; margin-bottom: 40px; }

  .stats-grid {
    grid-template-columns: repeat(5, 1fr);
    gap: 16px;
  }

  .stat-card {
    padding: 32px 16px;
    border-radius: 16px;
  }
  .stat-card:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }

  .stat-value { font-size: 32px; }

  .stat-label { font-size: 14px; }

  .about-features { padding: 60px 0; }

  .features-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
  }

  .feature-card { padding: 28px 20px; }
  .feature-card:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }

  .feature-card h3 { font-size: 18px; margin-bottom: 12px; }

  .feature-card p { font-size: 14px; }

  .about-mission { padding: 80px 24px; }

  .mission-content h2 { font-size: 28px; }

  .mission-content p { font-size: 16px; }
}

@media (min-width: 1024px) {
  .banner-slider { height: 500px; }

  .intro-text h2 { font-size: 36px; }

  .intro-text p { font-size: 17px; }

  .stat-card { padding: 40px 20px; }
  .stat-value { font-size: 36px; }
  .stat-label { font-size: 15px; }
}

/* ── 小屏 ── */
@media (max-width: 400px) {
  .banner-slider {
    height: 52vw;
    min-height: 170px;
    max-height: 240px;
  }

  .stats-grid {
    gap: 8px;
  }

  .stat-card {
    padding: 14px 8px;
  }

  .stat-value {
    font-size: 18px;
  }

  .stat-label {
    font-size: 10px;
  }

  .features-grid {
    gap: 10px;
  }

  .feature-card {
    padding: 16px 12px;
  }

  .feature-card h3 {
    font-size: 15px;
  }

  .feature-card p {
    font-size: 12px;
  }
}
</style>
