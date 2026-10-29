import { contextBridge, ipcRenderer } from 'electron'
import { HEALTH_CHECK_CHANNEL, type HealthResult, type WorkPeopleApi } from '../shared/health'

const api: WorkPeopleApi = Object.freeze({
  getHealth: (): Promise<HealthResult> => ipcRenderer.invoke(HEALTH_CHECK_CHANNEL)
})

contextBridge.exposeInMainWorld('workPeople', api)
