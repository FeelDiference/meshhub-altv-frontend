/**
 * Универсальный компонент секции избранного
 * Группирует элементы одного типа
 */

import type { ComponentType } from 'react'
import type { FavoriteConfig, HotkeyBinding } from '@/types/favorites'
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
  // HotKey поддержка
  getHotkey?: (itemId: string) => HotkeyBinding | null
  onSetHotkey?: (itemId: string, key: string, modifiers?: HotkeyBinding['modifiers']) => void
  onRemoveHotkey?: (itemId: string) => void
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
  canEdit = false,
  getHotkey,
  onSetHotkey,
  onRemoveHotkey
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
        {items.map((item, index) => {
          const itemId = config.getId(item)
          const hotkey = getHotkey ? getHotkey(itemId) : null
          
          return (
            <FavoriteItem
              key={itemId || index}
              config={config}
              item={item}
              onExecute={onExecute}
              onRemove={onRemove}
              onEdit={onEdit}
              canEdit={canEdit}
              hotkey={hotkey}
              onSetHotkey={onSetHotkey}
              onRemoveHotkey={onRemoveHotkey}
            />
          )
        })}
      </div>
    </div>
  )
}

export default FavoriteSection

