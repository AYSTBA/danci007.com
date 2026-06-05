<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import MobileTabBar from './components/MobileTabBar.vue'

const route = useRoute()
const isMobileTabBarVisible = computed(() => {
  return !route.path.startsWith('/course') && !route.path.startsWith('/admin')
})
</script>

<template>
  <div class="app" :class="{ 'no-tab-bar': !isMobileTabBarVisible }">
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
    <!-- 移动端底部磨砂玻璃导航栏（课程详情页与后台页面使用自定义底部栏时不显示） -->
    <MobileTabBar v-if="isMobileTabBarVisible" />
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
}

/* 移动端底部留出导航栏空间 */
@media (max-width: 768px) {
  .app {
    padding-bottom: 90px;
  }
  .app.no-tab-bar {
    padding-bottom: 0;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>


