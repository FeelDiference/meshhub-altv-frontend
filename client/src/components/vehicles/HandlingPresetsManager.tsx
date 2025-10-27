/**
 * Компонент для управления глобальными пресетами handling параметров
 * Красивый dropdown с inline редактированием
 */

import React, { useState, useRef, useEffect } from 'react'
import { Save, ChevronDown, Edit2, Trash2, Check, X } from 'lucide-react'
import { useHandlingPresets, type HandlingPreset } from '@/hooks/useHandlingPresets'

interface HandlingPresetsManagerProps {
  // Текущие значения параметров для сохранения
  currentValues: HandlingPreset
  // Callback для применения пресета (устанавливает значения ползунков)
  onPresetLoad: (preset: HandlingPreset) => void
  // Отключить управление (например, когда нет машины)
  disabled?: boolean
}

/**
 * Компонент управления пресетами handling
 */
export const HandlingPresetsManager: React.FC<HandlingPresetsManagerProps> = ({
  currentValues,
  onPresetLoad,
  disabled = false,
}) => {
  const {
    presetsList,
    isLoading,
    loadPreset,
    savePreset,
    deletePreset,
    renamePreset,
  } = useHandlingPresets()

  // UI состояния
  const [showSaveInput, setShowSaveInput] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [presetName, setPresetName] = useState('')
  const [editingPreset, setEditingPreset] = useState<string | null>(null)
  const [newPresetName, setNewPresetName] = useState('')
  
  // Refs для управления кликами вне
  const dropdownRef = useRef<HTMLDivElement>(null)
  const saveInputRef = useRef<HTMLInputElement>(null)
  
  // Закрытие dropdown при клике вне
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showDropdown])
  
  // Фокус на input при открытии
  useEffect(() => {
    if (showSaveInput && saveInputRef.current) {
      saveInputRef.current.focus()
    }
  }, [showSaveInput])

  /**
   * Обработчик сохранения пресета
   */
  const handleSave = async () => {
    if (!presetName.trim()) {
      return
    }

    const success = await savePreset(presetName, currentValues)
    
    if (success) {
      setShowSaveInput(false)
      setPresetName('')
    }
  }

  /**
   * Обработчик загрузки пресета
   */
  const handleLoad = async (name: string) => {
    const preset = await loadPreset(name)
    
    if (preset) {
      onPresetLoad(preset)
      setShowDropdown(false)
    }
  }

  /**
   * Обработчик удаления пресета
   */
  const handleDelete = async (name: string, e: React.MouseEvent) => {
    e.stopPropagation()
    
    console.log('[HandlingPresetsManager] Delete requested for:', name)
    
    // В Alt:V WebView window.confirm может не работать, поэтому делаем прямое удаление
    // Пользователь видит только иконку корзины, что уже намекает на удаление
    const success = await deletePreset(name)
    
    console.log('[HandlingPresetsManager] Delete result:', success)
  }

  /**
   * Обработчик переименования пресета
   */
  const handleRename = async (oldName: string) => {
    if (!newPresetName.trim() || newPresetName === oldName) {
      setEditingPreset(null)
      setNewPresetName('')
      return
    }

    const success = await renamePreset(oldName, newPresetName)
    
    if (success) {
      setEditingPreset(null)
      setNewPresetName('')
    }
  }

  /**
   * Начать редактирование имени пресета
   */
  const startEditing = (name: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingPreset(name)
    setNewPresetName(name)
  }

  /**
   * Отменить редактирование
   */
  const cancelEditing = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    setEditingPreset(null)
    setNewPresetName('')
  }

  return (
    <div className="space-y-2">
      {/* Основная строка: Dropdown слева, кнопка сохранения справа */}
      <div className="flex items-center gap-2">
        {/* Dropdown с пресетами */}
        <div className="relative flex-1" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            disabled={disabled}
            className="flex items-center justify-between w-full px-3 py-2 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 disabled:cursor-not-allowed text-white rounded text-sm transition-colors border border-gray-700"
            title={presetsList.length === 0 ? "Нет сохранённых пресетов" : "Выбрать пресет"}
          >
            <span>
              {isLoading ? 'Загрузка...' : `Пресеты (${presetsList.length})`}
            </span>
            <ChevronDown size={16} className={`transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown список */}
          {showDropdown && (
            <div 
              className="dropdown-scrollbar absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded shadow-lg z-50 max-h-[100px] overflow-y-auto"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#4b5563 #1f2937'
              }}
            >
              {presetsList.length === 0 ? (
                <div className="px-3 py-4 text-center text-gray-400 text-sm">
                  Нет сохранённых пресетов
                </div>
              ) : (
                <div className="py-1">
                  {presetsList.map((name) => (
                    <div
                      key={name}
                      className="group hover:bg-gray-700 transition-colors"
                    >
                      {editingPreset === name ? (
                        // Режим редактирования
                        <div className="flex items-center gap-2 px-3 py-2">
                          <input
                            type="text"
                            value={newPresetName}
                            onChange={(e) => setNewPresetName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleRename(name)
                              } else if (e.key === 'Escape') {
                                cancelEditing()
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="flex-1 bg-gray-900 text-white px-2 py-1 rounded border border-gray-600 focus:outline-none focus:border-blue-500 text-sm"
                            autoFocus
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRename(name)
                            }}
                            className="p-1 text-green-500 hover:text-green-400"
                            title="Сохранить"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="p-1 text-red-500 hover:text-red-400"
                            title="Отмена"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        // Обычный режим
                        <div
                          className="flex items-center justify-between px-3 py-2 cursor-pointer"
                          onClick={() => handleLoad(name)}
                        >
                          <span className="text-white text-sm flex-1">{name}</span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => startEditing(name, e)}
                              className="p-1 text-gray-400 hover:text-blue-400 transition-colors"
                              title="Переименовать"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={(e) => handleDelete(name, e)}
                              className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                              title="Удалить"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Кнопка сохранения (только иконка) */}
        <button
          onClick={() => setShowSaveInput(true)}
          disabled={disabled || Object.keys(currentValues).length === 0}
          className="p-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded transition-colors shadow-md hover:shadow-lg"
          title="Сохранить текущие значения как новый пресет"
        >
          <Save size={20} />
        </button>
      </div>

      {/* Input для сохранения пресета (появляется при клике на кнопку сохранения) */}
      {showSaveInput && (
        <div className="flex items-center gap-2">
          <input
            ref={saveInputRef}
            type="text"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSave()
              } else if (e.key === 'Escape') {
                setShowSaveInput(false)
                setPresetName('')
              }
            }}
            placeholder="Имя пресета..."
            className="flex-1 bg-gray-900 text-white px-3 py-2 rounded border border-gray-700 focus:outline-none focus:border-blue-500 text-sm"
          />
          <button
            onClick={handleSave}
            disabled={!presetName.trim()}
            className="p-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded transition-colors"
            title="Сохранить"
          >
            <Check size={16} />
          </button>
          <button
            onClick={() => {
              setShowSaveInput(false)
              setPresetName('')
            }}
            className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
            title="Отмена"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  )
}

export default HandlingPresetsManager

