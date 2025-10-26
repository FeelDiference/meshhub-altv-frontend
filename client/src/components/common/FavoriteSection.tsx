/**
 * Универсальный компонент секции избранного
 * Группирует элементы одного типа
 */

import type { ComponentType } from 'react'
import type { FavoriteConfig } from '@/types/favorites'
import { FavoriteItem } from './FavoriteItem'

interface FavoriteSectionProps<T = any> {
  title: string
  icon: ComponentType<{ className?: string }>
  iconColor: string
  items: T[]
  config: FavoriteConfig<T>
  onExecute: (item: T) => void
  onRemove: (item: T) => void
  onEdit?: (item: T, newName: string) => void
  canEdit?: boolean
}

/**
 * Секция группы избранных элементов
 */
export function FavoriteSection<T>({ 
  title, 
  icon: Icon, 
  iconColor, 
  items, 
  config, 
  onExecute, 
  onRemove, 
  onEdit,
  canEdit = false 
}: FavoriteSectionProps<T>) {
  if (!items || items.length === 0) {
    return null
  }
  
  return (
    <div>
      <h3 className="text-xs font-medium text-gray-400 mb-3 flex items-center gap-1.5">
        <Icon className={`w-3.5 h-3.5 text-${iconColor}-400`} />
        {title}:
      </h3>
      <div className="space-y-2">
        {items.map((item, index) => (
          <FavoriteItem
            key={config.getId(item) || index}
            config={config}
            item={item}
            onExecute={onExecute}
            onRemove={onRemove}
            onEdit={onEdit}
            canEdit={canEdit}
          />
        ))}
      </div>
    </div>
  )
}

export default FavoriteSection

