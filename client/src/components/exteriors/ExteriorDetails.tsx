/**
 * Компонент деталей экстерьера - список YMAP файлов
 * Идентичен InteriorDetails по структуре
 */

import { Download, FileText, MapPin, Layers } from 'lucide-react'
import { Button } from '@/components/common/Button'
import type { ExteriorResource, YmapFileInfo } from '@/types/exterior'
import { getResourceName } from '@/services/exteriorManager'

interface ExteriorDetailsProps {
  resource: ExteriorResource
  ymapFiles: YmapFileInfo[]
  selectedYmap: YmapFileInfo | null
  onYmapSelect: (ymap: YmapFileInfo) => void
  onDownloadArchive: () => void
  loading: boolean
}

export default function ExteriorDetails({
  resource,
  ymapFiles,
  selectedYmap,
  onYmapSelect,
  onDownloadArchive,
  loading
}: ExteriorDetailsProps) {
  const resourceName = getResourceName(resource.path, resource.parent_path)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white mb-2">Детали экстерьера</h2>
        <div className="text-sm text-gray-400 break-words">{resourceName}</div>
      </div>

      {/* Archive Info */}
      <div className="mb-4 p-3 bg-base-800 rounded-lg space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">Архив:</span>
          <span className="text-white font-medium">{resource.name}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">Размер:</span>
          <span className="text-white">{(resource.size / 1024 / 1024).toFixed(1)} MB</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">YMAP файлов:</span>
          <span className="text-blue-400 font-medium">{ymapFiles.length}</span>
        </div>
      </div>

      {/* Download Archive */}
      <Button
        onClick={onDownloadArchive}
        variant="secondary"
        className="w-full mb-4 flex items-center justify-center space-x-2"
      >
        <Download className="w-4 h-4" />
        <span>Скачать архив</span>
      </Button>

      {/* YMAP Files List */}
      <div className="flex-1 overflow-y-auto space-y-2">
        <div className="text-xs font-medium text-gray-400 mb-2">
          <FileText className="inline w-3 h-3 mr-1" />
          YMAP файлы
        </div>

        {ymapFiles.map((ymap) => {
          const isSelected = selectedYmap?.file_id === ymap.file_id
          const entityCount = ymap.entities?.length || 0

          return (
            <div
              key={ymap.file_id}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                isSelected
                  ? 'border-blue-500/60 bg-blue-900/20'
                  : 'border-base-600 bg-base-800 hover:border-base-500 hover:bg-base-700'
              }`}
              onClick={() => onYmapSelect(ymap)}
            >
              {/* File Name */}
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-white truncate flex-1">
                  {ymap.file_name}
                </div>
                {isSelected && (
                  <div className="ml-2 w-2 h-2 rounded-full bg-blue-500" />
                )}
              </div>

              {/* Entity Count */}
              <div className="flex items-center space-x-1 text-xs text-gray-400">
                <Layers className="w-3 h-3" />
                <span>{entityCount} entities</span>
              </div>

              {/* Convex Hull Info (если есть) */}
              {ymap.convex_hull && ymap.convex_hull.length > 0 && (
                <div className="mt-2 pt-2 border-t border-base-600 flex items-center space-x-1 text-xs text-gray-500">
                  <MapPin className="w-3 h-3" />
                  <span>{ymap.convex_hull.length} точек области</span>
                </div>
              )}
            </div>
          )
        })}

        {ymapFiles.length === 0 && !loading && (
          <div className="p-4 text-center text-gray-500 text-xs">
            YMAP файлы не найдены
          </div>
        )}

        {loading && (
          <div className="p-4 text-center text-gray-400 text-xs">
            Загрузка...
          </div>
        )}
      </div>
    </div>
  )
}
