/**
 * Централизованный хук для работы с избранным
 * Использует FavoritesService как единый источник правды
 */

import { useState, useEffect, useCallback } from 'react'
import { favoritesService } from '@/services/favoritesService'
import type { 
  FavoritesState, 
  FavoriteType,
  FavoriteLocation,
  FavoriteTeleportMarker 
} from '@/types/favorites'
import toast from 'react-hot-toast'

/**
 * Хук для управления избранным
 * Теперь использует централизованный сервис
 */
export function useFavorites() {
  // Единое состояние из сервиса
  const [state, setState] = useState<FavoritesState>({
    weather: [],
    time: [],
    timeSpeed: [],
    vehicles: [],
    vehicleActions: [],
    weaponActions: [],
    locations: [],
    teleportMarkers: [],
  })
  
  // Состояние загрузки
  const [isLoading, setIsLoading] = useState(true)
  
  // Дополнительные данные для маркеров телепортации (полные объекты)
  const [allTeleportMarkers, setAllTeleportMarkers] = useState<FavoriteTeleportMarker[]>([])
  
  /**
   * Подписка на изменения из сервиса
   */
  useEffect(() => {
    console.log('[useFavorites] Subscribing to favorites service...')
    
    // Подписываемся на обновления из сервиса
    const unsubscribe = favoritesService.subscribe((newState) => {
      console.log('[useFavorites] State updated from service:', newState)
      setState(newState)
      setIsLoading(false)
    })
    
    // Инициализация сервиса (если еще не инициализирован)
    favoritesService.init().then(() => {
      console.log('[useFavorites] Service initialized')
      setIsLoading(false)
    }).catch(err => {
      console.error('[useFavorites] Service initialization failed:', err)
      setIsLoading(false)
    })
    
    return unsubscribe
  }, [])
  
  /**
   * Загрузка полных данных маркеров телепортации
   */
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
    ;(window as any).alt.emit('world:markers:load')
    
    return () => {
      ;(window as any).alt.off?.('world:markers:loaded', handleMarkersLoaded)
    }
  }, [])
  
  // ========================================================================
  // Методы для работы с избранным
  // ========================================================================
  
  /**
   * Добавить в избранное
   */
  const add = useCallback(async <T,>(type: FavoriteType, item: T) => {
    try {
      await favoritesService.add(type, item)
      toast.success('Добавлено в избранное')
    } catch (error) {
      console.error('[useFavorites] Error adding to favorites:', error)
      toast.error('Ошибка добавления в избранное')
    }
  }, [])
  
  /**
   * Удалить из избранного
   */
  const remove = useCallback(async (type: FavoriteType, id: string) => {
    try {
      await favoritesService.remove(type, id)
      toast.success('Удалено из избранного')
    } catch (error) {
      console.error('[useFavorites] Error removing from favorites:', error)
      toast.error('Ошибка удаления из избранного')
    }
  }, [])
  
  /**
   * Переключить избранное
   */
  const toggle = useCallback(async <T,>(type: FavoriteType, item: T): Promise<boolean> => {
    try {
      const newState = await favoritesService.toggle(type, item)
      toast.success(newState ? 'Добавлено в избранное' : 'Удалено из избранного')
      return newState
    } catch (error) {
      console.error('[useFavorites] Error toggling favorite:', error)
      toast.error('Ошибка изменения избранного')
      return false
    }
  }, [])
  
  /**
   * Проверить наличие в избранном
   */
  const has = useCallback((type: FavoriteType, id: string): boolean => {
    return favoritesService.has(type, id)
  }, [])
  
  // ========================================================================
  // Специфичные методы для обратной совместимости
  // ========================================================================
  
  /**
   * Переключить избранное для машины (legacy compatibility)
   */
  const toggleVehicleFavorite = useCallback(async (vehicleName: string) => {
    await toggle('vehicle', vehicleName)
  }, [toggle])
  
  /**
   * Проверить, является ли машина избранной (legacy compatibility)
   */
  const isVehicleFavorite = useCallback((vehicleName: string): boolean => {
    return has('vehicle', vehicleName)
  }, [has])
  
  /**
   * Обновить название локации
   */
  const updateLocationName = useCallback(async (locationId: string, newName: string) => {
    const location = state.locations.find(loc => loc.id === locationId)
    if (!location) return
    
    // Удаляем старую и добавляем обновленную
    await remove('location', locationId)
    await add('location', { ...location, name: newName })
    
    toast.success('Название обновлено')
  }, [state.locations, remove, add])
  
  // ========================================================================
  // Вычисляемые данные
  // ========================================================================
  
  /**
   * Фильтрованные маркеры телепортации (только избранные)
   */
  const favoriteTeleportMarkers = allTeleportMarkers.filter(marker => 
    state.teleportMarkers.includes(marker.id)
  )
  
  /**
   * Проверка наличия хоть одного избранного
   */
  const hasFavorites = 
    state.weather.length > 0 ||
    state.time.length > 0 ||
    state.timeSpeed.length > 0 ||
    state.vehicles.length > 0 ||
    state.vehicleActions.length > 0 ||
    state.weaponActions.length > 0 ||
    state.locations.length > 0 ||
    state.teleportMarkers.length > 0
  
  // ========================================================================
  // Возврат
  // ========================================================================
  
  return {
    // Состояние (разбито для обратной совместимости)
    favorites: {
      weather: state.weather,
      time: state.time,
      timeSpeed: state.timeSpeed,
      teleportMarkers: state.teleportMarkers
    },
    favoriteLocations: state.locations,
    favoriteTeleportMarkers,
    favoriteVehicles: state.vehicles,
    favoriteVehicleActions: state.vehicleActions,
    favoriteWeaponActions: state.weaponActions,
    
    // Полное состояние
    state,
    
    // Состояние загрузки
    isLoading,
    hasFavorites,
    
    // Универсальные методы
    add,
    remove,
    toggle,
    has,
    
    // Legacy методы (для обратной совместимости)
    toggleVehicleFavorite,
    isVehicleFavorite,
    updateLocationName,
    
    // Сеттеры (deprecated, использовать add/remove вместо них)
    setFavoriteLocations: (locations: FavoriteLocation[]) => {
      console.warn('[useFavorites] setFavoriteLocations is deprecated, use add/remove instead')
      // Обновляем через сервис
      state.locations.forEach(loc => remove('location', loc.id))
      locations.forEach(loc => add('location', loc))
    }
  }
}

export default useFavorites
