import { ref, onMounted, onUnmounted } from 'vue'
import type { Banner } from '../types'

/**
 * Banner 轮播 composable — Home.vue 和 About.vue 共用
 */
export function useBannerCarousel(banners: Ref<Banner[]>, intervalMs = 5000) {
  const currentBannerIndex = ref(0)
  let timer: number | null = null

  const startAutoPlay = () => {
    stopAutoPlay()
    timer = window.setInterval(() => {
      if (banners.value.length > 1) {
        currentBannerIndex.value = (currentBannerIndex.value + 1) % banners.value.length
      }
    }, intervalMs)
  }

  const stopAutoPlay = () => {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  const nextBanner = () => {
    if (banners.value.length > 1) {
      currentBannerIndex.value = (currentBannerIndex.value + 1) % banners.value.length
    }
  }

  const prevBanner = () => {
    if (banners.value.length > 1) {
      currentBannerIndex.value = (currentBannerIndex.value - 1 + banners.value.length) % banners.value.length
    }
  }

  onMounted(() => startAutoPlay())
  onUnmounted(() => stopAutoPlay())

  return {
    currentBannerIndex,
    startAutoPlay,
    stopAutoPlay,
    nextBanner,
    prevBanner
  }
}

// 补充 import — Vue 的 Ref 类型
import type { Ref } from 'vue'
