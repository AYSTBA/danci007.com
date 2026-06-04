// ── 共享类型定义 ──

export interface Banner {
  id: number
  image_url: string
  image_url_en: string
  title: string
  title_en: string
  link?: string
  active: boolean | number
  sort_order: number
}

export interface PageContents {
  [key: string]: string
}

export interface Teacher {
  id: number
  name: string
  name_en: string
  title: string
  title_en: string
  description: string
  description_en: string
  avatar: string
  active: boolean | number
  sort_order: number
}

export interface BookingData {
  id: number
  name: string
  phone: string
  email: string
  date: string
  time: string
  course: string
  created_at: string
}

export type Language = 'zh' | 'en'

/** 将后端返回的 active 字段（0/1/true/false）统一转为 boolean */
export function normalizeActive(val: boolean | number): boolean {
  return val === 1 || val === true
}

// ── 课程 ──

export interface CourseFeature {
  icon: string
  title: string
  desc: string
}

export interface Course {
  id: number
  course_id: string
  name: string
  name_en: string
  subtitle: string
  subtitle_en: string
  description: string
  description_en: string
  price: string
  original_price: string
  teacher_name: string
  teacher_name_en: string
  teacher_title: string
  teacher_title_en: string
  teacher_avatar: string
  banner_image: string
  features: CourseFeature[]
  lesson_count: string
  student_count: string
  status: string
  validity: string
  active: boolean | number
  created_at: string
  updated_at: string
}

export interface CourseReview {
  id: number
  course_id: string
  name: string
  rating: number
  content: string
  created_at: string
}

export interface CourseInteraction {
  id: number
  course_id: string
  name: string
  content: string
  created_at: string
}
