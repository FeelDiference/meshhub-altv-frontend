// Weapon resource types

import type { GTAVWeapon } from '@/data/gtav-weapons'

export interface WeaponResource {
  id: string
  name: string
  hashHex?: string
  hash?: number
  displayName: string
  category?: string
  type: string
  tags?: string[]
  modelName?: string
  size?: number
  metadata?: {
    [key: string]: unknown
  }
  // For hierarchical display
  isArchive?: boolean
  children?: WeaponResource[]
  parentId?: string
}

export interface WeaponArchive {
  id: string
  name: string
  hash?: number
  hashHex?: string
  displayName?: string
  category?: string
  type: string
  tags?: string[]
  modelName?: string
  size?: number
  metadata?: {
    [key: string]: unknown
  }
}

export type WeaponStatus = 'not_installed' | 'installing' | 'installed' | 'error'

// Общий тип для всего оружия (HUB + GTAV)
export type AnyWeapon = WeaponResource | (GTAVWeapon & { 
  isGTAV: true
  id: string
  modelName: string
})

