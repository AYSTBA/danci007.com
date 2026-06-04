// app.js — 全局应用入口
App({
  globalData: {
    // 后端 API 地址
    // 本机开发用IP（模拟器可能无法解析localhost）
    // 生产环境改为真实HTTPS域名
    baseUrl: 'http://192.168.1.6:3001',
    // 用户信息（微信登录后填入）
    userInfo: null,
    // 系统信息缓存
    systemInfo: null,
  },

  onLaunch() {
    // 获取系统信息（安全区域、状态栏高度等）
    const info = wx.getSystemInfoSync();
    this.globalData.systemInfo = info;

    // 读取缓存的语言偏好
    const lang = wx.getStorageSync('lang') || 'zh';
    this.globalData.lang = lang;

    console.log('[App] 启动完成，基础库版本：', info.SDKVersion);
  },

  onShow() {},
  onHide() {},
});
