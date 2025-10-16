import React, { useState } from 'react'
import { 
  Wrench, 
  Sparkles, 
  Lightbulb, 
  ArrowLeft, 
  ArrowRight, 
  Shield, 
  Car,
  Zap,
  Radio,
  Wind,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import toast from 'react-hot-toast'
import VehicleTuning from './VehicleTuning'

interface VehicleActionsProps {
  disabled?: boolean
  onAction?: (action: string, data?: any) => void
  onFocusModeToggle?: () => void
  focusMode?: boolean
  vehicleName?: string
}

const VehicleActions: React.FC<VehicleActionsProps> = ({ disabled = false, onAction, onFocusModeToggle, focusMode = false, vehicleName }) => {
  const [showTuning, setShowTuning] = useState(false)
  const handleFocusToggle = () => {
    if (onFocusModeToggle) {
      (window as any).__focusMode = focusMode ? 'off' : 'actions'
      // Диспатчим событие для перерисовки App
      window.dispatchEvent(new Event('focusModeChanged'))
      onFocusModeToggle()
    }
  }
  
  const handleAction = (action: string, data?: any) => {
    if (disabled) {
      toast.error('Вы должны быть в автомобиле для выполнения этого действия')
      return
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
          alt.emit('vehicle:action', { action, data })
        } else if (typeof (window as any).alt !== 'undefined' && typeof (window as any).alt.emit === 'function') {
          ;(window as any).alt.emit('vehicle:action', { action, data })
        }
      } catch (e) {
        console.error('[VehicleActions] Error emitting action:', e)
      }
    }
    
    toast.success(`Выполнено: ${getActionName(action)}`)
  }

  const getActionName = (action: string): string => {
    const names: Record<string, string> = {
      'repair': 'Ремонт автомобиля',
      'clean': 'Очистка автомобиля',
      'lights_toggle': 'Переключить фары',
      'indicators_left': 'Левый поворотник',
      'indicators_right': 'Правый поворотник',
      'indicators_hazard': 'Аварийка',
      'indicators_off': 'Выключить поворотники',
      'engine_toggle': 'Переключить двигатель',
      'horn': 'Сигнал',
      'siren_toggle': 'Сирена'
    }
    return names[action] || action
  }

  const actionGroups = [
    {
      title: 'Ремонт и обслуживание',
      icon: <Wrench className="w-4 h-4" />,
      actions: [
        { id: 'repair', label: 'Починить', icon: <Wrench className="w-4 h-4" />, color: 'text-green-400' },
        { id: 'clean', label: 'Отчистить', icon: <Sparkles className="w-4 h-4" />, color: 'text-cyan-400' }
      ]
    },
    {
      title: 'Освещение',
      icon: <Lightbulb className="w-4 h-4" />,
      actions: [
        { id: 'lights_toggle', label: 'Фары ВКЛ/ВЫКЛ', icon: <Lightbulb className="w-4 h-4" />, color: 'text-yellow-400' }
      ]
    },
    {
      title: 'Поворотники',
      icon: <ArrowLeft className="w-4 h-4" />,
      actions: [
        { id: 'indicators_left', label: 'Левый', icon: <ArrowLeft className="w-4 h-4" />, color: 'text-orange-400' },
        { id: 'indicators_right', label: 'Правый', icon: <ArrowRight className="w-4 h-4" />, color: 'text-orange-400' },
        { id: 'indicators_hazard', label: 'Аварийка', icon: <Shield className="w-4 h-4" />, color: 'text-red-400' },
        { id: 'indicators_off', label: 'Выключить', icon: <Shield className="w-4 h-4" />, color: 'text-gray-400' }
      ]
    },
    {
      title: 'Двигатель',
      icon: <Car className="w-4 h-4" />,
      actions: [
        { id: 'engine_toggle', label: 'Завести/Заглушить', icon: <Zap className="w-4 h-4" />, color: 'text-green-400' }
      ]
    },
    {
      title: 'Звук',
      icon: <Radio className="w-4 h-4" />,
      actions: [
        { id: 'horn', label: 'Сигнал', icon: <Radio className="w-4 h-4" />, color: 'text-purple-400' },
        { id: 'siren_toggle', label: 'Сирена ВКЛ/ВЫКЛ', icon: <Wind className="w-4 h-4" />, color: 'text-blue-400' }
      ]
    }
  ]

  return (
    <div className="h-full overflow-y-auto">
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
      
      <div className="space-y-4">
        {actionGroups.map((group, groupIndex) => (
          <div key={groupIndex} className="space-y-2">
            <div className="flex items-center space-x-2 text-xs font-medium text-gray-400">
              {group.icon}
              <span>{group.title}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              {group.actions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => handleAction(action.id)}
                  disabled={disabled}
                  className={`
                    flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium
                    transition-all duration-200 border
                    ${disabled 
                      ? 'bg-gray-800/50 border-gray-700 text-gray-500 cursor-not-allowed' 
                      : 'bg-base-800/50 border-base-600 hover:bg-base-700 hover:border-base-500 text-white hover:scale-[1.02]'
                    }
                  `}
                >
                  <div className={`${action.color} ${disabled ? 'opacity-50' : ''}`}>
                    {action.icon}
                  </div>
                  <span className="truncate">{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
        
        {/* Блок тюнинга как складной раздел */}
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

          {/* Содержимое тюнинга */}
          {showTuning && !disabled && (
            <div className="animate-slide-in-left">
              <VehicleTuning disabled={disabled} vehicleName={vehicleName} />
            </div>
          )}
        </div>
      </div>
      
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




