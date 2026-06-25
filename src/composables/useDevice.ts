import { ref, onMounted, onUnmounted } from 'vue'
import { getCookie, setCookie } from '../utils/cookie'

const COOKIE_KEY = 'danci_device'
const isMobile = ref(false)

function detect(): boolean {
  return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

function check() {
  const mobile = detect()
  isMobile.value = mobile
  setCookie(COOKIE_KEY, mobile ? '1' : '0')
}

let initialized = false

export function useDevice() {
  if (!initialized) {
    const cached = getCookie(COOKIE_KEY)
    if (cached === '1' || cached === '0') {
      isMobile.value = cached === '1'
    } else {
      check()
    }
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
