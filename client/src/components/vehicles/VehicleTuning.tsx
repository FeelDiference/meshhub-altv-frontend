import React, { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Wrench, Palette, Car, Settings } from 'lucide-react'
import toast from 'react-hot-toast'

interface VehicleTuningProps {
  disabled?: boolean
  vehicleName?: string
}

// Категории тюнинга (соответствуют GTA V mod types)
interface TuningCategory {
  id: number
  name: string
  icon: React.ReactNode
  description: string
}

// Цвета для покраски
interface VehicleColor {
  id: number
  name: string
  hex: string
}

const TUNING_CATEGORIES: TuningCategory[] = [
  { id: 0, name: 'Спойлеры', icon: <Wrench className="w-4 h-4" />, description: 'Задние спойлеры' },
  { id: 1, name: 'Передний бампер', icon: <Wrench className="w-4 h-4" />, description: 'Передний бампер' },
  { id: 2, name: 'Задний бампер', icon: <Wrench className="w-4 h-4" />, description: 'Задний бампер' },
  { id: 3, name: 'Пороги', icon: <Wrench className="w-4 h-4" />, description: 'Боковые пороги' },
  { id: 4, name: 'Выхлоп', icon: <Wrench className="w-4 h-4" />, description: 'Выхлопная система' },
  { id: 5, name: 'Каркас', icon: <Wrench className="w-4 h-4" />, description: 'Каркас безопасности' },
  { id: 6, name: 'Решётка', icon: <Wrench className="w-4 h-4" />, description: 'Решётка радиатора' },
  { id: 7, name: 'Капот', icon: <Wrench className="w-4 h-4" />, description: 'Капот' },
  { id: 8, name: 'Крыло', icon: <Wrench className="w-4 h-4" />, description: 'Крылья' },
  { id: 10, name: 'Крыша', icon: <Wrench className="w-4 h-4" />, description: 'Крыша' },
  { id: 11, name: 'Двигатель', icon: <Wrench className="w-4 h-4" />, description: 'Модификации двигателя' },
  { id: 12, name: 'Тормоза', icon: <Wrench className="w-4 h-4" />, description: 'Тормозная система' },
  { id: 13, name: 'Трансмиссия', icon: <Wrench className="w-4 h-4" />, description: 'КПП' },
  { id: 14, name: 'Клаксон', icon: <Wrench className="w-4 h-4" />, description: 'Звуковой сигнал' },
  { id: 15, name: 'Подвеска', icon: <Wrench className="w-4 h-4" />, description: 'Подвеска' },
  { id: 16, name: 'Броня', icon: <Wrench className="w-4 h-4" />, description: 'Бронирование' },
  { id: 23, name: 'Передние колёса', icon: <Wrench className="w-4 h-4" />, description: 'Диски передние' },
  { id: 24, name: 'Задние колёса', icon: <Wrench className="w-4 h-4" />, description: 'Диски задние (для кастома)' },
  { id: 25, name: 'Цвет пластин', icon: <Wrench className="w-4 h-4" />, description: 'Цвет номерных знаков' },
  { id: 27, name: 'Отделка салона', icon: <Wrench className="w-4 h-4" />, description: 'Отделка салона' },
  { id: 28, name: 'Приборы', icon: <Wrench className="w-4 h-4" />, description: 'Приборная панель' },
  { id: 30, name: 'Циферблат', icon: <Wrench className="w-4 h-4" />, description: 'Циферблат спидометра' },
  { id: 33, name: 'Руль', icon: <Wrench className="w-4 h-4" />, description: 'Рулевое колесо' },
  { id: 34, name: 'Ручка КПП', icon: <Wrench className="w-4 h-4" />, description: 'Ручка переключения передач' },
  { id: 35, name: 'Шильдики', icon: <Wrench className="w-4 h-4" />, description: 'Шильдики и наклейки' },
  { id: 38, name: 'Гидравлика', icon: <Wrench className="w-4 h-4" />, description: 'Гидравлическая подвеска' },
  { id: 45, name: 'Бак', icon: <Wrench className="w-4 h-4" />, description: 'Топливный бак' },
  { id: 46, name: 'Окна', icon: <Wrench className="w-4 h-4" />, description: 'Стиль окон' },
  { id: 48, name: 'Ливрея', icon: <Wrench className="w-4 h-4" />, description: 'Виниловая раскраска' },
]

// Правильные индексы цветов GTA V (согласно официальной таблице)
const VEHICLE_COLORS: VehicleColor[] = [
  { id: 0, name: 'Metallic Black', hex: '#0d1116' },
  { id: 1, name: 'Metallic Graphite Black', hex: '#1c1d21' },
  { id: 2, name: 'Metallic Black Steal', hex: '#32383d' },
  { id: 3, name: 'Metallic Dark Silver', hex: '#454b4f' },
  { id: 4, name: 'Metallic Silver', hex: '#999da0' },
  { id: 5, name: 'Metallic Blue Silver', hex: '#c2c4c6' },
  { id: 6, name: 'Metallic Steel Gray', hex: '#979a97' },
  { id: 7, name: 'Metallic Shadow Silver', hex: '#637380' },
  { id: 8, name: 'Metallic Stone Silver', hex: '#63625c' },
  { id: 9, name: 'Metallic Midnight Silver', hex: '#3c3f47' },
  { id: 10, name: 'Metallic Gun Metal', hex: '#444e54' },
  { id: 11, name: 'Metallic Anthracite Grey', hex: '#1d2129' },
  { id: 12, name: 'Matte Black', hex: '#13181f' },
  { id: 13, name: 'Matte Gray', hex: '#26282a' },
  { id: 14, name: 'Matte Light Grey', hex: '#515554' },
  { id: 15, name: 'Util Black', hex: '#151921' },
  { id: 16, name: 'Util Black Poly', hex: '#1e2429' },
  { id: 17, name: 'Util Dark silver', hex: '#333a3c' },
  { id: 18, name: 'Util Silver', hex: '#8c9095' },
  { id: 19, name: 'Util Gun Metal', hex: '#39434d' },
  { id: 20, name: 'Util Shadow Silver', hex: '#506272' },
  { id: 21, name: 'Worn Black', hex: '#1e232f' },
  { id: 22, name: 'Worn Graphite', hex: '#363a3f' },
  { id: 23, name: 'Worn Silver Grey', hex: '#a0a199' },
  { id: 24, name: 'Worn Silver', hex: '#d3d3d3' },
  { id: 25, name: 'Worn Blue Silver', hex: '#b7bfca' },
  { id: 26, name: 'Worn Shadow Silver', hex: '#778794' },
  { id: 27, name: 'Metallic Red', hex: '#c00e1a' },
  { id: 28, name: 'Metallic Torino Red', hex: '#da1918' },
  { id: 29, name: 'Metallic Formula Red', hex: '#b6111b' },
  { id: 30, name: 'Metallic Blaze Red', hex: '#a51e23' },
  { id: 31, name: 'Metallic Graceful Red', hex: '#7b1a22' },
  { id: 32, name: 'Metallic Garnet Red', hex: '#8e1b1f' },
  { id: 33, name: 'Metallic Desert Red', hex: '#6f1818' },
  { id: 34, name: 'Metallic Cabernet Red', hex: '#49111d' },
  { id: 35, name: 'Metallic Candy Red', hex: '#b60f25' },
  { id: 36, name: 'Metallic Sunrise Orange', hex: '#d44a17' },
  { id: 37, name: 'Metallic Classic Gold', hex: '#c2944f' },
  { id: 38, name: 'Metallic Orange', hex: '#f78616' },
  { id: 39, name: 'Matte Red', hex: '#cf1f21' },
  { id: 40, name: 'Matte Dark Red', hex: '#732021' },
  { id: 41, name: 'Matte Orange', hex: '#f27d20' },
  { id: 42, name: 'Matte Yellow', hex: '#ffc91f' },
  { id: 43, name: 'Util Red', hex: '#9c1016' },
  { id: 44, name: 'Util Bright Red', hex: '#de0f18' },
  { id: 45, name: 'Util Garnet Red', hex: '#8f1e17' },
  { id: 46, name: 'Worn Red', hex: '#a94744' },
  { id: 47, name: 'Worn Golden Red', hex: '#b16c51' },
  { id: 48, name: 'Worn Dark Red', hex: '#371c25' },
  { id: 49, name: 'Metallic Dark Green', hex: '#132428' },
  { id: 50, name: 'Metallic Racing Green', hex: '#122e2b' },
  { id: 51, name: 'Metallic Sea Green', hex: '#12383c' },
  { id: 52, name: 'Metallic Olive Green', hex: '#31423f' },
  { id: 53, name: 'Metallic Green', hex: '#155c2d' },
  { id: 54, name: 'Metallic Gasoline Blue Green', hex: '#1b6770' },
  { id: 55, name: 'Matte Lime Green', hex: '#66b81f' },
  { id: 56, name: 'Util Dark Green', hex: '#22383e' },
  { id: 57, name: 'Util Green', hex: '#1d5a3f' },
  { id: 58, name: 'Worn Dark Green', hex: '#2d423f' },
  { id: 59, name: 'Worn Green', hex: '#45594b' },
  { id: 60, name: 'Worn Sea Wash', hex: '#65867f' },
  { id: 61, name: 'Metallic Midnight Blue', hex: '#222e46' },
  { id: 62, name: 'Metallic Dark Blue', hex: '#233155' },
  { id: 63, name: 'Metallic Saxony Blue', hex: '#304c7e' },
  { id: 64, name: 'Metallic Blue', hex: '#47578f' },
  { id: 65, name: 'Metallic Mariner Blue', hex: '#637ba7' },
  { id: 66, name: 'Metallic Harbor Blue', hex: '#394762' },
  { id: 67, name: 'Metallic Diamond Blue', hex: '#d6e7f1' },
  { id: 68, name: 'Metallic Surf Blue', hex: '#76afbe' },
  { id: 69, name: 'Metallic Nautical Blue', hex: '#345e72' },
  { id: 70, name: 'Metallic Bright Blue', hex: '#0b9cf1' },
  { id: 71, name: 'Metallic Purple Blue', hex: '#2f2d52' },
  { id: 72, name: 'Metallic Spinnaker Blue', hex: '#282c4d' },
  { id: 73, name: 'Metallic Ultra Blue', hex: '#2354a1' },
  { id: 74, name: 'Metallic Bright Blue', hex: '#6ea3c6' },
  { id: 75, name: 'Util Dark Blue', hex: '#112552' },
  { id: 76, name: 'Util Midnight Blue', hex: '#1b203e' },
  { id: 77, name: 'Util Blue', hex: '#275190' },
  { id: 78, name: 'Util Sea Foam Blue', hex: '#608592' },
  { id: 79, name: 'Util Lightning blue', hex: '#2446a8' },
  { id: 80, name: 'Util Maui Blue Poly', hex: '#4271e1' },
  { id: 81, name: 'Util Bright Blue', hex: '#3b39e0' },
  { id: 82, name: 'Matte Dark Blue', hex: '#1f2852' },
  { id: 83, name: 'Matte Blue', hex: '#253aa7' },
  { id: 84, name: 'Matte Midnight Blue', hex: '#1c3551' },
  { id: 85, name: 'Worn Dark blue', hex: '#4c5f81' },
  { id: 86, name: 'Worn Blue', hex: '#58688e' },
  { id: 87, name: 'Worn Light blue', hex: '#74b5d8' },
  { id: 88, name: 'Metallic Taxi Yellow', hex: '#ffcf20' },
  { id: 89, name: 'Metallic Race Yellow', hex: '#fbe212' },
  { id: 90, name: 'Metallic Bronze', hex: '#916532' },
  { id: 91, name: 'Metallic Yellow Bird', hex: '#e0e13d' },
  { id: 92, name: 'Metallic Lime', hex: '#98d223' },
  { id: 93, name: 'Metallic Champagne', hex: '#9b8c78' },
  { id: 94, name: 'Metallic Pueblo Beige', hex: '#503218' },
  { id: 95, name: 'Metallic Dark Ivory', hex: '#473f2b' },
  { id: 96, name: 'Metallic Choco Brown', hex: '#221b19' },
  { id: 97, name: 'Metallic Golden Brown', hex: '#653f23' },
  { id: 98, name: 'Metallic Light Brown', hex: '#775c3e' },
  { id: 99, name: 'Metallic Straw Beige', hex: '#ac9975' },
  { id: 100, name: 'Metallic Moss Brown', hex: '#6c6b4b' },
  { id: 101, name: 'Metallic Biston Brown', hex: '#402e2b' },
  { id: 102, name: 'Metallic Beechwood', hex: '#a4965f' },
  { id: 103, name: 'Metallic Dark Beechwood', hex: '#46231a' },
  { id: 104, name: 'Metallic Choco Orange', hex: '#752b19' },
  { id: 105, name: 'Metallic Beach Sand', hex: '#bfae7b' },
  { id: 106, name: 'Metallic Sun Bleeched Sand', hex: '#dfd5b2' },
  { id: 107, name: 'Metallic Cream', hex: '#f7edd5' },
  { id: 108, name: 'Util Brown', hex: '#3a2a1b' },
  { id: 109, name: 'Util Medium Brown', hex: '#785f33' },
  { id: 110, name: 'Util Light Brown', hex: '#b5a079' },
  { id: 111, name: 'Metallic White', hex: '#fffff6' },
  { id: 112, name: 'Metallic Frost White', hex: '#eaeaea' },
  { id: 113, name: 'Worn Honey Beige', hex: '#b0ab94' },
  { id: 114, name: 'Worn Brown', hex: '#453831' },
  { id: 115, name: 'Worn Dark Brown', hex: '#2a282b' },
  { id: 116, name: 'Worn straw beige', hex: '#726c57' },
  { id: 117, name: 'Brushed Steel', hex: '#6a747c' },
  { id: 118, name: 'Brushed Black steel', hex: '#354158' },
  { id: 119, name: 'Brushed Aluminium', hex: '#9ba0a8' },
  { id: 120, name: 'Chrome', hex: '#5870a1' },
  { id: 121, name: 'Worn Off White', hex: '#eae6de' },
  { id: 122, name: 'Util Off White', hex: '#dfddd0' },
  { id: 123, name: 'Worn Orange', hex: '#f2ad2e' },
  { id: 124, name: 'Worn Light Orange', hex: '#f9a458' },
  { id: 125, name: 'Metallic Securicor Green', hex: '#83c566' },
  { id: 126, name: 'Worn Taxi Yellow', hex: '#f1cc40' },
  { id: 127, name: 'Police car blue', hex: '#4cc3da' },
  { id: 128, name: 'Matte Green', hex: '#4e6443' },
  { id: 129, name: 'Matte Brown', hex: '#bcac8f' },
  { id: 130, name: 'Worn Orange', hex: '#f8b658' },
  { id: 131, name: 'Matte White', hex: '#fcf9f1' },
  { id: 132, name: 'Worn White', hex: '#fffffb' },
  { id: 133, name: 'Worn Olive Army Green', hex: '#81844c' },
  { id: 134, name: 'Pure White', hex: '#ffffff' },
  { id: 135, name: 'Hot Pink', hex: '#f21f99' },
  { id: 136, name: 'Salmon pink', hex: '#fdd6cd' },
  { id: 137, name: 'Metallic Vermillion Pink', hex: '#df5891' },
  { id: 138, name: 'Orange', hex: '#f6ae20' },
  { id: 139, name: 'Green', hex: '#b0ee6e' },
  { id: 140, name: 'Blue', hex: '#08e9fa' },
  { id: 141, name: 'Mettalic Black Blue', hex: '#0a0c17' },
  { id: 142, name: 'Metallic Black Purple', hex: '#0c0d18' },
  { id: 143, name: 'Metallic Black Red', hex: '#0e0d14' },
  { id: 144, name: 'Hunter green', hex: '#9f9e8a' },
  { id: 145, name: 'Metallic Purple', hex: '#621276' },
  { id: 146, name: 'Metaillic V Dark Blue', hex: '#0b1421' },
  { id: 147, name: 'MODSHOP BLACK1', hex: '#11141a' },
  { id: 148, name: 'Matte Purple', hex: '#6b1f7b' },
  { id: 149, name: 'Matte Dark Purple', hex: '#1e1d22' },
  { id: 150, name: 'Metallic Lava Red', hex: '#bc1917' },
  { id: 151, name: 'Matte Forest Green', hex: '#2d362a' },
  { id: 152, name: 'Matte Olive Drab', hex: '#696748' },
  { id: 153, name: 'Matte Desert Brown', hex: '#7a6c55' },
  { id: 154, name: 'Matte Desert Tan', hex: '#c3b492' },
  { id: 155, name: 'Matte Foilage Green', hex: '#5a6352' },
  { id: 156, name: 'DEFAULT ALLOY COLOR', hex: '#81827f' },
  { id: 157, name: 'Epsilon Blue', hex: '#afd6e4' },
  { id: 158, name: 'Pure Gold', hex: '#7a6440' },
  { id: 159, name: 'Brushed Gold', hex: '#7f6a48' },
]

const VehicleTuning: React.FC<VehicleTuningProps> = ({ disabled = false, vehicleName }) => {
  const [activeTab, setActiveTab] = useState<'tuning' | 'colors'>('tuning')
  const [selectedCategory, setSelectedCategory] = useState(0)
  const [categoryMods, setCategoryMods] = useState<Record<number, any[]>>({})
  const [currentMods, setCurrentMods] = useState<Record<number, number>>({})
  const [currentColors, setCurrentColors] = useState({
    primary: 0,
    secondary: 0,
    pearlescent: 0,
    interior: 0,
    wheels: 0
  })
  const [loading, setLoading] = useState(false)
  const [availableCategories, setAvailableCategories] = useState<number[]>([])

  // Загрузить моды для категории
  const loadCategoryMods = async (categoryId: number) => {
    if (categoryMods[categoryId]) return

    setLoading(true)
    try {
      if (typeof window !== 'undefined' && 'alt' in window) {
        const alt = (window as any).alt
        if (alt && typeof alt.emit === 'function') {
          alt.emit('vehicle:tuning:get-mods', { categoryId, vehicleName })
        }
      }
    } catch (error) {
      console.error('[VehicleTuning] Error loading mods:', error)
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
    loadCategoryMods(newCategory)
  }

  // Применить мод
  const applyMod = (categoryId: number, modIndex: number) => {
    if (disabled) {
      toast.error('Вы должны быть в автомобиле для применения тюнинга')
      return
    }

    try {
      if (typeof window !== 'undefined' && 'alt' in window) {
        const alt = (window as any).alt
        if (alt && typeof alt.emit === 'function') {
          alt.emit('vehicle:tuning:apply', { categoryId, modIndex })
          setCurrentMods(prev => ({ ...prev, [categoryId]: modIndex }))
          toast.success('Тюнинг применён')
        }
      }
    } catch (error) {
      console.error('[VehicleTuning] Error applying mod:', error)
      toast.error('Ошибка применения тюнинга')
    }
  }

  // Применить цвет
  const applyColor = (colorType: 'primary' | 'secondary' | 'pearlescent' | 'interior' | 'wheels', colorId: number) => {
    if (disabled) {
      toast.error('Вы должны быть в автомобиле для изменения цвета')
      return
    }

    try {
      if (typeof window !== 'undefined' && 'alt' in window) {
        const alt = (window as any).alt
        if (alt && typeof alt.emit === 'function') {
          alt.emit('vehicle:color:apply', { colorType, colorId })
          setCurrentColors(prev => ({ ...prev, [colorType]: colorId }))
          toast.success('Цвет применён')
        }
      }
    } catch (error) {
      console.error('[VehicleTuning] Error applying color:', error)
      toast.error('Ошибка применения цвета')
    }
  }

  // Переключить мод в категории
  const changeMod = (direction: 'prev' | 'next') => {
    const category = TUNING_CATEGORIES.find(c => c.id === selectedCategory)
    if (!category) return

    const mods = categoryMods[category.id] || []
    const currentMod = currentMods[category.id] ?? -1
    
    let newMod = currentMod
    if (direction === 'next') {
      newMod = currentMod >= mods.length - 1 ? -1 : currentMod + 1
    } else {
      newMod = currentMod <= -1 ? mods.length - 1 : currentMod - 1
    }
    
    applyMod(category.id, newMod)
  }

  // Переключить цвет
  const changeColor = (colorType: 'primary' | 'secondary' | 'interior' | 'wheels', direction: 'prev' | 'next') => {
    const currentColor = currentColors[colorType]
    let newColor = currentColor
    
    if (direction === 'next') {
      newColor = currentColor >= VEHICLE_COLORS.length - 1 ? 0 : currentColor + 1
    } else {
      newColor = currentColor <= 0 ? VEHICLE_COLORS.length - 1 : currentColor - 1
    }
    
    applyColor(colorType, newColor)
  }

  // Загрузить моды при смене категории
  useEffect(() => {
    if (activeTab === 'tuning') {
      const category = TUNING_CATEGORIES.find(c => c.id === selectedCategory)
      if (category) {
        loadCategoryMods(category.id)
      }
    } else if (activeTab === 'colors') {
      // Запросить текущие цвета при открытии вкладки покраски
      if (typeof window !== 'undefined' && 'alt' in window) {
        const alt = (window as any).alt
        if (alt && typeof alt.emit === 'function') {
          alt.emit('vehicle:color:get')
        }
      }
    }
  }, [selectedCategory, activeTab])

  // При инициализации проверяем все категории на доступность
  useEffect(() => {
    if (activeTab === 'tuning' && availableCategories.length === 0) {
      // Проверяем все категории на доступность
      TUNING_CATEGORIES.forEach(category => {
        loadCategoryMods(category.id)
      })
    }
  }, [activeTab])

  // Слушаем ответы от AltV
  useEffect(() => {
    if (typeof window === 'undefined' || !('alt' in window)) return

    const handleModsResponse = (data: { categoryId: number; mods: any[]; currentMod: number }) => {
      const mods = data.mods || []
      
      setCategoryMods(prev => ({ ...prev, [data.categoryId]: mods }))
      setCurrentMods(prev => ({ ...prev, [data.categoryId]: data.currentMod }))
      
      // Обновляем список доступных категорий
      setAvailableCategories(prev => {
        const newCategories = [...prev]
        if (mods.length > 0 && !newCategories.includes(data.categoryId)) {
          newCategories.push(data.categoryId)
          newCategories.sort((a, b) => a - b)
        } else if (mods.length === 0 && newCategories.includes(data.categoryId)) {
          const index = newCategories.indexOf(data.categoryId)
          newCategories.splice(index, 1)
        }
        return newCategories
      })
    }

    const handleColorsResponse = (data: { primary: number; secondary: number; pearlescent: number; interior: number; wheels: number }) => {
      setCurrentColors(data)
    }

    const alt = (window as any).alt
    if (alt && typeof alt.on === 'function') {
      alt.on('vehicle:tuning:mods-response', handleModsResponse)
      alt.on('vehicle:color:response', handleColorsResponse)
    }

    return () => {
      if (alt && typeof alt.off === 'function') {
        alt.off('vehicle:tuning:mods-response', handleModsResponse)
        alt.off('vehicle:color:response', handleColorsResponse)
      }
    }
  }, [])

  return (
    <div className="space-y-4">
      {/* Вкладки */}
      <div className="flex space-x-2">
        <button
          onClick={() => setActiveTab('tuning')}
          className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'tuning'
              ? 'bg-primary-600 text-white'
              : 'bg-base-800 text-gray-300 hover:bg-base-700'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Тюнинг</span>
        </button>
        <button
          onClick={() => setActiveTab('colors')}
          className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'colors'
              ? 'bg-primary-600 text-white'
              : 'bg-base-800 text-gray-300 hover:bg-base-700'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>Покраска</span>
        </button>
      </div>

      {/* Тюнинг */}
      {activeTab === 'tuning' && (
        <div className="space-y-4">
          {/* Выбор категории - только доступные */}
          <div 
            className="space-y-2"
            onWheel={handleWheelNavigation}
          >
            <div className="text-sm font-medium text-gray-300 mb-2">
              Категория тюнинга:
              <span className="text-xs text-gray-400 ml-2">
                ({availableCategories.length} доступно)
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {availableCategories.length > 0 ? (
                availableCategories.map((categoryId) => {
                  const category = TUNING_CATEGORIES.find(c => c.id === categoryId)
                  if (!category) return null
                  
                  return (
                    <button
                      key={category.id}
                      onClick={() => {
                        setSelectedCategory(categoryId)
                        loadCategoryMods(categoryId)
                      }}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        selectedCategory === categoryId
                          ? 'bg-primary-600 text-white'
                          : 'bg-base-800 text-gray-300 hover:bg-base-700'
                      }`}
                    >
                      {category.icon}
                      <span className="truncate">{category.name}</span>
                    </button>
                  )
                })
              ) : (
                <div className="col-span-2 text-center py-4">
                  <div className="text-sm text-orange-400 mb-2">
                    🔧 Загрузка категорий...
                  </div>
                  <div className="text-xs text-gray-500">
                    Проверяем доступные моды для тюнинга
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Переключатель модов */}
          {availableCategories.includes(selectedCategory) && (
            <div className="bg-base-900/50 border border-base-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  {TUNING_CATEGORIES.find(c => c.id === selectedCategory)?.icon}
                  <span className="text-sm font-medium text-white">
                    {TUNING_CATEGORIES.find(c => c.id === selectedCategory)?.name}
                  </span>
                </div>
                <div className="text-xs text-gray-400">
                  {(() => {
                    const mods = categoryMods[selectedCategory] || []
                    const currentMod = currentMods[selectedCategory] ?? -1
                    
                    if (mods.length === 0) {
                      return 'Недоступно'
                    }
                    
                    // Display current mod index properly: -1 = stock (0), 0+ = actual mod index
                    const displayIndex = currentMod === -1 ? 0 : currentMod + 1
                    const totalOptions = mods.length
                    
                    return `${displayIndex} / ${totalOptions}`
                  })()}
                </div>
              </div>

              {/* Информация о недоступности тюнинга */}
              {!loading && (categoryMods[selectedCategory] || []).length === 0 && (
                <div className="text-center py-4">
                  <div className="text-sm text-orange-400 mb-2">
                    ⚠️ Тюнинг недоступен
                  </div>
                  <div className="text-xs text-gray-500">
                    Эта машина не поддерживает тюнинг для данной категории
                  </div>
                </div>
              )}

              <div className="flex items-center justify-center space-x-4">
                <button
                  onClick={() => changeMod('prev')}
                  disabled={disabled || (categoryMods[selectedCategory] || []).length === 0}
                  className="p-2 rounded-lg bg-base-800 hover:bg-base-700 text-gray-300 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="flex-1 text-center">
                  {loading ? (
                    <div className="text-sm text-gray-500">Загрузка...</div>
                  ) : (
                    <div className="text-sm text-white">
                      {(() => {
                        const mods = categoryMods[selectedCategory] || []
                        const currentMod = currentMods[selectedCategory] ?? -1
                        
                        if (mods.length === 0) {
                          return 'Тюнинг недоступен'
                        }
                        
                        if (currentMod === -1) return 'Стандарт'
                        return mods[currentMod]?.name || `Мод #${currentMod + 1}`
                      })()}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => changeMod('next')}
                  disabled={disabled || (categoryMods[selectedCategory] || []).length === 0}
                  className="p-2 rounded-lg bg-base-800 hover:bg-base-700 text-gray-300 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Покраска */}
      {activeTab === 'colors' && (
        <div className="space-y-6">
          {/* Цвета кузова */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2">
              🎨 Цвета кузова
            </div>
            {[
              { key: 'primary', label: 'Основной цвет', icon: <Car className="w-4 h-4" /> },
              { key: 'secondary', label: 'Дополнительный цвет', icon: <Car className="w-4 h-4" /> },
              { key: 'pearlescent', label: 'Перламутр', icon: <Car className="w-4 h-4" /> }
            ].map(({ key, label, icon }) => (
              <div key={key} className="bg-base-900/50 border border-base-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    {icon}
                    <span className="text-sm font-medium text-white">{label}</span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {currentColors[key as keyof typeof currentColors]} / {VEHICLE_COLORS.length - 1}
                  </div>
                </div>

                <div className="flex items-center justify-center space-x-4">
                  <button
                    onClick={() => changeColor(key as any, 'prev')}
                    disabled={disabled}
                    className="p-2 rounded-lg bg-base-800 hover:bg-base-700 text-gray-300 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <div className="flex-1 text-center">
                    <div className="flex items-center justify-center space-x-3">
                      <div 
                        className="w-8 h-8 rounded-lg border-2 border-gray-600"
                        style={{ backgroundColor: VEHICLE_COLORS[currentColors[key as keyof typeof currentColors]]?.hex }}
                      />
                      <div className="text-sm text-white">
                        {VEHICLE_COLORS[currentColors[key as keyof typeof currentColors]]?.name}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => changeColor(key as any, 'next')}
                    disabled={disabled}
                    className="p-2 rounded-lg bg-base-800 hover:bg-base-700 text-gray-300 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Дополнительные цвета */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2">
              ✨ Дополнительные элементы
            </div>
            {[
              { key: 'interior', label: 'Цвет салона', icon: <Car className="w-4 h-4" /> },
              { key: 'wheels', label: 'Цвет дисков', icon: <Car className="w-4 h-4" /> }
            ].map(({ key, label, icon }) => (
            <div key={key} className="bg-base-900/50 border border-base-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  {icon}
                  <span className="text-sm font-medium text-white">{label}</span>
                </div>
                <div className="text-xs text-gray-400">
                  {currentColors[key as keyof typeof currentColors]} / {VEHICLE_COLORS.length - 1}
                </div>
              </div>

              <div className="flex items-center justify-center space-x-4">
                <button
                  onClick={() => changeColor(key as any, 'prev')}
                  disabled={disabled}
                  className="p-2 rounded-lg bg-base-800 hover:bg-base-700 text-gray-300 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="flex-1 text-center">
                  <div className="flex items-center justify-center space-x-3">
                    <div 
                      className="w-8 h-8 rounded-lg border-2 border-gray-600"
                      style={{ backgroundColor: VEHICLE_COLORS[currentColors[key as keyof typeof currentColors]]?.hex }}
                    />
                    <div className="text-sm text-white">
                      {VEHICLE_COLORS[currentColors[key as keyof typeof currentColors]]?.name}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => changeColor(key as any, 'next')}
                  disabled={disabled}
                  className="p-2 rounded-lg bg-base-800 hover:bg-base-700 text-gray-300 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default VehicleTuning





