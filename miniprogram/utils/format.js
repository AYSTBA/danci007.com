/**
 * utils/format.js — 格式化工具
 */

/**
 * 格式化日期
 * @param {string|number} date
 * @returns {string} 2024-06-02
 */
const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/**
 * 格式化价格
 * @param {number} price
 * @returns {string} ¥1,299
 */
const formatPrice = (price) => {
  if (price == null) return '';
  return '¥' + Number(price).toLocaleString('zh-CN');
};

/**
 * 截断文本
 * @param {string} text
 * @param {number} maxLen
 */
const truncate = (text, maxLen = 50) => {
  if (!text) return '';
  return text.length > maxLen ? text.slice(0, maxLen) + '…' : text;
};

/**
 * 解析后端返回的 Markdown 文本（分段，识别标题行）
 * 与 Web 端 renderMarkdown 逻辑对齐
 */
const parseMarkdown = (text) => {
  if (!text) return [];
  return text.split('\n').filter(l => l.trim()).map(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('### ')) return { isTitle: true, level: 3, text: trimmed.slice(4) };
    if (trimmed.startsWith('## ')) return { isTitle: true, level: 2, text: trimmed.slice(3) };
    if (trimmed.startsWith('# ')) return { isTitle: true, level: 1, text: trimmed.slice(2) };
    // 处理 **bold** → 简单去掉标记
    const plain = trimmed.replace(/\*\*(.+?)\*\*/g, '$1');
    return { isTitle: false, text: plain };
  });
};

/**
 * 构建完整图片 URL
 * @param {string} url - 可能是相对路径 /uploads/xxx 或完整 https://
 * @param {string} baseUrl
 */
const buildImageUrl = (url, baseUrl) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return (baseUrl || '') + url;
};

/**
 * 格式化时间（简短版本，用于评论/评价时间）
 * @param {string|number} date
 * @returns {string} 6月2日 或 2025-06-02
 */
const formatTime = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  if (y === now.getFullYear()) return `${m}月${day}日`;
  return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

module.exports = { formatDate, formatTime, formatPrice, truncate, parseMarkdown, buildImageUrl };
