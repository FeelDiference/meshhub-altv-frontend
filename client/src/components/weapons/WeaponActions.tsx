/**
 * Компонент действий с оружием
 * Использует централизованную систему избранного и универсальные компоненты
 */

import React, { useState } from 'react'
import { 
  Zap,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronRight,
  Settings
} from 'lucide-react'
import WeaponModules from './WeaponModules'
import toast from 'react-hot-toast'
import { FavoriteActionButton } from '@/components/common/FavoriteActionButton'
import { useFavorites } from '@/hooks/useFavorites'
import { WEAPON_ACTION_CONFIGS, WEAPON_ACTION_GROUPS } from '@/config/favorites'

interface WeaponActionsProps {
  disabled?: boolean
  onAction?: (action: string, data?: any) => void
  onFocusModeToggle?: () => void
  focusMode?: boolean
  weaponName?: string
}

const WeaponActions: React.FC<WeaponActionsProps> = ({ 
  disabled = false, 
  weaponName, 
  onAction, 
  onFocusModeToggle, 
  focusMode = false 
}) => {
  const [showModules, setShowModules] = useState(false)
  const [noReloadEnabled, setNoReloadEnabled] = useState(false)
  const [hitTrackingEnabled, setHitTrackingEnabled] = useState(false)
  
  // Используем централизованный хук избранного
  const { toggle, has } = useFavorites()
  
  // Слушаем события от ALT:V клиента для обновления состояния переключателей
  React.useEffect(() => {
    if (typeof window !== 'undefined' && 'alt' in window) {
      try {
        const handleHitTrackingStatus = (data: any) => {
          if (typeof data.active !== 'undefined') {
            setHitTrackingEnabled(data.active)
          }
        }
        
        const alt = (window as any).alt
        if (alt && typeof alt.on === 'function') {
          alt.on('hit:tracking:status', handleHitTrackingStatus)
          
          return () => {
            if (typeof alt.off === 'function') {
              alt.off('hit:tracking:status', handleHitTrackingStatus)
            }
          }
        }
      } catch (e) {
        console.error('[WeaponActions] Error setting up event listeners:', e)
      }
    }
  }, [])
  
  /**
   * Переключить фокус режим
   */
  const handleFocusToggle = () => {
    if (onFocusModeToggle) {
      const newMode = focusMode ? 'off' : 'actions'
      ;(window as any).__focusMode = newMode
      window.dispatchEvent(new CustomEvent('focusModeChanged', { detail: { mode: newMode } }))
      onFocusModeToggle()
    }
  }
  
  /**
   * Выполнить действие
   */
  const handleAction = (actionId: string, data?: any) => {
    if (disabled) {
      toast.error('Вы должны иметь оружие в руках для выполнения этого действия')
      return
    }
    
    // Обновляем состояние переключателей
    if (actionId === 'no_reload') {
      setNoReloadEnabled(!noReloadEnabled)
    } else if (actionId === 'hit_tracking') {
      setHitTrackingEnabled(!hitTrackingEnabled)
    }
    
    if (onAction) {
      onAction(actionId, data)
    }
    
    // Отправка в Alt:V
    if (typeof window !== 'undefined' && 'alt' in window) {
      try {
        const alt = (window as any).alt
        alt.emit('weapon:action', { action: actionId, data })
      } catch (e) {
        console.error('[WeaponActions] Error emitting action:', e)
      }
    }
    
    const actionConfig = WEAPON_ACTION_CONFIGS.find(a => a.id === actionId)
    toast.success(`Выполнено: ${actionConfig?.label || actionId}`)
  }
  
  /**
   * Переключить избранное
   */
  const handleToggleFavorite = async (actionId: string) => {
    await toggle('weaponAction', actionId)
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
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
      
      {/* Группы действий */}
      <div className="space-y-4">
        {WEAPON_ACTION_GROUPS.map((group, groupIndex) => (
          <div key={groupIndex} className="space-y-2">
            <div className="flex items-center space-x-2 text-xs font-medium text-gray-400">
              <group.icon className="w-4 h-4" />
              <span>{group.title}</span>
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              {group.actions.map((actionId) => {
                const action = WEAPON_ACTION_CONFIGS.find(a => a.id === actionId)
                if (!action) return null
                
                const isFavorite = has('weaponAction', actionId)
                const isActive = 
                  actionId === 'no_reload' ? noReloadEnabled : 
                  actionId === 'hit_tracking' ? hitTrackingEnabled : 
                  false
                
                return (
                  <FavoriteActionButton
                    key={actionId}
                    action={action}
                    isFavorite={isFavorite}
                    isActive={isActive}
                    disabled={disabled}
                    onExecute={handleAction}
                    onToggleFavorite={handleToggleFavorite}
                  />
                )
              })}
            </div>
          </div>
        ))}
        
        {/* Блок модулей на оружие */}
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

          {showModules && !disabled && (
            <div className="animate-slide-in-left">
              <WeaponModules disabled={disabled} weaponName={weaponName} />
            </div>
          )}
        </div>
      </div>
      
      {/* Предупреждение */}
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
