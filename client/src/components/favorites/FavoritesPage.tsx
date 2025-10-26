import { Heart } from 'lucide-react'

const FavoritesPage = () => {
  return (
    <div className="flex-1 p-4 sm:p-6">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl lg:text-2xl font-bold text-white mb-2">Избранное</h1>
        <div className="flex items-center space-x-2 text-sm">
          <div className="px-2 py-1 rounded-full text-xs bg-purple-900 text-purple-300">
            ❤️ Избранное
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-16 h-16 bg-purple-600/20 rounded-full flex items-center justify-center mb-4 mx-auto">
            <Heart className="w-8 h-8 text-purple-400" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">Избранное пусто</h3>
          <p className="text-gray-400 text-sm">
            Здесь будут отображаться ваши избранные автомобили, оружие и интерьеры
          </p>
        </div>
      </div>
    </div>
  )
}

export default FavoritesPage
