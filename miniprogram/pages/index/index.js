const app = getApp();
const { getBanners, getPageContents, getTeachers } = require('../../utils/request');
const { buildImageUrl, parseMarkdown } = require('../../utils/format');

Page({
  data: {
    loading: true,
    banners: [],
    currentBanner: 0,
    pageContents: {},
    whyParagraphs: [],
    teachers: [],
    galleryPhotos: [],
    siteTitle: '',
    siteNote: '',
  },

  onLoad() {
    this.baseUrl = app.globalData.baseUrl;
    this.loadAll();
  },

  onShow() {
    // 启动 Banner 自动播放
    this.startBannerAutoPlay();
  },

  onHide() {
    this.stopBannerAutoPlay();
  },

  onUnload() {
    this.stopBannerAutoPlay();
  },

  async loadAll() {
    try {
      const [bannerData, contents, teacherData] = await Promise.all([
        getBanners(),
        getPageContents('home'),
        getTeachers(),
      ]);

      const banners = (bannerData || [])
        .filter(b => b.active !== 0 && b.active !== false)
        .map(b => ({ ...b, imageUrl: buildImageUrl(b.image_url, this.baseUrl) }));

      const teachers = (teacherData || [])
        .filter(t => t.active !== 0 && t.active !== false)
        .map(t => ({ ...t, avatarUrl: buildImageUrl(t.avatar, this.baseUrl), nameInitial: (t.name || '?')[0] }));

      const whyContent = contents.why_content || '';
      const whyParagraphs = parseMarkdown(whyContent);

      const galleryPhotos = Array.from({ length: 12 }, (_, i) => ({
        id: i,
        url: `${this.baseUrl}/images/gallery/photo-${String(i + 1).padStart(2, '0')}.jpg`,
      }));

      this.setData({
        banners,
        pageContents: contents,
        whyParagraphs,
        teachers,
        galleryPhotos,
        siteTitle: contents.site_name || '中萱文化',
        siteNote: contents.site_note || '',
        loading: false,
      });
    } catch (err) {
      console.error('[index] 加载失败:', err);
      this.setData({ loading: false });
    }
  },

  // ── Banner 轮播 ──
  onBannerChange(e) {
    this.setData({ currentBanner: e.detail.current });
  },

  startBannerAutoPlay() {
    this.stopBannerAutoPlay();
    this._bannerTimer = setInterval(() => {
      const { banners, currentBanner } = this.data;
      if (banners.length <= 1) return;
      const next = (currentBanner + 1) % banners.length;
      this.setData({ currentBanner: next });
    }, 4000);
  },

  stopBannerAutoPlay() {
    if (this._bannerTimer) {
      clearInterval(this._bannerTimer);
      this._bannerTimer = null;
    }
  },

  // ── 分享 ──
  onShareAppMessage() {
    return {
      title: this.data.siteTitle || '中萱文化',
      path: '/pages/index/index',
    };
  },

  // ── 图片加载失败回退 ──
  onGalleryError(e) {
    const { index } = e.currentTarget.dataset;
    const key = `galleryPhotos[${index}].url`;
    this.setData({
      [key]: `${this.baseUrl}/images/gallery/photo-${String(index + 1).padStart(2, '0')}.svg`,
    });
  },

  onTeacherImgError(e) {
    const { index } = e.currentTarget.dataset;
    const key = `teachers[${index}].avatarUrl`;
    this.setData({ [key]: '' });
  },
});
