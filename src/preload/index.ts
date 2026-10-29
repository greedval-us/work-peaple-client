import { contextBridge, ipcRenderer } from 'electron'
import { HEALTH_CHECK_CHANNEL, type HealthResult } from '../shared/health'
import { AUTH_CURRENT_USER_CHANNEL, AUTH_LOGIN_CHANNEL, AUTH_LOGOUT_CHANNEL, type LoginCredentials } from '../shared/auth'
import type { WorkPeopleApi } from '../shared/api'

const api: WorkPeopleApi = Object.freeze({
  getHealth: (): Promise<HealthResult> => ipcRenderer.invoke(HEALTH_CHECK_CHANNEL),
  login: (credentials: LoginCredentials) => ipcRenderer.invoke(AUTH_LOGIN_CHANNEL, credentials),
  getCurrentUser: () => ipcRenderer.invoke(AUTH_CURRENT_USER_CHANNEL),
  logout: () => ipcRenderer.invoke(AUTH_LOGOUT_CHANNEL)
})

contextBridge.exposeInMainWorld('workPeople', api)
