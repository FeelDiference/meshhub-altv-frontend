/**
 * Хук для работы с глобальными пресетами handling параметров
 * Обеспечивает взаимодействие с Alt:V сервером для загрузки/сохранения/управления пресетами
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import toast from 'react-hot-toast'

// Типы для пресетов
export type HandlingPreset = Record<string, number>

interface PresetListResponse {
  success: boolean
  presets: string[]
  message?: string
}

interface PresetGetResponse {
  success: boolean
  name?: string
  preset: HandlingPreset | null
  message?: string
}

interface PresetSaveResponse {
  success: boolean
  message: string
  isUpdate?: boolean
}

interface PresetDeleteResponse {
  success: boolean
  message: string
}

interface PresetRenameResponse {
  success: boolean
  message: string
  newName?: string
}

/**
 * Хук для работы с пресетами handling
 */
export function useHandlingPresets() {
  const [presetsList, setPresetsList] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const isLoadingRef = useRef(false)

  // Проверка доступности Alt:V API
  const isAltVAvailable = typeof window !== 'undefined' && 'alt' in window

  /**
   * Загрузить список всех пресетов
   */
  const loadPresetsList = useCallback(() => {
    if (!isAltVAvailable) {
      console.warn('[useHandlingPresets] Alt:V API not available')
      return
    }

    // Предотвращаем множественные запросы
    if (isLoadingRef.current) {
      console.log('[useHandlingPresets] Already loading, skipping request')
      return
    }

    isLoadingRef.current = true
    setIsLoading(true)
    console.log('[useHandlingPresets] Requesting presets list...')

    try {
      console.log('[useHandlingPresets] Getting Alt:V API...')
      const alt = (window as any).alt
      console.log('[useHandlingPresets] Alt:V API:', typeof alt, alt ? 'available' : 'not available')

      if (!alt || !alt.emit || !alt.once) {
        console.error('[useHandlingPresets] Alt:V API is incomplete!', { 
          emit: typeof alt?.emit, 
          once: typeof alt?.once
        })
        isLoadingRef.current = false
        setIsLoading(false)
        return
      }

      // Используем alt.once() для автоматической отписки после первого ответа
      console.log('[useHandlingPresets] Setting up one-time response handler...')
      alt.once('handling:preset:list:response', (data: PresetListResponse) => {
        console.log('[useHandlingPresets] Received response:', data)
        isLoadingRef.current = false
        setIsLoading(false)
        
        if (data && data.success) {
          const presets = data.presets || []
          setPresetsList(presets)
          console.log(`[useHandlingPresets] Loaded ${presets.length} presets`)
        } else {
          console.error('[useHandlingPresets] Failed to load presets:', data?.message)
          setPresetsList([])
        }
      })
      console.log('[useHandlingPresets] Response handler registered')

      // Отправляем запрос
      console.log('[useHandlingPresets] About to emit request...')
      alt.emit('handling:preset:list')
      console.log('[useHandlingPresets] Request sent successfully')

      // Таймаут на случай отсутствия ответа
      setTimeout(() => {
        if (isLoadingRef.current) {
          isLoadingRef.current = false
          setIsLoading(false)
          console.log('[useHandlingPresets] Timeout reached, no response received')
        }
      }, 5000)
    } catch (error) {
      console.error('[useHandlingPresets] Error loading presets list:', error)
      isLoadingRef.current = false
      setIsLoading(false)
    }
  }, [isAltVAvailable])

  /**
   * Загрузить конкретный пресет
   */
  const loadPreset = useCallback((name: string): Promise<HandlingPreset | null> => {
    return new Promise((resolve) => {
      if (!isAltVAvailable) {
        console.warn('[useHandlingPresets] Alt:V API not available')
        resolve(null)
        return
      }

      if (!name) {
        console.warn('[useHandlingPresets] Preset name is required')
        resolve(null)
        return
      }

      try {
        const alt = (window as any).alt
        let resolved = false

        // Используем alt.once() для автоматической отписки
        alt.once('handling:preset:get:response', (data: PresetGetResponse) => {
          resolved = true
          if (data && data.success && data.preset) {
            console.log(`[useHandlingPresets] Loaded preset "${name}" with ${Object.keys(data.preset).length} parameters`)
            toast.success(`Пресет "${name}" загружен`)
            resolve(data.preset)
          } else {
            console.error(`[useHandlingPresets] Failed to load preset "${name}":`, data?.message)
            toast.error(data?.message || `Ошибка при загрузке пресета "${name}"`)
            resolve(null)
          }
        })

        // Отправляем запрос
        alt.emit('handling:preset:get', name)

        // Таймаут на случай отсутствия ответа
        setTimeout(() => {
          if (!resolved) {
            resolve(null)
          }
        }, 5000)
      } catch (error) {
        console.error('[useHandlingPresets] Error loading preset:', error)
        toast.error(`Ошибка при загрузке пресета "${name}"`)
        resolve(null)
      }
    })
  }, [isAltVAvailable])

  /**
   * Сохранить пресет
   */
  const savePreset = useCallback((name: string, values: HandlingPreset): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!isAltVAvailable) {
        console.warn('[useHandlingPresets] Alt:V API not available')
        resolve(false)
        return
      }

      if (!name || !name.trim()) {
        toast.error('Имя пресета не может быть пустым')
        resolve(false)
        return
      }

      if (!values || Object.keys(values).length === 0) {
        toast.error('Нет параметров для сохранения')
        resolve(false)
        return
      }

      try {
        const alt = (window as any).alt
        let resolved = false

        // Используем alt.once() для автоматической отписки
        alt.once('handling:preset:save:response', (data: PresetSaveResponse) => {
          resolved = true
          if (data && data.success) {
            console.log(`[useHandlingPresets] Preset "${name}" saved successfully`)
            toast.success(data.message || `Пресет "${name}" сохранён`)
            
            // Обновляем список пресетов с небольшой задержкой
            setTimeout(() => {
              loadPresetsList()
            }, 100)
            
            resolve(true)
          } else {
            console.error(`[useHandlingPresets] Failed to save preset "${name}":`, data?.message)
            toast.error(data?.message || `Ошибка при сохранении пресета "${name}"`)
            resolve(false)
          }
        })

        // Отправляем запрос
        alt.emit('handling:preset:save', { name: name.trim(), values })

        // Таймаут на случай отсутствия ответа
        setTimeout(() => {
          if (!resolved) {
            resolve(false)
          }
        }, 5000)
      } catch (error) {
        console.error('[useHandlingPresets] Error saving preset:', error)
        toast.error(`Ошибка при сохранении пресета "${name}"`)
        resolve(false)
      }
    })
  }, [isAltVAvailable, loadPresetsList])

  /**
   * Удалить пресет
   */
  const deletePreset = useCallback((name: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!isAltVAvailable) {
        console.warn('[useHandlingPresets] Alt:V API not available')
        resolve(false)
        return
      }

      if (!name) {
        toast.error('Имя пресета не указано')
        resolve(false)
        return
      }

      try {
        const alt = (window as any).alt
        let resolved = false

        // Используем alt.once() для автоматической отписки
        alt.once('handling:preset:delete:response', (data: PresetDeleteResponse) => {
          resolved = true
          if (data && data.success) {
            console.log(`[useHandlingPresets] Preset "${name}" deleted successfully`)
            toast.success(data.message || `Пресет "${name}" удалён`)
            
            // Обновляем список пресетов с небольшой задержкой
            setTimeout(() => {
              loadPresetsList()
            }, 100)
            
            resolve(true)
          } else {
            console.error(`[useHandlingPresets] Failed to delete preset "${name}":`, data?.message)
            toast.error(data?.message || `Ошибка при удалении пресета "${name}"`)
            resolve(false)
          }
        })

        // Отправляем запрос
        alt.emit('handling:preset:delete', name)

        // Таймаут на случай отсутствия ответа
        setTimeout(() => {
          if (!resolved) {
            resolve(false)
          }
        }, 5000)
      } catch (error) {
        console.error('[useHandlingPresets] Error deleting preset:', error)
        toast.error(`Ошибка при удалении пресета "${name}"`)
        resolve(false)
      }
    })
  }, [isAltVAvailable, loadPresetsList])

  /**
   * Переименовать пресет
   */
  const renamePreset = useCallback((oldName: string, newName: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!isAltVAvailable) {
        console.warn('[useHandlingPresets] Alt:V API not available')
        resolve(false)
        return
      }

      if (!oldName || !newName || !newName.trim()) {
        toast.error('Имена пресетов не могут быть пустыми')
        resolve(false)
        return
      }

      try {
        const alt = (window as any).alt
        let resolved = false

        // Используем alt.once() для автоматической отписки
        alt.once('handling:preset:rename:response', (data: PresetRenameResponse) => {
          resolved = true
          if (data && data.success) {
            console.log(`[useHandlingPresets] Preset renamed: "${oldName}" → "${newName}"`)
            toast.success(data.message || `Пресет переименован`)
            
            // Обновляем список пресетов с небольшой задержкой
            setTimeout(() => {
              loadPresetsList()
            }, 100)
            
            resolve(true)
          } else {
            console.error(`[useHandlingPresets] Failed to rename preset:`, data?.message)
            toast.error(data?.message || `Ошибка при переименовании пресета`)
            resolve(false)
          }
        })

        // Отправляем запрос
        alt.emit('handling:preset:rename', { oldName, newName: newName.trim() })

        // Таймаут на случай отсутствия ответа
        setTimeout(() => {
          if (!resolved) {
            resolve(false)
          }
        }, 5000)
      } catch (error) {
        console.error('[useHandlingPresets] Error renaming preset:', error)
        toast.error(`Ошибка при переименовании пресета`)
        resolve(false)
      }
    })
  }, [isAltVAvailable, loadPresetsList])

  // Автоматически загружаем список при монтировании для отображения количества
  useEffect(() => {
    if (isAltVAvailable) {
      loadPresetsList()
    }
  }, [isAltVAvailable, loadPresetsList])

  return {
    presetsList,
    isLoading,
    loadPresetsList,
    loadPreset,
    savePreset,
    deletePreset,
    renamePreset,
  }
}

