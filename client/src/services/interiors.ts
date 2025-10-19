// Сервис для работы с API интерьеров (MLO)

import axios from 'axios'
import { API_CONFIG } from '../config/api'
import { getAccessToken } from './auth'
import type { InteriorResource, InteriorListResponse, InteriorDetailsResponse } from '../types/interior'

// Создаем axios инстанс с автоматическим добавлением токена
const apiClient = axios.create({
  baseURL: API_CONFIG.baseUrl,
  timeout: API_CONFIG.timeouts.default,
  headers: API_CONFIG.defaultHeaders
})

// Добавляем интерцептор для автоматического добавления Bearer токена
apiClient.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

/**
 * Получить список интерьеров с backend
 */
export async function getInteriors(): Promise<InteriorResource[]> {
  console.log('🏠 Загружаем список интерьеров с backend...')

  try {
    const response = await apiClient.get<InteriorListResponse>('/api/rpf/mlo', {
      params: {
        limit: 200
      }
    })

    console.log('✅ Интерьеры загружены:', response.data)

    const interiors = response.data.interiors || []
    console.log(`🏠 Найдено интерьеров: ${interiors.length}`)

    return interiors
  } catch (error: any) {
    console.error('❌ Ошибка загрузки интерьеров:', error)
    throw new Error(`Не удалось загрузить список интерьеров: ${error.message}`)
  }
}

/**
 * Получить детальную информацию об интерьерах архива
 */
export async function getInteriorDetails(archiveId: string): Promise<InteriorDetailsResponse> {
  console.log(`🏠 Загружаем детали интерьера ${archiveId}...`)

  try {
    const response = await apiClient.get<InteriorDetailsResponse>(`/api/rpf/mlo/${archiveId}`)
    console.log('✅ Детали интерьера загружены:', response.data)
    return response.data
  } catch (error: any) {
    console.error('❌ Ошибка загрузки деталей интерьера:', error)
    throw new Error(`Не удалось загрузить детали интерьера: ${error.message}`)
  }
}

/**
 * Запустить сканирование архива на наличие интерьеров
 */
export async function scanArchiveForInteriors(archiveId: string): Promise<void> {
  console.log(`🔍 Сканируем архив ${archiveId} на наличие интерьеров...`)

  try {
    await apiClient.post(`/api/rpf/mlo/${archiveId}/scan`)
    console.log('✅ Сканирование запущено')
  } catch (error: any) {
    console.error('❌ Ошибка сканирования:', error)
    throw new Error(`Не удалось сканировать архив: ${error.message}`)
  }
}

/**
 * Скачать интерьер (архив)
 */
export async function downloadInterior(archiveId: string): Promise<void> {
  console.log(`⬇️ Скачиваем интерьер ${archiveId}...`)
  
  try {
    const response = await apiClient.get(`/api/rpf/archives/${archiveId}/download`, {
      responseType: 'blob'
    })
    
    // Создаем blob URL и скачиваем
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.download = `interior_${archiveId}.rpf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    
    console.log('✅ Интерьер скачан')
  } catch (error: any) {
    console.error('❌ Ошибка скачивания:', error)
    throw new Error(`Не удалось скачать интерьер: ${error.message}`)
  }
}

