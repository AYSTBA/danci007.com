import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { Language } from '../types'

const STORAGE_KEY = 'language'

/**
 * 语言切换 composable — 所有页面共用
 */
export function useLanguage() {
  const currentLang = ref<Language>((localStorage.getItem(STORAGE_KEY) || 'zh') as Language)
  const showLangDropdown = ref(false)

  const switchLanguage = (lang: string) => {
    currentLang.value = lang as Language
    localStorage.setItem(STORAGE_KEY, lang)
  }

  const toggleLanguage = () => {
    showLangDropdown.value = !showLangDropdown.value
  }

  const selectLanguage = (lang: string) => {
    switchLanguage(lang)
    showLangDropdown.value = false
  }

  const handleGlobalClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement
    if (!target.closest('.lang-dropdown')) {
      showLangDropdown.value = false
    }
  }

  onMounted(() => {
    document.addEventListener('click', handleGlobalClick)
  })

  onUnmounted(() => {
    document.removeEventListener('click', handleGlobalClick)
  })

  const isZh = computed(() => currentLang.value === 'zh')

  return {
    currentLang,
    showLangDropdown,
    isZh,
    switchLanguage,
    toggleLanguage,
    selectLanguage,
    handleGlobalClick
  }
}
