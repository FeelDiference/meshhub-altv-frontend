// Хук для обработки событий автомобилей из Alt:V
import { useEffect } from 'react'

/**
 * Типы данных событий
 */
export interface VehicleDownloadedData {
  success: boolean
  vehicleId: string
  vehicleName: string
  message: string
}

export interface HandlingSavedData {
  success: boolean
  fileName?: string
  filePath?: string
  downloadsPath?: string
  error?: string
  vehicleName?: string
}

export interface VehicleSpawnedData {
  vehicleId: number
  modelName: string
  position: any
}

export interface VehicleSpawnErrorData {
  modelName: string
  error: string
  details: string
}

export interface LocalEditsUpdateData {
  localEdits: string[]
  restartRequired: string[]
}

/**
 * Параметры хука
 */
export interface UseVehicleEventsOptions {
  onVehicleDownloaded?: (data: VehicleDownloadedData) => void
  onHandlingSaved?: (data: HandlingSavedData) => void
  onVehicleSpawned?: (data: VehicleSpawnedData) => void
  onVehicleSpawnError?: (data: VehicleSpawnErrorData) => void
  onInstalledListResponse?: (installedNames: string[]) => void
  onLocalVehiclesResponse?: (vehicles: any[]) => void
  onLocalEditsUpdate?: (data: LocalEditsUpdateData) => void
  onPanelOpened?: () => void
}

/**
 * Хук для подписки на события автомобилей из Alt:V
 * Централизует всю логику обработки событий
 */
export function useVehicleEvents(options: UseVehicleEventsOptions) {
  const {
    onVehicleDownloaded,
    onHandlingSaved,
    onVehicleSpawned,
    onVehicleSpawnError,
    onInstalledListResponse,
    onLocalVehiclesResponse,
    onLocalEditsUpdate,
    onPanelOpened,
  } = options

  // Подписка на события скачивания и спавна
  useEffect(() => {
    if (typeof window === 'undefined' || !('alt' in window)) return

    const handlers: Array<[string, (data: any) => void]> = []

    // vehicle:downloaded
    if (onVehicleDownloaded) {
      const handler = (data: VehicleDownloadedData) => onVehicleDownloaded(data)
      ;(window as any).alt.on('vehicle:downloaded', handler)
      handlers.push(['vehicle:downloaded', handler])
    }

    // meshhub:vehicle:handling:saved
    if (onHandlingSaved) {
      const handler = (data: HandlingSavedData) => onHandlingSaved(data)
      ;(window as any).alt.on('meshhub:vehicle:handling:saved', handler)
      handlers.push(['meshhub:vehicle:handling:saved', handler])
    }

    // vehicle:spawned
    if (onVehicleSpawned) {
      const handler = (data: VehicleSpawnedData) => onVehicleSpawned(data)
      ;(window as any).alt.on('vehicle:spawned', handler)
      handlers.push(['vehicle:spawned', handler])
    }

    // vehicle:spawn:error
    if (onVehicleSpawnError) {
      const handler = (data: VehicleSpawnErrorData) => onVehicleSpawnError(data)
      ;(window as any).alt.on('vehicle:spawn:error', handler)
      handlers.push(['vehicle:spawn:error', handler])
    }

    // Cleanup
    return () => {
      handlers.forEach(([event, handler]) => {
        ;(window as any).alt.off?.(event, handler)
      })
    }
  }, [onVehicleDownloaded, onHandlingSaved, onVehicleSpawned, onVehicleSpawnError])

  // Подписка на события списков машин
  useEffect(() => {
    if (typeof window === 'undefined' || !('alt' in window)) return

    const handlers: Array<[string, (data: any) => void]> = []

    // vehicle:installed:list:response
    if (onInstalledListResponse) {
      const handler = (installedNames: string[]) => onInstalledListResponse(installedNames)
      ;(window as any).alt.on('vehicle:installed:list:response', handler)
      handlers.push(['vehicle:installed:list:response', handler])
    }

    // meshhub:vehicle:local:list:response (legacy)
    if (onLocalVehiclesResponse) {
      const handler = (vehicles: any[]) => onLocalVehiclesResponse(vehicles)
      ;(window as any).alt.on('meshhub:vehicle:local:list:response', handler)
      handlers.push(['meshhub:vehicle:local:list:response', handler])
    }

    // Cleanup
    return () => {
      handlers.forEach(([event, handler]) => {
        ;(window as any).alt.off?.(event, handler)
      })
    }
  }, [onInstalledListResponse, onLocalVehiclesResponse])

  // Подписка на события локальных изменений
  useEffect(() => {
    if (typeof window === 'undefined' || !('alt' in window)) return

    const handlers: Array<[string, (data: any) => void]> = []

    // local-edits-update
    if (onLocalEditsUpdate) {
      const handler = (data: LocalEditsUpdateData) => onLocalEditsUpdate(data)
      ;(window as any).alt.on('local-edits-update', handler)
      handlers.push(['local-edits-update', handler])
    }

    // altv:panel:opened
    if (onPanelOpened) {
      const handler = () => onPanelOpened()
      ;(window as any).alt.on('altv:panel:opened', handler)
      handlers.push(['altv:panel:opened', handler])
    }

    // Cleanup
    return () => {
      handlers.forEach(([event, handler]) => {
        ;(window as any).alt.off?.(event, handler)
      })
    }
  }, [onLocalEditsUpdate, onPanelOpened])
}


