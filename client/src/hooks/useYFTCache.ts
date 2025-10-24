/**
 * Hook for YFT Model Caching
 * Хук для кэширования YFT моделей с интеграцией в YftViewer
 */

import React, { useState, useCallback, useRef } from 'react'
import { yftCache, CachedYFTData, CacheStats } from '../utils/yftCache'

export interface CacheStatus {
  /** Загружается ли модель из кэша */
  loadingFromCache: boolean
  /** Сохраняется ли модель в кэш */
  savingToCache: boolean
  /** Статистика кэша */
  stats: CacheStats | null
  /** Ошибка кэширования */
  error: string | null
}

export interface UseYFTCacheResult {
  /** Статус кэша */
  cacheStatus: CacheStatus
  /** Загрузка модели из кэша */
  loadFromCache: (fileName: string, fileHash?: string) => Promise<CachedYFTData | null>
  /** Сохранение модели в кэш */
  saveToCache: (data: Omit<CachedYFTData, 'cachedAt' | 'version'>) => Promise<void>
  /** Очистка кэша */
  clearCache: () => Promise<void>
  /** Обновление статистики */
  refreshStats: () => Promise<void>
  /** Проверка доступности кэша */
  isCacheAvailable: boolean
}

export function useYFTCache(): UseYFTCacheResult {
  const [cacheStatus, setCacheStatus] = useState<CacheStatus>({
    loadingFromCache: false,
    savingToCache: false,
    stats: null,
    error: null
  })

  const isCacheAvailableRef = useRef<boolean>(false)

  // Инициализация кэша при первом использовании
  const initCache = useCallback(async () => {
    if (isCacheAvailableRef.current) return true
    
    try {
      if (!yftCache.isAvailable()) {
        console.log('[useYFTCache] ❌ IndexedDB not available')
        return false
      }

      await yftCache.init()
      isCacheAvailableRef.current = true
      console.log('[useYFTCache] ✅ Cache initialized')
      return true
    } catch (error) {
      console.error('[useYFTCache] ❌ Cache initialization failed:', error)
      setCacheStatus(prev => ({ ...prev, error: `Cache init failed: ${error}` }))
      return false
    }
  }, [])

  // Загрузка модели из кэша
  const loadFromCache = useCallback(async (fileName: string, fileHash?: string): Promise<CachedYFTData | null> => {
    const isAvailable = await initCache()
    if (!isAvailable) return null

    setCacheStatus(prev => ({ ...prev, loadingFromCache: true, error: null }))

    try {
      const cachedData = await yftCache.get(fileName, fileHash)
      
      if (cachedData) {
        console.log(`[useYFTCache] ✅ Loaded ${fileName} from cache`)
      } else {
        console.log(`[useYFTCache] ❌ Cache miss for ${fileName}`)
      }

      return cachedData
    } catch (error) {
      console.error('[useYFTCache] ❌ Cache load error:', error)
      setCacheStatus(prev => ({ ...prev, error: `Cache load failed: ${error}` }))
      return null
    } finally {
      setCacheStatus(prev => ({ ...prev, loadingFromCache: false }))
    }
  }, [initCache])

  // Сохранение модели в кэш
  const saveToCache = useCallback(async (data: Omit<CachedYFTData, 'cachedAt' | 'version'>): Promise<void> => {
    const isAvailable = await initCache()
    if (!isAvailable) return

    setCacheStatus(prev => ({ ...prev, savingToCache: true, error: null }))

    try {
      const cacheData: CachedYFTData = {
        ...data,
        cachedAt: Date.now(),
        version: '1.0'
      }

      await yftCache.set(cacheData)
      console.log(`[useYFTCache] 💾 Saved ${data.fileName} to cache`)
      
      // Обновляем статистику после сохранения
      await refreshStats()
    } catch (error) {
      console.error('[useYFTCache] ❌ Cache save error:', error)
      setCacheStatus(prev => ({ ...prev, error: `Cache save failed: ${error}` }))
    } finally {
      setCacheStatus(prev => ({ ...prev, savingToCache: false }))
    }
  }, [initCache])

  // Очистка кэша
  const clearCache = useCallback(async (): Promise<void> => {
    const isAvailable = await initCache()
    if (!isAvailable) return

    try {
      await yftCache.clear()
      console.log('[useYFTCache] 🧹 Cache cleared')
      
      // Обновляем статистику после очистки
      await refreshStats()
    } catch (error) {
      console.error('[useYFTCache] ❌ Cache clear error:', error)
      setCacheStatus(prev => ({ ...prev, error: `Cache clear failed: ${error}` }))
    }
  }, [initCache])

  // Обновление статистики кэша
  const refreshStats = useCallback(async (): Promise<void> => {
    const isAvailable = await initCache()
    if (!isAvailable) return

    try {
      const stats = await yftCache.getStats()
      setCacheStatus(prev => ({ ...prev, stats }))
    } catch (error) {
      console.error('[useYFTCache] ❌ Stats refresh error:', error)
    }
  }, [initCache])

  // Инициализация статистики при монтировании хука
  React.useEffect(() => {
    refreshStats()
  }, [refreshStats])

  return {
    cacheStatus,
    loadFromCache,
    saveToCache,
    clearCache,
    refreshStats,
    isCacheAvailable: isCacheAvailableRef.current
  }
}
