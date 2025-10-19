/**
 * Interior Manager
 * Управляет скачиванием и установкой интерьеров на сервере ALT:V
 */

import * as alt from 'alt-server'
import * as fs from 'fs'
import * as path from 'path'
import axios from 'axios'

export class InteriorManager {
  private static readonly BACKEND_URL = 'https://hub.feeld.space'
  private static readonly INTERIOR_PATH = 'hubresource/interiors/'
  private static isInitialized = false

  static initialize(): void {
    if (this.isInitialized) {
      alt.log('[InteriorManager] Already initialized')
      return
    }

    this.ensureInteriorDirectory()
    this.registerEventHandlers()
    this.isInitialized = true

    alt.log('[InteriorManager] ✅ Initialized')
  }

  private static ensureInteriorDirectory(): void {
    if (!fs.existsSync(this.INTERIOR_PATH)) {
      fs.mkdirSync(this.INTERIOR_PATH, { recursive: true })
      alt.log(`[InteriorManager] Created interior directory: ${this.INTERIOR_PATH}`)
    }
  }

  private static registerEventHandlers(): void {
    alt.onClient('meshhub:interior:download', this.handleDownloadRequest.bind(this))
  }

  private static async handleDownloadRequest(
    player: alt.Player,
    data: { interiorId: string; interiorName: string; token: string }
  ): Promise<void> {
    alt.log(`[InteriorManager] Download request from player ${player.id}: ${data.interiorName}`)

    try {
      // Проверяем, не установлен ли уже интерьер
      const interiorDir = path.join(this.INTERIOR_PATH, data.interiorName)
      const archivePath = path.join(interiorDir, 'dlc.rpf')

      if (fs.existsSync(archivePath)) {
        alt.log(`[InteriorManager] Interior already exists: ${archivePath}`)
        
        player.emit('meshhub:interior:download:server:response', {
          success: true,
          message: 'Interior already installed',
          interiorId: data.interiorId,
          alreadyExists: true
        })
        return
      }

      // Скачиваем архив с backend
      alt.log(`[InteriorManager] Downloading from: ${this.BACKEND_URL}/api/rpf/archives/${data.interiorId}/download`)
      
      const response = await axios.get(
        `${this.BACKEND_URL}/api/rpf/archives/${data.interiorId}/download`,
        {
          headers: {
            'Authorization': `Bearer ${data.token}`
          },
          responseType: 'arraybuffer',
          timeout: 120000 // 2 минуты на скачивание
        }
      )

      // Создаем папку если не существует
      if (!fs.existsSync(interiorDir)) {
        fs.mkdirSync(interiorDir, { recursive: true })
      }

      // Сохраняем архив
      fs.writeFileSync(archivePath, Buffer.from(response.data))

      const fileSizeMB = (response.data.byteLength / 1024 / 1024).toFixed(2)
      alt.log(`[InteriorManager] ✅ Interior saved to: ${archivePath} (${fileSizeMB} MB)`)

      // Отправляем ответ клиенту
      player.emit('meshhub:interior:download:server:response', {
        success: true,
        message: `Interior installed successfully (${fileSizeMB} MB)`,
        interiorId: data.interiorId
      })

      // Логируем в чат
      alt.log(`[InteriorManager] Player ${player.name} installed interior: ${data.interiorName}`)
      
    } catch (error: any) {
      alt.logError(`[InteriorManager] Failed to download interior: ${error.message}`)

      let errorMessage = 'Failed to download interior'
      if (error.response) {
        errorMessage = `Server error: ${error.response.status} ${error.response.statusText}`
      } else if (error.request) {
        errorMessage = 'Network error: no response from server'
      } else {
        errorMessage = error.message || 'Unknown error'
      }

      player.emit('meshhub:interior:download:server:response', {
        success: false,
        message: errorMessage
      })
    }
  }

  /**
   * Получить список установленных интерьеров
   */
  static getInstalledInteriors(): string[] {
    try {
      if (!fs.existsSync(this.INTERIOR_PATH)) {
        return []
      }

      const interiors = fs.readdirSync(this.INTERIOR_PATH, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name)

      alt.log(`[InteriorManager] Found ${interiors.length} installed interiors`)
      return interiors
    } catch (error) {
      alt.logError(`[InteriorManager] Failed to list installed interiors: ${error}`)
      return []
    }
  }

  /**
   * Проверить, установлен ли интерьер
   */
  static isInteriorInstalled(interiorName: string): boolean {
    const interiorDir = path.join(this.INTERIOR_PATH, interiorName)
    const archivePath = path.join(interiorDir, 'dlc.rpf')
    return fs.existsSync(archivePath)
  }

  /**
   * Удалить интерьер
   */
  static deleteInterior(interiorName: string): boolean {
    try {
      const interiorDir = path.join(this.INTERIOR_PATH, interiorName)
      
      if (!fs.existsSync(interiorDir)) {
        alt.log(`[InteriorManager] Interior not found: ${interiorName}`)
        return false
      }

      // Рекурсивно удаляем папку
      fs.rmSync(interiorDir, { recursive: true, force: true })
      
      alt.log(`[InteriorManager] ✅ Deleted interior: ${interiorName}`)
      return true
    } catch (error) {
      alt.logError(`[InteriorManager] Failed to delete interior ${interiorName}: ${error}`)
      return false
    }
  }

  static cleanup(): void {
    this.installedInteriors.clear()
    alt.log('[InteriorManager] Cleaned up')
  }
}

