const app = getApp();
const { getBanners, getPageContents } = require('../../utils/request');
const { buildImageUrl } = require('../../utils/format');

Page({
  data: {
    loading: true,
    banners: [],
    currentBanner: 0,
    pageContents: {},
    siteName: '',
    siteNote: '',
    stats: [
      { value: '1852+', label: '教材' },
      { value: '67万+', label: '单词' },
      { value: '882万+', label: '学生' },
      { value: '10万+', label: '老师' },
      { value: '8600+', label: '合作机构' },
    ],
    features: [
      { id: 1, title: 'AI个性化学习', desc: '基于艾宾浩斯遗忘曲线与抓错定位算法，精准界定熟词/夹生词/陌生词，AI自动生成复习方案，让每一次学习都高效' },
      { id: 2, title: '四维记忆体系', desc: '全方位语音识别+多维度语音测评+高精准纠错系统+遗传算法，四维一体形成完整记忆画面' },
      { id: 3, title: '阿尔法波音乐', desc: '科学激活右脑记忆区，提升专注力与记忆效率，缓解学习压力，让学习更轻松' },
      { id: 4, title: 'OMO全程督学', desc: '线上AI智能训练+线下专业老师指导，即时掌握学习进度，标准化流程确保每个孩子不掉队' },
    ],
  },

  onLoad() {
    this.baseUrl = app.globalData.baseUrl;
    this.loadAll();
  },

  onShow() {
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
      const [bannerData, contents] = await Promise.all([
        getBanners(),
        getPageContents('home'),
      ]);

      const banners = (bannerData || [])
        .filter(b => b.active !== 0 && b.active !== false)
        .map(b => ({ ...b, imageUrl: buildImageUrl(b.image_url, this.baseUrl) }));

      this.setData({
        banners,
        pageContents: contents,
        siteName: contents.site_name || '中萱文化',
        siteNote: contents.site_note || '',
        loading: false,
      });
    } catch (err) {
      console.error('[about] 加载失败:', err);
      this.setData({ loading: false });
    }
  },

  // ── Banner ──
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

  onShareAppMessage() {
    return {
      title: '关于我们 - ' + (this.data.siteName || '中萱文化'),
      path: '/pages/about/about',
    };
  },
});
