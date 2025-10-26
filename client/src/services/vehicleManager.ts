// Менеджер для работы с автомобилями - скачивание, проверка наличия, управление

import { downloadVehicle } from './vehicles'
import { VEHICLE_CONFIG } from '@/config/vehicles'
import type { VehicleResource } from '@/types/vehicle'

export type VehicleStatus = 'not_downloaded' | 'downloaded' | 'checking'

export interface VehicleState {
  status: VehicleStatus
  localPath?: string
  lastChecked?: number
}

// Кеш состояний автомобилей
const vehicleStates = new Map<string, VehicleState>()

/**
 * Проверяет наличие автомобиля локально
 */
export async function checkVehicleExists(vehicle: VehicleResource): Promise<boolean> {
  const now = Date.now()
  const cached = vehicleStates.get(vehicle.id)
  
  // Проверяем кеш
  if (cached && cached.lastChecked && (now - cached.lastChecked) < VEHICLE_CONFIG.cacheTimeout) {
    return cached.status === 'downloaded'
  }
  
  // Обновляем статус на "проверяется"
  vehicleStates.set(vehicle.id, { 
    status: 'checking',
    lastChecked: now 
  })
  
  try {
    // Проверяем наличие файла в указанной папке
    const fileName = `${vehicle.name}${VEHICLE_CONFIG.extensions[0]}`
    const localPath = `${VEHICLE_CONFIG.downloadPath}${fileName}`
    
    // Проверяем файл через File System Access API
    const exists = await checkFileExistsInFolder(localPath)
    
    vehicleStates.set(vehicle.id, {
      status: exists ? 'downloaded' : 'not_downloaded',
      localPath: exists ? localPath : undefined,
      lastChecked: now
    })
    
    return exists
    
  } catch (error) {
    console.error(`❌ Ошибка проверки файла ${vehicle.name}:`, error)
    vehicleStates.set(vehicle.id, {
      status: 'not_downloaded',
      lastChecked: now
    })
    return false
  }
}

/**
 * Проверка файла в файловой системе
 */
async function checkFileExistsInFolder(filePath: string): Promise<boolean> {
  try {
    console.log(`🔍 Проверяем файл: ${filePath}`)
    
    // В браузере проверяем через localStorage - отслеживаем скачанные файлы
    const downloadedFiles = JSON.parse(
      localStorage.getItem('downloadedVehicles') || '{}'
    )
    
    // Ищем файл по пути
    for (const fileInfo of Object.values(downloadedFiles) as any[]) {
      if (fileInfo.path === filePath) {
        console.log(`✅ Файл найден в кеше: ${filePath}`)
        return true
      }
    }
    
    console.log(`❌ Файл не найден: ${filePath}`)
    return false
    
  } catch (error) {
    console.error('File check error:', error)
    return false
  }
}

/**
 * Скачивает автомобиль
 * ВАЖНО: Использует ALT:V события если доступны, иначе fallback на браузерное скачивание
 */
export async function downloadVehicleWithStatus(vehicle: VehicleResource): Promise<void> {
  console.log(`⬇️ Скачиваем автомобиль: ${vehicle.name}`)
  
  try {
    // Обновляем статус
    vehicleStates.set(vehicle.id, { status: 'checking' })
    
    // Проверяем доступность ALT:V WebView
    const isAltV = typeof window !== 'undefined' && 'alt' in window
    
    if (isAltV) {
      // ALT:V режим - используем события для server-side скачивания
      console.log(`[downloadVehicleWithStatus] ALT:V mode - using vehicle:download event`)
      
      // Получаем токен
      const { getAccessToken } = await import('./auth')
      const token = getAccessToken()
      
      if (!token) {
        throw new Error('Токен авторизации не найден')
      }
      
      // Создаем Promise для ожидания ответа от сервера
      const downloadPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout: сервер не ответил'))
        }, 120000) // 2 минуты
        
        const handleDownloaded = (response: { 
          success: boolean
          vehicleId: string
          vehicleName: string
          message: string
        }) => {
          clearTimeout(timeout)
          ;(window as any).alt.off('vehicle:downloaded', handleDownloaded)
          
          if (response.success && response.vehicleId === vehicle.id) {
            console.log(`[downloadVehicleWithStatus] ✅ Vehicle downloaded: ${response.vehicleName}`)
            resolve()
          } else if (!response.success && response.vehicleId === vehicle.id) {
            reject(new Error(response.message || 'Ошибка скачивания'))
          }
        }
        
        ;(window as any).alt.on('vehicle:downloaded', handleDownloaded)
        
        // Отправляем событие на сервер
        ;(window as any).alt.emit('vehicle:download', {
          vehicleId: vehicle.id,
          vehicleName: vehicle.name,
          token
        })
        
        console.log(`[downloadVehicleWithStatus] 📤 Event sent: vehicle:download`)
      })
      
      // Ждем ответа
      await downloadPromise
      
    } else {
      // Браузерный режим - используем прямое скачивание
      console.log(`[downloadVehicleWithStatus] Browser mode - using direct download`)
      await downloadVehicle(vehicle.id)
    }
    
    // Обновляем статус на "скачан"
    const localPath = `${VEHICLE_CONFIG.downloadPath}${vehicle.name}${VEHICLE_CONFIG.extensions[0]}`
    vehicleStates.set(vehicle.id, {
      status: 'downloaded',
      localPath,
      lastChecked: Date.now()
    })
    
    // Сохраняем информацию о скачанном файле
    const downloadedVehicles = JSON.parse(
      localStorage.getItem('downloadedVehicles') || '{}'
    )
    downloadedVehicles[vehicle.id] = {
      name: vehicle.name,
      path: localPath,
      downloadedAt: Date.now()
    }
    localStorage.setItem('downloadedVehicles', JSON.stringify(downloadedVehicles))
    
    console.log(`✅ Автомобиль ${vehicle.name} скачан в ${localPath}`)
    
  } catch (error) {
    console.error(`❌ Ошибка скачивания ${vehicle.name}:`, error)
    vehicleStates.set(vehicle.id, { 
      status: 'not_downloaded',
      lastChecked: Date.now()
    })
    throw error
  }
}

/**
 * Удаляет автомобиль локально
 */
export async function deleteVehicleLocal(vehicle: VehicleResource): Promise<void> {
  console.log(`🗑️ Удаляем автомобиль: ${vehicle.name}`)
  
  try {
    const localPath = `${VEHICLE_CONFIG.downloadPath}${vehicle.name}${VEHICLE_CONFIG.extensions[0]}`
    
    // Удаляем информацию о файле из localStorage
    const downloadedVehicles = JSON.parse(
      localStorage.getItem('downloadedVehicles') || '{}'
    )
    delete downloadedVehicles[vehicle.id]
    localStorage.setItem('downloadedVehicles', JSON.stringify(downloadedVehicles))
    
    console.log(`📝 Удалена информация о файле: ${localPath}`)
    
    // Обновляем статус
    vehicleStates.set(vehicle.id, {
      status: 'not_downloaded',
      lastChecked: Date.now()
    })
    
    console.log(`✅ Автомобиль ${vehicle.name} удален`)
    
  } catch (error) {
    console.error(`❌ Ошибка удаления ${vehicle.name}:`, error)
    throw error
  }
}

// Функция deleteFileFromFolder больше не нужна - удаление происходит через localStorage

/**
 * Перезагружает автомобиль (удаляет и скачивает заново)
 */
export async function reloadVehicle(vehicle: VehicleResource): Promise<void> {
  console.log(`🔄 Перезагружаем автомобиль: ${vehicle.name}`)
  
  try {
    // Проверяем есть ли файл
    const exists = await checkVehicleExists(vehicle)
    if (exists) {
      await deleteVehicleLocal(vehicle)
    }
    
    // Скачиваем заново
    await downloadVehicleWithStatus(vehicle)
    
    console.log(`✅ Автомобиль ${vehicle.name} перезагружен`)
    
  } catch (error) {
    console.error(`❌ Ошибка перезагрузки ${vehicle.name}:`, error)
    throw error
  }
}

/**
 * Получает состояние автомобиля
 */
export function getVehicleState(vehicleId: string): VehicleState | undefined {
  return vehicleStates.get(vehicleId)
}

/**
 * Очищает кеш состояний
 */
export function clearVehicleStatesCache(): void {
  vehicleStates.clear()
  console.log('🧹 Кеш состояний автомобилей очищен')
}
