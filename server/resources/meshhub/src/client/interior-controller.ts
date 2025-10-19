/**
 * Interior Controller
 * Управляет интерьерами на стороне клиента ALT:V
 */

import * as alt from 'alt-client'

export class InteriorController {
  private static installedInteriors: Set<string> = new Set()
  private static isInitialized = false
  private static readonly STORAGE_PATH = 'hubresource/interiors/'

  static initialize(): void {
    if (this.isInitialized) {
      alt.log('[InteriorController] Already initialized')
      return
    }

    this.loadInstalledInteriors()
    this.registerEventHandlers()
    this.isInitialized = true

    alt.log('[InteriorController] ✅ Initialized')
  }

  private static registerEventHandlers(): void {
    // Получить список установленных интерьеров
    alt.on('meshhub:interior:list:request', () => {
      this.handleListRequest()
    })

    // Телепортация к интерьеру
    alt.on('meshhub:interior:teleport', (data: { interiorId: string; archetypeName: string; position: { x: number; y: number; z: number } }) => {
      this.teleportToInterior(data)
    })

    // Скачивание интерьера (запрос к серверу)
    alt.on('meshhub:interior:download', (data: { interiorId: string; interiorName: string; token: string }) => {
      this.downloadInterior(data)
    })

    // Проверка установки интерьера
    alt.on('meshhub:interior:check', (data: { interiorId: string; interiorName: string }) => {
      this.checkInterior(data)
    })

    // Ответ от сервера на скачивание
    alt.on('meshhub:interior:download:server:response', (response: { success: boolean; message: string; interiorId?: string }) => {
      this.handleDownloadResponse(response)
    })

    alt.log('[InteriorController] Event handlers registered')
  }

  private static handleListRequest(): void {
    const interiors = Array.from(this.installedInteriors)
    
    alt.emit('meshhub:interior:list:response', {
      interiors: interiors,
      error: undefined
    })

    alt.log(`[InteriorController] Listed ${interiors.length} installed interiors`)
  }

  private static teleportToInterior(data: { interiorId: string; archetypeName: string; position: { x: number; y: number; z: number } }): void {
    try {
      const player = alt.Player.local
      
      alt.log(`[InteriorController] Teleporting to interior: ${data.archetypeName} at (${data.position.x}, ${data.position.y}, ${data.position.z})`)
      
      // Телепортируем игрока
      player.pos = new alt.Vector3(data.position.x, data.position.y, data.position.z)
      
      // Небольшая задержка для загрузки интерьера
      alt.setTimeout(() => {
        alt.log('[InteriorController] ✅ Teleported to interior')
        
        // Можно добавить уведомление в игре
        alt.emit('chat:message', {
          message: `Телепортирован к интерьеру: ${data.archetypeName}`,
          color: [100, 200, 100]
        })
      }, 100)
    } catch (error) {
      alt.logError(`[InteriorController] Failed to teleport: ${error}`)
    }
  }

  private static downloadInterior(data: { interiorId: string; interiorName: string; token: string }): void {
    alt.log(`[InteriorController] Downloading interior: ${data.interiorName}`)

    // Отправляем запрос на сервер для скачивания
    alt.emitServer('meshhub:interior:download', {
      interiorId: data.interiorId,
      interiorName: data.interiorName,
      token: data.token
    })
  }

  private static checkInterior(data: { interiorId: string; interiorName: string }): void {
    const exists = this.installedInteriors.has(data.interiorId)
    
    alt.emit('meshhub:interior:check:response', {
      interiorName: data.interiorName,
      exists: exists,
      error: undefined
    })

    alt.log(`[InteriorController] Interior ${data.interiorName} exists: ${exists}`)
  }

  private static handleDownloadResponse(response: { success: boolean; message: string; interiorId?: string }): void {
    if (response.success && response.interiorId) {
      this.installedInteriors.add(response.interiorId)
      this.saveInstalledInteriors()
      
      alt.log(`[InteriorController] ✅ Interior ${response.interiorId} installed successfully`)
    } else {
      alt.logError(`[InteriorController] ❌ Failed to install interior: ${response.message}`)
    }

    // Отправляем ответ в WebView
    alt.emit('meshhub:interior:download:response', response)
  }

  private static loadInstalledInteriors(): void {
    // TODO: Загружаем из localStorage или проверяем файловую систему через сервер
    // Для простоты используем set, который будет заполняться при скачивании
    this.installedInteriors = new Set()
    alt.log('[InteriorController] Loaded installed interiors')
  }

  private static saveInstalledInteriors(): void {
    // TODO: Сохраняем список установленных интерьеров
    // Можно использовать alt.LocalStorage или отправить на сервер
    alt.log('[InteriorController] Saved installed interiors')
  }

  static cleanup(): void {
    // Очистка при выходе
    this.installedInteriors.clear()
    alt.log('[InteriorController] Cleaned up')
  }
}

