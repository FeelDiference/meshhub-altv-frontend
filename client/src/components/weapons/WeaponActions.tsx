import React, { useState } from 'react'
import { 
  Zap,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronRight,
  Target,
  Package,
  Settings,
  Trash2
} from 'lucide-react'
import WeaponModules from './WeaponModules'
import toast from 'react-hot-toast'

interface WeaponActionsProps {
  disabled?: boolean
  onAction?: (action: string, data?: any) => void
  onFocusModeToggle?: () => void
  focusMode?: boolean
  weaponName?: string
}

const WeaponActions: React.FC<WeaponActionsProps> = ({ disabled = false, weaponName, onAction, onFocusModeToggle, focusMode = false }) => {
  const [showModules, setShowModules] = useState(false)
  const [noReloadEnabled, setNoReloadEnabled] = useState(false)
  const [hitTrackingEnabled, setHitTrackingEnabled] = useState(false)
  
  // Слушаем события от ALT:V клиента для обновления состояния переключателей
  React.useEffect(() => {
    if (typeof window !== 'undefined' && 'alt' in window) {
      try {
        const handleHitTrackingStatus = (data: any) => {
          if (typeof data.active !== 'undefined') {
            setHitTrackingEnabled(data.active)
          }
        }
        
        // @ts-ignore
        if (typeof alt !== 'undefined' && typeof alt.on === 'function') {
          // @ts-ignore
          alt.on('hit:tracking:status', handleHitTrackingStatus)
          
          return () => {
            // @ts-ignore
            if (typeof alt.off === 'function') {
              // @ts-ignore
              alt.off('hit:tracking:status', handleHitTrackingStatus)
            }
          }
        }
      } catch (e) {
        console.error('[WeaponActions] Error setting up event listeners:', e)
      }
    }
  }, [])
  
  const handleFocusToggle = () => {
    if (onFocusModeToggle) {
      const newMode = focusMode ? 'off' : 'actions'
      ;(window as any).__focusMode = newMode
      // Диспатчим событие для перерисовки App
      window.dispatchEvent(new CustomEvent('focusModeChanged', { detail: { mode: newMode } }))
      onFocusModeToggle()
    }
  }
  
  const handleAction = (action: string, data?: any) => {
    if (disabled) {
      toast.error('Вы должны иметь оружие в руках для выполнения этого действия')
      return
    }
    
    // Обновляем состояние переключателей
    if (action === 'no_reload') {
      setNoReloadEnabled(!noReloadEnabled)
    } else if (action === 'hit_tracking') {
      setHitTrackingEnabled(!hitTrackingEnabled)
    }
    
    if (onAction) {
      onAction(action, data)
    }
    
    // В AltV WebView отправляем событие
    if (typeof window !== 'undefined' && 'alt' in window) {
      try {
        // @ts-ignore
        if (typeof alt !== 'undefined' && typeof alt.emit === 'function') {
          // @ts-ignore
          alt.emit('weapon:action', { action, data })
        } else if (typeof (window as any).alt !== 'undefined' && typeof (window as any).alt.emit === 'function') {
          ;(window as any).alt.emit('weapon:action', { action, data })
        }
      } catch (e) {
        console.error('[WeaponActions] Error emitting action:', e)
      }
    }
    
    toast.success(`Выполнено: ${getActionName(action)}`)
  }

  const getActionName = (action: string): string => {
    const names: Record<string, string> = {
      'give_ammo': 'Выдано максимальное количество патронов на все оружие',
      'no_reload': 'Режим без перезарядки переключен',
      'spawn_all_weapons': 'Заспавнено все доступное оружие',
      'hit_tracking': 'Отслеживание попаданий переключено',
      'clear_hits_and_peds': 'Метки и педы очищены',
      'weapon_modules': 'Модуль оружия применен'
    }
    return names[action] || action
  }

  const actionGroups = [
    {
      title: 'Боеприпасы',
      icon: <Zap className="w-4 h-4" />,
      actions: [
        { id: 'give_ammo', label: 'Выдать патронов', icon: <Zap className="w-4 h-4" />, color: 'text-green-400' },
        { id: 'no_reload', label: 'Без перезарядки', icon: <Target className="w-4 h-4" />, color: 'text-yellow-400' }
      ]
    },
    {
      title: 'Оружие',
      icon: <Package className="w-4 h-4" />,
      actions: [
        { id: 'spawn_all_weapons', label: 'Заспавнить все оружие', icon: <Package className="w-4 h-4" />, color: 'text-purple-400' }
      ]
    },
    {
      title: 'Отслеживание',
      icon: <Target className="w-4 h-4" />,
      actions: [
        { id: 'hit_tracking', label: 'Отслеживание попаданий', icon: <Target className="w-4 h-4" />, color: 'text-red-400' },
        { id: 'clear_hits_and_peds', label: 'Очистить метки и педов', icon: <Trash2 className="w-4 h-4" />, color: 'text-orange-400' }
      ]
    }
  ]

  return (
    <div className="h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-semibold text-white">Действия с оружием</div>
        {onFocusModeToggle && (
          <button
            onClick={handleFocusToggle}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border bg-base-800/50 border-base-600 hover:bg-base-700 hover:border-base-500 text-white hover:scale-[1.02]"
            title={focusMode ? 'Показать меню' : 'Скрыть меню'}
          >
            {focusMode ? (
              <>
                <Minimize2 className="w-4 h-4 text-cyan-400" />
                <span>Выход</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-4 h-4 text-purple-400" />
                <span>Фокус</span>
              </>
            )}
          </button>
        )}
      </div>
      
      <div className="space-y-4">
        {actionGroups.map((group, groupIndex) => (
          <div key={groupIndex} className="space-y-2">
            <div className="flex items-center space-x-2 text-xs font-medium text-gray-400">
              {group.icon}
              <span>{group.title}</span>
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              {group.actions.map((action) => {
                // Определяем состояние переключателя для этой кнопки
                const isToggle = action.id === 'no_reload' || action.id === 'hit_tracking'
                const isActive = action.id === 'no_reload' ? noReloadEnabled : action.id === 'hit_tracking' ? hitTrackingEnabled : false
                
                return (
                  <button
                    key={action.id}
                    onClick={() => handleAction(action.id)}
                    disabled={disabled}
                    className={`
                      flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium
                      transition-all duration-200 border
                      ${disabled 
                        ? 'bg-gray-800/50 border-gray-700 text-gray-500 cursor-not-allowed' 
                        : 'bg-base-800/50 border-base-600 hover:bg-base-700 hover:border-base-500 text-white hover:scale-[1.02]'
                      }
                    `}
                  >
                    <div className="flex items-center space-x-2">
                      <div className={`${action.color} ${disabled ? 'opacity-50' : ''}`}>
                        {action.icon}
                      </div>
                      <span className="truncate">{action.label}</span>
                    </div>
                    
                    {/* Визуальный переключатель для toggle кнопок */}
                    {isToggle && (
                      <div className={`
                        relative inline-flex h-5 w-9 items-center rounded-full transition-colors
                        ${disabled ? 'bg-gray-700' : isActive ? 'bg-green-500' : 'bg-gray-600'}
                      `}>
                        <span className={`
                          inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                          ${isActive ? 'translate-x-5' : 'translate-x-0.5'}
                        `} />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
        
        {/* Блок модулей на оружие как складной раздел */}
        <div className="space-y-2 mt-4 pt-4 border-t border-base-700">
          <button
            onClick={() => setShowModules(!showModules)}
            disabled={disabled}
            className={`w-full flex items-center justify-between p-3 rounded-lg transition-all duration-200 border ${
              disabled
                ? 'bg-gray-800/50 border-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-900/30 to-fuchsia-900/30 border-purple-500/50 hover:border-purple-400 text-white'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Settings className={`w-4 h-4 ${disabled ? 'text-gray-500' : 'text-purple-400'}`} />
              <span className="text-sm font-semibold">Модули на оружие</span>
            </div>
            {showModules ? (
              <ChevronDown className="w-4 h-4 text-purple-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
          </button>

          {/* Содержимое модулей */}
          {showModules && !disabled && (
            <div className="animate-slide-in-left">
              <WeaponModules disabled={disabled} weaponName={weaponName} />
            </div>
          )}
        </div>
      </div>
      
      {disabled && (
        <div className="mt-4 p-3 bg-orange-900/20 border border-orange-500/30 rounded-lg">
          <div className="flex items-center space-x-2 text-xs text-orange-300">
            <Zap className="w-4 h-4" />
            <span>Возьмите оружие в руки для использования действий</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default WeaponActions




