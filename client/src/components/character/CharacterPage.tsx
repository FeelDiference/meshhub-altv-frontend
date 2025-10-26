import { useState } from 'react'
import { User, Shirt, Watch } from 'lucide-react'

const CharacterPage = () => {
  const [selectedCategory, setSelectedCategory] = useState('clothes')
  const [playerInfo] = useState({
    name: 'Player',
    health: 100,
    armor: 0,
    money: 50000,
    level: 1
  })

  const categories = [
    { id: 'clothes', name: 'Одежда', icon: Shirt },
    { id: 'accessories', name: 'Аксессуары', icon: Watch },
    { id: 'appearance', name: 'Внешность', icon: User },
  ]

  const clothesItems = [
    { id: 1, name: 'Футболка', category: 'tops', price: 500 },
    { id: 2, name: 'Джинсы', category: 'legs', price: 800 },
    { id: 3, name: 'Кроссовки', category: 'shoes', price: 1200 },
    { id: 4, name: 'Куртка', category: 'tops', price: 1500 },
    { id: 5, name: 'Шорты', category: 'Dlegs', price: 300 },
    { id: 6, name: 'Ботинки', category: 'shoes', price: 1000 },
  ]

  const accessoriesItems = [
    { id: 1, name: 'Шляпа', category: 'hats', price: 400 },
    { id: 2, name: 'Очки', category: 'glasses', price: 600 },
    { id: 3, name: 'Часы', category: 'watches', price: 800 },
    { id: 4, name: 'Цепочка', category: 'chains', price: 700 },
  ]

  const appearanceItems = [
    { id: 1, name: 'Прическа', category: 'hair', price: 300 },
    { id: 2, name: 'Борода', category: 'beard', price: 200 },
    { id: 3, name: 'Макияж', category: 'makeup', price: 150 },
    { id: 4, name: 'Татуировки', category: 'tattoos', price: 500 },
  ]

  const getCurrentItems = () => {
    switch (selectedCategory) {
      case 'clothes':
        return clothesItems
      case 'accessories':
        return accessoriesItems
      case 'appearance':
        return appearanceItems
      default:
        return []
    }
  }

  const handleItemEquip = (item: any) => {
    console.log('Equipping item:', item)
    // TODO: Emit event to equip item
  }

  return (
    <div className="flex-1 p-4 sm:p-6">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl lg:text-2xl font-bold text-white mb-2">Персонаж</h1>
        <div className="flex items-center space-x-2 text-sm mb-4">
          <div className="px-2 py-1 rounded-full text-xs bg-green-900 text-green-300">
            👤 Персонаж
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Информация о игроке */}
        <div className="bg-base-800 rounded-lg p-6">
          <div className="flex items-center space-x-2 mb-4">
            <User className="w-5 h-5 text-green-400" />
            <h2 className="text-lg font-semibold text-white">Информация</h2>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Имя:</span>
              <span className="text-white font-medium">{playerInfo.name}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Здоровье:</span>
              <div className="flex items-center space-x-2">
                <div className="w-20 h-2 bg-red-900 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-red-500 transition-all duration-300"
                    style={{ width: `${playerInfo.health}%` }}
                  />
                </div>
                <span className="text-white text-sm">{playerInfo.health}%</span>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Броня:</span>
              <div className="flex items-center space-x-2">
                <div className="w-20 h-2 bg-blue-900 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${playerInfo.armor}%` }}
                  />
                </div>
                <span className="text-white text-sm">{playerInfo.armor}%</span>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Деньги:</span>
              <span className="text-green-400 font-medium">${playerInfo.money.toLocaleString()}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Уровень:</span>
              <span className="text-yellow-400 font-medium">{playerInfo.level}</span>
            </div>
          </div>
        </div>

        {/* Категории */}
        <div className="bg-base-800 rounded-lg p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Shirt className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">Категории</h2>
          </div>
          
          <div className="space-y-2">
            {categories.map((category) => {
              const Icon = category.icon
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-all ${
                    selectedCategory === category.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-base-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm">{category.name}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Предметы */}
        <div className="bg-base-800 rounded-lg p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Watch className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">
              {categories.find(c => c.id === selectedCategory)?.name || 'Предметы'}
            </h2>
          </div>
          
          <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto overflow-x-hidden">
            {getCurrentItems().map((item) => (
              <button
                key={item.id}
                onClick={() => handleItemEquip(item)}
                className="p-3 rounded-lg border border-base-700 hover:border-base-600 bg-base-800/50 hover:bg-base-700/50 transition-all text-left"
              >
                <div className="flex justify-between items-center">
                  <span className="text-white text-sm">{item.name}</span>
                  <span className="text-green-400 text-xs">${item.price}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CharacterPage
