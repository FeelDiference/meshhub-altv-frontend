// Типы для работы с интерьерами (MLO - Multi-Level Objects)

export interface Vec3 {
  x: number
  y: number
  z: number
}

export interface Vec4 {
  x: number
  y: number
  z: number
  w: number
}

export interface Interior {
  id: string
  archiveId: string
  ymapFileId: string
  
  // Основная информация
  archetypeName: string
  position: Vec3
  rotation?: Vec4
  
  // Дополнительные данные
  lodDist?: number
  lodLevel?: string
  guid?: number
  flags?: number
  scaleXY?: number
  scaleZ?: number
  parentIndex?: number
  childLodDist?: number
  numChildren?: number
  priorityLevel?: number
  
  // Метаданные
  displayName?: string
  description?: string
  category?: string
  tags?: string[]
  
  // Временные метки
  createdAt: string
  updatedAt: string
}

export interface InteriorResource {
  id: string
  name: string
  displayName: string
  resourceType: string
  size: number
  interiorCount: number
  interiors: Interior[]
  createdAt: string
  updatedAt: string
}

export type InteriorStatus = 'not_installed' | 'installing' | 'installed' | 'error'

export interface InteriorListResponse {
  success: boolean
  total: number
  interiors: InteriorResource[]
}

export interface InteriorDetailsResponse {
  success: boolean
  archive: any
  interiors: Interior[]
  count: number
}

