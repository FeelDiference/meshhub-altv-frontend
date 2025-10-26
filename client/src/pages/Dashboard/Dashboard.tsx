// Главная страница - Dashboard с избранным
import React, { useState } from 'react'
import { Car, MapPin, Heart, Cloud, Clock, Pencil, Check, X, Navigation, Play } from 'lucide-react'
import toast from 'react-hot-toast'
import { useFavorites } from '@/hooks/useFavorites'

/**
 * Компонент Dashboard - главная страница с избранным
 * Отображает быстрый доступ к избранным настройкам погоды, времени, локациям и машинам
 */
export const Dashboard = () => {
  // Используем централизованный хук для избранного
  const {
    favorites,
    favoriteLocations,
    favoriteTeleportMarkers,
    favoriteVehicles,
    isLoading,
    hasFavorites,
    setFavoriteLocations
  } = useFavorites()

  // Локальное состояние для редактирования названий локаций
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null)
  const [editingLocationName, setEditingLocationName] = useState('')

  // Отладочная информация
  console.log('[Dashboard] Current state:', {
    favorites,
    favoriteLocations: favoriteLocations.length,
    favoriteTeleportMarkers: favoriteTeleportMarkers.length,
    favoriteVehicles: favoriteVehicles.length,
    isLoading
  })

  /**
   * Применить погоду
   */
  const applyWeather = (weather: string) => {
    if (typeof window !== 'undefined' && 'alt' in window && (window as any).alt) {
      try {
        ;(window as any).alt.emit('world:weather:set', { weather })
        toast.success(`Погода изменена на ${weather}`)
        console.log(`[Dashboard] Applied weather: ${weather}`)
      } catch (error) {
        console.error(`[Dashboard] Error applying weather:`, error)
        toast.error('Ошибка изменения погоды')
      }
    }
  }

  /**
   * Применить время
   */
  const applyTime = (time: string) => {
    if (typeof window !== 'undefined' && 'alt' in window && (window as any).alt) {
      try {
        ;(window as any).alt.emit('world:time:set', { time })
        toast.success(`Время изменено на ${time}`)
        console.log(`[Dashboard] Applied time: ${time}`)
      } catch (error) {
        console.error(`[Dashboard] Error applying time:`, error)
        toast.error('Ошибка изменения времени')
      }
    }
  }

  /**
   * Применить скорость времени
   */
  const applyTimeSpeed = (speed: number) => {
    if (typeof window !== 'undefined' && 'alt' in window && (window as any).alt) {
      try {
        ;(window as any).alt.emit('world:time:speed', { speed })
        toast.success(`Скорость времени: ${speed}x`)
        console.log(`[Dashboard] Applied time speed: ${speed}x`)
      } catch (error) {
        console.error(`[Dashboard] Error applying time speed:`, error)
        toast.error('Ошибка изменения скорости времени')
      }
    }
  }

  /**
   * Телепортироваться к локации интерьера
   */
  const teleportToLocation = (location: {id: string, name: string, coords: {x: number, y: number, z: number}}) => {
    if (typeof window !== 'undefined' && 'alt' in window && (window as any).alt) {
      try {
        ;(window as any).alt.emit('meshhub:interior:teleport', {
          interiorId: location.id,
          archetypeName: location.name,
          position: location.coords
        })
        toast.success(`Телепорт к ${location.name}`)
        console.log(`[Dashboard] Teleported to: ${location.name}`)
      } catch (error) {
        console.error(`[Dashboard] Error teleporting:`, error)
        toast.error('Ошибка телепортации')
      }
    }
  }

  /**
   * Начать редактирование названия локации
   */
  const startEditingLocation = (location: {id: string, name: string, coords: {x: number, y: number, z: number}}, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingLocationId(location.id)
    setEditingLocationName(location.name)
  }

  /**
   * Сохранить новое название локации
   */
  const saveLocationName = (locationId: string) => {
    if (!editingLocationName.trim()) {
      toast.error('Название не может быть пустым')
      return
    }

    const updatedLocations = favoriteLocations.map(loc => 
      loc.id === locationId 
        ? { ...loc, name: editingLocationName.trim() }
        : loc
    )
    
    setFavoriteLocations(updatedLocations)
    
    // Сохраняем в localStorage
    try {
      localStorage.setItem('interior_favorite_locations', JSON.stringify(updatedLocations))
      toast.success('Название изменено')
      console.log(`[Dashboard] Location renamed: ${editingLocationName}`)
    } catch (e) {
      console.error('[Dashboard] Failed to save location name:', e)
      toast.error('Ошибка сохранения')
    }
    
    setEditingLocationId(null)
    setEditingLocationName('')
  }

  /**
   * Отменить редактирование названия локации
   */
  const cancelEditingLocation = () => {
    setEditingLocationId(null)
    setEditingLocationName('')
  }

  /**
   * Заспавнить машину
   */
  const spawnVehicle = (vehicleName: string) => {
    if (typeof window !== 'undefined' && 'alt' in window && (window as any).alt) {
      try {
        ;(window as any).alt.emit('vehicle:spawn', { modelName: vehicleName })
        toast.success(`Заспавнен ${vehicleName}`)
        console.log(`[Dashboard] Spawned vehicle: ${vehicleName}`)
      } catch (error) {
        console.error(`[Dashboard] Error spawning vehicle:`, error)
        toast.error('Ошибка спавна машины')
      }
    }
  }
  
  /**
   * Телепортироваться к маркеру
   */
  const teleportToMarker = (marker: {id: string, name: string, position: {x: number, y: number, z: number}}) => {
    if (typeof window !== 'undefined' && 'alt' in window && (window as any).alt) {
      try {
        ;(window as any).alt.emit('world:teleport', { position: marker.position })
        toast.success(`Телепорт: ${marker.name}`)
        console.log(`[Dashboard] Teleported to marker: ${marker.name}`, marker.position)
      } catch (error) {
        console.error(`[Dashboard] Error teleporting to marker:`, error)
        toast.error('Ошибка телепортации')
      }
    }
  }

  return (
    <div className="flex-1 p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Добро пожаловать!</h1>
        <p className="text-gray-400">Выберите модуль из меню слева</p>
      </div>
      
      {/* Секция Избранное */}
      <div className="bg-base-800/50 rounded-lg p-4 border border-base-700">
        <div className="flex items-center gap-2 mb-4">
          <Heart className="w-5 h-5 text-red-400" />
          <h2 className="text-lg font-semibold text-white">Избранное - Быстрые действия</h2>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center h-32 bg-base-700/30 rounded-lg border border-base-700/50">
            <div className="text-center text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-2"></div>
              <p className="text-sm">Загрузка избранного...</p>
            </div>
          </div>
        ) : !hasFavorites ? (
          <div className="flex items-center justify-center h-32 bg-base-700/30 rounded-lg border border-base-700/50">
            <div className="text-center text-gray-500">
              <Heart className="w-8 h-8 mx-auto mb-2 text-gray-600" />
              <p className="text-sm">Пока ничего нет в избранном.</p>
              <p className="text-xs text-gray-600 mt-1">Добавляйте настройки погоды и времени в избранное для быстрого доступа.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Избранная погода */}
            {favorites.weather?.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-gray-400 mb-3 flex items-center gap-1.5">
                  <Cloud className="w-3.5 h-3.5 text-blue-400" />
                  Погода:
                </h3>
                <div className="space-y-2">
                  {favorites.weather?.map(weather => (
                    <div
                      key={weather}
                      onClick={() => applyWeather(weather)}
                      className="w-full p-3 bg-base-700/50 border border-base-600 rounded-lg hover:bg-base-600/50 hover:border-blue-500/30 transition-all duration-200 cursor-pointer group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <div className="w-8 h-8 bg-blue-600/20 rounded-lg flex items-center justify-center group-hover:bg-blue-600/30 transition-colors">
                            <Cloud className="w-4 h-4 text-blue-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-white truncate">
                              {weather}
                            </div>
                            <div className="text-xs text-gray-400">
                              Погодные условия
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="text-xs text-gray-500 group-hover:text-blue-400 transition-colors">
                            Применить
                          </div>
                          <div className="w-5 h-5 bg-blue-600/20 rounded flex items-center justify-center group-hover:bg-blue-600/30 transition-colors">
                            <Cloud className="w-3 h-3 text-blue-400" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Избранное время */}
            {favorites.time?.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-gray-400 mb-3 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-yellow-400" />
                  Время:
                </h3>
                <div className="space-y-2">
                  {favorites.time?.map(time => (
                    <div
                      key={time}
                      onClick={() => applyTime(time)}
                      className="w-full p-3 bg-base-700/50 border border-base-600 rounded-lg hover:bg-base-600/50 hover:border-yellow-500/30 transition-all duration-200 cursor-pointer group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <div className="w-8 h-8 bg-yellow-600/20 rounded-lg flex items-center justify-center group-hover:bg-yellow-600/30 transition-colors">
                            <Clock className="w-4 h-4 text-yellow-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-white truncate">
                              {time}
                            </div>
                            <div className="text-xs text-gray-400">
                              Время суток
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="text-xs text-gray-500 group-hover:text-yellow-400 transition-colors">
                            Применить
                          </div>
                          <div className="w-5 h-5 bg-yellow-600/20 rounded flex items-center justify-center group-hover:bg-yellow-600/30 transition-colors">
                            <Clock className="w-3 h-3 text-yellow-400" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Избранная скорость времени */}
            {favorites.timeSpeed?.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-gray-400 mb-3 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-purple-400" />
                  Скорость:
                </h3>
                <div className="space-y-2">
                  {favorites.timeSpeed?.map(speed => (
                    <div
                      key={speed}
                      onClick={() => applyTimeSpeed(speed)}
                      className="w-full p-3 bg-base-700/50 border border-base-600 rounded-lg hover:bg-base-600/50 hover:border-purple-500/30 transition-all duration-200 cursor-pointer group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <div className="w-8 h-8 bg-purple-600/20 rounded-lg flex items-center justify-center group-hover:bg-purple-600/30 transition-colors">
                            <Clock className="w-4 h-4 text-purple-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-white truncate">
                              {speed}x
                            </div>
                            <div className="text-xs text-gray-400">
                              Скорость времени
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="text-xs text-gray-500 group-hover:text-purple-400 transition-colors">
                            Применить
                          </div>
                          <div className="w-5 h-5 bg-purple-600/20 rounded flex items-center justify-center group-hover:bg-purple-600/30 transition-colors">
                            <Clock className="w-3 h-3 text-purple-400" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Избранные локации интерьеров */}
            {favoriteLocations.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-gray-400 mb-3 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-green-400" />
                  Локации:
                </h3>
                <div className="space-y-2">
                  {favoriteLocations.map(location => {
                    const isEditing = editingLocationId === location.id
                    
                    return (
                      <div
                        key={location.id}
                        onClick={() => !isEditing && teleportToLocation(location)}
                        className={`w-full p-3 bg-base-700/50 border border-base-600 rounded-lg transition-all duration-200 group ${
                          !isEditing ? 'hover:bg-base-600/50 hover:border-green-500/30 cursor-pointer' : 'border-blue-500/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <div className="w-8 h-8 bg-green-600/20 rounded-lg flex items-center justify-center group-hover:bg-green-600/30 transition-colors">
                              <MapPin className="w-4 h-4 text-green-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editingLocationName}
                                  onChange={(e) => setEditingLocationName(e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      saveLocationName(location.id)
                                    } else if (e.key === 'Escape') {
                                      cancelEditingLocation()
                                    }
                                  }}
                                  className="w-full px-2 py-1 bg-base-900 border border-blue-500 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  autoFocus
                                />
                              ) : (
                                <div className="text-sm font-medium text-white truncate">
                                  {location.name}
                                </div>
                              )}
                              <div className="text-xs text-gray-400 mt-0.5">
                                X: {location.coords.x.toFixed(1)}, Y: {location.coords.y.toFixed(1)}, Z: {location.coords.z.toFixed(1)}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    saveLocationName(location.id)
                                  }}
                                  className="p-1.5 rounded hover:bg-green-600/20 text-green-400 transition-colors"
                                  title="Сохранить"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    cancelEditingLocation()
                                  }}
                                  className="p-1.5 rounded hover:bg-red-600/20 text-red-400 transition-colors"
                                  title="Отмена"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={(e) => startEditingLocation(location, e)}
                                  className="p-1.5 rounded hover:bg-blue-600/20 text-gray-400 hover:text-blue-400 transition-colors opacity-0 group-hover:opacity-100"
                                  title="Переименовать"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <div className="text-xs text-gray-500 group-hover:text-green-400 transition-colors">
                                  Телепорт
                                </div>
                                <div className="w-5 h-5 bg-green-600/20 rounded flex items-center justify-center group-hover:bg-green-600/30 transition-colors">
                                  <MapPin className="w-3 h-3 text-green-400" />
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Избранные маркеры телепортации */}
            {favoriteTeleportMarkers.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-gray-400 mb-3 flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-green-400" />
                  Телепорты:
                </h3>
                <div className="space-y-2">
                  {favoriteTeleportMarkers.map(marker => (
                    <div
                      key={marker.id}
                      onClick={() => teleportToMarker(marker)}
                      className="w-full p-3 bg-base-700/50 border border-base-600 rounded-lg transition-all duration-200 group hover:bg-base-600/50 hover:border-green-500/30 cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <div className="w-8 h-8 bg-green-600/20 rounded-lg flex items-center justify-center group-hover:bg-green-600/30 transition-colors">
                            <Navigation className="w-4 h-4 text-green-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-white truncate">
                              {marker.name}
                            </div>
                            <div className="text-xs text-gray-400 mt-0.5">
                              {marker.position.x.toFixed(1)}, {marker.position.y.toFixed(1)}, {marker.position.z.toFixed(1)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="text-xs text-gray-500 group-hover:text-green-400 transition-colors">
                            Телепорт
                          </div>
                          <div className="w-5 h-5 bg-green-600/20 rounded flex items-center justify-center group-hover:bg-green-600/30 transition-colors">
                            <Navigation className="w-3 h-3 text-green-400" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Избранные машины */}
            {favoriteVehicles.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-gray-400 mb-3 flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5 text-blue-400" />
                  Машины:
                </h3>
                <div className="space-y-2">
                  {favoriteVehicles.map(vehicleName => (
                    <div
                      key={vehicleName}
                      onClick={() => spawnVehicle(vehicleName)}
                      className="w-full p-3 bg-base-700/50 border border-base-600 rounded-lg hover:bg-base-600/50 hover:border-blue-500/30 transition-all duration-200 cursor-pointer group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <div className="w-8 h-8 bg-blue-600/20 rounded-lg flex items-center justify-center group-hover:bg-blue-600/30 transition-colors">
                            <Car className="w-4 h-4 text-blue-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-white truncate">
                              {vehicleName}
                            </div>
                            <div className="text-xs text-gray-400">
                              Избранный автомобиль
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="text-xs text-gray-500 group-hover:text-blue-400 transition-colors">
                            Заспавнить
                          </div>
                          <div className="w-5 h-5 bg-blue-600/20 rounded flex items-center justify-center group-hover:bg-blue-600/30 transition-colors">
                            <Play className="w-3 h-3 text-blue-400" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

