import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export interface RendererLocation {
  filePath: string
  developmentUrl?: string
}

export function validateDevelopmentUrl(value: string): string {
  const url = new URL(value)
  if (url.protocol !== 'http:' || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
      || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('ELECTRON_RENDERER_URL must be the local electron-vite HTTP origin.')
  }
  return url.href
}

export function isTrustedRendererUrl(value: string, location: RendererLocation): boolean {
  try {
    const url = new URL(value)
    if (url.username || url.password || url.search) return false
    if (location.developmentUrl) {
      const expected = new URL(location.developmentUrl)
      return url.origin === expected.origin && url.pathname === expected.pathname
    }
    if (url.protocol !== 'file:' || url.hostname) return false
    const actualPath = resolve(fileURLToPath(url))
    const expectedPath = resolve(location.filePath)
    return process.platform === 'win32'
      ? actualPath.toLowerCase() === expectedPath.toLowerCase()
      : actualPath === expectedPath
  } catch {
    return false
  }
}
