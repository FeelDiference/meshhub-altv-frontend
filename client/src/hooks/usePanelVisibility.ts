// Хук для управления видимостью боковых панелей
import { useState, useCallback } from 'react'

/**
 * Хук для управления видимостью боковых панелей (тюнинг, мета, действия)
 * Отслеживает ручное сворачивание пользователем
 */
export function usePanelVisibility() {
  const [panelsVisible, setPanelsVisible] = useState(false)
  const [showTuning, setShowTuning] = useState(false)
  const [showMeta, setShowMeta] = useState(false)
  const [showActions, setShowActions] = useState(false)
  const [userManuallyCollapsed, setUserManuallyCollapsed] = useState(false)

  /**
   * Показать все панели
   */
  const showAllPanels = useCallback(() => {
    setPanelsVisible(true)
    setShowTuning(true)
    setShowMeta(true)
    setShowActions(true)
  }, [])

  /**
   * Скрыть все панели
   */
  const hideAllPanels = useCallback(() => {
    setPanelsVisible(false)
    setShowTuning(false)
    setShowMeta(false)
    setShowActions(false)
  }, [])

  /**
   * Переключить видимость всех панелей
   */
  const toggleAllPanels = useCallback(() => {
    setPanelsVisible(prev => {
      const newVisible = !prev
      setShowTuning(newVisible)
      setShowMeta(newVisible)
      setShowActions(newVisible)
      
      // Если пользователь сворачивает вручную, запоминаем это
      if (!newVisible) {
        setUserManuallyCollapsed(true)
        console.log('[usePanelVisibility] User manually collapsed panels')
      }
      
      return newVisible
    })
  }, [])

  /**
   * Сбросить флаг ручного сворачивания
   */
  const resetManualCollapse = useCallback(() => {
    setUserManuallyCollapsed(false)
    console.log('[usePanelVisibility] Reset manual collapse flag')
  }, [])

  return {
    // Состояния
    panelsVisible,
    showTuning,
    showMeta,
    showActions,
    userManuallyCollapsed,
    
    // Сеттеры
    setPanelsVisible,
    setShowTuning,
    setShowMeta,
    setShowActions,
    setUserManuallyCollapsed,
    
    // Методы
    showAllPanels,
    hideAllPanels,
    toggleAllPanels,
    resetManualCollapse
  }
}

