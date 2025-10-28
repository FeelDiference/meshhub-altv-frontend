/**
 * Типы для работы с экстерьерами (YMAP файлы)
 * Используют существующий backend API для YMAP
 */

// Базовые типы
export interface Vec3 {
  x: number
  y: number
  z: number
}

// Entity из YMAP файла
export interface ExteriorEntity {
  archetype_name: string
  x: number
  y: number
  z: number
  lod_dist: number
  lod_level: string
}

// Информация о YMAP файле
export interface YmapFileInfo {
  file_id: string
  file_name: string
  file_path: string
  entities: ExteriorEntity[]
  entity_count: number
  convex_hull?: Array<{ x: number; y: number }>
}

// Ресурс с YMAP файлами
export interface ExteriorResource {
  id: string
  name: string
  original_name?: string
  path: string
  parent_path: string
  resource_type: string
  size: number
  version?: number
  entry_count?: number
  files_count: number
  directories_count?: number
  ymap_files?: YmapFileInfo[]
  
  // Статистика по типам файлов (приходит сразу из API)
  ymap_files_count?: number
  ytyp_files_count?: number
  ybn_files_count?: number
  ydr_files_count?: number
  ytd_files_count?: number
  ydd_files_count?: number
}

// Ответ от API с entities из архива
export interface ArchiveYmapEntitiesResponse {
  archive_id: string
  archive_name: string
  archive_path: string
  parent_path: string
  resource_type: string
  ymap_files: YmapFileInfo[]
  total_files: number
  total_entities: number
}

// Статус установки экстерьера
export type ExteriorStatus = 'not_installed' | 'installing' | 'installed' | 'error'

// Режимы редактора (только YMAP для экстерьеров)
export type ExteriorEditorMode = 'ymap'

