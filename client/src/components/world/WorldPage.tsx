/**
 * Страница управления миром и погодой
 * Использует централизованную систему избранного
 */

import { useState } from 'react'
import { Cloud, Sun, Wind, Droplets, Star, Clock } from 'lucide-react'
import TeleportMarkers from './TeleportMarkers'
import { useFavorites } from '@/hooks/useFavorites'
import toast from 'react-hot-toast'

const WorldPage = () => {
  const [currentWeather, setCurrentWeather] = useState('CLEAR')
  const [currentTime, setCurrentTime] = useState('12:00')
  const [timeSpeed, setTimeSpeed] = useState(1)
  
  // Используем централизованный хук избранного
  const { toggle, has } = useFavorites()

  const weatherTypes = [
    { id: 'CLEAR', name: 'Ясно', icon: Sun, color: 'text-yellow-400' },
    { id: 'EXTRASUNNY', name: 'Очень солнечно', icon: Sun, color: 'text-yellow-500' },
    { id: 'CLOUDS', name: 'Облачно', icon: Cloud, color: 'text-gray-400' },
    { id: 'OVERCAST', name: 'Пасмурно', icon: Cloud, color: 'text-gray-500' },
    { id: 'RAIN', name: 'Дождь', icon: Droplets, color: 'text-blue-400' },
    { id: 'CLEARING', name: 'Проясняется', icon: Wind, color: 'text-cyan-400' },
    { id: 'THUNDER', name: 'Гроза', icon: Cloud, color: 'text-purple-400' },
    { id: 'SMOG', name: 'Смог', icon: Cloud, color: 'text-orange-400' },
    { id: 'FOGGY', name: 'Туман', icon: Cloud, color: 'text-gray-300' },
    { id: 'SNOW', name: 'Снег', icon: Droplets, color: 'text-white' },
    { id: 'BLIZZARD', name: 'Метель', icon: Wind, color: 'text-blue-300' },
  ]

  const timePresets = ['06:00', '12:00', '18:00', '21:00', '00:00']
  const timeSpeedPresets = [0, 1, 2, 5, 10]

  /**
   * Изменить погоду
   */
  const handleWeatherChange = (weather: string) => {
    setCurrentWeather(weather)
    console.log(`[WorldPage] Changing weather to: ${weather}`)
    
    if (typeof window !== 'undefined' && 'alt' in window && (window as any).alt) {
      try {
        ;(window as any).alt.emit('world:weather:set', { weather })
        console.log(`[WorldPage] Weather change sent to server: ${weather}`)
      } catch (error) {
        console.error(`[WorldPage] Error sending weather to server:`, error)
      }
    } else {
      console.warn(`[WorldPage] ALT:V not available, weather change not sent`)
    }
  }

  /**
   * Изменить время
   */
  const handleTimeChange = (time: string) => {
    setCurrentTime(time)
    console.log(`[WorldPage] Setting time to: ${time}`)
    
    if (typeof window !== 'undefined' && 'alt' in window && (window as any).alt) {
      try {
        ;(window as any).alt.emit('world:time:set', { time })
        console.log(`[WorldPage] Time change sent to server: ${time}`)
      } catch (error) {
        console.error(`[WorldPage] Error sending time to server:`, error)
      }
    } else {
      console.warn(`[WorldPage] ALT:V not available, time change not sent`)
    }
  }

  /**
   * Изменить скорость времени
   */
  const handleTimeSpeedChange = (speed: number) => {
    setTimeSpeed(speed)
    console.log(`[WorldPage] Setting time speed to: ${speed}`)
    
    if (typeof window !== 'undefined' && 'alt' in window && (window as any).alt) {
      try {
        ;(window as any).alt.emit('world:time:speed', { speed })
        console.log(`[WorldPage] Time speed change sent to server: ${speed}`)
      } catch (error) {
        console.error(`[WorldPage] Error sending time speed to server:`, error)
      }
    } else {
      console.warn(`[WorldPage] ALT:V not available, time speed change not sent`)
    }
  }

  /**
   * Переключить избранное (универсальная функция)
   */
  const toggleFavorite = async (type: 'weather' | 'time' | 'timeSpeed', value: string | number) => {
    try {
      await toggle(type, value)
    } catch (error) {
      console.error(`[WorldPage] Error toggling favorite:`, error)
      toast.error('Ошибка изменения избранного')
    }
  }

  /**
   * Проверить избранное
   */
  const isFavorite = (type: 'weather' | 'time' | 'timeSpeed', value: string | number) => {
    return has(type, value.toString())
  }

  return (
    <div className="flex-1 p-4 sm:p-6">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl lg:text-2xl font-bold text-white mb-2">Мир и Погода</h1>
        <div className="flex items-center space-x-2 text-sm mb-4">
          <div className="px-2 py-1 rounded-full text-xs bg-blue-900 text-blue-300">
            🌍 Мир
          </div>
        </div>
      </div>

      {/* Координаты и телепортация */}
      <TeleportMarkers />

      {/* Погода */}
      <div className="bg-base-800/50 rounded-lg p-3 sm:p-4 border border-base-700 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Cloud className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">Погода</h2>
          </div>
        </div>
        
        <div className="space-y-2">
          {weatherTypes.map((weather) => {
            const Icon = weather.icon
            const isSelected = currentWeather === weather.id
            const isFav = isFavorite('weather', weather.id)
            
            return (
              <div key={weather.id} className="flex items-center justify-between">
                <button
                  onClick={() => handleWeatherChange(weather.id)}
                  className={`flex-1 flex items-center space-x-3 p-2 rounded-lg border transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-900/20'
                      : 'border-base-700 hover:border-base-600 bg-base-700/30'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${weather.color}`} />
                  <span className="text-sm text-white">{weather.name}</span>
                </button>
                <button
                  onClick={() => toggleFavorite('weather', weather.id)}
                  className={`ml-2 p-2 rounded-lg transition-colors ${
                    isFav 
                      ? 'text-yellow-400 hover:text-yellow-300' 
                      : 'text-gray-500 hover:text-yellow-400'
                  }`}
                >
                  <Star className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Время */}
      <div className="bg-base-800/50 rounded-lg p-3 sm:p-4 border border-base-700 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-yellow-400" />
            <h2 className="text-lg font-semibold text-white">Время</h2>
          </div>
        </div>
        
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Текущее время
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="time"
                value={currentTime}
                onChange={(e) => handleTimeChange(e.target.value)}
                className="flex-1 px-3 py-2 bg-base-700 border border-base-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => toggleFavorite('time', currentTime)}
                className={`p-2 rounded-lg transition-colors ${
                  isFavorite('time', currentTime) 
                    ? 'text-yellow-400 hover:text-yellow-300' 
                    : 'text-gray-500 hover:text-yellow-400'
                }`}
              >
                <Star className={`w-4 h-4 ${isFavorite('time', currentTime) ? 'fill-current' : ''}`} />
              </button>
            </div>
            
            {/* Быстрые пресеты времени */}
            <div className="flex flex-wrap gap-2 mt-2">
              {timePresets.map((preset) => (
                <button
                  key={preset}
                  onClick={() => handleTimeChange(preset)}
                  className="px-2 py-1 text-xs bg-base-700 hover:bg-base-600 text-gray-300 rounded border border-base-600"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Скорость времени: {timeSpeed}x
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="range"
                min="0"
                max="10"
                step="0.1"
                value={timeSpeed}
                onChange={(e) => handleTimeSpeedChange(parseFloat(e.target.value))}
                className="flex-1 h-2 bg-base-700 rounded-lg appearance-none cursor-pointer slider"
              />
              <button
                onClick={() => toggleFavorite('timeSpeed', timeSpeed)}
                className={`p-2 rounded-lg transition-colors ${
                  isFavorite('timeSpeed', timeSpeed) 
                    ? 'text-yellow-400 hover:text-yellow-300' 
                    : 'text-gray-500 hover:text-yellow-400'
                }`}
              >
                <Star className={`w-4 h-4 ${isFavorite('timeSpeed', timeSpeed) ? 'fill-current' : ''}`} />
              </button>
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>Остановлено</span>
              <span>10x</span>
            </div>
            
            {/* Быстрые пресеты скорости */}
            <div className="flex flex-wrap gap-2 mt-2">
              {timeSpeedPresets.map((preset) => (
                <button
                  key={preset}
                  onClick={() => handleTimeSpeedChange(preset)}
                  className="px-2 py-1 text-xs bg-base-700 hover:bg-base-600 text-gray-300 rounded border border-base-600"
                >
                  {preset}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #1e40af;
        }
        
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #1e40af;
        }
      `}</style>
    </div>
  )
}

export default WorldPage
