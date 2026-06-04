const app = getApp();
const { getCourseDetail, submitEnroll, submitComment, submitReview, request } = require('../../utils/request');
const { buildImageUrl, formatTime, parseMarkdown } = require('../../utils/format');

Page({
  data: {
    loading: true,
    course: null,
    activeTab: 'detail',

    // 互动
    interactions: [],
    commentName: '',
    newComment: '',
    commentSubmitted: false,

    // 评价
    reviews: [],
    avgRating: '5.0',
    showReviewForm: false,
    myRating: 5,
    myReview: '',
    myName: '',
    reviewSubmitted: false,
  },

  onLoad() {
    this.baseUrl = app.globalData.baseUrl;
    this.loadCourse();
  },

  async loadCourse() {
    try {
      const course = await getCourseDetail('enroll');
      if (course) {
        course.imageUrl = buildImageUrl(course.banner_image || course.image_url, this.baseUrl);
        course.teacherAvatarUrl = buildImageUrl(course.teacher_avatar, this.baseUrl);
        course.teacherInitial = (course.teacher_name || '?')[0];
        // 解析 description 中的 Markdown
        if (course.description) {
          course.descParagraphs = parseMarkdown(course.description);
        }
        // features 可能是 JSON 字符串
        if (typeof course.features === 'string') {
          try { course.features = JSON.parse(course.features); } catch { course.features = []; }
        }
        if (!Array.isArray(course.features)) course.features = [];
      }
      this.setData({ course, loading: false });
      this.loadInteractions();
      this.loadReviews();
    } catch (err) {
      console.error('[enrollment] 加载失败:', err);
      this.setData({ loading: false });
    }
  },

  // ── Tab 切换 ──
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
    if (tab === 'interact') this.loadInteractions();
    if (tab === 'review') this.loadReviews();
  },

  // ── 互动 ──
  async loadInteractions() {
    try {
      const list = await request({ url: '/api/courses/enroll/interactions' });
      const interactions = (list || []).map(item => ({
        ...item,
        nameInitial: (item.name || '?')[0],
      }));
      this.setData({ interactions });
    } catch { /* 静默 */ }
  },

  onCommentNameInput(e) { this.setData({ commentName: e.detail.value }); },
  onCommentInput(e) { this.setData({ newComment: e.detail.value }); },

  async submitComment() {
    const { commentName, newComment } = this.data;
    if (!commentName.trim() || !newComment.trim()) return;
    try {
      await submitComment('enroll', { name: commentName, content: newComment });
      this.setData({ newComment: '', commentSubmitted: true });
      setTimeout(() => this.setData({ commentSubmitted: false }), 2000);
      this.loadInteractions();
    } catch { /* 静默 */ }
  },

  // ── 评价 ──
  async loadReviews() {
    try {
      const list = await request({ url: '/api/courses/enroll/reviews' });
      const reviews = (list || []).map(item => ({
        ...item,
        nameInitial: (item.name || '?')[0],
      }));
      let avgRating = '5.0';
      if (reviews.length) {
        const sum = reviews.reduce((a, r) => a + r.rating, 0);
        avgRating = (sum / reviews.length).toFixed(1);
      }
      this.setData({ reviews, avgRating });
    } catch { /* 静默 */ }
  },

  toggleReviewForm() {
    this.setData({ showReviewForm: !this.data.showReviewForm });
  },

  onReviewNameInput(e) { this.setData({ myName: e.detail.value }); },
  onReviewInput(e) { this.setData({ myReview: e.detail.value }); },

  setRating(e) {
    this.setData({ myRating: Number(e.currentTarget.dataset.star) });
  },

  async submitReview() {
    const { myName, myRating, myReview } = this.data;
    if (!myName.trim() || !myReview.trim()) {
      wx.showToast({ title: '请填写完整', icon: 'none' });
      return;
    }
    try {
      await submitReview('enroll', { name: myName, rating: myRating, content: myReview });
      this.setData({ myName: '', myReview: '', myRating: 5, reviewSubmitted: true, showReviewForm: false });
      setTimeout(() => this.setData({ reviewSubmitted: false }), 2000);
      this.loadReviews();
    } catch { /* 静默 */ }
  },

  // ── 报名 → 跳转预约页 ──
  doEnroll() {
    const { course } = this.data;
    const courseName = course ? (course.name || course.title || '') : '';
    wx.switchTab({
      url: '/pages/booking/booking',
      success: () => {
        // 通过 eventChannel 或 globalData 传递课程名给预约页
        if (courseName) {
          app.globalData.preselectedCourse = courseName;
        }
      },
    });
  },

  // ── 分享 ──
  onShareAppMessage() {
    const { course } = this.data;
    return {
      title: course?.name || '课程报名',
      path: '/pages/enrollment/enrollment',
    };
  },
});
