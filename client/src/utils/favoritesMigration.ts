/**
 * Миграция старых данных избранного в новую структуру
 * Запускается один раз при первой загрузке приложения
 */

import type { FavoritesState } from '@/types/favorites'

const MIGRATION_FLAG_KEY = 'meshhub_favorites_migrated'
const OLD_STORAGE_KEYS = [
  'meshhub_world_favorites',
  'vehicle_actions_favorites',
  'weapon_actions_favorites',
  'interior_favorites',
  'interior_favorite_locations',
]

/**
 * Проверить, была ли уже выполнена миграция
 */
export function isMigrationCompleted(): boolean {
  try {
    return localStorage.getItem(MIGRATION_FLAG_KEY) === 'true'
  } catch {
    return false
  }
}

/**
 * Пометить миграцию как выполненную
 */
export function markMigrationCompleted(): void {
  try {
    localStorage.setItem(MIGRATION_FLAG_KEY, 'true')
    console.log('[Migration] Migration marked as completed')
  } catch (error) {
    console.error('[Migration] Error marking migration as completed:', error)
  }
}

/**
 * Выполнить миграцию старых данных
 */
export async function migrateLegacyFavorites(): Promise<FavoritesState | null> {
  console.log('[Migration] Starting legacy favorites migration...')
  
  const migrated: FavoritesState = {
    weather: [],
    time: [],
    timeSpeed: [],
    vehicles: [],
    vehicleActions: [],
    weaponActions: [],
    locations: [],
    teleportMarkers: [],
  }
  
  let hasMigratedData = false
  
  try {
    // 1. Миграция world favorites (погода, время, скорость, teleportMarkers)
    const worldFavs = localStorage.getItem('meshhub_world_favorites')
    if (worldFavs) {
      const parsed = JSON.parse(worldFavs)
      migrated.weather = Array.isArray(parsed.weather) ? parsed.weather : []
      migrated.time = Array.isArray(parsed.time) ? parsed.time : []
      migrated.timeSpeed = Array.isArray(parsed.timeSpeed) ? parsed.timeSpeed : []
      migrated.teleportMarkers = Array.isArray(parsed.teleportMarkers) ? parsed.teleportMarkers : []
      hasMigratedData = true
      console.log('[Migration] ✓ World favorites migrated:', {
        weather: migrated.weather.length,
        time: migrated.time.length,
        timeSpeed: migrated.timeSpeed.length,
        teleportMarkers: migrated.teleportMarkers.length
      })
    }
    
    // 2. Миграция vehicle actions
    const vehicleActions = localStorage.getItem('vehicle_actions_favorites')
    if (vehicleActions) {
      migrated.vehicleActions = JSON.parse(vehicleActions)
      hasMigratedData = true
      console.log('[Migration] ✓ Vehicle actions migrated:', migrated.vehicleActions.length)
    }
    
    // 3. Миграция weapon actions
    const weaponActions = localStorage.getItem('weapon_actions_favorites')
    if (weaponActions) {
      migrated.weaponActions = JSON.parse(weaponActions)
      hasMigratedData = true
      console.log('[Migration] ✓ Weapon actions migrated:', migrated.weaponActions.length)
    }
    
    // 4. Миграция interior locations
    const interiorLocs = localStorage.getItem('interior_favorite_locations')
    if (interiorLocs) {
      const parsed = JSON.parse(interiorLocs)
      migrated.locations = Array.isArray(parsed) ? parsed : []
      hasMigratedData = true
      console.log('[Migration] ✓ Interior locations migrated:', migrated.locations.length)
    }
    
    // 5. Миграция favorite vehicles (попробуем из локального хранилища если есть)
    // Обычно vehicles хранятся в Alt:V, но может быть fallback
    
    if (hasMigratedData) {
      console.log('[Migration] Migration completed successfully. Total items:', {
        weather: migrated.weather.length,
        time: migrated.time.length,
        timeSpeed: migrated.timeSpeed.length,
        vehicles: migrated.vehicles.length,
        vehicleActions: migrated.vehicleActions.length,
        weaponActions: migrated.weaponActions.length,
        locations: migrated.locations.length,
        teleportMarkers: migrated.teleportMarkers.length
      })
      
      return migrated
    } else {
      console.log('[Migration] No legacy data found to migrate')
      return null
    }
    
  } catch (error) {
    console.error('[Migration] Error during migration:', error)
    return null
  }
}

/**
 * Очистить старые ключи localStorage после успешной миграции
 */
export function cleanupLegacyStorage(): void {
  console.log('[Migration] Cleaning up legacy storage keys...')
  
  let cleaned = 0
  
  for (const key of OLD_STORAGE_KEYS) {
    try {
      if (localStorage.getItem(key) !== null) {
        localStorage.removeItem(key)
        cleaned++
        console.log(`[Migration] ✓ Removed legacy key: ${key}`)
      }
    } catch (error) {
      console.warn(`[Migration] Failed to remove legacy key ${key}:`, error)
    }
  }
  
  console.log(`[Migration] Cleanup completed. Removed ${cleaned} legacy keys.`)
}

/**
 * Получить статистику старых данных
 */
export function getLegacyDataStats(): Record<string, number> {
  const stats: Record<string, number> = {}
  
  for (const key of OLD_STORAGE_KEYS) {
    try {
      const data = localStorage.getItem(key)
      if (data) {
        const parsed = JSON.parse(data)
        
        if (Array.isArray(parsed)) {
          stats[key] = parsed.length
        } else if (typeof parsed === 'object' && parsed !== null) {
          stats[key] = Object.keys(parsed).reduce((sum, k) => {
            const val = parsed[k]
            return sum + (Array.isArray(val) ? val.length : 1)
          }, 0)
        } else {
          stats[key] = 1
        }
      }
    } catch {
      stats[key] = 0
    }
  }
  
  return stats
}

