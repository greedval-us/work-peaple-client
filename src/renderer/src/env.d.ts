import type { WorkPeopleApi } from '../../shared/health'

declare global {
  interface Window {
    readonly workPeople: WorkPeopleApi
  }
}

export {}
