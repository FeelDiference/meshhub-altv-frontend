// Страница управления оружием
import { useState, useEffect } from 'react'
import { Zap, Loader2, AlertCircle, Download, RotateCcw, Search, X, Cloud, Gamepad2, HardDrive, ChevronDown, ChevronRight, Loader } from 'lucide-react'
import toast from 'react-hot-toast'
import WeaponActions from '@/components/weapons/WeaponActions'
import Portal from '@/components/common/Portal'
import { useALTV } from '@/hooks/useALTV'
import { getAccessToken } from '@/services/auth'
import { getWeaponArchives, getWeaponsInArchive } from '@/services/weapons'
import type { AnyWeapon } from '@/types/weapon'
import type { WeaponResource } from '@/types/weapon'
import { downloadWeaponToLocal, checkWeaponExists, type WeaponStatus } from '@/services/weaponManager'
import { getGTAVWeapons, getGTAVWeaponCategories, type GTAVWeapon } from '@/data/gtav-weapons'
import WeaponTuningSliders from '@/components/weapons/WeaponTuningSliders'
import WeaponMetaEditor from '@/components/weapons/WeaponMetaEditor'
import { loadWeaponsMeta, parseWeaponsMeta, updateWeaponXmlValue, type WeaponsMetaIndex } from '@/services/weaponsMetaParser'

export const WeaponsPage = () => {
  const { isAvailable } = useALTV()
  const [weapons, setWeapons] = useState<WeaponResource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [weaponStatuses, setWeaponStatuses] = useState<Map<string, WeaponStatus>>(new Map())
  const [activeTab, setActiveTab] = useState<'hub' | 'gtav' | 'local'>('hub')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [expandedArchives, setExpandedArchives] = useState<Set<string>>(new Set())
  const [loadingArchives, setLoadingArchives] = useState<Set<string>>(new Set())
  
  // GTAV оружие загружается локально
  const [gtavWeapons] = useState<GTAVWeapon[]>(() => getGTAVWeapons())
  const [gtavCategories] = useState<string[]>(() => ['All', ...getGTAVWeaponCategories()])

  // Load weapons from archive
  const loadWeaponsFromArchive = async (archiveId: string) => {
    if (loadingArchives.has(archiveId)) return
    
    setLoadingArchives(prev => new Set(prev).add(archiveId))
    
    try {
      const weaponsInArchive = await getWeaponsInArchive(archiveId)
      
      setWeapons(prev => prev.map(weapon => {
        if (weapon.id === archiveId) {
          return {
            ...weapon,
            children: weaponsInArchive
          }
        }
        return weapon
      }))
      
      // Check installation status for each weapon in archive
      const statuses = new Map<string, WeaponStatus>()
      for (const weapon of weaponsInArchive) {
        const isInstalled = await checkWeaponExists(weapon)
        statuses.set(weapon.id, isInstalled ? 'downloaded' : 'not_downloaded')
      }
      setWeaponStatuses(prev => new Map([...prev, ...statuses]))
      
    } catch (error) {
      console.error('Failed to load weapons from archive:', error)
    } finally {
      setLoadingArchives(prev => {
        const newSet = new Set(prev)
        newSet.delete(archiveId)
        return newSet
      })
    }
  }

  // Toggle archive expansion
  const toggleArchive = async (archiveId: string) => {
    const newExpanded = new Set(expandedArchives)
    
    if (newExpanded.has(archiveId)) {
      newExpanded.delete(archiveId)
    } else {
      newExpanded.add(archiveId)
      // Load weapons if not already loaded
      const archive = weapons.find(w => w.id === archiveId)
      if (archive && (!archive.children || archive.children.length === 0)) {
        await loadWeaponsFromArchive(archiveId)
      }
    }
    
    setExpandedArchives(newExpanded)
  }
  
  // Local оружие пользователя
  const [localWeapons] = useState<AnyWeapon[]>([])
  
  // Панели и модальные окна
  const [selectedWeapon, setSelectedWeapon] = useState<AnyWeapon | null>(null)
  const [panelsVisible, setPanelsVisible] = useState(false)
  const [showWeaponTuning, setShowWeaponTuning] = useState(true)
  const [showWeaponMeta, setShowWeaponMeta] = useState(true)
  const [showWeaponActions, setShowWeaponActions] = useState(true)
  const [focusMode, setFocusMode] = useState<'off' | 'tuning' | 'meta' | 'actions'>('off')
  
  // Синхронизируем focusMode с глобальной переменной для скрытия главного меню
  useEffect(() => {
    if (typeof window !== 'undefined') {
      ;(window as any).__focusMode = focusMode
    }
  }, [focusMode])
  
  // Weapons.meta и XML
  // @ts-ignore - используется в WeaponTuningSliders
  const [weaponsMetaIndex, setWeaponsMetaIndex] = useState<WeaponsMetaIndex | null>(null)
  const [weaponMetaXml, setWeaponMetaXml] = useState<string>('')
  const [currentWeapon, setCurrentWeapon] = useState<{ name: string; id: string } | null>(null)

  // Weapons.meta теперь загружается по требованию с сервера (не нужен предзагрузка)
  
  // Load selected weapon XML when weapon changes
  useEffect(() => {
    if (!selectedWeapon) return
    
    const weaponName = selectedWeapon.name.toUpperCase()
    
    // Загружаем XML для конкретного оружия с сервера
    loadWeaponsMeta(weaponName).then(xmlString => {
      setWeaponMetaXml(xmlString)
      
      // Парсим для индекса (если нужно отображать слайдеры)
      const index = parseWeaponsMeta(xmlString)
      setWeaponsMetaIndex(index)
      
      console.log('[WeaponsPage] Loaded XML for weapon:', weaponName)
    }).catch(error => {
      console.warn('[WeaponsPage] Weapon XML not found:', weaponName, error.message)
      
      // Очищаем XML и индекс, но оставляем возможность менять нативки
      setWeaponMetaXml('')
      setWeaponsMetaIndex(null)
      
      // Показываем уведомление (используем warning вместо info)
      console.info(`[WeaponsPage] XML config not available for ${weaponName}`)
    })
  }, [selectedWeapon])

  // Load weapons from backend
  useEffect(() => {
    // Загружаем HUB данные только когда пользователь на вкладке HUB
    // GTAV и LOCAL вкладки работают автономно без backend
    if (activeTab !== 'hub') {
      setLoading(false)
      setError(null)
      return
    }
    
    (async () => {
      try {
        setLoading(true)
        setError(null)
        
        const loadedWeapons = await getWeaponArchives()
        // Mark archives as expandable
        const archivesWithMetadata = loadedWeapons.map((weapon: any) => ({
          ...weapon,
          isArchive: true,
          children: []
        }))
        setWeapons(archivesWithMetadata)
        
        // Check installation status for each weapon
        const statuses = new Map<string, WeaponStatus>()
        for (const weapon of loadedWeapons) {
          const isInstalled = await checkWeaponExists(weapon)
          statuses.set(weapon.id, isInstalled ? 'downloaded' : 'not_downloaded')
        }
        setWeaponStatuses(statuses)
      } catch (err: any) {
        setError('Сервис временно недоступен. GTAV и LOCAL вкладки работают автономно.')
        console.error('Ошибка загрузки оружия:', err)
        toast.error('Сервис временно недоступен')
      } finally {
        setLoading(false)
      }
    })()
  }, [activeTab])
  
  // Обработчик получения оружия в руки (аналог onPlayerEnteredVehicle для автомобилей)
  useEffect(() => {
    if (!(typeof window !== 'undefined' && 'alt' in window)) return
    
    const onWeaponEquipped = (data: { weaponName: string; weaponHash: number }) => {
      console.log('[WeaponsPage] 🔫 Player equipped weapon:', data.weaponName)
      console.log('[WeaponsPage] 🔍 Searching for weapon in lists...')
      
      // Ищем оружие в списках (GTAV или кастомные)
      let weapon: AnyWeapon | null = null
      
      // Сначала ищем в GTAV
      console.log('[WeaponsPage] 🔍 Searching in GTAV weapons:', gtavWeapons.length)
      const gtavWeapon = gtavWeapons.find(w => w.name.toLowerCase() === data.weaponName.toLowerCase())
      if (gtavWeapon) {
        console.log('[WeaponsPage] ✅ Found in GTAV list:', gtavWeapon.name)
        weapon = {
          ...gtavWeapon,
          id: gtavWeapon.name,
          modelName: gtavWeapon.name,
          isGTAV: true as const
        }
      } else {
        console.log('[WeaponsPage] 🔍 Not found in GTAV, searching in custom weapons:', weapons.length)
        // Ищем в кастомных
        weapon = weapons.find(w => w.name.toLowerCase() === data.weaponName.toLowerCase()) || null
        if (weapon) {
          console.log('[WeaponsPage] ✅ Found in custom weapons:', weapon.name)
        } else {
          console.log('[WeaponsPage] ❌ Not found in custom weapons')
        }
      }
      
      if (weapon) {
        console.log('[WeaponsPage] ✅ Found weapon, setting as selected and current:', weapon.name)
        setSelectedWeapon(weapon)
        setCurrentWeapon({ name: weapon.name, id: weapon.id })
        setShowWeaponTuning(true)
        setShowWeaponMeta(true)
        setShowWeaponActions(true)
        setPanelsVisible(true)
      } else {
        console.warn('[WeaponsPage] ❌ Weapon not found in lists:', data.weaponName)
      }
    }
    
    const onWeaponUnequipped = () => {
      console.log('[WeaponsPage] 🔫 Player unequipped weapon')
      setCurrentWeapon(null)
    }
    
    ;(window as any).alt.on('weapon:equipped', onWeaponEquipped)
    ;(window as any).alt.on('weapon:unequipped', onWeaponUnequipped)
    
    return () => {
      ;(window as any).alt.off?.('weapon:equipped', onWeaponEquipped)
      ;(window as any).alt.off?.('weapon:unequipped', onWeaponUnequipped)
    }
  }, [weapons, gtavWeapons])

  const handleDownload = async (weapon: WeaponResource) => {
    try {
      setWeaponStatuses(prev => new Map(prev.set(weapon.id, 'checking')))
      const token = getAccessToken()
      if (!token) {
        throw new Error('Токен авторизации не найден')
      }
      await downloadWeaponToLocal(weapon, token)
      setWeaponStatuses(prev => new Map(prev.set(weapon.id, 'downloaded')))
      toast.success(`Оружие ${weapon.displayName} скачано`)
    } catch (err: any) {
      console.error('Ошибка скачивания:', err)
      setWeaponStatuses(prev => new Map(prev.set(weapon.id, 'not_downloaded')))
      toast.error(`Ошибка скачивания: ${err.message}`)
    }
  }

  const handleReload = async (weapon: WeaponResource) => {
    try {
      setWeaponStatuses(prev => new Map(prev.set(weapon.id, 'checking')))
      const token = getAccessToken()
      if (!token) {
        throw new Error('Токен авторизации не найден')
      }
      await downloadWeaponToLocal(weapon, token)
      setWeaponStatuses(prev => new Map(prev.set(weapon.id, 'downloaded')))
      toast.success(`Оружие ${weapon.displayName} перезагружено`)
    } catch (err: any) {
      console.error('Ошибка перезагрузки:', err)
      setWeaponStatuses(prev => new Map(prev.set(weapon.id, 'not_downloaded')))
      toast.error(`Ошибка перезагрузки: ${err.message}`)
    }
  }

  const handleGiveWeapon = (weapon: AnyWeapon) => {
    if (!isAvailable) {
      toast.error('ALT:V не доступен')
      return
    }
    
    // Emit event to give weapon to player
    if (typeof window !== 'undefined' && 'alt' in window) {
      const weaponHash = 'isGTAV' in weapon ? weapon.hash : (weapon.metadata?.weaponType || weapon.name)
      ;(window as any).alt.emit('weapon:give', {
        name: weapon.name,
        modelName: weapon.modelName || weapon.name,
        hash: weaponHash
      })
      toast.success(`Выдано оружие: ${weapon.displayName}`)
      
      // Set as current weapon
      setCurrentWeapon({ name: weapon.name, id: weapon.id })
    }
  }
  
  // Обновление параметров оружия
  const updateWeaponParameter = (param: string, value: number) => {
    if (!isAvailable || !currentWeapon) {
      console.warn('[WeaponsPage] Cannot update weapon parameters - not in game or no weapon selected')
      return
    }
    
    console.log(`[WeaponsPage] Updating weapon parameter: ${param} = ${value}`)
    
    if (typeof window !== 'undefined' && 'alt' in window) {
      ;(window as any).alt.emit('weapon:update', {
        weaponName: currentWeapon.name,
        parameter: param,
        value
      })
    }
  }
  
  // Сброс параметров оружия
  const resetWeaponParameters = () => {
    if (!selectedWeapon) return
    
    console.log('[WeaponsPage] Resetting weapon parameters')
    
    // Reload original XML from server
    const weaponName = selectedWeapon.name.toUpperCase()
    loadWeaponsMeta(weaponName).then(xmlString => {
      setWeaponMetaXml(xmlString)
      
      // Обновляем индекс
      const index = parseWeaponsMeta(xmlString)
      setWeaponsMetaIndex(index)
      toast.success('Параметры сброшены')
    }).catch(error => {
      console.error('[WeaponsPage] Failed to reset weapon parameters:', error)
      toast.error('Ошибка сброса параметров')
    })
  }

  // Получаем список оружия в зависимости от активной вкладки
  const getCurrentWeapons = (): AnyWeapon[] => {
    switch (activeTab) {
      case 'hub':
        // Фильтруем HUB оружие - исключаем GTAV оружие
        return weapons.filter(weapon => {
          // Проверяем, не является ли это GTAV оружием
          const isGTAVWeapon = gtavWeapons.some(gtav => 
            gtav.name.toLowerCase() === weapon.name.toLowerCase()
          )
          return !isGTAVWeapon
        })
      case 'gtav':
        const filteredGTAV = selectedCategory === 'All' 
          ? gtavWeapons 
          : gtavWeapons.filter(w => w.category === selectedCategory)
        
        return filteredGTAV.map(w => ({
          ...w,
          id: w.name,
          modelName: w.name,
          isGTAV: true as const
        }))
      case 'local':
        return localWeapons
      default:
        return weapons
    }
  }

  // Фильтрация оружия по поиску
  const currentWeapons = getCurrentWeapons()
  const filteredWeapons = currentWeapons
    .filter(w => {
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      return (
        w.name?.toLowerCase().includes(q) ||
        w.displayName?.toLowerCase().includes(q) ||
        w.modelName?.toLowerCase().includes(q)
      )
    })
    .sort((a, b) => {
      // Для HUB оружия - установленное сверху
      if (activeTab === 'hub') {
        const aInstalled = weaponStatuses.get(a.id) === 'downloaded'
        const bInstalled = weaponStatuses.get(b.id) === 'downloaded'
        
        if (aInstalled && !bInstalled) return -1
        if (!aInstalled && bInstalled) return 1
      }
      
      // Сортировка по имени
      return (a.displayName || a.name).localeCompare(b.displayName || b.name)
    })

  return (
    <div className="flex-1 p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Оружие</h1>
        <div className="flex items-center space-x-2 text-sm mb-4">
          <div className={`px-2 py-1 rounded-full text-xs ${isAvailable ? 'bg-green-900 text-green-300' : 'bg-orange-900 text-orange-300'}`}>
            {isAvailable ? '🎮 ALT:V' : '🌐 Browser'}
          </div>
        </div>
        
        {/* Кнопки категорий */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <button
            className={`w-full py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${
              activeTab === 'hub' 
                ? 'bg-primary-600/50 text-white border border-primary-500/30' 
                : 'bg-base-800/50 text-gray-300 hover:bg-base-700/50 border border-base-700/30 hover:border-base-600/50'
            }`}
            onClick={() => setActiveTab('hub')}
          >
            <Cloud className="w-4 h-4" />
            <span>HUB</span>
          </button>
          <button
            className={`w-full py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${
              activeTab === 'gtav' 
                ? 'bg-primary-600/50 text-white border border-primary-500/30' 
                : 'bg-base-800/50 text-gray-300 hover:bg-base-700/50 border border-base-700/30 hover:border-base-600/50'
            }`}
            onClick={() => setActiveTab('gtav')}
          >
            <Gamepad2 className="w-4 h-4" />
            <span>GTAV</span>
          </button>
          <button
            className={`w-full py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${
              activeTab === 'local' 
                ? 'bg-primary-600/50 text-white border border-primary-500/30' 
                : 'bg-base-800/50 text-gray-300 hover:bg-base-700/50 border border-base-700/30 hover:border-base-600/50'
            }`}
            onClick={() => setActiveTab('local')}
          >
            <HardDrive className="w-4 h-4" />
            <span>Local</span>
          </button>
        </div>

        {/* Селектор категорий для GTAV */}
        {activeTab === 'gtav' && (
          <div className="mb-4">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full py-2.5 px-4 bg-base-800/50 border border-base-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-all"
            >
              {gtavCategories.map(category => (
                <option key={category} value={category}>
                  {category} ({category === 'All' ? gtavWeapons.length : gtavWeapons.filter(w => w.category === category).length})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Поиск */}
        <div className="space-y-2">
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <Search className="w-4 h-4 text-gray-500" />
            </div>
            <input
              type="text"
              placeholder="Поиск по названию, модели, типу..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-base-800/50 border border-base-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {searchQuery && (
            <div className="text-xs text-gray-500">
              Найдено: <span className="text-primary-400 font-medium">{filteredWeapons.length}</span> из {currentWeapons.length}
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
          <span className="ml-2 text-gray-400">Загрузка оружия...</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span className="text-red-400 text-sm">{error}</span>
          </div>
        </div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 gap-3">
          {filteredWeapons.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {searchQuery ? `Ничего не найдено по запросу "${searchQuery}"` : 'Оружие не найдено'}
            </div>
          ) : (
            filteredWeapons.map((weapon: any) => {
              // Render archive with expandable children
              if (weapon.isArchive) {
                const isExpanded = expandedArchives.has(weapon.id)
                const isLoading = loadingArchives.has(weapon.id)
                
                return (
                  <div key={weapon.id} className="bg-base-800 border border-base-700 rounded-lg">
                    {/* Archive header */}
                    <div
                      className="p-4 cursor-pointer hover:bg-base-700 transition-colors"
                      onClick={() => toggleArchive(weapon.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {isLoading ? (
                            <Loader className="w-4 h-4 animate-spin text-primary-400" />
                          ) : isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-primary-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-primary-400" />
                          )}
                          <div>
                            <div className="text-sm font-medium text-white">
                              {weapon.displayName || weapon.name}
                            </div>
                            <div className="text-xs text-gray-400">
                              Архив • {isExpanded ? (weapon.children?.length || 0) : '...'} оружий
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2">
                            <HardDrive className="w-4 h-4 text-primary-400" />
                            <span className="text-xs text-gray-500">
                              {weapon.size ? `${(weapon.size / 1024 / 1024).toFixed(1)}MB` : 'N/A'}
                            </span>
                          </div>
                          
                          {/* Кнопка скачивания архива */}
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDownload(weapon as WeaponResource)
                              }}
                              disabled={isLoading}
                              className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Скачать архив оружий"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Archive children */}
                    {isExpanded && weapon.children && (
                      <div className="border-t border-base-700 bg-base-900/50">
                        {weapon.children.map((childWeapon: any) => {
                          const isActive = panelsVisible && selectedWeapon?.id === childWeapon.id
                          const isCurrentWeapon = currentWeapon && (currentWeapon.name === childWeapon.name || currentWeapon.id === childWeapon.id)
                          
                          return (
                            <div
                              key={childWeapon.id}
                              className={`relative p-4 ml-4 border-l-2 border-base-600 hover:bg-base-800 transition-colors cursor-pointer ${
                                isActive ? 'border-l-purple-500 bg-purple-900/10' : ''
                              }`}
                              onClick={() => {
                                setPanelsVisible(v => {
                                  const same = selectedWeapon?.id === childWeapon.id
                                  const nextVisible = same ? !v : true
                                  setShowWeaponTuning(nextVisible)
                                  setShowWeaponMeta(nextVisible)
                                  setShowWeaponActions(nextVisible)
                                  return nextVisible
                                })
                                setSelectedWeapon(childWeapon)
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className={`text-sm font-medium flex items-center space-x-2 ${isActive ? 'bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-fuchsia-400' : 'text-white'}`}>
                                    {isCurrentWeapon && (
                                      <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" title="У вас экипировано это оружие" />
                                    )}
                                    <span>{childWeapon.displayName || childWeapon.name}</span>
                                  </div>
                                  <div className="text-xs text-gray-400">{childWeapon.name}</div>
                                </div>

                                <div className="flex items-center space-x-3">
                                  {/* Убираем размер для оружий внутри архива */}

                                  <div className="flex items-center space-x-1">
                                    {/* Оружия внутри архива нельзя скачивать по отдельности */}
                                    <span className="text-xs text-gray-500 px-2 py-1 bg-gray-800 rounded">
                                      В архиве
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              }
              
              // Render regular weapon (fallback for non-archive weapons)
              const status = weaponStatuses.get(weapon.id) || 'not_downloaded'
              const isDownloaded = status === 'downloaded'
              const isChecking = status === 'checking'
              const isActive = panelsVisible && selectedWeapon?.id === weapon.id
              const isCurrentWeapon = currentWeapon && (currentWeapon.name === weapon.name || currentWeapon.id === weapon.id)
              
              return (
                <div
                  key={weapon.id}
                  className={`relative p-4 rounded-lg border transition-colors cursor-pointer ${
                    isActive
                      ? 'border-purple-500/60 bg-purple-900/10'
                      : 'bg-base-800 border-base-700 hover:bg-base-700'
                  }`}
                  onClick={() => {
                    // Toggle panels visibility
                    setPanelsVisible(v => {
                      const same = selectedWeapon?.id === weapon.id
                      const nextVisible = same ? !v : true
                      setShowWeaponTuning(nextVisible)
                      setShowWeaponMeta(nextVisible)
                      setShowWeaponActions(nextVisible)
                      return nextVisible
                    })
                    setSelectedWeapon(weapon)
                  }}
                >
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-500 to-fuchsia-500 rounded-l" />
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className={`text-sm font-medium flex items-center space-x-2 ${isActive ? 'bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-fuchsia-400' : 'text-white'}`}>
                        {isCurrentWeapon && (
                          <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" title="У вас экипировано это оружие" />
                        )}
                        <span>{weapon.displayName || weapon.name}</span>
                      </div>
                      <div className="text-xs text-gray-400">{weapon.name}</div>
                      {!('isGTAV' in weapon && weapon.isGTAV) && 'tags' in weapon && Array.isArray(weapon.tags) && weapon.tags.length > 0 && (
                        <div className="flex space-x-1 mt-1">
                          {weapon.tags.slice(0, 3).map((tag: string, idx: number) => (
                            <span
                              key={idx}
                              className="px-1 py-0.5 bg-primary-900 text-primary-300 text-xs rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      {'isGTAV' in weapon && weapon.isGTAV && (
                        <div className="flex space-x-1 mt-1">
                          <span className="px-1 py-0.5 bg-blue-900 text-blue-300 text-xs rounded">
                            {weapon.category}
                          </span>
                          <span className="px-1 py-0.5 bg-green-900 text-green-300 text-xs rounded">
                            {weapon.damage} DMG
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <HardDrive className="w-4 h-4 text-primary-400" />
                        <span className="text-xs text-gray-500">
                          {'isGTAV' in weapon && weapon.isGTAV ? 'GTA V' : 'size' in weapon && typeof weapon.size === 'number' ? `${(weapon.size / 1024 / 1024).toFixed(1)}MB` : 'N/A'}
                        </span>
                      </div>

                      <div className="flex items-center space-x-1">
                        {'isGTAV' in weapon && weapon.isGTAV ? (
                          // Для GTAV оружия - только выдача
                          <button
                            onClick={() => handleGiveWeapon(weapon)}
                            disabled={!isAvailable}
                            className="p-2 text-green-400 hover:text-green-300 hover:bg-green-900/20 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Выдать GTA V оружие"
                          >
                            <Zap className="w-4 h-4" />
                          </button>
                        ) : !isDownloaded ? (
                          // Для HUB оружия - скачивание
                          <button
                            onClick={() => handleDownload(weapon as WeaponResource)}
                            disabled={isChecking}
                            className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Скачать оружие"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        ) : (
                          // Для установленного HUB оружия - выдача и перезагрузка
                          <>
                            <button
                              onClick={() => handleGiveWeapon(weapon)}
                              disabled={!isAvailable || isChecking}
                              className="p-2 text-green-400 hover:text-green-300 hover:bg-green-900/20 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Выдать оружие"
                            >
                              <Zap className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleReload(weapon as WeaponResource)}
                              disabled={isChecking}
                              className="p-2 text-orange-400 hover:text-orange-300 hover:bg-orange-900/20 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Перезагрузить оружие"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        
                        {isChecking && (
                          <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                        )}
                      </div>
                    </div>
                  </div>
  </div>
)
            })
          )}
        </div>
      )}

      <div className="mt-6 p-4 bg-base-800 rounded-lg">
        <div className="text-xs text-gray-400">
          {isAvailable
            ? '🎮 Подключено к ALT:V - оружие будет выдано в игре'
            : '🌐 Работает в браузере - используется режим демонстрации'}
        </div>
      </div>
      
      {/* Right side panels (tuning + meta editor) in a portal */}
      {panelsVisible && selectedWeapon && (
        <Portal>
          <div 
            className="pointer-events-auto fixed top-16 bottom-4 right-6 z-[9999] flex flex-col space-y-3 transition-all duration-300" 
            style={{ left: focusMode !== 'off' ? 24 : 'calc(420px + 24px)' }}
          >
            {/* Header over panels - адаптивный под количество блоков */}
            {focusMode === 'off' && (showWeaponTuning || showWeaponMeta || showWeaponActions) && (
              <div
                className="rounded-lg p-3 flex items-center space-x-3 border border-white/10 bg-gradient-to-r from-[#141421] via-[#171927] to-[#0f1913] shadow-[inset_0_1px_0_rgba(255,255,255,.06)] cursor-pointer animate-slide-in-left"
                style={{ 
                  width: (() => {
                    const visiblePanels = [showWeaponTuning, showWeaponMeta, showWeaponActions].filter(Boolean).length
                    return `calc(${visiblePanels * 620}px + ${(visiblePanels - 1) * 12}px)`
                  })()
                }}
                title="Скрыть/показать панели"
                onClick={() => {
                  setPanelsVisible(v => {
                    const newVisible = !v
                    setShowWeaponTuning(newVisible)
                    setShowWeaponMeta(newVisible)
                    setShowWeaponActions(newVisible)
                    return newVisible
                  })
                }}
              >
                <div className="w-8 h-8 rounded-lg bg-purple-600/30 ring-1 ring-purple-500/40 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-purple-200" />
                </div>
                <div className="text-sm font-semibold truncate bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-fuchsia-400">
                  {selectedWeapon?.displayName || selectedWeapon?.name || 'Оружие'}
                </div>
              </div>
            )}
            
            <div className="flex space-x-3 flex-1 overflow-hidden">
              {/* Tuning sliders panel */}
              {(focusMode === 'off' || focusMode === 'tuning') && showWeaponTuning && (
                <div className="w-[620px] h-[calc(100vh-190px)] overflow-y-auto bg-base-900/80 backdrop-blur-sm border border-base-700 rounded-lg p-4 animate-slide-in-left">
                  <WeaponTuningSliders
                    onChange={(param, value) => {
                      updateWeaponParameter(param, value)
                      // Update XML only if available
                      if (weaponMetaXml) {
                        const updated = updateWeaponXmlValue(weaponMetaXml, param, value)
                        setWeaponMetaXml(updated)
                      }
                    }}
                    onReset={resetWeaponParameters}
                    onXmlPatch={(param, value) => {
                      if (weaponMetaXml) {
                        const updated = updateWeaponXmlValue(weaponMetaXml, param, value)
                        setWeaponMetaXml(updated)
                      }
                    }}
                    disabled={!currentWeapon || !selectedWeapon || currentWeapon.name !== selectedWeapon.name}
                    initialValues={weaponMetaXml}
                    weaponKey={selectedWeapon.name}
                    currentXml={weaponMetaXml}
                    onFocusModeToggle={() => setFocusMode(focusMode === 'tuning' ? 'off' : 'tuning')}
                    focusMode={focusMode === 'tuning'}
                  />
                </div>
              )}
              
              {/* Weapon.meta XML editor panel */}
              {(focusMode === 'off' || focusMode === 'meta') && showWeaponMeta && (
                <div className="w-[620px] h-[calc(100vh-190px)] overflow-hidden bg-base-900/80 backdrop-blur-sm border border-base-700 rounded-lg p-4 animate-slide-in-left">
                  <WeaponMetaEditor 
                    xml={weaponMetaXml} 
                    onXmlChange={setWeaponMetaXml}
                    onFocusModeToggle={() => setFocusMode(focusMode === 'meta' ? 'off' : 'meta')}
                    focusMode={focusMode === 'meta'}
                  />
                </div>
              )}
              
              {/* Weapon Actions panel */}
              {(focusMode === 'off' || focusMode === 'actions') && showWeaponActions && selectedWeapon && (
                <div 
                  className={`${
                    focusMode === 'actions' ? 'w-[400px]' : 'w-[620px]'
                  } h-[calc(100vh-190px)] overflow-hidden bg-base-900/80 backdrop-blur-sm border border-base-700 rounded-lg p-4 animate-slide-in-left transition-all duration-300`}
                >
                  <WeaponActions 
                    disabled={!currentWeapon || !selectedWeapon || currentWeapon.name !== selectedWeapon.name}
                    onAction={(action, data) => {
                      console.log('[WeaponsPage] Weapon action:', action, data)
                    }}
                    onFocusModeToggle={() => setFocusMode(focusMode === 'actions' ? 'off' : 'actions')}
                    focusMode={focusMode === 'actions'}
                    weaponName={selectedWeapon?.name || selectedWeapon?.modelName}
                  />
                </div>
              )}
            </div>
          </div>
        </Portal>
      )}
    </div>
  )
}
