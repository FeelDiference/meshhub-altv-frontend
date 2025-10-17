// Сервис для работы с автомобилями - прямые запросы к backend

import { apiClient } from './auth'
import type { VehicleResource } from '@/types/vehicle'

export interface VehicleListResponse {
  success: boolean
  total: number
  vehicles: VehicleResource[]
}

/**
 * Получить список автомобилей с backend
 */
export async function getVehicles(): Promise<VehicleResource[]> {
  console.log('🚗 Загружаем список автомобилей с backend...')
  
  try {
    const response = await apiClient.get('/api/rpf/archives', {
      params: {
        limit: 10000 // Загружаем ВСЕ архивы
      }
    })
    
    console.log('✅ Архивы загружены:', response.data)
    console.log('🔍 Total archives from backend:', response.data.total)
    console.log('🔍 Returned archives count:', response.data.returned)
    
    // Получаем только автомобили
    const archives = response.data.archives || []
    console.log('🔍 Archives array length:', archives.length)
    
    const vehicleArchives = archives.filter((archive: any) => 
      archive.resource_type === 'vehicle'
    )
    
    console.log(`🚗 Найдено автомобилей: ${vehicleArchives.length} из ${archives.length} архивов`)
    
    // Дебаг: покажем структуру первого архива
    if (vehicleArchives.length > 0) {
      console.log('🔍 Структура первого архива:', JSON.stringify(vehicleArchives[0], null, 2))
    }
    
    // Ищем наши установленные машины в RAW данных
    const testNames = ['baze_senna', 'baze_rx7', 'baze_lixl9', 'baze_rmodgtr50']
    console.log('🔍 Searching for installed vehicles in raw archives...')
    for (const testName of testNames) {
      const foundRaw = archives.find((a: any) => 
        a.name === testName || 
        a.group_name === testName || 
        a.original_name === testName
      )
      if (foundRaw) {
        console.log(`✅ FOUND "${testName}" in raw archives:`, JSON.stringify(foundRaw, null, 2))
      } else {
        console.log(`❌ NOT FOUND "${testName}" in raw archives`)
      }
    }
    
    return vehicleArchives.map((archive: any) => {
      const mapped = {
        id: archive.id,
        name: archive.group_name || archive.name, // используем group_name как основное имя
        displayName: archive.group_name || archive.original_name || archive.name,
        modelName: archive.group_name, // для spawn используем group_name
        category: archive.resource_type,
        tags: [], // пока нет тегов
        size: archive.size,
        createdAt: archive.discovered_at || archive.updated_at,
        updatedAt: archive.updated_at,
        metadata: null
      }
      
      // Дебаг для baze_senna чтобы увидеть все поля
      if (archive.group_name === 'baze_senna' || archive.name === 'baze_senna' || archive.original_name?.includes('senna')) {
        console.log('🔍 FOUND baze_senna! Full archive data:', JSON.stringify(archive, null, 2))
        console.log('🔍 Mapped to:', JSON.stringify(mapped, null, 2))
      }
      
      return mapped
    })
    
  } catch (error: any) {
    console.error('❌ Ошибка загрузки автомобилей:', error)
    throw new Error(`Не удалось загрузить список автомобилей: ${error.message}`)
  }
}

/**
 * Получить метаданные конкретного автомобиля/архива
 */
export async function getVehicleMetadata(vehicleId: string) {
  console.log(`🔍 Загружаем метаданные для автомобиля ${vehicleId}...`)
  
  try {
    const response = await apiClient.get(`/api/rpf/archives/${vehicleId}/vehicle-metadata`)
    
    console.log('✅ Метаданные загружены:', response.data)
    return response.data
    
  } catch (error: any) {
    console.error('❌ Ошибка загрузки метаданных:', error)
    throw new Error(`Не удалось загрузить метаданные: ${error.message}`)
  }
}

/**
 * Скачать автомобиль/архив
 */
export async function downloadVehicle(vehicleId: string) {
  console.log(`⬇️ Скачиваем автомобиль ${vehicleId}...`)
  
  try {
    const response = await apiClient.get(`/api/rpf/archives/${vehicleId}/download`, {
      responseType: 'blob'
    })
    
    // Создаем ссылку для скачивания
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.download = `vehicle_${vehicleId}.rpf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    
    console.log('✅ Автомобиль скачан')
    
  } catch (error: any) {
    console.error('❌ Ошибка скачивания:', error)
    throw new Error(`Не удалось скачать автомобиль: ${error.message}`)
  }
}
