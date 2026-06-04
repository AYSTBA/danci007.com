const app = getApp();
const { getPageContents, submitBooking } = require('../../utils/request');
const { buildImageUrl } = require('../../utils/format');

Page({
  data: {
    loading: true,
    pageContents: {},
    isSubmitted: false,
    form: { name: '', phone: '', email: '', date: '', time: '', course: '', message: '' },
    timeOptions: [],
    courseOptions: [
      '自然拼读(试学)', '单词突击(试学)', '英语特长训练班(试学)',
      '小初高英语综合培优(试学)', '新概念(试学)', '拓展词学习(试学)',
      '托福(试学)', '雅思(试学)', '朗文(试学)',
      '剑桥KET(试学)', '剑桥PET(试学)',
    ],
    showWechatQR: false,
  },

  onLoad() {
    this.baseUrl = app.globalData.baseUrl;
    this.loadContents();

    // 从课程页跳转过来时，预选课程
    if (app.globalData.preselectedCourse) {
      this.setData({ 'form.course': app.globalData.preselectedCourse });
      app.globalData.preselectedCourse = null; // 用完即清
    }
  },

  async loadContents() {
    try {
      const contents = await getPageContents('home');
      this.setData({ pageContents: contents, loading: false });
    } catch (err) {
      console.error('[booking] 加载失败:', err);
      this.setData({ loading: false });
    }
  },

  // ── 表单输入 ──
  onNameInput(e) { this.setData({ 'form.name': e.detail.value }); },
  onPhoneInput(e) { this.setData({ 'form.phone': e.detail.value }); },
  onEmailInput(e) { this.setData({ 'form.email': e.detail.value }); },
  onDateChange(e) {
    const date = e.detail.value;
    this.setData({ 'form.date': date, 'form.time': '' });
    this.updateTimeOptions(date);
  },
  onTimeChange(e) { this.setData({ 'form.time': e.detail.value }); },
  onCourseChange(e) { this.setData({ 'form.course': this.data.courseOptions[e.detail.value] }); },
  onMessageInput(e) { this.setData({ 'form.message': e.detail.value }); },

  updateTimeOptions(dateStr) {
    if (!dateStr) { this.setData({ timeOptions: [] }); return; }
    const day = new Date(dateStr).getDay();
    const isWeekend = day === 0 || day === 6;
    const timeOptions = isWeekend
      ? ['9:00-10:30', '10:30-12:00', '14:00-15:30', '15:30-17:00', '17:30-18:30']
      : ['17:00-18:00', '18:00-19:00', '19:00-20:00', '20:00-21:00'];
    this.setData({ timeOptions });
  },

  // ── 提交 ──
  async handleSubmit() {
    const { form } = this.data;
    if (!form.name || !form.phone || !form.date || !form.time || !form.course) {
      wx.showToast({ title: '请填写所有必填字段', icon: 'none' });
      return;
    }
    try {
      await submitBooking(form);
      this.setData({ isSubmitted: true });
    } catch {
      wx.showToast({ title: '提交失败，请重试', icon: 'none' });
    }
  },

  resetForm() {
    this.setData({
      isSubmitted: false,
      form: { name: '', phone: '', email: '', date: '', time: '', course: '', message: '' },
      timeOptions: [],
    });
  },

  // ── 联系方式 ──
  makeCall() {
    const phone = this.data.pageContents.contact_phone || '18938908657';
    wx.makePhoneCall({ phoneNumber: phone });
  },

  toggleQR() {
    this.setData({ showWechatQR: !this.data.showWechatQR });
  },

  goHome() {
    wx.switchTab({ url: '/pages/index/index' });
  },

  onShareAppMessage() {
    return {
      title: '预约体验课 - 中萱文化',
      path: '/pages/booking/booking',
    };
  },
});
