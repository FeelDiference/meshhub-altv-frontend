// Хук для централизованной работы с избранным
import { useState, useEffect, useCallback } from 'react'

/**
 * Типы для избранного
 */
export interface Favorites {
  weather: string[]
  time: string[]
  timeSpeed: number[]
  teleportMarkers: string[]
}

export interface FavoriteLocation {
  id: string
  name: string
  coords: { x: number; y: number; z: number }
}

export interface TeleportMarker {
  id: string
  name: string
  position: { x: number; y: number; z: number }
  createdAt: string
}

/**
 * Хук для управления избранным
 * Работает через Alt:V storage и localStorage для интерьеров
 */
export function useFavorites() {
  // Избранные настройки (погода, время и т.д.)
  const [favorites, setFavorites] = useState<Favorites>({
    weather: [],
    time: [],
    timeSpeed: [],
    teleportMarkers: []
  })
  
  // Избранные локации интерьеров
  const [favoriteLocations, setFavoriteLocations] = useState<FavoriteLocation[]>([])
  
  // Избранные маркеры телепортации
  const [favoriteTeleportMarkers, setFavoriteTeleportMarkers] = useState<TeleportMarker[]>([])
  const [allTeleportMarkers, setAllTeleportMarkers] = useState<TeleportMarker[]>([])
  
  // Избранные машины
  const [favoriteVehicles, setFavoriteVehicles] = useState<string[]>([])
  
  // Состояние загрузки
  const [isLoading, setIsLoading] = useState(true)

  /**
   * Загрузка избранного при монтировании
   */
  const loadFavorites = useCallback(() => {
    console.log('[useFavorites] Loading favorites...')
    
    // Загружаем избранное через Alt:V (персистентное хранилище)
    if (typeof window !== 'undefined' && 'alt' in window && (window as any).alt) {
      try {
        ;(window as any).alt.emit('world:favorites:load')
        console.log('[useFavorites] Requesting favorites from server')
      } catch (error) {
        console.error('[useFavorites] Error requesting favorites:', error)
      }
    }
    
    // Загружаем избранные локации интерьеров из localStorage
    try {
      const stored = localStorage.getItem('interior_favorites')
      const storedLocations = localStorage.getItem('interior_favorite_locations')
      
      if (stored && storedLocations) {
        const favoriteIds = JSON.parse(stored)
        const locations = JSON.parse(storedLocations)
        const filteredLocations = locations.filter((loc: any) => favoriteIds.includes(loc.id))
        setFavoriteLocations(filteredLocations)
        console.log('[useFavorites] Loaded favorite locations:', filteredLocations.length)
      }
    } catch (e) {
      console.warn('[useFavorites] Failed to load favorite locations:', e)
    }

    // Загружаем избранные машины через Alt:V
    if (typeof window !== 'undefined' && 'alt' in window && (window as any).alt) {
      try {
        ;(window as any).alt.emit('favorites:vehicles:load')
        console.log('[useFavorites] Requesting favorite vehicles from Alt:V storage')
      } catch (error) {
        console.error('[useFavorites] Error requesting favorite vehicles:', error)
      }
    }
    
    // Загружаем все маркеры телепортации
    if (typeof window !== 'undefined' && 'alt' in window && (window as any).alt) {
      try {
        ;(window as any).alt.emit('world:markers:load')
        console.log('[useFavorites] Requesting teleport markers from server')
      } catch (error) {
        console.error('[useFavorites] Error requesting teleport markers:', error)
      }
    }

    // Устанавливаем таймаут для завершения загрузки
    const loadingTimeout = setTimeout(() => {
      setIsLoading(false)
      console.log('[useFavorites] Loading timeout - setting isLoading to false')
    }, 2000)

    return () => clearTimeout(loadingTimeout)
  }, [])

  // Загрузка при монтировании
  useEffect(() => {
    const cleanup = loadFavorites()
    return cleanup
  }, [loadFavorites])

  // Обработчик получения избранных настроек
  useEffect(() => {
    if (typeof window === 'undefined' || !('alt' in window)) return
    
    const handleFavoritesResponse = (data: any) => {
      console.log('[useFavorites] Received favorites response from server:', data)
      if (data.success && data.favorites) {
        console.log('[useFavorites] Using favorites from Alt:V storage:', data.favorites)
        setFavorites(data.favorites)
      } else {
        console.error('[useFavorites] Failed to load favorites:', data.error)
      }
      setIsLoading(false)
    }
    
    ;(window as any).alt.on('world:favorites:response', handleFavoritesResponse)
    return () => {
      ;(window as any).alt.off?.('world:favorites:response', handleFavoritesResponse)
    }
  }, [])

  // Обработчик получения избранных машин
  useEffect(() => {
    if (typeof window === 'undefined' || !('alt' in window)) return
    
    const handleVehicleFavoritesResponse = (data: any) => {
      console.log('[useFavorites] Received vehicle favorites response:', data)
      if (data.success && data.vehicles) {
        setFavoriteVehicles(data.vehicles)
        console.log('[useFavorites] Updated favorite vehicles from Alt:V:', data.vehicles)
      } else {
        console.error('[useFavorites] Failed to load vehicle favorites:', data.error)
      }
    }

    const handleVehicleFavoritesUpdated = (data: any) => {
      console.log('[useFavorites] Vehicle favorites updated:', data)
      if (data.vehicles) {
        setFavoriteVehicles(data.vehicles)
        console.log('[useFavorites] Updated favorite vehicles:', data.vehicles)
      }
    }

    ;(window as any).alt.on('favorites:vehicles:response', handleVehicleFavoritesResponse)
    ;(window as any).alt.on('favorites:vehicles:updated', handleVehicleFavoritesUpdated)
    
    return () => {
      ;(window as any).alt.off?.('favorites:vehicles:response', handleVehicleFavoritesResponse)
      ;(window as any).alt.off?.('favorites:vehicles:updated', handleVehicleFavoritesUpdated)
    }
  }, [])
  
  // Обработчик получения маркеров телепортации
  useEffect(() => {
    if (typeof window === 'undefined' || !('alt' in window)) return
    
    const handleMarkersLoaded = (data: any) => {
      console.log('[useFavorites] Received teleport markers:', data)
      if (data.markers && Array.isArray(data.markers)) {
        setAllTeleportMarkers(data.markers)
        console.log('[useFavorites] Loaded all teleport markers:', data.markers.length)
      }
    }

    ;(window as any).alt.on('world:markers:loaded', handleMarkersLoaded)
    
    return () => {
      ;(window as any).alt.off?.('world:markers:loaded', handleMarkersLoaded)
    }
  }, [])
  
  // Фильтруем избранные маркеры телепортации
  useEffect(() => {
    if (allTeleportMarkers.length > 0 && favorites.teleportMarkers && favorites.teleportMarkers.length > 0) {
      const filtered = allTeleportMarkers.filter(marker => 
        favorites.teleportMarkers.includes(marker.id)
      )
      setFavoriteTeleportMarkers(filtered)
      console.log(`[useFavorites] Filtered ${filtered.length} favorite teleport markers from ${allTeleportMarkers.length} total`)
    } else {
      setFavoriteTeleportMarkers([])
    }
  }, [allTeleportMarkers, favorites.teleportMarkers])

  /**
   * Переключить избранное для машины
   */
  const toggleVehicleFavorite = useCallback((vehicleName: string) => {
    console.log(`[useFavorites] Toggling favorite for vehicle: ${vehicleName}`)
    
    if (typeof window !== 'undefined' && 'alt' in window) {
      const isFavorite = favoriteVehicles.includes(vehicleName)
      ;(window as any).alt.emit('favorites:vehicle:toggle', {
        vehicleName,
        isFavorite: !isFavorite
      })
    } else {
      console.warn('[useFavorites] Alt:V not available, cannot toggle favorite')
    }
  }, [favoriteVehicles])

  /**
   * Проверить, является ли машина избранной
   */
  const isVehicleFavorite = useCallback((vehicleName: string) => {
    return favoriteVehicles?.includes(vehicleName) || false
  }, [favoriteVehicles])

  /**
   * Проверить, есть ли хоть одно избранное
   */
  const hasFavorites = 
    (favorites.weather?.length > 0) || 
    (favorites.time?.length > 0) || 
    (favorites.timeSpeed?.length > 0) || 
    (favoriteLocations?.length > 0) || 
    (favoriteVehicles?.length > 0) || 
    (favoriteTeleportMarkers?.length > 0)

  return {
    // Состояния
    favorites,
    favoriteLocations,
    favoriteTeleportMarkers,
    favoriteVehicles,
    isLoading,
    hasFavorites,
    
    // Методы
    toggleVehicleFavorite,
    isVehicleFavorite,
    loadFavorites,
    
    // Сеттеры для локаций (пока оставляем здесь для Dashboard)
    setFavoriteLocations
  }
}


