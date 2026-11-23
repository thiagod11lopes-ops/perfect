import { useSyncExternalStore } from 'react'
import {
  getAdminContent,
  subscribeAdminContent,
  type AdminContentState,
} from '../data/adminContent'

export function useAdminContent(): AdminContentState {
  return useSyncExternalStore(subscribeAdminContent, getAdminContent, getAdminContent)
}
