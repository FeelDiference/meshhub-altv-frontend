import { useState, useEffect } from 'react'
import { MapPin, Navigation, Star, Edit2, Check, X, Trash2, Send, Eye, EyeOff, Target } from 'lucide-react'
import { TeleportMarker, Vec3 } from '../../types/world'
import { parseCoordinates, formatCoordinates, isValidGTACoordinates } from '@/utils/parseCoordinates'
import { useFavorites } from '@/hooks/useFavorites'
import toast from 'react-hot-toast'

interface TeleportMarkersProps {
  // Убрали props - теперь используем централизованный хук
}

const TeleportMarkers: React.FC<TeleportMarkersProps> = () => {
  const [currentPosition, setCurrentPosition] = useState<Vec3>({ x: 0, y: 0, z: 0 })
  const [markers, setMarkers] = useState<TeleportMarker[]>([])
  const [editingMarkerId, setEditingMarkerId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [coordsInput, setCoordsInput] = useState('')
  const [viewerEnabled, setViewerEnabled] = useState(false)
  
  // Используем централизованный хук избранного
  const { toggle, has } = useFavorites()

  // Загружаем маркеры при монтировании
  useEffect(() => {
    console.log('[TeleportMarkers] Component mounted, loading markers...')
    
    // Запрашиваем маркеры из Alt:V LocalStorage (приоритет для персистентности)
    if (typeof window !== 'undefined' && 'alt' in window && (window as any).alt) {
      // Обработчик загрузки маркеров из Alt:V
      const handleMarkersLoaded = (data: { markers: TeleportMarker[] }) => {
        if (data.markers && data.markers.length > 0) {
          console.log('[TeleportMarkers] ✅ Loaded from Alt:V LocalStorage:', data.markers.length, 'markers')
          setMarkers(data.markers)
          
          // Синхронизируем с localStorage
          try {
            localStorage.setItem('meshhub_teleport_markers', JSON.stringify(data.markers))
          } catch (e) {
            console.error('[TeleportMarkers] Error syncing to localStorage:', e)
          }
        } else {
          console.log('[TeleportMarkers] No markers in Alt:V LocalStorage, checking localStorage...')
          loadFromLocalStorage()
        }
      }
      
      ;(window as any).alt.on('world:markers:loaded', handleMarkersLoaded)
      ;(window as any).alt.emit('world:markers:load')
      
      // Очищаем обработчик (один раз при загрузке)
      setTimeout(() => {
        ;(window as any).alt.off?.('world:markers:loaded', handleMarkersLoaded)
      }, 2000)
    } else {
      // Браузер - загружаем из localStorage
      loadFromLocalStorage()
    }
  }, [])
  
  // Функция загрузки из localStorage (fallback)
  const loadFromLocalStorage = () => {
    try {
      const stored = localStorage.getItem('meshhub_teleport_markers')
      if (stored) {
        const loadedMarkers = JSON.parse(stored)
        setMarkers(loadedMarkers)
        console.log('[TeleportMarkers] Loaded from localStorage:', loadedMarkers.length, 'markers')
      }
    } catch (error) {
      console.error('[TeleportMarkers] Error loading from localStorage:', error)
    }
  }

  // Запрашиваем начальную позицию и статус viewer при монтировании
  useEffect(() => {
    if (typeof window !== 'undefined' && 'alt' in window && (window as any).alt) {
      ;(window as any).alt.emit('world:position:get')
      // Запрашиваем текущий статус viewer
      ;(window as any).alt.emit('coordinates:viewer:get-status')
    }
  }, [])

  // Обработчик получения позиции от Alt:V
  useEffect(() => {
    if (typeof window !== 'undefined' && 'alt' in window) {
      const handlePositionResponse = (data: { position: Vec3 }) => {
        setCurrentPosition(data.position)
        // Синхронизируем поле ввода с текущими координатами (если не редактируется)
        if (!document.activeElement || document.activeElement.id !== 'coords-input') {
          setCoordsInput(formatCoordinates(data.position, 2))
        }
      }
      
      // Обработчик статуса viewer от Alt:V
      const handleViewerStatus = (data: { enabled: boolean }) => {
        console.log('[TeleportMarkers] Received viewer status:', data.enabled)
        setViewerEnabled(data.enabled)
      }
      
      // Обработчик успешной телепортации к waypoint
      const handleWaypointSuccess = (data: { message: string, position: Vec3 }) => {
        console.log('[TeleportMarkers] Waypoint teleport success:', data)
        toast.success(data.message || 'Телепорт к маркеру выполнен')
      }
      
      // Обработчик ошибки телепортации к waypoint
      const handleWaypointError = (data: { message: string }) => {
        console.log('[TeleportMarkers] Waypoint teleport error:', data)
        toast.error(data.message || 'Ошибка телепортации к маркеру')
      }
      
      ;(window as any).alt.on('world:position:response', handlePositionResponse)
      ;(window as any).alt.on('coordinates:viewer:status', handleViewerStatus)
      ;(window as any).alt.on('world:waypoint:success', handleWaypointSuccess)
      ;(window as any).alt.on('world:waypoint:error', handleWaypointError)
      
      return () => {
        ;(window as any).alt.off?.('world:position:response', handlePositionResponse)
        ;(window as any).alt.off?.('coordinates:viewer:status', handleViewerStatus)
        ;(window as any).alt.off?.('world:waypoint:success', handleWaypointSuccess)
        ;(window as any).alt.off?.('world:waypoint:error', handleWaypointError)
      }
    }
  }, [])

  /**
   * Телепортация по inline введенным координатам
   */
  const handleTeleportToInput = () => {
    const parsed = parseCoordinates(coordsInput)
    
    if (!parsed) {
      toast.error('Некорректный формат координат. Используйте: X, Y, Z')
      return
    }

    if (!isValidGTACoordinates(parsed)) {
      toast.error('Координаты вне границ карты GTA V')
      return
    }

    handleTeleport({ 
      id: 'temp', 
      name: 'Inline', 
      position: parsed, 
      createdAt: new Date().toISOString() 
    })
    
    toast.success(`Телепорт к: ${formatCoordinates(parsed, 2)}`)
  }

  /**
   * Телепортация по маркеру на карте (waypoint)
   */
  const handleTeleportToWaypoint = () => {
    console.log('[TeleportMarkers] 🎯 Teleporting to waypoint')
    
    if (typeof window !== 'undefined' && 'alt' in window && (window as any).alt) {
      try {
        ;(window as any).alt.emit('world:waypoint:teleport')
        console.log('[TeleportMarkers] Waypoint teleport request sent')
      } catch (error) {
        console.error('[TeleportMarkers] Error sending waypoint teleport request:', error)
        toast.error('Ошибка телепортации к маркеру')
      }
    } else {
      console.warn('[TeleportMarkers] ALT:V not available, cannot teleport to waypoint')
      toast.error('ALT:V недоступен')
    }
  }

  const handleSaveMarker = () => {
    console.log('[TeleportMarkers] 💾 handleSaveMarker called')
    console.log('[TeleportMarkers] Current position:', currentPosition)

    // Проверяем что координаты валидны
    if (currentPosition.x === 0 && currentPosition.y === 0 && currentPosition.z === 0) {
      console.warn('[TeleportMarkers] Current position is 0,0,0 - requesting fresh position')
      toast.error('Координаты еще не загружены, попробуйте снова')
      
      // Запрашиваем свежие координаты
      if (typeof window !== 'undefined' && 'alt' in window && (window as any).alt) {
        ;(window as any).alt.emit('world:position:get')
      }
      return
    }

    // Используем координаты как название по умолчанию (пользователь может переименовать)
    const defaultName = formatCoordinates(currentPosition, 2)
    console.log('[TeleportMarkers] Using default name from coordinates:', defaultName)

    const newMarker: TeleportMarker = {
      id: Date.now().toString(),
      name: defaultName,
      position: { ...currentPosition },
      createdAt: new Date().toISOString()
    }

    console.log('[TeleportMarkers] New marker created:', newMarker)

    const updatedMarkers = [...markers, newMarker]
    setMarkers(updatedMarkers)
    
    console.log('[TeleportMarkers] Updated markers array:', updatedMarkers)
    
    // Сохраняем в localStorage
    try {
      localStorage.setItem('meshhub_teleport_markers', JSON.stringify(updatedMarkers))
      console.log('[TeleportMarkers] ✅ Marker saved to localStorage')
    } catch (error) {
      console.error('[TeleportMarkers] ❌ Error saving to localStorage:', error)
    }
    
    // Отправляем на сервер для сохранения в Alt:V LocalStorage (персистентность между перезапусками)
    if (typeof window !== 'undefined' && 'alt' in window && (window as any).alt) {
      try {
        ;(window as any).alt.emit('world:markers:save', { markers: updatedMarkers })
        console.log('[TeleportMarkers] ✅ Markers synced to Alt:V LocalStorage')
        toast.success(`Локация сохранена: ${defaultName}`)
      } catch (error) {
        console.error('[TeleportMarkers] ❌ Error syncing to server:', error)
        toast.error('Ошибка синхронизации с сервером')
      }
    } else {
      // Fallback для браузера
      toast.success(`Локация сохранена: ${defaultName}`)
    }
  }

  const handleTeleport = (marker: TeleportMarker) => {
    console.log('[TeleportMarkers] Teleporting to:', marker.name, marker.position)
    
    if (typeof window !== 'undefined' && 'alt' in window && (window as any).alt) {
      try {
        ;(window as any).alt.emit('world:teleport', { position: marker.position })
        console.log('[TeleportMarkers] Teleport request sent')
      } catch (error) {
        console.error('[TeleportMarkers] Error sending teleport request:', error)
      }
    } else {
      console.warn('[TeleportMarkers] ALT:V not available, cannot teleport')
    }
  }

  const handleDeleteMarker = (markerId: string) => {
    const updatedMarkers = markers.filter(m => m.id !== markerId)
    setMarkers(updatedMarkers)
    
    // Сохраняем в localStorage
    try {
      localStorage.setItem('meshhub_teleport_markers', JSON.stringify(updatedMarkers))
      console.log('[TeleportMarkers] Marker deleted:', markerId)
    } catch (error) {
      console.error('[TeleportMarkers] Error saving after delete:', error)
    }
    
    // Синхронизируем с Alt:V LocalStorage
    if (typeof window !== 'undefined' && 'alt' in window && (window as any).alt) {
      try {
        ;(window as any).alt.emit('world:markers:save', { markers: updatedMarkers })
        console.log('[TeleportMarkers] ✅ Markers synced to Alt:V after delete')
      } catch (error) {
        console.error('[TeleportMarkers] Error syncing markers to server:', error)
      }
    }
    
    toast.success('Локация удалена')
  }

  const startEditing = (marker: TeleportMarker) => {
    setEditingMarkerId(marker.id)
    setEditingName(marker.name)
  }

  const cancelEditing = () => {
    setEditingMarkerId(null)
    setEditingName('')
  }

  const saveEditing = (markerId: string) => {
    if (!editingName.trim()) {
      cancelEditing()
      return
    }

    const updatedMarkers = markers.map(m => 
      m.id === markerId ? { ...m, name: editingName.trim() } : m
    )
    
    setMarkers(updatedMarkers)
    
    // Сохраняем в localStorage
    try {
      localStorage.setItem('meshhub_teleport_markers', JSON.stringify(updatedMarkers))
      console.log('[TeleportMarkers] Marker name updated:', markerId, editingName)
    } catch (error) {
      console.error('[TeleportMarkers] Error saving after edit:', error)
    }
    
    // Синхронизируем с сервером
    if (typeof window !== 'undefined' && 'alt' in window && (window as any).alt) {
      try {
        ;(window as any).alt.emit('world:markers:save', { markers: updatedMarkers })
      } catch (error) {
        console.error('[TeleportMarkers] Error syncing markers to server:', error)
      }
    }

    cancelEditing()
  }

  // Обработчик toggle viewer (управляет отдельным WebView)
  const handleViewerToggle = () => {
    if (typeof window !== 'undefined' && 'alt' in window && (window as any).alt) {
      const newState = !viewerEnabled
      ;(window as any).alt.emit('coordinates:viewer:toggle', { enable: newState })
      
      console.log('[TeleportMarkers] Toggling coordinates viewer to:', newState)
    }
  }

  return (
    <div className="bg-base-800/50 rounded-lg p-3 sm:p-4 border border-base-700 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Navigation className="w-5 h-5 text-green-400" />
          <h2 className="text-base font-semibold text-white">Координаты</h2>
        </div>
      </div>

      {/* Inline координаты с телепортацией */}
      <div className="mb-3">
        <div className="flex items-center space-x-1">
          <input
            id="coords-input"
            type="text"
            value={coordsInput}
            onChange={(e) => setCoordsInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleTeleportToInput()}
            placeholder="X, Y, Z"
            className="flex-1 px-2 py-1.5 bg-base-700 border border-base-600 rounded text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-mono"
          />
          <button
            onClick={handleTeleportToInput}
            className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
            title="Телепорт (Enter)"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Кнопки управления */}
      <div className="space-y-2 mb-3">
        {/* Первый ряд: Сохранить и Toggle координат - адаптивные */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Сохранить локацию */}
          <button
            onClick={() => handleSaveMarker()}
            className="flex items-center justify-center space-x-1 px-2 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium transition-colors"
            title="Сохранить текущую позицию"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Сохранить</span>
          </button>

          {/* Toggle координат */}
          <button
            onClick={handleViewerToggle}
            className={`flex items-center justify-center space-x-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
              viewerEnabled
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-base-700 hover:bg-base-600 text-gray-300'
            }`}
            title={viewerEnabled ? 'Скрыть координаты' : 'Показать координаты'}
          >
            {viewerEnabled ? (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span>Вкл</span>
              </>
            ) : (
              <>
                <EyeOff className="w-3.5 h-3.5" />
                <span>Выкл</span>
              </>
            )}
          </button>
        </div>

        {/* Второй ряд: Телепорт по маркеру */}
        <button
          onClick={handleTeleportToWaypoint}
          className="w-full flex items-center justify-center space-x-1 px-2 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors"
          title="Телепорт к маркеру на карте (waypoint)"
        >
          <Target className="w-3.5 h-3.5" />
          <span>Телепорт по маркеру</span>
        </button>
      </div>

      {/* Список меток - стиль как у погоды */}
      <div className="space-y-2">
        {markers.length === 0 ? (
          <div className="text-center py-4 text-gray-500 text-xs">
            Нет сохраненных локаций
          </div>
        ) : (
          markers.map((marker) => {
            const isEditing = editingMarkerId === marker.id
            const isFav = has('teleportMarker', marker.id)
            
            return (
              <div key={marker.id} className="flex items-center justify-between">
                {/* Основная кнопка локации */}
                <button
                  onClick={() => handleTeleport(marker)}
                  className="flex-1 flex items-center space-x-3 p-2 rounded-lg border transition-all bg-base-700/30 border-base-700 hover:border-base-600"
                >
                  <MapPin className="w-4 h-4 text-green-400" />
                  
                  {isEditing ? (
                    <div className="flex items-center space-x-1 flex-1" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEditing(marker.id)
                          if (e.key === 'Escape') cancelEditing()
                        }}
                        className="flex-1 px-2 py-1 bg-base-700 border border-base-500 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        autoFocus
                      />
                      <button onClick={(e) => { e.stopPropagation(); saveEditing(marker.id); }} className="p-1 text-green-400">
                        <Check className="w-3 h-3" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); cancelEditing(); }} className="p-1 text-red-400">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-between">
                      <span className="text-sm text-white">{marker.name}</span>
                      <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                        <button onClick={(e) => { e.stopPropagation(); startEditing(marker); }} className="p-1 text-gray-400 hover:text-blue-400 transition-colors">
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteMarker(marker.id); }} className="p-1 text-gray-400 hover:text-red-400 transition-colors">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </button>
                
                {/* Кнопка избранного */}
                <button
                  onClick={async () => {
                    await toggle('teleportMarker', marker.id)
                  }}
                  className={`ml-2 p-2 rounded-lg transition-colors ${
                    isFav 
                      ? 'text-yellow-400 hover:text-yellow-300' 
                      : 'text-gray-500 hover:text-yellow-400'
                  }`}
                  title={isFav ? 'Удалить из избранного' : 'Добавить в избранное'}
                >
                  <Star className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default TeleportMarkers

