/**
 * Оптимизированный селектор таймциклов
 * Простой список с виртуализацией + кнопки для листания
 * История использования сохраняется в localStorage
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, Sun, X, Clock } from 'lucide-react'
import type { TimecycleModifier } from '@/types/interior'

interface TimecycleSelectorProps {
  timecycles: TimecycleModifier[]
  selectedTimecycle: string
  onSelect: (timecycleName: string) => void
  searchTerm: string
  onSearchChange: (value: string) => void
  defaultTimecycle?: string // Таймцикл из интерьера
}

interface TimecycleUsageStats {
  name: string
  count: number
  lastUsed: number
}

const STORAGE_KEY = 'meshhub_timecycle_usage'
const MAX_RECENT = 10
const ITEM_HEIGHT = 42 // Высота одного элемента в пикселях
const VISIBLE_ITEMS = 12 // Количество видимых элементов

// Утилиты для работы с localStorage
function getUsageStats(): Record<string, TimecycleUsageStats> {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : {}
  } catch {
    return {}
  }
}

function saveUsageStats(stats: Record<string, TimecycleUsageStats>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats))
  } catch (e) {
    console.warn('[TimecycleSelector] Failed to save usage stats:', e)
  }
}

function trackUsage(timecycleName: string) {
  if (!timecycleName) return
  
  const stats = getUsageStats()
  const now = Date.now()
  
  if (stats[timecycleName]) {
    stats[timecycleName].count++
    stats[timecycleName].lastUsed = now
  } else {
    stats[timecycleName] = {
      name: timecycleName,
      count: 1,
      lastUsed: now
    }
  }
  
  saveUsageStats(stats)
}

export function TimecycleSelector({
  timecycles,
  selectedTimecycle,
  onSelect,
  searchTerm,
  onSearchChange,
  defaultTimecycle
}: TimecycleSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [scrollOffset, setScrollOffset] = useState(0)
  const [usageStats, setUsageStats] = useState<Record<string, TimecycleUsageStats>>({})
  const listRef = useRef<HTMLDivElement>(null)
  const frozenListRef = useRef<Array<TimecycleModifier & { isRecent: boolean }>>([])
  
  // Отслеживание времени для "провисания" таймцикла
  const selectionTimeRef = useRef<{ name: string; timestamp: number } | null>(null)
  const MIN_USAGE_TIME = 5000 // 5 секунд минимум для попадания в Recent

  // Сохраняем предыдущий выбор в Recent, если он "провисел" достаточно времени
  const saveIfLongEnough = useCallback(() => {
    if (selectionTimeRef.current) {
      const elapsed = Date.now() - selectionTimeRef.current.timestamp
      if (elapsed >= MIN_USAGE_TIME) {
        console.log(`[TimecycleSelector] 💾 Saving "${selectionTimeRef.current.name}" to Recent (used for ${Math.round(elapsed / 1000)}s)`)
        trackUsage(selectionTimeRef.current.name)
      } else {
        console.log(`[TimecycleSelector] ⏭️ Skipping "${selectionTimeRef.current.name}" - too fast (${Math.round(elapsed / 1000)}s < 5s)`)
      }
      selectionTimeRef.current = null
    }
  }, [MIN_USAGE_TIME])

  // Загружаем статистику использования при монтировании
  useEffect(() => {
    setUsageStats(getUsageStats())
    
    // Если уже что-то выбрано, запоминаем время
    if (selectedTimecycle) {
      selectionTimeRef.current = {
        name: selectedTimecycle,
        timestamp: Date.now()
      }
      console.log('[TimecycleSelector] 🕐 Started tracking:', selectedTimecycle)
    }
  }, [])

  // При размонтировании - сохраняем если провисел достаточно
  useEffect(() => {
    return () => {
      saveIfLongEnough()
      setUsageStats(getUsageStats())
    }
  }, [saveIfLongEnough])

  // Все таймциклы: Recent + остальные
  const allTimecycles = useMemo(() => {
    const tcMap = new Map(timecycles.map(tc => [tc.Name, tc]))
    
    // Недавно использованные (последние 10)
    const recentNames = Object.values(usageStats)
      .sort((a, b) => b.lastUsed - a.lastUsed)
      .slice(0, MAX_RECENT)
      .map(s => s.name)
    const recent = recentNames
      .map(name => tcMap.get(name))
      .filter((tc): tc is TimecycleModifier => tc !== undefined)
    
    // Остальные (без recent)
    const recentSet = new Set(recentNames)
    const other = timecycles.filter(tc => !recentSet.has(tc.Name))
    
    // Помечаем recent
    const recentWithFlag = recent.map(tc => ({ ...tc, isRecent: true }))
    const otherWithFlag = other.map(tc => ({ ...tc, isRecent: false }))
    
    return [...recentWithFlag, ...otherWithFlag]
  }, [timecycles, usageStats])

  // Фильтрация с учетом поиска
  const filteredTimecycles = useMemo(() => {
    if (!searchTerm) {
      return allTimecycles
    }
    
    const searchLower = searchTerm.toLowerCase()
    return allTimecycles.filter(tc =>
      tc.Name.toLowerCase().includes(searchLower) ||
      tc.DlcName.toLowerCase().includes(searchLower)
    )
  }, [allTimecycles, searchTerm])

  // Замораживаем список при открытии, обновляем статистику при закрытии
  useEffect(() => {
    if (isOpen) {
      // Когда селектор открывается, замораживаем текущий список
      frozenListRef.current = [...filteredTimecycles]
      console.log('[TimecycleSelector] Frozen list:', frozenListRef.current.length, 'items')
    } else if (frozenListRef.current.length > 0) {
      // Когда селектор закрывается, сохраняем если провисел достаточно
      saveIfLongEnough()
      // И обновляем статистику для UI
      setUsageStats(getUsageStats())
    }
  }, [isOpen, filteredTimecycles, saveIfLongEnough])

  // Виртуализация - рендерим только видимые элементы
  const visibleTimecycles = useMemo(() => {
    const startIdx = Math.floor(scrollOffset / ITEM_HEIGHT)
    const endIdx = startIdx + VISIBLE_ITEMS + 2 // +2 для буфера
    return filteredTimecycles.slice(Math.max(0, startIdx), Math.min(filteredTimecycles.length, endIdx))
  }, [filteredTimecycles, scrollOffset])

  const handleSelect = useCallback((tc: typeof allTimecycles[0]) => {
    // Сохраняем предыдущий выбор в Recent, если он провисел >= 5 сек
    if (selectionTimeRef.current && selectionTimeRef.current.name !== tc.Name) {
      const elapsed = Date.now() - selectionTimeRef.current.timestamp
      if (elapsed >= MIN_USAGE_TIME) {
        console.log(`[TimecycleSelector] 💾 Saving "${selectionTimeRef.current.name}" to Recent (used for ${Math.round(elapsed / 1000)}s)`)
        trackUsage(selectionTimeRef.current.name)
      } else {
        console.log(`[TimecycleSelector] ⏭️ Skipping "${selectionTimeRef.current.name}" - too fast (${Math.round(elapsed / 1000)}s < 5s)`)
      }
    }
    
    // Запоминаем новый выбор с текущим временем
    selectionTimeRef.current = {
      name: tc.Name,
      timestamp: Date.now()
    }
    
    console.log('[TimecycleSelector] 🎯 Selecting:', tc.Name)
    onSelect(tc.Name)
    setIsOpen(false)
  }, [onSelect, MIN_USAGE_TIME])

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollOffset(e.currentTarget.scrollTop)
  }, [])

  // Навигация кнопками (используем замороженный список)
  const handlePrevious = useCallback(() => {
    const navList = frozenListRef.current.length > 0 ? frozenListRef.current : filteredTimecycles
    
    if (!selectedTimecycle) {
      // Если ничего не выбрано, ничего не делаем
      return
    }
    
    const currentIdx = navList.findIndex(tc => tc.Name === selectedTimecycle)
    console.log('[TimecycleSelector] Previous: currentIdx =', currentIdx, 'navList.length =', navList.length)
    if (currentIdx > 0) {
      handleSelect(navList[currentIdx - 1])
    }
  }, [selectedTimecycle, filteredTimecycles, handleSelect])

  const handleNext = useCallback(() => {
    const navList = frozenListRef.current.length > 0 ? frozenListRef.current : filteredTimecycles
    
    if (!selectedTimecycle) {
      // Если ничего не выбрано, выбираем первый
      if (navList.length > 0) {
        console.log('[TimecycleSelector] Next: selecting first item from', navList.length, 'items')
        handleSelect(navList[0])
      }
      return
    }
    
    const currentIdx = navList.findIndex(tc => tc.Name === selectedTimecycle)
    console.log('[TimecycleSelector] Next: currentIdx =', currentIdx, 'navList.length =', navList.length)
    if (currentIdx < navList.length - 1) {
      handleSelect(navList[currentIdx + 1])
    }
  }, [selectedTimecycle, filteredTimecycles, handleSelect])

  // Горячие клавиши
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        handlePrevious()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        handleNext()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setIsOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handlePrevious, handleNext])

  const selectedIndex = useMemo(() => {
    // Ищем индекс в текущем отображаемом списке (filteredTimecycles)
    const index = filteredTimecycles.findIndex(tc => tc.Name === selectedTimecycle)
    console.log('[TimecycleSelector] Selected:', selectedTimecycle, 'Index in filtered:', index, 'Total filtered:', filteredTimecycles.length)
    return index
  }, [filteredTimecycles, selectedTimecycle])

  // Определяем отображаемый таймцикл
  const displayTimecycle = selectedTimecycle || defaultTimecycle || 'Custom TimeCycle'
  const isDefault = !selectedTimecycle && defaultTimecycle

  return (
    <div className="space-y-3">
      {/* КНОПКА ОТКРЫТИЯ - СВЕРХУ, КРУПНАЯ */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group w-full px-4 py-4 bg-gradient-to-r from-primary-600/20 via-primary-500/10 to-primary-600/20 hover:from-primary-600/30 hover:via-primary-500/20 hover:to-primary-600/30 border-2 border-primary-500/30 hover:border-primary-500/50 rounded-xl transition-all text-left flex items-center justify-between overflow-hidden relative shadow-lg"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-primary-500/0 via-primary-500/10 to-primary-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
        <div className="relative flex items-center space-x-3">
          <div className="p-2 bg-primary-500/20 rounded-lg">
            <Sun className="w-5 h-5 text-primary-400" />
          </div>
          <div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">
              Timecycle Manager
            </div>
            <div className="text-sm text-white font-bold">
              {isOpen ? 'Закрыть список' : 'Выбрать таймцикл'}
            </div>
          </div>
        </div>
        <div className="relative flex items-center space-x-2">
          <span className="px-2.5 py-1 bg-primary-500/20 text-primary-400 rounded-lg text-xs font-bold">
            {timecycles.length}
          </span>
          <ChevronRight className={`w-5 h-5 text-primary-400 transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`} />
        </div>
      </button>

      {/* Карточка с текущим таймциклом */}
      <div className={`relative overflow-hidden rounded-lg border-2 p-4 shadow-lg ${
        selectedTimecycle 
          ? 'border-yellow-500/50 bg-gradient-to-br from-yellow-500/20 via-yellow-500/10 to-transparent'
          : isDefault
          ? 'border-blue-500/50 bg-gradient-to-br from-blue-500/20 via-blue-500/10 to-transparent'
          : 'border-gray-500/30 bg-gradient-to-br from-gray-500/10 via-gray-500/5 to-transparent'
      }`}>
        <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl ${
          selectedTimecycle ? 'bg-yellow-500/5' : isDefault ? 'bg-blue-500/5' : 'bg-gray-500/5'
        }`} />
        <div className="relative">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center space-x-2">
              <div className={`p-2 rounded-lg ${
                selectedTimecycle ? 'bg-yellow-500/20' : isDefault ? 'bg-blue-500/20' : 'bg-gray-500/20'
              }`}>
                <Sun className={`w-5 h-5 ${
                  selectedTimecycle ? 'text-yellow-400' : isDefault ? 'text-blue-400' : 'text-gray-400'
                }`} />
              </div>
              <div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">
                  {selectedTimecycle 
                    ? '✨ Активный таймцикл'
                    : isDefault
                    ? '🏛️ Таймцикл интерьера'
                    : '🎨 Custom TimeCycle'
                  }
                </div>
                <div className={`text-sm font-bold tracking-tight ${
                  selectedTimecycle ? 'text-yellow-400' : isDefault ? 'text-blue-400' : 'text-gray-400'
                }`}>
                  {displayTimecycle}
                </div>
              </div>
            </div>
            {selectedTimecycle && (
              <button
                onClick={() => handleSelect({ Name: '', DlcName: '', ModificationsCount: 0, isRecent: false } as any)}
                className="p-1.5 hover:bg-yellow-500/20 rounded-lg transition-colors"
                title="Сбросить к дефолту"
              >
                <X className="w-4 h-4 text-yellow-400" />
              </button>
            )}
          </div>
          <div className="flex items-center justify-between text-[10px]">
            {selectedTimecycle ? (
              <>
                <span className="text-gray-500">
                  {filteredTimecycles.find(tc => tc.Name === selectedTimecycle)?.DlcName || 'Unknown'}
                </span>
                <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded font-medium">
                  #{selectedIndex >= 0 ? selectedIndex + 1 : '?'} из {filteredTimecycles.length}
                </span>
              </>
            ) : isDefault ? (
              <span className="text-blue-400/60">
                Используется таймцикл по умолчанию из YTYP
              </span>
            ) : (
              <span className="text-gray-500">
                Таймцикл не определен в интерьере
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Навигационные кнопки - КРУПНЕЕ */}
      <div className="grid grid-cols-2 gap-2 pt-2">
        <button
          onClick={handlePrevious}
          disabled={!selectedTimecycle || selectedIndex <= 0}
          className="group relative overflow-hidden flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-blue-600/20 to-blue-500/10 hover:from-blue-600/30 hover:to-blue-500/20 disabled:opacity-30 disabled:cursor-not-allowed text-blue-400 rounded-lg transition-all text-xs font-medium border border-blue-500/30 disabled:border-base-700"
          title="Предыдущий (↑)"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Предыдущий</span>
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-blue-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
        </button>
        <button
          onClick={handleNext}
          disabled={selectedTimecycle !== '' && selectedIndex >= filteredTimecycles.length - 1}
          className="group relative overflow-hidden flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-green-600/20 to-green-500/10 hover:from-green-600/30 hover:to-green-500/20 disabled:opacity-30 disabled:cursor-not-allowed text-green-400 rounded-lg transition-all text-xs font-medium border border-green-500/30 disabled:border-base-700"
          title="Следующий (↓)"
        >
          <span>Следующий</span>
          <ChevronRight className="w-5 h-5" />
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/0 via-green-500/5 to-green-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
        </button>
      </div>

      {/* Dropdown список */}
      {isOpen && (
        <div className="bg-gradient-to-b from-base-800 to-base-900 border-2 border-primary-500/30 rounded-lg overflow-hidden shadow-xl">
          {/* Поиск интегрирован в заголовок */}
          <div className="px-4 py-3 border-b-2 border-base-700/50 sticky top-0 bg-gradient-to-r from-base-800 via-base-850 to-base-800 z-10 backdrop-blur-sm space-y-2">
            {/* Поиск */}
            <div className="relative">
              <input
                type="text"
                placeholder="🔍 Начните вводить для поиска..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full px-3 py-2 pr-8 bg-base-900/50 border border-base-700 rounded-lg text-white text-xs placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 hover:border-base-600 transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-red-500/20 rounded transition-colors"
                >
                  <X className="w-3 h-3 text-red-400" />
                </button>
              )}
            </div>

            {/* Счетчик */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[10px] text-gray-500">Найдено:</span>
                <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs font-bold">
                  {filteredTimecycles.length}
                </span>
                <span className="text-gray-600 text-[10px]">/</span>
                <span className="text-gray-500 text-[10px]">{timecycles.length}</span>
              </div>
            </div>
          </div>

          {/* Виртуализированный список */}
          <div
            ref={listRef}
            onScroll={handleScroll}
            className="overflow-y-auto scrollbar-thin scrollbar-thumb-base-600 scrollbar-track-base-900"
            style={{ height: `${ITEM_HEIGHT * Math.min(VISIBLE_ITEMS, filteredTimecycles.length)}px`, maxHeight: '500px' }}
          >
            <div style={{ height: `${filteredTimecycles.length * ITEM_HEIGHT}px`, position: 'relative' }}>
              {visibleTimecycles.map((tc, idx) => {
                const actualIdx = Math.floor(scrollOffset / ITEM_HEIGHT) + idx
                const isSelected = tc.Name === selectedTimecycle
                const stat = usageStats[tc.Name]
                
                return (
                  <button
                    key={tc.Name}
                    onClick={() => handleSelect(tc)}
                    style={{
                      position: 'absolute',
                      top: `${actualIdx * ITEM_HEIGHT}px`,
                      left: 0,
                      right: 0,
                      height: `${ITEM_HEIGHT}px`
                    }}
                    className={`
                      group w-full text-left px-4 py-2 transition-all duration-150
                      border-b border-base-800/50
                      ${isSelected 
                        ? 'bg-gradient-to-r from-yellow-500/30 via-yellow-500/20 to-yellow-500/10 border-yellow-500/30' 
                        : 'hover:bg-base-750 hover:border-base-700'
                      }
                      flex items-center space-x-3
                    `}
                  >
                    {/* Индикатор номера */}
                    <div className={`
                      flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg font-bold text-[10px] transition-all
                      ${isSelected 
                        ? 'bg-yellow-500/30 text-yellow-400 ring-2 ring-yellow-500/50' 
                        : 'bg-base-800 text-gray-600 group-hover:bg-base-700 group-hover:text-gray-400'
                      }
                    `}>
                      {actualIdx + 1}
                    </div>

                    {/* Контент */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-0.5">
                        {tc.isRecent && (
                          <div className="flex-shrink-0 px-1.5 py-0.5 bg-blue-500/20 rounded text-[9px] text-blue-400 font-medium flex items-center space-x-1">
                            <Clock className="w-2.5 h-2.5" />
                            <span>Recent</span>
                          </div>
                        )}
                        <span className={`
                          truncate font-semibold text-xs
                          ${isSelected ? 'text-yellow-400' : 'text-gray-200 group-hover:text-white'}
                        `}>
                          {tc.Name}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-[10px] text-gray-500">
                        <span className="truncate">{tc.DlcName}</span>
                        <span>•</span>
                        <span>{tc.ModificationsCount} params</span>
                        {stat && stat.count > 1 && (
                          <>
                            <span>•</span>
                            <span className="text-purple-400 font-medium">×{stat.count}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Индикатор выбора */}
                    {isSelected && (
                      <div className="flex-shrink-0">
                        <div className="p-1.5 bg-yellow-500/30 rounded-lg">
                          <Sun className="w-4 h-4 text-yellow-400" />
                        </div>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
      
      {/* Hint - только когда список открыт */}
      {isOpen && (
        <div className="flex items-center justify-between px-3 py-2 bg-base-800/50 border border-base-700/50 rounded-lg">
          <div className="flex items-center space-x-3 text-[10px] text-gray-500">
            <div className="flex items-center space-x-1">
              <kbd className="px-1.5 py-0.5 bg-base-700 rounded text-gray-400 font-mono">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-base-700 rounded text-gray-400 font-mono">↓</kbd>
              <span>навигация</span>
            </div>
            <span>•</span>
            <div className="flex items-center space-x-1">
              <kbd className="px-1.5 py-0.5 bg-base-700 rounded text-gray-400 font-mono">Esc</kbd>
              <span>закрыть</span>
            </div>
          </div>
          <div className="flex items-center space-x-1 text-[10px] text-gray-600">
            <span>🎨</span>
            <span>Листайте колесиком</span>
          </div>
        </div>
      )}
    </div>
  )
}
