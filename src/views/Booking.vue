<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Grainient from '../components/Grainient.vue';

const router = useRouter();
const route = useRoute();
const currentLang = ref(localStorage.getItem('language') || 'zh');
const pageContents = ref<Record<string, string>>({});
const currentRotatingIndex = ref(0);
const rotatingInterval = ref<number | null>(null);
const showWechatQR = ref(false);
const showLangDropdown = ref(false);
const isNavVisible = ref(true);
const lastScrollY = ref(0);

const rotatingTexts = computed(() => {
  const key = currentLang.value === 'zh' ? 'booking_rotating_texts' : 'booking_rotating_texts_en';
  const texts = pageContents.value[key] || '';
  return texts.split(',').filter(t => t.trim());
});

const loadData = async () => {
  try {
    const response = await fetch('/api/pages/home/contents');
    pageContents.value = await response.json();
  } catch {}
};

const startRotatingText = () => {
  if (rotatingInterval.value) clearInterval(rotatingInterval.value);
  rotatingInterval.value = window.setInterval(() => {
    if (rotatingTexts.value.length > 0) {
      currentRotatingIndex.value = (currentRotatingIndex.value + 1) % rotatingTexts.value.length;
    }
  }, 2000);
};

const saveWechatQR = () => {
  if (pageContents.value.wechat_qrcode) {
    const link = document.createElement('a');
    link.href = pageContents.value.wechat_qrcode;
    link.download = 'wechat-qrcode.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

const form = ref({
  name: '', age: '', phone: '', email: '', date: '', time: '', message: ''
});
const isSubmitted = ref(false);

// 来自课程详情页的课程（URL: /booking?course=<course_id>）
const lockedCourse = ref<{ course_id: string; name: string; name_en: string } | null>(null);
const lockedCourseId = computed(() => (route.query.course as string) || '');
const lockedCourseName = computed(() => {
  if (!lockedCourse.value) return '';
  return currentLang.value === 'zh' ? lockedCourse.value.name : lockedCourse.value.name_en;
});

const loadLockedCourse = async () => {
  const cid = lockedCourseId.value;
  if (!cid) { lockedCourse.value = null; return; }
  try {
    const res = await fetch('/api/courses/' + encodeURIComponent(cid));
    if (res.ok) {
      const c = await res.json();
      lockedCourse.value = { course_id: c.course_id, name: c.name, name_en: c.name_en };
    } else {
      lockedCourse.value = null;
    }
  } catch {
    lockedCourse.value = null;
  }
};

watch(() => route.query.course, () => { loadLockedCourse(); });
watch(currentLang, () => { /* 语言切换时显示名自动跟着 computed 走 */ });

const toggleLanguage = () => { showLangDropdown.value = !showLangDropdown.value; };

const selectLanguage = (lang: string) => {
  currentLang.value = lang;
  localStorage.setItem('language', lang);
  showLangDropdown.value = false;
};

const handleGlobalClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  if (!target.closest('.lang-dropdown')) {
    showLangDropdown.value = false;
  }
};

const updateNavVisibility = () => {
  const scrollY = window.scrollY;
  if (scrollY > lastScrollY.value && scrollY > 100) {
    isNavVisible.value = false;
  } else {
    isNavVisible.value = true;
  }
  lastScrollY.value = scrollY;
};

const goBack = () => {
  if (window.history.length > 1) router.back();
  else router.push('/');
};

const handleSubmit = async () => {
  if (!form.value.name || !form.value.age || !form.value.phone || !form.value.date || !form.value.time) {
    alert(currentLang.value === 'zh' ? '请填写所有必填字段（姓名/年龄/电话/日期/时间）' : 'Please fill all required fields');
    return;
  }
  try {
    await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.value.name.trim(),
        age: form.value.age.trim(),
        phone: form.value.phone.trim(),
        email: (form.value.email || '').trim(),
        date: form.value.date,
        time: form.value.time,
        message: (form.value.message || '').trim(),
        course: lockedCourseId.value || '',
        course_name: lockedCourse.value ? lockedCourseName.value : ''
      })
    });
    isSubmitted.value = true;
  } catch {
    alert(currentLang.value === 'zh' ? '提交失败，请重试' : 'Submission failed, please try again');
  }
};

const labels = computed(() => ({
  name: currentLang.value === 'zh' ? '姓名' : 'Name',
  age: currentLang.value === 'zh' ? '年龄' : 'Age',
  phone: currentLang.value === 'zh' ? '联系电话' : 'Phone',
  email: currentLang.value === 'zh' ? '邮箱' : 'Email',
  date: currentLang.value === 'zh' ? '预约日期' : 'Date',
  time: currentLang.value === 'zh' ? '预约时间' : 'Time',
  courseLabel: currentLang.value === 'zh' ? '您要预约的课程' : 'Course',
  pleaseSelect: currentLang.value === 'zh' ? '-- 选择' : '-- Select',
  submit: currentLang.value === 'zh' ? '提交预约' : 'Submit Booking',
  message: currentLang.value === 'zh' ? '留言（选填）' : 'Message (Optional)',
  placeholderMessage: currentLang.value === 'zh' ? '告诉我们您的需求...' : 'Tell us your needs...',
  successTitle: currentLang.value === 'zh' ? '预约成功！' : 'Booking Successful!',
  successDesc: currentLang.value === 'zh' ? '我们会尽快与您联系，请保持电话畅通。' : 'We will contact you soon, please keep your phone available.',
  placeholderName: currentLang.value === 'zh' ? '请输入您的姓名' : 'Enter your name',
  placeholderAge: currentLang.value === 'zh' ? '请输入年龄' : 'Enter age',
  placeholderPhone: currentLang.value === 'zh' ? '请输入手机号码' : 'Enter phone number',
  placeholderEmail: currentLang.value === 'zh' ? '请输入邮箱地址' : 'Enter email address'
}));

onMounted(() => {
  loadData();
  loadLockedCourse();
  setTimeout(startRotatingText, 100);
  document.addEventListener('click', handleGlobalClick);
  window.addEventListener('scroll', updateNavVisibility);
});

const weekdayTimeOptions = [
  { value: '17:00-18:00', zh: '17:00-18:00', en: '17:00-18:00' },
  { value: '18:00-19:00', zh: '18:00-19:00', en: '18:00-19:00' },
  { value: '19:00-20:00', zh: '19:00-20:00', en: '19:00-20:00' },
  { value: '20:00-21:00', zh: '20:00-21:00', en: '20:00-21:00' }
];

const weekendTimeOptions = [
  { value: '9:00-10:30', zh: '9:00-10:30', en: '9:00-10:30' },
  { value: '10:30-12:00', zh: '10:30-12:00', en: '10:30-12:00' },
  { value: '14:00-15:30', zh: '14:00-15:30', en: '14:00-15:30' },
  { value: '15:30-17:00', zh: '15:30-17:00', en: '15:30-17:00' },
  { value: '17:30-18:30', zh: '17:30-18:30', en: '17:30-18:30' }
];

const timeOptions = computed(() => {
  if (!form.value.date) return [];
  const dayOfWeek = new Date(form.value.date).getDay();
  return (dayOfWeek === 0 || dayOfWeek === 6) ? weekendTimeOptions : weekdayTimeOptions;
});

watch(() => form.value.date, () => { form.value.time = ''; });

onUnmounted(() => {
  if (rotatingInterval.value) clearInterval(rotatingInterval.value);
  document.removeEventListener('click', handleGlobalClick);
  window.removeEventListener('scroll', updateNavVisibility);
});
</script>

<template>
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
  <div class="booking-page">
    <!-- 顶部导航（毛玻璃效果 + icon返回） -->
    <header class="page-header" :class="{ 'nav-hidden': !isNavVisible }">
      <div class="header-inner">
        <div class="header-left">
          <button class="back-btn" @click="goBack">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
          </button>
          <span class="logo-text">{{ currentLang === 'zh' ? '中萱文化' : 'Zhongxuan Culture' }}</span>
        </div>
        <div class="header-right">
          <div class="lang-dropdown">
            <button class="lang-dropdown-btn" @click.stop="toggleLanguage">
              <img src="/translate-languange-switch-svgrepo-com.svg" class="lang-icon" alt="语言切换" />
            </button>
            <div class="lang-dropdown-content" v-show="showLangDropdown">
              <a href="#" @click.prevent="selectLanguage('zh')">简体中文</a>
              <a href="#" @click.prevent="selectLanguage('en')">English</a>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Hero -->
    <section class="hero-section">
      <h1 class="hero-title">{{ currentLang === 'zh' ? '联系我们' : 'Contact Us' }}</h1>
      <p class="hero-subtitle">{{ currentLang === 'zh' ? '预约一节体验课，开启英语提升之旅' : 'Book a trial class and start your journey' }}</p>
      <div class="rotating-text">
        <span v-for="(text, index) in rotatingTexts" :key="index" :class="['rotating-text-item', { active: index === currentRotatingIndex }]">{{ text }}</span>
      </div>
    </section>

    <!-- 快捷联系 -->
    <section class="section">
      <div class="contact-grid">
        <div class="contact-card" @click="window.location.href = 'tel:' + (pageContents.contact_phone || '18938908657')">
          <span class="contact-icon">📱</span>
          <span class="contact-label">{{ currentLang === 'zh' ? '电话' : 'Phone' }}</span>
          <span class="contact-val">{{ pageContents.contact_phone || '18938908657' }}</span>
        </div>
        <div class="contact-card" @click="showWechatQR = true" v-if="pageContents.wechat_qrcode">
          <span class="contact-icon">💬</span>
          <span class="contact-label">{{ currentLang === 'zh' ? '微信' : 'WeChat' }}</span>
          <span class="contact-val hint">{{ currentLang === 'zh' ? '查看二维码' : 'QR Code' }}</span>
        </div>
        <div class="contact-card" v-else>
          <span class="contact-icon">💬</span>
          <span class="contact-label">{{ currentLang === 'zh' ? '微信' : 'WeChat' }}</span>
          <span class="contact-val">{{ currentLang === 'zh' ? '敬请期待' : 'Coming Soon' }}</span>
        </div>
        <div class="contact-card" @click="window.location.href = 'mailto:' + (pageContents.contact_email || 'contact@zhongxuan.com')">
          <span class="contact-icon">✉️</span>
          <span class="contact-label">{{ currentLang === 'zh' ? '邮箱' : 'Email' }}</span>
          <span class="contact-val">{{ pageContents.contact_email || 'contact@zhongxuan.com' }}</span>
        </div>
        <div class="contact-card">
          <span class="contact-icon">📍</span>
          <span class="contact-label">{{ currentLang === 'zh' ? '地址' : 'Address' }}</span>
          <span class="contact-val small">{{ (currentLang === 'zh' ? pageContents.contact_address : pageContents.contact_address_en) || (currentLang === 'zh' ? '深圳市龙岗区' : 'Longgang District, Shenzhen') }}</span>
        </div>
      </div>
    </section>

    <!-- 预约表单 -->
    <section class="section">
      <div class="form-header">
        <h2>{{ currentLang === 'zh' ? '预约体验课' : 'Book a Trial Class' }}</h2>
        <p>{{ currentLang === 'zh' ? '填写信息，我们会在24小时内联系您' : 'We will contact you within 24 hours' }}</p>
      </div>

      <div v-if="!isSubmitted" class="form-card">
        <form @submit.prevent="handleSubmit" class="form">
          <div v-if="lockedCourse" class="locked-course-box">
            <div class="locked-course-label">{{ labels.courseLabel }}</div>
            <div class="locked-course-name">{{ lockedCourseName }}</div>
          </div>
          <div v-else class="locked-course-box empty">
            <div class="locked-course-label">{{ labels.courseLabel }}</div>
            <div class="locked-course-name locked-course-name-muted">
              {{ currentLang === 'zh' ? '未指定课程' : 'No course selected' }}
            </div>
          </div>
          <div class="field">
            <label>{{ labels.name }} <span class="req">*</span></label>
            <input v-model="form.name" type="text" :placeholder="labels.placeholderName" class="input" />
          </div>
          <div class="field">
            <label>{{ labels.age }} <span class="req">*</span></label>
            <input v-model="form.age" type="number" min="1" max="120" :placeholder="labels.placeholderAge" class="input" />
          </div>
          <div class="field">
            <label>{{ labels.phone }} <span class="req">*</span></label>
            <input v-model="form.phone" type="tel" :placeholder="labels.placeholderPhone" class="input" />
          </div>
          <div class="field">
            <label>{{ labels.email }}</label>
            <input v-model="form.email" type="email" :placeholder="labels.placeholderEmail" class="input" />
          </div>
          <div class="field-row">
            <div class="field">
              <label>{{ labels.date }} <span class="req">*</span></label>
              <input v-model="form.date" type="date" class="input" />
            </div>
            <div class="field">
              <label>{{ labels.time }} <span class="req">*</span></label>
              <select v-model="form.time" class="input">
                <option value="">{{ labels.pleaseSelect }}</option>
                <option v-for="opt in timeOptions" :key="opt.value" :value="opt.value">{{ currentLang === 'zh' ? opt.zh : opt.en }}</option>
              </select>
            </div>
          </div>
          <div class="field">
            <label>{{ labels.message }}</label>
            <textarea v-model="form.message" :placeholder="labels.placeholderMessage" class="input textarea" rows="3"></textarea>
          </div>
          <button type="submit" class="submit-btn">{{ labels.submit }}</button>
        </form>
      </div>

      <div v-else class="success-card">
        <div class="success-icon">✅</div>
        <h2>{{ labels.successTitle }}</h2>
        <p>{{ labels.successDesc }}</p>
        <div class="success-actions">
          <button class="btn-primary" @click="router.push('/')">{{ currentLang === 'zh' ? '返回首页' : 'Back to Home' }}</button>
          <button class="btn-outline" @click="isSubmitted = false">{{ currentLang === 'zh' ? '再预约一次' : 'Book Again' }}</button>
        </div>
      </div>
    </section>

    <!-- 营业时间 -->
    <section class="section">
      <div class="hours-card">
        <h3>🕐 {{ currentLang === 'zh' ? '营业时间' : 'Working Hours' }}</h3>
        <div class="hours-row">
          <span>{{ currentLang === 'zh' ? '周一至周五' : 'Mon - Fri' }}</span>
          <span class="hours-val">{{ pageContents.business_hours_weekday || '9:00 - 21:00' }}</span>
        </div>
        <div class="hours-row">
          <span>{{ currentLang === 'zh' ? '周六至周日' : 'Sat - Sun' }}</span>
          <span class="hours-val">{{ pageContents.business_hours_weekend || '10:00 - 18:00' }}</span>
        </div>
      </div>
    </section>

    <!-- 底部 -->
    <footer class="page-footer">
      <p>&copy; 2024 {{ currentLang === 'zh' ? '中萱文化' : 'Zhongxuan Culture' }} {{ currentLang === 'zh' ? '龙岗教学点' : 'Longgang Center' }}</p>
      <a v-if="currentLang === 'zh'" class="icp-link" href="https://icp.gov.moe/?keyword=20260235" target="_blank" rel="noopener noreferrer">✮ 萌ICP备20260235号 ✮</a>
    </footer>

    <!-- 微信二维码弹窗 -->
    <div v-if="showWechatQR && pageContents.wechat_qrcode" class="modal-overlay" @click="showWechatQR = false">
      <div class="modal" @click.stop>
        <button class="modal-close" @click="showWechatQR = false">×</button>
        <h3>{{ currentLang === 'zh' ? '扫码添加微信' : 'Scan to Add WeChat' }}</h3>
        <img :src="pageContents.wechat_qrcode" alt="WeChat QR" class="modal-qr" />
        <button class="save-btn" @click="saveWechatQR">{{ currentLang === 'zh' ? '保存图片' : 'Save Image' }}</button>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* ══════════════════════════════════════════════
   移动端优先 - Booking 页面
   主题色：绿色渐变 (#4caf50 / #2e7d32)
   保留原始视觉风格（毛玻璃、渐变背景、圆角卡片）
   ══════════════════════════════════════════════ */
.booking-page {
  min-height: 100vh;
  background: transparent;
  position: relative;
  z-index: 1;
  overflow-x: hidden;
  padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
}

.booking-page::before {
  content: '';
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background: linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%);
  pointer-events: none;
  z-index: 0;
}

.booking-page::after {
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

/* ── 顶部导航（毛玻璃效果） ── */
.page-header {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 100;
  background: linear-gradient(to bottom, var(--primary-lighter), var(--primary-color));
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  transition: transform 0.4s cubic-bezier(0.4,0,0.2,1);
}

.page-header.nav-hidden {
  transform: translateY(-100%);
}

.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  padding-top: calc(12px + env(safe-area-inset-top, 0px));
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  background: rgba(0,0,0,0.05);
  border: 1px solid rgba(0,0,0,0.1);
  border-radius: 50%;
  cursor: pointer;
  color: #333;
  transition: all 0.2s;
}

.back-btn:active {
  background: rgba(0,0,0,0.1);
}

.logo-text {
  font-size: 17px;
  font-weight: 700;
  color: #333;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.lang-dropdown {
  position: relative;
}

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

.lang-dropdown-btn:active {
  background: rgba(0,0,0,0.1);
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
  font-size: 14px;
  min-height: 44px;
  display: flex;
  align-items: center;
  transition: background 0.2s;
}

.lang-dropdown-content a:active {
  background: rgba(0,0,0,0.05);
}

/* ── Hero ── */
.hero-section {
  padding: 80px 16px 32px;
  text-align: center;
  position: relative;
  z-index: 1;
}

.hero-title {
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 8px;
  background: linear-gradient(to bottom, #66bb6a, #43a047);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-subtitle {
  font-size: 14px;
  color: #888;
  margin: 0 0 16px;
  line-height: 1.5;
}

.rotating-text {
  height: 28px;
  position: relative;
  overflow: hidden;
}

.rotating-text-item {
  position: absolute;
  left: 0;
  right: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--primary-color);
  opacity: 0;
  transform: translateY(16px);
  transition: all 0.5s ease;
}

.rotating-text-item.active {
  opacity: 1;
  transform: translateY(0);
}

/* ── 通用 section ── */
.section {
  padding: 0 16px 20px;
  position: relative;
  z-index: 1;
}

/* ── 快捷联系 ── */
.contact-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.contact-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 16px 8px;
  background: rgba(255,255,255,0.5);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,0.7);
  border-radius: 16px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: all 0.25s;
}

.contact-card:active { transform: scale(0.97); background: #f0f0f0; }

.contact-icon { font-size: 24px; line-height: 1; }
.contact-label { font-size: 12px; color: #999; font-weight: 500; }

.contact-val {
  font-size: 13px;
  color: #333;
  font-weight: 600;
  text-align: center;
  line-height: 1.3;
  word-break: break-all;
}

.contact-val.hint { color: var(--primary-color); font-size: 12px; }
.contact-val.small { font-size: 12px; }

/* ── 表单 ── */
.form-header {
  text-align: center;
  margin-bottom: 16px;
}

.form-header h2 {
  font-size: 18px;
  font-weight: 700;
  color: #333;
  margin: 0 0 6px;
}

.form-header p {
  font-size: 13px;
  color: #999;
  margin: 0;
}

.form-card {
  background: rgba(255,255,255,0.55);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.7);
  border-radius: 20px;
  padding: 20px 16px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.06);
}

.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

.field label {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.req { color: #f44336; }

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.input {
  width: 100%;
  padding: 12px 14px;
  border: 2px solid rgba(255,255,255,0.5);
  border-radius: 12px;
  font-size: 16px;
  color: #333;
  outline: none;
  background: rgba(255,255,255,0.6);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  transition: border-color 0.2s, box-shadow 0.2s;
  box-sizing: border-box;
  min-height: 48px;
  -webkit-appearance: none;
  appearance: none;
  font-family: inherit;
}

.input:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 4px rgba(76,175,80,0.1);
}

.input::placeholder { color: #aaa; }

.input.textarea {
  resize: none;
  min-height: 80px;
  padding: 12px 14px;
  line-height: 1.5;
}

select.input {
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 24 24' width='16' height='16' fill='none' stroke='%23999' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 36px;
}

.submit-btn {
  width: 100%;
  padding: 14px;
  background: linear-gradient(to bottom, var(--primary-light), var(--primary-dark));
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  min-height: 48px;
  transition: opacity 0.2s, transform 0.2s;
  -webkit-tap-highlight-color: transparent;
}

.submit-btn:active { opacity: 0.85; transform: scale(0.98); }

/* ── 锁定的课程（灰色背景，不可改）── */
.locked-course-box {
  background: #f5f5f5;
  border: 1px dashed #d0d0d0;
  border-radius: 12px;
  padding: 14px 16px;
  margin-bottom: 6px;
  pointer-events: none;
  user-select: none;
}
.locked-course-box.empty { background: #fafafa; border-style: solid; border-color: #eee; }
.locked-course-label {
  font-size: 12px;
  color: #888;
  margin-bottom: 4px;
  font-weight: 600;
  letter-spacing: 0.5px;
}
.locked-course-name {
  font-size: 16px;
  font-weight: 700;
  color: #555;
  word-break: break-all;
}
.locked-course-name-muted { color: #aaa; font-weight: 400; font-size: 14px; }

/* ── 成功 ── */
.success-card {
  background: rgba(255,255,255,0.55);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.7);
  border-radius: 20px;
  padding: 32px 20px;
  text-align: center;
  box-shadow: 0 10px 40px rgba(0,0,0,0.06);
}

.success-icon {
  font-size: 48px;
  margin-bottom: 12px;
  animation: bounce 1s ease infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.success-card h2 {
  font-size: 20px;
  font-weight: 700;
  color: #333;
  margin: 0 0 8px;
}

.success-card p {
  font-size: 14px;
  color: #888;
  margin: 0 0 24px;
  line-height: 1.6;
}

.success-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.btn-primary,
.btn-outline {
  width: 100%;
  padding: 14px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  min-height: 48px;
  transition: opacity 0.2s;
  -webkit-tap-highlight-color: transparent;
}

.btn-primary {
  background: linear-gradient(to bottom, var(--primary-light), var(--primary-dark));
  color: #fff;
  border: none;
}

.btn-outline {
  background: white;
  color: var(--primary-color);
  border: 2px solid var(--primary-color);
}

.btn-primary:active,
.btn-outline:active { opacity: 0.8; }

/* ── 营业时间 ── */
.hours-card {
  background: rgba(255,255,255,0.55);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.7);
  border-radius: 20px;
  padding: 20px 16px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.06);
}

.hours-card h3 {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0 0 16px;
}

.hours-row {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 0.5px solid #f0f0f0;
  font-size: 14px;
  color: #555;
}

.hours-row:last-child { border-bottom: none; }

.hours-val {
  font-weight: 600;
  color: #4caf50;
}

/* ── 底部 ── */
.page-footer {
  padding: 24px 16px;
  padding-bottom: calc(24px + env(safe-area-inset-bottom, 8px));
  text-align: center;
  background: transparent;
  position: relative;
  z-index: 1;
}

.page-footer p {
  font-size: 13px;
  color: #555;
  margin: 0;
  font-weight: 500;
}

.page-footer .icp-link {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  color: #999;
  text-decoration: none;
  transition: color 0.2s;
}
.page-footer .icp-link:hover { color: var(--primary-color); text-decoration: underline; }

/* ── 微信弹窗 ── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal {
  background: white;
  border-radius: 16px;
  padding: 28px 24px;
  text-align: center;
  position: relative;
  width: 100%;
  max-width: 340px;
  animation: modalFadeIn 0.3s ease;
}

@keyframes modalFadeIn {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}

.modal-close {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 36px;
  height: 36px;
  border: none;
  background: #f5f5f5;
  border-radius: 50%;
  font-size: 22px;
  cursor: pointer;
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.modal-close:active { background: #eee; }

.modal h3 {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0 0 16px;
}

.modal-qr {
  width: 200px;
  height: 200px;
  object-fit: contain;
  margin-bottom: 16px;
  border-radius: 8px;
  border: 2px solid #f0f0f0;
}

.save-btn {
  padding: 12px 28px;
  background: linear-gradient(to bottom, var(--primary-light), var(--primary-dark));
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;
  transition: opacity 0.2s;
}

.save-btn:active { opacity: 0.8; }

/* ══════════════════════════════════════════════
   小屏适配
   ══════════════════════════════════════════════ */
@media (max-width: 400px) {
  .hero-section {
    padding: 72px 12px 24px;
  }

  .hero-title { font-size: 20px; }

  .contact-grid { gap: 8px; }

  .contact-card { padding: 12px 6px; }

  .contact-icon { font-size: 20px; }
  .contact-label { font-size: 11px; }
  .contact-val { font-size: 12px; }

  .field-row {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .form-card { padding: 16px 12px; }
}

/* ══════════════════════════════════════════════
   Page background
   ══════════════════════════════════════════════ */
.page-bg {
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  z-index: 0;
  pointer-events: none;
}
</style>
