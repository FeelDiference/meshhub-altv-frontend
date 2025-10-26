/**
 * Единая типизация для системы избранного
 * Все типы избранного в одном месте с типобезопасностью
 */

import type { ComponentType } from 'react'

// ============================================================================
// Базовые типы
// ============================================================================

/**
 * Все поддерживаемые типы избранного
 */
export type FavoriteType = 
  | 'weather'           // Погода
  | 'time'              // Время суток
  | 'timeSpeed'         // Скорость времени
  | 'vehicle'           // Автомобили
  | 'vehicleAction'     // Действия с автомобилем
  | 'weaponAction'      // Действия с оружием
  | 'location'          // Локации интерьеров
  | 'teleportMarker'    // Маркеры телепортации

/**
 * Координаты в 3D пространстве
 */
export interface Vec3 {
  x: number
  y: number
  z: number
}

// ============================================================================
// Структуры данных для разных типов избранного
// ============================================================================

/**
 * Локация интерьера
 */
export interface FavoriteLocation {
  id: string
  name: string
  coords: Vec3
}

/**
 * Маркер телепортации
 */
export interface FavoriteTeleportMarker {
  id: string
  name: string
  position: Vec3
  createdAt: string
}

// ============================================================================
// Состояние избранного
// ============================================================================

/**
 * Полное состояние всего избранного в приложении
 */
export interface FavoritesState {
  // Мир и погода
  weather: string[]
  time: string[]
  timeSpeed: number[]
  
  // Автомобили и оружие
  vehicles: string[]              // Имена моделей
  vehicleActions: string[]        // ID действий
  weaponActions: string[]         // ID действий
  
  // Локации
  locations: FavoriteLocation[]
  teleportMarkers: string[]       // ID маркеров (сами маркеры хранятся отдельно)
}

/**
 * Структура хранения в localStorage/Alt:V
 */
export interface FavoritesStorageData {
  version: number
  data: FavoritesState
  lastUpdated: number
}

// ============================================================================
// Конфигурация для UI
// ============================================================================

/**
 * Конфигурация для отображения типа избранного
 */
export interface FavoriteConfig<T = any> {
  type: FavoriteType
  icon: ComponentType<{ className?: string }>
  color: string                   // Базовый цвет (blue, green, yellow и т.д.)
  actionLabel: string             // "Применить", "Заспавнить", "Телепорт"
  sectionTitle: string            // "Погода", "Машины", "Действия"
  
  // Функции для отображения
  getDisplayName: (item: T) => string
  getSubtitle: (item: T) => string
  getId: (item: T) => string
  
  // Storage
  storageKey?: string             // Ключ для localStorage (если отдельный)
  altvEventPrefix?: string        // Префикс событий Alt:V
}

/**
 * Конфигурация для кнопки действия (VehicleActions, WeaponActions)
 */
export interface ActionConfig {
  id: string
  label: string
  icon: ComponentType<{ className?: string }>
  color: string                   // Tailwind class: text-green-400, etc.
  isToggle?: boolean              // Является ли toggle кнопкой
  requiresVehicle?: boolean       // Требует автомобиль
  requiresWeapon?: boolean        // Требует оружие
}

// ============================================================================
// Методы для работы с избранным
// ============================================================================

/**
 * Интерфейс сервиса избранного
 */
export interface IFavoritesService {
  // Чтение
  get<T>(type: FavoriteType): Promise<T[]>
  getAll(): Promise<FavoritesState>
  has(type: FavoriteType, id: string): boolean
  
  // Запись
  add<T>(type: FavoriteType, item: T): Promise<void>
  remove(type: FavoriteType, id: string): Promise<void>
  toggle<T>(type: FavoriteType, item: T): Promise<boolean> // Возвращает новое состояние
  
  // Синхронизация
  sync(): Promise<void>
  syncWithAltV(): Promise<void>
  
  // События
  subscribe(callback: (state: FavoritesState) => void): () => void
}

// ============================================================================
// Хелперы
// ============================================================================

/**
 * Цветовая палитра для типов избранного
 */
export const FAVORITE_COLORS = {
  weather: 'blue',
  time: 'yellow',
  timeSpeed: 'purple',
  vehicle: 'blue',
  vehicleAction: 'purple',
  weaponAction: 'orange',
  location: 'green',
  teleportMarker: 'green',
} as const

/**
 * Иконки для типов избранного (импортируются в конфигурации)
 */
export type FavoriteIconMap = Record<FavoriteType, ComponentType<{ className?: string }>>

