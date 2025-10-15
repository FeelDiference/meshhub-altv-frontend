// Типы для ALT:V интеграции

// События WebView → Client
export interface WebViewToClientEvents {
  'vehicle:spawn': { modelName: string }
  'vehicle:destroy': { vehicleId: number }
  'installation:check': { modelName: string }
  'handling:update': { parameter: string; value: number }
  'panel:close': void
}

// События Client → WebView
export interface ClientToWebViewEvents {
  'vehicle:spawned': { vehicleId: number; modelName: string; position: Vec3 }
  'vehicle:destroyed': { vehicleId: number }
  'installation:checked': { modelName: string; isInstalled: boolean }
  'handling:applied': { parameter: string; value: number; success: boolean }
}

// События Server → Client
export interface ServerToClientEvents {
  'meshhub:open': void
  'meshhub:close': void
}

// События Client → Server
export interface ClientToServerEvents {
  'meshhub:log': { level: 'info' | 'warn' | 'error'; message: string; data?: any }
}

export interface Vec3 {
  x: number
  y: number
  z: number
}

// Состояние ALT:V интеграции
export interface ALTVState {
  isConnected: boolean
  currentVehicle: SpawnedVehicle | null
  isWebViewVisible: boolean
}

export interface SpawnedVehicle {
  id: number
  modelName: string
  position: Vec3
  spawnedAt: number
}

// Типы для обработчиков событий
export type ALTVEventHandler<T = any> = (data: T) => void

// Интерфейс для ALT:V моста
export interface ALTVBridge {
  // Отправка событий в ALT:V
  emit<K extends keyof WebViewToClientEvents>(
    event: K,
    data: WebViewToClientEvents[K]
  ): void
  
  // Подписка на события от ALT:V
  on<K extends keyof ClientToWebViewEvents>(
    event: K,
    handler: ALTVEventHandler<ClientToWebViewEvents[K]>
  ): void
  
  // Отписка от событий
  off<K extends keyof ClientToWebViewEvents>(
    event: K,
    handler: ALTVEventHandler<ClientToWebViewEvents[K]>
  ): void
  
  // Проверка доступности ALT:V
  isAvailable(): boolean
}

// Конфигурация ALT:V
export interface ALTVConfig {
  // URL для разработки (когда не в ALT:V)
  devServerUrl: string
  
  // Таймауты
  timeouts: {
    spawn: number
    handlingUpdate: number
    installationCheck: number
  }
  
  // Дебаг режим
  debug: boolean
}
