/**
 * Менеджер для управления экстерьерами через Alt:V
 */

import type { ExteriorEntity } from '@/types/exterior'

/**
 * Проверить установлен ли экстерьер локально (через Alt:V)
 * Возвращает true если архив установлен на сервере
 */
export async function checkExteriorExists(archiveName: string): Promise<boolean> {
  if (typeof window === 'undefined' || !('alt' in window)) {
    console.warn('[ExteriorManager] Alt:V not available')
    return false
  }

  return new Promise((resolve) => {
    const alt = (window as any).alt
    const timeout = setTimeout(() => {
      console.warn('[ExteriorManager] Check timeout for:', archiveName)
      resolve(false)
    }, 5000)

    const handler = (data: { exists: boolean }) => {
      clearTimeout(timeout)
      alt.off('exterior:check:response', handler)
      console.log('[ExteriorManager] Check result:', archiveName, data.exists)
      resolve(data.exists)
    }

    alt.on('exterior:check:response', handler)
    alt.emit('exterior:check:request', { name: archiveName })
  })
}

/**
 * Телепортировать игрока к entity
 */
export function teleportToEntity(entity: ExteriorEntity): void {
  if (typeof window === 'undefined' || !('alt' in window)) {
    console.warn('[ExteriorManager] Alt:V not available')
    return
  }

  const alt = (window as any).alt
  alt.emit('meshhub:exterior:teleport', {
    archetypeName: entity.archetype_name,
    position: {
      x: entity.x,
      y: entity.y,
      z: entity.z
    }
  })

  console.log('[ExteriorManager] Teleport to entity:', {
    archetype: entity.archetype_name,
    position: { x: entity.x, y: entity.y, z: entity.z }
  })
}

/**
 * Скопировать координаты entity в буфер обмена
 */
export async function copyEntityCoordinates(entity: ExteriorEntity): Promise<void> {
  const coords = `${entity.x.toFixed(2)}, ${entity.y.toFixed(2)}, ${entity.z.toFixed(2)}`
  
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(coords)
    } else {
      // Fallback для небезопасного контекста
      const textArea = document.createElement('textarea')
      textArea.value = coords
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    }
    console.log('[ExteriorManager] Copied coordinates:', coords)
  } catch (error) {
    console.error('[ExteriorManager] Failed to copy coordinates:', error)
    throw error
  }
}

/**
 * Получить название ресурса из пути архива
 */
export function getResourceName(archivePath: string, parentPath: string): string {
  if (parentPath) {
    const parts = parentPath.split('/').filter(p => p)
    const resourceName = parts[parts.length - 1]
    if (resourceName && resourceName !== 'dlcpacks') {
      return resourceName
    }
  }

  const pathParts = archivePath.split('/').filter(p => p)
  if (pathParts.length >= 2) {
    const resourceName = pathParts[pathParts.length - 2]
    if (resourceName !== 'dlcpacks') {
      return resourceName
    }
  }

  return 'Неизвестный ресурс'
}


