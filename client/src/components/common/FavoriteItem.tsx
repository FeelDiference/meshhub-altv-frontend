/**
 * Универсальный компонент для отображения элемента избранного
 * Работает с любым типом избранного через конфигурацию
 */

import React, { useState } from 'react'
import { Trash2, Pencil, Check, X } from 'lucide-react'
import type { FavoriteConfig } from '@/types/favorites'

interface FavoriteItemProps<T = any> {
  config: FavoriteConfig<T>
  item: T
  onExecute: (item: T) => void
  onRemove: (item: T) => void
  onEdit?: (item: T, newName: string) => void
  canEdit?: boolean
}

/**
 * Универсальный компонент элемента избранного
 */
export function FavoriteItem<T>({ 
  config, 
  item, 
  onExecute, 
  onRemove, 
  onEdit,
  canEdit = false 
}: FavoriteItemProps<T>) {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  
  const Icon = config.icon
  const displayName = config.getDisplayName(item)
  const subtitle = config.getSubtitle(item)
  
  // Цвета (Tailwind classes)
  const iconColor = `text-${config.color}-400`
  const bgColor = `bg-${config.color}-600/20`
  const hoverBgColor = `group-hover:bg-${config.color}-600/30`
  const hoverBorderColor = `hover:border-${config.color}-500/30`
  const hoverTextColor = `group-hover:text-${config.color}-400`
  
  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (canEdit && onEdit) {
      setEditName(displayName)
      setIsEditing(true)
    }
  }
  
  const handleSaveEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (editName.trim() && onEdit) {
      onEdit(item, editName.trim())
      setIsEditing(false)
    }
  }
  
  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsEditing(false)
    setEditName('')
  }
  
  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    onRemove(item)
  }
  
  return (
    <div className={`w-full p-3 bg-base-700/50 border border-base-600 rounded-lg ${hoverBorderColor} transition-all duration-200 group ${!isEditing ? 'hover:bg-base-600/50' : 'border-blue-500/50'}`}>
      <div className="flex items-center justify-between">
        {/* Основной контент */}
        <div 
          className={`flex items-center space-x-3 flex-1 min-w-0 ${!isEditing ? 'cursor-pointer' : ''}`}
          onClick={() => !isEditing && onExecute(item)}
        >
          <div className={`w-8 h-8 ${bgColor} rounded-lg flex items-center justify-center ${hoverBgColor} transition-colors`}>
            <Icon className={`w-4 h-4 ${iconColor}`} />
          </div>
          
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveEdit(e as any)
                  } else if (e.key === 'Escape') {
                    handleCancelEdit(e as any)
                  }
                }}
                className="w-full px-2 py-1 bg-base-900 border border-blue-500 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            ) : (
              <div className="text-sm font-medium text-white truncate">
                {displayName}
              </div>
            )}
            
            <div className="text-xs text-gray-400 mt-0.5">
              {subtitle}
            </div>
          </div>
        </div>
        
        {/* Действия */}
        <div className="flex items-center space-x-2">
          {isEditing ? (
            <>
              <button
                onClick={handleSaveEdit}
                className="p-1.5 rounded hover:bg-green-600/20 text-green-400 transition-colors"
                title="Сохранить"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={handleCancelEdit}
                className="p-1.5 rounded hover:bg-red-600/20 text-red-400 transition-colors"
                title="Отмена"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <div className={`text-xs text-gray-500 ${hoverTextColor} transition-colors`}>
                {config.actionLabel}
              </div>
              
              {/* Кнопка редактирования (опционально) */}
              {canEdit && onEdit && (
                <button
                  onClick={handleStartEdit}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-blue-400 hover:bg-blue-900/20 transition-colors"
                  title="Редактировать"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
              
              {/* Кнопка удаления */}
              <button
                onClick={handleRemove}
                className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-900/20 transition-colors"
                title="Удалить из избранного"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default FavoriteItem

