import React, { useState, useEffect, useCallback } from 'react'
import { Car, Settings, MapPin, Zap, LogOut, User, Loader2, AlertCircle, Download, Play, RotateCcw, Search, X, Cloud, Gamepad2, HardDrive, Heart, Globe, Users } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import { LoginPage } from '@/pages/LoginPage'
import TuningSliders from '@/components/vehicles/TuningSliders'
import HandlingMetaEditor from '@/components/vehicles/HandlingMetaEditor'
import VehicleActions from '@/components/vehicles/VehicleActions'
import WeaponActions from '@/components/weapons/WeaponActions'
import Portal from '@/components/common/Portal'
import { fetchHandlingMeta } from '@/services/rpf'
import { updateXmlNumericValue, paramToXmlTag } from '@/utils/updateXml'
import { useAuth } from '@/hooks/useAuth'
import { useALTV } from '@/hooks/useALTV'
import { Button } from '@/components/common/Button'
import { getVehicles } from '@/services/vehicles'
import type { VehicleResource } from '@/types/vehicle'
import { logAppPathInfo } from '@/utils/pathDetection'
import { downloadVehicleWithStatus, reloadVehicle, type VehicleStatus } from '@/services/vehicleManager'
import { getAccessToken } from '@/services/auth'
import { getGTAVVehicles, getGTAVCategories, type GTAVVehicle } from '@/data/gtav-vehicles-with-categories'
import { getWeapons } from '@/services/weapons'
import type { WeaponResource } from '@/types/weapon'
import { downloadWeaponToLocal, checkWeaponExists, type WeaponStatus } from '@/services/weaponManager'
import { getGTAVWeapons, getGTAVWeaponCategories, type GTAVWeapon } from '@/data/gtav-weapons'
import WeaponTuningSliders from '@/components/weapons/WeaponTuningSliders'
import WeaponMetaEditor from '@/components/weapons/WeaponMetaEditor'
import { loadWeaponsMeta, parseWeaponsMeta, updateWeaponXmlValue, type WeaponsMetaIndex } from '@/services/weaponsMetaParser'
import { InteriorsPage } from '@/components/interiors/InteriorsPage'
import FavoritesPage from '@/components/favorites/FavoritesPage'
import WorldPage from '@/components/world/WorldPage'
import CharacterPage from '@/components/character/CharacterPage'

// Общий тип для всех машин
type AnyVehicle = VehicleResource | (GTAVVehicle & { 
  isGTAV: true
  id: string
  modelName: string
})

// Общий тип для всего оружия
type AnyWeapon = WeaponResource | (GTAVWeapon & { 
  isGTAV: true
  id: string
  modelName: string
})

const Dashboard = () => (
  <div className="flex-1 p-6">
    <div className="text-center">
      <h1 className="text-2xl font-bold text-white mb-4">Добро пожаловать!</h1>
      <p className="text-gray-400">Выберите модуль из меню слева</p>
    </div>
  </div>
)

const VehiclesPage = () => {
  
  const { spawnVehicle, destroyVehicle, currentVehicle, isAvailable, updateHandling, resetHandling, requestHandlingMeta } = useALTV({
    onVehicleSpawned: (data) => {
      toast.success(`${data.modelName} заспавнен`)
    },
    onVehicleDestroyed: () => {
      toast('Автомобиль удалён', { icon: '🗑️' })
    },
    onPlayerEnteredVehicle: (data) => {
      console.log('[VehiclesPage] 🚗 Player entered vehicle:', data.modelName)
      console.log('[VehiclesPage] 🔍 Searching for vehicle in lists...')
      
      // Ищем машину в списках (GTAV или кастомные)
      let vehicle: AnyVehicle | null = null
      
      // Сначала ищем в GTAV
      console.log('[VehiclesPage] 🔍 Searching in GTAV vehicles:', gtavVehicles.length)
      const gtavVehicle = gtavVehicles.find(v => v.name.toLowerCase() === data.modelName.toLowerCase())
      if (gtavVehicle) {
        console.log('[VehiclesPage] ✅ Found in GTAV list:', gtavVehicle.name)
        vehicle = {
          ...gtavVehicle,
          id: gtavVehicle.name,
          modelName: gtavVehicle.name,
          isGTAV: true as const
        }
      } else {
        console.log('[VehiclesPage] 🔍 Not found in GTAV, searching in custom vehicles:', vehicles.length)
        // Ищем в кастомных
        vehicle = vehicles.find(v => v.name.toLowerCase() === data.modelName.toLowerCase()) || null
        if (vehicle) {
          console.log('[VehiclesPage] ✅ Found in custom vehicles:', vehicle.name)
        } else {
          console.log('[VehiclesPage] ❌ Not found in custom vehicles')
        }
      }
      
      if (vehicle) {
        console.log('[VehiclesPage] ✅ Found vehicle, setting as selected:', vehicle.name)
        setSelectedVehicle(vehicle)
        setShowTuning(true)
        setShowMeta(true)
        setShowActions(true)
        setPanelsVisible(true)
        // Не помечаем как ручное сворачивание при автоматическом открытии при входе в автомобиль
      } else {
        console.warn('[VehiclesPage] ❌ Vehicle not found in lists:', data.modelName)
      }
    },
    onHandlingMetaReceived: (data) => {
      console.log('[VehiclesPage] Received handling meta from server:', data.modelName)
      setHandlingMetaXml(data.xml)
      currentXmlVehicleName.current = data.modelName
      vehicleXmlCache.current.set(data.modelName, data.xml)
      toast.success(`Handling загружен для ${data.modelName}`)
    },
    onLocalVehiclesReceived: (vehicles) => {
      console.log('[VehiclesPage] Local vehicles received:', vehicles.length)
      setLocalVehicles(vehicles)
    }
  })
  // UI state for side panels
  const [selectedVehicle, setSelectedVehicle] = useState<AnyVehicle | null>(null)
  const [handlingMetaXml, setHandlingMetaXml] = useState<string>('')
  const [showTuning, setShowTuning] = useState(false)
  const [showMeta, setShowMeta] = useState(false)
  const [showActions, setShowActions] = useState(false)
  const [focusMode, setFocusMode] = useState<'off' | 'tuning' | 'actions'>('off') // Режим фокуса: выкл / на параметры / на действия
  const [userManuallyCollapsed, setUserManuallyCollapsed] = useState(false) // Отслеживание ручного сворачивания панелей
  const panelLeft = 420 // сдвиг от левого края (примерно ширина меню + отступ)
  const [activeModel] = useState<string>('')
  const [panelsVisible, setPanelsVisible] = useState<boolean>(false)
  const [pendingModelToSelect, setPendingModelToSelect] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'hub' | 'gtav' | 'local'>('hub')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  
  // GTAV машины загружаются локально
  const [gtavVehicles] = useState<GTAVVehicle[]>(() => getGTAVVehicles())
  const [gtavCategories] = useState<string[]>(() => ['All', ...getGTAVCategories()])
  
  // Local машины пользователя
  const [localVehicles, setLocalVehicles] = useState<AnyVehicle[]>([])
  
  // Функция загрузки локальных машин
  const loadLocalVehicles = useCallback(async () => {
    if (activeTab !== 'local') return
    
    try {
      console.log('[VehiclesPage] Loading local vehicles...')
      
      // Запрашиваем локальные машины с сервера
      if (typeof window !== 'undefined' && 'alt' in window) {
        ;(window as any).alt.emit('meshhub:vehicle:local:list:request')
      }
    } catch (error) {
      console.error('[VehiclesPage] Error loading local vehicles:', error)
    }
  }, [activeTab])

  // Функция определения, нужно ли показывать XML редактор
  const shouldShowXmlEditor = useCallback((vehicle: AnyVehicle): boolean => {
    // Для GTAV машин - всегда показываем XML (есть доступ к handling.meta)
    if ('isGTAV' in vehicle && vehicle.isGTAV) {
      return true
    }
    
    // Для HUB машин - всегда показываем XML
    if (activeTab === 'hub') {
      return true
    }
    
    // Для LOCAL машин - показываем только для streaming ресурсов
    if (activeTab === 'local' && vehicle) {
      // Если у машины есть флаг isStreaming, используем его
      if ('isStreaming' in vehicle) {
        return vehicle.isStreaming === true
      }
      // По умолчанию для LOCAL машин считаем streaming
      return true
    }
    
    // По умолчанию показываем
    return true
  }, [activeTab])
  
  // Принудительно синхронизируем GTAV машины с клиентом при инициализации
  useEffect(() => {
    console.log('[VehiclesPage] 🔍 Checking Alt:V availability...')
    console.log('[VehiclesPage] typeof window:', typeof window)
    console.log('[VehiclesPage] alt in window:', 'alt' in window)
    console.log('[VehiclesPage] gtavVehicles.length:', gtavVehicles.length)
    
    if (typeof window !== 'undefined' && 'alt' in window && gtavVehicles.length > 0) {
      try {
        const gtavList = gtavVehicles.map(v => ({
          name: v.name,
          modelName: v.name,
          displayName: v.displayName,
          category: 'gtav'
        }))
        
        console.log('[VehiclesPage] 🚗 Sending GTAV sync to Alt:V...')
        ;(window as any).alt.emit('vehicles:list:sync', gtavList)
        console.log('[VehiclesPage] ✅ Initial GTAV sync sent:', gtavList.length, 'vehicles')
      } catch (e) {
        console.warn('[VehiclesPage] Failed initial GTAV sync:', e)
      }
    } else {
      console.warn('[VehiclesPage] ⚠️  Cannot sync GTAV vehicles - not in Alt:V or no vehicles')
    }
  }, [gtavVehicles])

  // Загружаем локальные машины при переключении на Local вкладку
  useEffect(() => {
    if (activeTab === 'local') {
      loadLocalVehicles()
    }
  }, [activeTab, loadLocalVehicles])

  // Хранилище изменённых XML для каждой машины (ключ = vehicle.name)
  const vehicleXmlCache = React.useRef<Map<string, string>>(new Map())
  // Отслеживаем какой машине принадлежит текущий XML
  const currentXmlVehicleName = React.useRef<string | null>(null)

  // Сохраняем изменения XML в кэш при каждом обновлении
  useEffect(() => {
    if (selectedVehicle && handlingMetaXml && currentXmlVehicleName.current === selectedVehicle.name) {
      console.log('[VehiclesPage] Updating XML cache for', selectedVehicle.name)
      vehicleXmlCache.current.set(selectedVehicle.name, handlingMetaXml)
    }
  }, [handlingMetaXml, selectedVehicle])

  // When vehicle selected or entered, show panels and request handling meta
  useEffect(() => {
    if (!selectedVehicle) return
    setShowTuning(true)
    setShowMeta(true)
    setShowActions(true)
    setPanelsVisible(true)
    // Сбрасываем флаг ручного сворачивания при смене автомобиля
    setUserManuallyCollapsed(false)
    
    // Проверяем, есть ли уже изменённый XML в кэше
    const cachedXml = vehicleXmlCache.current.get(selectedVehicle.name)
    if (cachedXml) {
      console.log('[VehiclesPage] Loading XML from cache for', selectedVehicle.name)
      setHandlingMetaXml(cachedXml)
      // Помечаем, что текущий XML принадлежит этой машине
      currentXmlVehicleName.current = selectedVehicle.name
      return
    }
    
    // Определяем категорию машины
    const vehicleCategory: 'gtav' | 'local' | 'meshhub' = 
      'isGTAV' in selectedVehicle && selectedVehicle.isGTAV ? 'gtav' :
      'category' in selectedVehicle && (selectedVehicle.category === 'local' || selectedVehicle.category === 'meshhub' || selectedVehicle.category === 'gtav') ? selectedVehicle.category :
      'meshhub'

    // Для GTAV машин - сразу запрашиваем через Alt:V (локальный индекс)
    if (vehicleCategory === 'gtav' && isAvailable) {
      console.log('[VehiclesPage] Requesting GTAV handling for', selectedVehicle.name)
      requestHandlingMeta(selectedVehicle.name, 'gtav')
      return
    }

    // Если нет в кэше — загружаем реальный handling.meta с бэка
    console.log('[VehiclesPage] Fetching fresh XML for', selectedVehicle.name)
    fetchHandlingMeta(selectedVehicle.name)
      .then(xml => {
        setHandlingMetaXml(xml)
        // Помечаем, что текущий XML принадлежит этой машине
        currentXmlVehicleName.current = selectedVehicle.name
        // Сохраняем оригинал в кэш при первой загрузке
        vehicleXmlCache.current.set(selectedVehicle.name, xml)
      })
      .catch(() => {
        // fallback через ALT (если будет предоставлен) или оставить пусто
        if (typeof window !== 'undefined' && 'alt' in window) {
          requestHandlingMeta(selectedVehicle.modelName || selectedVehicle.name, vehicleCategory)
        }
      })
  }, [selectedVehicle, requestHandlingMeta, isAvailable])

  // Listen for handling.meta response
  useEffect(() => {
    if (!(typeof window !== 'undefined' && 'alt' in window)) return
    
    const onMeta = (data: { modelName: string; xml: string }) => {
      console.log('[VehiclesPage] onMeta: Received XML for', data.modelName)
      setHandlingMetaXml(data.xml || '')
      // Обновляем кэш - используем callback для доступа к selectedVehicle
      setSelectedVehicle(current => {
        if (current && data.modelName === (current.modelName || current.name)) {
          currentXmlVehicleName.current = current.name
          vehicleXmlCache.current.set(current.name, data.xml || '')
        }
        return current
      })
    }
    
    const onPanelOpened = () => {
      console.log('[VehiclesPage] Panel opened via F10 - checking auto-expand logic')
      // Если пользователь не сворачивал панели вручную, автоматически разворачиваем все блоки
      if (!userManuallyCollapsed) {
        console.log('[VehiclesPage] Auto-expanding panels (user never manually collapsed)')
        setShowTuning(true)
        setShowMeta(true)
        setShowActions(true)
        setPanelsVisible(true)
      } else {
        console.log('[VehiclesPage] User manually collapsed panels before - not auto-expanding')
      }
    }
    const onPanelClosed = () => {
      console.log('[VehiclesPage] Panel closed - resetting manual collapse flag')
      // Сбрасываем флаг ручного сворачивания при закрытии панели
      setUserManuallyCollapsed(false)
    }
    
    ;(window as any).alt.on('handling:meta:response', onMeta)
    ;(window as any).alt.on('altv:panel:opened', onPanelOpened)
    ;(window as any).alt.on('altv:panel:closed', onPanelClosed)
    
    return () => {
      (window as any).alt.off?.('handling:meta:response', onMeta)
      ;(window as any).alt.off?.('altv:panel:opened', onPanelOpened)
      ;(window as any).alt.off?.('altv:panel:closed', onPanelClosed)
    }
  }, [currentVehicle])
  
  console.log('[VehiclesPage] useALTV isAvailable:', isAvailable)

  const [vehicles, setVehicles] = useState<VehicleResource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [vehicleStatuses, setVehicleStatuses] = useState<Map<string, VehicleStatus>>(new Map())
  const [pendingRestartIds, setPendingRestartIds] = useState<Set<string>>(new Set())

  // Загружаем автомобили с backend
  useEffect(() => {
    const loadVehicles = async () => {
      try {
        setLoading(true)
        setError(null)
        const vehiclesList = await getVehicles()
        setVehicles(vehiclesList)
        
        // Запросить у сервера список уже установленных ресурсов (Alt:V)
        if (typeof window !== 'undefined' && 'alt' in window) {
          try {
            // Просто запрашиваем полный список установленных (без параметров)
            ;(window as any).alt.emit('vehicle:installed:list:request')
          } catch (e) {
            console.warn('[Installed] Request failed:', e)
          }
        }
        
        // В браузере - показываем все как не скачанные
        const statusMap = new Map<string, VehicleStatus>()
        for (const vehicle of vehiclesList) {
          statusMap.set(vehicle.id, 'not_downloaded')
        }
        setVehicleStatuses(statusMap)
        
        // Синхронизируем ВСЕ машины (кастомные + GTAV) с клиентом для автодетекта
        if (typeof window !== 'undefined' && 'alt' in window) {
          try {
            // Объединяем кастомные машины с GTAV
            const gtavList = gtavVehicles.map(v => ({
              name: v.name,
              modelName: v.name,
              displayName: v.displayName,
              category: 'gtav'
            }))
            
            const allVehicles = [...vehiclesList, ...gtavList]
            console.log('[VehiclesPage] 🚗 Syncing vehicles with client:')
            console.log('[VehiclesPage] 📊 Custom vehicles:', vehiclesList.length)
            console.log('[VehiclesPage] 📊 GTAV vehicles:', gtavList.length)
            console.log('[VehiclesPage] 📊 Total vehicles:', allVehicles.length)
            console.log('[VehiclesPage] 📋 First 5 GTAV vehicles:', gtavList.slice(0, 5).map(v => v.name))
            
            // ВАЖНО: Отправляем GTAV машины даже если кастомных нет
            if (gtavList.length > 0) {
              ;(window as any).alt.emit('vehicles:list:sync', allVehicles)
              console.log('[VehiclesPage] ✅ Synced all vehicles with client:', allVehicles.length)
            } else {
              console.warn('[VehiclesPage] ⚠️  No GTAV vehicles to sync!')
            }
          } catch (e) {
            console.warn('[VehiclesPage] Failed to sync vehicles:', e)
          }
        }
        
      } catch (err: any) {
        setError(err.message)
        console.error('Ошибка загрузки автомобилей:', err)
        toast.error('Не удалось загрузить список автомобилей')
      } finally {
        setLoading(false)
      }
    }
    
    loadVehicles()
  }, [gtavVehicles])

  // Дожимаем выбор машины, если событие пришло раньше, чем загрузился список
  useEffect(() => {
    if (!pendingModelToSelect) return
    const found = vehicles.find(v => (v.modelName || v.name) === pendingModelToSelect)
    if (found) {
      setSelectedVehicle(found)
      setPendingModelToSelect(null)
    }
  }, [vehicles, pendingModelToSelect])
  
  // Сервер сообщил об успешной загрузке архива
  useEffect(() => {
    if (typeof window !== 'undefined' && 'alt' in window) {
      const handleDownloaded = (data: { success: boolean; vehicleId: string; vehicleName: string; message: string }) => {
        
        if (data.success) {
          // Помечаем как скачанный, но требующий рестарта
          setVehicleStatuses(prev => new Map(prev.set(data.vehicleId, 'downloaded')))
          setPendingRestartIds(prev => {
            const next = new Set(prev)
            next.add(data.vehicleId)
            return next
          })
          toast.success(`${data.vehicleName} успешно загружен!\nТребуется рестарт сервера`, {
            duration: 5000,
          })
        } else {
          setVehicleStatuses(prev => new Map(prev.set(data.vehicleId, 'not_downloaded')))
          setPendingRestartIds(prev => {
            const next = new Set(prev)
            next.delete(data.vehicleId)
            return next
          })
          toast.error(`Ошибка загрузки ${data.vehicleName}:\n${data.message}`, {
            duration: 5000,
          })
        }
      }

      const handleHandlingSaved = (data: { success: boolean; fileName?: string; filePath?: string; downloadsPath?: string; error?: string }) => {
        if (data.success) {
          toast.success(`Файл ${data.fileName} сохранён в папку Downloads!\nПуть: ${data.downloadsPath}`, {
            duration: 7000,
          })
        } else {
          toast.error(`Ошибка сохранения: ${data.error}`, {
            duration: 5000,
          })
        }
      }

      const handleVehicleSpawned = (data: { vehicleId: number; modelName: string; position: any }) => {
        console.log('[VehiclesPage] Vehicle spawned successfully:', data.modelName)
        toast.success(`Машина ${data.modelName} успешно заспавнена!`, {
          duration: 3000,
        })
      }

      const handleVehicleSpawnError = (data: { modelName: string; error: string; details: string }) => {
        console.log('[VehiclesPage] Vehicle spawn error:', data.error)
        toast.error(`Ошибка спавна ${data.modelName}:\n${data.error}`, {
          duration: 5000,
        })
      }

      ;(window as any).alt.on('vehicle:downloaded', handleDownloaded)
      ;(window as any).alt.on('meshhub:vehicle:handling:saved', handleHandlingSaved)
      ;(window as any).alt.on('vehicle:spawned', handleVehicleSpawned)
      ;(window as any).alt.on('vehicle:spawn:error', handleVehicleSpawnError)
      return () => {
        (window as any).alt.off?.('vehicle:downloaded', handleDownloaded)
        ;(window as any).alt.off?.('meshhub:vehicle:handling:saved', handleHandlingSaved)
        ;(window as any).alt.off?.('vehicle:spawned', handleVehicleSpawned)
        ;(window as any).alt.off?.('vehicle:spawn:error', handleVehicleSpawnError)
      }
    }
  }, [])

  // Получить список уже установленных от сервера и обновить статусы
  useEffect(() => {
    if (!(typeof window !== 'undefined' && 'alt' in window)) return
    
    const onInstalled = (installedNames: string[]) => {
      
      // Используем callback чтобы получить актуальный список vehicles
      setVehicles(currentVehicles => {
        
        
        
        // Обновляем статусы установленных машин
        // Логика обновления статусов будет в setVehicleStatuses ниже
        
        setVehicleStatuses(prev => {
          const m = new Map(prev)
          for (const v of currentVehicles) {
            if (installedNames?.includes(v.name)) {
              m.set(v.id, 'downloaded')
            }
          }
          return m
        })
        
        // Сбросить флаг ожидания рестарта для уже установленных
        setPendingRestartIds(prev => {
          const next = new Set(prev)
          for (const v of currentVehicles) {
            if (installedNames?.includes(v.name)) next.delete(v.id)
          }
          return next
        })
        
        return currentVehicles // Возвращаем без изменений
      })
    }
    
    ;(window as any).alt.on('vehicle:installed:list:response', onInstalled)
    return () => (window as any).alt.off?.('vehicle:installed:list:response', onInstalled)
  }, [])

  // Обработчик получения локальных машин
  useEffect(() => {
    const onLocalVehicles = (vehicles: any[]) => {
      console.log('[VehiclesPage] Local vehicles received from server:', vehicles.length)
      setLocalVehicles(vehicles)
    }
    
    if ('alt' in window) {
      ;(window as any).alt.on('meshhub:vehicle:local:list:response', onLocalVehicles)
      return () => (window as any).alt.off?.('meshhub:vehicle:local:list:response', onLocalVehicles)
    }
  }, [])

  // Получаем список машин в зависимости от активной вкладки
  const getCurrentVehicles = (): AnyVehicle[] => {
    switch (activeTab) {
      case 'hub':
        return vehicles
      case 'gtav':
        const filteredGTAV = selectedCategory === 'All' 
          ? gtavVehicles 
          : gtavVehicles.filter(v => v.category === selectedCategory)
        
        return filteredGTAV.map(v => ({
          ...v,
          id: v.name,
          modelName: v.name,
          isGTAV: true as const
        }))
      case 'local':
        return localVehicles
      default:
        return vehicles
    }
  }

         // Фильтрация машин по поиску
         const currentVehicles = getCurrentVehicles()
         const filteredVehicles = currentVehicles
           .filter(v => {
             if (!searchQuery.trim()) return true
             const q = searchQuery.toLowerCase()
             return (
               v.name?.toLowerCase().includes(q) ||
               v.displayName?.toLowerCase().includes(q) ||
               v.modelName?.toLowerCase().includes(q)
             )
           })
           .sort((a, b) => {
             // Для HUB машин - установленные сверху
             if (activeTab === 'hub') {
               const aInstalled = vehicleStatuses.get(a.id) === 'downloaded'
               const bInstalled = vehicleStatuses.get(b.id) === 'downloaded'
               
               if (aInstalled && !bInstalled) return -1
               if (!aInstalled && bInstalled) return 1
             }
             
             // Сортировка по имени
             return (a.displayName || a.name).localeCompare(b.displayName || b.name)
           })

         // Проверяем, есть ли предложение заспавнить несуществующую машину
         const shouldShowSpawnSuggestion = searchQuery.trim() && 
           filteredVehicles.length === 0 && 
           searchQuery.length >= 3

         const handleSpawnSuggestion = () => {
           if (!searchQuery.trim()) return
           
           console.log(`[VehiclesPage] Spawning suggested vehicle: ${searchQuery}`)
           spawnVehicle(searchQuery)
           toast.success(`Заспавнена машина: ${searchQuery}`)
         }

  return (
    <div className="flex-1 p-6 relative">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Автомобили</h1>
        <div className="flex items-center space-x-2 text-sm mb-4">
          <div className={`px-2 py-1 rounded-full text-xs ${
            isAvailable ? 'bg-green-900 text-green-300' : 'bg-orange-900 text-orange-300'
          }`}>
            {isAvailable ? '🎮 ALT:V' : '🌐 Browser'}
          </div>
          {currentVehicle && (
            <div className="px-2 py-1 bg-blue-900 text-blue-300 rounded-full text-xs">
              Current: {currentVehicle.modelName}
            </div>
          )}
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
                  {category} ({category === 'All' ? gtavVehicles.length : gtavVehicles.filter(v => v.category === category).length})
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
              placeholder="Поиск по названию, модели, производителю..."
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
                     Найдено: <span className="text-primary-400 font-medium">{filteredVehicles.length}</span> из {currentVehicles.length}
                   </div>
                 )}
                 
                 {/* Предложение заспавнить несуществующую машину */}
                 {shouldShowSpawnSuggestion && (
                   <div className="mt-3 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                     <div className="flex items-center justify-between">
                       <div className="flex items-center space-x-3">
                         <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                           <Car className="w-4 h-4 text-blue-400" />
                         </div>
                         <div>
                           <p className="text-blue-300 text-sm font-medium">
                             Машина "{searchQuery}" не найдена в списке
                           </p>
                           <p className="text-blue-400/70 text-xs">
                             Хотите заспавнить её напрямую?
                           </p>
                         </div>
                       </div>
                       <Button
                         onClick={handleSpawnSuggestion}
                         variant="primary"
                         size="sm"
                         className="flex items-center space-x-2"
                       >
                         <Play className="w-4 h-4" />
                         <span>Заспавнить</span>
                       </Button>
                     </div>
                   </div>
                 )}
        </div>
      </div>

      {/* Vehicle Grid */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
          <span className="ml-2 text-gray-400">Загрузка автомобилей...</span>
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
          {filteredVehicles.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {searchQuery ? `Ничего не найдено по запросу "${searchQuery}"` : 'Автомобили не найдены'}
            </div>
          ) : (
            filteredVehicles.map((vehicle) => {
              const vehicleStatus = vehicleStatuses.get(vehicle.id) || 'not_downloaded'
              const isDownloaded = vehicleStatus === 'downloaded'
              const isChecking = vehicleStatus === 'checking'
              const isPendingRestart = pendingRestartIds.has(vehicle.id)
              
              const handleDownload = async () => {
                if ('isGTAV' in vehicle && vehicle.isGTAV) return // GTAV машины не скачиваются
                try {
                  setVehicleStatuses(prev => new Map(prev.set(vehicle.id, 'checking')))
                  const isAltV = typeof window !== 'undefined' && 'alt' in window
                  console.log(`[Download] Alt:V available: ${isAltV}`)
                  if (isAltV) {
                    const token = getAccessToken()
                    if (!token) {
                      console.error('[Download] Токен не найден в localStorage')
                      throw new Error('Токен авторизации не найден')
                    }
                    console.log(`[Download] Отправляем запрос на server-side скачивание: ${vehicle.name}`)
                    console.log(`[Download] Vehicle ID: ${vehicle.id}`)
                    console.log(`[Download] Token: ${token.substring(0, 20)}...`)
                    ;(window as any).alt.emit('vehicle:download', {
                      vehicleId: vehicle.id,
                      vehicleName: vehicle.name,
                      token: token
                    })
                    console.log('[Download] Событие отправлено, ожидаем ответ от сервера...')
                  } else {
                    console.log('[Download] Браузерный режим - скачивание через blob')
                    await downloadVehicleWithStatus(vehicle as VehicleResource)
                  }
                } catch (error) {
                  console.error('Ошибка скачивания:', error)
                  setVehicleStatuses(prev => new Map(prev.set(vehicle.id, 'not_downloaded')))
                  setPendingRestartIds(prev => { const next = new Set(prev); next.delete(vehicle.id); return next })
                }
              }
              
              const handleReload = async () => {
                if ('isGTAV' in vehicle && vehicle.isGTAV) return // GTAV машины не перезагружаются
                try {
                  setVehicleStatuses(prev => new Map(prev.set(vehicle.id, 'checking')))
                  await reloadVehicle(vehicle as VehicleResource)
                  setVehicleStatuses(prev => new Map(prev.set(vehicle.id, 'downloaded')))
                  setPendingRestartIds(prev => { const next = new Set(prev); next.add(vehicle.id); return next })
                } catch (error) {
                  console.error('Ошибка перезагрузки:', error)
                  setVehicleStatuses(prev => new Map(prev.set(vehicle.id, 'not_downloaded')))
                  setPendingRestartIds(prev => { const next = new Set(prev); next.delete(vehicle.id); return next })
                }
              }
              
              const handleSpawn = () => {
                spawnVehicle(vehicle.modelName || vehicle.name)
              }
              
              const isActive = panelsVisible && selectedVehicle?.id === vehicle.id
              const isCurrentVehicle = currentVehicle && (currentVehicle.modelName === vehicle.name || currentVehicle.modelName === vehicle.modelName)
              return (
                <div
                  key={vehicle.id}
                  className={`relative p-4 rounded-lg border transition-colors ${
                    isActive
                      ? 'border-fuchsia-500/60 bg-fuchsia-900/10'
                      : 'bg-base-800 border-base-700 hover:bg-base-700'
                  }`}
                  onClick={() => {
                    // если кликаем по уже выбранной — переключаем видимость
                    setPanelsVisible(v => {
                      const same = selectedVehicle?.id === vehicle.id
                      const nextVisible = same ? !v : true
                      setShowTuning(nextVisible)
                      setShowMeta(nextVisible)
                      return nextVisible
                    })
                    setSelectedVehicle(vehicle)
                  }}
                >
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-pink-500 to-fuchsia-500 rounded-l" />
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-medium flex items-center space-x-2">
                        {isCurrentVehicle && (
                          <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" title="Вы в этой машине" />
                        )}
                        <span className={isActive ? 'bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-fuchsia-400' : 'text-white'}>
                          {vehicle.displayName || vehicle.name}
                        </span>
                        {isPendingRestart && (
                          <span className="inline-flex items-center h-5 px-2 text-[10px] leading-none rounded-full bg-orange-900 text-orange-300">Нужен рестарт</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400">{vehicle.name}</div>
                      {!('isGTAV' in vehicle && vehicle.isGTAV) && 'tags' in vehicle && vehicle.tags && vehicle.tags.length > 0 && (
                        <div className="flex space-x-1 mt-1">
                          {vehicle.tags.slice(0, 3).map((tag: string, index: number) => (
                            <span key={index} className="px-1 py-0.5 bg-primary-900 text-primary-300 text-xs rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      {/* Информация о файле */}
                      <div className="flex items-center space-x-2">
                        <Car className="w-4 h-4 text-primary-400" />
                        <span className="text-xs text-gray-500">
                          {'isGTAV' in vehicle && vehicle.isGTAV ? 'GTA V' : `size` in vehicle ? `${(vehicle.size / 1024 / 1024).toFixed(1)}MB` : 'N/A'}
                        </span>
                      </div>
                      
                      {/* Кнопки управления */}
                      <div className="flex items-center space-x-1">
                        {'isGTAV' in vehicle && vehicle.isGTAV ? (
                          // Для GTAV машин - только спавн
                          <button
                            onClick={handleSpawn}
                            disabled={!isAvailable}
                            className="p-2 text-green-400 hover:text-green-300 hover:bg-green-900/20 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Заспавнить GTA V автомобиль"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        ) : !isDownloaded ? (
                          // Для HUB машин - скачивание
                          <button
                            onClick={handleDownload}
                            disabled={isChecking}
                            className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Скачать автомобиль"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        ) : (
                          // Для установленных HUB машин - спавн и перезагрузка
                          <>
                            <button
                              onClick={handleSpawn}
                              disabled={!isAvailable || isChecking || isPendingRestart}
                              className="p-2 text-green-400 hover:text-green-300 hover:bg-green-900/20 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title={isPendingRestart ? 'Требуется рестарт сервера' : 'Заспавнить автомобиль'}
                            >
                              <Play className="w-4 h-4" />
                            </button>
                            <button
                              onClick={handleReload}
                              disabled={isChecking}
                              className="p-2 text-orange-400 hover:text-orange-300 hover:bg-orange-900/20 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Перезагрузить автомобиль"
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

      {/* Current Vehicle Controls */}
      {currentVehicle && (
        <div className="mt-6 p-4 bg-base-800 rounded-lg">
          <h3 className="text-sm font-medium text-white mb-3">Текущий автомобиль</h3>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-white">{currentVehicle.modelName}</div>
              <div className="text-xs text-gray-400">ID: {currentVehicle.id}</div>
            </div>
            <Button
              onClick={() => destroyVehicle()}
              variant="danger"
              size="sm"
              className="text-xs"
            >
              Удалить
            </Button>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="mt-6 p-4 bg-base-800 rounded-lg">
        <div className="text-xs text-gray-400">
          {isAvailable 
            ? '🎮 Подключено к ALT:V - автомобили будут заспавнены в игре'
            : '🌐 Работает в браузере - используется режим демонстрации'
          }
        </div>
      </div>

      {/* Right side panels (tuning + meta editor) in a portal to escape layout */}
      {panelsVisible && (
        <Portal>
        <div 
          className="pointer-events-auto fixed top-16 bottom-4 z-[9999] flex flex-col space-y-3 transition-all duration-300" 
          style={{ 
            left: focusMode !== 'off' ? 24 : panelLeft, 
            right: 24 
          }}
        >
          {/* Header over both panels - скрыть в режиме фокуса */}
          {focusMode === 'off' && (
            <div
              className="w-[1880px] max-w-[calc(100vw-480px)] rounded-lg p-3 flex items-center space-x-3 border border-white/10 bg-gradient-to-r from-[#141421] via-[#171927] to-[#0f1913] shadow-[inset_0_1px_0_rgba(255,255,255,.06)] cursor-pointer animate-slide-in-left"
              title="Скрыть/показать панели"
              onClick={() => {
                setPanelsVisible(v => {
                  const newVisible = !v
                  if (!newVisible) {
                    // Пользователь сворачивает панели вручную
                    setUserManuallyCollapsed(true)
                    console.log('[VehiclesPage] User manually collapsed panels')
                  }
                  setShowTuning(newVisible)
                  setShowMeta(newVisible)
                  setShowActions(newVisible)
                  return newVisible
                })
              }}
            >
              <div className="w-8 h-8 rounded-lg bg-violet-600/30 ring-1 ring-violet-500/40 flex items-center justify-center">
                <Car className="w-4 h-4 text-violet-200" />
              </div>
              <div className="text-sm font-semibold truncate bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-fuchsia-400">
                {selectedVehicle?.displayName || selectedVehicle?.name || activeModel || 'Автомобиль'}
              </div>
            </div>
          )}
          <div className="flex space-x-3 flex-1 overflow-hidden">
          {/* Tuning sliders panel - показывать если фокус выкл или фокус на тюнинге */}
          {(() => {
            const vehicleStatus = selectedVehicle ? vehicleStatuses.get(selectedVehicle.id) : null
            console.log('[TuningPanel] Check visibility:')
            console.log('  - focusMode:', focusMode)
            console.log('  - showTuning:', showTuning)
            console.log('  - selectedVehicle:', selectedVehicle?.name)
            console.log('  - vehicleStatus:', vehicleStatus)
            console.log('  - shouldShow:', (focusMode === 'off' || focusMode === 'tuning') && showTuning && selectedVehicle && vehicleStatus === 'downloaded')
            return null
          })()}
          {(focusMode === 'off' || focusMode === 'tuning') && showTuning && selectedVehicle && (
            vehicleStatuses.get(selectedVehicle.id) === 'downloaded' || 
            ('isGTAV' in selectedVehicle && selectedVehicle.isGTAV)
          ) && (
            <div className="w-[620px] h-[calc(100vh-190px)] overflow-y-auto bg-base-900/80 backdrop-blur-sm border border-base-700 rounded-lg p-4 animate-slide-in-left">
              <div className="text-sm font-semibold text-white mb-3">Параметры</div>
              <TuningSliders
                onChange={(param, value) => updateHandling(param, value)}
                onReset={() => {
                  // Для GTAV машин - перезагружаем оригинальный handling из локального индекса
                  if (selectedVehicle && 'isGTAV' in selectedVehicle && selectedVehicle.isGTAV) {
                    console.log('[VehiclesPage] Resetting GTAV vehicle - reloading original handling')
                    requestHandlingMeta(selectedVehicle.name, 'gtav')
                  } else {
                    // Для кастомных машин - обычный сброс
                    resetHandling()
                  }
                }}
                onXmlPatch={(param, value) => {
                  const tag = paramToXmlTag[param]
                  if (!tag || !handlingMetaXml) return
                  setHandlingMetaXml(prev => updateXmlNumericValue(prev, tag, value))
                }}
                disabled={!currentVehicle || !selectedVehicle || ![selectedVehicle.name, selectedVehicle.modelName].includes(currentVehicle.modelName)}
                initialValues={handlingMetaXml}
                vehicleKey={selectedVehicle.name}
                currentXml={handlingMetaXml}
                onFocusModeToggle={() => setFocusMode(focusMode === 'tuning' ? 'off' : 'tuning')}
                focusMode={focusMode === 'tuning'}
              />
            </div>
          )}
          {/* Handling.meta editor panel */}
          {focusMode === 'off' && showMeta && selectedVehicle && shouldShowXmlEditor(selectedVehicle) && (
            <div className="w-[620px] h-[calc(100vh-190px)] overflow-hidden bg-base-900/80 backdrop-blur-sm border border-base-700 rounded-lg p-4 animate-slide-in-left">
              <div className="text-sm font-semibold text-white mb-2">handling.meta</div>
              <HandlingMetaEditor xml={handlingMetaXml} onXmlChange={setHandlingMetaXml} />
            </div>
          )}
          
          {/* Vehicle actions panel - показывать если фокус выкл или фокус на действиях */}
          {(focusMode === 'off' || focusMode === 'actions') && showActions && selectedVehicle && (
            <div 
              className={`${
                focusMode === 'actions' ? 'w-[400px]' : 'w-[620px]'
              } h-[calc(100vh-190px)] overflow-hidden bg-base-900/80 backdrop-blur-sm border border-base-700 rounded-lg p-4 animate-slide-in-left transition-all duration-300`}
            >
              <VehicleActions 
                disabled={!currentVehicle || !selectedVehicle || ![selectedVehicle.name, selectedVehicle.modelName].includes(currentVehicle.modelName)}
                onAction={(action, data) => {
                  console.log('[VehiclesPage] Vehicle action:', action, data)
                }}
                onFocusModeToggle={() => setFocusMode(focusMode === 'actions' ? 'off' : 'actions')}
                focusMode={focusMode === 'actions'}
                vehicleName={selectedVehicle?.name || selectedVehicle?.modelName}
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

const WeaponsPage = () => {
  const { isAvailable } = useALTV()
  const [weapons, setWeapons] = useState<WeaponResource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [weaponStatuses, setWeaponStatuses] = useState<Map<string, WeaponStatus>>(new Map())
  const [activeTab, setActiveTab] = useState<'hub' | 'gtav' | 'local'>('hub')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [searchQuery, setSearchQuery] = useState<string>('')
  
  // GTAV оружие загружается локально
  const [gtavWeapons] = useState<GTAVWeapon[]>(() => getGTAVWeapons())
  const [gtavCategories] = useState<string[]>(() => ['All', ...getGTAVWeaponCategories()])
  
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
    (async () => {
      try {
        setLoading(true)
        setError(null)
        
        const loadedWeapons = await getWeapons()
        setWeapons(loadedWeapons)
        
        // Check installation status for each weapon
        const statuses = new Map<string, WeaponStatus>()
        for (const weapon of loadedWeapons) {
          const isInstalled = await checkWeaponExists(weapon)
          statuses.set(weapon.id, isInstalled ? 'downloaded' : 'not_downloaded')
        }
        setWeaponStatuses(statuses)
      } catch (err: any) {
        setError(err.message)
        console.error('Ошибка загрузки оружия:', err)
      } finally {
        setLoading(false)
      }
    })()
  }, [])
  
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
        <div className="flex items-center space-x-2 text-sm">
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
            filteredWeapons.map(weapon => {
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

// Типы для меню
interface MenuItem {
  id: string
  label: string
  icon: React.ComponentType<any>
  component: React.ComponentType
  enabled: boolean
  order: number
}

function App() {
  const { isAuthenticated, isLoading, user, logout } = useAuth()
  const [currentPage, setCurrentPage] = useState('dashboard')
  
  // Отправляем событие смены страницы в ALT:V клиент
  useEffect(() => {
    if (typeof window !== 'undefined' && 'alt' in window) {
      try {
        // @ts-ignore
        if (typeof alt !== 'undefined' && typeof alt.emit === 'function') {
          // @ts-ignore
          alt.emit('page:changed', currentPage)
        }
      } catch (e) {
        console.error('[App] Error emitting page change:', e)
      }
    }
  }, [currentPage])
  const [, forceUpdate] = useState({})
  
  // Логируем информацию о пути при загрузке
  useEffect(() => {
    console.log('[App] 🚀 App component mounted')
    console.log('[App] window.location:', window.location.href)
    console.log('[App] window.alt exists:', 'alt' in window)
    if ('alt' in window) {
      console.log('[App] ✅ Running in Alt:V WebView')
    } else {
      console.log('[App] 🌐 Running in browser')
    }
    logAppPathInfo()
    
    // Тестовое событие для проверки связи
    if ('alt' in window) {
      console.log('[App] 🧪 Sending test event to Alt:V...')
      ;(window as any).alt.emit('test:frontend:loaded', { message: 'Frontend is working!' })
      console.log('[App] ✅ Test event sent')
    }
    
    // Тест подписки на события
    if ('alt' in window) {
      console.log('[App] 🔧 Testing event subscription...')
      const testHandler = (data: any) => {
        console.log('[App] 🧪 Test event received:', data)
      }
      ;(window as any).alt.on('test:connection', testHandler)
      console.log('[App] ✅ Test event handler registered')
    }
    
    // Тест подписки на player:entered:vehicle
    if ('alt' in window) {
      console.log('[App] 🔧 Testing player:entered:vehicle subscription...')
      const playerEnteredHandler = (data: any) => {
        console.log('[App] 🚗 Player entered vehicle event received:', data)
        console.log('[App] 🔍 Data details:', { vehicleId: data.vehicleId, modelName: data.modelName })
        
        // Автоматически открываем панель тюнинга для GTAV машин
        if (data.modelName) {
          console.log('[App] 🎯 Auto-opening tuning panel for:', data.modelName)
          // Здесь нужно добавить логику открытия панели тюнинга
        }
      }
      ;(window as any).alt.on('player:entered:vehicle', playerEnteredHandler)
      console.log('[App] ✅ Player entered vehicle handler registered')
    }
    
    // Тест подписки на handling:meta:response
    if ('alt' in window) {
      console.log('[App] 🔧 Testing handling:meta:response subscription...')
      const handlingMetaHandler = (data: any) => {
        console.log('[App] 📋 Handling meta response received:', data)
      }
      ;(window as any).alt.on('handling:meta:response', handlingMetaHandler)
      console.log('[App] ✅ Handling meta response handler registered')
    }
  }, [])
  
  // Логирование состояния авторизации
  console.log('🎯 App render - isAuthenticated:', isAuthenticated, 'isLoading:', isLoading, 'user:', user)
  
  // ALT:V интеграция
  const { closePanel, isAvailable: altvAvailable } = useALTV()

  // Обработка нажатий ESC для закрытия панели
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && altvAvailable) {
        closePanel()
      }
    }

    // Слушаем изменения focusMode для перерисовки
    const handleFocusModeChange = () => {
      forceUpdate({})
    }
    
    window.addEventListener('focusModeChanged', handleFocusModeChange)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('focusModeChanged', handleFocusModeChange)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [altvAvailable, closePanel])

  // Конфигурация меню
  const menuItems: MenuItem[] = [
    {
      id: 'favorites',
      label: 'Избранное',
      icon: Heart,
      component: FavoritesPage,
      enabled: true,
      order: 1
    },
    {
      id: 'vehicles',
      label: 'Автомобили',
      icon: Car,
      component: VehiclesPage,
      enabled: true,
      order: 2
    },
    {
      id: 'interiors',
      label: 'Интерьеры',
      icon: MapPin,
      component: InteriorsPage,
      enabled: true,
      order: 3
    },
    {
      id: 'weapons',
      label: 'Оружие',
      icon: Zap,
      component: WeaponsPage,
      enabled: true, // WEAPONS ENABLED
      order: 4
    },
    {
      id: 'world',
      label: 'Мир и Погода',
      icon: Globe,
      component: WorldPage,
      enabled: true,
      order: 5
    },
    {
      id: 'character',
      label: 'Персонаж',
      icon: Users,
      component: CharacterPage,
      enabled: true,
      order: 6
    }
  ].sort((a, b) => a.order - b.order)

  // Получить текущий компонент
  const getCurrentComponent = () => {
    if (currentPage === 'dashboard') return Dashboard
    const item = menuItems.find(item => item.id === currentPage)
    return item?.component || Dashboard
  }

  const CurrentComponent = getCurrentComponent()

  // Показываем загрузку при инициализации
  if (isLoading) {
    return (
      <div className="webview-panel w-full h-full flex items-center justify-center animate-fade-in">
        <div className="text-center">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center mb-4 animate-pulse">
            <Settings className="w-5 h-5 text-white" />
          </div>
          <p className="text-gray-400 text-sm">Инициализация...</p>
        </div>
      </div>
    )
  }

  // Показываем форму входа если не авторизован
  if (!isAuthenticated) {
    return (
      <div className="webview-panel w-full h-full animate-slide-in-right">
        <LoginPage />
      </div>
    )
  }

  return (
    <div className={`webview-panel w-full h-full flex flex-col animate-slide-in-right transition-opacity duration-300 ${
      (window as any).__focusMode !== 'off' && (window as any).__focusMode ? 'opacity-0 pointer-events-none' : ''
    }`}>
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-base-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">MeshHub</h1>
              <p className="text-xs text-gray-400">ALT:V Tools</p>
            </div>
          </div>
          
          {/* Информация о пользователе и выход */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2 px-3 py-1 bg-base-800 rounded-lg">
              <User className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-300">
                {user?.username || 'User'}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              icon={<LogOut className="w-3 h-3" />}
              className="text-gray-400 hover:text-red-400"
              title="Выйти"
            />
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-shrink-0 p-4 border-b border-base-700">
        <div className="space-y-2">
          <button
            onClick={() => setCurrentPage('dashboard')}
            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
              currentPage === 'dashboard' 
                ? 'bg-primary-600 text-white' 
                : 'text-gray-400 hover:text-white hover:bg-base-800'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span className="text-sm">Главная</span>
          </button>
          
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => item.enabled && setCurrentPage(item.id)}
                disabled={!item.enabled}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                  currentPage === item.id 
                    ? 'bg-primary-600 text-white' 
                    : item.enabled 
                      ? 'text-gray-400 hover:text-white hover:bg-base-800' 
                      : 'text-gray-600 cursor-not-allowed'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm">{item.label}</span>
                {!item.enabled && (
                  <span className="ml-auto text-xs text-gray-500">Soon</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <CurrentComponent />
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 p-4 border-t border-base-700">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              altvAvailable ? 'bg-green-400' : 'bg-orange-400'
            }`} />
            <span className="text-gray-500">
              {altvAvailable ? 'ALT:V' : 'Browser'}
            </span>
          </div>
          <div className="text-gray-500">
            {altvAvailable ? 'F10 - toggle | ESC - close' : 'Demo Mode'}
          </div>
        </div>
      </div>
      
      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1f1f1f',
            color: '#fff',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            fontSize: '14px',
          },
          success: {
            iconTheme: {
              primary: '#4ade80',
              secondary: '#1f1f1f',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#1f1f1f',
            },
          },
        }}
      />
    </div>
  )
}

export default App
