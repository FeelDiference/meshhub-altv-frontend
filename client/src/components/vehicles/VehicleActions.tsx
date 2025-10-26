/**
 * Компонент действий с автомобилем
 * Использует централизованную систему избранного и универсальные компоненты
 */

import React, { useState, useEffect } from 'react'
import { 
  ChevronDown,
  ChevronRight,
  Wrench,
  Timer,
  Car,
  Maximize2,
  Minimize2
} from 'lucide-react'
import toast from 'react-hot-toast'
import VehicleTuning from './VehicleTuning'
import SpeedTestPanel from './SpeedTestPanel'
import { FavoriteActionButton } from '@/components/common/FavoriteActionButton'
import { useFavorites } from '@/hooks/useFavorites'
import { VEHICLE_ACTION_CONFIGS, VEHICLE_ACTION_GROUPS } from '@/config/favorites'

interface VehicleActionsProps {
  disabled?: boolean
  onAction?: (action: string, data?: any) => void
  onFocusModeToggle?: () => void
  focusMode?: boolean
  vehicleName?: string
  onYftViewerToggle?: (show: boolean) => void
}

const VehicleActions: React.FC<VehicleActionsProps> = ({ 
  disabled = false, 
  onAction, 
  onFocusModeToggle, 
  focusMode = false, 
  vehicleName, 
  onYftViewerToggle 
}) => {
  const [showTuning, setShowTuning] = useState(false)
  const [showSpeedTest, setShowSpeedTest] = useState(false)
  const [speedometerEnabled, setSpeedometerEnabled] = useState(false)
  
  // Используем централизованный хук избранного
  const { toggle, has } = useFavorites()
  
  // Слушаем состояние спидометра от Alt:V
  useEffect(() => {
    if (typeof window !== 'undefined' && 'alt' in window) {
      const alt = (window as any).alt
      
      const handleSpeedometerStatus = (data: { enabled: boolean }) => {
        setSpeedometerEnabled(data.enabled)
      }
      
      alt.on('speedometer:status', handleSpeedometerStatus)
      alt.emit('speedometer:get-status')
      
      return () => {
        alt.off('speedometer:status', handleSpeedometerStatus)
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
    console.log(`[VehicleActions] Action triggered: ${actionId}`)
    
    // Специальная обработка для YFT Viewer
    if (actionId === 'yft_viewer') {
      if (!vehicleName) {
        toast.error('Не выбран автомобиль')
        return
      }
      if (onYftViewerToggle) {
        onYftViewerToggle(true)
      }
      return
    }
    
    // Специальная обработка для спидометра
    if (actionId === 'speedometer_toggle') {
      if (typeof window !== 'undefined' && 'alt' in window) {
        const newState = !speedometerEnabled
        setSpeedometerEnabled(newState)
        ;(window as any).alt.emit('speedometer:toggle')
        toast.success(newState ? 'Спидометр включен' : 'Спидометр выключен')
      } else {
        toast.error('Alt:V API недоступен')
      }
      return
    }
    
    // Специальная обработка для телепорта на трассу
    if (actionId === 'teleport_to_location') {
      if (typeof window !== 'undefined' && 'alt' in window) {
        ;(window as any).alt.emit('speedtest:teleport:track')
        toast.success('Телепорт на старт трассы...')
      } else {
        toast.error('Alt:V API недоступен')
      }
      return
    }
    
    // Проверка на наличие автомобиля для действий, требующих его
    const actionConfig = VEHICLE_ACTION_CONFIGS.find(a => a.id === actionId)
    if (disabled && actionConfig?.requiresVehicle !== false) {
      toast.error('Вы должны быть в автомобиле для выполнения этого действия')
      return
    }
    
    // Вызов callback
    if (onAction) {
      onAction(actionId, data)
    }
    
    // Отправка в Alt:V
    if (typeof window !== 'undefined' && 'alt' in window) {
      try {
        const alt = (window as any).alt
        alt.emit('vehicle:action', { action: actionId, data })
      } catch (e) {
        console.error('[VehicleActions] Error emitting action:', e)
      }
    }
    
    toast.success(`Выполнено: ${actionConfig?.label || actionId}`)
  }
  
  /**
   * Переключить избранное
   */
  const handleToggleFavorite = async (actionId: string) => {
    await toggle('vehicleAction', actionId)
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-semibold text-white">Действия с автомобилем</div>
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
        {VEHICLE_ACTION_GROUPS.map((group, groupIndex) => (
          <div key={groupIndex} className="space-y-2">
            <div className="flex items-center space-x-2 text-xs font-medium text-gray-400">
              <group.icon className="w-4 h-4" />
              <span>{group.title}</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {group.actions.map((actionId) => {
                const action = VEHICLE_ACTION_CONFIGS.find(a => a.id === actionId)
                if (!action) return null
                
                const isFavorite = has('vehicleAction', actionId)
                const isActive = actionId === 'speedometer_toggle' ? speedometerEnabled : false
                
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
        
        {/* Блок тюнинга */}
        <div className="space-y-2 mt-4 pt-4 border-t border-base-700">
          <button
            onClick={() => setShowTuning(!showTuning)}
            disabled={disabled}
            className={`w-full flex items-center justify-between p-3 rounded-lg transition-all duration-200 border ${
              disabled
                ? 'bg-gray-800/50 border-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-900/30 to-fuchsia-900/30 border-purple-500/50 hover:border-purple-400 text-white'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Wrench className={`w-4 h-4 ${disabled ? 'text-gray-500' : 'text-purple-400'}`} />
              <span className="text-sm font-semibold">Тюнинг автомобиля</span>
            </div>
            {showTuning ? (
              <ChevronDown className="w-4 h-4 text-purple-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
          </button>

          {showTuning && !disabled && (
            <div className="animate-slide-in-left">
              <VehicleTuning disabled={disabled} vehicleName={vehicleName} />
            </div>
          )}
        </div>

        {/* Блок Speed Test */}
        <div className="space-y-2 mt-4 pt-4 border-t border-base-700">
          <button
            onClick={() => setShowSpeedTest(!showSpeedTest)}
            disabled={disabled}
            className={`w-full flex items-center justify-between p-3 rounded-lg transition-all duration-200 border ${
              disabled
                ? 'bg-gray-800/50 border-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-900/30 to-cyan-900/30 border-blue-500/50 hover:border-blue-400 text-white'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Timer className={`w-4 h-4 ${disabled ? 'text-gray-500' : 'text-blue-400'}`} />
              <span className="text-sm font-semibold">Тесты скорости</span>
            </div>
            {showSpeedTest ? (
              <ChevronDown className="w-4 h-4 text-blue-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
          </button>

          {showSpeedTest && !disabled && (
            <div className="animate-slide-in-left">
              <SpeedTestPanel />
            </div>
          )}
        </div>
      </div>
      
      {/* Предупреждение */}
      {disabled && (
        <div className="mt-4 p-3 bg-orange-900/20 border border-orange-500/30 rounded-lg">
          <div className="flex items-center space-x-2 text-xs text-orange-300">
            <Car className="w-4 h-4" />
            <span>Войдите в автомобиль для использования действий</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default VehicleActions
