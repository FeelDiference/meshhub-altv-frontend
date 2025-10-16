// Контроллер для управления автомобилями

import * as alt from 'alt-client'
import * as native from 'natives'
import { WebViewManager } from './webview-manager.js'

export class VehicleController {
  private static currentVehicle: alt.Vehicle | null = null
  private static isInitialized = false

  /**
   * Инициализация контроллера
   */
  static initialize(): void {
    if (this.isInitialized) {
      alt.logWarning('[MeshHub] VehicleController already initialized')
      return
    }

    // Регистрируем обработчики событий с сервера
    alt.onServer('meshhub:vehicle:spawned', (vehicleId: number, modelName: string, pos: alt.Vector3) => {
      this.onVehicleSpawned(vehicleId, modelName, pos)
    })

    alt.onServer('meshhub:vehicle:destroyed', (vehicleId: number) => {
      this.onVehicleDestroyed(vehicleId)
    })

    // Следим за изменением автомобиля игрока
    alt.on('enteredVehicle', (vehicle: alt.Vehicle, seat: number) => {
      if (seat === 1) { // Водительское место
        this.onPlayerEnteredVehicle(vehicle)
      }
    })

    alt.on('leftVehicle', (vehicle: alt.Vehicle, seat: number) => {
      if (seat === 1) { // Водительское место
        this.onPlayerLeftVehicle(vehicle)
      }
    })

    this.isInitialized = true
    alt.log('[MeshHub] ✅ VehicleController initialized')
  }

  /**
   * Спавн автомобиля
   */
  static async spawnVehicle(modelName: string): Promise<boolean> {
    try {
      alt.log(`[MeshHub] Spawning vehicle: ${modelName}`)

      // Удаляем предыдущий автомобиль если есть
      if (this.currentVehicle && this.currentVehicle.valid) {
        alt.log('[MeshHub] Destroying previous vehicle')
        this.currentVehicle.destroy()
        this.currentVehicle = null
      }

      // Загружаем модель
      const modelHash = alt.hash(modelName)
      
      if (!native.isModelValid(modelHash)) {
        alt.logError(`[MeshHub] Invalid model: ${modelName}`)
        WebViewManager.emitToWebView('vehicle:spawn:error', {
          modelName,
          error: 'Model not found'
        })
        return false
      }

      // Запрашиваем модель
      native.requestModel(modelHash)
      
      // Ждем загрузки модели (максимум 5 секунд)
      const loadStartTime = Date.now()
      while (!native.hasModelLoaded(modelHash)) {
        if (Date.now() - loadStartTime > 5000) {
          alt.logError(`[MeshHub] Model loading timeout: ${modelName}`)
          WebViewManager.emitToWebView('vehicle:spawn:error', {
            modelName,
            error: 'Model loading timeout'
          })
          return false
        }
        await this.wait(100)
      }

      // Получаем позицию игрока
      const player = alt.Player.local
      const playerPos = player.pos
      const playerRot = player.rot

      // Вычисляем позицию спавна (перед игроком)
      const spawnDistance = 3.0
      const spawnPos = {
        x: playerPos.x + Math.cos(playerRot.z) * spawnDistance,
        y: playerPos.y + Math.sin(playerRot.z) * spawnDistance,
        z: playerPos.z
      }

      // Создаем автомобиль
      const vehicle = new alt.Vehicle(modelHash, spawnPos.x, spawnPos.y, spawnPos.z, 0, 0, playerRot.z)
      
      if (!vehicle || !vehicle.valid) {
        alt.logError(`[MeshHub] Failed to create vehicle: ${modelName}`)
        WebViewManager.emitToWebView('vehicle:spawn:error', {
          modelName,
          error: 'Failed to create vehicle'
        })
        return false
      }

      this.currentVehicle = vehicle

      // Ждем немного для инициализации автомобиля
      await this.wait(500)

      // Сажаем игрока в автомобиль
      try {
        native.setPedIntoVehicle(player.scriptID, vehicle.scriptID, -1)
        alt.log(`[MeshHub] ✅ Player placed in vehicle: ${modelName}`)
      } catch (error) {
        alt.logWarning(`[MeshHub] Could not place player in vehicle: ${error}`)
      }

      // Уведомляем WebView об успешном спавне
      WebViewManager.emitToWebView('vehicle:spawned', {
        vehicleId: vehicle.id,
        modelName,
        position: spawnPos
      })

      alt.log(`[MeshHub] ✅ Vehicle spawned successfully: ${modelName} (ID: ${vehicle.id})`)
      return true

    } catch (error: any) {
      alt.logError(`[MeshHub] Error spawning vehicle ${modelName}: ${error}`)
      WebViewManager.emitToWebView('vehicle:spawn:error', {
        modelName,
        error: error.toString()
      })
      return false
    }
  }

  /**
   * Уничтожить текущий автомобиль
   */
  static destroyCurrentVehicle(): boolean {
    if (!this.currentVehicle || !this.currentVehicle.valid) {
      alt.logWarning('[MeshHub] No vehicle to destroy')
      return false
    }

    try {
      const vehicleId = this.currentVehicle.id
      this.currentVehicle.destroy()
      this.currentVehicle = null

      // Уведомляем WebView
      WebViewManager.emitToWebView('vehicle:destroyed', { vehicleId })

      alt.log(`[MeshHub] ✅ Vehicle destroyed: ${vehicleId}`)
      return true

    } catch (error) {
      alt.logError(`[MeshHub] Error destroying vehicle: ${error}`)
      return false
    }
  }

  /**
   * Получить текущий автомобиль
   */
  static getCurrentVehicle(): alt.Vehicle | null {
    return this.currentVehicle && this.currentVehicle.valid ? this.currentVehicle : null
  }

  /**
   * Получить автомобиль игрока (в котором сидит)
   */
  static getPlayerVehicle(): alt.Vehicle | null {
    const player = alt.Player.local
    return player.vehicle || null
  }

  /**
   * Обработчик спавна автомобиля с сервера
   */
  private static onVehicleSpawned(vehicleId: number, modelName: string, pos: alt.Vector3): void {
    alt.log(`[MeshHub] Server spawned vehicle: ${modelName} (ID: ${vehicleId})`)

    // Находим автомобиль по ID
    const vehicle = alt.Vehicle.getByID(vehicleId)
    if (vehicle) {
      this.currentVehicle = vehicle
      
      // Уведомляем WebView
      WebViewManager.emitToWebView('vehicle:spawned', {
        vehicleId,
        modelName,
        position: pos
      })
    }
  }

  /**
   * Обработчик уничтожения автомобиля с сервера
   */
  private static onVehicleDestroyed(vehicleId: number): void {
    alt.log(`[MeshHub] Server destroyed vehicle: ${vehicleId}`)

    if (this.currentVehicle && this.currentVehicle.id === vehicleId) {
      this.currentVehicle = null
    }

    // Уведомляем WebView
    WebViewManager.emitToWebView('vehicle:destroyed', { vehicleId })
  }

  /**
   * Игрок сел в автомобиль
   */
  private static onPlayerEnteredVehicle(vehicle: alt.Vehicle): void {
    alt.log(`[MeshHub] Player entered vehicle: ${vehicle.id}`)

    // Уведомляем WebView что игрок в автомобиле
    WebViewManager.emitToWebView('player:entered:vehicle', {
      vehicleId: vehicle.id,
      modelName: this.getVehicleModelName(vehicle)
    })
  }

  /**
   * Игрок вышел из автомобиля
   */
  private static onPlayerLeftVehicle(vehicle: alt.Vehicle): void {
    alt.log(`[MeshHub] Player left vehicle: ${vehicle.id}`)

    // Уведомляем WebView что игрок вышел из автомобиля
    WebViewManager.emitToWebView('player:left:vehicle', {
      vehicleId: vehicle.id
    })
  }

  /**
   * Получить имя модели автомобиля
   */
  private static getVehicleModelName(vehicle: alt.Vehicle): string {
    try {
      const modelHash = vehicle.model
      // К сожалению, в ALT:V нет простого способа получить строковое имя модели из хеша
      // Можно попробовать обратный поиск по известным моделям или запросить с сервера
      return `model_${modelHash}`
    } catch (error) {
      return 'unknown'
    }
  }

  /**
   * Очистка при отключении
   */
  static cleanup(): void {
    if (this.currentVehicle && this.currentVehicle.valid) {
      try {
        this.currentVehicle.destroy()
      } catch (error) {
        alt.logError(`[MeshHub] Error during cleanup: ${error}`)
      }
    }

    this.currentVehicle = null
    this.isInitialized = false
    
    alt.log('[MeshHub] VehicleController cleaned up')
  }

  /**
   * Вспомогательная функция ожидания
   */
  private static wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
