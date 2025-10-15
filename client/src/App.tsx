import React, { useState } from 'react'
import { Car, Settings, MapPin, Zap } from 'lucide-react'

// Временные заглушки компонентов (создадим их позже)
const LoginPage = () => (
  <div className="flex-1 flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-2xl font-bold text-white mb-4">MeshHub ALT:V</h1>
      <p className="text-gray-400 mb-6">Вход в систему</p>
      <div className="space-y-4">
        <input 
          type="text" 
          placeholder="Логин" 
          className="w-full px-4 py-2 bg-base-800 border border-base-700 rounded-lg text-white"
        />
        <input 
          type="password" 
          placeholder="Пароль" 
          className="w-full px-4 py-2 bg-base-800 border border-base-700 rounded-lg text-white"
        />
        <button className="w-full px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors">
          Войти
        </button>
      </div>
    </div>
  </div>
)

const Dashboard = () => (
  <div className="flex-1 p-6">
    <div className="text-center">
      <h1 className="text-2xl font-bold text-white mb-4">Добро пожаловать!</h1>
      <p className="text-gray-400">Выберите модуль из меню слева</p>
    </div>
  </div>
)

const VehiclesPage = () => (
  <div className="flex-1 p-6">
    <h1 className="text-2xl font-bold text-white mb-4">Автомобили</h1>
    <p className="text-gray-400">Модуль управления автомобилями (в разработке)</p>
  </div>
)

const InteriorPlaceholder = () => (
  <div className="flex-1 p-6">
    <h1 className="text-2xl font-bold text-white mb-4">Интерьеры</h1>
    <p className="text-gray-400">Скоро будет доступно</p>
  </div>
)

const WeaponsPlaceholder = () => (
  <div className="flex-1 p-6">
    <h1 className="text-2xl font-bold text-white mb-4">Оружие</h1>
    <p className="text-gray-400">Скоро будет доступно</p>
  </div>
)

// Типы для меню
interface MenuItem {
  id: string
  label: string
  icon: React.ComponentType<any>
  component: React.ComponentType
  enabled: boolean
  order: number
}

function App() {
  const [isAuthenticated] = useState(false) // TODO: заменить на реальную авторизацию
  const [currentPage, setCurrentPage] = useState('dashboard')

  // Конфигурация меню
  const menuItems: MenuItem[] = [
    {
      id: 'vehicles',
      label: 'Автомобили',
      icon: Car,
      component: VehiclesPage,
      enabled: true,
      order: 1
    },
    {
      id: 'interiors',
      label: 'Интерьеры',
      icon: MapPin,
      component: InteriorPlaceholder,
      enabled: false,
      order: 2
    },
    {
      id: 'weapons',
      label: 'Оружие',
      icon: Zap,
      component: WeaponsPlaceholder,
      enabled: false,
      order: 3
    }
  ].sort((a, b) => a.order - b.order)

  // Получить текущий компонент
  const getCurrentComponent = () => {
    if (currentPage === 'dashboard') return Dashboard
    const item = menuItems.find(item => item.id === currentPage)
    return item?.component || Dashboard
  }

  const CurrentComponent = getCurrentComponent()

  if (!isAuthenticated) {
    return (
      <div className="webview-panel w-full h-full flex flex-col animate-slide-in-right">
        <LoginPage />
      </div>
    )
  }

  return (
    <div className="webview-panel w-full h-full flex flex-col animate-slide-in-right">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-base-700">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <Settings className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">MeshHub</h1>
            <p className="text-xs text-gray-400">ALT:V Tools</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-shrink-0 p-4 border-b border-base-700">
        <div className="space-y-2">
          <button
            onClick={() => setCurrentPage('dashboard')}
            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
              currentPage === 'dashboard' 
                ? 'bg-primary-600 text-white' 
                : 'text-gray-400 hover:text-white hover:bg-base-800'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span className="text-sm">Главная</span>
          </button>
          
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => item.enabled && setCurrentPage(item.id)}
                disabled={!item.enabled}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                  currentPage === item.id 
                    ? 'bg-primary-600 text-white' 
                    : item.enabled 
                      ? 'text-gray-400 hover:text-white hover:bg-base-800' 
                      : 'text-gray-600 cursor-not-allowed'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm">{item.label}</span>
                {!item.enabled && (
                  <span className="ml-auto text-xs text-gray-500">Soon</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <CurrentComponent />
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 p-4 border-t border-base-700">
        <div className="text-xs text-gray-500 text-center">
          ESC - закрыть панель
        </div>
      </div>
    </div>
  )
}

export default App
