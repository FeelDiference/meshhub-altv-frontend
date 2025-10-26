import { useState, useEffect } from 'react'
import { Car, Settings, MapPin, Zap, LogOut, User, Globe, Users } from 'lucide-react'
import { Toaster } from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'
import { useALTV } from '@/hooks/useALTV'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { Button } from '@/components/common/Button'
import { logAppPathInfo } from '@/utils/pathDetection'
import { setupAltVAuthHandlers } from '@/services/auth'
import { InteriorsPage } from '@/components/interiors/InteriorsPage'
import WorldPage from '@/components/world/WorldPage'
import CharacterPage from '@/components/character/CharacterPage'
import { Dashboard, LoginPage, VehiclesPage, WeaponsPage } from '@/pages'
import type { MenuItem } from '@/types/menu'
import { loader } from '@monaco-editor/react'
import { 
  isMigrationCompleted, 
  migrateLegacyFavorites, 
  markMigrationCompleted,
  getLegacyDataStats
} from '@/utils/favoritesMigration'
import { favoritesService } from '@/services/favoritesService'


function App() {
  const { isAuthenticated, isLoading, user, logout } = useAuth()
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [yftGameViewActive, setYftGameViewActive] = useState(false) // Game View mode from YFT Viewer
  const [focusMode, setFocusMode] = useState<string>('off') // Состояние для focusMode
  
  // Миграция избранного (один раз при первой загрузке)
  useEffect(() => {
    const runMigration = async () => {
      if (isMigrationCompleted()) {
        console.log('[App] 🔄 Migration already completed, skipping...')
        return
      }
      
      console.log('[App] 🔄 Running favorites migration...')
      
      // Получаем статистику старых данных
      const legacyStats = getLegacyDataStats()
      console.log('[App] 📊 Legacy data stats:', legacyStats)
      
      // Выполняем миграцию
      const migratedData = await migrateLegacyFavorites()
      
      if (migratedData) {
        console.log('[App] ✅ Migration successful, saving to new storage...')
        
        // Сохраняем в новый сервис
        // Данные уже будут загружены через init() в favoritesService
        await favoritesService.sync()
        
        // Помечаем миграцию как выполненную
        markMigrationCompleted()
        
        // Очищаем старые ключи (опционально, можно оставить для fallback)
        // cleanupLegacyStorage()
        
        console.log('[App] 🎉 Migration completed successfully!')
      } else {
        console.log('[App] ℹ️ No legacy data to migrate')
        markMigrationCompleted()
      }
    }
    
    runMigration().catch(err => {
      console.error('[App] ❌ Migration failed:', err)
      // Помечаем миграцию как выполненную чтобы не запускать снова
      markMigrationCompleted()
    })
  }, [])
  
  // Предзагрузка Monaco Editor для быстрого открытия редакторов XML
  useEffect(() => {
    console.log('[App] 🚀 Preloading Monaco Editor...')
    loader.init().then(() => {
      console.log('[App] ✅ Monaco Editor preloaded successfully')
    }).catch(err => {
      console.error('[App] ❌ Monaco preload failed:', err)
    })
  }, [])
  
  // Импортируем и используем online status hook (будет добавлен import выше)
  // Автоматически отправляет heartbeat каждую минуту если пользователь авторизован
  useOnlineStatus()
  
  // Устанавливаем глобальный флаг для доступа из Dashboard
  useEffect(() => {
    ;(window as any).__yftGameViewActive = yftGameViewActive
  }, [yftGameViewActive])
  
  // Слушаем изменения Game View от Dashboard
  useEffect(() => {
    const handleGameViewChange = (e: CustomEvent) => {
      console.log('[App] 🎮 Game View changed:', e.detail.active)
      setYftGameViewActive(e.detail.active)
    }
    window.addEventListener('yft-game-view-changed' as any, handleGameViewChange)
    return () => window.removeEventListener('yft-game-view-changed' as any, handleGameViewChange)
  }, [])
  
  // Логируем состояние Game View
  useEffect(() => {
    console.log('[App] 🎯 yftGameViewActive state:', yftGameViewActive)
  }, [yftGameViewActive])
  
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
  
  // Настраиваем обработчики авторизации для ALT:V
  useEffect(() => {
    setupAltVAuthHandlers()
  }, [])

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
    const handleFocusModeChange = (e: Event) => {
      const customEvent = e as CustomEvent
      const newMode = customEvent.detail?.mode || 'off'
      console.log('[App] 📍 FocusMode changed to:', newMode)
      console.log('[App] 📍 Previous focusMode was:', focusMode)
      setFocusMode(newMode)
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
      id: 'vehicles',
      label: 'Автомобили',
      icon: Car,
      component: VehiclesPage,
      enabled: true,
      order: 1
    },
    {
      id: 'interiors',
      label: 'Интерьеры',
      icon: MapPin,
      component: InteriorsPage,
      enabled: true,
      order: 2
    },
    {
      id: 'weapons',
      label: 'Оружие',
      icon: Zap,
      component: WeaponsPage,
      enabled: true, // WEAPONS ENABLED
      order: 3
    },
    {
      id: 'world',
      label: 'Мир и Погода',
      icon: Globe,
      component: WorldPage,
      enabled: true,
      order: 4
    },
    {
      id: 'character',
      label: 'Персонаж',
      icon: Users,
      component: CharacterPage,
      enabled: true,
      order: 5
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

  console.log('[App] 🎨 RENDER - yftGameViewActive:', yftGameViewActive)
  console.log('[App] 🎨 RENDER - focusMode:', focusMode)
  console.log('[App] 🎨 CONDITION - focusMode !== "game-view":', focusMode !== 'game-view')
  console.log('[App] 🎨 CONDITION - should show header:', focusMode !== 'game-view')
  
  return (
    <div className={`webview-panel w-full h-full flex flex-col animate-slide-in-right transition-opacity duration-300 ${
      // Скрываем весь UI кроме game-view режима (там только YftViewer остаётся видимым)
      focusMode !== 'off' && focusMode !== 'game-view' && focusMode ? 'opacity-0 pointer-events-none' : ''
    } ${
      // В Game View режиме делаем webview-panel прозрачным
      focusMode === 'game-view' ? 'game-view-transparent' : ''
    }`}
    style={focusMode === 'game-view' ? {
      background: 'transparent !important',
      backgroundColor: 'transparent !important',
      backdropFilter: 'none',
      border: 'none',
      borderLeft: 'none'
    } : undefined}
    >
      
      {/* Header - скрываем в Game View режиме */}
      {(() => {
        console.log('[App] 🎨 Header RENDER - focusMode:', focusMode, 'should hide:', focusMode === 'game-view')
        return null
      })()}
      <div 
        className="flex-shrink-0 p-3 sm:p-4 border-b border-base-700"
        style={{ 
          display: focusMode === 'game-view' ? 'none' : 'block',
          opacity: focusMode === 'game-view' ? 0 : 1,
          pointerEvents: focusMode === 'game-view' ? 'none' : 'auto'
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base lg:text-lg font-semibold text-white">MeshHub</h1>
              <p className="text-[10px] sm:text-xs text-gray-400">ALT:V Tools</p>
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

      {/* Navigation - скрываем в Game View режиме */}
      {(() => {
        console.log('[App] 🎨 Navigation RENDER - focusMode:', focusMode, 'should hide:', focusMode === 'game-view')
        return null
      })()}
      <div 
        className="flex-shrink-0 p-3 sm:p-4 border-b border-base-700"
        style={{ 
          display: focusMode === 'game-view' ? 'none' : 'block',
          opacity: focusMode === 'game-view' ? 0 : 1,
          pointerEvents: focusMode === 'game-view' ? 'none' : 'auto'
        }}
      >
        <div className="space-y-1 sm:space-y-2">
          <button
            onClick={() => setCurrentPage('dashboard')}
            className={`w-full flex items-center space-x-2 sm:space-x-3 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-colors ${
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
                className={`w-full flex items-center space-x-2 sm:space-x-3 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-colors ${
                  currentPage === item.id 
                    ? 'bg-primary-600 text-white' 
                    : item.enabled 
                      ? 'text-gray-400 hover:text-white hover:bg-base-800' 
                      : 'text-gray-600 cursor-not-allowed'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs sm:text-sm truncate">{item.label}</span>
                {!item.enabled && (
                  <span className="ml-auto text-xs text-gray-500">Soon</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div 
        className="flex-1 overflow-y-auto overflow-x-hidden"
        style={{ 
          display: focusMode === 'game-view' ? 'none' : 'block',
          opacity: focusMode === 'game-view' ? 0 : 1,
          pointerEvents: focusMode === 'game-view' ? 'none' : 'auto'
        }}
      >
        <CurrentComponent />
      </div>

      {/* Footer - скрываем в Game View режиме */}
      <div 
        className="flex-shrink-0 p-3 sm:p-4 border-t border-base-700"
        style={{ 
          display: focusMode === 'game-view' ? 'none' : 'block',
          opacity: focusMode === 'game-view' ? 0 : 1,
          pointerEvents: focusMode === 'game-view' ? 'none' : 'auto'
        }}
      >
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

