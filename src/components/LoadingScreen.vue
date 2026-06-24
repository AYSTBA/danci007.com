<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const shouldShow = ref(false)
const progress = ref(0)
const isComplete = ref(false)
const showContent = ref(false)

let animationId: number
let startTime = 0
const DURATION = 3000

interface LightningPath {
  d: string
  delay: string
  duration: string
  opacity: number
  strokeWidth: number
}

const lightningPaths: LightningPath[] = [
  { d: 'M92,2 L82,14 L93,18 L78,34 L89,39 L72,56 L84,61 L68,78 L80,83', delay: '0s', duration: '2.5s', opacity: 0.45, strokeWidth: 0.3 },
  { d: 'M78,34 L72,40 L78,43 L68,52', delay: '0.4s', duration: '1.8s', opacity: 0.3, strokeWidth: 0.2 },
  { d: 'M89,39 L83,46 L88,49 L76,60', delay: '0.7s', duration: '1.5s', opacity: 0.25, strokeWidth: 0.2 },
  { d: 'M96,1 L90,10 L95,13 L85,24', delay: '0.2s', duration: '2s', opacity: 0.35, strokeWidth: 0.25 },
  { d: 'M72,56 L66,62 L72,65 L63,74', delay: '1s', duration: '1.5s', opacity: 0.25, strokeWidth: 0.2 },
  { d: 'M98,1 L94,8 L97,10 L92,18', delay: '0s', duration: '2.8s', opacity: 0.2, strokeWidth: 0.15 },
  { d: 'M68,78 L62,84 L68,86 L60,94', delay: '1.3s', duration: '1.2s', opacity: 0.2, strokeWidth: 0.15 },
]

function animate(timestamp: number) {
  if (!startTime) startTime = timestamp
  const elapsed = timestamp - startTime
  const pct = Math.min((elapsed / DURATION) * 100, 100)
  progress.value = Math.round(pct)

  if (pct < 100) {
    animationId = requestAnimationFrame(animate)
  } else {
    isComplete.value = true
    setTimeout(() => {
      showContent.value = true
    }, 800)
  }
}

onMounted(() => {
  if (sessionStorage.getItem('loaded')) {
    showContent.value = true
    return
  }
  shouldShow.value = true
  animationId = requestAnimationFrame(animate)
  setTimeout(() => {
    sessionStorage.setItem('loaded', '1')
  }, DURATION + 800)
})

onUnmounted(() => {
  if (animationId) cancelAnimationFrame(animationId)
})
</script>

<template>
  <div class="loading-wrapper">
    <div class="main-content" :class="{ 'content-visible': showContent }">
      <slot />
    </div>

    <div v-if="shouldShow" class="loading-overlay" :class="{ 'slide-out': isComplete }">
      <!-- SVG 闪电路径 — 从右上往下缓慢闪动 -->
      <svg
        class="lightning-svg"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMin slice"
      >
        <path
          v-for="(path, i) in lightningPaths"
          :key="i"
          :d="path.d"
          class="bolt-path"
          pathLength="1"
          :style="{
           '--delay': path.delay,
           '--duration': path.duration,
            opacity: path.opacity,
            strokeWidth: path.strokeWidth,
          }"
        />
      </svg>

      <!-- 黄色辉光 -->
      <div class="glow glow-1"></div>
      <div class="glow glow-2"></div>

      <!-- 标题区 — 居左 -->
      <div class="title-area">
        <h1 class="site-title">
          <span class="title-char" v-for="(ch, i) in '中萱文化'" :key="i" :style="{ animationDelay: i * 0.08 + 's' }">{{ ch }}</span>
        </h1>
        <p class="site-subtitle">青少年英语教育</p>
      </div>

      <!-- 底部进度区 -->
      <div class="bottom-area">
        <div class="percentage">{{ progress }}%</div>
        <div class="progress-track">
          <div class="progress-fill" :style="{ width: progress + '%' }"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@font-face {
  font-family: 'SmileySans';
  src: url('/fonts/SmileySans-Oblique.ttf') format('truetype');
  font-display: swap;
}

.loading-wrapper {
  position: relative;
  width: 100%;
  min-height: 100vh;
}

.main-content {
  position: relative;
  z-index: 1;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.6s ease;
}
.main-content.content-visible {
  opacity: 1;
  pointer-events: auto;
}

.loading-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: #000;
  transition: transform 0.8s cubic-bezier(0.7, 0, 0.3, 1);
}
.loading-overlay.slide-out {
  transform: translateX(-100%);
}

/* ===== SVG 闪电 ===== */
.lightning-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}

.bolt-path {
  fill: none;
  stroke: #b8d44a;
  stroke-linecap: round;
  stroke-linejoin: round;
  filter: drop-shadow(0 0 3px rgba(184,212,74,0.5)) drop-shadow(0 0 10px rgba(184,212,74,0.2));
  stroke-dasharray: 1;
  animation: boltCrawl ease-in-out infinite;
  animation-delay: var(--delay, 0s);
  animation-duration: var(--duration, 2.5s);
  stroke-dashoffset: 1;
}

@keyframes boltCrawl {
  0% {
    stroke-dashoffset: 1;
    opacity: 0;
  }
  5% {
    opacity: 0.7;
  }
  50% {
    stroke-dashoffset: 0;
    opacity: 0.9;
  }
  65% {
    opacity: 0.7;
  }
  70% {
    opacity: 0.1;
  }
  75% {
    opacity: 0.5;
  }
  80% {
    opacity: 0.05;
  }
  85% {
    opacity: 0.3;
  }
  100% {
    stroke-dashoffset: 0;
    opacity: 0;
  }
}

/* ===== 辉光 ===== */
.glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  pointer-events: none;
  z-index: 0;
  animation: glowPulse 4s ease-in-out infinite;
}
.glow-1 {
  width: 300px;
  height: 300px;
  top: 10%;
  right: 10%;
  background: radial-gradient(circle, rgba(184,212,74,0.18) 0%, transparent 70%);
}
.glow-2 {
  width: 200px;
  height: 200px;
  bottom: 25%;
  right: 30%;
  background: radial-gradient(circle, rgba(184,212,74,0.1) 0%, transparent 70%);
  animation-delay: -2s;
}

@keyframes glowPulse {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.4); }
}

/* ===== 标题区 — 居左 ===== */
.title-area {
  position: absolute;
  top: 18%;
  left: 0;
  right: 0;
  z-index: 1;
  padding: 0 7vw;
  text-align: left;
}

.site-title {
  margin: 0 0 8px;
  font-family: 'SmileySans', sans-serif;
  font-size: clamp(42px, 9vw, 80px);
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.06em;
  display: flex;
  gap: 2px;
}
.title-char {
  display: inline-block;
  animation: charAppear 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
  text-shadow: 0 0 30px rgba(250,204,21,0.25), 0 0 60px rgba(250,204,21,0.08);
}
@keyframes charAppear {
  0% { opacity: 0; transform: translateY(30px) scale(0.85); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}

.site-subtitle {
  margin: 0;
  font-family: 'SmileySans', sans-serif;
  font-size: clamp(13px, 2.2vw, 18px);
  color: rgba(255,255,255,0.45);
  letter-spacing: 0.25em;
  font-weight: 350;
}

/* ===== 底部进度区 ===== */
.bottom-area {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1;
  padding: 0 7vw max(24px, env(safe-area-inset-bottom, 16px));
}

.percentage {
  font-family: 'SmileySans', sans-serif;
  font-size: clamp(20px, 3.5vw, 32px);
  font-weight: 700;
  color: #22c55e;
  font-variant-numeric: tabular-nums;
  letter-spacing: 1px;
  text-shadow: 0 0 16px rgba(34,197,94,0.35);
  margin-bottom: 8px;
}

.progress-track {
  width: 100%;
  height: 5px;
  border-radius: 3px;
  background: rgba(255,255,255,0.08);
  overflow: hidden;
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.3);
}

.progress-fill {
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, #22c55e, #4ade80);
  transition: width 0.05s linear;
  box-shadow: 0 0 10px rgba(34,197,94,0.45), 0 0 25px rgba(34,197,94,0.15);
  position: relative;
}
.progress-fill::after {
  content: '';
  position: absolute;
  right: 0;
  top: -2px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #4ade80;
  box-shadow: 0 0 14px rgba(34,197,94,0.6);
}

/* ===== 响应式 ===== */
@media (max-width: 480px) {
  .title-area {
    top: 15%;
    padding: 0 6vw;
  }
  .bottom-area {
    padding: 0 6vw max(16px, env(safe-area-inset-bottom, 12px));
  }
  .glow-1, .glow-2 {
    display: none;
  }
}

@media (max-width: 360px) {
  .title-area {
    top: 12%;
  }
}
</style>
