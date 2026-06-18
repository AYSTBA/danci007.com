import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Home.vue')
  },
  {
    path: '/booking',
    name: 'Booking',
    component: () => import('../views/Booking.vue')
  },
  {
    path: '/about',
    name: 'About',
    component: () => import('../views/About.vue')
  },
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('../views/Admin.vue')
  },
  {
    path: '/admin/visits',
    name: 'AdminVisits',
    component: () => import('../views/AdminVisits.vue')
  },
  {
    path: '/admin/server',
    name: 'AdminServer',
    component: () => import('../views/AdminServer.vue')
  },
  {
    path: '/course',
    name: 'CourseList',
    component: () => import('../views/Course.vue')
  },
  {
    path: '/course/:id',
    name: 'CourseDetail',
    component: () => import('../views/Course.vue')
  },
  {
    path: '/group-buy/:courseId/:shareId?',
    name: 'GroupBuy',
    component: () => import('../views/GroupBuy.vue')
  },
  // 兼容旧链接
  {
    path: '/enrollment',
    redirect: '/course'
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('../views/NotFound.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to) {
    if (to.hash) {
      return {
        el: to.hash,
        behavior: 'smooth'
      }
    }
    return { top: 0, behavior: 'smooth' }
  }
})

export default router
