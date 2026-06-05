<script setup lang="ts">
import MobileTabBar from './components/MobileTabBar.vue'
</script>

<template>
  <div class="app">
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
    <!-- 移动端底部磨砂玻璃导航栏 -->
    <MobileTabBar />
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
