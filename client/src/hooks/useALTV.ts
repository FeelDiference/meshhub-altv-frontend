// React хук для интеграции с ALT:V

import { useState, useEffect, useCallback, useRef } from 'react'
import altvBridge from '@/services/altv-bridge'
import type { ALTVState, SpawnedVehicle } from '@/types/altv'

export interface UseALTVReturn {
  // Состояние
  isAvailable: boolean
  isConnected: boolean
  currentVehicle: SpawnedVehicle | null
  isWebViewVisible: boolean
  
  // Действия с автомобилями
  spawnVehicle: (modelName: string) => void
  destroyVehicle: (vehicleId?: number) => void
  updateHandling: (parameter: string, value: number) => void
  resetHandling: () => void
  requestHandlingMeta: (modelName: string, category?: 'gtav' | 'local' | 'meshhub') => void
  checkInstallation: (modelName: string) => void
  
  // Действия панели
  closePanel: () => void
  
  // События (колбэки)
  onVehicleSpawned?: (data: { vehicleId: number; modelName: string }) => void
  onVehicleDestroyed?: (data: { vehicleId: number }) => void
  onHandlingApplied?: (data: { parameter: string; value: number; success: boolean }) => void
  onHandlingMetaReceived?: (data: { modelName: string; xml: string }) => void
  onInstallationChecked?: (data: { modelName: string; isInstalled: boolean }) => void
}

export function useALTV(callbacks: {
  onVehicleSpawned?: (data: { vehicleId: number; modelName: string }) => void
  onVehicleDestroyed?: (data: { vehicleId: number }) => void
  onHandlingApplied?: (data: { parameter: string; value: number; success: boolean; error?: string }) => void
  onHandlingMetaReceived?: (data: { modelName: string; xml: string }) => void
  onInstallationChecked?: (data: { modelName: string; isInstalled: boolean }) => void
  onPlayerEnteredVehicle?: (data: { vehicleId: number; modelName: string }) => void
  onPlayerLeftVehicle?: (data: { vehicleId: number }) => void
  onLocalVehiclesReceived?: (vehicles: any[]) => void
} = {}): UseALTVReturn {
  
  // Состояние
  const [altvState, setALTVState] = useState<ALTVState>(altvBridge.getState())
  
  // Ссылки на колбэки для избежания пересоздания обработчиков
  const callbacksRef = useRef(callbacks)
  callbacksRef.current = callbacks

  // Обновление состояния ALT:V
  const updateState = useCallback(() => {
    setALTVState(altvBridge.getState())
  }, [])

  // Действия с автомобилями
  const spawnVehicle = useCallback((modelName: string) => {
    console.log(`[useALTV] Spawning vehicle: ${modelName}`)
    altvBridge.emit('vehicle:spawn', { modelName })
  }, [])

  const destroyVehicle = useCallback((vehicleId?: number) => {
    const targetId = vehicleId || altvState.currentVehicle?.id
    if (targetId) {
      console.log(`[useALTV] Destroying vehicle: ${targetId}`)
      altvBridge.emit('vehicle:destroy', { vehicleId: targetId })
    } else {
      console.warn('[useALTV] No vehicle to destroy')
    }
  }, [altvState.currentVehicle?.id])

  const updateHandling = useCallback((parameter: string, value: number) => {
    console.log(`[useALTV] Updating handling: ${parameter} = ${value}`)
    altvBridge.emit('handling:update', { parameter, value })
  }, [])

  const resetHandling = useCallback(() => {
    console.log(`[useALTV] Resetting all handling to defaults`)
    altvBridge.emit('handling:reset', undefined)
  }, [])

  const requestHandlingMeta = useCallback((modelName: string, category?: 'gtav' | 'local' | 'meshhub') => {
    console.log(`[useALTV] Requesting handling.meta for ${modelName} (category: ${category || 'unknown'})`)
    altvBridge.emit('handling:meta:request', { modelName, vehicleCategory: category })
  }, [])

  const checkInstallation = useCallback((modelName: string) => {
    console.log(`[useALTV] Checking installation: ${modelName}`)
    altvBridge.emit('installation:check', { modelName })
  }, [])

  // Действие панели
  const closePanel = useCallback(() => {
    console.log('[useALTV] Closing panel')
    altvBridge.emit('panel:close', undefined)
  }, [])

  // Настройка обработчиков событий
  useEffect(() => {
    // Обработчик открытия панели
    const handlePanelOpened = () => {
      console.log('[useALTV] Panel opened')
      updateState()
    }

    // Обработчик закрытия панели
    const handlePanelClosed = () => {
      console.log('[useALTV] Panel closed')
      updateState()
    }

    // Обработчик спавна автомобиля
    const handleVehicleSpawned = (data: { vehicleId: number; modelName: string; position: any }) => {
      console.log('[useALTV] Vehicle spawned:', data)
      updateState()
      callbacksRef.current.onVehicleSpawned?.(data)
    }

    // Обработчик уничтожения автомобиля
    const handleVehicleDestroyed = (data: { vehicleId: number }) => {
      console.log('[useALTV] Vehicle destroyed:', data)
      updateState()
      callbacksRef.current.onVehicleDestroyed?.(data)
    }

    // Обработчик применения handling
    const handleHandlingApplied = (data: { parameter: string; value: number; success: boolean; error?: string }) => {
      console.log('[useALTV] Handling applied:', data)
      callbacksRef.current.onHandlingApplied?.(data)
    }

    // Обработчик проверки установки
    const handleInstallationChecked = (data: { modelName: string; isInstalled: boolean }) => {
      console.log('[useALTV] Installation checked:', data)
      callbacksRef.current.onInstallationChecked?.(data)
    }

    // Обработчик входа игрока в автомобиль
    const handlePlayerEnteredVehicle = (data: { vehicleId: number; modelName: string }) => {
      console.log('[useALTV] 🚗 Player entered vehicle:', data)
      console.log('[useALTV] 🔍 Data details:', { vehicleId: data.vehicleId, modelName: data.modelName })
      updateState()
      callbacksRef.current.onPlayerEnteredVehicle?.(data)
      console.log('[useALTV] ✅ Callback executed for player entered vehicle')
    }

    // Обработчик выхода игрока из автомобиля
    const handlePlayerLeftVehicle = (data: { vehicleId: number }) => {
      console.log('[useALTV] Player left vehicle:', data)
      updateState()
      callbacksRef.current.onPlayerLeftVehicle?.(data)
    }

    // Обработчик получения handling.meta
    const handleHandlingMetaReceived = (data: { modelName: string; xml: string }) => {
      console.log('[useALTV] 🔥 Handling meta received:', data)
      console.log('[useALTV] 🔍 Data details:', { modelName: data.modelName, xmlLength: data.xml?.length })
      console.log('[useALTV] 🔍 Callbacks available:', !!callbacksRef.current.onHandlingMetaReceived)
      callbacksRef.current.onHandlingMetaReceived?.(data)
      console.log('[useALTV] ✅ Callback executed')
    }

    // Обработчик получения локальных машин
    const handleLocalVehiclesReceived = (vehicles: any[]) => {
      console.log('[useALTV] 🏠 Local vehicles received:', vehicles.length)
      callbacksRef.current.onLocalVehiclesReceived?.(vehicles)
    }

    // Подписываемся на события
    console.log('[useALTV] 🔧 Setting up event listeners...')
    altvBridge.on('panel:opened', handlePanelOpened)
    altvBridge.on('panel:closed', handlePanelClosed)
    altvBridge.on('vehicle:spawned', handleVehicleSpawned)
    altvBridge.on('vehicle:destroyed', handleVehicleDestroyed)
    altvBridge.on('handling:applied', handleHandlingApplied)
    altvBridge.on('installation:checked', handleInstallationChecked)
    altvBridge.on('player:entered:vehicle', handlePlayerEnteredVehicle)
    altvBridge.on('player:left:vehicle', handlePlayerLeftVehicle)
    altvBridge.on('meshhub:vehicle:handling:meta:response', handleHandlingMetaReceived)
    altvBridge.on('meshhub:vehicle:local:list:response', handleLocalVehiclesReceived)
    console.log('[useALTV] ✅ Event listeners registered')

    // Получаем начальное состояние
    updateState()

    // Cleanup при размонтировании
    return () => {
      altvBridge.off('panel:opened', handlePanelOpened)
      altvBridge.off('panel:closed', handlePanelClosed)
      altvBridge.off('vehicle:spawned', handleVehicleSpawned)
      altvBridge.off('vehicle:destroyed', handleVehicleDestroyed)
      altvBridge.off('handling:applied', handleHandlingApplied)
      altvBridge.off('installation:checked', handleInstallationChecked)
    altvBridge.off('player:entered:vehicle', handlePlayerEnteredVehicle)
    altvBridge.off('player:left:vehicle', handlePlayerLeftVehicle)
    altvBridge.off('meshhub:vehicle:handling:meta:response', handleHandlingMetaReceived)
    altvBridge.off('meshhub:vehicle:local:list:response', handleLocalVehiclesReceived)
    }
  }, [updateState])

  return {
    // Состояние
    isAvailable: altvBridge.isAvailable(),
    isConnected: altvState.isConnected,
    currentVehicle: altvState.currentVehicle,
    isWebViewVisible: altvState.isWebViewVisible,
    
    // Действия
    spawnVehicle,
    destroyVehicle,
    updateHandling,
    resetHandling,
    requestHandlingMeta,
    checkInstallation,
    closePanel,
  }
}

// Экспорт дополнительных утилит
export const isRunningInALTV = () => altvBridge.isAvailable()

export const getALTVConnectionStatus = () => {
  const state = altvBridge.getState()
  return {
    isAvailable: altvBridge.isAvailable(),
    isConnected: state.isConnected,
    environment: altvBridge.isAvailable() ? 'ALT:V' : 'Browser'
  }
}
