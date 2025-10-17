// Типы для ALT:V интеграции

// Тип для автомобилей ALT:V
export interface ALTVVehicle {
  name: string
  displayName: string
  category: 'gta' | 'local' | 'meshhub'
  hash: string
  isLocal?: boolean
  isMeshHub?: boolean
  // Дополнительные свойства для совместимости с UI
  id?: string
  modelName?: string
  size?: number
  tags?: string[]
  isStreaming?: boolean
}

// События WebView → Client
export interface WebViewToClientEvents {
  'vehicle:spawn': { modelName: string }
  'vehicle:destroy': { vehicleId: number }
  'installation:check': { modelName: string }
  'handling:update': { parameter: string; value: number }
  'handling:meta:request': { modelName: string; vehicleCategory?: 'gtav' | 'local' | 'meshhub' }
  'handling:reset': void
  'panel:close': void
}

// События Client → WebView
export interface ClientToWebViewEvents {
  'panel:opened': undefined
  'panel:closed': undefined
  'vehicle:spawned': { vehicleId: number; modelName: string; position: Vec3 }
  'vehicle:destroyed': { vehicleId: number }
  'installation:checked': { modelName: string; isInstalled: boolean }
  'handling:applied': { parameter: string; value: number; success: boolean; error?: string }
  'player:entered:vehicle': { vehicleId: number; modelName: string }
  'player:left:vehicle': { vehicleId: number }
  'handling:meta:response': { modelName: string; xml: string }
  'meshhub:vehicle:handling:meta:response': { modelName: string; xml: string }
  'meshhub:vehicle:local:list:response': ALTVVehicle[]
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
  
  // Получение текущего состояния
  getState(): ALTVState
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
