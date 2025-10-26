/**
 * Конфигурация для системы избранного
 * Централизованные настройки для всех типов избранного
 */

import {
  Cloud, Clock, Car, Wrench, Zap, MapPin, Navigation,
  Sparkles, Lightbulb, ArrowLeft, ArrowRight, Shield,
  Radio, Wind, DoorOpen, Lock, Unlock, Gauge, Box, MapPinned,
  Package, Target
} from 'lucide-react'
import type { 
  FavoriteConfig, 
  FavoriteType, 
  FavoriteLocation,
  FavoriteTeleportMarker,
  ActionConfig 
} from '@/types/favorites'

// ============================================================================
// Конфигурации типов избранного
// ============================================================================

/**
 * Конфигурация: Погода
 */
export const WEATHER_CONFIG: FavoriteConfig<string> = {
  type: 'weather',
  icon: Cloud,
  color: 'blue',
  actionLabel: 'Применить',
  sectionTitle: 'Погода',
  getDisplayName: (weather) => weather,
  getSubtitle: () => 'Погодные условия',
  getId: (weather) => weather,
  storageKey: 'meshhub_world_favorites',
  altvEventPrefix: 'world:favorites'
}

/**
 * Конфигурация: Время суток
 */
export const TIME_CONFIG: FavoriteConfig<string> = {
  type: 'time',
  icon: Clock,
  color: 'yellow',
  actionLabel: 'Применить',
  sectionTitle: 'Время',
  getDisplayName: (time) => time,
  getSubtitle: () => 'Время суток',
  getId: (time) => time,
  storageKey: 'meshhub_world_favorites',
  altvEventPrefix: 'world:favorites'
}

/**
 * Конфигурация: Скорость времени
 */
export const TIME_SPEED_CONFIG: FavoriteConfig<number> = {
  type: 'timeSpeed',
  icon: Clock,
  color: 'purple',
  actionLabel: 'Применить',
  sectionTitle: 'Скорость',
  getDisplayName: (speed) => `${speed}x`,
  getSubtitle: () => 'Скорость времени',
  getId: (speed) => speed.toString(),
  storageKey: 'meshhub_world_favorites',
  altvEventPrefix: 'world:favorites'
}

/**
 * Конфигурация: Автомобили
 */
export const VEHICLE_CONFIG: FavoriteConfig<string> = {
  type: 'vehicle',
  icon: Car,
  color: 'blue',
  actionLabel: 'Заспавнить',
  sectionTitle: 'Машины',
  getDisplayName: (vehicleName) => vehicleName,
  getSubtitle: () => 'Избранный автомобиль',
  getId: (vehicleName) => vehicleName,
  altvEventPrefix: 'favorites:vehicles'
}

/**
 * Конфигурация: Действия с автомобилем
 */
export const VEHICLE_ACTION_CONFIG: FavoriteConfig<string> = {
  type: 'vehicleAction',
  icon: Wrench,
  color: 'purple',
  actionLabel: 'Выполнить',
  sectionTitle: 'Действия с автомобилем',
  getDisplayName: (actionId) => {
    // Используем ACTION_CONFIGS для получения названия
    const action = VEHICLE_ACTION_CONFIGS.find(a => a.id === actionId)
    return action?.label || actionId
  },
  getSubtitle: () => 'Быстрое действие',
  getId: (actionId) => actionId,
  storageKey: 'vehicle_actions_favorites',
  altvEventPrefix: 'favorites:vehicle-actions'
}

/**
 * Конфигурация: Действия с оружием
 */
export const WEAPON_ACTION_CONFIG: FavoriteConfig<string> = {
  type: 'weaponAction',
  icon: Zap,
  color: 'orange',
  actionLabel: 'Выполнить',
  sectionTitle: 'Действия с оружием',
  getDisplayName: (actionId) => {
    const action = WEAPON_ACTION_CONFIGS.find(a => a.id === actionId)
    return action?.label || actionId
  },
  getSubtitle: () => 'Быстрое действие',
  getId: (actionId) => actionId,
  storageKey: 'weapon_actions_favorites',
  altvEventPrefix: 'favorites:weapon-actions'
}

/**
 * Конфигурация: Локации интерьеров
 */
export const LOCATION_CONFIG: FavoriteConfig<FavoriteLocation> = {
  type: 'location',
  icon: MapPin,
  color: 'green',
  actionLabel: 'Телепорт',
  sectionTitle: 'Локации',
  getDisplayName: (location) => location.name,
  getSubtitle: (location) => `X: ${location.coords.x.toFixed(1)}, Y: ${location.coords.y.toFixed(1)}, Z: ${location.coords.z.toFixed(1)}`,
  getId: (location) => location.id,
  storageKey: 'interior_favorite_locations',
  altvEventPrefix: 'interior:favorites'
}

/**
 * Конфигурация: Маркеры телепортации
 */
export const TELEPORT_MARKER_CONFIG: FavoriteConfig<FavoriteTeleportMarker> = {
  type: 'teleportMarker',
  icon: Navigation,
  color: 'green',
  actionLabel: 'Телепорт',
  sectionTitle: 'Телепорты',
  getDisplayName: (marker) => marker.name,
  getSubtitle: (marker) => `${marker.position.x.toFixed(1)}, ${marker.position.y.toFixed(1)}, ${marker.position.z.toFixed(1)}`,
  getId: (marker) => marker.id,
  storageKey: 'meshhub_world_favorites', // teleportMarkers - массив ID
  altvEventPrefix: 'world:favorites'
}

// ============================================================================
// Сводная конфигурация всех типов
// ============================================================================

/**
 * Маппинг всех конфигураций по типу
 */
export const FAVORITE_CONFIGS: Record<FavoriteType, FavoriteConfig> = {
  weather: WEATHER_CONFIG,
  time: TIME_CONFIG,
  timeSpeed: TIME_SPEED_CONFIG,
  vehicle: VEHICLE_CONFIG,
  vehicleAction: VEHICLE_ACTION_CONFIG,
  weaponAction: WEAPON_ACTION_CONFIG,
  location: LOCATION_CONFIG,
  teleportMarker: TELEPORT_MARKER_CONFIG,
}

// ============================================================================
// Конфигурации действий (для кнопок)
// ============================================================================

/**
 * Конфигурации действий с автомобилем
 */
export const VEHICLE_ACTION_CONFIGS: ActionConfig[] = [
  // Ремонт и обслуживание
  { id: 'repair', label: 'Починить', icon: Wrench, color: 'text-green-400' },
  { id: 'clean', label: 'Отчистить', icon: Sparkles, color: 'text-cyan-400' },
  
  // Освещение
  { id: 'lights_toggle', label: 'Фары ВКЛ/ВЫКЛ', icon: Lightbulb, color: 'text-yellow-400', isToggle: true },
  
  // Поворотники
  { id: 'indicators_left', label: 'Левый', icon: ArrowLeft, color: 'text-orange-400' },
  { id: 'indicators_right', label: 'Правый', icon: ArrowRight, color: 'text-orange-400' },
  { id: 'indicators_hazard', label: 'Аварийка', icon: Shield, color: 'text-red-400' },
  { id: 'indicators_off', label: 'Выключить', icon: Shield, color: 'text-gray-400' },
  
  // Двигатель
  { id: 'engine_toggle', label: 'Завести/Заглушить', icon: Zap, color: 'text-green-400', isToggle: true },
  
  // Звук
  { id: 'horn', label: 'Сигнал', icon: Radio, color: 'text-purple-400' },
  { id: 'siren_toggle', label: 'Сирена ВКЛ/ВЫКЛ', icon: Wind, color: 'text-blue-400', isToggle: true },
  
  // Двери
  { id: 'doors_all_open', label: 'Все двери', icon: Unlock, color: 'text-green-400' },
  { id: 'doors_all_close', label: 'Закрыть все', icon: Lock, color: 'text-red-400' },
  { id: 'door_front_left', label: 'Передняя левая', icon: DoorOpen, color: 'text-blue-400' },
  { id: 'door_front_right', label: 'Передняя правая', icon: DoorOpen, color: 'text-blue-400' },
  { id: 'door_rear_left', label: 'Задняя левая', icon: DoorOpen, color: 'text-blue-400' },
  { id: 'door_rear_right', label: 'Задняя правая', icon: DoorOpen, color: 'text-blue-400' },
  { id: 'door_hood', label: 'Капот', icon: Car, color: 'text-yellow-400' },
  { id: 'door_trunk', label: 'Багажник', icon: Car, color: 'text-orange-400' },
  
  // Интерфейс
  { id: 'speedometer_toggle', label: 'Спидометр', icon: Gauge, color: 'text-cyan-400', isToggle: true },
  
  // Тестирование
  { id: 'teleport_to_location', label: 'Телепорт на трассу', icon: MapPinned, color: 'text-green-400' },
  { id: 'yft_viewer', label: 'YFT Viewer (3D)', icon: Box, color: 'text-cyan-400' },
]

/**
 * Конфигурации действий с оружием
 */
export const WEAPON_ACTION_CONFIGS: ActionConfig[] = [
  // Боеприпасы
  { id: 'give_ammo', label: 'Выдать патронов', icon: Zap, color: 'text-green-400' },
  { id: 'no_reload', label: 'Без перезарядки', icon: Target, color: 'text-yellow-400', isToggle: true },
  
  // Оружие
  { id: 'spawn_all_weapons', label: 'Заспавнить все оружие', icon: Package, color: 'text-purple-400' },
  
  // Отслеживание
  { id: 'hit_tracking', label: 'Отслеживание попаданий', icon: Target, color: 'text-red-400', isToggle: true },
  { id: 'clear_hits_and_peds', label: 'Очистить метки и педов', icon: Wrench, color: 'text-orange-400' },
]

/**
 * Группировка действий по категориям
 */
export const VEHICLE_ACTION_GROUPS = [
  {
    title: 'Ремонт и обслуживание',
    icon: Wrench,
    actions: ['repair', 'clean']
  },
  {
    title: 'Освещение',
    icon: Lightbulb,
    actions: ['lights_toggle']
  },
  {
    title: 'Поворотники',
    icon: ArrowLeft,
    actions: ['indicators_left', 'indicators_right', 'indicators_hazard', 'indicators_off']
  },
  {
    title: 'Двигатель',
    icon: Car,
    actions: ['engine_toggle']
  },
  {
    title: 'Звук',
    icon: Radio,
    actions: ['horn', 'siren_toggle']
  },
  {
    title: 'Двери и капот',
    icon: DoorOpen,
    actions: ['doors_all_open', 'doors_all_close', 'door_front_left', 'door_front_right', 'door_rear_left', 'door_rear_right', 'door_hood', 'door_trunk']
  },
  {
    title: 'Интерфейс',
    icon: Gauge,
    actions: ['speedometer_toggle']
  },
  {
    title: 'Тестирование',
    icon: MapPin,
    actions: ['teleport_to_location', 'yft_viewer']
  }
]

export const WEAPON_ACTION_GROUPS = [
  {
    title: 'Боеприпасы',
    icon: Zap,
    actions: ['give_ammo', 'no_reload']
  },
  {
    title: 'Оружие',
    icon: Package,
    actions: ['spawn_all_weapons']
  },
  {
    title: 'Отслеживание',
    icon: Target,
    actions: ['hit_tracking', 'clear_hits_and_peds']
  }
]

// ============================================================================
// Хелпер функции
// ============================================================================

/**
 * Получить конфигурацию по типу
 */
export function getFavoriteConfig(type: FavoriteType): FavoriteConfig {
  return FAVORITE_CONFIGS[type]
}

/**
 * Получить конфигурацию действия по ID
 */
export function getActionConfig(actionId: string, isVehicle: boolean = true): ActionConfig | undefined {
  const configs = isVehicle ? VEHICLE_ACTION_CONFIGS : WEAPON_ACTION_CONFIGS
  return configs.find(a => a.id === actionId)
}

/**
 * Получить цвет для типа избранного (Tailwind класс)
 */
export function getFavoriteColor(type: FavoriteType): string {
  return FAVORITE_CONFIGS[type].color
}

/**
 * Получить иконку для типа избранного
 */
export function getFavoriteIcon(type: FavoriteType) {
  return FAVORITE_CONFIGS[type].icon
}

