<script setup lang="ts">
import { ref, onMounted } from 'vue';
import ImageEditor from '../components/ImageEditor.vue';
import type { BookingData, Banner, Teacher, PageContents } from '../types';
import { normalizeActive } from '../types';
import { getImageUrl, formatDate, fetchJson } from '../utils';

const teachers = ref<Teacher[]>([]);
const isLoggedIn = ref(false);
const password = ref('');
const errorMsg = ref('');
const loginLoading = ref(false);

const bookings = ref<BookingData[]>([]);
const filterName = ref('');
const filterDate = ref('');
const showModal = ref(false);
const selectedBooking = ref<BookingData | null>(null);

const banners = ref<Banner[]>([]);
const pageContents = ref<PageContents>({});

const activeTab = ref('banners');
const saveMessage = ref('');
const showSaveMessage = ref(false);

const editorVisible = ref(false);
const editorFile = ref<File | null>(null);
const editorCallback = ref<((file: File) => void) | null>(null);

// 互动管理
const courseReviews = ref<any[]>([]);
const courseInteractions = ref<any[]>([]);

// 课程管理
const courses = ref<any[]>([]);
const editingCourse = ref<any | null>(null);

const dataLoading = ref(false);
const dataError = ref<string | null>(null);

// ── 上传遮罩状态 ──
const uploadLoading = ref(false);
const uploadProgress = ref(0);
const uploadFileName = ref('');
const uploadPhase = ref<'uploading' | 'processing'>('uploading');
let currentUploadXhr: XMLHttpRequest | null = null;

// ── 孤儿文件清理 ──
const orphanInfo = ref<{ orphans: string[]; count: number; totalSize: number } | null>(null);
const orphanScanning = ref(false);

// ── 访客分析 ──
const visitStats = ref<any>(null);
const visitList = ref<any[]>([]);
const visitTotal = ref(0);
const visitLoading = ref(false);
const visitFilter = ref({
  ip: '', browser: '', os: '', device: '', path: '',
  since: '', until: '', limit: 50, offset: 0
});
const visitHourlyMax = ref(0);

const formatSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
};

const scanOrphans = async () => {
  orphanScanning.value = true;
  try {
    const r = await authFetch('/api/admin/orphan-uploads');
    if (r.ok) orphanInfo.value = await r.json();
    else alert('扫描失败');
  } catch (e: any) {
    alert('扫描出错: ' + e.message);
  } finally {
    orphanScanning.value = false;
  }
};

const cleanupOrphans = async (olderThanHours: number) => {
  const msg = olderThanHours > 0
    ? `确定删除 ${olderThanHours} 小时前未引用的文件？此操作不可撤销！`
    : '确定删除所有未引用的文件？此操作不可撤销！';
  if (!confirm(msg)) return;
  orphanScanning.value = true;
  try {
    const r = await authFetch('/api/admin/orphan-uploads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ olderThanHours })
    });
    if (r.ok) {
      const data = await r.json();
      showSaveSuccess(`已清理 ${data.deleted} 个文件`);
      await scanOrphans();
    } else {
      alert('清理失败');
    }
  } catch (e: any) {
    alert('清理出错: ' + e.message);
  } finally {
    orphanScanning.value = false;
  }
};

const showSaveSuccess = (message: string) => {
  saveMessage.value = message;
  showSaveMessage.value = true;
  setTimeout(() => {
    showSaveMessage.value = false;
  }, 3000);
};

// ── 登录：通过后端 API 验证密码 ──
const handleLogin = async () => {
  if (!password.value) return;
  loginLoading.value = true;
  errorMsg.value = '';
  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: password.value })
    });
    if (res.ok) {
      const data = await res.json();
      // 后端返回 token，存储到 sessionStorage
      sessionStorage.setItem('adminToken', data.token);
      sessionStorage.setItem('adminLoggedIn', 'true');
      isLoggedIn.value = true;
      password.value = '';
      loadData();
    } else {
      const data = await res.json().catch(() => ({}));
      errorMsg.value = data.error || '密码错误';
    }
  } catch {
    errorMsg.value = '网络错误，请重试';
  } finally {
    loginLoading.value = false;
  }
};

const checkLogin = () => {
  const token = sessionStorage.getItem('adminToken');
  if (token) {
    isLoggedIn.value = true;
  }
};

const handleLogout = () => {
  isLoggedIn.value = false;
  sessionStorage.removeItem('adminLoggedIn');
  sessionStorage.removeItem('adminToken');
  password.value = '';
};

// ── 数据加载（带鉴权 token）──
const getAuthHeaders = () => {
  const token = sessionStorage.getItem('adminToken');
  return token ? { 'X-Admin-Token': token } : {};
};

const loadData = async () => {
  dataLoading.value = true;
  dataError.value = null;
  try {
    const headers = getAuthHeaders();
    const [bookingsData, bannerData, contents, teacherData, reviewsData, interactionsData, coursesData] = await Promise.all([
      fetchJson<BookingData[]>('/api/bookings', { headers }),
      fetchJson<Banner[]>('/api/admin/banners', { headers }),
      fetchJson<PageContents>('/api/pages/home/contents', { headers }),
      fetchJson<Teacher[]>('/api/teachers', { headers }),
      fetchJson<any[]>('/api/admin/course-reviews', { headers }),
      fetchJson<any[]>('/api/admin/course-interactions', { headers }),
      fetchJson<any[]>('/api/admin/courses', { headers })
    ]);

    bookings.value = bookingsData;
    banners.value = bannerData.map((b: any) => ({ ...b, active: normalizeActive(b.active) }));
    pageContents.value = contents;
    teachers.value = teacherData.map((t: any) => ({ ...t, active: normalizeActive(t.active) }));
    courseReviews.value = reviewsData;
    courseInteractions.value = interactionsData;
    courses.value = coursesData.map((c: any) => ({ ...c, active: normalizeActive(c.active) }));
  } catch (e: any) {
    // 如果鉴权失败，自动登出
    if (e.message?.includes('401') || e.message?.includes('403')) {
      handleLogout();
      return;
    }
    dataError.value = e.message || '数据加载失败';
  } finally {
    dataLoading.value = false;
  }
};

const authFetch = async (url: string, options: RequestInit = {}) => {
  const headers = { ...getAuthHeaders(), ...options.headers };
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401 || res.status === 403) {
    handleLogout();
    throw new Error('登录已过期，请重新登录');
  }
  return res;
};

const addTeacher = () => {
  teachers.value.push({
    id: Date.now(),
    name: '新教师',
    name_en: '',
    title: '',
    title_en: '',
    description: '',
    description_en: '',
    avatar: '',
    active: true,
    sort_order: teachers.value.length
  });
};

// ── 课程管理 ──
const newCourseTemplate = () => ({
  course_id: '',
  name: '',
  name_en: '',
  subtitle: '',
  subtitle_en: '',
  description: '',
  description_en: '',
  price: '0',
  original_price: '0',
  teacher_name: '',
  teacher_name_en: '',
  teacher_title: '',
  teacher_title_en: '',
  teacher_avatar: '',
  banner_image: '',
  features: [] as any[],
  lesson_count: '1',
  student_count: '0',
  status: '已完结',
  validity: '长期有效',
  sort_order: 0,
  active: true,
  _teacherId: '' as any
});

// 从教师下拉中选择后，自动填充教师信息到课程
const applyTeacherFromList = (course: any) => {
  const id = Number(course._teacherId);
  const t = teachers.value.find(x => x.id === id);
  if (!t) return;
  course.teacher_name = t.name || '';
  course.teacher_name_en = t.name_en || '';
  course.teacher_title = t.title || '';
  course.teacher_title_en = t.title_en || '';
  if (t.avatar && !course.teacher_avatar) {
    course.teacher_avatar = t.avatar;
  }
};

const addCourse = () => {
  editingCourse.value = newCourseTemplate();
};

const editCourse = (c: any) => {
  editingCourse.value = JSON.parse(JSON.stringify(c));
  editingCourse.value._teacherId = '';
  // 把 features 字符串/数组统一
  if (typeof editingCourse.value.features === 'string') {
    try { editingCourse.value.features = JSON.parse(editingCourse.value.features); } catch { editingCourse.value.features = []; }
  }
  if (!Array.isArray(editingCourse.value.features)) editingCourse.value.features = [];
  // 尝试通过教师姓名匹配已存在的教师
  if (editingCourse.value.teacher_name) {
    const matched = teachers.value.find(t => t.name === editingCourse.value.teacher_name);
    if (matched) editingCourse.value._teacherId = matched.id;
  }
};

const cancelEditCourse = () => {
  editingCourse.value = null;
};

const saveCourse = async () => {
  if (!editingCourse.value) return;
  const c = editingCourse.value;
  if (!c.course_id || !c.name) {
    alert('请填写课程ID和课程名称');
    return;
  }
  try {
    const { _teacherId, ...payload } = c;
    const data = { ...payload, active: c.active ? 1 : 0 };
    let response;
    if (c.id > 1000000000000 || !courses.value.find(x => x.id === c.id)) {
      // 新建
      response = await authFetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } else {
      response = await authFetch(`/api/courses/${c.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    }
    if (response.ok) {
      showSaveSuccess('课程已保存');
      await loadData();
      editingCourse.value = null;
    } else {
      const err = await response.json().catch(() => ({}));
      alert('保存失败：' + (err.error || response.statusText));
    }
  } catch (e: any) {
    alert('保存出错：' + e.message);
  }
};

const removeCourse = async (c: any) => {
  if (!confirm(`确定删除课程「${c.name}」吗？`)) return;
  try {
    const r = await authFetch(`/api/courses/${c.id}`, { method: 'DELETE' });
    if (r.ok) {
      courses.value = courses.value.filter(x => x.id !== c.id);
      showSaveSuccess('课程已删除');
    } else {
      alert('删除失败');
    }
  } catch (e: any) {
    alert('删除出错：' + e.message);
  }
};

const addCourseFeature = () => {
  if (!editingCourse.value) return;
  editingCourse.value.features.push({ icon: '⭐', title: '', desc: '' });
};

const removeCourseFeature = (i: number) => {
  if (!editingCourse.value) return;
  editingCourse.value.features.splice(i, 1);
};

const handleCourseBannerUpload = async (event: Event, course: any) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  target.value = '';
  if (!file) return;
  const url = await uploadImage(file);
  if (url) course.banner_image = url;
};

const handleCourseAvatarUpload = async (event: Event, course: any) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  target.value = '';
  if (!file) return;
  const url = await uploadImage(file);
  if (url) course.teacher_avatar = url;
};

const saveTeacher = async (teacher: Teacher) => {
  try {
    const teacherData = { ...teacher, active: teacher.active ? 1 : 0 };
    let response;
    if (teacher.id > 1000000000000) {
      response = await authFetch('/api/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(teacherData)
      });
      if (response.ok) {
        const saved = await response.json();
        teacher.id = saved.id;
        showSaveSuccess('教师信息已保存');
      } else {
        alert('保存失败，请重试');
      }
    } else {
      response = await authFetch(`/api/teachers/${teacher.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(teacherData)
      });
      if (response.ok) {
        showSaveSuccess('教师信息已更新');
      } else {
        alert('更新失败，请重试');
      }
    }
  } catch (error: any) {
    if (!error.message.includes('登录已过期')) alert('保存出错，请重试');
  }
};

const removeTeacher = (teacher: Teacher) => {
  if (confirm('确定要删除这位教师吗？')) {
    teachers.value = teachers.value.filter(t => t.id !== teacher.id);
    if (teacher.id <= 1000000000000) {
      authFetch(`/api/teachers/${teacher.id}`, { method: 'DELETE' }).catch(() => {});
    }
  }
};

const editorAspectRatio = ref<'square' | 'circle' | 'free'>('free');

const handleTeacherAvatarUpload = (event: Event, teacher: Teacher) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  target.value = '';
  if (file) {
    editorAspectRatio.value = 'circle';
    editorFile.value = file;
    editorCallback.value = async (editedFile: File) => {
      const url = await uploadImage(editedFile);
      if (url) teacher.avatar = url;
    };
    editorVisible.value = true;
  }
};

const handleFileUpload = (event: Event, banner: Banner, lang: string) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  target.value = '';
  if (file) {
    editorAspectRatio.value = 'free';
    editorFile.value = file;
    editorCallback.value = async (editedFile: File) => {
      const url = await uploadImage(editedFile);
      if (url) {
        if (lang === 'en') banner.image_url_en = url;
        else banner.image_url = url;
      }
    };
    editorVisible.value = true;
  }
};

const handleWechatQRUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  target.value = '';
  if (file) {
    editorAspectRatio.value = 'square';
    editorFile.value = file;
    editorCallback.value = async (editedFile: File) => {
      const url = await uploadImage(editedFile);
      if (url) updateContent('wechat_qrcode', url);
    };
    editorVisible.value = true;
  }
};

const deleteBooking = async (id: number) => {
  if (confirm('确定要删除这条预约记录吗？')) {
    try {
      await authFetch(`/api/bookings/${id}`, { method: 'DELETE' });
      bookings.value = bookings.value.filter(b => b.id !== id);
    } catch {}
  }
};

const deleteReview = async (id: number) => {
  if (confirm('确定要删除这条评价吗？')) {
    try {
      await authFetch(`/api/course-reviews/${id}`, { method: 'DELETE' });
      courseReviews.value = courseReviews.value.filter(r => r.id !== id);
    } catch {}
  }
};

const deleteInteraction = async (id: number) => {
  if (confirm('确定要删除这条互动吗？')) {
    try {
      await authFetch(`/api/course-interactions/${id}`, { method: 'DELETE' });
      courseInteractions.value = courseInteractions.value.filter(i => i.id !== id);
    } catch {}
  }
};

const viewDetail = (booking: BookingData) => {
  selectedBooking.value = booking;
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  selectedBooking.value = null;
};

const filteredBookings = () => {
  return bookings.value.filter(booking => {
    const matchName = !filterName.value || booking.name.includes(filterName.value);
    const matchDate = !filterDate.value || booking.date === filterDate.value;
    return matchName && matchDate;
  });
};

const addBanner = () => {
  banners.value.push({
    id: Date.now(),
    title: '新活动',
    title_en: '',
    image_url: '',
    image_url_en: '',
    link: '',
    active: true,
    sort_order: banners.value.length
  });
};

const saveBanner = async (banner: Banner) => {
  try {
    const bannerData = { ...banner, active: banner.active ? 1 : 0 };
    let response;
    if (banner.id > 1000000000000) {
      response = await authFetch('/api/banners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bannerData)
      });
      if (response.ok) {
        const result = await response.json();
        banner.id = result.id;
        showSaveSuccess('Banner已保存');
      } else {
        alert('保存失败，请重试');
      }
    } else {
      response = await authFetch(`/api/banners/${banner.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bannerData)
      });
      if (response.ok) {
        showSaveSuccess('Banner已更新');
      } else {
        alert('更新失败，请重试');
      }
    }
  } catch (error: any) {
    if (!error.message.includes('登录已过期')) alert('保存出错，请重试');
  }
};

const removeBanner = (banner: Banner) => {
  if (confirm('确定要删除这个Banner吗？')) {
    banners.value = banners.value.filter(b => b.id !== banner.id);
    if (banner.id <= 1000000000000) {
      authFetch(`/api/banners/${banner.id}`, { method: 'DELETE' }).catch(() => {});
    }
  }
};

const cancelUpload = () => {
  if (currentUploadXhr) {
    try { currentUploadXhr.abort(); } catch {}
    currentUploadXhr = null;
  }
  uploadLoading.value = false;
  uploadProgress.value = 0;
};

const uploadImage = (file: File): Promise<string | null> => {
  // 如果有进行中的上传，先取消它
  if (currentUploadXhr) {
    try { currentUploadXhr.abort(); } catch {}
    currentUploadXhr = null;
  }

  return new Promise((resolve) => {
    const formData = new FormData();
    formData.append('file', file);
    const xhr = new XMLHttpRequest();
    const token = sessionStorage.getItem('adminToken');

    currentUploadXhr = xhr;
    uploadLoading.value = true;
    uploadProgress.value = 0;
    uploadFileName.value = file.name;
    uploadPhase.value = 'uploading';

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        uploadProgress.value = pct;
        if (pct >= 100) {
          uploadPhase.value = 'processing';
        }
      }
    };

    xhr.onload = () => {
      if (currentUploadXhr === xhr) currentUploadXhr = null;
      uploadLoading.value = false;
      if (xhr.status === 401 || xhr.status === 403) {
        handleLogout();
        alert('登录已过期，请重新登录');
        resolve(null);
        return;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const result = JSON.parse(xhr.responseText);
          resolve(result.url);
        } catch {
          alert('上传失败：服务器响应异常');
          resolve(null);
        }
      } else {
        let msg = '上传失败，请重试';
        try { msg = JSON.parse(xhr.responseText).error || msg; } catch {}
        alert(msg);
        resolve(null);
      }
    };

    xhr.onerror = () => {
      if (currentUploadXhr === xhr) currentUploadXhr = null;
      // 只有在非主动取消时才报错
      if (uploadLoading.value) {
        uploadLoading.value = false;
        alert('网络错误，上传失败');
      }
      resolve(null);
    };

    xhr.onabort = () => {
      if (currentUploadXhr === xhr) currentUploadXhr = null;
      uploadLoading.value = false;
      resolve(null);
    };

    xhr.open('POST', '/api/upload');
    if (token) xhr.setRequestHeader('X-Admin-Token', token);
    xhr.send(formData);
  });
};

const getContent = (key: string): string => pageContents.value[key] || '';

const updateContent = (key: string, value: string) => {
  pageContents.value[key] = value;
};

const saveAllContents = async () => {
  try {
    await authFetch('/api/pages/home/contents', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pageContents.value)
    });
    showSaveSuccess('所有设置保存成功！');
  } catch (error: any) {
    if (!error.message.includes('登录已过期')) alert('保存失败，请重试');
  }
};

const handleMarkdownUploadSimple = (event: Event, key: string) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    const reader = new FileReader();
    reader.onload = (e) => updateContent(key, e.target?.result as string);
    reader.readAsText(target.files[0]);
  }
};

const handleEditorConfirm = (file: File) => {
  // 立刻关闭编辑器，给用户即时反馈
  const cb = editorCallback.value;
  editorVisible.value = false;
  editorFile.value = null;
  editorCallback.value = null;
  // 异步执行上传（cb 内部会启动 uploadImage 并显示遮罩）
  if (cb) {
    cb(file);
  }
};

const handleEditorCancel = () => {
  editorVisible.value = false;
  editorFile.value = null;
  editorCallback.value = null;
};

// ── 访客分析 ──
async function loadVisitStats() {
  const res = await fetchJson('/api/admin/visits/stats');
  if (res) visitStats.value = res;
}

async function loadVisits() {
  visitLoading.value = true;
  try {
    const f = visitFilter.value;
    const params = new URLSearchParams();
    Object.entries(f).forEach(([k, v]) => { if (v !== '' && v !== null && v !== undefined) params.set(k, String(v)); });
    const res = await fetchJson('/api/admin/visits?' + params.toString());
    if (res) {
      visitList.value = res.rows || [];
      visitTotal.value = res.total || 0;
    }
  } finally {
    visitLoading.value = false;
  }
}

function switchTab(name: string) {
  activeTab.value = name;
  if (name === 'visits') {
    loadVisitStats();
    loadVisits();
  }
}

async function deleteVisit(id: number) {
  if (!confirm('确定删除这条访问记录吗？')) return;
  const res = await fetchJson('/api/admin/visits/' + id, { method: 'DELETE' });
  if (res && (res as any).success) {
    visitList.value = visitList.value.filter(v => v.id !== id);
    visitTotal.value = Math.max(0, visitTotal.value - 1);
    loadVisitStats();
  }
}

async function cleanupVisits(days: number | 'all') {
  const msg = days === 'all' ? '确定清空所有访客记录吗？此操作不可恢复！' : `确定删除 ${days} 天前的所有访客记录吗？`;
  if (!confirm(msg)) return;
  const body = days === 'all' ? { all: true } : { olderThanDays: days };
  const res = await fetchJson('/api/admin/visits', { method: 'DELETE', body: JSON.stringify(body) });
  if (res && (res as any).success) {
    alert(`已清理 ${(res as any).deleted} 条记录`);
    loadVisitStats();
    loadVisits();
  }
}

function deviceIcon(type: string) {
  if (type === 'mobile') return '📱';
  if (type === 'tablet') return '📲';
  if (type === 'console' || type === 'smarttv') return '🖥️';
  return '💻';
}

function formatVisitTime(t: string) {
  if (!t) return '';
  // SQLite 存的是 UTC, 转本地时间显示
  const d = new Date(t.includes('Z') || t.includes('+') ? t : t.replace(' ', 'T') + 'Z');
  if (isNaN(d.getTime())) return t;
  return d.toLocaleString('zh-CN', { hour12: false });
}

onMounted(() => {
  checkLogin();
  if (isLoggedIn.value) loadData();
});
</script>

<template>
  <div class="admin-page">
    <div v-if="!isLoggedIn" class="login-container">
      <div class="login-box">
        <h2>管理后台登录</h2>
        <p class="login-hint">请输入管理员密码</p>
        <input
          v-model="password"
          type="password"
          placeholder="输入密码..."
          @keyup.enter="handleLogin"
          :disabled="loginLoading"
        />
        <button @click="handleLogin" :disabled="loginLoading">
          {{ loginLoading ? '登录中...' : '登录' }}
        </button>
        <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
      </div>
    </div>

    <template v-else>
      <section class="page-header">
        <div class="container">
          <div class="header-flex">
            <div>
              <h1>管理后台</h1>
              <p>深圳市龙岗区教学点</p>
            </div>
            <button class="logout-btn" @click="handleLogout">退出登录</button>
          </div>
          <div v-if="showSaveMessage" class="save-success">✓ {{ saveMessage }}</div>
        </div>
      </section>

      <!-- 上传遮罩 (全屏) -->
      <div v-if="uploadLoading" class="upload-overlay" role="dialog" aria-live="polite">
        <div class="upload-overlay-card">
          <div class="upload-overlay-spinner"></div>
          <div class="upload-overlay-text">
            {{ uploadPhase === 'processing' ? '服务器处理中…' : '正在上传…' }}
          </div>
          <div class="upload-overlay-filename" :title="uploadFileName">{{ uploadFileName }}</div>
          <div class="upload-overlay-progress">
            <div class="upload-overlay-progress-bar" :style="{ width: uploadProgress + '%' }"></div>
          </div>
          <div class="upload-overlay-percent">{{ uploadProgress }}%</div>
          <button class="upload-overlay-cancel" @click="cancelUpload">取消上传</button>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="dataLoading" class="global-loading" style="min-height:40vh">
        <div class="spinner"></div>
        <span class="loading-text">加载中...</span>
      </div>

      <!-- Error -->
      <div v-else-if="dataError" class="global-error" style="min-height:30vh">
        <div class="error-icon">⚠️</div>
        <div class="error-title">数据加载失败</div>
        <div class="error-message">{{ dataError }}</div>
        <button class="error-retry-btn" @click="loadData">重新加载</button>
      </div>

      <section v-else class="admin-content">
        <div class="container">
          <div class="tabs">
            <button :class="['tab', { active: activeTab === 'banners' }]" @click="activeTab = 'banners'">活动Banner管理</button>
            <button :class="['tab', { active: activeTab === 'courses' }]" @click="activeTab = 'courses'">课程管理</button>
            <button :class="['tab', { active: activeTab === 'contents' }]" @click="activeTab = 'contents'">页面内容编辑</button>
            <button :class="['tab', { active: activeTab === 'bookings' }]" @click="activeTab = 'bookings'">预约记录</button>
            <button :class="['tab', { active: activeTab === 'teachers' }]" @click="activeTab = 'teachers'">师资力量管理</button>
            <button :class="['tab', { active: activeTab === 'reviews' }]" @click="activeTab = 'reviews'">课程评价</button>
            <button :class="['tab', { active: activeTab === 'interactions' }]" @click="activeTab = 'interactions'">课程互动</button>
            <button :class="['tab', { active: activeTab === 'visits' }]" @click="switchTab('visits')">访客分析</button>
          </div>

          <!-- Banners Tab -->
          <div v-show="activeTab === 'banners'" class="tab-content">
            <div class="banners-list">
              <div v-for="banner in banners" :key="banner.id" class="banner-item">
                <div class="banner-fields">
                  <div class="field-group">
                    <label>标题 (中文)</label>
                    <input :value="banner.title" @input="banner.title = ($event.target as HTMLInputElement).value" placeholder="活动标题" />
                  </div>
                  <div class="field-group">
                    <label>标题 (English)</label>
                    <input :value="banner.title_en" @input="banner.title_en = ($event.target as HTMLInputElement).value" placeholder="Activity Title" />
                  </div>
                  <div class="field-group lang-group">
                    <label>中文图片</label>
                    <div class="image-upload">
                      <input type="file" @change="handleFileUpload($event, banner, 'zh')" accept="image/*" :disabled="uploadLoading" />
                      <img v-if="banner.image_url" :src="getImageUrl(banner.image_url)" alt="中文预览" class="preview-img" />
                    </div>
                    <input :value="banner.image_url" @input="banner.image_url = ($event.target as HTMLInputElement).value" placeholder="中文图片URL" />
                  </div>
                  <div class="field-group lang-group">
                    <label>英文图片</label>
                    <div class="image-upload">
                      <input type="file" @change="handleFileUpload($event, banner, 'en')" accept="image/*" :disabled="uploadLoading" />
                      <img v-if="banner.image_url_en" :src="getImageUrl(banner.image_url_en)" alt="英文预览" class="preview-img" />
                    </div>
                    <input :value="banner.image_url_en" @input="banner.image_url_en = ($event.target as HTMLInputElement).value" placeholder="English Image URL" />
                  </div>
                  <div class="field-group">
                    <label>链接</label>
                    <input :value="banner.link" @input="banner.link = ($event.target as HTMLInputElement).value" placeholder="跳转链接" />
                  </div>
                  <div class="field-group">
                    <label>显示顺序</label>
                    <input type="number" :value="banner.sort_order" @input="banner.sort_order = Number(($event.target as HTMLInputElement).value)" />
                  </div>
                  <div class="field-group">
                    <label class="checkbox-label">
                      <input type="checkbox" :checked="!!banner.active" @change="banner.active = ($event.target as HTMLInputElement).checked" />
                      显示
                    </label>
                  </div>
                </div>
                <div class="banner-actions">
                  <button class="btn-save" @click="saveBanner(banner)">保存</button>
                  <button class="btn-delete" @click="removeBanner(banner)">删除</button>
                </div>
              </div>
            </div>
            <button class="btn-add" @click="addBanner()">+ 添加活动</button>

            <!-- 工具区: 清理未引用的上传文件 -->
            <div class="tool-section">
              <h3>🧹 存储管理</h3>
              <div class="tool-row">
                <button class="btn-tool" @click="scanOrphans" :disabled="orphanScanning">
                  {{ orphanScanning ? '扫描中…' : '扫描未引用的文件' }}
                </button>
                <span v-if="orphanInfo" class="tool-info">
                  发现 <strong :class="{ 'has-orphans': orphanInfo.count > 0 }">{{ orphanInfo.count }}</strong> 个未引用文件，
                  共 <strong>{{ formatSize(orphanInfo.totalSize) }}</strong>
                </span>
              </div>
              <div v-if="orphanInfo && orphanInfo.orphans.length > 0" class="orphan-list">
                <div v-for="f in orphanInfo.orphans" :key="f" class="orphan-item">
                  <span class="orphan-name" :title="f">{{ f }}</span>
                </div>
                <div class="orphan-actions">
                  <button class="btn-tool btn-tool-danger" @click="cleanupOrphans(24)" :disabled="orphanScanning">
                    清理 24 小时前
                  </button>
                  <button class="btn-tool btn-tool-danger" @click="cleanupOrphans(0)" :disabled="orphanScanning">
                    全部清理
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- 课程管理 Tab -->
          <div v-show="activeTab === 'courses'" class="tab-content">
            <!-- 编辑器 -->
            <div v-if="editingCourse" class="course-editor">
              <h3>{{ courses.find(c => c.id === editingCourse.id) ? '编辑课程' : '新增课程' }}</h3>
              <div class="banner-fields">
                <div class="field-group">
                  <label>课程 ID (URL 用,如: my-course)</label>
                  <input v-model="editingCourse.course_id" :disabled="courses.find(c => c.id === editingCourse.id)" placeholder="my-course" />
                </div>
                <div class="field-group">
                  <label>课程名称 (中文) *</label>
                  <input v-model="editingCourse.name" placeholder="单词突击" />
                </div>
                <div class="field-group">
                  <label>课程名称 (English)</label>
                  <input v-model="editingCourse.name_en" placeholder="Word Assault" />
                </div>
                <div class="field-group">
                  <label>副标题 (中文)</label>
                  <input v-model="editingCourse.subtitle" placeholder="高效记忆,科学复习" />
                </div>
                <div class="field-group">
                  <label>副标题 (English)</label>
                  <input v-model="editingCourse.subtitle_en" placeholder="Effective, Scientific" />
                </div>
                <div class="field-group full">
                  <label>课程介绍 (中文, 支持 Markdown)</label>
                  <textarea v-model="editingCourse.description" rows="4" placeholder="详细介绍这门课..."></textarea>
                </div>
                <div class="field-group full">
                  <label>Course Description (English, Markdown supported)</label>
                  <textarea v-model="editingCourse.description_en" rows="4"></textarea>
                </div>
                <div class="field-group">
                  <label>现价 (¥)</label>
                  <input v-model="editingCourse.price" type="text" placeholder="0 或 199" />
                </div>
                <div class="field-group">
                  <label>原价 (¥, 可选)</label>
                  <input v-model="editingCourse.original_price" type="text" placeholder="0" />
                </div>
                <div class="field-group">
                  <label>课时数</label>
                  <input v-model="editingCourse.lesson_count" type="text" placeholder="1" />
                </div>
                <div class="field-group">
                  <label>学习人数</label>
                  <input v-model="editingCourse.student_count" type="text" placeholder="0" />
                </div>
                <div class="field-group">
                  <label>状态</label>
                  <input v-model="editingCourse.status" placeholder="已完结 / 招生中" />
                </div>
                <div class="field-group">
                  <label>有效期</label>
                  <input v-model="editingCourse.validity" placeholder="长期有效" />
                </div>
                <div class="field-group">
                  <label>排序 (小的排前面)</label>
                  <input v-model.number="editingCourse.sort_order" type="number" />
                </div>
                <div class="field-group">
                  <label class="checkbox-label">
                    <input type="checkbox" v-model="editingCourse.active" />
                    显示该课程
                  </label>
                </div>
                <div class="field-group full">
                  <label>关联教师（从现有教师中选择）</label>
                  <div class="course-teacher-row">
                    <div class="image-upload">
                      <label class="upload-label">教师头像（可覆盖默认）</label>
                      <input type="file" accept="image/*" @change="handleCourseAvatarUpload($event, editingCourse)" :disabled="uploadLoading" />
                      <img v-if="editingCourse.teacher_avatar" :src="getImageUrl(editingCourse.teacher_avatar)" class="preview-img avatar-preview" />
                    </div>
                    <div class="teacher-fields-inline">
                      <select v-model="editingCourse._teacherId" class="teacher-select" @change="applyTeacherFromList(editingCourse)">
                        <option value="">-- 选择已有教师 --</option>
                        <option v-for="t in teachers" :key="t.id" :value="t.id">
                          {{ t.name }}{{ t.name_en ? ' / ' + t.name_en : '' }}{{ t.title ? ' — ' + t.title : '' }}
                        </option>
                      </select>
                      <input v-model="editingCourse.teacher_name" placeholder="教师姓名 (中) - 自动填充" readonly />
                      <input v-model="editingCourse.teacher_name_en" placeholder="Teacher Name (En) - 自动填充" readonly />
                      <input v-model="editingCourse.teacher_title" placeholder="职称 (中) - 自动填充" readonly />
                      <input v-model="editingCourse.teacher_title_en" placeholder="Title (En) - 自动填充" readonly />
                    </div>
                  </div>
                </div>
                <div class="field-group full">
                  <label>课程封面图 (Banner)</label>
                  <div class="image-upload">
                    <input type="file" accept="image/*" @change="handleCourseBannerUpload($event, editingCourse)" :disabled="uploadLoading" />
                    <img v-if="editingCourse.banner_image" :src="getImageUrl(editingCourse.banner_image)" class="preview-img" />
                  </div>
                </div>
                <div class="field-group full">
                  <label>课程亮点 (Features)</label>
                  <div v-for="(f, i) in editingCourse.features" :key="i" class="feature-row">
                    <input v-model="f.icon" placeholder="⭐" class="feat-icon-input" />
                    <input v-model="f.title" placeholder="亮点标题" class="feat-title-input" />
                    <input v-model="f.desc" placeholder="亮点描述" class="feat-desc-input" />
                    <button type="button" class="btn-mini-delete" @click="removeCourseFeature(i)">×</button>
                  </div>
                  <button type="button" class="btn-add-feature" @click="addCourseFeature">+ 添加亮点</button>
                </div>
              </div>
              <div class="banner-actions">
                <button class="btn-save" @click="saveCourse">保存</button>
                <button class="btn-delete" @click="cancelEditCourse">取消</button>
              </div>
            </div>

            <!-- 列表 -->
            <div v-else>
              <div v-if="courses.length === 0" class="empty-state">
                <p>暂无课程,点击下方按钮添加第一门课程</p>
              </div>
              <div v-else class="course-list-admin">
                <div v-for="c in courses" :key="c.id" class="course-admin-card">
                  <div class="course-admin-banner">
                    <img v-if="c.banner_image" :src="getImageUrl(c.banner_image)" />
                    <div v-else class="card-banner-placeholder">无图</div>
                  </div>
                  <div class="course-admin-body">
                    <div class="course-admin-title-row">
                      <h4>{{ c.name }} <span v-if="c.name_en" class="en">/ {{ c.name_en }}</span></h4>
                      <span :class="['status-badge', c.active ? 'active' : 'inactive']">
                        {{ c.active ? '显示中' : '已隐藏' }}
                      </span>
                    </div>
                    <p class="course-admin-meta">
                      <span>¥{{ c.price }}</span>
                      <span v-if="c.original_price && c.original_price !== '0' && c.original_price !== c.price" class="orig">¥{{ c.original_price }}</span>
                      <span>· 排序: {{ c.sort_order || 0 }}</span>
                      <span>· 链接: <code>/course/{{ c.course_id }}</code></span>
                    </p>
                    <p v-if="c.teacher_name" class="course-admin-teacher">
                      教师: {{ c.teacher_name }}{{ c.teacher_name_en ? ' / ' + c.teacher_name_en : '' }}
                    </p>
                  </div>
                  <div class="course-admin-actions">
                    <button class="btn-edit" @click="editCourse(c)">编辑</button>
                    <button class="btn-delete" @click="removeCourse(c)">删除</button>
                  </div>
                </div>
              </div>
              <button class="btn-add" @click="addCourse" style="margin-top:1.5rem">+ 添加课程</button>
            </div>
          </div>

          <!-- Contents Tab -->
          <div v-show="activeTab === 'contents'" class="tab-content">
            <div class="simple-contents">
              <h3>基本信息设置</h3>
              <div class="content-row">
                <div class="content-item-simple">
                  <label>网站名称</label>
                  <input :value="getContent('site_name')" @input="updateContent('site_name', ($event.target as HTMLInputElement).value)" placeholder="中萱文化" />
                </div>
                <div class="content-item-simple">
                  <label>网站名称 (English)</label>
                  <input :value="getContent('site_name_en')" @input="updateContent('site_name_en', ($event.target as HTMLInputElement).value)" placeholder="Zhongxuan Culture" />
                </div>
              </div>
              <div class="content-row">
                <div class="content-item-simple">
                  <label>网站名称说明</label>
                  <input :value="getContent('site_note')" @input="updateContent('site_note', ($event.target as HTMLInputElement).value)" placeholder="中萱百日学通文化的简称" />
                </div>
                <div class="content-item-simple">
                  <label>网站名称说明 (English)</label>
                  <input :value="getContent('site_note_en')" @input="updateContent('site_note_en', ($event.target as HTMLInputElement).value)" placeholder="Abbreviation for Zhongxuan Bairixuetong Culture" />
                </div>
              </div>
              <div class="content-row">
                <div class="content-item-simple">
                  <label>联系电话</label>
                  <input :value="getContent('contact_phone')" @input="updateContent('contact_phone', ($event.target as HTMLInputElement).value)" placeholder="400-090-3299" />
                </div>
                <div class="content-item-simple">
                  <label>邮箱</label>
                  <input :value="getContent('contact_email')" @input="updateContent('contact_email', ($event.target as HTMLInputElement).value)" placeholder="contact@example.com" />
                </div>
              </div>
              <div class="content-row">
                <div class="content-item-simple">
                  <label>地址</label>
                  <input :value="getContent('contact_address')" @input="updateContent('contact_address', ($event.target as HTMLInputElement).value)" placeholder="深圳市龙岗区" />
                </div>
                <div class="content-item-simple">
                  <label>地址 (English)</label>
                  <input :value="getContent('contact_address_en')" @input="updateContent('contact_address_en', ($event.target as HTMLInputElement).value)" placeholder="Longgang District, Shenzhen" />
                </div>
              </div>

              <h3>联系页面设置</h3>
              <div class="content-row">
                <div class="content-item-simple">
                  <label>微信二维码</label>
                  <div class="image-upload">
                      <input type="file" @change="handleWechatQRUpload($event)" accept="image/*" :disabled="uploadLoading" />
                    <img v-if="getContent('wechat_qrcode')" :src="getImageUrl(getContent('wechat_qrcode'))" alt="微信二维码" class="preview-img" />
                  </div>
                </div>
              </div>
              <div class="content-row">
                <div class="content-item-simple">
                  <label>轮播文字 (用逗号分隔)</label>
                  <input :value="getContent('booking_rotating_texts')" @input="updateContent('booking_rotating_texts', ($event.target as HTMLInputElement).value)" placeholder="专业的师资团队,科学的学习方法" />
                </div>
                <div class="content-item-simple">
                  <label>轮播文字 (English)</label>
                  <input :value="getContent('booking_rotating_texts_en')" @input="updateContent('booking_rotating_texts_en', ($event.target as HTMLInputElement).value)" placeholder="Professional teachers,Scientific learning methods" />
                </div>
              </div>
              <div class="content-row">
                <div class="content-item-simple">
                  <label>工作日营业时间</label>
                  <input :value="getContent('business_hours_weekday')" @input="updateContent('business_hours_weekday', ($event.target as HTMLInputElement).value)" placeholder="9:00 - 21:00" />
                </div>
                <div class="content-item-simple">
                  <label>周末营业时间</label>
                  <input :value="getContent('business_hours_weekend')" @input="updateContent('business_hours_weekend', ($event.target as HTMLInputElement).value)" placeholder="10:00 - 18:00" />
                </div>
              </div>

              <h3>为什么选择我们</h3>
              <div class="content-row">
                <div class="content-item-simple full">
                  <label>为什么选择我们 (Markdown)</label>
                  <div class="markdown-upload">
                    <textarea :value="getContent('why_content')" @input="updateContent('why_content', ($event.target as HTMLTextAreaElement).value)" rows="8" placeholder="输入Markdown格式的内容..."></textarea>
                    <input type="file" accept=".md,.txt" @change="handleMarkdownUploadSimple($event, 'why_content')" />
                  </div>
                </div>
              </div>
              <div class="content-row">
                <div class="content-item-simple full">
                  <label>Why Choose Us (English Markdown)</label>
                  <div class="markdown-upload">
                    <textarea :value="getContent('why_content_en')" @input="updateContent('why_content_en', ($event.target as HTMLTextAreaElement).value)" rows="8" placeholder="Enter content in Markdown format..."></textarea>
                    <input type="file" accept=".md,.txt" @change="handleMarkdownUploadSimple($event, 'why_content_en')" />
                  </div>
                </div>
              </div>
              <button class="btn-save" @click="saveAllContents">保存所有设置</button>
            </div>
          </div>

          <!-- Bookings Tab -->
          <div v-show="activeTab === 'bookings'" class="tab-content">
            <div class="bookings-filter">
              <input v-model="filterName" placeholder="按姓名筛选..." />
              <input v-model="filterDate" type="date" placeholder="按日期筛选..." />
            </div>
            <div class="bookings-list">
              <table>
                <thead>
                  <tr>
                    <th>姓名</th><th>电话</th><th>邮箱</th><th>日期</th><th>时间</th><th>课程</th><th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="booking in filteredBookings()" :key="booking.id">
                    <td>{{ booking.name }}</td><td>{{ booking.phone }}</td><td>{{ booking.email }}</td>
                    <td>{{ formatDate(booking.date) }}</td><td>{{ booking.time }}</td><td>{{ booking.course }}</td>
                    <td>
                      <button class="btn-view" @click="viewDetail(booking)">查看</button>
                      <button class="btn-delete" @click="deleteBooking(booking.id)">删除</button>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div v-if="filteredBookings().length === 0" class="empty-state"><p>暂无预约记录</p></div>
            </div>
          </div>

          <!-- Teachers Tab -->
          <div v-show="activeTab === 'teachers'" class="tab-content">
            <div class="teachers-settings">
              <div class="setting-info">
                <span class="teacher-count">当前教师数量：{{ teachers.length }} / 最多10个</span>
              </div>
            </div>
            <div class="teachers-list">
              <div v-for="teacher in teachers" :key="teacher.id" class="teacher-item">
                <div class="teacher-fields">
                  <div class="field-group avatar-group">
                    <label>头像</label>
                    <div class="avatar-upload">
                      <input type="file" @change="handleTeacherAvatarUpload($event, teacher)" accept="image/*" :disabled="uploadLoading" />
                      <img v-if="teacher.avatar" :src="getImageUrl(teacher.avatar)" alt="教师头像" class="avatar-preview" />
                      <div v-else class="avatar-placeholder">点击上传头像</div>
                    </div>
                  </div>
                  <div class="field-group"><label>姓名</label><input :value="teacher.name" @input="teacher.name = ($event.target as HTMLInputElement).value" placeholder="教师姓名" /></div>
                  <div class="field-group"><label>姓名 (English)</label><input :value="teacher.name_en" @input="teacher.name_en = ($event.target as HTMLInputElement).value" placeholder="Teacher Name" /></div>
                  <div class="field-group"><label>职称</label><input :value="teacher.title" @input="teacher.title = ($event.target as HTMLInputElement).value" placeholder="高级英语教师" /></div>
                  <div class="field-group"><label>职称 (English)</label><input :value="teacher.title_en" @input="teacher.title_en = ($event.target as HTMLInputElement).value" placeholder="Senior English Teacher" /></div>
                  <div class="field-group"><label>简介</label><textarea :value="teacher.description" @input="teacher.description = ($event.target as HTMLTextAreaElement).value" rows="3" placeholder="教师简介..."></textarea></div>
                  <div class="field-group"><label>简介 (English)</label><textarea :value="teacher.description_en" @input="teacher.description_en = ($event.target as HTMLTextAreaElement).value" rows="3" placeholder="Teacher description..."></textarea></div>
                  <div class="field-group"><label class="checkbox-label"><input type="checkbox" :checked="teacher.active" @change="teacher.active = ($event.target as HTMLInputElement).checked" />显示</label></div>
                </div>
                <div class="teacher-actions">
                  <button class="btn-save" @click="saveTeacher(teacher)">保存</button>
                  <button class="btn-delete" @click="removeTeacher(teacher)">删除</button>
                </div>
              </div>
            </div>
            <button class="btn-add" @click="addTeacher()" :disabled="teachers.length >= 10">+ 添加教师</button>
          </div>

          <!-- Reviews Tab -->
          <div v-show="activeTab === 'reviews'" class="tab-content">
            <div class="bookings-list">
              <div v-if="courseReviews.length === 0" class="empty-state"><p>暂无评价记录</p></div>
              <div v-for="review in courseReviews" :key="review.id" class="banner-item">
                <div class="banner-fields">
                  <div class="field-group"><label>课程ID</label><input :value="review.course_id" readonly /></div>
                  <div class="field-group"><label>用户名</label><input :value="review.name" readonly /></div>
                  <div class="field-group"><label>评分</label><input :value="'★'.repeat(review.rating) + '☆'.repeat(5 - review.rating)" readonly /></div>
                  <div class="field-group"><label>时间</label><input :value="new Date(review.created_at).toLocaleString('zh-CN')" readonly /></div>
                  <div class="field-group full"><label>评价内容</label><textarea :value="review.content" readonly rows="2"></textarea></div>
                </div>
                <div class="banner-actions"><button class="btn-delete" @click="deleteReview(review.id)">删除</button></div>
              </div>
            </div>
          </div>

          <!-- Interactions Tab -->
          <div v-show="activeTab === 'interactions'" class="tab-content">
            <div class="bookings-list">
              <div v-if="courseInteractions.length === 0" class="empty-state"><p>暂无互动记录</p></div>
              <div v-for="item in courseInteractions" :key="item.id" class="banner-item">
                <div class="banner-fields">
                  <div class="field-group"><label>课程ID</label><input :value="item.course_id" readonly /></div>
                  <div class="field-group"><label>用户名</label><input :value="item.name" readonly /></div>
                  <div class="field-group"><label>时间</label><input :value="new Date(item.created_at).toLocaleString('zh-CN')" readonly /></div>
                  <div class="field-group full"><label>互动内容</label><textarea :value="item.content" readonly rows="2"></textarea></div>
                </div>
                <div class="banner-actions"><button class="btn-delete" @click="deleteInteraction(item.id)">删除</button></div>
              </div>
            </div>
          </div>

          <!-- 访客分析 Tab -->
          <div v-show="activeTab === 'visits'" class="tab-content">
            <!-- 统计卡片 -->
            <div class="visit-stats" v-if="visitStats">
              <div class="stat-card">
                <div class="stat-label">总访问量</div>
                <div class="stat-value">{{ visitStats.total }}</div>
              </div>
              <div class="stat-card stat-today">
                <div class="stat-label">今日访问</div>
                <div class="stat-value">{{ visitStats.today }}</div>
                <div class="stat-sub">IP: {{ visitStats.uniqueToday }}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">本周访问</div>
                <div class="stat-value">{{ visitStats.week }}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">本月访问</div>
                <div class="stat-value">{{ visitStats.month }}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">独立 IP</div>
                <div class="stat-value">{{ visitStats.uniqueIps }}</div>
              </div>
            </div>

            <!-- 详细分布 -->
            <div class="visit-distribution" v-if="visitStats">
              <div class="dist-block">
                <h4>热门页面 (Top 10)</h4>
                <div class="dist-list">
                  <div v-for="p in visitStats.topPaths" :key="p.path" class="dist-row">
                    <span class="dist-name">{{ p.path }}</span>
                    <div class="dist-bar-wrap"><div class="dist-bar" :style="{ width: Math.min(100, (p.c / (visitStats.topPaths[0]?.c || 1)) * 100) + '%' }"></div></div>
                    <span class="dist-count">{{ p.c }}</span>
                  </div>
                  <div v-if="!visitStats.topPaths.length" class="empty-state"><p>暂无数据</p></div>
                </div>
              </div>

              <div class="dist-block">
                <h4>浏览器分布</h4>
                <div class="dist-list">
                  <div v-for="b in visitStats.topBrowsers" :key="b.name" class="dist-row">
                    <span class="dist-name">{{ b.name }}</span>
                    <div class="dist-bar-wrap"><div class="dist-bar" :style="{ width: Math.min(100, (b.c / (visitStats.topBrowsers[0]?.c || 1)) * 100) + '%' }"></div></div>
                    <span class="dist-count">{{ b.c }}</span>
                  </div>
                  <div v-if="!visitStats.topBrowsers.length" class="empty-state"><p>暂无数据</p></div>
                </div>
              </div>

              <div class="dist-block">
                <h4>操作系统分布</h4>
                <div class="dist-list">
                  <div v-for="o in visitStats.topOs" :key="o.name" class="dist-row">
                    <span class="dist-name">{{ o.name }}</span>
                    <div class="dist-bar-wrap"><div class="dist-bar" :style="{ width: Math.min(100, (o.c / (visitStats.topOs[0]?.c || 1)) * 100) + '%' }"></div></div>
                    <span class="dist-count">{{ o.c }}</span>
                  </div>
                  <div v-if="!visitStats.topOs.length" class="empty-state"><p>暂无数据</p></div>
                </div>
              </div>

              <div class="dist-block">
                <h4>设备类型</h4>
                <div class="dist-list">
                  <div v-for="d in visitStats.deviceDist" :key="d.name" class="dist-row">
                    <span class="dist-name">{{ deviceIcon(d.name) }} {{ d.name || '未知' }}</span>
                    <div class="dist-bar-wrap"><div class="dist-bar" :style="{ width: Math.min(100, (d.c / (visitStats.deviceDist[0]?.c || 1)) * 100) + '%' }"></div></div>
                    <span class="dist-count">{{ d.c }}</span>
                  </div>
                  <div v-if="!visitStats.deviceDist.length" class="empty-state"><p>暂无数据</p></div>
                </div>
              </div>

              <div class="dist-block">
                <h4>访客来源 (Top 5)</h4>
                <div class="dist-list">
                  <div v-for="(c, i) in visitStats.topCountries" :key="i" class="dist-row">
                    <span class="dist-name">🌍 {{ c.country }}{{ c.region ? ' · ' + c.region : '' }}{{ c.city ? ' · ' + c.city : '' }}</span>
                    <div class="dist-bar-wrap"><div class="dist-bar" :style="{ width: Math.min(100, (c.c / (visitStats.topCountries[0]?.c || 1)) * 100) + '%' }"></div></div>
                    <span class="dist-count">{{ c.c }}</span>
                  </div>
                  <div v-if="!visitStats.topCountries.length" class="empty-state"><p>暂无数据</p></div>
                </div>
              </div>

              <div class="dist-block" v-if="visitStats.hourly.length">
                <h4>今日 24 小时访问分布</h4>
                <div class="hourly-chart">
                  <div v-for="h in 24" :key="h" class="hourly-bar">
                    <div class="hourly-fill" :style="{ height: (() => { const found = visitStats.hourly.find((x: any) => parseInt(x.hour) === h - 1); if (!found) return '0%'; const max = Math.max(...visitStats.hourly.map((x: any) => x.c)); return max ? (found.c / max * 100) + '%' : '0%'; })() }"></div>
                    <div class="hourly-label">{{ String(h - 1).padStart(2, '0') }}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 筛选 -->
            <div class="visit-filters">
              <div class="filter-row">
                <input v-model="visitFilter.ip" placeholder="筛选IP" @keyup.enter="loadVisits" />
                <input v-model="visitFilter.browser" placeholder="浏览器" @keyup.enter="loadVisits" />
                <input v-model="visitFilter.os" placeholder="操作系统" @keyup.enter="loadVisits" />
                <select v-model="visitFilter.device">
                  <option value="">所有设备</option>
                  <option value="desktop">💻 桌面</option>
                  <option value="mobile">📱 手机</option>
                  <option value="tablet">📲 平板</option>
                </select>
                <input v-model="visitFilter.path" placeholder="路径" @keyup.enter="loadVisits" />
                <input v-model="visitFilter.since" type="datetime-local" @change="loadVisits" title="开始时间" />
                <input v-model="visitFilter.until" type="datetime-local" @change="loadVisits" title="结束时间" />
                <button class="btn-primary" @click="loadVisits">查询</button>
                <button class="btn-secondary" @click="visitFilter = { ip: '', browser: '', os: '', device: '', path: '', since: '', until: '', limit: 50, offset: 0 }; loadVisits()">重置</button>
              </div>
            </div>

            <!-- 清理按钮 -->
            <div class="visit-actions">
              <span class="visit-count">共 {{ visitTotal }} 条记录</span>
              <button class="btn-tool" @click="loadVisits; loadVisitStats">刷新</button>
              <button class="btn-tool" @click="cleanupVisits(30)">清理 30 天前</button>
              <button class="btn-tool" @click="cleanupVisits(7)">清理 7 天前</button>
              <button class="btn-delete" @click="cleanupVisits('all')">清空全部</button>
            </div>

            <!-- 访问列表 -->
            <div class="visit-table-wrap">
              <div v-if="visitLoading" class="empty-state"><p>加载中…</p></div>
              <div v-else-if="visitList.length === 0" class="empty-state"><p>暂无访问记录</p></div>
              <table v-else class="visit-table">
                <thead>
                  <tr>
                    <th>时间</th>
                    <th>路径</th>
                    <th>IP</th>
                    <th>地理位置</th>
                    <th>浏览器</th>
                    <th>操作系统</th>
                    <th>设备</th>
                    <th>语言</th>
                    <th>分辨率</th>
                    <th>来源</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="v in visitList" :key="v.id">
                    <td class="cell-time">{{ formatVisitTime(v.visit_time) }}</td>
                    <td class="cell-path"><code>{{ v.path }}</code></td>
                    <td class="cell-ip">{{ v.ip || '-' }}</td>
                    <td class="cell-geo">
                      <span v-if="v.country">{{ v.country }}{{ v.region ? ' · ' + v.region : '' }}{{ v.city ? ' · ' + v.city : '' }}</span>
                      <span v-else>-</span>
                    </td>
                    <td>{{ v.browser }}{{ v.browser_version ? ' ' + v.browser_version : '' }}</td>
                    <td>{{ v.os || '-' }}</td>
                    <td class="cell-device">
                      <span class="device-badge" :class="'device-' + (v.device_type || 'desktop')">
                        {{ deviceIcon(v.device_type) }} {{ v.device_type || 'desktop' }}{{ v.device_model ? ' · ' + v.device_model : '' }}
                      </span>
                    </td>
                    <td>{{ v.language || '-' }}</td>
                    <td>{{ v.screen_resolution || '-' }}</td>
                    <td class="cell-referer" :title="v.referer">
                      <span v-if="v.referer">{{ new URL(v.referer).hostname }}</span>
                      <span v-else>直接访问</span>
                    </td>
                    <td><button class="btn-delete-sm" @click="deleteVisit(v.id)">删除</button></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <!-- Modal -->
      <div v-if="showModal" class="modal-overlay" @click="closeModal">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h3>预约详情</h3>
            <button @click="closeModal">×</button>
          </div>
          <div class="modal-body" v-if="selectedBooking">
            <div class="detail-row"><span class="label">姓名:</span><span>{{ selectedBooking.name }}</span></div>
            <div class="detail-row"><span class="label">电话:</span><span>{{ selectedBooking.phone }}</span></div>
            <div class="detail-row" v-if="selectedBooking.email"><span class="label">邮箱:</span><span>{{ selectedBooking.email }}</span></div>
            <div class="detail-row"><span class="label">日期:</span><span>{{ formatDate(selectedBooking.date) }}</span></div>
            <div class="detail-row"><span class="label">时间:</span><span>{{ selectedBooking.time }}</span></div>
            <div class="detail-row"><span class="label">课程:</span><span>{{ selectedBooking.course }}</span></div>
            <div class="detail-row"><span class="label">预约时间:</span><span>{{ new Date(selectedBooking.created_at).toLocaleString('zh-CN') }}</span></div>
          </div>
        </div>
      </div>

      <ImageEditor
        :visible="editorVisible"
        :image-file="editorFile"
        :aspect-ratio="editorAspectRatio"
        @confirm="handleEditorConfirm"
        @cancel="handleEditorCancel"
      />
    </template>
  </div>
</template>

<style scoped>
/* Admin 页面样式保持不变，与原版一致 */
.admin-page { min-height: 100vh; background: #f5f7fa; }

.login-container { display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 2rem; }
.login-box { background: white; padding: 3rem; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); text-align: center; width: 100%; max-width: 400px; }
.login-box h2 { margin: 0 0 1rem; color: #333; }
.login-hint { color: #666; margin-bottom: 1.5rem; }
.login-box input { width: 100%; padding: 12px; margin-bottom: 1rem; border: 1px solid #ddd; border-radius: 8px; font-size: 1rem; box-sizing: border-box; }
.login-box button { width: 100%; padding: 12px; background: var(--primary-color); color: white; border: none; border-radius: 8px; font-size: 1rem; cursor: pointer; transition: background 0.3s; }
.login-box button:hover { background: var(--primary-light); }
.login-box button:disabled { opacity: 0.6; cursor: not-allowed; }
.login-box .error { color: #f56c6c; margin-top: 1rem; }

.page-header { background: white; box-shadow: 0 2px 10px rgba(0,0,0,0.05); padding: 1.5rem 0; position: sticky; top: 0; z-index: 100; }
.page-header .container { max-width: 1200px; margin: 0 auto; padding: 0 2rem; }
.header-flex { display: flex; justify-content: space-between; align-items: center; }
.page-header h1 { margin: 0; color: #333; font-size: 1.8rem; }
.page-header p { margin: 0.5rem 0 0; color: #666; }
.logout-btn { padding: 0.5rem 1.5rem; background: #f56c6c; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.95rem; transition: background 0.3s; }
.logout-btn:hover { background: #f78989; }

.save-success { background: #67c23a; color: white; padding: 0.75rem 1.5rem; border-radius: 6px; margin-top: 1rem; animation: fadeIn 0.3s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }

.admin-content { padding: 2rem 0; max-width: 1400px; margin: 0 auto; }
.admin-content .container { padding: 0 2rem; }

.tabs { display: flex; gap: 1rem; margin-bottom: 2rem; border-bottom: 1px solid #eee; padding-bottom: 1rem; flex-wrap: wrap; }
.tab { padding: 0.75rem 1.5rem; background: white; border: 1px solid #ddd; border-radius: 6px; cursor: pointer; font-size: 0.95rem; transition: all 0.3s; }
.tab:hover { border-color: var(--primary-color); color: var(--primary-color); }
.tab.active { background: var(--primary-color); color: white; border-color: var(--primary-color); }

.tab-content { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
.banners-list { display: flex; flex-direction: column; gap: 2rem; margin-bottom: 2rem; }
.banner-item { border: 1px solid #eee; border-radius: 10px; padding: 1.5rem; background: #fafafa; }
.banner-fields { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin-bottom: 1rem; }
.field-group { display: flex; flex-direction: column; gap: 0.5rem; }
.field-group.lang-group { grid-column: span 1; }
.field-group.full { grid-column: span 2; }
.field-group label { font-weight: 600; color: #333; font-size: 0.9rem; }
.field-group input, .field-group textarea { padding: 0.75rem; border: 1px solid #ddd; border-radius: 6px; font-size: 0.95rem; }
.field-group textarea { resize: vertical; min-height: 100px; font-family: inherit; }
.checkbox-label { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; }
.checkbox-label input[type="checkbox"] { width: auto; }
.image-upload { display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap; }
.image-upload input[type="file"] { flex: 1; }
.preview-img { max-width: 150px; max-height: 100px; border-radius: 6px; border: 1px solid #eee; object-fit: cover; }
.banner-actions { display: flex; gap: 1rem; justify-content: flex-end; }

.btn-save { padding: 0.75rem 1.5rem; background: #67c23a; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.95rem; transition: background 0.3s; }
.btn-save:hover { background: #85ce61; }
.btn-delete { padding: 0.75rem 1.5rem; background: #f56c6c; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.95rem; transition: background 0.3s; }
.btn-delete:hover { background: #f78989; }
.btn-view { padding: 0.5rem 1rem; background: var(--info-color); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85rem; margin-right: 0.5rem; }
.btn-view:hover { background: #66b1ff; }
.btn-add { padding: 0.75rem 2rem; background: var(--primary-color); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 1rem; transition: background 0.3s; }
.btn-add:hover:not(:disabled) { background: var(--primary-light); }
.btn-add:disabled { background: #909399; cursor: not-allowed; }

.course-editor h3 { margin: 0 0 1.5rem; color: #333; border-bottom: 2px solid var(--primary-color); padding-bottom: 0.75rem; }
.course-editor .banner-fields { grid-template-columns: repeat(2, 1fr); }
.course-editor .field-group.full { grid-column: span 2; }
.course-editor textarea {
  width: 100%; padding: 0.75rem; border: 1px solid #ddd;
  border-radius: 6px; font-family: inherit; font-size: 14px;
  resize: vertical; box-sizing: border-box;
}
.course-editor textarea:focus { outline: none; border-color: var(--primary-color); }
.course-teacher-row { display: flex; gap: 1rem; align-items: flex-start; }
.teacher-fields-inline { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; flex: 1; }
.teacher-fields-inline input { padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; font-size: 13px; }
.teacher-fields-inline input[readonly] { background: #f7f7f7; color: #666; cursor: not-allowed; }
.teacher-select {
  grid-column: 1 / -1;
  padding: 0.6rem;
  border: 1px solid var(--primary-color);
  border-radius: 4px;
  font-size: 14px;
  background: #f0f9ff;
  margin-bottom: 0.25rem;
}
.upload-label { font-size: 0.85rem; color: #666; display: block; margin-bottom: 0.25rem; }
.preview-img.avatar-preview { width: 64px; height: 64px; border-radius: 50%; object-fit: cover; }
.feature-row { display: flex; gap: 0.5rem; margin-bottom: 0.5rem; align-items: center; }
.feat-icon-input { width: 60px; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; text-align: center; }
.feat-title-input { width: 200px; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; }
.feat-desc-input { flex: 1; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; }
.btn-mini-delete { background: #f56c6c; color: white; border: none; border-radius: 4px; width: 28px; height: 28px; cursor: pointer; font-size: 14px; }
.btn-add-feature { padding: 0.4rem 1rem; background: #f0f9ff; color: var(--primary-color); border: 1px dashed var(--primary-color); border-radius: 4px; cursor: pointer; font-size: 13px; }

.course-list-admin { display: flex; flex-direction: column; gap: 1rem; }
.course-admin-card {
  display: flex; gap: 1rem; align-items: stretch;
  border: 1px solid #e5e7eb; border-radius: 10px;
  padding: 1rem; background: #fff; transition: box-shadow 0.2s;
}
.course-admin-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.course-admin-banner { width: 140px; flex-shrink: 0; aspect-ratio: 16/9; border-radius: 6px; overflow: hidden; background: #f0f0f0; }
.course-admin-banner img { width: 100%; height: 100%; object-fit: cover; }
.card-banner-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #999; font-size: 12px; }
.course-admin-body { flex: 1; display: flex; flex-direction: column; gap: 0.5rem; }
.course-admin-title-row { display: flex; align-items: center; gap: 0.75rem; }
.course-admin-title-row h4 { margin: 0; font-size: 1rem; color: #333; }
.course-admin-title-row .en { color: #888; font-weight: 400; font-size: 0.9rem; }
.status-badge { padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
.status-badge.active { background: #dcfce7; color: #16a34a; }
.status-badge.inactive { background: #f3f4f6; color: #6b7280; }
.course-admin-meta { margin: 0; font-size: 13px; color: #6b7280; display: flex; gap: 0.75rem; flex-wrap: wrap; }
.course-admin-meta .orig { text-decoration: line-through; color: #999; }
.course-admin-meta code { background: #f3f4f6; padding: 1px 6px; border-radius: 3px; font-size: 12px; color: #374151; }
.course-admin-teacher { margin: 0; font-size: 13px; color: #6b7280; }
.course-admin-actions { display: flex; flex-direction: column; gap: 0.5rem; }
.btn-edit { padding: 0.5rem 1rem; background: var(--primary-color); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; min-width: 60px; }
.btn-edit:hover { background: var(--primary-light); }

.tool-section { margin-top: 2.5rem; padding: 1.25rem; background: #fafbfc; border: 1px dashed #d1d5db; border-radius: 8px; }
.tool-section h3 { margin: 0 0 0.75rem; font-size: 1rem; color: #374151; }
.tool-row { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
.tool-info { font-size: 0.9rem; color: #6b7280; }
.tool-info .has-orphans { color: #f59e0b; }
.orphan-list { margin-top: 0.75rem; max-height: 200px; overflow-y: auto; background: #fff; border: 1px solid #e5e7eb; border-radius: 6px; padding: 0.5rem; }
.orphan-item { padding: 0.25rem 0.5rem; font-size: 0.8rem; font-family: monospace; color: #6b7280; border-bottom: 1px solid #f3f4f6; }
.orphan-item:last-child { border-bottom: none; }
.orphan-name { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.orphan-actions { display: flex; gap: 0.5rem; margin-top: 0.75rem; flex-wrap: wrap; }
.btn-tool { padding: 0.5rem 1rem; background: #fff; color: #374151; border: 1px solid #d1d5db; border-radius: 6px; cursor: pointer; font-size: 0.9rem; transition: all 0.2s; }
.btn-tool:hover:not(:disabled) { background: #f3f4f6; border-color: #9ca3af; }
.btn-tool:disabled { opacity: 0.55; cursor: not-allowed; }
.btn-tool-danger { color: #dc2626; border-color: #fca5a5; }
.btn-tool-danger:hover:not(:disabled) { background: #fef2f2; border-color: #dc2626; }

.simple-contents h3 { margin: 0 0 1.5rem; color: #333; border-bottom: 2px solid var(--primary-color); padding-bottom: 0.75rem; }
.content-row { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; margin-bottom: 1.5rem; }
.content-item-simple { display: flex; flex-direction: column; gap: 0.5rem; }
.content-item-simple.full { grid-column: span 2; }
.content-item-simple label { font-weight: 600; color: #333; font-size: 0.9rem; }
.content-item-simple input, .content-item-simple textarea { padding: 0.75rem; border: 1px solid #ddd; border-radius: 6px; font-size: 0.95rem; }
.content-item-simple textarea { resize: vertical; min-height: 100px; font-family: inherit; }
.markdown-upload { display: flex; flex-direction: column; gap: 0.5rem; }
.markdown-upload textarea { width: 100%; min-height: 150px; padding: 0.75rem; border: 1px solid #ddd; border-radius: 6px; font-family: 'Courier New', monospace; resize: vertical; box-sizing: border-box; }

.bookings-filter { display: flex; gap: 1rem; margin-bottom: 1.5rem; }
.bookings-filter input { padding: 0.75rem; border: 1px solid #ddd; border-radius: 6px; flex: 1; max-width: 300px; }
.bookings-list { overflow-x: auto; }
.bookings-list table { width: 100%; border-collapse: collapse; }
.bookings-list th, .bookings-list td { padding: 1rem; text-align: left; border-bottom: 1px solid #eee; }
.bookings-list th { background: #fafafa; font-weight: 600; color: #333; }
.empty-state { text-align: center; padding: 3rem; color: #909399; }

.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-content { background: white; border-radius: 12px; padding: 2rem; width: 90%; max-width: 500px; animation: slideIn 0.3s ease; }
@keyframes slideIn { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; border-bottom: 1px solid #eee; padding-bottom: 1rem; }
.modal-header h3 { margin: 0; color: #333; }
.modal-header button { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #666; }
.modal-header button:hover { color: #333; }
.detail-row { display: flex; gap: 1rem; padding: 0.75rem 0; border-bottom: 1px solid #f5f5f5; }
.detail-row .label { font-weight: 600; color: #333; width: 100px; }

.teachers-settings { margin-bottom: 1.5rem; padding: 1rem; background: #f5f7fa; border-radius: 8px; }
.setting-info { display: flex; gap: 2rem; align-items: center; }
.teacher-count { color: var(--primary-color); font-weight: 500; }

.teachers-list { display: flex; flex-direction: column; gap: 2rem; margin-bottom: 2rem; }
.teacher-item { border: 1px solid #eee; border-radius: 10px; padding: 1.5rem; background: #fafafa; }
.teacher-fields { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin-bottom: 1rem; }
.avatar-group { grid-column: span 1; }
.avatar-upload { display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap; }
.avatar-upload input[type="file"] { flex: 1; }
.avatar-preview { width: 120px; height: 120px; border-radius: 50%; border: 2px solid #e0e0e0; object-fit: cover; }
.avatar-placeholder { width: 120px; height: 120px; border-radius: 50%; border: 2px dashed #e0e0e0; display: flex; align-items: center; justify-content: center; color: #909399; font-size: 0.9rem; text-align: center; }
.teacher-actions { display: flex; gap: 1rem; justify-content: flex-end; }

@media (max-width: 992px) {
  .tabs { flex-wrap: wrap; gap: 0.5rem; }
  .tab { padding: 0.5rem 1rem; font-size: 0.85rem; }
}

@media (max-width: 768px) {
  .page-header { padding: 1rem 0; }
  .page-header .container { padding: 0 1rem; }
  .header-flex { flex-direction: column; align-items: flex-start; gap: 0.75rem; }
  .page-header h1 { font-size: 1.4rem; }
  .logout-btn { align-self: flex-start; min-height: 44px; padding: 0 1.25rem; }
  .admin-content { padding: 1rem 0; }
  .admin-content .container { padding: 0 0.75rem; }
  .tab-content { padding: 1rem; border-radius: 10px; }
  .content-row { grid-template-columns: 1fr; }
  .content-item-simple.full { grid-column: span 1; }
  .tabs { flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem; }
  .tab { padding: 0.6rem 1rem; font-size: 0.85rem; min-height: 44px; }
  .banner-fields, .teacher-fields { grid-template-columns: 1fr; }
  .banner-item, .teacher-item { padding: 1rem; }
  .course-editor .banner-fields { grid-template-columns: 1fr; }
  .course-editor .field-group.full { grid-column: span 1; }
  .course-teacher-row { flex-direction: column; }
  .teacher-fields-inline { grid-template-columns: 1fr; }
  .course-admin-card { flex-direction: column; }
  .course-admin-banner { width: 100%; }
  .course-admin-actions { flex-direction: row; }
  .feature-row { flex-wrap: wrap; }
  .feat-title-input, .feat-desc-input { width: 100%; flex: 1 1 100%; }
  .teacher-actions, .banner-actions { justify-content: stretch; }
  .teacher-actions button, .banner-actions button { flex: 1; min-height: 44px; }
  .setting-info { flex-direction: column; align-items: flex-start; gap: 0.5rem; }
  .bookings-filter { flex-direction: column; gap: 0.75rem; }
  .bookings-filter input { max-width: 100%; min-height: 44px; font-size: 15px; }
  .bookings-list table { font-size: 13px; }
  .bookings-list th, .bookings-list td { padding: 10px 6px; }
  .btn-view, .btn-delete { min-height: 36px; font-size: 12px; padding: 0 10px; }
  .btn-save, .btn-add { min-height: 44px; font-size: 14px; }
  .modal-content { padding: 1.5rem; width: 95%; border-radius: 16px; }
}

@media (max-width: 480px) {
  .login-box { padding: 2rem 1.5rem; border-radius: 16px; }
  .login-box input { min-height: 48px; font-size: 16px; border-radius: 10px; }
  .login-box button { min-height: 48px; font-size: 16px; border-radius: 10px; }
  .preview-img { max-width: 100px; max-height: 80px; }
  .avatar-preview, .avatar-placeholder { width: 80px; height: 80px; }
  .bookings-list table { font-size: 12px; }
  .bookings-list th, .bookings-list td { padding: 8px 4px; }
  .field-group input, .field-group textarea, .content-item-simple input, .content-item-simple textarea { min-height: 44px; font-size: 15px; border-radius: 8px; }
}

/* === 访客分析 === */
.visit-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 14px;
  margin-bottom: 20px;
}
.stat-card {
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
  border-radius: 12px;
  padding: 18px;
  border: 1px solid #e0e0e0;
  transition: transform .2s;
}
.stat-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
.stat-card.stat-today { background: linear-gradient(135deg, #4a90e2, #357abd); color: #fff; border-color: #357abd; }
.stat-card.stat-today .stat-sub { color: rgba(255,255,255,0.85); }
.stat-label { font-size: 13px; color: #6c757d; margin-bottom: 6px; }
.stat-card.stat-today .stat-label { color: rgba(255,255,255,0.9); }
.stat-value { font-size: 28px; font-weight: 700; line-height: 1.2; }
.stat-sub { font-size: 12px; margin-top: 4px; color: #6c757d; }

.visit-distribution {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}
.dist-block {
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  padding: 16px;
}
.dist-block h4 { margin: 0 0 12px 0; font-size: 15px; color: #333; }
.dist-list { display: flex; flex-direction: column; gap: 8px; }
.dist-row {
  display: grid;
  grid-template-columns: 130px 1fr 40px;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}
.dist-name { color: #555; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dist-bar-wrap { background: #f0f0f0; border-radius: 4px; height: 8px; overflow: hidden; }
.dist-bar { background: linear-gradient(90deg, #4a90e2, #5ba0f2); height: 100%; transition: width .3s; }
.dist-count { text-align: right; font-weight: 600; color: #333; }

.hourly-chart {
  display: grid;
  grid-template-columns: repeat(24, 1fr);
  gap: 3px;
  height: 90px;
  align-items: end;
  margin-top: 8px;
}
.hourly-bar { display: flex; flex-direction: column; align-items: center; height: 100%; justify-content: flex-end; }
.hourly-fill { width: 100%; background: linear-gradient(180deg, #4a90e2, #357abd); border-radius: 2px 2px 0 0; min-height: 1px; transition: height .3s; }
.hourly-label { font-size: 9px; color: #999; margin-top: 2px; }

.visit-filters { background: #f8f9fa; padding: 14px; border-radius: 8px; margin-bottom: 14px; }
.filter-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.filter-row input, .filter-row select { padding: 7px 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; background: #fff; }
.filter-row input { min-width: 110px; }
.filter-row select { min-width: 110px; }

.visit-actions { display: flex; gap: 10px; align-items: center; margin-bottom: 14px; flex-wrap: wrap; }
.visit-count { color: #666; font-size: 14px; margin-right: auto; }

.visit-table-wrap { overflow-x: auto; border: 1px solid #e0e0e0; border-radius: 8px; background: #fff; }
.visit-table { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 1100px; }
.visit-table th { background: #f8f9fa; padding: 10px 8px; text-align: left; font-weight: 600; color: #555; border-bottom: 2px solid #e0e0e0; position: sticky; top: 0; z-index: 1; }
.visit-table td { padding: 9px 8px; border-bottom: 1px solid #f0f0f0; vertical-align: middle; }
.visit-table tr:hover { background: #fafbfc; }
.cell-time { white-space: nowrap; color: #666; font-size: 12px; }
.cell-path code { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; font-size: 12px; color: #d63384; }
.cell-ip { font-family: monospace; color: #0d6efd; }
.cell-geo { color: #198754; }
.cell-device .device-badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; background: #e7f1ff; color: #0d6efd; }
.cell-device .device-badge.device-mobile { background: #fff3cd; color: #856404; }
.cell-device .device-badge.device-tablet { background: #d1ecf1; color: #0c5460; }
.cell-referer { color: #6c757d; max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.btn-delete-sm { padding: 3px 10px; font-size: 12px; background: #dc3545; color: #fff; border: none; border-radius: 4px; cursor: pointer; }
.btn-delete-sm:hover { background: #c82333; }

@media (max-width: 768px) {
  .visit-stats { grid-template-columns: repeat(2, 1fr); }
  .dist-row { grid-template-columns: 100px 1fr 30px; font-size: 12px; }
  .stat-value { font-size: 22px; }
  .filter-row input, .filter-row select { min-width: 0; flex: 1; }
}
</style>
