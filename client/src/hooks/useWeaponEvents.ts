// Хук для обработки событий оружия из Alt:V
import { useEffect } from 'react'

/**
 * Типы данных событий
 */
export interface WeaponEquippedData {
  weaponName: string
  weaponHash: number
}

/**
 * Параметры хука
 */
export interface UseWeaponEventsOptions {
  onWeaponEquipped?: (data: WeaponEquippedData) => void
  onWeaponUnequipped?: () => void
}

/**
 * Хук для подписки на события оружия из Alt:V
 * Отслеживает экипировку и снятие оружия игроком
 */
export function useWeaponEvents(options: UseWeaponEventsOptions) {
  const { onWeaponEquipped, onWeaponUnequipped } = options

  useEffect(() => {
    if (typeof window === 'undefined' || !('alt' in window)) return

    const handlers: Array<[string, (data: any) => void]> = []

    // weapon:equipped
    if (onWeaponEquipped) {
      const handler = (data: WeaponEquippedData) => onWeaponEquipped(data)
      ;(window as any).alt.on('weapon:equipped', handler)
      handlers.push(['weapon:equipped', handler])
    }

    // weapon:unequipped
    if (onWeaponUnequipped) {
      const handler = () => onWeaponUnequipped()
      ;(window as any).alt.on('weapon:unequipped', handler)
      handlers.push(['weapon:unequipped', handler])
    }

    // Cleanup
    return () => {
      handlers.forEach(([event, handler]) => {
        ;(window as any).alt.off?.(event, handler)
      })
    }
  }, [onWeaponEquipped, onWeaponUnequipped])
}


