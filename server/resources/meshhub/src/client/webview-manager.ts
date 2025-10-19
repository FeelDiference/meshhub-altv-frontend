// Менеджер WebView для MeshHub интерфейса

import * as alt from 'alt-client'
import * as native from 'natives'

export class WebViewManager {
  private static webview: alt.WebView | null = null
  private static isInitialized = false
  private static currentlyVisible = false

  /**
   * Инициализация WebView
   */
  static initialize(): void {
    if (this.isInitialized) {
      alt.logWarning('[MeshHub] WebView already initialized')
      return
    }

    try {
      // Создаем WebView с URL к нашему React приложению
      // В разработке используем localhost:3000, в production - собранный build
      const webviewUrl = this.getWebViewURL()
      
      alt.log(`[MeshHub] Creating WebView with URL: ${webviewUrl}`)
      
      this.webview = new alt.WebView(webviewUrl, false)
      
      if (!this.webview) {
        throw new Error('Failed to create WebView instance')
      }

      // Позиционирование справа (400px ширина)
      const screenRes = native.getActiveScreenResolution(0, 0)
      const screenWidth = screenRes.width
      const screenHeight = screenRes.height
      
      const panelWidth = 400
      const panelHeight = screenHeight
      
      this.webview.pos = { 
        x: screenWidth - panelWidth, 
        y: 0 
      }
      this.webview.size = { 
        x: panelWidth, 
        y: panelHeight 
      }

      // Изначально скрыт
      this.webview.isVisible = false
      
      // Регистрируем обработчики событий
      this.registerEventHandlers()
      
      this.isInitialized = true
      this.currentlyVisible = false
      
      alt.log('[MeshHub] ✅ WebView initialized successfully')
      alt.log(`[MeshHub] Panel size: ${panelWidth}x${panelHeight}`)
      alt.log(`[MeshHub] Panel position: ${screenWidth - panelWidth}, 0`)
      
    } catch (error) {
      alt.logError(`[MeshHub] Failed to initialize WebView: ${error}`)
      this.webview = null
      this.isInitialized = false
    }
  }

  /**
   * Получить URL для WebView
   */
  private static getWebViewURL(): string {
    // Используем локальный билд из ресурса
    return 'http://resource/webview/index.html'
    
    // Для разработки с HMR можно использовать:
    // return 'http://localhost:3000'
  }

  /**
   * Регистрация обработчиков событий WebView
   */
  private static registerEventHandlers(): void {
    if (!this.webview) return

    // События от WebView → Client
    this.webview.on('panel:close', () => {
      alt.log('[MeshHub] WebView requested to close')
      this.hide()
    })

    this.webview.on('vehicle:spawn', (data: { modelName: string }) => {
      alt.log(`[MeshHub] WebView requested to spawn vehicle: ${data.modelName}`)
      alt.emitServer('meshhub:vehicle:spawn', data.modelName)
    })

    this.webview.on('vehicle:destroy', (data: { vehicleId: number }) => {
      alt.log(`[MeshHub] WebView requested to destroy vehicle: ${data.vehicleId}`)
      alt.emitServer('meshhub:vehicle:destroy', data.vehicleId)
    })

    this.webview.on('handling:update', (data: { parameter: string; value: number }) => {
      alt.log(`[MeshHub] WebView requested handling update: ${data.parameter} = ${data.value}`)
      // Обновляем параметры локально (без сервера для live preview)
      this.updateVehicleHandling(data.parameter, data.value)
    })

    this.webview.on('installation:check', (data: { modelName: string }) => {
      alt.log(`[MeshHub] WebView requested installation check: ${data.modelName}`)
      this.checkModelInstallation(data.modelName)
    })

    // Weapon events
    this.webview.on('weapon:give', (data: { name: string; modelName: string; hash: string | number }) => {
      alt.log(`[MeshHub] WebView requested to give weapon: ${data.name}`)
      alt.emitServer('meshhub:weapon:give', data.name, data.hash)
    })

    // Логируем все события для отладки
    this.webview.on('webview:ready', () => {
      alt.log('[MeshHub] WebView is ready')
    })

    this.webview.on('webview:error', (error: string) => {
      alt.logError(`[MeshHub] WebView error: ${error}`)
    })
  }

  /**
   * Показать панель
   */
  static show(): void {
    if (!this.webview || !this.isInitialized) {
      alt.logWarning('[MeshHub] Cannot show WebView - not initialized')
      return
    }

    if (this.currentlyVisible) {
      alt.log('[MeshHub] WebView already visible')
      return
    }

    try {
      this.webview.isVisible = true
      this.currentlyVisible = true
      
      // Показываем курсор
      alt.showCursor(true)
      
      // Отключаем управление игрой
      alt.toggleGameControls(false)
      
      alt.log('[MeshHub] ✅ WebView shown')
      
      // Уведомляем WebView что панель открыта
      this.webview.emit('altv:panel:opened')
      
    } catch (error) {
      alt.logError(`[MeshHub] Failed to show WebView: ${error}`)
    }
  }

  /**
   * Скрыть панель
   */
  static hide(): void {
    if (!this.webview || !this.isInitialized) {
      alt.logWarning('[MeshHub] Cannot hide WebView - not initialized')
      return
    }

    if (!this.currentlyVisible) {
      alt.log('[MeshHub] WebView already hidden')
      return
    }

    try {
      this.webview.isVisible = false
      this.currentlyVisible = false
      
      // Скрываем курсор
      alt.showCursor(false)
      
      // Включаем управление игрой
      alt.toggleGameControls(true)
      
      alt.log('[MeshHub] ✅ WebView hidden')
      
      // Уведомляем WebView что панель закрыта
      this.webview.emit('altv:panel:closed')
      
    } catch (error) {
      alt.logError(`[MeshHub] Failed to hide WebView: ${error}`)
    }
  }

  /**
   * Переключить видимость панели
   */
  static toggle(): void {
    if (this.currentlyVisible) {
      this.hide()
    } else {
      this.show()
    }
  }

  /**
   * Проверить видимость панели
   */
  static isVisible(): boolean {
    return this.currentlyVisible
  }

  /**
   * Уничтожить WebView
   */
  static destroy(): void {
    if (this.webview) {
      try {
        this.webview.destroy()
        alt.log('[MeshHub] WebView destroyed')
      } catch (error) {
        alt.logError(`[MeshHub] Error destroying WebView: ${error}`)
      }
    }

    this.webview = null
    this.isInitialized = false
    this.currentlyVisible = false
    
    // Восстанавливаем управление игрой
    alt.showCursor(false)
    alt.toggleGameControls(true)
  }

  /**
   * Отправить событие в WebView
   */
  static emitToWebView(eventName: string, data?: any): void {
    if (!this.webview || !this.isInitialized) {
      alt.logWarning(`[MeshHub] Cannot emit ${eventName} - WebView not initialized`)
      return
    }

    try {
      this.webview.emit(eventName, data)
      alt.log(`[MeshHub] Emitted ${eventName} to WebView`)
    } catch (error) {
      alt.logError(`[MeshHub] Failed to emit ${eventName}: ${error}`)
    }
  }

  /**
   * Обновить параметры handling автомобиля (live preview)
   */
  private static updateVehicleHandling(parameter: string, value: number): void {
    const vehicle = alt.Player.local.vehicle
    
    if (!vehicle) {
      alt.logWarning('[MeshHub] No vehicle to update handling')
      this.emitToWebView('handling:applied', { 
        parameter, 
        value, 
        success: false, 
        error: 'No vehicle' 
      })
      return
    }

    try {
      // Применяем параметр через нативы
      const success = this.applyHandlingParameter(vehicle, parameter, value)
      
      // Уведомляем WebView о результате
      this.emitToWebView('handling:applied', { 
        parameter, 
        value, 
        success 
      })
      
      if (success) {
        alt.log(`[MeshHub] ✅ Applied handling: ${parameter} = ${value}`)
      } else {
        alt.logWarning(`[MeshHub] ❌ Failed to apply handling: ${parameter}`)
      }
      
    } catch (error) {
      alt.logError(`[MeshHub] Error updating handling: ${error}`)
      this.emitToWebView('handling:applied', { 
        parameter, 
        value, 
        success: false, 
        error: error.toString() 
      })
    }
  }

  /**
   * Применить конкретный параметр handling
   */
  private static applyHandlingParameter(vehicle: alt.Vehicle, parameter: string, value: number): boolean {
    try {
      const vehId = vehicle.scriptID
      
      switch (parameter) {
        // Физические параметры
        case 'fMass':
          native.setVehicleHandlingFloat(vehId, 'CHandlingData', 'fMass', value)
          return true
        case 'fInitialDragCoeff':
          native.setVehicleHandlingFloat(vehId, 'CHandlingData', 'fInitialDragCoeff', value)
          return true
        case 'fPercentSubmerged':
          native.setVehicleHandlingFloat(vehId, 'CHandlingData', 'fPercentSubmerged', value)
          return true
          
        // Трансмиссия
        case 'fDriveBiasFront':
          native.setVehicleHandlingFloat(vehId, 'CHandlingData', 'fDriveBiasFront', value)
          return true
        case 'nInitialDriveGears':
          native.setVehicleHandlingInt(vehId, 'CHandlingData', 'nInitialDriveGears', Math.floor(value))
          return true
        case 'fInitialDriveForce':
          native.setVehicleHandlingFloat(vehId, 'CHandlingData', 'fInitialDriveForce', value)
          return true
        case 'fBrakeForce':
          native.setVehicleHandlingFloat(vehId, 'CHandlingData', 'fBrakeForce', value)
          return true
        case 'fSteeringLock':
          native.setVehicleHandlingFloat(vehId, 'CHandlingData', 'fSteeringLock', value)
          return true
          
        // Тяга колес
        case 'fTractionCurveMax':
          native.setVehicleHandlingFloat(vehId, 'CHandlingData', 'fTractionCurveMax', value)
          return true
        case 'fTractionCurveMin':
          native.setVehicleHandlingFloat(vehId, 'CHandlingData', 'fTractionCurveMin', value)
          return true
          
        // Подвеска
        case 'fSuspensionForce':
          native.setVehicleHandlingFloat(vehId, 'CHandlingData', 'fSuspensionForce', value)
          return true
        case 'fSuspensionCompDamp':
          native.setVehicleHandlingFloat(vehId, 'CHandlingData', 'fSuspensionCompDamp', value)
          return true
          
        // Добавим больше параметров по мере необходимости...
        
        default:
          alt.logWarning(`[MeshHub] Unknown handling parameter: ${parameter}`)
          return false
      }
    } catch (error: any) {
      alt.logError(`[MeshHub] Error applying handling parameter ${parameter}: ${error}`)
      return false
    }
  }

  /**
   * Проверить установку модели
   */
  private static checkModelInstallation(modelName: string): void {
    try {
      const modelHash = alt.hash(modelName)
      const isValid = native.isModelValid(modelHash)
      
      alt.log(`[MeshHub] Model ${modelName} (${modelHash}): ${isValid ? 'installed' : 'not installed'}`)
      
      this.emitToWebView('installation:checked', {
        modelName,
        isInstalled: isValid
      })
      
    } catch (error) {
      alt.logError(`[MeshHub] Error checking model installation: ${error}`)
      this.emitToWebView('installation:checked', {
        modelName,
        isInstalled: false
      })
    }
  }
}
