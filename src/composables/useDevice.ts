import { ref, onMounted, onUnmounted } from 'vue'

const isMobile = ref(false)

function check() {
  isMobile.value = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

let initialized = false

export function useDevice() {
  if (!initialized) {
    check()
    initialized = true
  }

  let resizeTimer: ReturnType<typeof setTimeout>
  const onResize = () => {
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(check, 100)
  }

  onMounted(() => {
    window.addEventListener('resize', onResize, { passive: true })
  })

  onUnmounted(() => {
    window.removeEventListener('resize', onResize)
    clearTimeout(resizeTimer)
  })

  return { isMobile }
}
