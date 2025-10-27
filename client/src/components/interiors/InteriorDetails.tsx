/**
 * Компонент деталей интерьера (блок 1 справа)
 * Показывает информацию об интерьере и управление редакторами YTYP/YMAP
 */

import React from 'react'
import { 
  Building2, 
  Maximize2, 
  Minimize2, 
  Eye, 
  EyeOff,
  FileCode,
  Map,
  Sun,
  Package,
  Check,
  Edit2,
  Monitor,
  MonitorOff
} from 'lucide-react'
import toast from 'react-hot-toast'
import type { InteriorResource, InteriorEditorMode } from '@/types/interior'
import { useTimecycles } from '@/hooks/useTimecycles'
import { TimecycleSelector } from './TimecycleSelector'

interface InteriorDetailsProps {
  interior: InteriorResource
  editorMode: InteriorEditorMode
  onEditorModeChange: (mode: InteriorEditorMode) => void
  onFocusModeToggle?: () => void
  focusMode?: boolean
  currentInteriorId?: number // GTA V interior ID от нативки
  portalsVisible?: boolean
  onTogglePortals?: () => void
  entitySets?: string[] // Реальные Entity Sets из YTYP
  entitySetMappings?: Record<string, string> // Маппинг хэшей к именам
  onSaveEntitySetMapping?: (hash: string, realName: string) => void
  defaultTimecycle?: string // Таймцикл из YTYP (из первой комнаты с таймциклом)
  liveEditVisible?: boolean
  onToggleLiveEdit?: () => void
}

export function InteriorDetails({ 
  interior, 
  editorMode,
  onEditorModeChange,
  onFocusModeToggle,
  focusMode = false,
  currentInteriorId,
  portalsVisible = false,
  onTogglePortals,
  entitySets: externalEntitySets = [],
  entitySetMappings = {},
  onSaveEntitySetMapping,
  defaultTimecycle,
  liveEditVisible = false,
  onToggleLiveEdit
}: InteriorDetailsProps) {
  
  // Загружаем список таймциклов
  const { timecycles, loading: timecyclesLoading } = useTimecycles()
  
  // State для Timecycle и Entity Sets
  const [selectedTimecycle, setSelectedTimecycle] = React.useState<string>('')
  const [timecycleSearch, setTimecycleSearch] = React.useState<string>('')
  const [entitySetSearch, setEntitySetSearch] = React.useState<string>('')
  const [activeEntitySets, setActiveEntitySets] = React.useState<Set<string>>(new Set())
  
  // State для inline-редактирования entity sets
  const [editingEntitySet, setEditingEntitySet] = React.useState<string | null>(null)
  const [editingValue, setEditingValue] = React.useState<string>('')
  
  // Список entity sets (только реальные из YTYP)
  const entitySetsList: string[] = React.useMemo(() => {
    return externalEntitySets
  }, [externalEntitySets])
  
  // Фильтрация теперь внутри TimecycleSelector (оптимизировано)
  
  // Фильтрация entity sets по поиску
  const filteredEntitySets = React.useMemo(() => {
    if (!entitySetSearch) return entitySetsList
    const search = entitySetSearch.toLowerCase()
    return entitySetsList.filter(name => name.toLowerCase().includes(search))
  }, [entitySetSearch, entitySetsList])
  
  /**
   * Переключить фокус режим
   */
  const handleFocusToggle = () => {
    if (onFocusModeToggle) {
      const newMode = focusMode ? 'off' : 'details'
      ;(window as any).__focusMode = newMode
      window.dispatchEvent(new CustomEvent('focusModeChanged', { detail: { mode: newMode } }))
      onFocusModeToggle()
    }
  }
  
  /**
   * Сменить Timecycle
   */
  const handleTimecycleChange = (timecycleName: string) => {
    console.log('[InteriorDetails] 🎨 Timecycle change:', { timecycleName, currentInteriorId })
    setSelectedTimecycle(timecycleName)
    
    if (!timecycleName) {
      // Пустое значение = очистка таймцикла
      if (typeof window !== 'undefined' && 'alt' in window && (window as any).alt) {
        const clearData = { interiorId: currentInteriorId }
        console.log('[InteriorDetails] 🧹 Clearing timecycle:', clearData)
        ;(window as any).alt.emit('interior:timecycle:clear', clearData)
        toast.success('Таймцикл сброшен')
      }
      return
    }
    
    if (typeof window !== 'undefined' && 'alt' in window && (window as any).alt) {
      const setData = {
        interiorId: currentInteriorId,
        timecycleName: timecycleName
      }
      console.log('[InteriorDetails] ✅ Setting timecycle:', setData)
      ;(window as any).alt.emit('interior:timecycle:set', setData)
      
      // Находим информацию о таймцикле
      const tcInfo = timecycles.find(tc => tc.Name === timecycleName)
      const info = tcInfo ? `${tcInfo.Name} (${tcInfo.ModificationsCount} params)` : timecycleName
      
      toast.success(`Timecycle: ${info}`)
    } else {
      toast(`Timecycle: ${timecycleName} (мокап)`, { icon: '☀️' })
    }
  }
  
  /**
   * Toggle Entity Set
   */
  const handleEntitySetToggle = (entitySetName: string) => {
    setActiveEntitySets(prev => {
      const newSet = new Set(prev)
      const newActive = !newSet.has(entitySetName)
      
      if (newActive) {
        newSet.add(entitySetName)
      } else {
        newSet.delete(entitySetName)
      }
      
      // Отправляем событие в Alt:V
      if (typeof window !== 'undefined' && 'alt' in window && (window as any).alt) {
        const event = newActive ? 'interior:entityset:activate' : 'interior:entityset:deactivate'
        ;(window as any).alt.emit(event, {
          interiorId: currentInteriorId,
          entitySetName
        })
        toast.success(`${entitySetName}: ${newActive ? 'включен' : 'выключен'}`)
      } else {
        toast(`${entitySetName}: ${newActive ? 'вкл' : 'выкл'} (мокап)`, { icon: '📦' })
      }
      
      return newSet
    })
  }
  
  /**
   * Начать редактирование entity set
   */
  const startEditingEntitySet = (hashName: string) => {
    setEditingEntitySet(hashName)
    setEditingValue(entitySetMappings[hashName] || hashName.replace('hash_', ''))
  }
  
  /**
   * Сохранить переименование entity set
   */
  const saveEntitySetRename = (hashName: string) => {
    if (!onSaveEntitySetMapping) {
      toast.error('Функция сохранения недоступна')
      setEditingEntitySet(null)
      return
    }
    
    const trimmedValue = editingValue.trim()
    if (trimmedValue && trimmedValue !== hashName) {
      onSaveEntitySetMapping(hashName, trimmedValue)
      toast.success(`Сохранено: ${trimmedValue}`)
    }
    
    setEditingEntitySet(null)
    setEditingValue('')
  }
  
  /**
   * Отменить редактирование
   */
  const cancelEditingEntitySet = () => {
    setEditingEntitySet(null)
    setEditingValue('')
  }
  
  /**
   * Получить отображаемое имя entity set (с учетом маппинга)
   */
  const getDisplayName = (name: string): string => {
    // Если это хэш и есть маппинг - показываем реальное имя
    if (name.startsWith('hash_') && entitySetMappings[name]) {
      return entitySetMappings[name]
    }
    return name
  }
  
  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Building2 className="w-5 h-5 text-green-400" />
          <div className="text-sm font-semibold text-white">
            {interior.displayName || interior.name}
          </div>
        </div>
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
      
      {/* Информация об интерьере */}
      {currentInteriorId !== undefined && (
        <div className="mb-4 p-3 bg-base-800/50 rounded-lg border border-base-700">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Interior ID:</span>
            <span className="text-sm text-purple-400">{currentInteriorId}</span>
          </div>
        </div>
      )}
      
      {/* Переключатель режима редактора */}
      <div className="space-y-2 mb-4">
        <div className="text-xs font-medium text-gray-400 mb-2">Режим редактора:</div>
        
        {/* YTYP режим */}
        <button
          onClick={() => onEditorModeChange('ytyp')}
          className={`w-full flex items-center justify-between p-3 rounded-lg transition-all duration-200 border ${
            editorMode === 'ytyp'
              ? 'bg-gradient-to-r from-purple-900/30 to-fuchsia-900/30 border-purple-500/50 text-white'
              : 'bg-base-800/50 border-base-700 text-gray-300 hover:bg-base-700 hover:border-base-600'
          }`}
        >
          <div className="flex items-center space-x-2">
            <FileCode className={`w-4 h-4 ${editorMode === 'ytyp' ? 'text-purple-400' : 'text-gray-400'}`} />
            <div className="text-left">
              <div className="text-sm font-semibold">Редактор YTYP</div>
              <div className="text-xs text-gray-400">Архетипы объектов</div>
            </div>
          </div>
          {editorMode === 'ytyp' && (
            <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
          )}
        </button>
        
        {/* YMAP режим */}
        <button
          onClick={() => onEditorModeChange('ymap')}
          className={`w-full flex items-center justify-between p-3 rounded-lg transition-all duration-200 border ${
            editorMode === 'ymap'
              ? 'bg-gradient-to-r from-blue-900/30 to-cyan-900/30 border-blue-500/50 text-white'
              : 'bg-base-800/50 border-base-700 text-gray-300 hover:bg-base-700 hover:border-base-600'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Map className={`w-4 h-4 ${editorMode === 'ymap' ? 'text-blue-400' : 'text-gray-400'}`} />
            <div className="text-left">
              <div className="text-sm font-semibold">Редактор YMAP</div>
              <div className="text-xs text-gray-400">Размещение в мире</div>
            </div>
          </div>
          {editorMode === 'ymap' && (
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          )}
        </button>
      </div>
      
      {/* Diagnostics Section */}
      <div className="space-y-2 pt-4 border-t border-base-700">
        <div className="text-xs font-medium text-gray-400 mb-2">Диагностика:</div>
        
        <button
          onClick={onTogglePortals}
          className={`w-full flex items-center justify-between p-3.5 rounded-lg text-sm font-medium transition-all border ${
            portalsVisible
              ? 'bg-green-600/20 border-green-500/50 text-green-300'
              : 'bg-base-800/50 border-base-700 text-gray-300 hover:bg-base-700'
          }`}
        >
          <div className="flex items-center space-x-2">
            {portalsVisible ? (
              <Eye className="w-5 h-5 text-green-400" />
            ) : (
              <EyeOff className="w-5 h-5 text-gray-400" />
            )}
            <span>Показать порталы</span>
          </div>
          <div className={`
            relative inline-flex h-4 w-8 items-center rounded-full transition-colors flex-shrink-0
            ${portalsVisible ? 'bg-green-500' : 'bg-gray-600'}
          `}>
            <span className={`
              inline-block h-3 w-3 transform rounded-full bg-white transition-transform
              ${portalsVisible ? 'translate-x-4' : 'translate-x-0.5'}
            `} />
          </div>
        </button>
        
        {/* Separator with spacing */}
        <div className="h-px bg-base-700 mt-3"></div>
        
        {/* Live Debug Button */}
        <button
          onClick={onToggleLiveEdit}
          className={`w-full flex items-center justify-between p-3.5 rounded-lg text-sm font-medium transition-all border ${
            liveEditVisible
              ? 'bg-cyan-600/20 border-cyan-500/50 text-cyan-300'
              : 'bg-base-800/50 border-base-700 text-gray-300 hover:bg-base-700'
          }`}
        >
          <div className="flex items-center space-x-2">
            {liveEditVisible ? (
              <Monitor className="w-5 h-5 text-cyan-400" />
            ) : (
              <MonitorOff className="w-5 h-5 text-gray-400" />
            )}
            <span>Live Debug</span>
          </div>
          <div className={`
            relative inline-flex h-4 w-8 items-center rounded-full transition-colors flex-shrink-0
            ${liveEditVisible ? 'bg-cyan-500' : 'bg-gray-600'}
          `}>
            <span className={`
              inline-block h-3 w-3 transform rounded-full bg-white transition-transform
              ${liveEditVisible ? 'translate-x-4' : 'translate-x-0.5'}
            `} />
          </div>
        </button>
        
        {/* Separator after Live Debug button */}
        <div className="h-px bg-base-700 mt-3"></div>
      </div>
      
      {/* Timecycle Selection with Search - OPTIMIZED */}
      <div className="space-y-2 pt-4 pb-4 border-t border-base-700">
        <div className="text-xs font-medium text-gray-400 mb-2 flex items-center space-x-2">
          <Sun className="w-3.5 h-3.5 text-yellow-400" />
          <span>Timecycle (освещение):</span>
        </div>
        
        {timecyclesLoading ? (
          <div className="text-xs text-gray-400 py-2">Загрузка таймциклов...</div>
        ) : (
          <TimecycleSelector
            timecycles={timecycles}
            selectedTimecycle={selectedTimecycle}
            onSelect={handleTimecycleChange}
            searchTerm={timecycleSearch}
            onSearchChange={setTimecycleSearch}
            defaultTimecycle={defaultTimecycle}
          />
        )}
      </div>
      
      {/* Entity Sets with Search */}
      <div className="space-y-2 pt-4 border-t border-base-700">
        <div className="text-xs font-medium text-gray-400 mb-2 flex items-center space-x-2">
          <Package className="w-3.5 h-3.5 text-purple-400" />
          <span>Entity Sets ({entitySetsList.length}):</span>
        </div>
        
        {/* Поиск entity sets */}
        <input
          type="text"
          placeholder="Поиск entity set..."
          value={entitySetSearch}
          onChange={(e) => setEntitySetSearch(e.target.value)}
          className="w-full px-2 py-1.5 bg-base-800 border border-base-700 rounded text-white text-xs placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 hover:border-base-600 transition-all"
        />
        
        {/* Список с фильтрацией и скроллом */}
        <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
          {entitySetsList.length === 0 ? (
            <div className="text-center py-4 text-xs text-gray-500">
              Для этого интерьера нет entity sets
            </div>
          ) : filteredEntitySets.length > 0 ? (
            filteredEntitySets.map(name => {
              const isActive = activeEntitySets.has(name)
              const displayName = getDisplayName(name)
              const isHash = name.startsWith('hash_')
              const hasMapp = entitySetMappings[name] !== undefined
              const isEditing = editingEntitySet === name
              
              return (
                <div
                  key={name}
                  className={`w-full flex items-center gap-2 p-2 rounded-lg text-xs transition-all border ${
                    isActive
                      ? 'bg-green-600/20 border-green-500/50'
                      : 'bg-base-800/50 border-base-700 hover:bg-base-700'
                  }`}
                >
                  {/* Блок с названием/редактированием */}
                  <div className="flex-1 flex items-center justify-between">
                    {isEditing ? (
                      // Режим редактирования
                      <input
                        type="text"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            saveEntitySetRename(name)
                          } else if (e.key === 'Escape') {
                            cancelEditingEntitySet()
                          }
                        }}
                        onBlur={() => saveEntitySetRename(name)}
                        autoFocus
                        className="flex-1 px-2 py-1 bg-base-900 border border-blue-500/50 rounded text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Введите имя..."
                      />
                    ) : (
                      // Обычный режим - кликабельная кнопка
                      <button
                        onClick={() => handleEntitySetToggle(name)}
                        className="flex-1 flex items-center justify-between text-left"
                      >
                        <div className="truncate flex-1">
                          <div className={isActive ? 'text-green-300' : 'text-gray-400'}>
                            {displayName}
                          </div>
                          {isHash && hasMapp && (
                            <div className="text-xs text-gray-600 truncate mt-0.5">{name}</div>
                          )}
                        </div>
                        {isActive && (
                          <Check className="w-3.5 h-3.5 text-green-400 ml-2" />
                        )}
                      </button>
                    )}
                  </div>
                  
                  {/* Кнопка переименования только для хэшей */}
                  {isHash && onSaveEntitySetMapping && !isEditing && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        startEditingEntitySet(name)
                      }}
                      className="p-1.5 rounded hover:bg-blue-600/20 border border-blue-500/50 text-blue-400 transition-all flex-shrink-0"
                      title="Переименовать entity set"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )
            })
          ) : (
            <div className="text-center py-3 text-xs text-gray-500">
              Не найдено по запросу
            </div>
          )}
        </div>
        
        {entitySetSearch && (
          <div className="text-xs text-gray-500">
            Найдено: {filteredEntitySets.length} из {entitySetsList.length}
          </div>
        )}
      </div>
    </div>
  )
}

export default InteriorDetails




