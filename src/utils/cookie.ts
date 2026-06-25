export function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

export function setCookie(name: string, value: string): void {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; SameSite=Lax`
}

export function removeCookie(name: string): void {
  document.cookie = `${name}=; path=/; SameSite=Lax; max-age=0`
}
