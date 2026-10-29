import { join } from 'node:path'
import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { config as loadEnvironment } from 'dotenv'
import { HEALTH_CHECK_CHANNEL, type HealthResult } from '../shared/health'
import { parseConnectionConfig } from './config'
import { createHealthGateway, type HealthGateway } from './grpc/health-client'
import { isTrustedRendererUrl, validateDevelopmentUrl, type RendererLocation } from './security'

let mainWindow: BrowserWindow | null = null
let gateway: HealthGateway | undefined

function createWindow(location: RendererLocation): BrowserWindow {
  const window = new BrowserWindow({
    width: 1040,
    height: 760,
    minWidth: 720,
    minHeight: 560,
    show: false,
    backgroundColor: '#f3f5f4',
    title: 'Work People',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      webviewTag: false
    }
  })

  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  window.webContents.on('will-navigate', (event) => {
    if (!isTrustedRendererUrl(event.url, location)) event.preventDefault()
  })
  window.webContents.on('will-redirect', (event) => {
    if (!isTrustedRendererUrl(event.url, location)) event.preventDefault()
  })
  window.webContents.on('will-frame-navigate', (event) => {
    if (!event.isMainFrame || !isTrustedRendererUrl(event.url, location)) event.preventDefault()
  })
  window.webContents.on('will-attach-webview', (event) => event.preventDefault())
  window.webContents.session.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false))
  window.webContents.session.setPermissionCheckHandler(() => false)
  window.once('ready-to-show', () => window.show())
  window.on('closed', () => { mainWindow = null })

  if (location.developmentUrl) {
    void window.loadURL(location.developmentUrl)
  } else {
    void window.loadFile(location.filePath)
  }
  return window
}

async function start(): Promise<void> {
  if (!app.isPackaged) loadEnvironment({ path: join(app.getAppPath(), '.env'), quiet: true })
  const config = parseConnectionConfig(process.env)
  const protoPath = app.isPackaged
    ? join(process.resourcesPath, 'proto/workpeople/v1/health.proto')
    : join(app.getAppPath(), 'proto/workpeople/v1/health.proto')
  gateway = createHealthGateway(config, protoPath)
  const location: RendererLocation = {
    filePath: join(__dirname, '../renderer/index.html'),
    developmentUrl: !app.isPackaged && process.env.ELECTRON_RENDERER_URL
      ? validateDevelopmentUrl(process.env.ELECTRON_RENDERER_URL)
      : undefined
  }

  ipcMain.handle(HEALTH_CHECK_CHANNEL, async (event): Promise<HealthResult> => {
    if (!mainWindow || event.sender !== mainWindow.webContents
        || event.senderFrame !== mainWindow.webContents.mainFrame
        || !isTrustedRendererUrl(event.senderFrame.url, location)) {
      return { ok: false, error: { code: 'forbidden', message: 'Запрос из этого окна запрещён.' } }
    }
    try {
      return await gateway!.getHealth()
    } catch {
      return { ok: false, error: { code: 'internal', message: 'Не удалось выполнить проверку соединения.' } }
    }
  })

  mainWindow = createWindow(location)
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) mainWindow = createWindow(location)
  })
}

void app.whenReady().then(start).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown startup error.'
  console.error('Work People startup failed:', message)
  dialog.showErrorBox('Work People — ошибка запуска', message)
  app.quit()
})

app.on('before-quit', () => gateway?.close())
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
