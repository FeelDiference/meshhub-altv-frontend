import { useState, useEffect } from 'react'
import { MapPin, Navigation, Star, Edit2, Check, X, Trash2, RefreshCw } from 'lucide-react'
import { TeleportMarker, Vec3 } from '../../types/world'

interface TeleportMarkersProps {
  onToggleFavorite: (markerId: string) => void
  isFavorite: (markerId: string) => boolean
}

const TeleportMarkers: React.FC<TeleportMarkersProps> = ({ onToggleFavorite, isFavorite }) => {
  const [currentPosition, setCurrentPosition] = useState<Vec3>({ x: 0, y: 0, z: 0 })
  const [markers, setMarkers] = useState<TeleportMarker[]>([])
  const [newMarkerName, setNewMarkerName] = useState('')
  const [editingMarkerId, setEditingMarkerId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [autoUpdate, setAutoUpdate] = useState(false)

  // Загружаем маркеры из localStorage при монтировании
  useEffect(() => {
    console.log('[TeleportMarkers] Component mounted, loading markers...')
    
    try {
      const stored = localStorage.getItem('meshhub_teleport_markers')
      if (stored) {
        const loadedMarkers = JSON.parse(stored)
        setMarkers(loadedMarkers)
        console.log('[TeleportMarkers] Loaded markers:', loadedMarkers.length, 'markers')
      }
    } catch (error) {
      console.error('[TeleportMarkers] Error loading markers:', error)
    }
    
    // Запрашиваем текущую позицию игрока один раз при монтировании
    requestPlayerPosition()
  }, [])

  // Автообновление координат (только если включено)
  useEffect(() => {
    if (!autoUpdate) return

    const interval = setInterval(() => {
      requestPlayerPosition()
    }, 2000)
    
    return () => clearInterval(interval)
  }, [autoUpdate])

  // Обработчик получения позиции от Alt:V
  useEffect(() => {
    if (typeof window !== 'undefined' && 'alt' in window) {
      const handlePositionResponse = (data: { position: Vec3 }) => {
        // Убираем логирование для оптимизации
        setCurrentPosition(data.position)
      }
      
      ;(window as any).alt.on('world:position:response', handlePositionResponse)
      
      return () => {
        ;(window as any).alt.off?.('world:position:response', handlePositionResponse)
      }
    }
  }, [])

  const requestPlayerPosition = () => {
    if (typeof window !== 'undefined' && 'alt' in window && (window as any).alt) {
      try {
        ;(window as any).alt.emit('world:position:get')
      } catch (error) {
        console.error('[TeleportMarkers] Error requesting position:', error)
      }
    }
  }

  const handleSaveMarker = () => {
    if (!newMarkerName.trim()) {
      console.warn('[TeleportMarkers] Marker name is empty')
      return
    }

    const newMarker: TeleportMarker = {
      id: Date.now().toString(),
      name: newMarkerName.trim(),
      position: { ...currentPosition },
      createdAt: new Date().toISOString()
    }

    const updatedMarkers = [...markers, newMarker]
    setMarkers(updatedMarkers)
    
    // Сохраняем в localStorage
    try {
      localStorage.setItem('meshhub_teleport_markers', JSON.stringify(updatedMarkers))
      console.log('[TeleportMarkers] Marker saved:', newMarker)
    } catch (error) {
      console.error('[TeleportMarkers] Error saving marker:', error)
    }
    
    // Также отправляем на сервер для синхронизации
    if (typeof window !== 'undefined' && 'alt' in window && (window as any).alt) {
      try {
        ;(window as any).alt.emit('world:markers:save', { markers: updatedMarkers })
      } catch (error) {
        console.error('[TeleportMarkers] Error syncing markers to server:', error)
      }
    }

    setNewMarkerName('')
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
    
    // Синхронизируем с сервером
    if (typeof window !== 'undefined' && 'alt' in window && (window as any).alt) {
      try {
        ;(window as any).alt.emit('world:markers:save', { markers: updatedMarkers })
      } catch (error) {
        console.error('[TeleportMarkers] Error syncing markers to server:', error)
      }
    }
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

  const formatCoordinate = (value: number) => value.toFixed(2)

  return (
    <div className="bg-base-800/50 rounded-lg p-4 border border-base-700 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Navigation className="w-5 h-5 text-green-400" />
          <h2 className="text-lg font-semibold text-white">Телепортация</h2>
        </div>
      </div>

      {/* Текущие координаты */}
      <div className="mb-4 p-3 bg-base-700/50 rounded-lg border border-base-600">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs text-gray-400">Текущие координаты</div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => requestPlayerPosition()}
              className="p-1 rounded hover:bg-base-600 text-gray-400 hover:text-blue-400 transition-colors"
              title="Обновить координаты"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setAutoUpdate(!autoUpdate)}
              className={`px-2 py-0.5 rounded text-xs transition-colors ${
                autoUpdate 
                  ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30' 
                  : 'bg-base-600 text-gray-400 hover:bg-base-500'
              }`}
              title={autoUpdate ? 'Отключить автообновление' : 'Включить автообновление'}
            >
              {autoUpdate ? 'Авто' : 'Ручн.'}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-sm font-mono">
          <div>
            <span className="text-red-400">X:</span>{' '}
            <span className="text-white">{formatCoordinate(currentPosition.x)}</span>
          </div>
          <div>
            <span className="text-green-400">Y:</span>{' '}
            <span className="text-white">{formatCoordinate(currentPosition.y)}</span>
          </div>
          <div>
            <span className="text-blue-400">Z:</span>{' '}
            <span className="text-white">{formatCoordinate(currentPosition.z)}</span>
          </div>
        </div>
      </div>

      {/* Создание новой метки */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Сохранить текущую позицию
        </label>
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={newMarkerName}
            onChange={(e) => setNewMarkerName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveMarker()}
            placeholder="Название метки..."
            className="flex-1 px-3 py-2 bg-base-700 border border-base-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
          />
          <button
            onClick={handleSaveMarker}
            disabled={!newMarkerName.trim()}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium"
          >
            Сохранить
          </button>
        </div>
      </div>

      {/* Список меток */}
      <div className="space-y-2">
        <div className="text-sm font-medium text-gray-300 mb-2">
          Сохраненные метки ({markers.length})
        </div>
        
        {markers.length === 0 ? (
          <div className="text-center py-6 text-gray-500 text-sm">
            У вас пока нет сохраненных меток
          </div>
        ) : (
          markers.map((marker) => {
            const isFav = isFavorite(marker.id)
            const isEditing = editingMarkerId === marker.id
            
            return (
              <div 
                key={marker.id} 
                className="p-3 bg-base-700/30 border border-base-600 rounded-lg hover:border-base-500 transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEditing(marker.id)
                            if (e.key === 'Escape') cancelEditing()
                          }}
                          className="flex-1 px-2 py-1 bg-base-700 border border-base-500 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                        <button
                          onClick={() => saveEditing(marker.id)}
                          className="p-1 text-green-400 hover:text-green-300 transition-colors"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="p-1 text-red-400 hover:text-red-300 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-green-400 flex-shrink-0" />
                        <span className="text-white font-medium text-sm truncate">
                          {marker.name}
                        </span>
                        <button
                          onClick={() => startEditing(marker)}
                          className="p-1 text-gray-400 hover:text-blue-400 transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-1 ml-2">
                    <button
                      onClick={() => onToggleFavorite(marker.id)}
                      className={`p-1.5 rounded transition-colors ${
                        isFav 
                          ? 'text-yellow-400 hover:text-yellow-300' 
                          : 'text-gray-500 hover:text-yellow-400'
                      }`}
                      title={isFav ? 'Удалить из избранного' : 'Добавить в избранное'}
                    >
                      <Star className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
                    </button>
                    <button
                      onClick={() => handleDeleteMarker(marker.id)}
                      className="p-1.5 rounded text-gray-500 hover:text-red-400 transition-colors"
                      title="Удалить метку"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {/* Координаты метки */}
                <div className="grid grid-cols-3 gap-2 mb-2 text-xs font-mono">
                  <div className="text-gray-400">
                    <span className="text-red-400">X:</span> {formatCoordinate(marker.position.x)}
                  </div>
                  <div className="text-gray-400">
                    <span className="text-green-400">Y:</span> {formatCoordinate(marker.position.y)}
                  </div>
                  <div className="text-gray-400">
                    <span className="text-blue-400">Z:</span> {formatCoordinate(marker.position.z)}
                  </div>
                </div>
                
                {/* Кнопка телепорта */}
                <button
                  onClick={() => handleTeleport(marker)}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium flex items-center justify-center space-x-2"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Телепортироваться</span>
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

