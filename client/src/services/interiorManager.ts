// Менеджер для управления состоянием интерьеров (установка, проверка и т.д.)

import type { InteriorResource, Interior, InteriorStatus } from '../types/interior'

export type { InteriorStatus }

export interface InteriorState {
  status: InteriorStatus
  lastChecked?: number
}

const interiorStates = new Map<string, InteriorState>()
const LOCAL_STORAGE_KEY = 'installedInteriors'

/**
 * Проверить, установлен ли интерьер
 */
export async function checkInteriorExists(interior: InteriorResource): Promise<boolean> {
  console.log(`🔍 Проверяем установку интерьера: ${interior.name}`)
  
  // Если ALT:V недоступен, проверяем localStorage
  if (!window.alt) {
    const installed = getInstalledInteriors()
    return installed.includes(interior.id)
  }
  
  // Запрашиваем у ALT:V клиента
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      window.alt?.off?.('meshhub:interior:check:response', handler)
      // Fallback к localStorage при таймауте
      const installed = getInstalledInteriors()
      resolve(installed.includes(interior.id))
    }, 5000)
    
    const handler = (response: { interiorName: string; exists: boolean; error?: string }) => {
      clearTimeout(timeout)
      window.alt?.off?.('meshhub:interior:check:response', handler)
      
      if (response.error) {
        console.error('❌ Ошибка проверки интерьера:', response.error)
        const installed = getInstalledInteriors()
        resolve(installed.includes(interior.id))
      } else {
        resolve(response.exists)
      }
    }
    
    window.alt?.on?.('meshhub:interior:check:response', handler)
    window.alt?.emit?.('meshhub:interior:check', {
      interiorId: interior.id,
      interiorName: interior.name
    })
  })
}

/**
 * Скачать и установить интерьер через ALT:V
 */
export async function downloadInteriorToLocal(
  interior: InteriorResource,
  token: string
): Promise<{ success: boolean; message: string }> {
  console.log(`⬇️ Устанавливаем интерьер: ${interior.name}`)
  
  if (!window.alt) {
    console.error('❌ ALT:V недоступен')
    return { success: false, message: 'ALT:V недоступен' }
  }
  
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      window.alt?.off?.('meshhub:interior:download:response', handler)
      resolve({ success: false, message: 'Timeout: интерьер не установлен в течение 30 секунд' })
    }, 30000) // 30 секунд на установку
    
    const handler = (response: { success: boolean; message: string; interiorId?: string; alreadyExists?: boolean }) => {
      clearTimeout(timeout)
      window.alt?.off?.('meshhub:interior:download:response', handler)
      
      if (response.success) {
        // Сохраняем в localStorage
        const installed = getInstalledInteriors()
        if (!installed.includes(interior.id)) {
          installed.push(interior.id)
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(installed))
        }
        
        // Обновляем статус
        interiorStates.set(interior.id, {
          status: 'installed',
          lastChecked: Date.now()
        })
      }
      
      resolve(response)
    }
    
    window.alt?.on?.('meshhub:interior:download:response', handler)
    window.alt?.emit?.('meshhub:interior:download', {
      interiorId: interior.id,
      interiorName: interior.name,
      token: token
    })
  })
}

/**
 * Получить текущий статус интерьера
 */
export function getInteriorStatus(interior: InteriorResource): InteriorStatus {
  const state = interiorStates.get(interior.id)
  if (state) {
    return state.status
  }
  
  // Проверяем localStorage
  const installed = getInstalledInteriors()
  return installed.includes(interior.id) ? 'installed' : 'not_installed'
}

/**
 * Очистить кэш статуса интерьера
 */
export function clearInteriorCache(interiorId: string): void {
  interiorStates.delete(interiorId)
}

/**
 * Очистить все кэши интерьеров
 */
export function clearAllInteriorCaches(): void {
  interiorStates.clear()
}

/**
 * Получить список установленных интерьеров из localStorage
 */
function getInstalledInteriors(): string[] {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

/**
 * Получить список установленных интерьеров из ALT:V клиента
 */
export async function getInstalledInteriorsFromClient(): Promise<string[]> {
  if (!window.alt) {
    return getInstalledInteriors()
  }
  
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      window.alt?.off?.('meshhub:interior:list:response', handler)
      resolve(getInstalledInteriors())
    }, 5000)
    
    const handler = (response: { interiors: string[]; error?: string }) => {
      clearTimeout(timeout)
      window.alt?.off?.('meshhub:interior:list:response', handler)
      
      if (response.error) {
        console.error('❌ Ошибка получения списка интерьеров:', response.error)
        resolve(getInstalledInteriors())
      } else {
        resolve(response.interiors || [])
      }
    }
    
    window.alt?.on?.('meshhub:interior:list:response', handler)
    window.alt?.emit?.('meshhub:interior:list:request', {})
  })
}

/**
 * Телепортироваться к интерьеру
 */
export async function teleportToInterior(interior: Interior): Promise<void> {
  if (!window.alt) {
    console.error('❌ ALT:V недоступен')
    return
  }
  
  console.log(`🚀 Телепортация к интерьеру: ${interior.archetypeName}`)
  
  window.alt.emit('meshhub:interior:teleport', {
    interiorId: interior.id,
    archetypeName: interior.archetypeName,
    position: {
      x: interior.position.x,
      y: interior.position.y,
      z: interior.position.z
    }
  })
}

