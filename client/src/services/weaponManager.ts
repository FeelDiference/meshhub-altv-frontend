// Weapon Manager - handles weapon download, installation check, and caching via server

import type { WeaponResource } from '../types/weapon'

export type WeaponStatus = 'not_downloaded' | 'downloaded' | 'checking'

export interface WeaponState {
  status: WeaponStatus
  lastChecked?: number
}

// Configuration
const WEAPON_CONFIG = {
  cacheTimeout: 5000 // Cache validity in ms
}

// In-memory cache for weapon states
const weaponStates = new Map<string, WeaponState>()

/**
 * Check if weapon exists locally in ALT:V via server
 */
export async function checkWeaponExists(weapon: WeaponResource): Promise<boolean> {
  const now = Date.now()
  const cached = weaponStates.get(weapon.id)
  
  // Return cached result if fresh
  if (cached && cached.lastChecked && now - cached.lastChecked < WEAPON_CONFIG.cacheTimeout) {
    return cached.status === 'downloaded'
  }
  
  // Update cache to "checking"
  weaponStates.set(weapon.id, {
    status: 'checking',
    lastChecked: now
  })
  
  try {
    // Use ALT:V API to check via server
    if (typeof window !== 'undefined' && 'alt' in window) {
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          weaponStates.set(weapon.id, {
            status: 'not_downloaded',
            lastChecked: now
          })
          resolve(false)
        }, 3000)
        
        // Emit to ALT:V client to check weapon via server
        ;(window as any).alt.emit('weapon:check', weapon.name)
        
        // Listen for response
        const handler = (response: { weaponName: string; exists: boolean; error?: string }) => {
          clearTimeout(timeout)
          ;(window as any).alt.off('weapon:check:response', handler)
          
          const exists = response.exists
          weaponStates.set(weapon.id, {
            status: exists ? 'downloaded' : 'not_downloaded',
            lastChecked: now
          })
          
          resolve(exists)
        }
        
        ;(window as any).alt.on('weapon:check:response', handler)
      })
    }
    
    // Fallback for browser environment
    weaponStates.set(weapon.id, {
      status: 'not_downloaded',
      lastChecked: now
    })
    return false
  } catch (error) {
    console.error(`[WeaponManager] Error checking weapon ${weapon.name}:`, error)
    weaponStates.set(weapon.id, {
      status: 'not_downloaded',
      lastChecked: now
    })
    return false
  }
}

/**
 * Download weapon to local ALT:V resources via server
 */
export async function downloadWeaponToLocal(weapon: WeaponResource, token: string): Promise<{ success: boolean; message: string }> {
  try {
    console.log(`[WeaponManager] Starting download for weapon: ${weapon.name}`)
    
    // Update state to downloading
    weaponStates.set(weapon.id, {
      status: 'checking',
      lastChecked: Date.now()
    })
    
    // Download via ALT:V server
    if (typeof window !== 'undefined' && 'alt' in window) {
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          weaponStates.set(weapon.id, {
            status: 'not_downloaded',
            lastChecked: Date.now()
          })
          resolve({
            success: false,
            message: 'Таймаут скачивания оружия'
          })
        }, 300000) // 5 минут таймаут
        
        // Emit to ALT:V client to download weapon via server
        ;(window as any).alt.emit('weapon:download', {
          weaponId: weapon.id,
          weaponName: weapon.name,
          token: token
        })
        
        // Listen for response
        const handler = (response: { success: boolean; message: string; alreadyExists?: boolean }) => {
          clearTimeout(timeout)
          ;(window as any).alt.off('weapon:download:response', handler)
          
          if (response.success) {
            weaponStates.set(weapon.id, {
              status: 'downloaded',
              lastChecked: Date.now()
            })
            
            console.log(`[WeaponManager] ✅ Weapon ${weapon.name} downloaded successfully`)
          } else {
            weaponStates.set(weapon.id, {
              status: 'not_downloaded',
              lastChecked: Date.now()
            })
            
            console.error(`[WeaponManager] ❌ Failed to download weapon ${weapon.name}: ${response.message}`)
          }
          
          resolve(response)
        }
        
        ;(window as any).alt.on('weapon:download:response', handler)
      })
    }
    
    // Fallback for browser environment
    weaponStates.set(weapon.id, {
      status: 'not_downloaded',
      lastChecked: Date.now()
    })
    
    return {
      success: false,
      message: 'ALT:V не доступен'
    }
  } catch (error: any) {
    console.error(`[WeaponManager] Error downloading weapon ${weapon.name}:`, error)
    
    weaponStates.set(weapon.id, {
      status: 'not_downloaded',
      lastChecked: Date.now()
    })
    
    return {
      success: false,
      message: `Ошибка скачивания: ${error.message}`
    }
  }
}

/**
 * Get weapon status from cache
 */
export function getWeaponStatus(weapon: WeaponResource): WeaponStatus {
  const cached = weaponStates.get(weapon.id)
  return cached?.status || 'not_downloaded'
}

/**
 * Clear weapon cache (force re-check)
 */
export function clearWeaponCache(weaponId: string): void {
  weaponStates.delete(weaponId)
}

/**
 * Clear all weapon caches
 */
export function clearAllWeaponCaches(): void {
  weaponStates.clear()
}

/**
 * Get list of installed weapons from server
 */
export async function getInstalledWeapons(): Promise<string[]> {
  try {
    if (typeof window !== 'undefined' && 'alt' in window) {
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve([])
        }, 3000)
        
        // Emit to ALT:V client to get installed weapons via server
        ;(window as any).alt.emit('weapon:installed:list')
        
        // Listen for response
        const handler = (response: { weapons: string[]; error?: string }) => {
          clearTimeout(timeout)
          ;(window as any).alt.off('weapon:installed:list:response', handler)
          
          resolve(response.weapons || [])
        }
        
        ;(window as any).alt.on('weapon:installed:list:response', handler)
      })
    }
    
    return []
  } catch (error) {
    console.error(`[WeaponManager] Error getting installed weapons:`, error)
    return []
  }
}