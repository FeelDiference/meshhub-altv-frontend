// Конфигурация API для MeshHub Backend

// Единый адрес сервера для всего проекта
export const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'https://hub.feeld.space'

export const API_CONFIG = {
  // Base URL для MeshHub Backend - всегда используем реальный сервер
  baseUrl: API_BASE_URL,
  
  // Endpoints
  endpoints: {
    // Авторизация
    login: '/auth/login',
    refresh: '/auth/refresh-token',
    // logout не нужен - JWT stateless, работает только на клиенте
    
    // Автомобили
    vehicles: '/api/rpf/vehicles',
    vehicle: (id: string) => `/api/rpf/vehicles/${id}`,
    vehicleDownload: (id: string) => `/api/rpf/vehicles/${id}/download`,
    vehicleMetadata: (id: string) => `/api/rpf/vehicles/${id}/metadata`,
    vehicleHandling: (id: string) => `/api/rpf/vehicles/${id}/handling`,
  },
  
  // Таймауты
  timeouts: {
    default: 30000, // 30 секунд
    download: 300000, // 5 минут для скачивания
    upload: 120000, // 2 минуты для загрузки
  },
  
  // Заголовки по умолчанию
  defaultHeaders: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  
  // Rate limiting
  rateLimits: {
    login: { requests: 5, window: 60000 }, // 5 запросов в минуту
    vehicles: { requests: 60, window: 60000 }, // 60 запросов в минуту
    download: { requests: 10, window: 60000 }, // 10 скачиваний в минуту
    handling: { requests: 30, window: 60000 }, // 30 обновлений в минуту
  }
}

// Типы для API конфигурации
export interface APIResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface APIError {
  code: string
  message: string
  details?: Record<string, any>
}

// Коды ошибок
export const ERROR_CODES = {
  // Общие ошибки
  BAD_REQUEST: 'bad_request',
  UNAUTHORIZED: 'unauthorized',
  FORBIDDEN: 'forbidden',
  NOT_FOUND: 'not_found',
  CONFLICT: 'conflict',
  VALIDATION_ERROR: 'validation_error',
  INTERNAL_ERROR: 'internal_error',
  SERVICE_UNAVAILABLE: 'service_unavailable',
  
  // Специфичные ошибки
  INVALID_CREDENTIALS: 'invalid_credentials',
  TOKEN_EXPIRED: 'token_expired',
  NO_METADATA: 'no_metadata',
  REPACK_FAILED: 'repack_failed',
  BACKUP_FAILED: 'backup_failed',
  FILE_NOT_FOUND: 'file_not_found',
  MODEL_NOT_LOADED: 'model_not_loaded',
} as const

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES]
