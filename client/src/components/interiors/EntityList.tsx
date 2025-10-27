/**
 * Entity List Component
 * Отображает список всех entity из YTYP файла, сгруппированных по комнатам
 */

import { useMemo, useState } from 'react'
import { MapPin, FileCode, Package, ChevronDown, ChevronRight, Box, Layers } from 'lucide-react'
import toast from 'react-hot-toast'
import type { YtypEntity } from '@/types/interior'
import { parseYtypEntities, parseYtypRooms, parseYtypPortals, parseYtypEntitySetsWithEntities } from '@/data/interior-mock'

interface EntityListProps {
  ytypXml: string
  onHighlightEntity?: (archetypeName: string) => void
  interiorName?: string
  entitySetMappings?: Record<string, string> // Маппинги hash_***** → realName
}

export function EntityList({ ytypXml, onHighlightEntity, interiorName, entitySetMappings = {} }: EntityListProps) {
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set())
  
  /**
   * Получить отображаемое имя entity set (с учетом маппинга)
   */
  const getEntitySetDisplayName = (name: string): string => {
    // Если это хэш и есть маппинг - показываем реальное имя
    if (name.startsWith('hash_') && entitySetMappings[name]) {
      return entitySetMappings[name]
    }
    return name
  }
  
  // Парсим entity и rooms из YTYP XML
  const entities = useMemo(() => {
    if (!ytypXml) return []
    return parseYtypEntities(ytypXml)
  }, [ytypXml])
  
  const rooms = useMemo(() => {
    if (!ytypXml) return []
    return parseYtypRooms(ytypXml)
  }, [ytypXml])
  
  const portals = useMemo(() => {
    if (!ytypXml) return []
    return parseYtypPortals(ytypXml)
  }, [ytypXml])
  
  const entitySetsData = useMemo(() => {
    if (!ytypXml) return []
    return parseYtypEntitySetsWithEntities(ytypXml)
  }, [ytypXml])
  
  // Группируем entities по комнатам
  const roomsWithEntities = useMemo(() => {
    return rooms.map(room => ({
      ...room,
      entities: room.attachedObjects
        .map(index => entities.find(e => e.index === index))
        .filter((e): e is YtypEntity => e !== undefined)
    }))
  }, [rooms, entities])
  
  // Группируем entities по порталам
  const portalsWithEntities = useMemo(() => {
    return portals.map(portal => ({
      ...portal,
      entities: portal.attachedObjects
        .map(index => entities.find(e => e.index === index))
        .filter((e): e is YtypEntity => e !== undefined)
    }))
  }, [portals, entities])
  
  // Entities без привязки (не в комнатах, порталах и entity sets)
  const entitiesWithoutRoom = useMemo(() => {
    const usedIndices = new Set([
      ...rooms.flatMap(r => r.attachedObjects),
      ...portals.flatMap(p => p.attachedObjects)
    ])
    
    // Также исключаем entities из entity sets (они имеют свои собственные entities, не индексы)
    const entitySetArchetypes = new Set(
      entitySetsData.flatMap(es => es.entities.map(e => e.archetypeName))
    )
    
    return entities.filter(e => 
      e.index !== undefined && 
      !usedIndices.has(e.index) &&
      !entitySetArchetypes.has(e.archetypeName)
    )
  }, [entities, rooms, portals, entitySetsData])
  
  /**
   * Телепорт к entity (в локальных координатах интерьера)
   */
  const handleTeleport = (entity: YtypEntity) => {
    if (typeof window !== 'undefined' && 'alt' in window && (window as any).alt) {
      // Отправляем локальные координаты интерьера
      ;(window as any).alt.emit('meshhub:interior:entity:teleport', {
        interiorName,
        archetypeName: entity.archetypeName,
        localPosition: entity.position // Локальные координаты из YTYP
      })
      toast.success(`Телепорт к ${entity.archetypeName}`)
    } else {
      toast(`Телепорт к ${entity.archetypeName} (мокап)`, { icon: '📍' })
    }
  }
  
  /**
   * Подсветить entity в XML редакторе и проскроллить к нему
   */
  const handleHighlight = (archetypeName: string) => {
    if (onHighlightEntity) {
      // Передаем archetypeName в родительский компонент
      // который установит его как highlightedParam для MonacoEditor
      onHighlightEntity(archetypeName)
    }
  }
  
  /**
   * Переключить раскрытие комнаты
   */
  const toggleRoom = (roomName: string) => {
    setExpandedRooms(prev => {
      const newSet = new Set(prev)
      if (newSet.has(roomName)) {
        newSet.delete(roomName)
      } else {
        newSet.add(roomName)
      }
      return newSet
    })
  }
  
  /**
   * Получить имя комнаты по индексу
   */
  const getRoomName = (roomIndex: number): string => {
    return rooms[roomIndex]?.name || `Room ${roomIndex}`
  }
  
  // Функция рендера entity
  const renderEntity = (entity: YtypEntity, index: number) => (
    <div
      key={`${entity.archetypeName}-${index}`}
      className="bg-base-800/50 border border-base-700 rounded-lg hover:border-base-600 transition-colors p-2"
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-white truncate">
            {entity.archetypeName}
          </div>
          <div className="text-xs text-gray-500">
            LOD: {entity.lodDist?.toFixed(1) || '?'}m
          </div>
        </div>
      </div>
      
      {/* Координаты */}
      <div className="text-xs text-gray-400 mb-2">
        X: {entity.position.x.toFixed(2)}, 
        Y: {entity.position.y.toFixed(2)}, 
        Z: {entity.position.z.toFixed(2)}
      </div>
      
      {/* Кнопки действий */}
      <div className="flex items-center space-x-1">
        {/* Телепорт */}
        <button
          onClick={() => handleTeleport(entity)}
          className="flex-1 flex items-center justify-center space-x-1 px-2 py-1.5 bg-green-600/20 border border-green-500/50 hover:bg-green-600/30 text-green-300 rounded text-xs transition-all"
          title="Телепорт к entity"
        >
          <MapPin className="w-3 h-3" />
          <span>Телепорт</span>
        </button>
        
        {/* Highlight в XML */}
        <button
          onClick={() => handleHighlight(entity.archetypeName)}
          className="flex-1 flex items-center justify-center space-x-1 px-2 py-1.5 bg-blue-600/20 border border-blue-500/50 hover:bg-blue-600/30 text-blue-300 rounded text-xs transition-all"
          title="Подсветить в XML"
        >
          <FileCode className="w-3 h-3" />
          <span>XML</span>
        </button>
      </div>
    </div>
  )
  
  if (!ytypXml || entities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <Package className="w-12 h-12 text-gray-600 mb-3" />
        <div className="text-lg font-semibold text-gray-400 mb-2">
          Нет entity
        </div>
        <div className="text-sm text-gray-500">
          YTYP файл не содержит архетипов или не загружен
        </div>
      </div>
    )
  }
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Package className="w-4 h-4 text-green-400" />
          <div className="text-sm font-semibold text-white">
            Entity ({entities.length}) • Комнат ({rooms.length}) • Порталов ({portals.length}) • Entity Sets ({entitySetsData.length})
          </div>
        </div>
      </div>
      
      {/* Entity List сгруппированный по комнатам */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {/* Секция: Комнаты */}
        {roomsWithEntities.length > 0 && (
          <div className="space-y-2">
            {/* Заголовок секции Комнаты */}
            <div className="flex items-center space-x-2 py-2 px-3 bg-base-800/30 border-l-4 border-yellow-500 rounded">
              <Box className="w-5 h-5 text-yellow-400" />
              <div className="text-base font-bold text-yellow-300">
                Комнаты ({rooms.length})
              </div>
            </div>
            
            {/* Список комнат */}
            {roomsWithEntities.map((room, roomIndex) => {
          const isRoomExpanded = expandedRooms.has(room.name)
          
          return (
            <div
              key={`room-${roomIndex}`}
              className="bg-base-900/50 border border-base-600 rounded-lg overflow-hidden"
            >
              {/* Room Header (Collapsible) */}
              <button
                onClick={() => toggleRoom(room.name)}
                className="w-full flex items-center justify-between p-3 hover:bg-base-800/50 transition-colors text-left"
              >
                <div className="flex items-center space-x-2">
                  <Box className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {room.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {room.entities.length} objects
                    </div>
                  </div>
                </div>
                {isRoomExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                )}
              </button>
              
              {/* Room Entities (Collapsible) */}
              {isRoomExpanded && (
                <div className="p-2 space-y-2 border-t border-base-700">
                  {room.entities.map((entity, idx) => renderEntity(entity, idx))}
                </div>
              )}
            </div>
          )
            })}
          </div>
        )}
        
        {/* Секция: Порталы */}
        {portalsWithEntities.length > 0 && (
          <div className="space-y-2">
            {/* Заголовок секции Порталы */}
            <div className="flex items-center space-x-2 py-2 px-3 bg-base-800/30 border-l-4 border-purple-500 rounded mt-4">
              <div className="text-xl">🚪</div>
              <div className="text-base font-bold text-purple-300">
                Порталы ({portals.length})
              </div>
            </div>
            
            {/* Список порталов */}
            {portalsWithEntities.map((portal, portalIndex) => {
              const portalKey = `portal-${portalIndex}`
              const isPortalExpanded = expandedRooms.has(portalKey)
              
              return (
                <div
                  key={portalKey}
                  className="bg-base-900/50 border border-purple-600/50 rounded-lg overflow-hidden"
                >
                  {/* Portal Header (Collapsible) */}
                  <button
                    onClick={() => toggleRoom(portalKey)}
                    className="w-full flex items-center justify-between p-3 hover:bg-purple-900/20 transition-colors text-left"
                  >
                    <div className="flex items-center space-x-2">
                      <div className="text-lg">🚪</div>
                      <div>
                        <div className="text-sm font-semibold text-purple-300">
                          Portal: {getRoomName(portal.roomFrom)} → {getRoomName(portal.roomTo)}
                        </div>
                        <div className="text-xs text-purple-400">
                          {portal.entities.length} objects
                        </div>
                      </div>
                    </div>
                    {isPortalExpanded ? (
                      <ChevronDown className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    )}
                  </button>
                  
                  {/* Portal Entities (Collapsible) */}
                  {isPortalExpanded && (
                    <div className="p-2 space-y-2 border-t border-purple-700/50">
                      {portal.entities.map((entity, idx) => renderEntity(entity, idx))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
        
        {/* Секция: Entity Sets */}
        {entitySetsData.length > 0 && (
          <div className="space-y-2">
            {/* Заголовок секции Entity Sets */}
            <div className="flex items-center space-x-2 py-2 px-3 bg-base-800/30 border-l-4 border-blue-500 rounded mt-4">
              <Layers className="w-5 h-5 text-blue-400" />
              <div className="text-base font-bold text-blue-300">
                Entity Sets ({entitySetsData.length})
              </div>
            </div>
            
            {/* Список Entity Sets */}
            {entitySetsData.map((entitySet, setIndex) => {
              const setKey = `entityset-${setIndex}`
              const isSetExpanded = expandedRooms.has(setKey)
              const displayName = getEntitySetDisplayName(entitySet.name)
              const isHash = entitySet.name.startsWith('hash_')
              const hasMapp = isHash && entitySetMappings[entitySet.name] !== undefined
              
              return (
                <div
                  key={setKey}
                  className="bg-base-900/50 border border-blue-600/50 rounded-lg overflow-hidden"
                >
                  {/* Entity Set Header (Collapsible) */}
                  <button
                    onClick={() => toggleRoom(setKey)}
                    className="w-full flex items-center justify-between p-3 hover:bg-blue-900/20 transition-colors text-left"
                  >
                    <div className="flex items-center space-x-2">
                      <Layers className="w-4 h-4 text-blue-400 flex-shrink-0" />
                      <div>
                        <div className="text-sm font-semibold text-blue-300">
                          {displayName}
                        </div>
                        {/* Показываем оригинальный хэш если есть маппинг */}
                        {hasMapp && (
                          <div className="text-xs text-gray-600 mt-0.5">
                            {entitySet.name}
                          </div>
                        )}
                        <div className="text-xs text-blue-400">
                          {entitySet.entities.length} objects
                        </div>
                      </div>
                    </div>
                    {isSetExpanded ? (
                      <ChevronDown className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    )}
                  </button>
                  
                  {/* Entity Set Entities (Collapsible) */}
                  {isSetExpanded && (
                    <div className="p-2 space-y-2 border-t border-blue-700/50">
                      {entitySet.entities.map((entity, idx) => renderEntity(entity, idx))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
        
        {/* Секция: Entities без привязки */}
        {entitiesWithoutRoom.length > 0 && (
          <div className="space-y-2">
            {/* Заголовок секции Без привязки */}
            <div className="flex items-center space-x-2 py-2 px-3 bg-base-800/30 border-l-4 border-gray-600 rounded mt-4">
              <Package className="w-5 h-5 text-gray-400" />
              <div className="text-base font-bold text-gray-300">
                Без привязки ({entitiesWithoutRoom.length})
              </div>
            </div>
            
            {/* Список entities */}
            <div className="space-y-2">
              {entitiesWithoutRoom.map((entity, idx) => renderEntity(entity, idx))}
            </div>
          </div>
        )}
      </div>
      
      {/* Info */}
      <div className="mt-3 p-3 bg-base-800 rounded-lg border border-base-700">
        <div className="text-xs text-gray-400">
          💡 Нажмите на комнату чтобы развернуть/свернуть
        </div>
      </div>
    </div>
  )
}

export default EntityList
