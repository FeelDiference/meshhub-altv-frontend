/**
 * Dashboard - главная страница с избранным
 * Использует централизованную систему избранного
 */

import { Heart } from 'lucide-react'
import toast from 'react-hot-toast'
import { useFavorites } from '@/hooks/useFavorites'
import { FavoriteSection } from '@/components/common/FavoriteSection'
import { 
  FAVORITE_CONFIGS, 
  VEHICLE_ACTION_CONFIGS 
} from '@/config/favorites'
import type { FavoriteLocation, FavoriteTeleportMarker } from '@/types/favorites'

/**
 * Компонент Dashboard
 */
export const Dashboard = () => {
  const {
    state,
    favoriteLocations,
    favoriteTeleportMarkers,
    isLoading,
    hasFavorites,
    remove,
    updateLocationName
  } = useFavorites()

  console.log('[Dashboard] State:', {
    weather: state.weather.length,
    time: state.time.length,
    timeSpeed: state.timeSpeed.length,
    vehicles: state.vehicles.length,
    vehicleActions: state.vehicleActions.length,
    locations: favoriteLocations.length,
    teleportMarkers: favoriteTeleportMarkers.length,
    isLoading
  })

  // ========================================================================
  // Обработчики действий
  // ========================================================================

  /**
   * Применить погоду
   */
  const applyWeather = (weather: string) => {
    if (typeof window !== 'undefined' && 'alt' in window && (window as any).alt) {
      try {
        ;(window as any).alt.emit('world:weather:set', { weather })
        toast.success(`Погода изменена на ${weather}`)
      } catch (error) {
        console.error('[Dashboard] Error applying weather:', error)
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
      } catch (error) {
        console.error('[Dashboard] Error applying time:', error)
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
      } catch (error) {
        console.error('[Dashboard] Error applying time speed:', error)
        toast.error('Ошибка изменения скорости времени')
      }
    }
  }

  /**
   * Телепортироваться к локации
   */
  const teleportToLocation = (location: FavoriteLocation) => {
    if (typeof window !== 'undefined' && 'alt' in window && (window as any).alt) {
      try {
        ;(window as any).alt.emit('meshhub:interior:teleport', {
          interiorId: location.id,
          archetypeName: location.name,
          position: location.coords
        })
        toast.success(`Телепорт к ${location.name}`)
      } catch (error) {
        console.error('[Dashboard] Error teleporting:', error)
        toast.error('Ошибка телепортации')
      }
    }
  }

  /**
   * Телепортироваться к маркеру
   */
  const teleportToMarker = (marker: FavoriteTeleportMarker) => {
    if (typeof window !== 'undefined' && 'alt' in window && (window as any).alt) {
      try {
        ;(window as any).alt.emit('world:teleport', { position: marker.position })
        toast.success(`Телепорт: ${marker.name}`)
      } catch (error) {
        console.error('[Dashboard] Error teleporting to marker:', error)
        toast.error('Ошибка телепортации')
      }
    }
  }

  /**
   * Заспавнить машину
   */
  const spawnVehicle = (vehicleName: string) => {
    if (typeof window !== 'undefined' && 'alt' in window && (window as any).alt) {
      try {
        ;(window as any).alt.emit('vehicle:spawn', { modelName: vehicleName })
        toast.success(`Заспавнен ${vehicleName}`)
      } catch (error) {
        console.error('[Dashboard] Error spawning vehicle:', error)
        toast.error('Ошибка спавна машины')
      }
    }
  }
  
  /**
   * Выполнить действие с автомобилем
   */
  const executeVehicleAction = (actionId: string) => {
    if (typeof window !== 'undefined' && 'alt' in window && (window as any).alt) {
      try {
        // Специальная обработка для спидометра
        if (actionId === 'speedometer_toggle') {
          ;(window as any).alt.emit('speedometer:toggle')
          toast.success('Спидометр переключен')
          return
        }
        
        // Специальная обработка для телепорта на трассу
        if (actionId === 'teleport_to_location') {
          ;(window as any).alt.emit('speedtest:teleport:track')
          toast.success('Телепорт на старт трассы...')
          return
        }
        
        // Остальные действия
        ;(window as any).alt.emit('vehicle:action', { action: actionId })
        
        const actionConfig = VEHICLE_ACTION_CONFIGS.find(a => a.id === actionId)
        toast.success(`Выполнено: ${actionConfig?.label || actionId}`)
      } catch (error) {
        console.error('[Dashboard] Error executing action:', error)
        toast.error('Ошибка выполнения действия')
      }
    }
  }

  /**
   * Обработчик удаления с toast
   */
  const handleRemove = async (type: string, item: any) => {
    await remove(type as any, FAVORITE_CONFIGS[type as keyof typeof FAVORITE_CONFIGS].getId(item))
    toast.success('Удалено из избранного')
  }

  /**
   * Обработчик редактирования локации
   */
  const handleEditLocation = async (location: FavoriteLocation, newName: string) => {
    await updateLocationName(location.id, newName)
  }

  // ========================================================================
  // Render
  // ========================================================================

  return (
    <div className="flex-1 p-4 sm:p-6">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl lg:text-2xl font-bold text-white mb-2">Добро пожаловать!</h1>
        <p className="text-gray-400">Выберите модуль из меню слева</p>
      </div>
      
      {/* Секция избранного */}
      <div className="bg-base-800/50 rounded-lg p-3 sm:p-4 border border-base-700">
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <Heart className="w-4 sm:w-5 h-4 sm:h-5 text-red-400" />
          <h2 className="text-base lg:text-lg font-semibold text-white">Избранное - Быстрые действия</h2>
        </div>
        
        {/* Загрузка */}
        {isLoading ? (
          <div className="flex items-center justify-center h-32 bg-base-700/30 rounded-lg border border-base-700/50">
            <div className="text-center text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-2"></div>
              <p className="text-sm">Загрузка избранного...</p>
            </div>
          </div>
        ) : !hasFavorites ? (
          /* Пустое состояние */
          <div className="flex items-center justify-center h-32 bg-base-700/30 rounded-lg border border-base-700/50">
            <div className="text-center text-gray-500">
              <Heart className="w-8 h-8 mx-auto mb-2 text-gray-600" />
              <p className="text-sm">Пока ничего нет в избранном.</p>
              <p className="text-xs text-gray-600 mt-1">
                Добавляйте настройки погоды, времени и действия в избранное для быстрого доступа.
              </p>
            </div>
          </div>
        ) : (
          /* Список избранного */
          <div className="space-y-3">
            {/* Погода */}
            {state.weather.length > 0 && (
              <FavoriteSection
                title={FAVORITE_CONFIGS.weather.sectionTitle}
                icon={FAVORITE_CONFIGS.weather.icon}
                iconColor={FAVORITE_CONFIGS.weather.color}
                items={state.weather}
                config={FAVORITE_CONFIGS.weather}
                onExecute={applyWeather}
                onRemove={(weather) => handleRemove('weather', weather)}
              />
            )}
            
            {/* Время */}
            {state.time.length > 0 && (
              <FavoriteSection
                title={FAVORITE_CONFIGS.time.sectionTitle}
                icon={FAVORITE_CONFIGS.time.icon}
                iconColor={FAVORITE_CONFIGS.time.color}
                items={state.time}
                config={FAVORITE_CONFIGS.time}
                onExecute={applyTime}
                onRemove={(time) => handleRemove('time', time)}
              />
            )}
            
            {/* Скорость времени */}
            {state.timeSpeed.length > 0 && (
              <FavoriteSection
                title={FAVORITE_CONFIGS.timeSpeed.sectionTitle}
                icon={FAVORITE_CONFIGS.timeSpeed.icon}
                iconColor={FAVORITE_CONFIGS.timeSpeed.color}
                items={state.timeSpeed}
                config={FAVORITE_CONFIGS.timeSpeed}
                onExecute={applyTimeSpeed}
                onRemove={(speed) => handleRemove('timeSpeed', speed)}
              />
            )}
            
            {/* Локации интерьеров */}
            {favoriteLocations.length > 0 && (
              <FavoriteSection
                title={FAVORITE_CONFIGS.location.sectionTitle}
                icon={FAVORITE_CONFIGS.location.icon}
                iconColor={FAVORITE_CONFIGS.location.color}
                items={favoriteLocations}
                config={FAVORITE_CONFIGS.location}
                onExecute={teleportToLocation}
                onRemove={(location) => handleRemove('location', location)}
                onEdit={handleEditLocation}
                canEdit={true}
              />
            )}
            
            {/* Маркеры телепортации */}
            {favoriteTeleportMarkers.length > 0 && (
              <FavoriteSection
                title={FAVORITE_CONFIGS.teleportMarker.sectionTitle}
                icon={FAVORITE_CONFIGS.teleportMarker.icon}
                iconColor={FAVORITE_CONFIGS.teleportMarker.color}
                items={favoriteTeleportMarkers}
                config={FAVORITE_CONFIGS.teleportMarker}
                onExecute={teleportToMarker}
                onRemove={(marker) => handleRemove('teleportMarker', marker)}
              />
            )}
            
            {/* Автомобили */}
            {state.vehicles.length > 0 && (
              <FavoriteSection
                title={FAVORITE_CONFIGS.vehicle.sectionTitle}
                icon={FAVORITE_CONFIGS.vehicle.icon}
                iconColor={FAVORITE_CONFIGS.vehicle.color}
                items={state.vehicles}
                config={FAVORITE_CONFIGS.vehicle}
                onExecute={spawnVehicle}
                onRemove={(vehicle) => handleRemove('vehicle', vehicle)}
              />
            )}
            
            {/* Действия с автомобилем */}
            {state.vehicleActions.length > 0 && (
              <FavoriteSection
                title={FAVORITE_CONFIGS.vehicleAction.sectionTitle}
                icon={FAVORITE_CONFIGS.vehicleAction.icon}
                iconColor={FAVORITE_CONFIGS.vehicleAction.color}
                items={state.vehicleActions}
                config={FAVORITE_CONFIGS.vehicleAction}
                onExecute={executeVehicleAction}
                onRemove={(actionId) => handleRemove('vehicleAction', actionId)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard
