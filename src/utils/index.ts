import { useRouter } from 'vue-router'

// ── 返回 ──

/** 简单返回 — 不依赖 router，兼容直接 import */
export function goBack() {
  if (window.history.length > 1) {
    window.history.back()
  } else {
    window.location.href = '/'
  }
}

// ── 路由 ──

export function useGoBack() {
  const router = useRouter()
  return () => {
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push('/')
    }
  }
}

// ── 图片 URL ──

export function getImageUrl(url: string | null | undefined): string {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return url
}

/** 师资头像 fallback：本地 SVG 占位图 */
export function getAvatarUrl(url: string | null | undefined): string {
  const real = getImageUrl(url)
  if (real) return real
  // 返回一个 data URI 的简单占位头像，不依赖外部 API
  return 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150" viewBox="0 0 150 150">'
    + '<rect width="150" height="150" rx="75" fill="#e8eef3"/>'
    + '<circle cx="75" cy="58" r="28" fill="#c0cdd8"/>'
    + '<ellipse cx="75" cy="125" rx="42" ry="35" fill="#c0cdd8"/>'
    + '</svg>'
  )
}

// ── 日期格式化 ──

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

export function formatDateShort(d: string): string {
  if (!d) return ''
  const dt = new Date(d)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

// ── XSS 防护：HTML 净化 ──

const ALLOWED_TAGS = new Set(['p', 'br', 'strong', 'b', 'em', 'i', 'a', 'code', 'blockquote', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'img'])
const DANGEROUS_ATTRS = ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'onsubmit', 'onchange', 'oninput', 'srcdoc', 'formaction']

/**
 * 简易 HTML 净化器 — 移除 <script>、事件属性和 javascript: 协议
 * 用于管理员写入的 Markdown 渲染内容的 v-html
 */
export function sanitizeHtml(html: string): string {
  // 移除 <script> 标签及内容
  let result = html.replace(/<script[\s\S]*?<\/script>/gi, '')
  // 移除危险属性
  for (const attr of DANGEROUS_ATTRS) {
    result = result.replace(new RegExp(`\\s+${attr}\\s*=\\s*["'][^"']*["']`, 'gi'), '')
    result = result.replace(new RegExp(`\\s+${attr}\\s*=\\s*\\S+`, 'gi'), '')
  }
  // 移除 javascript: 协议
  result = result.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"')
  return result
}

// ── Markdown 渲染（安全） ──

export function renderInlineMarkdown(t: string): string {
  return t
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;border-radius:8px;margin:8px 0" />')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
      // 过滤 javascript: 协议
      const safeUrl = url.trim().toLowerCase().startsWith('javascript:') ? '#' : url
      return `<a href="${safeUrl}" target="_blank" rel="noopener">${text}</a>`
    })
    .replace(/`([^`]+)`/g, '<code style="background:#f0f0f0;padding:2px 6px;border-radius:3px;font-size:0.9em">$1</code>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
}

export interface MarkdownParagraph {
  isTitle: boolean
  text: string
}

export function renderMarkdown(text: string): MarkdownParagraph[] {
  if (!text) return []
  const result: MarkdownParagraph[] = []

  const processContentLines = (lines: string) =>
    lines
      .replace(/^> (.*)/gm, '<blockquote style="margin:0;padding:8px 16px;border-left:4px solid var(--primary-color);background:rgba(67,160,71,0.06);border-radius:0 8px 8px 0">$1</blockquote>')
      .replace(/^- (.*)/gm, '<span style="display:block;padding-left:4px">&bull; $1</span>')

  text.split('\n\n').forEach(para => {
    let trimmed = para.trim()
    if (!trimmed) return

    const isH2 = trimmed.startsWith('## ')
    const isH3 = trimmed.startsWith('### ')

    if (isH2 || isH3) {
      const prefixLen = isH2 ? 3 : 4
      const firstNewline = trimmed.indexOf('\n')
      if (firstNewline === -1) {
        // 纯标题，没有后续内容
        result.push({ isTitle: true, text: renderInlineMarkdown(trimmed.substring(prefixLen)) })
      } else {
        // 标题 + 后续内容（如 > 块引用或 - 列表）
        const titleText = trimmed.substring(prefixLen, firstNewline)
        result.push({ isTitle: true, text: renderInlineMarkdown(titleText) })
        let restText = trimmed.substring(firstNewline + 1)
        restText = processContentLines(restText)
        restText = renderInlineMarkdown(restText)
        restText = restText.replace(/\n/g, '<br>')
        result.push({ isTitle: false, text: restText })
      }
    } else {
      let processedText = processContentLines(trimmed)
      processedText = renderInlineMarkdown(processedText)
      processedText = processedText.replace(/\n/g, '<br>')
      result.push({ isTitle: false, text: processedText })
    }
  })

  return result.filter(p => p.text)
}

// ── API 辅助 ──

export async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options)
  if (!res.ok) {
    throw new Error(`API Error: ${res.status} ${res.statusText}`)
  }
  return res.json() as Promise<T>
}
