/**
 * utils/request.js — 统一网络请求封装
 * 复用现有 Express 后端 API，仅需配置域名即可
 */

const app = getApp();

/**
 * 核心请求方法
 * @param {object} options - { url, method, data, header }
 * @returns {Promise}
 */
const request = (options) => {
  return new Promise((resolve, reject) => {
    const baseUrl = app.globalData.baseUrl || 'https://你的域名.com';

    wx.request({
      url: `${baseUrl}${options.url}`,
      method: options.method || 'GET',
      data: options.data || {},
      header: {
        'Content-Type': 'application/json',
        ...options.header,
      },
      timeout: 10000,
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          const msg = (res.data && res.data.error) || `请求失败(${res.statusCode})`;
          wx.showToast({ title: msg, icon: 'none', duration: 2000 });
          reject({ code: res.statusCode, message: msg });
        }
      },
      fail(err) {
        wx.showToast({ title: '网络连接失败', icon: 'none', duration: 2000 });
        reject({ code: -1, message: '网络错误', detail: err });
      },
    });
  });
};

/**
 * 获取页面内容（对应 /api/pages/home/contents）
 */
const getPageContents = (page = 'home') => {
  return request({ url: `/api/pages/${page}/contents` });
};

/**
 * 获取 Banner 列表
 */
const getBanners = () => {
  return request({ url: '/api/banners' });
};

/**
 * 获取教师列表
 */
const getTeachers = () => {
  return request({ url: '/api/teachers' });
};

/**
 * 获取课程列表
 */
const getCourses = () => {
  return request({ url: '/api/courses' });
};

/**
 * 获取课程详情
 */
const getCourseDetail = (id) => {
  return request({ url: `/api/courses/${id}` });
};

/**
 * 提交预约
 */
const submitBooking = (data) => {
  return request({ url: '/api/bookings', method: 'POST', data });
};

/**
 * 课程报名（对应后端 /api/course-enroll）
 */
const submitEnroll = (data) => {
  return request({ url: '/api/course-enroll', method: 'POST', data });
};

/**
 * 提交课程评价
 */
const submitReview = (courseId, data) => {
  return request({ url: `/api/courses/${courseId}/reviews`, method: 'POST', data });
};

/**
 * 提交课程评论
 */
const submitComment = (courseId, data) => {
  return request({ url: `/api/courses/${courseId}/interactions`, method: 'POST', data });
};

module.exports = {
  request,
  getPageContents,
  getBanners,
  getTeachers,
  getCourses,
  getCourseDetail,
  submitBooking,
  submitEnroll,
  submitReview,
  submitComment,
};
