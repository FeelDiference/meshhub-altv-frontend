/**
 * Универсальная кнопка действия со звездочкой избранного
 * Используется в VehicleActions, WeaponActions
 */

import { Star } from 'lucide-react'
import type { ActionConfig } from '@/types/favorites'

interface FavoriteActionButtonProps {
  action: ActionConfig
  isFavorite: boolean
  isActive?: boolean          // Для toggle кнопок (спидометр, no_reload, и т.д.)
  disabled?: boolean
  onExecute: (actionId: string) => void
  onToggleFavorite: (actionId: string) => void
}

/**
 * Универсальная кнопка действия
 */
export function FavoriteActionButton({ 
  action, 
  isFavorite, 
  isActive = false,
  disabled = false, 
  onExecute, 
  onToggleFavorite 
}: FavoriteActionButtonProps) {
  const Icon = action.icon
  
  return (
    <div className="flex items-center justify-between gap-2">
      {/* Основная кнопка */}
      <button
        onClick={() => onExecute(action.id)}
        disabled={disabled}
        className={`
          flex-1 flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium
          transition-all duration-200 border
          ${disabled 
            ? 'bg-gray-800/50 border-gray-700 text-gray-500 cursor-not-allowed' 
            : 'bg-base-800/50 border-base-600 hover:bg-base-700 hover:border-base-500 text-white hover:scale-[1.02]'
          }
        `}
      >
        <div className={`${action.color} ${disabled ? 'opacity-50' : ''}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="truncate flex-1 text-left">{action.label}</span>
        
        {/* Визуальный переключатель для toggle кнопок */}
        {action.isToggle && (
          <div className={`
            relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0
            ${disabled ? 'bg-gray-700' : isActive ? 'bg-green-500' : 'bg-gray-600'}
          `}>
            <span className={`
              inline-block h-4 w-4 transform rounded-full bg-white transition-transform
              ${isActive ? 'translate-x-5' : 'translate-x-0.5'}
            `} />
          </div>
        )}
      </button>
      
      {/* Звездочка избранного - всегда видна */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onToggleFavorite(action.id)
        }}
        className={`
          p-2 rounded-lg transition-all duration-200
          ${isFavorite 
            ? 'text-yellow-400 hover:text-yellow-300 hover:bg-yellow-900/20' 
            : 'text-gray-500 hover:text-yellow-400 hover:bg-yellow-900/10'
          }
        `}
        title={isFavorite ? 'Удалить из избранного' : 'Добавить в избранное'}
      >
        <Star 
          className={`w-4 h-4 transition-all ${
            isFavorite ? 'fill-current' : ''
          }`}
        />
      </button>
    </div>
  )
}

export default FavoriteActionButton

