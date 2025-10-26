/**
 * Универсальный компонент для отображения элемента избранного
 * Работает с любым типом избранного через конфигурацию
 */

import React, { useState } from 'react'
import { Trash2, Pencil, Check, X, Keyboard } from 'lucide-react'
import type { FavoriteConfig, HotkeyBinding } from '@/types/favorites'

interface FavoriteItemProps<T = any> {
  config: FavoriteConfig<T>
  item: T
  onExecute: (item: T) => void
  onRemove: (item: T) => void
  onEdit?: (item: T, newName: string) => void
  canEdit?: boolean
  // HotKey поддержка
  hotkey?: HotkeyBinding | null
  onSetHotkey?: (itemId: string, key: string, modifiers?: HotkeyBinding['modifiers']) => void
  onRemoveHotkey?: (itemId: string) => void
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
  canEdit = false,
  hotkey,
  onSetHotkey,
  onRemoveHotkey
}: FavoriteItemProps<T>) {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [isSettingHotkey, setIsSettingHotkey] = useState(false)
  const [capturedKey, setCapturedKey] = useState<string>('')
  const [capturedModifiers, setCapturedModifiers] = useState<HotkeyBinding['modifiers']>({})
  
  const Icon = config.icon
  const displayName = config.getDisplayName(item)
  const subtitle = config.getSubtitle(item)
  const itemId = config.getId(item)
  
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
  
  // Начать привязку HotKey
  const handleStartHotkeyCapture = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsSettingHotkey(true)
    setCapturedKey('')
    setCapturedModifiers({})
  }
  
  // Отменить привязку HotKey
  const handleCancelHotkeyCapture = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsSettingHotkey(false)
    setCapturedKey('')
    setCapturedModifiers({})
  }
  
  // Сохранить HotKey
  const handleSaveHotkey = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (capturedKey && onSetHotkey) {
      onSetHotkey(itemId, capturedKey, capturedModifiers)
      setIsSettingHotkey(false)
      setCapturedKey('')
      setCapturedModifiers({})
    }
  }
  
  // Удалить HotKey
  const handleRemoveHotkey = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onRemoveHotkey) {
      onRemoveHotkey(itemId)
    }
  }
  
  // Обработка нажатия клавиш для захвата HotKey
  const handleHotkeyKeyDown = (e: React.KeyboardEvent) => {
    if (!isSettingHotkey) return
    
    e.preventDefault()
    e.stopPropagation()
    
    // Игнорируем модификаторы как самостоятельные клавиши
    if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
      return
    }
    
    // Сохраняем клавишу
    setCapturedKey(e.key)
    setCapturedModifiers({
      ctrl: e.ctrlKey,
      alt: e.altKey,
      shift: e.shiftKey
    })
  }
  
  // Форматирование hotkey для отображения
  const formatHotkey = (binding: HotkeyBinding): string => {
    const parts: string[] = []
    if (binding.modifiers?.ctrl) parts.push('Ctrl')
    if (binding.modifiers?.alt) parts.push('Alt')
    if (binding.modifiers?.shift) parts.push('Shift')
    parts.push(binding.key.toUpperCase())
    return parts.join('+')
  }
  
  return (
    <div 
      className={`w-full p-3 bg-base-700/50 border border-base-600 rounded-lg ${hoverBorderColor} transition-all duration-200 group ${!isEditing && !isSettingHotkey ? 'hover:bg-base-600/50' : isSettingHotkey ? 'border-purple-500/50 bg-purple-900/20' : 'border-blue-500/50'}`}
      onKeyDown={handleHotkeyKeyDown}
      tabIndex={isSettingHotkey ? 0 : -1}
    >
      <div className="flex items-center justify-between">
        {/* Основной контент */}
        <div 
          className={`flex items-center space-x-3 flex-1 min-w-0 ${!isEditing && !isSettingHotkey ? 'cursor-pointer' : ''}`}
          onClick={() => !isEditing && !isSettingHotkey && onExecute(item)}
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
            ) : isSettingHotkey ? (
              <div className="space-y-1">
                <div className="text-sm font-medium text-purple-300 animate-pulse">
                  Нажмите клавишу...
                </div>
                {capturedKey && (
                  <div className="text-xs text-purple-400">
                    Захвачено: {formatHotkey({ type: config.type, itemId, key: capturedKey, modifiers: capturedModifiers })}
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="flex items-center space-x-2">
                  <div className="text-sm font-medium text-white truncate">
                    {displayName}
                  </div>
                  {/* Индикатор HotKey */}
                  {hotkey && onSetHotkey && (
                    <div className="flex-shrink-0 px-1.5 py-0.5 bg-purple-600/30 border border-purple-500/50 rounded text-xs text-purple-300 font-mono">
                      {formatHotkey(hotkey)}
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {subtitle}
                </div>
              </>
            )}
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
          ) : isSettingHotkey ? (
            <>
              <button
                onClick={handleSaveHotkey}
                disabled={!capturedKey}
                className="p-1.5 rounded hover:bg-green-600/20 text-green-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Сохранить HotKey"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={handleCancelHotkeyCapture}
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
              
              {/* Кнопка HotKey */}
              {onSetHotkey && (
                <button
                  onClick={hotkey ? handleRemoveHotkey : handleStartHotkeyCapture}
                  className={`p-1.5 rounded-lg transition-colors ${
                    hotkey 
                      ? 'text-purple-400 hover:text-purple-300 hover:bg-purple-900/20' 
                      : 'text-gray-500 hover:text-purple-400 hover:bg-purple-900/20'
                  }`}
                  title={hotkey ? `HotKey: ${formatHotkey(hotkey)} (клик для удаления)` : 'Задать HotKey'}
                >
                  <Keyboard className="w-3.5 h-3.5" />
                </button>
              )}
              
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

