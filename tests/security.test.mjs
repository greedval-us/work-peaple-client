import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { test } from 'node:test'
import { isTrustedRendererUrl, validateDevelopmentUrl } from '../src/main/security.ts'

test('development origin must be the local Vite entry', () => {
  assert.equal(validateDevelopmentUrl('http://127.0.0.1:5173'), 'http://127.0.0.1:5173/')
  for (const url of ['https://localhost:5173', 'http://localhost.evil.test:5173', 'http://user@localhost:5173', 'http://localhost:5173/elsewhere', 'http://localhost:5173/?url=evil']) {
    assert.throws(() => validateDevelopmentUrl(url), /ELECTRON_RENDERER_URL/)
  }
})

test('trusts only the exact development origin and entry path', () => {
  const location = { filePath: resolve('out/renderer/index.html'), developmentUrl: 'http://127.0.0.1:5173/' }
  assert.equal(isTrustedRendererUrl('http://127.0.0.1:5173/', location), true)
  for (const url of ['http://127.0.0.1:5174/', 'http://127.0.0.1:5173/other', 'http://127.0.0.1.evil.test:5173/', 'file:///index.html', 'javascript:alert(1)']) {
    assert.equal(isTrustedRendererUrl(url, location), false)
  }
})

test('packaged mode trusts the exact local renderer file', () => {
  const filePath = resolve('out/renderer/index.html')
  const location = { filePath }
  assert.equal(isTrustedRendererUrl(pathToFileURL(filePath).href, location), true)
  for (const url of [pathToFileURL(resolve('other/index.html')).href, `${pathToFileURL(filePath).href}?x=1`, 'https://example.org/', 'file://evil.test/index.html']) {
    assert.equal(isTrustedRendererUrl(url, location), false)
  }
})
