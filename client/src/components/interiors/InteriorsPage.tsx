import React, { useState, useEffect } from 'react'
import { useALTV } from '../../hooks/useALTV'
import { getInteriors } from '../../services/interiors'
import { 
  checkInteriorExists, 
  downloadInteriorToLocal, 
  // getInteriorStatus,
  teleportToInterior 
} from '../../services/interiorManager'
import { getAccessToken } from '../../services/auth'
import type { InteriorResource, Interior, InteriorStatus } from '../../types/interior'
import { 
  Download, 
  Loader, 
  AlertCircle, 
  MapPin,
  Building2,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Home,
  Cloud,
  Gamepad2,
  HardDrive
} from 'lucide-react'
import { Button } from '../common/Button'

export function InteriorsPage() {
  const { isAvailable } = useALTV()
  const [interiors, setInteriors] = useState<InteriorResource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [interiorStatuses, setInteriorStatuses] = useState<Map<string, InteriorStatus>>(new Map())
  const [activeTab] = useState<'hub' | 'gtav' | 'local'>('hub')
  const [expandedInteriors, setExpandedInteriors] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadInteriors()
  }, [])

  const loadInteriors = async () => {
    try {
      setLoading(true)
      setError(null)

      const interiorsData = await getInteriors()
      setInteriors(interiorsData)

      // Проверяем статус установки для каждого интерьера
      const statuses = new Map<string, InteriorStatus>()
      for (const interior of interiorsData) {
        const isInstalled = await checkInteriorExists(interior)
        statuses.set(interior.id, isInstalled ? 'installed' : 'not_installed')
      }
      setInteriorStatuses(statuses)
    } catch (err: any) {
      setError(err.message)
      console.error('Ошибка загрузки интерьеров:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (interior: InteriorResource, e: React.MouseEvent) => {
    e.stopPropagation()
    
    try {
      setInteriorStatuses(prev => new Map(prev.set(interior.id, 'installing')))
      
      const token = getAccessToken()
      if (!token) {
        throw new Error('Не авторизован')
      }
      
      const result = await downloadInteriorToLocal(interior, token)
      
      if (result.success) {
        setInteriorStatuses(prev => new Map(prev.set(interior.id, 'installed')))
      } else {
        setInteriorStatuses(prev => new Map(prev.set(interior.id, 'error')))
        setError(result.message)
      }
    } catch (err: any) {
      console.error('Ошибка установки интерьера:', err)
      setInteriorStatuses(prev => new Map(prev.set(interior.id, 'not_installed')))
      setError(err.message)
    }
  }

  const handleTeleport = (interior: Interior, e: React.MouseEvent) => {
    e.stopPropagation()
    teleportToInterior(interior)
  }

  const toggleExpanded = (interiorId: string) => {
    setExpandedInteriors(prev => {
      const newSet = new Set(prev)
      if (newSet.has(interiorId)) {
        newSet.delete(interiorId)
      } else {
        newSet.add(interiorId)
      }
      return newSet
    })
  }

  return (
    <div className="flex-1 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Интерьеры (MLO)</h1>
        <div className="flex items-center space-x-2 text-sm">
          <div className={`px-2 py-1 rounded-full text-xs ${
            isAvailable ? 'bg-green-900 text-green-300' : 'bg-orange-900 text-orange-300'
          }`}>
            {isAvailable ? '🎮 ALT:V' : '🌐 Browser'}
          </div>
        </div>
      </div>

      {/* Tabs - точно такой же дизайн как в VehiclesPage и WeaponsPage */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <button
          className={`w-full py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${
            activeTab === 'hub' 
              ? 'bg-primary-600/50 text-white border border-primary-500/30' 
              : 'bg-base-800/50 text-gray-300 hover:bg-base-700/50 border border-base-700/30 hover:border-base-600/50'
          }`}
          onClick={() => {/* setActiveTab('hub') */}}
        >
          <Cloud className="w-4 h-4" />
          <span>HUB</span>
        </button>
        <button
          disabled
          className="w-full py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center space-x-2 bg-base-800/30 text-gray-600 border border-base-700/20 cursor-not-allowed opacity-50"
        >
          <Gamepad2 className="w-4 h-4" />
          <span>GTAV</span>
        </button>
        <button
          disabled
          className="w-full py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center space-x-2 bg-base-800/30 text-gray-600 border border-base-700/20 cursor-not-allowed opacity-50"
        >
          <HardDrive className="w-4 h-4" />
          <span>Local</span>
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader className="w-6 h-6 animate-spin text-primary-400" />
          <span className="ml-2 text-gray-400">Загрузка интерьеров...</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg mb-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span className="text-red-400 text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Content */}
      {!loading && !error && (
        <div className="grid grid-cols-1 gap-3">
          {interiors.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Home className="w-12 h-12 mx-auto mb-3 text-gray-600" />
              <p>Интерьеры не найдены</p>
              <p className="text-xs mt-2">
                Интерьеры автоматически определяются при индексации архивов
              </p>
            </div>
          ) : (
            interiors.map((interior) => {
              const status = interiorStatuses.get(interior.id) || 'not_installed'
              const isInstalled = status === 'installed'
              const isInstalling = status === 'installing'
              const isExpanded = expandedInteriors.has(interior.id)

              return (
                <div 
                  key={interior.id}
                  className="p-4 bg-base-800 border border-base-700 rounded-lg hover:bg-base-700 transition-colors cursor-pointer"
                  onClick={() => toggleExpanded(interior.id)}
                >
                  <div className="flex items-center justify-between">
                    {/* Info */}
                    <div className="flex-1 flex items-center space-x-3">
                      <button 
                        className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleExpanded(interior.id)
                        }}
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>

                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <Building2 className="w-4 h-4 text-primary-400" />
                          <div className="text-sm font-medium text-white">
                            {interior.displayName || interior.name}
                          </div>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">{interior.name}</div>
                        <div className="flex items-center space-x-2 mt-2">
                          <span className="px-2 py-0.5 bg-primary-900 text-primary-300 text-xs rounded">
                            {interior.interiorCount} {interior.interiorCount === 1 ? 'интерьер' : 'интерьеров'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {(interior.size / 1024 / 1024).toFixed(1)} MB
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      {isInstalled ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          <span className="text-xs text-green-400">Установлен</span>
                        </>
                      ) : (
                        <Button
                          onClick={(e) => handleDownload(interior, e)}
                          disabled={isInstalling}
                          variant="primary"
                          size="sm"
                          icon={isInstalling ? <Loader className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                        >
                          {isInstalling ? 'Установка...' : 'Скачать'}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Expanded details - locations list */}
                  {isExpanded && interior.interiors && interior.interiors.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-base-600">
                      <div className="text-xs font-medium text-gray-400 mb-2">
                        Локации ({interior.interiors.length}):
                      </div>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {interior.interiors.map((loc) => (
                          <div
                            key={loc.id}
                            className="flex items-center justify-between p-2 bg-base-900 rounded text-xs hover:bg-base-800 transition-colors"
                          >
                            <div className="flex-1">
                              <div className="text-white font-medium mb-1">
                                {loc.displayName || loc.archetypeName}
                              </div>
                              <div className="text-gray-500 flex items-center space-x-3">
                                <span>
                                  X: {loc.position.x.toFixed(1)}
                                </span>
                                <span>
                                  Y: {loc.position.y.toFixed(1)}
                                </span>
                                <span>
                                  Z: {loc.position.z.toFixed(1)}
                                </span>
                              </div>
                              {loc.category && (
                                <div className="mt-1">
                                  <span className="px-1.5 py-0.5 bg-blue-900 text-blue-300 text-xs rounded">
                                    {loc.category}
                                  </span>
                                </div>
                              )}
                            </div>
                            {isAvailable && isInstalled && (
                              <button
                                onClick={(e) => handleTeleport(loc, e)}
                                className="p-2 text-primary-400 hover:text-primary-300 hover:bg-primary-900/20 rounded transition-colors"
                                title="Телепортироваться"
                              >
                                <MapPin className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Если интерьер не раскрыт, показываем краткую инфу */}
                  {!isExpanded && interior.interiors && interior.interiors.length > 0 && (
                    <div className="mt-2 text-xs text-gray-500">
                      Нажмите для просмотра {interior.interiors.length} локаций
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Footer info */}
      {!loading && interiors.length > 0 && (
        <div className="mt-6 p-4 bg-base-800 rounded-lg">
          <div className="text-xs text-gray-400">
            {isAvailable 
              ? '🎮 Подключено к ALT:V - интерьеры будут установлены в игру' 
              : '🌐 Работает в браузере - используется режим демонстрации'
            }
          </div>
          {isAvailable && (
            <div className="text-xs text-gray-500 mt-2">
              💡 Используйте телепорт для перемещения к интерьерам
            </div>
          )}
        </div>
      )}
    </div>
  )
}

