// Weapons service - API integration for weapon resources

import axios from 'axios'
import { API_CONFIG } from '../config/api'
import type { WeaponResource } from '../types/weapon'
import { getAccessToken } from './auth'

const api = axios.create({
  baseURL: API_CONFIG.baseUrl,
  timeout: API_CONFIG.timeouts.default,
  headers: API_CONFIG.defaultHeaders
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
    console.log('🔑 Токен авторизации добавлен в запрос:', token.substring(0, 20) + '...')
  } else {
    console.warn('⚠️ Токен авторизации не найден')
  }
  return config
})

/**
 * Get list of weapon archives from MeshHub backend
 */
export async function getWeaponArchives(): Promise<WeaponResource[]> {
  console.log('🔫 Загружаем список архивов оружия с backend...')
  
  try {
    const response = await api.get('/api/rpf/archives', {
      params: {
        limit: 200
      }
    })
    
    console.log('✅ Архивы загружены:', response.data)
    
    const archives = response.data.archives || []
    
    // Filter only weapon archives
    const weaponArchives = archives.filter((archive: any) => 
      archive.resource_type === 'weapon' || 
      archive.group_name?.toLowerCase().includes('weapon') ||
      archive.name?.toLowerCase().includes('weapon')
    )
    
    console.log(`🔫 Найдено оружия: ${weaponArchives.length} из ${archives.length} архивов`)
    
    // Transform to WeaponResource format
    const weapons: WeaponResource[] = weaponArchives.map((archive: any) => ({
      id: archive.id,
      name: archive.group_name || archive.name,
      displayName: archive.group_name || archive.original_name || archive.name,
      modelName: archive.group_name,
      category: archive.resource_type,
      tags: [],
      size: archive.size,
      createdAt: archive.discovered_at || archive.updated_at,
      updatedAt: archive.updated_at,
      metadata: null
    }))
    
    return weapons
    
  } catch (error: any) {
    console.error('❌ Ошибка загрузки оружия:', error)
    throw new Error(`Не удалось загрузить список оружия: ${error.message}`)
  }
}

/**
 * Get list of weapons from MeshHub backend (legacy - for compatibility)
 */
export async function getWeapons(): Promise<WeaponResource[]> {
  return getWeaponArchives()
}

/**
 * Get weapons inside a specific archive
 */
export async function getWeaponsInArchive(archiveId: string): Promise<WeaponResource[]> {
  console.log(`🔫 Загружаем оружия из архива ${archiveId}...`)
  
  try {
    // Получаем все weapons.meta файлы без фильтрации по архиву
    const response = await api.get('/api/rpf/files/find-by-name', {
      params: {
        name: 'weapons.meta'
      }
    })
    
    if (!response.data || !response.data.files) {
      console.log('📦 Архив не содержит weapons.meta файлов')
      return []
    }
    
    // Фильтруем файлы по archive_id (не по пути)
    const archiveFiles = response.data.files.filter((file: any) => {
      return file.archive_id === archiveId
    })
    
    console.log(`🔍 Найдено ${archiveFiles.length} weapons.meta файлов в архиве ${archiveId}`)
    
    const weapons: WeaponResource[] = archiveFiles.map((file: any) => {
      // Extract weapon name from path: common/data/{weaponName}/weapons.meta
      const pathParts = file.path.split('/')
      const weaponName = pathParts[pathParts.length - 2] // Get folder name before weapons.meta
      
      return {
        id: file.id,
        name: weaponName,
        displayName: weaponName,
        modelName: weaponName,
        category: 'weapon',
        tags: [],
        size: file.file_size,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {
          archiveId: archiveId,
          filePath: file.path,
          archivePath: file.archive_path
        }
      }
    })
    
    console.log(`✅ Найдено ${weapons.length} оружий в архиве ${archiveId}`)
    return weapons
    
  } catch (error: any) {
    console.error('❌ Ошибка загрузки оружий из архива:', error)
    throw new Error(`Не удалось загрузить оружия из архива: ${error.message}`)
  }
}

/**
 * Get weapon metadata
 */
export async function getWeaponMetadata(weaponId: string) {
  try {
    const response = await api.get(`/api/rpf/archives/${weaponId}/metadata`)
    return response.data
  } catch (error: any) {
    console.error('❌ Ошибка загрузки метаданных оружия:', error)
    throw new Error(`Не удалось загрузить метаданные: ${error.message}`)
  }
}

/**
 * Download weapon archive
 */
export async function downloadWeapon(weaponId: string) {
  console.log(`⬇️ Скачиваем оружие ${weaponId}...`)
  
  try {
    const response = await api.get(`/api/rpf/archives/${weaponId}/download`, {
      responseType: 'blob'
    })
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.download = `weapon_${weaponId}.rpf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    
    console.log('✅ Оружие скачано')
  } catch (error: any) {
    console.error('❌ Ошибка скачивания:', error)
    throw new Error(`Не удалось скачать оружие: ${error.message}`)
  }
}

/**
 * Get weapon.meta file content
 */
export async function getWeaponMeta(weaponName: string, archivePath: string): Promise<string> {
  console.log(`📄 Загружаем weapon.meta для ${weaponName}...`)
  
  try {
    // Try find-by-name endpoint first
    const response = await api.get('/api/rpf/files/find-by-name', {
      params: {
        name: 'weapons.meta',
        archive_path: archivePath
      }
    })
    
    if (response.data && response.data.content) {
      console.log('✅ weapon.meta загружен через find-by-name')
      return response.data.content
    }
    
    // Fallback to rpf-content endpoint
    const contentResponse = await api.get('/api/rpf/files/rpf-content', {
      params: {
        path: 'common/data/weapons.meta',
        offset: 0,
        limit: 1500,
        encoding: 'utf-8',
        archive_path: archivePath
      }
    })
    
    console.log('✅ weapon.meta загружен через rpf-content')
    return contentResponse.data.content || contentResponse.data
    
  } catch (error: any) {
    console.error('❌ Ошибка загрузки weapon.meta:', error)
    throw new Error(`Не удалось загрузить weapon.meta: ${error.message}`)
  }
}

/**
 * Save weapon stats
 */
export async function saveWeaponStats(weaponId: string, stats: any) {
  console.log(`💾 Сохраняем статы оружия ${weaponId}...`)
  
  try {
    const response = await api.post(`/api/rpf/weapons/${weaponId}/stats`, {
      stats
    })
    
    console.log('✅ Статы оружия сохранены')
    return response.data
  } catch (error: any) {
    console.error('❌ Ошибка сохранения статов:', error)
    throw new Error(`Не удалось сохранить статы: ${error.message}`)
  }
}

