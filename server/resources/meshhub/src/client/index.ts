// Основной client скрипт для MeshHub ALT:V Integration

import * as alt from 'alt-client'
import * as native from 'natives'
import { WebViewManager } from './webview-manager'
import { VehicleController } from './vehicle-controller'
import { InteriorController } from './interior-controller'

/**
 * Инициализация ресурса
 */
alt.on('connectionComplete', () => {
  alt.log('[MeshHub] Client connected, initializing...')
  
  // Инициализируем WebView Manager
  WebViewManager.initialize()
  
  // Инициализируем Vehicle Controller
  VehicleController.initialize()
  
  // Инициализируем Interior Controller
  InteriorController.initialize()
  
  alt.log('[MeshHub] ✅ Client initialization complete')
})

/**
 * Обработка команды открытия панели с сервера
 */
alt.onServer('meshhub:open', () => {
  alt.log('[MeshHub] Received open command from server')
  WebViewManager.show()
})

/**
 * Обработка команды закрытия панели с сервера
 */
alt.onServer('meshhub:close', () => {
  alt.log('[MeshHub] Received close command from server')
  WebViewManager.hide()
})

/**
 * Обработка нажатий клавиш
 */
alt.on('keydown', (key: number) => {
  // F10 - открыть/закрыть панель
  if (key === 0x79) { // F10 key code
    alt.log('[MeshHub] F10 pressed, toggling panel')
    WebViewManager.toggle()
  }
  
  // ESC - закрыть панель если открыта
  if (key === 0x1B) { // ESC key code
    if (WebViewManager.isVisible()) {
      alt.log('[MeshHub] ESC pressed, closing panel')
      WebViewManager.hide()
    }
  }
})

/**
 * Обработка отключения от сервера
 */
alt.on('disconnect', () => {
  alt.log('[MeshHub] Disconnecting, cleaning up...')
  
  // Закрываем WebView
  WebViewManager.destroy()
  
  // Очищаем Vehicle Controller
  VehicleController.cleanup()
  
  // Очищаем Interior Controller
  InteriorController.cleanup()
})

/**
 * Обработка ошибок
 */
alt.on('error', (error: Error) => {
  alt.logError(`[MeshHub] Client error: ${error.message}`)
  alt.logError(error.stack || 'No stack trace available')
})

// Логируем информацию о загрузке
alt.log('[MeshHub] 🚀 Client script loaded')
alt.log('[MeshHub] Version: 1.0.0')
alt.log('[MeshHub] Press F10 to open MeshHub panel')
alt.log('[MeshHub] Press ESC to close panel')
