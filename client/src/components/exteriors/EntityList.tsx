/**
 * Список entities из YMAP файла
 * Простой вариант для экстерьеров
 */

import { useState } from 'react'
import { MapPin, Copy, Search, Layers } from 'lucide-react'
import { Button } from '@/components/common/Button'
import type { ExteriorEntity } from '@/types/exterior'

interface EntityListProps {
  entities: ExteriorEntity[]
  onTeleport: (entity: ExteriorEntity) => void
  onCopyCoordinates: (entity: ExteriorEntity) => void
  title?: string
}

export default function EntityList({ 
  entities, 
  onTeleport, 
  onCopyCoordinates,
  title = 'Entities'
}: EntityListProps) {
  const [searchQuery, setSearchQuery] = useState('')

  // Группируем entities по LOD level
  const groupedByLOD = entities.reduce((acc, entity) => {
    const lod = entity.lod_level || 'orphanhd'
    if (!acc[lod]) {
      acc[lod] = []
    }
    acc[lod].push(entity)
    return acc
  }, {} as Record<string, ExteriorEntity[]>)

  // Фильтруем по поиску
  const filteredGroups = Object.entries(groupedByLOD).reduce((acc, [lod, list]) => {
    const filtered = list.filter(entity =>
      entity.archetype_name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    if (filtered.length > 0) {
      acc[lod] = filtered
    }
    return acc
  }, {} as Record<string, ExteriorEntity[]>)

  const totalFiltered = Object.values(filteredGroups).reduce((sum, list) => sum + list.length, 0)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white mb-2">{title}</h2>
        <div className="text-sm text-gray-400">
          {totalFiltered} из {entities.length} entities
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Поиск по archetype..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-base-800 border border-base-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500"
        />
      </div>

      {/* Entities List */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {Object.entries(filteredGroups).map(([lod, list]) => (
          <div key={lod} className="space-y-2">
            {/* LOD Level Header */}
            <div className="flex items-center space-x-2 text-xs font-medium text-gray-400 sticky top-0 bg-base-900 py-1 z-10">
              <Layers className="w-3 h-3" />
              <span>{lod.toUpperCase()}</span>
              <span className="text-gray-600">({list.length})</span>
            </div>

            {/* Entities in this LOD */}
            {list.map((entity, idx) => (
              <div
                key={`${entity.archetype_name}-${idx}`}
                className="p-3 bg-base-800 border border-base-600 rounded-lg hover:border-base-500 transition-colors"
              >
                {/* Archetype Name */}
                <div className="text-sm font-medium text-white mb-2 break-words">
                  {entity.archetype_name}
                </div>

                {/* Coordinates */}
                <div className="flex items-center space-x-2 text-xs text-gray-400 mb-2">
                  <MapPin className="w-3 h-3" />
                  <span>
                    X: {entity.x.toFixed(2)}, Y: {entity.y.toFixed(2)}, Z: {entity.z.toFixed(2)}
                  </span>
                </div>

                {/* LOD Distance */}
                <div className="text-xs text-gray-500 mb-3">
                  LOD Distance: {entity.lod_dist.toFixed(1)}
                </div>

                {/* Actions */}
                <div className="flex space-x-2">
                  <Button
                    onClick={() => onTeleport(entity)}
                    variant="secondary"
                    className="flex-1 text-xs py-1.5"
                  >
                    <MapPin className="w-3 h-3 mr-1" />
                    Телепорт
                  </Button>
                  <Button
                    onClick={() => onCopyCoordinates(entity)}
                    variant="secondary"
                    className="flex-1 text-xs py-1.5"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Копировать
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ))}

        {totalFiltered === 0 && (
          <div className="p-4 text-center text-gray-500 text-xs">
            {searchQuery ? 'Ничего не найдено' : 'Entities не найдены'}
          </div>
        )}
      </div>
    </div>
  )
}
