import React, { useState, useEffect } from 'react'
import { useALTV } from '../../hooks/useALTV'
import { useFavorites } from '../../hooks/useFavorites'
import { getInteriors } from '../../services/interiors'
import { 
  downloadInteriorToLocal, 
  getInstalledInteriorsCached,
  teleportToInterior 
} from '../../services/interiorManager'
import { getAccessToken } from '../../services/auth'
import type { InteriorResource, Interior, InteriorStatus } from '../../types/interior'
import type { FavoriteLocation } from '../../types/favorites'
import toast from 'react-hot-toast'
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
  HardDrive,
  Star
} from 'lucide-react'

export function InteriorsPage() {
  const { isAvailable } = useALTV()
  const [interiors, setInteriors] = useState<InteriorResource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [interiorStatuses, setInteriorStatuses] = useState<Map<string, InteriorStatus>>(new Map())
  const [activeTab] = useState<'hub' | 'gtav' | 'local'>('hub')
  const [expandedInteriors, setExpandedInteriors] = useState<Set<string>>(new Set())
  
  // Используем централизованный хук избранного
  const { toggle, has } = useFavorites()

  useEffect(() => {
    loadInteriors()
  }, [activeTab])

  /**
   * Переключить избранное для локации
   */
  const toggleFavorite = async (locationId: string, locationData?: {name: string, coords: {x: number, y: number, z: number}}) => {
    if (locationData) {
      const location: FavoriteLocation = {
        id: locationId,
        name: locationData.name,
        coords: locationData.coords
      }
      
      await toggle('location', location)
    }
  }

  const loadInteriors = async () => {
    // Загружаем HUB данные только когда пользователь на вкладке HUB
    // LOCAL вкладка работает автономно без backend
    if (activeTab !== 'hub') {
      setLoading(false)
      setError(null)
      return
    }
    
    try {
      setLoading(true)
      setError(null)

      const interiorsData = await getInteriors()
      setInteriors(interiorsData)
      
      console.log('📊 Loaded interiors from backend:', interiorsData.map(i => ({
        id: i.id,
        name: i.name,
        displayName: (i as any).displayName || (i as any).display_name
      })))

      // Получаем список всех установленных интерьеров с кэшем (БЫСТРО!)
      console.log('🔍 Получаем список установленных интерьеров...')
      const installedInteriorIds = await getInstalledInteriorsCached()
      console.log(`✅ Установлено интерьеров: ${installedInteriorIds.length}`)
      console.log('📋 Установленные интерьеры (имена папок):', installedInteriorIds)
      
      // Создаем Set для быстрого поиска
      const installedSet = new Set(installedInteriorIds)
      
      // Устанавливаем статусы для всех интерьеров за одну итерацию
      const statuses = new Map<string, InteriorStatus>()
      for (const interior of interiorsData) {
        // Используем displayName для сравнения (соответствует имени папки)
        const interiorName = (interior as any).displayName || (interior as any).display_name || interior.name
        const isInstalled = installedSet.has(interiorName)
        statuses.set(interior.id, isInstalled ? 'installed' : 'not_installed')
        
        // Детальное логирование для каждого интерьера
        console.log(`[Interior] "${interiorName}" (name: "${interior.name}", ID: ${interior.id.substring(0, 8)}...) - ${isInstalled ? '✅ INSTALLED' : '❌ NOT INSTALLED'}`)/*  */
      }
      setInteriorStatuses(statuses)
      
      // Сортируем: установленные наверх
      const sortedInteriors = [...interiorsData].sort((a, b) => {
        const aStatus = statuses.get(a.id) || 'not_installed'
        const bStatus = statuses.get(b.id) || 'not_installed'
        
        // Installed первыми
        if (aStatus === 'installed' && bStatus !== 'installed') return -1
        if (bStatus === 'installed' && aStatus !== 'installed') return 1
        
        // Для остальных - сортировка по названию
        const aName = (a as any).displayName || (a as any).display_name || a.name
        const bName = (b as any).displayName || (b as any).display_name || b.name
        return aName.localeCompare(bName)
      })
      
      setInteriors(sortedInteriors)
      console.log(`🔄 Sorted: ${sortedInteriors.filter(i => statuses.get(i.id) === 'installed').length} installed on top`)
    } catch (err: any) {
      setError('Сервис временно недоступен. LOCAL вкладка работает автономно.')
      console.error('Ошибка загрузки интерьеров:', err)
      toast.error('Сервис временно недоступен')
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

  const handleCopyCoords = (loc: any, e: React.MouseEvent) => {
    e.stopPropagation()
    const text = `${loc.position.x.toFixed(2)}, ${loc.position.y.toFixed(2)}, ${loc.position.z.toFixed(2)}`
    try {
      navigator.clipboard?.writeText(text)
    } catch {}
  }

  const getPosition = (loc: any): { x: number; y: number; z: number } | null => {
    if (loc && loc.position && Number.isFinite(loc.position.x) && Number.isFinite(loc.position.y) && Number.isFinite(loc.position.z)) {
      return { x: loc.position.x, y: loc.position.y, z: loc.position.z }
    }
    if (
      Number.isFinite(loc?.position_x) &&
      Number.isFinite(loc?.position_y) &&
      Number.isFinite(loc?.position_z)
    ) {
      return { x: Number(loc.position_x), y: Number(loc.position_y), z: Number(loc.position_z) }
    }
    return null
  }

  const getArchetypeName = (loc: any): string => {
    return loc?.archetypeName || loc?.archetype_name || loc?.displayName || loc?.display_name || loc?.name || 'interior'
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
    <div className="flex-1 p-4 sm:p-6">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl lg:text-2xl font-bold text-white mb-2">Интерьеры (MLO)</h1>
        <div className="flex items-center space-x-2 text-sm mb-4">
          <div className={`px-2 py-1 rounded-full text-xs ${
            isAvailable ? 'bg-green-900 text-green-300' : 'bg-orange-900 text-orange-300'
          }`}>
            {isAvailable ? '🎮 ALT:V' : '🌐 Browser'}
          </div>
        </div>
      </div>

      {/* Tabs - HUB (активная), LOCAL (будущее) - кнопка GTAV убрана - адаптивные */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
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
          title="Локальные интерьеры - функция в разработке"
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
        <div className="grid grid-cols-1 gap-2 sm:gap-3 overflow-x-hidden">
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
                  className="p-3 sm:p-4 bg-base-800 border border-base-700 rounded-lg hover:bg-base-700 transition-colors cursor-pointer"
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
                            {(interior as any).displayName || (interior as any).display_name || interior.name}
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
                        <button
                          onClick={(e) => handleDownload(interior, e)}
                          disabled={isInstalling}
                          className={`p-2 rounded border transition-colors ${
                            isInstalling
                              ? 'bg-gray-800/50 border-gray-700 text-gray-500 cursor-not-allowed'
                              : 'text-blue-400 border-base-600 hover:text-blue-300 hover:bg-base-900/30 hover:border-base-500'
                          }`}
                          title={isInstalling ? 'Установка...' : 'Скачать'}
                        >
                          {isInstalling ? (
                            <Loader className="w-4 h-4 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded details - locations list */}
                  {isExpanded && Array.isArray((interior as any).interiors) && (interior as any).interiors.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-base-600">
                      <div className="text-xs font-medium text-gray-400 mb-2">
                        Локации ({(interior as any).interiors.length}):
                      </div>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {(interior as any).interiors
                          .filter((loc: any) => !!getPosition(loc))
                          .map((loc: any) => {
                            const pos = getPosition(loc)!
                            const archetype = getArchetypeName(loc)
                            return (
                          <div
                            key={loc.id}
                            className="flex items-center justify-between p-2 bg-base-900 rounded text-xs hover:bg-base-800 transition-colors"
                          >
                            <div className="flex-1">
                              <div className="text-white font-medium mb-1">
                                {archetype}
                              </div>
                              <div className="text-gray-500 flex items-center space-x-3">
                                <button
                                  onClick={(e) => {
                                    handleCopyCoords({ position: pos }, e)
                                    const coords = `${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)}`
                                    if ((window as any).alt?.emit) {
                                      ;(window as any).alt.emit('meshhub:interior:coords:copy', { coords, interiorId: (interior as any).id, archetypeName: archetype })
                                    }
                                    try { toast.success(`Скопировано: ${coords}`) } catch {}
                                  }}
                                  className="px-1.5 py-0.5 rounded bg-base-800/60 border border-base-700/60 text-gray-300 hover:text-white hover:bg-base-700/60 transition-colors"
                                  title="Скопировать координаты"
                                >
                                  X: {pos.x.toFixed(1)} Y: {pos.y.toFixed(1)} Z: {pos.z.toFixed(1)}
                                </button>
                              </div>
                              {loc.category && (
                                <div className="mt-1">
                                  <span className="px-1.5 py-0.5 bg-blue-900 text-blue-300 text-xs rounded">
                                    {loc.category}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleFavorite(loc.id, {
                                    name: archetype,
                                    coords: pos
                                  })
                                }}
                                className={`p-2 rounded transition-colors ${
                                  has('location', loc.id)
                                    ? 'text-yellow-400 hover:text-yellow-300 hover:bg-yellow-900/20'
                                    : 'text-gray-400 hover:text-yellow-400 hover:bg-yellow-900/10'
                                }`}
                                title={has('location', loc.id) ? 'Удалить из избранного' : 'Добавить в избранное'}
                              >
                                <Star className={`w-4 h-4 ${has('location', loc.id) ? 'fill-current' : ''}`} />
                              </button>
                              {isAvailable && (
                                <button
                                  onClick={(e) => {
                                    const normalized: Interior = {
                                      // @ts-ignore backend id could be missing but we keep for API symmetry
                                      id: loc.id || (interior as any).id,
                                      archetypeName: archetype,
                                      position: pos
                                    } as any
                                    handleTeleport(normalized, e)
                                  }}
                                  className="p-2 text-primary-400 hover:text-primary-300 hover:bg-primary-900/20 rounded transition-colors"
                                  title="Телепортироваться"
                                >
                                  <MapPin className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                            )
                          })}
                      </div>
                    </div>
                  )}

                  {/* Если интерьер не раскрыт, показываем краткую инфу */}
                  {!isExpanded && Array.isArray((interior as any).interiors) && (interior as any).interiors.length > 0 && (
                    <div className="mt-2 text-xs text-gray-500">
                      Нажмите для просмотра {(interior as any).interiors.length} локаций
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
        <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-base-800 rounded-lg">
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

