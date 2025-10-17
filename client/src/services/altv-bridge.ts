// Мост для коммуникации с ALT:V

import type { ALTVBridge, ALTVState } from '@/types/altv'
import type { ALTVEventHandler } from '@/types/altv'

/**
 * Реализация моста для ALT:V интеграции
 */
class ALTVBridgeImpl implements ALTVBridge {
  private eventHandlers: Map<string, Set<ALTVEventHandler>> = new Map()
  private state: ALTVState = {
    isConnected: false,
    currentVehicle: null,
    isWebViewVisible: false,
  }

  constructor() {
    this.initialize()
  }

  /**
   * Инициализация моста
   */
  private initialize(): void {
    // Проверяем доступность ALT:V
    if (this.isAvailable()) {
      console.log('[ALTVBridge] 🚀 ALT:V detected, initializing bridge...')
      this.setupALTVEventHandlers()
      this.state.isConnected = true
    } else {
      console.log('[ALTVBridge] 🌐 Running in browser mode (no ALT:V)')
      this.setupMockHandlers()
    }
  }

  /**
   * Настройка обработчиков событий ALT:V
   */
  private setupALTVEventHandlers(): void {
    if (!this.isAvailable()) return

    const alt = (window as any).alt

    // События от ALT:V Client → WebView
    alt.on('altv:panel:opened', () => {
      this.state.isWebViewVisible = true
      this.emitToSubscribers('panel:opened')
    })

    alt.on('altv:panel:closed', () => {
      this.state.isWebViewVisible = false
      this.emitToSubscribers('panel:closed')
    })

    alt.on('vehicle:spawned', (data: { vehicleId: number; modelName: string; position: any }) => {
      this.state.currentVehicle = {
        id: data.vehicleId,
        modelName: data.modelName,
        position: data.position,
        spawnedAt: Date.now(),
      }
      this.emitToSubscribers('vehicle:spawned', data)
    })

    alt.on('vehicle:destroyed', (data: { vehicleId: number }) => {
      if (this.state.currentVehicle?.id === data.vehicleId) {
        this.state.currentVehicle = null
      }
      this.emitToSubscribers('vehicle:destroyed', data)
    })

    alt.on('handling:applied', (data: { parameter: string; value: number; success: boolean }) => {
      this.emitToSubscribers('handling:applied', data)
    })

    alt.on('installation:checked', (data: { modelName: string; isInstalled: boolean }) => {
      this.emitToSubscribers('installation:checked', data)
    })

    alt.on('meshhub:vehicle:handling:meta:response', (data: { modelName: string; xml: string; success: boolean }) => {
      console.log('[ALTVBridge] 📥 Received handling meta response:', data.modelName, data.success)
      console.log('[ALTVBridge] 📦 XML length:', data?.xml?.length || 0)
      console.log('[ALTVBridge] 🔍 Data object:', data)
      if (data.success && data.xml) {
        console.log('[ALTVBridge] ✅ Emitting to subscribers: meshhub:vehicle:handling:meta:response')
        this.emitToSubscribers('meshhub:vehicle:handling:meta:response', { modelName: data.modelName, xml: data.xml })
        console.log('[ALTVBridge] ✅ Event emitted to subscribers')
      } else {
        console.warn('[ALTVBridge] ⚠️  Handling meta not valid or failed:', data)
      }
    })

    alt.on('player:entered:vehicle', (data: { vehicleId: number; modelName: string }) => {
      // обновим текущий автомобиль для состояния
      if (data?.vehicleId && data?.modelName) {
        this.state.currentVehicle = {
          id: data.vehicleId,
          modelName: data.modelName,
          position: { x: 0, y: 0, z: 0 },
          spawnedAt: Date.now(),
        }
      }
      this.emitToSubscribers('player:entered:vehicle', data)
    })

    alt.on('player:left:vehicle', (data: { vehicleId: number }) => {
      this.state.currentVehicle = null
      this.emitToSubscribers('player:left:vehicle', data)
    })

    // Handling meta XML response from client script
    alt.on('handling:meta:response', (data: { modelName: string; xml: string }) => {
      this.emitToSubscribers('handling:meta:response', data)
    })

    console.log('[ALTVBridge] ✅ ALT:V event handlers registered')
  }

  /**
   * Настройка mock обработчиков для браузера
   */
  private setupMockHandlers(): void {
    // В браузере создаем mock объект для эмуляции ALT:V
    ;(window as any).alt = {
      emit: (eventName: string, data?: any) => {
        console.log(`[ALTVBridge] Mock emit: ${eventName}`, data)
        this.handleMockEvent(eventName, data)
      },
      on: (eventName: string, _handler: Function) => {
        console.log(`[ALTVBridge] Mock listener registered: ${eventName}`)
      },
    }

    console.log('[ALTVBridge] ✅ Mock handlers setup for browser mode')
  }

  /**
   * Обработка mock событий для тестирования в браузере
   */
  private handleMockEvent(eventName: string, data?: any): void {
    switch (eventName) {
      case 'vehicle:spawn':
        // Эмулируем успешный спавн через 1 секунду
        setTimeout(() => {
          const mockData = {
            vehicleId: Math.floor(Math.random() * 1000),
            modelName: data?.modelName || 'adder',
            position: { x: 100, y: 200, z: 30 },
          }
          this.state.currentVehicle = {
            id: mockData.vehicleId,
            modelName: mockData.modelName,
            position: mockData.position,
            spawnedAt: Date.now(),
          }
          this.emitToSubscribers('vehicle:spawned', mockData)
        }, 1000)
        break

      case 'vehicle:destroy':
        // Эмулируем уничтожение
        setTimeout(() => {
          const vehicleId = this.state.currentVehicle?.id || 0
          this.state.currentVehicle = null
          this.emitToSubscribers('vehicle:destroyed', { vehicleId })
        }, 500)
        break

      case 'handling:update':
        // Эмулируем применение параметров
        setTimeout(() => {
          this.emitToSubscribers('handling:applied', {
            parameter: data?.parameter,
            value: data?.value,
            success: true,
          })
        }, 100)
        break

      case 'installation:check':
        // Эмулируем проверку установки
        setTimeout(() => {
          this.emitToSubscribers('installation:checked', {
            modelName: data?.modelName,
            isInstalled: Math.random() > 0.3, // 70% установлены
          })
        }, 500)
        break

      case 'handling:meta:request':
        // Возвращаем мок XML
        setTimeout(() => {
          const xml = '<?xml version="1.0"?><HandlingData>\n  <item>...</item>\n</HandlingData>'
          this.emitToSubscribers('handling:meta:response', {
            modelName: data?.modelName || 'unknown',
            xml,
          })
        }, 200)
        break
    }
  }

  /**
   * Отправить событие в ALT:V
   */
  emit<K extends keyof import('@/types/altv').WebViewToClientEvents>(
    event: K,
    data: import('@/types/altv').WebViewToClientEvents[K]
  ): void {
    if (!this.isAvailable()) {
      console.log(`[ALTVBridge] Mock emit: ${String(event)}`, data)
      // В mock режиме обрабатываем событие локально
      this.handleMockEvent(String(event), data)
      return
    }

    try {
      const alt = (window as any).alt
      alt.emit(String(event), data)
      console.log(`[ALTVBridge] ✅ Emitted ${String(event)} to ALT:V`, data)
    } catch (error) {
      console.error(`[ALTVBridge] ❌ Failed to emit ${String(event)}:`, error)
    }
  }

  /**
   * Подписаться на событие от ALT:V
   */
  on<K extends keyof import('@/types/altv').ClientToWebViewEvents>(
    event: K,
    handler: ALTVEventHandler<import('@/types/altv').ClientToWebViewEvents[K]>
  ): void {
    const eventName = String(event)
    
    if (!this.eventHandlers.has(eventName)) {
      this.eventHandlers.set(eventName, new Set())
    }
    
    this.eventHandlers.get(eventName)!.add(handler)
    console.log(`[ALTVBridge] ✅ Subscribed to ${eventName}`)
  }

  /**
   * Отписаться от события
   */
  off<K extends keyof import('@/types/altv').ClientToWebViewEvents>(
    event: K,
    handler: ALTVEventHandler<import('@/types/altv').ClientToWebViewEvents[K]>
  ): void {
    const eventName = String(event)
    const handlers = this.eventHandlers.get(eventName)
    
    if (handlers) {
      handlers.delete(handler)
      console.log(`[ALTVBridge] ✅ Unsubscribed from ${eventName}`)
    }
  }

  /**
   * Проверить доступность ALT:V
   */
  isAvailable(): boolean {
    return typeof window !== 'undefined' && 'alt' in window && window.location.hostname !== 'localhost'
  }

  /**
   * Получить текущее состояние
   */
  getState(): ALTVState {
    return { ...this.state }
  }

  /**
   * Внутренний метод для эмиссии событий подписчикам
   */
  private emitToSubscribers(eventName: string, data?: any): void {
    const handlers = this.eventHandlers.get(eventName)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data)
        } catch (error) {
          console.error(`[ALTVBridge] Error in event handler for ${eventName}:`, error)
        }
      })
    }
  }
}

// Создаем глобальный экземпляр моста
export const altvBridge = new ALTVBridgeImpl()

// Экспортируем для использования в компонентах
export default altvBridge

// Вспомогательные функции для удобства
export const isALTVAvailable = () => altvBridge.isAvailable()
export const getALTVState = () => altvBridge.getState()

// Логируем состояние при загрузке
console.log('[ALTVBridge] 🚀 Bridge initialized')
console.log('[ALTVBridge] ALT:V available:', altvBridge.isAvailable())
console.log('[ALTVBridge] Initial state:', altvBridge.getState())
