export type Language = 'zh' | 'en'

export interface Translations {
  home: string
  booking: string
  [key: string]: string
}

export const translations: Record<Language, Translations> = {
  zh: {
    home: '首页',
    booking: '预约体验'
  },
  en: {
    home: 'Home',
    booking: 'Book Now'
  }
}

export function getTranslation(lang: Language): Translations {
  return translations[lang]
}
