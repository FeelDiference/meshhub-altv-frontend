// Менеджер автомобилей на сервере

import * as alt from 'alt-server'

interface PlayerVehicleData {
  playerId: number
  vehicles: alt.Vehicle[]
  currentVehicle?: alt.Vehicle
}

export class VehicleManager {
  private static playerVehicles: Map<number, PlayerVehicleData> = new Map()
  private static isInitialized = false

  /**
   * Инициализация менеджера автомобилей
   */
  static initialize(): void {
    if (this.isInitialized) {
      alt.logWarning('[MeshHub] VehicleManager already initialized')
      return
    }

    // Регистрируем обработчики событий от клиентов
    this.registerEventHandlers()

    this.isInitialized = true
    alt.log('[MeshHub] ✅ VehicleManager initialized')
  }

  /**
   * Регистрация обработчиков событий
   */
  private static registerEventHandlers(): void {
    // Запрос на спавн автомобиля
    alt.onClient('meshhub:vehicle:spawn', (player: alt.Player, modelName: string) => {
      this.handleVehicleSpawn(player, modelName)
    })

    // Запрос на уничтожение автомобиля
    alt.onClient('meshhub:vehicle:destroy', (player: alt.Player, vehicleId: number) => {
      this.handleVehicleDestroy(player, vehicleId)
    })

    // Запрос на получение списка автомобилей игрока
    alt.onClient('meshhub:vehicle:list', (player: alt.Player) => {
      this.handleVehicleList(player)
    })

    alt.log('[MeshHub] Vehicle event handlers registered')
  }

  /**
   * Обработка спавна автомобиля
   */
  private static async handleVehicleSpawn(player: alt.Player, modelName: string): Promise<void> {
    try {
      alt.log(`[MeshHub] Spawning vehicle for ${player.name}: ${modelName}`)

      // Проверяем валидность модели
      const modelHash = alt.hash(modelName)
      if (!this.isValidVehicleModel(modelHash)) {
        alt.logError(`[MeshHub] Invalid vehicle model: ${modelName}`)
        player.send(`[MeshHub] ❌ Invalid vehicle model: ${modelName}`)
        return
      }

      // Удаляем предыдущий автомобиль игрока
      await this.destroyPlayerCurrentVehicle(player)

      // Получаем позицию спавна
      const spawnPos = this.getVehicleSpawnPosition(player)
      if (!spawnPos) {
        alt.logError(`[MeshHub] Could not determine spawn position for ${player.name}`)
        player.send('[MeshHub] ❌ Could not determine spawn position')
        return
      }

      // Создаем автомобиль
      const vehicle = new alt.Vehicle(modelHash, spawnPos.x, spawnPos.y, spawnPos.z, 0, 0, spawnPos.rot)
      
      if (!vehicle || !vehicle.valid) {
        alt.logError(`[MeshHub] Failed to create vehicle: ${modelName}`)
        player.send(`[MeshHub] ❌ Failed to create vehicle: ${modelName}`)
        return
      }

      // Устанавливаем владельца
      vehicle.setMeta('owner', player.id)
      vehicle.setMeta('modelName', modelName)
      vehicle.setMeta('spawnedBy', 'meshhub')

      // Добавляем в список автомобилей игрока
      this.addPlayerVehicle(player, vehicle)

      // Ждем немного для инициализации
      await this.wait(500)

      // Сажаем игрока в автомобиль
      try {
        player.vehicle = vehicle
        player.seat = 1 // Водительское место
        alt.log(`[MeshHub] ✅ Player ${player.name} placed in vehicle`)
      } catch (error) {
        alt.logWarning(`[MeshHub] Could not place player in vehicle: ${error}`)
      }

      // Уведомляем клиент об успешном спавне
      alt.emitClient(player, 'meshhub:vehicle:spawned', vehicle.id, modelName, spawnPos)

      player.send(`[MeshHub] ✅ Vehicle spawned: ${modelName}`)
      alt.log(`[MeshHub] ✅ Vehicle spawned for ${player.name}: ${modelName} (ID: ${vehicle.id})`)

    } catch (error) {
      alt.logError(`[MeshHub] Error spawning vehicle for ${player.name}: ${error}`)
      player.send(`[MeshHub] ❌ Error spawning vehicle: ${error}`)
    }
  }

  /**
   * Обработка уничтожения автомобиля
   */
  private static handleVehicleDestroy(player: alt.Player, vehicleId: number): void {
    try {
      alt.log(`[MeshHub] Destroying vehicle for ${player.name}: ${vehicleId}`)

      const vehicle = alt.Vehicle.getByID(vehicleId)
      if (!vehicle || !vehicle.valid) {
        alt.logWarning(`[MeshHub] Vehicle not found: ${vehicleId}`)
        player.send(`[MeshHub] ❌ Vehicle not found: ${vehicleId}`)
        return
      }

      // Проверяем владельца
      const owner = vehicle.getMeta('owner')
      if (owner !== player.id) {
        alt.logWarning(`[MeshHub] Player ${player.name} tried to destroy vehicle owned by ${owner}`)
        player.send('[MeshHub] ❌ You can only destroy your own vehicles')
        return
      }

      // Удаляем из списка игрока
      this.removePlayerVehicle(player, vehicle)

      // Уничтожаем автомобиль
      vehicle.destroy()

      // Уведомляем клиент
      alt.emitClient(player, 'meshhub:vehicle:destroyed', vehicleId)

      player.send(`[MeshHub] ✅ Vehicle destroyed: ${vehicleId}`)
      alt.log(`[MeshHub] ✅ Vehicle destroyed: ${vehicleId}`)

    } catch (error) {
      alt.logError(`[MeshHub] Error destroying vehicle: ${error}`)
      player.send(`[MeshHub] ❌ Error destroying vehicle: ${error}`)
    }
  }

  /**
   * Обработка запроса списка автомобилей
   */
  private static handleVehicleList(player: alt.Player): void {
    const playerData = this.playerVehicles.get(player.id)
    const vehicles = playerData?.vehicles || []

    const vehicleList = vehicles.map(vehicle => ({
      id: vehicle.id,
      modelName: vehicle.getMeta('modelName') || 'unknown',
      position: vehicle.pos,
      isValid: vehicle.valid
    }))

    alt.emitClient(player, 'meshhub:vehicle:list:response', vehicleList)
    alt.log(`[MeshHub] Sent vehicle list to ${player.name}: ${vehicles.length} vehicles`)
  }

  /**
   * Получить позицию спавна автомобиля
   */
  private static getVehicleSpawnPosition(player: alt.Player): { x: number; y: number; z: number; rot: number } | null {
    try {
      const playerPos = player.pos
      const playerRot = player.rot

      // Спавним перед игроком на расстоянии 3 метра
      const spawnDistance = 3.0
      const spawnX = playerPos.x + Math.cos(playerRot.z) * spawnDistance
      const spawnY = playerPos.y + Math.sin(playerRot.z) * spawnDistance
      const spawnZ = playerPos.z

      return {
        x: spawnX,
        y: spawnY,
        z: spawnZ,
        rot: playerRot.z
      }
    } catch (error) {
      alt.logError(`[MeshHub] Error calculating spawn position: ${error}`)
      return null
    }
  }

  /**
   * Проверить валидность модели автомобиля
   */
  private static isValidVehicleModel(modelHash: number): boolean {
    // Базовая проверка - можно расширить списком разрешенных моделей
    return modelHash !== 0
  }

  /**
   * Уничтожить текущий автомобиль игрока
   */
  private static async destroyPlayerCurrentVehicle(player: alt.Player): Promise<void> {
    const playerData = this.playerVehicles.get(player.id)
    if (!playerData || !playerData.currentVehicle) {
      return
    }

    const currentVehicle = playerData.currentVehicle
    if (currentVehicle.valid) {
      alt.log(`[MeshHub] Destroying previous vehicle for ${player.name}: ${currentVehicle.id}`)
      
      try {
        // Высаживаем игрока если он в автомобиле
        if (player.vehicle === currentVehicle) {
          player.vehicle = null
        }
        
        // Ждем немного
        await this.wait(200)
        
        // Уничтожаем автомобиль
        currentVehicle.destroy()
        
        // Удаляем из списка
        this.removePlayerVehicle(player, currentVehicle)
        
      } catch (error) {
        alt.logError(`[MeshHub] Error destroying previous vehicle: ${error}`)
      }
    }
  }

  /**
   * Добавить автомобиль игрока
   */
  private static addPlayerVehicle(player: alt.Player, vehicle: alt.Vehicle): void {
    let playerData = this.playerVehicles.get(player.id)
    
    if (!playerData) {
      playerData = {
        playerId: player.id,
        vehicles: []
      }
      this.playerVehicles.set(player.id, playerData)
    }

    playerData.vehicles.push(vehicle)
    playerData.currentVehicle = vehicle

    alt.log(`[MeshHub] Added vehicle ${vehicle.id} to player ${player.name}`)
  }

  /**
   * Удалить автомобиль игрока
   */
  private static removePlayerVehicle(player: alt.Player, vehicle: alt.Vehicle): void {
    const playerData = this.playerVehicles.get(player.id)
    if (!playerData) return

    const index = playerData.vehicles.indexOf(vehicle)
    if (index > -1) {
      playerData.vehicles.splice(index, 1)
    }

    if (playerData.currentVehicle === vehicle) {
      playerData.currentVehicle = undefined
    }

    alt.log(`[MeshHub] Removed vehicle ${vehicle.id} from player ${player.name}`)
  }

  /**
   * Очистить все автомобили игрока
   */
  static cleanupPlayerVehicles(player: alt.Player): void {
    const playerData = this.playerVehicles.get(player.id)
    if (!playerData) return

    alt.log(`[MeshHub] Cleaning up vehicles for player ${player.name}`)

    // Уничтожаем все автомобили игрока
    playerData.vehicles.forEach(vehicle => {
      if (vehicle.valid) {
        try {
          vehicle.destroy()
          alt.log(`[MeshHub] Destroyed vehicle ${vehicle.id} during cleanup`)
        } catch (error) {
          alt.logError(`[MeshHub] Error destroying vehicle during cleanup: ${error}`)
        }
      }
    })

    // Удаляем данные игрока
    this.playerVehicles.delete(player.id)
    
    alt.log(`[MeshHub] ✅ Cleaned up vehicles for player ${player.name}`)
  }

  /**
   * Получить статистику автомобилей
   */
  static getVehicleStats(): { totalVehicles: number; playerCount: number; vehiclesByPlayer: Map<number, number> } {
    const vehiclesByPlayer = new Map<number, number>()
    let totalVehicles = 0

    this.playerVehicles.forEach((playerData, playerId) => {
      const validVehicles = playerData.vehicles.filter(v => v.valid).length
      vehiclesByPlayer.set(playerId, validVehicles)
      totalVehicles += validVehicles
    })

    return {
      totalVehicles,
      playerCount: this.playerVehicles.size,
      vehiclesByPlayer
    }
  }

  /**
   * Очистка при остановке ресурса
   */
  static cleanup(): void {
    alt.log('[MeshHub] Cleaning up all vehicles...')

    // Уничтожаем все автомобили
    this.playerVehicles.forEach((playerData, playerId) => {
      playerData.vehicles.forEach(vehicle => {
        if (vehicle.valid) {
          try {
            vehicle.destroy()
          } catch (error) {
            alt.logError(`[MeshHub] Error destroying vehicle during cleanup: ${error}`)
          }
        }
      })
    })

    // Очищаем данные
    this.playerVehicles.clear()
    this.isInitialized = false

    alt.log('[MeshHub] ✅ VehicleManager cleaned up')
  }

  /**
   * Вспомогательная функция ожидания
   */
  private static wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
