/**
 * Страница управления экстерьерами (YMAP файлы)
 * Структура ИДЕНТИЧНА InteriorsPage
 */

import React, { useState, useEffect } from 'react'
import { useALTV } from '@/hooks/useALTV'
import { getExteriors, getExteriorDetails, downloadExterior } from '@/services/exteriors'
import { teleportToEntity, copyEntityCoordinates, getResourceName } from '@/services/exteriorManager'
import { API_BASE_URL } from '@/config/api'
import { getAccessToken } from '@/services/auth'
import type { 
  ExteriorResource, 
  YmapFileInfo, 
  ExteriorEntity
} from '@/types/exterior'
import toast from 'react-hot-toast'
import {
  Loader,
  AlertCircle,
  Map as MapIcon,
  ChevronDown,
  ChevronRight,
  Download,
  Cloud,
  HardDrive
} from 'lucide-react'
import Portal from '@/components/common/Portal'
import ExteriorDetails from '@/components/exteriors/ExteriorDetails'
import YmapEditor from '@/components/interiors/YmapEditor'
import EntityList from '@/components/exteriors/EntityList'

export function ExteriorsPage() {
  const { isAvailable } = useALTV()
  const [archives, setArchives] = useState<ExteriorResource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedArchives, setExpandedArchives] = useState<Set<string>>(new Set())
  const [activeTab] = useState<'hub' | 'local'>('hub')

  // ============================================================================
  // State для правых панелей (как в InteriorsPage)
  // ============================================================================

  const [selectedArchive, setSelectedArchive] = useState<ExteriorResource | null>(null)
  const [selectedYmap, setSelectedYmap] = useState<YmapFileInfo | null>(null)
  const [ymapFiles, setYmapFiles] = useState<YmapFileInfo[]>([])
  const [panelsVisible, setPanelsVisible] = useState(false)
  const [focusMode] = useState<'off' | 'details' | 'editor'>('off')

  // XML данные для редактора
  const [ymapXml, setYmapXml] = useState<string>('')
  const [ymapLoading, setYmapLoading] = useState(false)

  // Entities из выбранного YMAP
  const [entities, setEntities] = useState<ExteriorEntity[]>([])

  // Кэш загруженных деталей архивов (archiveId -> ArchiveYmapEntitiesResponse)
  const [archiveDetailsCache, setArchiveDetailsCache] = useState<Map<string, YmapFileInfo[]>>(new Map())
  const [loadingArchiveDetails, setLoadingArchiveDetails] = useState<Set<string>>(new Set())

  // Ref для заголовка панелей
  const headerRef = React.useRef<HTMLDivElement>(null)

  // ============================================================================
  // Синхронизация focusMode с глобальной переменной
  // ============================================================================

  useEffect(() => {
    if (typeof window !== 'undefined') {
      ;(window as any).__focusMode = focusMode
    }
  }, [focusMode])

  // ============================================================================
  // Динамический расчет ширины заголовка
  // ============================================================================

  useEffect(() => {
    if (!headerRef.current || !panelsVisible) return

    const updateHeaderWidth = () => {
      const panels = document.querySelectorAll('[data-exterior-panel-type]')
      if (panels.length === 0) return

      let totalWidth = 0
      panels.forEach((panel) => {
        totalWidth += panel.getBoundingClientRect().width
      })

      const gaps = (panels.length - 1) * 12
      totalWidth += gaps

      if (headerRef.current) {
        headerRef.current.style.width = `${totalWidth}px`
      }
    }

    const timeout = setTimeout(updateHeaderWidth, 100)
    window.addEventListener('resize', updateHeaderWidth)

    return () => {
      clearTimeout(timeout)
      window.removeEventListener('resize', updateHeaderWidth)
    }
  }, [panelsVisible, selectedArchive, selectedYmap])

  // ============================================================================
  // Загрузка списка архивов
  // ============================================================================

  useEffect(() => {
    loadArchives()
  }, [activeTab])

  /**
   * Загрузка списка архивов (БЕЗ деталей - быстро!)
   */
  const loadArchives = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await getExteriors()
      
      setArchives(response.archives)
      console.log('[ExteriorsPage] Loaded archives:', response.total)
    } catch (err: any) {
      console.error('[ExteriorsPage] Failed to load archives:', err)
      setError(err.message || 'Не удалось загрузить список архивов')
      toast.error('Ошибка загрузки архивов')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Ленивая загрузка деталей архива с кэшированием
   */
  const loadArchiveDetails = async (archiveId: string): Promise<YmapFileInfo[]> => {
    // Проверяем кэш
    const cached = archiveDetailsCache.get(archiveId)
    if (cached) {
      console.log('[ExteriorsPage] Using cached details for:', archiveId)
      return cached
    }

    // Проверяем не загружается ли уже
    if (loadingArchiveDetails.has(archiveId)) {
      console.log('[ExteriorsPage] Already loading:', archiveId)
      return []
    }

    try {
      // Помечаем как загружающийся
      setLoadingArchiveDetails(prev => new Set(prev).add(archiveId))
      
      console.log('[ExteriorsPage] Loading details for:', archiveId)
      const details = await getExteriorDetails(archiveId)
      
      console.log('[ExteriorsPage] Received details:')
      console.log('  - ymap_files count:', details.ymap_files.length)
      if (details.ymap_files.length > 0) {
        console.log('  - First YMAP:', JSON.stringify(details.ymap_files[0], null, 2))
      }
      console.log('  - archive_path from response:', details.archive_path)
      console.log('  - parent_path from response:', details.parent_path)
      
      // Сохраняем в кэш
      setArchiveDetailsCache(prev => new Map(prev).set(archiveId, details.ymap_files))
      
      // Обновляем архив в списке
      setArchives(prevArchives => 
        prevArchives.map(arch => 
          arch.id === archiveId 
            ? { ...arch, ymap_files: details.ymap_files }
            : arch
        )
      )
      
      console.log('[ExteriorsPage] Loaded YMAP details:', details.ymap_files.length, 'files')
      return details.ymap_files
    } catch (err: any) {
      console.error('[ExteriorsPage] Failed to load archive details:', err)
      toast.error('Ошибка загрузки деталей архива')
      return []
    } finally {
      // Убираем из загружающихся
      setLoadingArchiveDetails(prev => {
        const next = new Set(prev)
        next.delete(archiveId)
        return next
      })
    }
  }

  // ============================================================================
  // Обработчики действий
  // ============================================================================

  /**
   * Обработчик клика по архиву - открываем правые панели
   */
  const handleArchiveClick = async (archive: ExteriorResource) => {
    console.log('[ExteriorsPage] Archive clicked:', archive.name)
    
    // Устанавливаем выбранный архив и показываем панели
    setSelectedArchive(archive)
    setPanelsVisible(true)
    
    // Загружаем детали если их нет (ленивая загрузка)
    const ymaps = await loadArchiveDetails(archive.id)
    
    if (ymaps.length > 0) {
      setYmapFiles(ymaps)
      // Автоматически выбираем первый YMAP (НЕ загружаем XML сразу)
      setSelectedYmap(ymaps[0])
      setEntities(ymaps[0].entities || [])
      console.log('[ExteriorsPage] Auto-selected first YMAP:', ymaps[0].file_name)
    } else {
      setYmapFiles([])
      setSelectedYmap(null)
      setEntities([])
    }
  }
  
  /**
   * Обработчик клика на YMAP в раскрытом списке (левая панель)
   */
  const handleYmapClickInList = async (ymap: YmapFileInfo, archive: ExteriorResource) => {
    console.log('[ExteriorsPage] YMAP clicked in list:', ymap.file_name, 'from archive:', archive.name)
    
    // Устанавливаем архив если он не был выбран
    if (!selectedArchive || selectedArchive.id !== archive.id) {
      setSelectedArchive(archive)
      setPanelsVisible(true)
      
      // Загружаем детали архива если нужно
      const ymaps = await loadArchiveDetails(archive.id)
      setYmapFiles(ymaps)
    }
    
    // Выбираем YMAP и загружаем его XML
    await handleYmapSelect(ymap)
  }

  const handleYmapSelect = async (ymap: YmapFileInfo) => {
    setSelectedYmap(ymap)
    setEntities(ymap.entities || [])

    if (!selectedArchive) {
      toast.error('Архив не выбран')
      return
    }

    // Загружаем реальный YMAP XML через API (как в HUB)
    try {
      setYmapLoading(true)
      const token = getAccessToken()
      
      // Извлекаем относительный путь к архиву (без /app/test-files/)
      const archivePath = selectedArchive.path.replace(/^\/app\/test-files\//, '')
      
      // Используем rpf-content с path и archive_path (как в HUB)
      const params = new URLSearchParams({
        path: ymap.file_path,
        archive_path: archivePath,
        offset: '0',
        limit: '500000',
        encoding: 'utf-8'
      })
      
      const url = `${API_BASE_URL}/api/rpf/files/rpf-content?${params.toString()}`
      
      console.log('[ExteriorsPage] Loading YMAP:')
      console.log('  - file_path:', ymap.file_path)
      console.log('  - archive_path (relative):', archivePath)
      console.log('  - file_name:', ymap.file_name)
      console.log('  - Full URL:', url)
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to load YMAP: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      setYmapXml(data.content || '')
      console.log('[ExteriorsPage] YMAP loaded:', ymap.file_name, `(${data.size} bytes)`)
      toast.success('YMAP загружен')
      
      // TODO: Backend нужно починить - файлы не импортируются в БД правильно
      // Проверить: GetFileByPathAndArchive() находит ли файлы
      // Проверить: GetFileContent() возвращает ли контент
    } catch (err: any) {
      console.error('[ExteriorsPage] Failed to load YMAP XML:', err)
      toast.error(`Ошибка загрузки YMAP: ${err.message}`)
      setYmapXml('')
    } finally {
      setYmapLoading(false)
    }
  }

  const handleDownloadArchive = async () => {
    if (!selectedArchive) return
    
    try {
      const resourceName = getResourceName(selectedArchive.path, selectedArchive.parent_path)
      await downloadExterior(selectedArchive.id, resourceName)
      toast.success(`Архив "${resourceName}" скачан`)
    } catch (err: any) {
      console.error('[ExteriorsPage] Failed to download archive:', err)
      toast.error('Ошибка скачивания архива')
    }
  }
  
  const handleDownloadArchiveButton = async (archive: ExteriorResource, e: React.MouseEvent) => {
    e.stopPropagation()
    
    try {
      const resourceName = getResourceName(archive.path, archive.parent_path)
      await downloadExterior(archive.id, resourceName)
      toast.success(`Архив "${resourceName}" скачан`)
    } catch (err: any) {
      console.error('[ExteriorsPage] Failed to download archive:', err)
      toast.error('Ошибка скачивания архива')
    }
  }

  const handleTeleportToEntity = (entity: ExteriorEntity) => {
    teleportToEntity(entity)
    toast.success(`Телепорт к ${entity.archetype_name}`)
  }

  const handleCopyCoordinates = async (entity: ExteriorEntity) => {
    try {
      await copyEntityCoordinates(entity)
      toast.success('Координаты скопированы')
    } catch (err: any) {
      toast.error('Ошибка копирования координат')
    }
  }

  /**
   * Раскрытие/сворачивание архива - при раскрытии загружаем детали
   */
  const toggleExpanded = async (archiveId: string) => {
    const isExpanded = expandedArchives.has(archiveId)
    
    if (isExpanded) {
      // Сворачиваем
      setExpandedArchives((prev) => {
        const newSet = new Set(prev)
        newSet.delete(archiveId)
        return newSet
      })
    } else {
      // Раскрываем - загружаем детали если их нет
      setExpandedArchives((prev) => {
        const newSet = new Set(prev)
        newSet.add(archiveId)
        return newSet
      })
      
      // Ленивая загрузка деталей
      await loadArchiveDetails(archiveId)
    }
  }

  // ============================================================================
  // Рендер (ТОЧНО как в InteriorsPage)
  // ============================================================================

  return (
    <div className="flex-1 p-4 sm:p-6">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl lg:text-2xl font-bold text-white mb-2">Экстерьеры</h1>
        <div className="flex items-center space-x-2 text-sm mb-4">
          <div className={`px-2 py-1 rounded-full text-xs ${
            isAvailable ? 'bg-green-900 text-green-300' : 'bg-orange-900 text-orange-300'
          }`}>
            {isAvailable ? '🎮 ALT:V' : '🌐 Browser'}
          </div>
        </div>
      </div>

      {/* Tabs - HUB (активная), LOCAL (будущее) */}
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
          title="Локальные экстерьеры - функция в разработке"
        >
          <HardDrive className="w-4 h-4" />
          <span>Local</span>
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader className="w-6 h-6 animate-spin text-primary-400" />
          <span className="ml-2 text-gray-400">Загрузка экстерьеров...</span>
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
          {archives.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <MapIcon className="w-12 h-12 mx-auto mb-3 text-gray-600" />
              <p>Экстерьеры не найдены</p>
              <p className="text-xs mt-2">
                Экстерьеры автоматически определяются при индексации архивов
              </p>
            </div>
          ) : (
            archives.map((archive) => {
              const isExpanded = expandedArchives.has(archive.id)
              const isActive = panelsVisible && selectedArchive?.id === archive.id
              const resourceName = getResourceName(archive.path, archive.parent_path)
              
              // Используем ymap_files_count из API (быстро) или длину массива если детали загружены
              const ymapCount = archive.ymap_files?.length || archive.ymap_files_count || 0
              const isLoadingDetails = loadingArchiveDetails.has(archive.id)
              const hasLoadedDetails = archive.ymap_files && archive.ymap_files.length > 0

              return (
                <div
                  key={archive.id}
                  className={`relative p-3 sm:p-4 rounded-lg border transition-colors cursor-pointer ${
                    isActive
                      ? 'border-blue-500/60 bg-blue-900/10'
                      : 'bg-base-800 border-base-700 hover:bg-base-700'
                  }`}
                  onClick={() => handleArchiveClick(archive)}
                >
                  {/* Индикатор активности */}
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-l" />
                  )}

                  <div className="flex items-center justify-between">
                    {/* Info */}
                    <div className="flex-1 flex items-center space-x-3">
                      <button
                        className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleExpanded(archive.id)
                        }}
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <MapIcon className="w-4 h-4 text-blue-400 flex-shrink-0" />
                          <div 
                            className={`text-sm font-medium truncate ${isActive ? 'bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400' : 'text-white'}`}
                            title={resourceName}
                          >
                            {resourceName}
                          </div>
                        </div>
                        <div className="text-xs text-gray-400 mt-1 truncate" title={archive.name}>
                          {archive.name}
                        </div>
                        <div className="flex items-center space-x-2 mt-2">
                          {isLoadingDetails ? (
                            <span className="px-2 py-0.5 bg-yellow-900 text-yellow-300 text-xs rounded flex items-center space-x-1">
                              <Loader className="w-3 h-3 animate-spin" />
                              <span>Загрузка...</span>
                            </span>
                          ) : ymapCount > 0 ? (
                            <span className="px-2 py-0.5 bg-blue-900 text-blue-300 text-xs rounded">
                              {ymapCount} {ymapCount === 1 ? 'YMAP' : 'YMAP файлов'}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-gray-900 text-gray-400 text-xs rounded">
                              Нет YMAP
                            </span>
                          )}
                          <span className="text-xs text-gray-500">
                            {(archive.size / 1024 / 1024).toFixed(1)} MB
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => handleDownloadArchiveButton(archive, e)}
                        className="p-2 rounded border text-blue-400 border-base-600 hover:text-blue-300 hover:bg-base-900/30 hover:border-base-500 transition-colors"
                        title="Скачать архив"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded YMAP list */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-base-600">
                      {isLoadingDetails && !hasLoadedDetails ? (
                        <div className="flex items-center justify-center py-4 text-gray-400">
                          <Loader className="w-4 h-4 animate-spin mr-2" />
                          <span className="text-xs">Загрузка YMAP файлов...</span>
                        </div>
                      ) : hasLoadedDetails && ymapCount > 0 ? (
                        <>
                          <div className="text-xs font-medium text-gray-400 mb-2">
                            YMAP файлы ({ymapCount}):
                          </div>
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {archive.ymap_files!.map((ymap) => (
                              <div
                                key={ymap.file_id}
                                className={`flex items-center justify-between p-2 rounded text-xs transition-colors cursor-pointer ${
                                  selectedYmap?.file_id === ymap.file_id
                                    ? 'bg-blue-900/30 border border-blue-500/50'
                                    : 'bg-base-900 hover:bg-base-800'
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleYmapClickInList(ymap, archive)
                                }}
                              >
                                <div className="flex-1">
                                  <div className={`font-medium mb-1 ${
                                    selectedYmap?.file_id === ymap.file_id ? 'text-blue-300' : 'text-white'
                                  }`}>
                                    {ymap.file_name}
                                  </div>
                                  <div className="text-gray-500">
                                    {ymap.entities?.length || 0} entities
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : !hasLoadedDetails && ymapCount > 0 ? (
                        <div className="text-xs text-gray-400 text-center py-2">
                          Нажмите для загрузки {ymapCount} YMAP {ymapCount === 1 ? 'файла' : 'файлов'}...
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500 text-center py-2">
                          YMAP файлы не найдены
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Footer info */}
      {!loading && archives.length > 0 && (
          <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-base-800 rounded-lg">
            <div className="text-xs text-gray-400">
              {isAvailable
                ? '🎮 Подключено к ALT:V - экстерьеры будут установлены в игру'
                : '🌐 Работает в браузере - используется режим демонстрации'
              }
            </div>
            {isAvailable && (
              <div className="text-xs text-gray-500 mt-2">
                💡 Используйте телепорт для перемещения к экстерьерам
              </div>
            )}
          </div>
        )}

      {/* ========================================================================== */}
      {/* Правые панели через Portal (идентично InteriorsPage)                      */}
      {/* ========================================================================== */}

      {panelsVisible && selectedArchive && (
        <Portal>
          <div
            className="pointer-events-auto fixed top-16 bottom-4 right-6 z-[9999] flex flex-col space-y-3 transition-all duration-300"
            style={{ left: focusMode !== 'off' ? '24px' : 'calc(15.6vw + 48px)' }}
          >
            {/* Header над панелями */}
            {focusMode === 'off' && (
              <div
                ref={headerRef}
                className="rounded-lg p-3 flex items-center space-x-3 border border-white/10 bg-gradient-to-r from-[#141421] via-[#171927] to-[#0f1913] shadow-[inset_0_1px_0_rgba(255,255,255,.06)] cursor-pointer animate-slide-in-left"
                style={{ width: 'auto' }}
                title="Скрыть/показать панели"
                onClick={() => {
                  setPanelsVisible(v => !v)
                }}
              >
                <div className="w-8 h-8 rounded-lg bg-blue-600/30 ring-1 ring-blue-500/40 flex items-center justify-center">
                  <MapIcon className="w-4 h-4 text-blue-200" />
                </div>
                <div className="text-sm font-semibold truncate bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400">
                  {getResourceName(selectedArchive.path, selectedArchive.parent_path)}
                </div>
              </div>
            )}

            <div className="flex space-x-3 flex-1 overflow-hidden">
              {/* Панель 1: Список YMAP файлов */}
              {(focusMode === 'off' || focusMode === 'details') && (
                <div
                  data-exterior-panel-type="ymap-list"
                  className={`${
                    focusMode === 'details' ? 'w-[min(400px,30vw)]' : 'w-[calc((100vw-15.6vw-96px)/3)]'
                  } min-w-[320px] max-w-[450px] h-[calc(100vh-190px)] overflow-hidden bg-base-900/80 backdrop-blur-sm border border-base-700 rounded-lg p-4 animate-slide-in-left transition-all duration-300`}
                >
                  <ExteriorDetails
                    resource={selectedArchive}
                    ymapFiles={ymapFiles}
                    selectedYmap={selectedYmap}
                    onYmapSelect={handleYmapSelect}
                    onDownloadArchive={handleDownloadArchive}
                    loading={ymapLoading}
                  />
                </div>
              )}

              {/* Панель 2: YmapEditor */}
              {(focusMode === 'off' || focusMode === 'editor') && (
                <div
                  data-exterior-panel-type="editor"
                  className="w-[calc((100vw-15.6vw-96px)/3)] min-w-[400px] max-w-[650px] h-[calc(100vh-190px)] overflow-hidden bg-base-900/80 backdrop-blur-sm border border-base-700 rounded-lg p-4 animate-slide-in-left"
                >
                  {selectedYmap && ymapXml ? (
                    <YmapEditor
                      xml={ymapXml}
                      onXmlChange={setYmapXml}
                      interiorName={getResourceName(selectedArchive.path, selectedArchive.parent_path)}
                    />
                  ) : selectedYmap && ymapLoading ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                      <Loader className="w-8 h-8 animate-spin mb-4" />
                      <p className="text-sm">Загрузка YMAP XML...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                      <MapIcon className="w-12 h-12 mb-4 opacity-50" />
                      <p className="text-sm">Выберите YMAP для редактирования</p>
                    </div>
                  )}
                </div>
              )}

              {/* Панель 3: EntityList */}
              {(focusMode === 'off' || focusMode === 'details') && (
                <div
                  data-exterior-panel-type="entities"
                  className="w-[calc((100vw-15.6vw-96px)/3)] min-w-[320px] max-w-[450px] h-[calc(100vh-190px)] overflow-hidden bg-base-900/80 backdrop-blur-sm border border-base-700 rounded-lg p-4 animate-slide-in-left"
                >
                  {selectedYmap && entities.length > 0 ? (
                    <EntityList
                      entities={entities}
                      onTeleport={handleTeleportToEntity}
                      onCopyCoordinates={handleCopyCoordinates}
                      title="Entities"
                    />
                  ) : selectedYmap ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                      <AlertCircle className="w-12 h-12 mb-4 opacity-50" />
                      <p className="text-sm">Нет entities в этом YMAP</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                      <MapIcon className="w-12 h-12 mb-4 opacity-50" />
                      <p className="text-sm">Выберите YMAP для просмотра entities</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </Portal>
      )}
    </div>
  )
}
