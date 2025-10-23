import React, { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Target, Zap, Eye, Volume2, ArrowUp, ArrowDown } from 'lucide-react'
import toast from 'react-hot-toast'

interface WeaponModulesProps {
  disabled?: boolean
  weaponName?: string
}

// Категории модулей оружия
interface WeaponModuleCategory {
  id: number
  name: string
  icon: React.ReactNode
  description: string
  componentType: string
}

// Модули оружия
interface WeaponModule {
  hash: number
  name: string
  description: string
  category: number
  modifiers?: Record<string, number> // Изменения параметров оружия
}

// Словарь человеческих названий и технических названий модулей
const MODULE_CATEGORIES: Record<number, { human: string; technical: string }> = {
  0: { human: 'Прицелы', technical: 'COMPONENT_AT_SCOPE' },
  1: { human: 'Дульные тормоза', technical: 'COMPONENT_AT_MUZZLE' },
  2: { human: 'Глушители', technical: 'COMPONENT_AT_AR_SUPP' },
  3: { human: 'Фонари', technical: 'COMPONENT_AT_AR_FLSH' },
  4: { human: 'Ручки', technical: 'COMPONENT_AT_AR_AFGRIP' },
  5: { human: 'Магазины', technical: 'COMPONENT_AT_AR_CLIP' },
  6: { human: 'Обвесы', technical: 'COMPONENT_AT_PI_CLIP' },
  7: { human: 'Лазеры', technical: 'COMPONENT_AT_PI_FLSH' },
  8: { human: 'Стволы', technical: 'COMPONENT_AT_PI_SUPP' },
  9: { human: 'Кожухи', technical: 'COMPONENT_AT_SC_BARREL' }
}

// Словарь названий параметров оружия
const PARAM_NAMES: Record<string, string> = {
  damage: 'Урон',
  force: 'Сила отдачи',
  forceHitPed: 'Сила удара (люди)',
  forceHitVehicle: 'Сила удара (тр-ты)',
  accuracySpread: 'Разброс',
  recoilAccuracyMax: 'Макс. отдача',
  recoilErrorTime: 'Время ошибки отдачи',
  recoilRecoveryRate: 'Скорость восстановления',
  clipSize: 'Размер магазина',
  timeBetweenShots: 'Время между выстрелами',
  bulletsInBatch: 'Пуль за выстрел',
  reloadTimeMP: 'Время перезарядки MP',
  reloadTimeSP: 'Время перезарядки SP',
  animReloadTime: 'Время анимации',
  speed: 'Скорость пули',
  range: 'Дальность',
  networkPlayerDamageModifier: 'Мод. урона (игроки)',
  networkPedDamageModifier: 'Мод. урона (NPC)',
}

// Функция для форматирования модификатора
const formatModifier = (_key: string, value: number): string => {
  const sign = value > 0 ? '+' : ''
  const formatted = value % 1 === 0 ? value.toString() : value.toFixed(2)
  return `${sign}${formatted}`
}

const WEAPON_MODULE_CATEGORIES: WeaponModuleCategory[] = [
  { id: 0, name: 'Прицелы', icon: <Eye className="w-4 h-4" />, description: 'Оптические прицелы', componentType: 'COMPONENT_AT_SCOPE' },
  { id: 1, name: 'Дульные тормоза', icon: <Zap className="w-4 h-4" />, description: 'Дульные тормоза и компенсаторы', componentType: 'COMPONENT_AT_MUZZLE' },
  { id: 2, name: 'Глушители', icon: <Volume2 className="w-4 h-4" />, description: 'Глушители звука', componentType: 'COMPONENT_AT_AR_SUPP' },
  { id: 3, name: 'Фонари', icon: <Zap className="w-4 h-4" />, description: 'Тактические фонари', componentType: 'COMPONENT_AT_AR_FLSH' },
  { id: 4, name: 'Ручки', icon: <Target className="w-4 h-4" />, description: 'Передние рукоятки', componentType: 'COMPONENT_AT_AR_AFGRIP' },
  { id: 5, name: 'Магазины', icon: <Target className="w-4 h-4" />, description: 'Расширенные магазины', componentType: 'COMPONENT_AT_AR_CLIP' },
  { id: 6, name: 'Обвесы', icon: <Target className="w-4 h-4" />, description: 'Обвесы пистолетов', componentType: 'COMPONENT_AT_PI_CLIP' },
  { id: 7, name: 'Лазеры', icon: <Zap className="w-4 h-4" />, description: 'Лазерные целеуказатели', componentType: 'COMPONENT_AT_PI_FLSH' },
  { id: 8, name: 'Стволы', icon: <Target className="w-4 h-4" />, description: 'Стволы пистолетов', componentType: 'COMPONENT_AT_PI_SUPP' },
  { id: 9, name: 'Кожухи', icon: <Target className="w-4 h-4" />, description: 'Кожухи снайперских винтовок', componentType: 'COMPONENT_AT_SC_BARREL' }
]

const WeaponModules: React.FC<WeaponModulesProps> = ({ disabled = false, weaponName }) => {
  const [selectedCategory, setSelectedCategory] = useState(0)
  const [categoryModules, setCategoryModules] = useState<Record<number, WeaponModule[]>>({})
  const [currentModules, setCurrentModules] = useState<Record<number, number>>({})
  const [loading, setLoading] = useState(false)
  const [availableCategories, setAvailableCategories] = useState<number[]>([])

  // Загрузить модули для категории
  const loadCategoryModules = async (categoryId: number) => {
    if (categoryModules[categoryId]) return

    setLoading(true)
    try {
      if (typeof window !== 'undefined' && 'alt' in window) {
        const alt = (window as any).alt
        if (alt && typeof alt.emit === 'function') {
          alt.emit('weapon:modules:get', { categoryId, weaponName })
        }
      }
    } catch (error) {
      console.error('[WeaponModules] Error loading modules:', error)
    } finally {
      setLoading(false)
    }
  }

  // Навигация по категориям колесом мыши
  const handleWheelNavigation = (e: React.WheelEvent) => {
    if (availableCategories.length === 0) return
    
    e.preventDefault()
    const currentIndex = availableCategories.indexOf(selectedCategory)
    let newIndex = currentIndex
    
    if (e.deltaY > 0) {
      // Прокрутка вниз - следующая категория
      newIndex = (currentIndex + 1) % availableCategories.length
    } else {
      // Прокрутка вверх - предыдущая категория
      newIndex = currentIndex === 0 ? availableCategories.length - 1 : currentIndex - 1
    }
    
    const newCategory = availableCategories[newIndex]
    setSelectedCategory(newCategory)
    loadCategoryModules(newCategory)
  }

  // Применить модуль
  const applyModule = (categoryId: number, moduleIndex: number) => {
    if (disabled) {
      toast.error('Вы должны держать оружие для установки модулей')
      return
    }

    try {
      if (typeof window !== 'undefined' && 'alt' in window) {
        const alt = (window as any).alt
        if (alt && typeof alt.emit === 'function') {
          alt.emit('weapon:modules:apply', { categoryId, moduleIndex })
          setCurrentModules(prev => ({ ...prev, [categoryId]: moduleIndex }))
          toast.success('Модуль установлен')
        }
      }
    } catch (error) {
      console.error('[WeaponModules] Error applying module:', error)
      toast.error('Ошибка установки модуля')
    }
  }

  // Переключить модуль в категории
  const changeModule = (direction: 'prev' | 'next') => {
    const category = WEAPON_MODULE_CATEGORIES.find(c => c.id === selectedCategory)
    if (!category) return

    const modules = categoryModules[category.id] || []
    const currentModule = currentModules[category.id] ?? -1
    
    let newModule = currentModule
    if (direction === 'next') {
      newModule = currentModule >= modules.length - 1 ? -1 : currentModule + 1
    } else {
      newModule = currentModule <= -1 ? modules.length - 1 : currentModule - 1
    }
    
    applyModule(category.id, newModule)
  }

  // Загрузить модули при смене категории
  useEffect(() => {
    const category = WEAPON_MODULE_CATEGORIES.find(c => c.id === selectedCategory)
    if (category) {
      loadCategoryModules(category.id)
    }
  }, [selectedCategory])

  // При инициализации проверяем все категории на доступность
  useEffect(() => {
    console.log('[WeaponModules] 🔧 Starting auto-detect for weapon:', weaponName)
    // Сбрасываем доступные категории при смене оружия
    setAvailableCategories([])
    setCategoryModules({})
    setCurrentModules({})
    
    // Проверяем все категории на доступность
    WEAPON_MODULE_CATEGORIES.forEach(category => {
      loadCategoryModules(category.id)
    })
  }, [weaponName])

  // Слушаем ответы от AltV
  useEffect(() => {
    if (typeof window === 'undefined' || !('alt' in window)) return

    const handleModulesResponse = (data: { categoryId: number; modules: WeaponModule[]; currentModule: number }) => {
      const modules = data.modules || []
      
      console.log(`[WeaponModules] 📡 Received modules for category ${data.categoryId}: ${modules.length} modules`)
      
      setCategoryModules(prev => ({ ...prev, [data.categoryId]: modules }))
      setCurrentModules(prev => ({ ...prev, [data.categoryId]: data.currentModule }))
      
      // Обновляем список доступных категорий
      setAvailableCategories(prev => {
        const newCategories = [...prev]
        if (modules.length > 0 && !newCategories.includes(data.categoryId)) {
          newCategories.push(data.categoryId)
          newCategories.sort((a, b) => a - b)
          console.log(`[WeaponModules] ✅ Added category ${data.categoryId} to available list`)
        } else if (modules.length === 0 && newCategories.includes(data.categoryId)) {
          const index = newCategories.indexOf(data.categoryId)
          newCategories.splice(index, 1)
          console.log(`[WeaponModules] ❌ Removed category ${data.categoryId} from available list`)
        }
        return newCategories
      })
    }

    const alt = (window as any).alt
    if (alt && typeof alt.on === 'function') {
      alt.on('weapon:modules:response', handleModulesResponse)
    }

    return () => {
      if (alt && typeof alt.off === 'function') {
        alt.off('weapon:modules:response', handleModulesResponse)
      }
    }
  }, [])

  return (
    <div className="space-y-4">
      {/* Выбор категории - только доступные */}
      <div 
        className="space-y-2"
        onWheel={handleWheelNavigation}
      >
        <div className="text-sm font-medium text-gray-300 mb-2">
          Модули оружия:
          <span className="text-xs text-gray-400 ml-2">
            ({availableCategories.length} доступно)
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {availableCategories.length > 0 ? (
            availableCategories.map((categoryId) => {
              const category = WEAPON_MODULE_CATEGORIES.find(c => c.id === categoryId)
              if (!category) return null
              
              const categoryInfo = MODULE_CATEGORIES[categoryId]
              const humanName = categoryInfo?.human || category.name
              const technicalName = categoryInfo?.technical || `COMPONENT_AT_${categoryId}`
              
              return (
                <button
                  key={category.id}
                  onClick={() => {
                    setSelectedCategory(categoryId)
                    loadCategoryModules(categoryId)
                  }}
                  className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    selectedCategory === categoryId
                      ? 'bg-primary-600 text-white'
                      : 'bg-base-800 text-gray-300 hover:bg-base-700'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    {category.icon}
                    <span className="truncate font-semibold">{humanName}</span>
                  </div>
                  <span className="text-xs opacity-70">({technicalName})</span>
                </button>
              )
            })
          ) : (
            <div className="col-span-2 text-center py-4">
              <div className="text-sm text-orange-400 mb-2">
                🔧 Загрузка модулей...
              </div>
              <div className="text-xs text-gray-500">
                Проверяем доступные модули для оружия
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Переключатель модулей */}
      {availableCategories.includes(selectedCategory) && (
        <div className="bg-base-900/50 border border-base-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex flex-col space-y-1">
              <div className="flex items-center space-x-2">
                {WEAPON_MODULE_CATEGORIES.find(c => c.id === selectedCategory)?.icon}
                <span className="text-sm font-medium text-white">
                  {(() => {
                    const categoryInfo = MODULE_CATEGORIES[selectedCategory]
                    return categoryInfo?.human || WEAPON_MODULE_CATEGORIES.find(c => c.id === selectedCategory)?.name
                  })()}
                </span>
              </div>
              <span className="text-xs text-gray-400">
                ({MODULE_CATEGORIES[selectedCategory]?.technical || `COMPONENT_AT_${selectedCategory}`})
              </span>
            </div>
            <div className="text-xs text-gray-400">
              {(() => {
                const modules = categoryModules[selectedCategory] || []
                const currentModule = currentModules[selectedCategory] ?? -1
                
                if (modules.length === 0) {
                  return 'Недоступно'
                }
                
                // Display current module index properly: -1 = stock (0), 0+ = actual module index
                const displayIndex = currentModule === -1 ? 0 : currentModule + 1
                const totalOptions = modules.length
                
                return `${displayIndex} / ${totalOptions}`
              })()}
            </div>
          </div>

          {/* Информация о недоступности модулей */}
          {!loading && (categoryModules[selectedCategory] || []).length === 0 && (
            <div className="text-center py-4">
              <div className="text-sm text-orange-400 mb-2">
                ⚠️ Модули недоступны
              </div>
              <div className="text-xs text-gray-500">
                Это оружие не поддерживает модули для данной категории
              </div>
            </div>
          )}

          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={() => changeModule('prev')}
              disabled={disabled || (categoryModules[selectedCategory] || []).length === 0}
              className="p-2 rounded-lg bg-base-800 hover:bg-base-700 text-gray-300 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex-1 text-center">
              {loading ? (
                <div className="text-sm text-gray-500">Загрузка...</div>
              ) : (
                <div className="space-y-2">
                  <div className="text-sm text-white">
                    {(() => {
                      const modules = categoryModules[selectedCategory] || []
                      const currentModule = currentModules[selectedCategory] ?? -1
                      
                      if (modules.length === 0) {
                        return 'Модули недоступны'
                      }
                      
                      if (currentModule === -1) return 'Стандарт'
                      
                      const module = modules[currentModule]
                      if (!module) return `Модуль #${currentModule + 1}`
                      
                      // Простое отображение названия модуля
                      const name = module.name || `Модуль #${currentModule + 1}`
                      
                      return (
                        <div className="flex items-center justify-center">
                          <span className="text-white">
                            {name}
                          </span>
                        </div>
                      )
                    })()}
                  </div>
                  
                  {/* Отображение изменений параметров */}
                  {(() => {
                    const modules = categoryModules[selectedCategory] || []
                    const currentModule = currentModules[selectedCategory] ?? -1
                    
                    if (currentModule === -1 || !modules[currentModule]) return null
                    
                    const module = modules[currentModule]
                    const modifiers = module.modifiers || {}
                    
                    if (Object.keys(modifiers).length === 0) {
                      return (
                        <div className="text-xs text-gray-500">
                          Без изменений параметров
                        </div>
                      )
                    }
                    
                    return (
                      <div className="bg-base-800/50 rounded-lg p-2 space-y-1 border border-base-700">
                        <div className="text-xs text-gray-400 text-center mb-1 font-semibold">
                          Влияние на характеристики:
                        </div>
                        {Object.entries(modifiers).map(([key, value]) => {
                          const paramName = PARAM_NAMES[key] || key
                          const formattedValue = formatModifier(key, value)
                          const isPositive = value > 0
                          const colorClass = isPositive ? 'text-green-400' : 'text-red-400'
                          const ArrowIcon = isPositive ? ArrowUp : ArrowDown
                          const bgClass = isPositive ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'
                          
                          return (
                            <div 
                              key={key} 
                              className={`flex items-center justify-between gap-2 px-2 py-1 rounded border ${bgClass}`}
                            >
                              <div className="flex items-center gap-1.5">
                                <ArrowIcon className={`w-3 h-3 ${colorClass}`} />
                                <span className="text-xs text-gray-300">{paramName}</span>
                              </div>
                              <span className={`text-xs font-bold ${colorClass}`}>
                                {formattedValue}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>

            <button
              onClick={() => changeModule('next')}
              disabled={disabled || (categoryModules[selectedCategory] || []).length === 0}
              className="p-2 rounded-lg bg-base-800 hover:bg-base-700 text-gray-300 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default WeaponModules