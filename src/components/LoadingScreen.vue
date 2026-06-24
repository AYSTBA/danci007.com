<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const progress = ref(0)
const isComplete = ref(false)
const showContent = ref(false)

let animationId: number
let startTime = 0
const DURATION = 3000

interface Bolt {
  id: number
  x: string
  y: string
  size: number
  delay: number
  duration: number
  rotation: number
  opacity: number
}

const bolts: Bolt[] = []
for (let i = 0; i < 10; i++) {
  bolts.push({
    id: i,
    x: `${10 + Math.random() * 80}%`,
    y: `${5 + Math.random() * 85}%`,
    size: 24 + Math.random() * 48,
    delay: Math.random() * 4,
    duration: 1.5 + Math.random() * 2.5,
    rotation: Math.random() * 360,
    opacity: 0.15 + Math.random() * 0.4,
  })
}

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
  animationId = requestAnimationFrame(animate)
})

onUnmounted(() => {
  cancelAnimationFrame(animationId)
})
</script>

<template>
  <div class="loading-wrapper">
    <div class="main-content" :class="{ 'content-visible': showContent }">
      <slot />
    </div>

    <div class="loading-overlay" :class="{ 'slide-out': isComplete }">
      <div class="lightning-bg">
        <span
          v-for="bolt in bolts"
          :key="bolt.id"
          class="bolt"
          :style="{
            left: bolt.x,
            top: bolt.y,
            fontSize: bolt.size + 'px',
            animationDelay: bolt.delay + 's',
            animationDuration: bolt.duration + 's',
            transform: `rotate(${bolt.rotation}deg) scale(${0.6 + bolt.size / 80})`,
            opacity: bolt.opacity,
          }"
        >⚡</span>
      </div>

      <div class="glow-spot glow-1"></div>
      <div class="glow-spot glow-2"></div>

      <div class="center-content">
        <h1 class="site-title">
          <span class="title-char" v-for="(ch, i) in '中萱文化'" :key="i" :style="{ animationDelay: i * 0.08 + 's' }">{{ ch }}</span>
        </h1>
        <p class="site-subtitle">青少年英语教育</p>

        <div class="progress-area">
          <div class="percentage">{{ progress }}%</div>
          <div class="progress-track">
            <div class="progress-fill" :style="{ width: progress + '%' }"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.loading-wrapper {
  position: relative;
  width: 100%;
  min-height: 100vh;
  overflow: hidden;
  background: #000;
}

.main-content {
  position: relative;
  z-index: 1;
  opacity: 0;
  transition: opacity 0.6s ease;
}
.main-content.content-visible {
  opacity: 1;
}

.loading-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
  transition: transform 0.8s cubic-bezier(0.7, 0, 0.3, 1);
}
.loading-overlay.slide-out {
  transform: translateX(-100%);
}

.lightning-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}
.bolt {
  position: absolute;
  color: #facc15;
  filter: drop-shadow(0 0 6px #facc15) drop-shadow(0 0 20px #eab308);
  animation: boltFlash ease-in-out infinite;
  will-change: opacity, transform;
  user-select: none;
}

@keyframes boltFlash {
  0%, 100% { opacity: 0; transform: scale(0.8); }
  10% { opacity: 1; transform: scale(1.15); }
  15% { opacity: 0.3; transform: scale(1); }
  20% { opacity: 0.8; transform: scale(1.05); }
  30%, 100% { opacity: 0; transform: scale(0.7); }
}

.glow-spot {
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
  top: 15%;
  left: 20%;
  background: radial-gradient(circle, rgba(250,204,21,0.25) 0%, transparent 70%);
}
.glow-2 {
  width: 250px;
  height: 250px;
  bottom: 20%;
  right: 15%;
  background: radial-gradient(circle, rgba(234,179,8,0.18) 0%, transparent 70%);
  animation-delay: -2s;
}

@keyframes glowPulse {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.3); }
}

.center-content {
  position: relative;
  z-index: 1;
  text-align: center;
  padding: 0 24px;
  max-width: 600px;
  width: 100%;
}

.site-title {
  margin: 0 0 12px;
  font-size: clamp(40px, 8vw, 72px);
  font-weight: 800;
  color: #fff;
  letter-spacing: 0.12em;
  display: flex;
  justify-content: center;
  gap: 4px;
}
.title-char {
  display: inline-block;
  animation: charAppear 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
  text-shadow: 0 0 30px rgba(250,204,21,0.3), 0 0 60px rgba(250,204,21,0.1);
}
@keyframes charAppear {
  0% { opacity: 0; transform: translateY(30px) scale(0.8); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}

.site-subtitle {
  margin: 0 0 48px;
  font-size: clamp(14px, 2.5vw, 20px);
  color: rgba(255,255,255,0.6);
  letter-spacing: 0.3em;
  font-weight: 300;
}

.progress-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.percentage {
  font-size: clamp(28px, 5vw, 48px);
  font-weight: 700;
  color: #22c55e;
  font-variant-numeric: tabular-nums;
  letter-spacing: 2px;
  text-shadow: 0 0 20px rgba(34,197,94,0.4);
}

.progress-track {
  width: min(420px, 75vw);
  height: 6px;
  border-radius: 3px;
  background: rgba(255,255,255,0.1);
  overflow: hidden;
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.3);
}

.progress-fill {
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, #22c55e, #4ade80);
  transition: width 0.05s linear;
  box-shadow: 0 0 12px rgba(34,197,94,0.5), 0 0 30px rgba(34,197,94,0.2);
  position: relative;
}
.progress-fill::after {
  content: '';
  position: absolute;
  right: 0;
  top: -2px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #4ade80;
  box-shadow: 0 0 16px rgba(34,197,94,0.7);
}

@media (max-width: 480px) {
  .glow-1, .glow-2 {
    display: none;
  }
  .site-subtitle {
    margin-bottom: 36px;
  }
  .progress-track {
    width: 70vw;
  }
  .bolt {
    font-size: 20px !important;
  }
}
</style>
