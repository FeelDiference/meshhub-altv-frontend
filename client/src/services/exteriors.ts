/**
 * API сервис для работы с экстерьерами (YMAP файлы)
 * Использует существующие backend endpoints
 */

import axios from 'axios'
import { API_CONFIG } from '../config/api'
import { getAccessToken } from './auth'
import type { ExteriorResource, ArchiveYmapEntitiesResponse } from '@/types/exterior'

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
 * Получить список архивов с YMAP файлами
 */
export async function getExteriors(): Promise<{ archives: ExteriorResource[]; total: number }> {
  try {
    const response = await apiClient.get<{ archives: ExteriorResource[]; total: number }>(
      '/api/rpf/archives/with-ymaps'
    )
    console.log('[Exteriors API] Loaded archives:', response.data.total)
    return response.data
  } catch (error) {
    console.error('[Exteriors API] Failed to load archives:', error)
    throw error
  }
}

/**
 * Получить детали архива с entities из YMAP
 */
export async function getExteriorDetails(archiveId: string): Promise<ArchiveYmapEntitiesResponse> {
  try {
    const response = await apiClient.get<ArchiveYmapEntitiesResponse>(
      `/api/rpf/archives/${archiveId}/ymap-entities`
    )
    console.log('[Exteriors API] Loaded YMAP details:')
    console.log('  - archiveId:', archiveId)
    console.log('  - totalFiles:', response.data.total_files)
    console.log('  - totalEntities:', response.data.total_entities)
    console.log('  - ymap_files:', JSON.stringify(response.data.ymap_files, null, 2))
    console.log('  - archive_path:', response.data.archive_path)
    console.log('  - parent_path:', response.data.parent_path)
    return response.data
  } catch (error) {
    console.error('[Exteriors API] Failed to load YMAP details:', error)
    throw error
  }
}

/**
 * Скачать архив
 */
export async function downloadExterior(archiveId: string, archiveName: string): Promise<void> {
  try {
    const url = `/api/rpf/archives/${archiveId}/download`
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const blob = await response.blob()
    const downloadUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = `${archiveName}.rpf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(downloadUrl)

    console.log('[Exteriors API] Archive downloaded:', archiveName)
  } catch (error) {
    console.error('[Exteriors API] Failed to download archive:', error)
    throw error
  }
}

/**
 * Скачать конкретный YMAP файл
 */
export async function downloadYmapFile(filePath: string, fileName: string): Promise<void> {
  try {
    const url = `/api/rpf/download?path=${encodeURIComponent(filePath)}`
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const blob = await response.blob()
    const downloadUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(downloadUrl)

    console.log('[Exteriors API] YMAP file downloaded:', fileName)
  } catch (error) {
    console.error('[Exteriors API] Failed to download YMAP file:', error)
    throw error
  }
}

