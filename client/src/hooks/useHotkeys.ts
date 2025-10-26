/**
 * Хук для обработки горячих клавиш избранного
 * Работает в WebView и передает события в Alt:V для глобальной обработки
 */

import { useEffect, useCallback } from 'react'
import { favoritesService } from '@/services/favoritesService'
import type { HotkeyBinding, FavoriteType } from '@/types/favorites'

/**
 * Callback для выполнения действия при нажатии HotKey
 */
export type HotkeyExecutor = (type: FavoriteType, itemId: string) => void

/**
 * Опции для useHotkeys
 */
interface UseHotkeysOptions {
  enabled?: boolean                    // Включен ли обработчик
  onExecute: HotkeyExecutor            // Callback для выполнения действия
  ignoreInputs?: boolean               // Игнорировать ли нажатия в input полях (по умолчанию true)
}

/**
 * Результат хука
 */
interface UseHotkeysResult {
  getAllHotkeys: () => HotkeyBinding[]
  setHotkey: (type: FavoriteType, itemId: string, key: string, modifiers?: HotkeyBinding['modifiers']) => Promise<void>
  removeHotkey: (type: FavoriteType, itemId: string) => Promise<void>
  getHotkey: (type: FavoriteType, itemId: string) => HotkeyBinding | null
}

/**
 * Хук для работы с горячими клавишами избранного
 */
export function useHotkeys(options: UseHotkeysOptions): UseHotkeysResult {
  const { enabled = true, onExecute, ignoreInputs = true } = options

  /**
   * Обработчик нажатия клавиш
   */
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return
    
    // Игнорируем нажатия в input полях
    if (ignoreInputs) {
      const target = e.target as HTMLElement
      const tagName = target.tagName.toLowerCase()
      
      if (tagName === 'input' || tagName === 'textarea' || target.isContentEditable) {
        return
      }
    }
    
    // Игнорируем модификаторы как самостоятельные клавиши
    if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
      return
    }
    
    // Игнорируем ESC и F10 (системные)
    if (e.key === 'Escape' || e.key === 'F10') {
      return
    }
    
    // Ищем привязку
    const binding = favoritesService.findByHotkey(e.key, {
      ctrl: e.ctrlKey,
      alt: e.altKey,
      shift: e.shiftKey
    })
    
    if (binding) {
      console.log(`[useHotkeys] HotKey triggered:`, binding)
      
      // Предотвращаем дефолтное поведение
      e.preventDefault()
      e.stopPropagation()
      
      // Выполняем действие
      onExecute(binding.type, binding.itemId)
    }
  }, [enabled, onExecute, ignoreInputs])

  /**
   * Подписываемся на события клавиатуры
   */
  useEffect(() => {
    if (!enabled) return
    
    console.log('[useHotkeys] Hotkey handler enabled')
    
    // Добавляем глобальный обработчик
    document.addEventListener('keydown', handleKeyDown, true) // capture phase
    
    // Синхронизируем hotkeys с Alt:V при инициализации
    syncHotkeysWithAltV()
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
      console.log('[useHotkeys] Hotkey handler disabled')
    }
  }, [enabled, handleKeyDown])

  /**
   * Синхронизация hotkeys с Alt:V для глобальной обработки
   */
  const syncHotkeysWithAltV = () => {
    if (typeof window === 'undefined' || !('alt' in window)) return
    
    try {
      const hotkeys = favoritesService.getAllHotkeys()
      const alt = (window as any).alt
      
      console.log('[useHotkeys] Syncing hotkeys with Alt:V:', hotkeys.length, 'bindings')
      alt.emit('favorites:hotkeys:sync', { hotkeys })
    } catch (error) {
      console.error('[useHotkeys] Error syncing with Alt:V:', error)
    }
  }

  /**
   * Установить HotKey
   * НЕМЕДЛЕННАЯ СИНХРОНИЗАЦИЯ - hotkey работает сразу после настройки!
   */
  const setHotkey = useCallback(async (
    type: FavoriteType, 
    itemId: string, 
    key: string, 
    modifiers?: HotkeyBinding['modifiers']
  ) => {
    // Сохраняем hotkey
    await favoritesService.setHotkey(type, itemId, key, modifiers)
    
    // СРАЗУ синхронизируем с Alt:V для немедленной работы!
    syncHotkeysWithAltV()
    
    console.log(`[useHotkeys] ✅ HotKey set and synced immediately: ${type}:${itemId} → ${key}`)
  }, [])

  /**
   * Удалить HotKey
   * НЕМЕДЛЕННАЯ СИНХРОНИЗАЦИЯ - изменения применяются сразу!
   */
  const removeHotkey = useCallback(async (type: FavoriteType, itemId: string) => {
    // Удаляем hotkey
    await favoritesService.removeHotkey(type, itemId)
    
    // СРАЗУ синхронизируем с Alt:V!
    syncHotkeysWithAltV()
    
    console.log(`[useHotkeys] ✅ HotKey removed and synced immediately: ${type}:${itemId}`)
  }, [])

  /**
   * Получить HotKey для элемента
   */
  const getHotkey = useCallback((type: FavoriteType, itemId: string) => {
    return favoritesService.getHotkey(type, itemId)
  }, [])

  /**
   * Получить все HotKey
   */
  const getAllHotkeys = useCallback(() => {
    return favoritesService.getAllHotkeys()
  }, [])

  return {
    getAllHotkeys,
    setHotkey,
    removeHotkey,
    getHotkey
  }
}

/**
 * Форматирование HotKey для отображения
 */
export function formatHotkey(binding: HotkeyBinding): string {
  const parts: string[] = []
  if (binding.modifiers?.ctrl) parts.push('Ctrl')
  if (binding.modifiers?.alt) parts.push('Alt')
  if (binding.modifiers?.shift) parts.push('Shift')
  parts.push(binding.key.toUpperCase())
  return parts.join('+')
}

