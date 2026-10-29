import type { WorkPeopleApi } from '../../shared/api'

declare global {
  interface Window {
    readonly workPeople: WorkPeopleApi
  }
}

export {}
