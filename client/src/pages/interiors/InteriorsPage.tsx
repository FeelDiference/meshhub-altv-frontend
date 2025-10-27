/**
 * Страница управления интерьерами (MLO)
 * С правыми панелями для редактирования YTYP/YMAP и просмотра Entity
 */

import React, { useState, useEffect } from 'react'
import { useALTV } from '@/hooks/useALTV'
import { useFavorites } from '@/hooks/useFavorites'
import { getInteriors } from '@/services/interiors'
import { 
  downloadInteriorToLocal, 
  getInstalledInteriorsCached,
  teleportToInterior 
} from '@/services/interiorManager'
import { getAccessToken } from '@/services/auth'
import * as pako from 'pako'
import type { InteriorResource, Interior, InteriorStatus, InteriorEditorMode } from '@/types/interior'
import type { FavoriteLocation } from '@/types/favorites'
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
import Portal from '@/components/common/Portal'
import InteriorDetails from '@/components/interiors/InteriorDetails'
import YtypEditor from '@/components/interiors/YtypEditor'
import YmapEditor from '@/components/interiors/YmapEditor'
import EntityList from '@/components/interiors/EntityList'
import { MOCK_YTYP_XML, MOCK_YMAP_XML, parseYtypEntitySets, parseYtypPortals, parseYtypRooms } from '@/data/interior-mock'

interface InteriorsPageProps {
  currentInteriorData?: {
    interiorId: number
    position: { x: number; y: number; z: number }
  } | null
}

export function InteriorsPage({ currentInteriorData: propsCurrentInteriorData }: InteriorsPageProps = {}) {
  const { isAvailable } = useALTV()
  const [interiors, setInteriors] = useState<InteriorResource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [interiorStatuses, setInteriorStatuses] = useState<Map<string, InteriorStatus>>(new Map())
  const [activeTab] = useState<'hub' | 'gtav' | 'local'>('hub')
  const [expandedInteriors, setExpandedInteriors] = useState<Set<string>>(new Set())
  
  // Используем централизованный хук избранного
  const { toggle, has } = useFavorites()
  
  // ============================================================================
  // Новые state для правых панелей (аналогично VehiclesPage/WeaponsPage)
  // ============================================================================
  
  const [selectedInterior, setSelectedInterior] = useState<InteriorResource | null>(null)
  const [panelsVisible, setPanelsVisible] = useState(false)
  const [editorMode, setEditorMode] = useState<InteriorEditorMode>('ytyp')
  const [focusMode, setFocusMode] = useState<'off' | 'details' | 'editor'>('off')
  
  // XML данные для редакторов
  const [ytypXml, setYtypXml] = useState<string>('')
  const [ymapXml, setYmapXml] = useState<string>('')
  const [highlightedParam, setHighlightedParam] = useState<string>('')
  const [ytypLoading, setYtypLoading] = useState(false)
  const [entitySets, setEntitySets] = useState<string[]>([])
  const [entitySetMappings, setEntitySetMappings] = useState<Record<string, string>>({}) // hash -> realName
  
  // Текущий интерьер (определяется по координатам игрока)
  const [currentInterior, setCurrentInterior] = useState<{
    interiorId: number // GTA V interior ID
    resourceId: string // ID ресурса из нашего списка
  } | null>(null)
  
  // Порталы (мокап toggle)
  const [portalsVisible, setPortalsVisible] = useState(false)
  
  // Live Edit visibility
  const [liveEditVisible, setLiveEditVisible] = useState(false)
  
  // Таймцикл из YTYP (первая комната с таймциклом)
  const [defaultTimecycle, setDefaultTimecycle] = useState<string | undefined>(undefined)
  
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
      const panels = document.querySelectorAll('[data-interior-panel-type]')
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
  }, [panelsVisible, editorMode, selectedInterior])
  
  // ============================================================================
  // Загрузка списка интерьеров
  // ============================================================================

  useEffect(() => {
    loadInteriors()
  }, [activeTab])
  
  // ============================================================================
  // Загрузка YTYP/YMAP файлов
  // ============================================================================
  
  /**
   * Загрузить маппинги entity sets для интерьера
   */
  const loadEntitySetMappings = (interiorName: string) => {
    if (!isAvailable) return
    
    console.log('[InteriorsPage] 📥 Requesting entity set mappings for:', interiorName)
    ;(window as any).alt.emit('meshhub:entityset:mapping:get', interiorName)
  }
  
  /**
   * Загрузить YTYP файл для интерьера
   */
  const loadYtypForInterior = (interior: InteriorResource) => {
    if (!isAvailable) {
      // В браузере - загружаем мокап
      setYtypXml(MOCK_YTYP_XML)
      return
    }
    
    setYtypLoading(true)
    
    // Используем displayName как имя интерьера (соответствует папке)
    const interiorName = (interior as any).displayName || (interior as any).display_name || interior.name
    
    console.log('[InteriorsPage] 📄 Requesting YTYP for:', interiorName)
    
    // Отправляем запрос через Alt:V клиент
    ;(window as any).alt.emit('meshhub:interior:ytyp:request', {
      interiorName: interiorName
    })
    
    // Также загружаем маппинги entity sets
    loadEntitySetMappings(interiorName)
  }
  
  /**
   * Обработчик ответа с YTYP
   */
  useEffect(() => {
    if (typeof window !== 'undefined' && 'alt' in window && (window as any).alt) {
      const handleYtypResponse = (data: {
        success: boolean
        interiorName: string
        ytypXml?: string
        compressed?: boolean
        entitySets?: string[]
        error?: string
      }) => {
        console.log('[InteriorsPage] 📥 YTYP response:', {
          success: data.success,
          interiorName: data.interiorName,
          compressed: data.compressed,
          xmlLength: data.ytypXml?.length,
          entitySetsCount: data.entitySets?.length
        })
        
        setYtypLoading(false)
        
        if (data.success && data.ytypXml) {
          let xml = data.ytypXml
          
          // Распаковываем если сжато
          if (data.compressed) {
            try {
              const compressed = Uint8Array.from(atob(xml), c => c.charCodeAt(0))
              const decompressed = pako.ungzip(compressed, { to: 'string' })
              xml = decompressed
              console.log('[InteriorsPage] 📦 Decompressed:', xml.length, 'chars')
            } catch (err) {
              console.error('[InteriorsPage] Failed to decompress:', err)
              toast.error('Ошибка распаковки YTYP')
              return
            }
          }
          
          setYtypXml(xml)
          
          // Парсим Entity Sets из XML напрямую
          const parsedEntitySets = parseYtypEntitySets(xml)
          setEntitySets(parsedEntitySets)
          
          // Парсим комнаты и извлекаем таймцикл
          const parsedRooms = parseYtypRooms(xml)
          const roomWithTimecycle = parsedRooms.find(room => room.timecycleName)
          if (roomWithTimecycle?.timecycleName) {
            console.log('[InteriorsPage] 🎨 Found default timecycle:', roomWithTimecycle.timecycleName, 'in room:', roomWithTimecycle.name)
            setDefaultTimecycle(roomWithTimecycle.timecycleName)
          } else {
            setDefaultTimecycle(undefined)
          }
          
          if (parsedEntitySets.length > 0) {
            console.log('[InteriorsPage] 📦 Entity Sets parsed from XML:', parsedEntitySets)
            toast.success(`YTYP загружен: ${parsedEntitySets.length} entity sets`)
          } else {
            console.log('[InteriorsPage] ℹ️ No entity sets found in YTYP')
            toast.success(`YTYP загружен: ${xml.length} символов`)
          }
        } else {
          console.error('[InteriorsPage] ❌ Failed to load YTYP:', data.error)
          toast.error(data.error || 'Ошибка загрузки YTYP')
          setYtypXml(MOCK_YTYP_XML)
        }
      }
      
      ;(window as any).alt.on('meshhub:interior:ytyp:response', handleYtypResponse)
      
      return () => {
        ;(window as any).alt.off?.('meshhub:interior:ytyp:response', handleYtypResponse)
      }
    }
  }, [isAvailable])
  
  // ============================================================================
  // Маппинг Entity Sets
  // ============================================================================
  
  useEffect(() => {
    if (typeof window !== 'undefined' && 'alt' in window && (window as any).alt) {
      // Обработчик получения маппингов
      const handleMappingResponse = (data: {
        success: boolean
        interiorName: string
        mappings: Record<string, string>
        error?: string
      }) => {
        if (data.success) {
          console.log('[InteriorsPage] 📥 Received entity set mappings:', data.mappings)
          setEntitySetMappings(data.mappings)
        } else {
          console.error('[InteriorsPage] ❌ Failed to load mappings:', data.error)
        }
      }
      
      // Обработчик сохранения маппинга
      const handleMappingSetResponse = (data: {
        success: boolean
        hash: string
        realName: string
        error?: string
      }) => {
        if (data.success) {
          console.log('[InteriorsPage] ✅ Mapping saved:', data.hash, '->', data.realName)
          setEntitySetMappings(prev => ({
            ...prev,
            [data.hash]: data.realName
          }))
          toast.success(`Entity set переименован: ${data.realName}`)
        } else {
          console.error('[InteriorsPage] ❌ Failed to save mapping:', data.error)
          toast.error('Ошибка сохранения маппинга')
        }
      }
      
      ;(window as any).alt.on('meshhub:entityset:mapping:get:response', handleMappingResponse)
      ;(window as any).alt.on('meshhub:entityset:mapping:set:response', handleMappingSetResponse)
      
      return () => {
        ;(window as any).alt.off?.('meshhub:entityset:mapping:get:response', handleMappingResponse)
        ;(window as any).alt.off?.('meshhub:entityset:mapping:set:response', handleMappingSetResponse)
      }
    }
  }, [isAvailable])
  
  /**
   * Сохранить маппинг entity set
   */
  const saveEntitySetMapping = (hash: string, realName: string) => {
    if (!isAvailable || !selectedInterior) return
    
    const interiorName = (selectedInterior as any).displayName || (selectedInterior as any).display_name || selectedInterior.name
    
    console.log('[InteriorsPage] 📝 Saving entity set mapping:', hash, '->', realName)
    ;(window as any).alt.emit('meshhub:entityset:mapping:set', {
      interiorName,
      hash,
      realName
    })
  }
  
  // ============================================================================
  // Определение текущего интерьера по координатам игрока
  // ============================================================================
  
  // useEffect: Автоматический выбор интерьера на основе данных из props
  useEffect(() => {
    // Проверяем что есть все данные
    if (!propsCurrentInteriorData || interiors.length === 0 || interiorStatuses.size === 0) {
      return
    }
    
    const data = propsCurrentInteriorData
    
    if (data.interiorId === 0) {
      // Игрок не в интерьере
      setCurrentInterior(null)
      return
    }
    
    // Умный поиск интерьера по координатам (только установленные)
    const installedInteriors = interiors.filter(interior => 
      interiorStatuses.get(interior.id) === 'installed'
    )
    
    // Собираем все возможные совпадения с расстоянием
    interface Match {
      interior: typeof interiors[0]
      distance: number
      locationIndex: number
    }
    
    const matches: Match[] = []
    
    for (const interior of installedInteriors) {
      if (!interior.interiors || !Array.isArray(interior.interiors)) {
        continue
      }
      
      interior.interiors.forEach((loc: any, idx: number) => {
        // В реальных данных координаты на верхнем уровне: position_x, position_y, position_z
        if (!loc || typeof loc.position_x !== 'number' || typeof loc.position_y !== 'number' || typeof loc.position_z !== 'number') {
          return
        }
        
        // Вычисляем 3D расстояние
        const dx = loc.position_x - data.position.x
        const dy = loc.position_y - data.position.y
        const dz = loc.position_z - data.position.z
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)
        
        // Интерьеры большие - используем радиус 200м по XY и 50м по Z
        const isInRange = Math.abs(dx) < 200 && Math.abs(dy) < 200 && Math.abs(dz) < 50
        
        if (isInRange) {
          matches.push({
            interior,
            distance,
            locationIndex: idx
          })
        }
      })
    }
    
    // Выбираем ближайший интерьер
    let matchingInterior = null
    
    if (matches.length > 0) {
      // Сортируем по расстоянию и берем ближайший
      matches.sort((a, b) => a.distance - b.distance)
      matchingInterior = matches[0].interior
    }
    
    if (matchingInterior) {
      setCurrentInterior({
        interiorId: data.interiorId,
        resourceId: matchingInterior.id
      })
      
      // Автоматически выбираем и раскрываем интерьер
      setSelectedInterior(matchingInterior)
      setExpandedInteriors(prev => new Set(prev).add(matchingInterior.id))
      setPanelsVisible(true)
      
      // Загружаем YTYP для автоматически выбранного интерьера
      const status = interiorStatuses.get(matchingInterior.id)
      if (status === 'installed') {
        loadYtypForInterior(matchingInterior)
      } else {
        setYtypXml(MOCK_YTYP_XML)
        setYmapXml(MOCK_YMAP_XML)
      }
    } else {
      setCurrentInterior({
        interiorId: data.interiorId,
        resourceId: ''
      })
    }
  }, [propsCurrentInteriorData, interiors, interiorStatuses])
  
  // ============================================================================
  // Toggle порталов
  // ============================================================================
  
  const handleTogglePortals = () => {
    const newState = !portalsVisible
    setPortalsVisible(newState)
    
    if (typeof window !== 'undefined' && 'alt' in window && (window as any).alt) {
      // Парсим порталы и комнаты из YTYP XML
      const portals = parseYtypPortals(ytypXml)
      const rooms = parseYtypRooms(ytypXml)
      
      // Создаём маппинг ID комнаты -> Имя комнаты
      const roomNames: Record<number, string> = {}
      rooms.forEach((room, index) => {
        roomNames[index] = room.name
      })
      
      const eventData = { 
        portals: portals,
        roomNames: roomNames,
        visible: newState,
        interiorId: currentInterior?.interiorId
      }
      
      ;(window as any).alt.emit('interior:portals:draw', eventData)
      toast.success(newState ? `Порталы включены (${portals.length})` : 'Порталы выключены')
    } else {
      toast(newState ? 'Порталы включены (мокап)' : 'Порталы выключены (мокап)', { icon: '👁️' })
    }
  }

  // ============================================================================
  // Toggle Live Edit
  // ============================================================================
  
  const handleToggleLiveEdit = () => {
    setLiveEditVisible(prev => {
      const newValue = !prev
      
      // Отправляем событие в Alt:V для показа/скрытия webview
      if (typeof window !== 'undefined' && 'alt' in window && (window as any).alt) {
        if (newValue) {
          // Включаем Live Debug - Alt:V клиент сам определит origin через нативку
          ;(window as any).alt.emit('interior:liveedit:enable', {
            interiorId: currentInterior?.interiorId
          })
          toast.success('Live Debug включен')
        } else {
          // Выключаем Live Debug - скрываем webview и останавливаем отправку данных
          ;(window as any).alt.emit('interior:liveedit:disable')
          toast.success('Live Debug выключен')
        }
      } else {
        toast(newValue ? 'Live Debug включен (мокап)' : 'Live Debug выключен (мокап)', { icon: '📊' })
      }
      
      return newValue
    })
  }
  
  // Слушаем событие закрытия Live Edit от webview
  useEffect(() => {
    if (typeof window !== 'undefined' && 'alt' in window && (window as any).alt) {
      const handleLiveEditClosed = () => {
        console.log('[InteriorsPage] Live Edit closed from webview')
        setLiveEditVisible(false)
      }
      
      ;(window as any).alt.on('interior:liveedit:closed', handleLiveEditClosed)
      
      return () => {
        ;(window as any).alt.off?.('interior:liveedit:closed', handleLiveEditClosed)
      }
    }
  }, [])

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

      // Получаем список всех установленных интерьеров с кэшем
      console.log('🔍 Получаем список установленных интерьеров...')
      const installedInteriorIds = await getInstalledInteriorsCached()
      console.log(`✅ Установлено интерьеров: ${installedInteriorIds.length}`)
      console.log('📋 Установленные интерьеры (имена папок):', installedInteriorIds)
      
      const installedSet = new Set(installedInteriorIds)
      
      // Устанавливаем статусы для всех интерьеров
      const statuses = new Map<string, InteriorStatus>()
      for (const interior of interiorsData) {
        const interiorName = (interior as any).displayName || (interior as any).display_name || interior.name
        const isInstalled = installedSet.has(interiorName)
        statuses.set(interior.id, isInstalled ? 'installed' : 'not_installed')
        
        console.log(`[Interior] "${interiorName}" (ID: ${interior.id.substring(0, 8)}...) - ${isInstalled ? '✅ INSTALLED' : '❌ NOT INSTALLED'}`)
      }
      setInteriorStatuses(statuses)
      
      // Сортируем: установленные наверх
      const sortedInteriors = [...interiorsData].sort((a, b) => {
        const aStatus = statuses.get(a.id) || 'not_installed'
        const bStatus = statuses.get(b.id) || 'not_installed'
        
        if (aStatus === 'installed' && bStatus !== 'installed') return -1
        if (bStatus === 'installed' && aStatus !== 'installed') return 1
        
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
          {currentInterior && (
            <div className="px-2 py-1 bg-purple-900 text-purple-300 rounded-full text-xs">
              Interior ID: {currentInterior.interiorId}
            </div>
          )}
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
              
              // Проверяем является ли этот интерьер текущим
              const isCurrentInterior = currentInterior?.resourceId === interior.id
              
              // Проверяем активен ли этот интерьер (выбран в панелях)
              const isActive = panelsVisible && selectedInterior?.id === interior.id

              return (
                <div 
                  key={interior.id}
                  className={`relative p-3 sm:p-4 rounded-lg border transition-colors cursor-pointer ${
                    isActive
                      ? 'border-green-500/60 bg-green-900/10'
                      : 'bg-base-800 border-base-700 hover:bg-base-700'
                  }`}
                  onClick={() => {
                    // Переключаем панели при клике
                    setPanelsVisible(v => {
                      const same = selectedInterior?.id === interior.id
                      const nextVisible = same ? !v : true
                      return nextVisible
                    })
                    setSelectedInterior(interior)
                    
                    // Загружаем YTYP из RPF (если интерьер установлен) или мокап
                    if (status === 'installed') {
                      loadYtypForInterior(interior)
                    } else {
                      // Для неустановленных - мокап данные
                      setYtypXml(MOCK_YTYP_XML)
                      setYmapXml(MOCK_YMAP_XML)
                    }
                  }}
                >
                  {/* Индикатор активности */}
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-green-500 to-emerald-500 rounded-l" />
                  )}
                  
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
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          {/* Индикатор текущего интерьера */}
                          {isCurrentInterior && (
                            <span className="px-2 py-0.5 bg-violet-600/20 border border-violet-500/50 text-violet-300 text-xs rounded-full flex items-center space-x-1">
                              <MapPin className="w-3 h-3" />
                              <span>Вы здесь</span>
                            </span>
                          )}
                          
                          <Building2 className="w-4 h-4 text-primary-400" />
                          <div className={`text-sm font-medium ${isActive ? 'bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-400' : 'text-white'}`}>
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
                                      // @ts-ignore
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
      
      {/* ========================================================================== */}
      {/* Правые панели через Portal (аналогично VehiclesPage/WeaponsPage)          */}
      {/* ========================================================================== */}
      
      {panelsVisible && selectedInterior && (
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
                <div className="w-8 h-8 rounded-lg bg-green-600/30 ring-1 ring-green-500/40 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-green-200" />
                </div>
                <div className="text-sm font-semibold truncate bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-400">
                  {selectedInterior.displayName || selectedInterior.name}
                </div>
              </div>
            )}
            
            <div className="flex space-x-3 flex-1 overflow-hidden">
              {/* Блок 1: InteriorDetails - всегда видим если фокус выкл или на details */}
              {(focusMode === 'off' || focusMode === 'details') && (
                <div 
                  data-interior-panel-type="details"
                  className={`${
                    focusMode === 'details' ? 'w-[min(400px,30vw)]' : 'w-[400px]'
                  } min-w-[320px] max-w-[450px] h-[calc(100vh-190px)] overflow-hidden bg-base-900/80 backdrop-blur-sm border border-base-700 rounded-lg p-4 animate-slide-in-left transition-all duration-300`}
                >
                  <InteriorDetails
                    interior={selectedInterior}
                    editorMode={editorMode}
                    onEditorModeChange={setEditorMode}
                    onFocusModeToggle={() => setFocusMode(focusMode === 'details' ? 'off' : 'details')}
                    focusMode={focusMode === 'details'}
                    currentInteriorId={currentInterior?.interiorId}
                    portalsVisible={portalsVisible}
                    onTogglePortals={handleTogglePortals}
                    entitySets={entitySets}
                    entitySetMappings={entitySetMappings}
                    onSaveEntitySetMapping={saveEntitySetMapping}
                    defaultTimecycle={defaultTimecycle}
                    liveEditVisible={liveEditVisible}
                    onToggleLiveEdit={handleToggleLiveEdit}
                  />
                </div>
              )}
              
              {/* Блок 2: Editor (YTYP или YMAP в зависимости от режима) */}
              {(focusMode === 'off' || focusMode === 'editor') && (
                <div 
                  data-interior-panel-type="editor"
                  className="w-[calc((100vw-15.6vw-96px)/3)] min-w-[400px] max-w-[650px] h-[calc(100vh-190px)] overflow-hidden bg-base-900/80 backdrop-blur-sm border border-base-700 rounded-lg p-4 animate-slide-in-left"
                >
                  {editorMode === 'ytyp' ? (
                    <YtypEditor
                      xml={ytypXml}
                      onXmlChange={setYtypXml}
                      interiorName={selectedInterior.name}
                      highlightedParam={highlightedParam}
                      loading={ytypLoading}
                    />
                  ) : (
                    <YmapEditor
                      xml={ymapXml}
                      onXmlChange={setYmapXml}
                      interiorName={selectedInterior.name}
                      highlightedParam={highlightedParam}
                    />
                  )}
                </div>
              )}
              
              {/* Блок 3: EntityList (только для YTYP режима) или заглушка для YMAP */}
              {focusMode === 'off' && editorMode === 'ytyp' && (
                <div 
                  data-interior-panel-type="entities"
                  className="w-[calc((100vw-15.6vw-96px)/3)] min-w-[400px] max-w-[650px] h-[calc(100vh-190px)] overflow-hidden bg-base-900/80 backdrop-blur-sm border border-base-700 rounded-lg p-4 animate-slide-in-left"
                >
                  <EntityList
                    ytypXml={ytypXml}
                    onHighlightEntity={(archetypeName) => {
                      setHighlightedParam(archetypeName)
                      toast.success(`Подсвечено: ${archetypeName}`)
                    }}
                    interiorName={selectedInterior.name}
                  />
                </div>
              )}
              
              {/* Блок 3 для YMAP режима - заглушка (в будущем: список размещенных объектов) */}
              {focusMode === 'off' && editorMode === 'ymap' && (
                <div 
                  data-interior-panel-type="ymap-entities"
                  className="w-[calc((100vw-15.6vw-96px)/3)] min-w-[400px] max-w-[650px] h-[calc(100vh-190px)] overflow-hidden bg-base-900/80 backdrop-blur-sm border border-base-700 rounded-lg p-4 animate-slide-in-left"
                >
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <MapPin className="w-12 h-12 text-gray-600 mb-3" />
                    <div className="text-lg font-semibold text-gray-400 mb-2">
                      YMAP Entity List
                    </div>
                    <div className="text-sm text-gray-500">
                      Список размещенных объектов - в разработке
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Portal>
      )}
    </div>
  )
}

export default InteriorsPage






