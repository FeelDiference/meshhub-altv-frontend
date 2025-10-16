// Утилиты для определения пути приложения

export interface AppPathInfo {
  currentUrl: string
  basePath: string
  protocol: string
  host: string
  port: string
  isLocalhost: boolean
  isProduction: boolean
  environment: 'development' | 'production' | 'altv'
}

/**
 * Определяет информацию о пути приложения
 */
export function detectAppPath(): AppPathInfo {
  const currentUrl = window.location.href
  const pathname = window.location.pathname
  const protocol = window.location.protocol
  const host = window.location.hostname
  const port = window.location.port
  
  // Определяем базовый путь (убираем trailing slash)
  const basePath = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname
  
  // Проверяем окружение
  const isLocalhost = host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.')
  const isProduction = !isLocalhost && protocol === 'https:'
  
  // Определяем тип окружения
  let environment: 'development' | 'production' | 'altv' = 'development'
  if (isProduction) {
    environment = 'production'
  } else if ((window as any).alt) {
    environment = 'altv'
  }
  
  return {
    currentUrl,
    basePath,
    protocol,
    host,
    port,
    isLocalhost,
    isProduction,
    environment
  }
}

/**
 * Получает путь к ресурсам приложения
 */
export function getAppResourcePath(resource: string = ''): string {
  const pathInfo = detectAppPath()
  const basePath = pathInfo.basePath || ''
  return `${basePath}${resource}`
}

/**
 * Логирует информацию о пути (для отладки)
 */
export function logAppPathInfo(): void {
  const pathInfo = detectAppPath()
  
  console.log('📍 App Path Info:', {
    'Current URL': pathInfo.currentUrl,
    'Base Path': pathInfo.basePath,
    'Protocol': pathInfo.protocol,
    'Host': pathInfo.host,
    'Port': pathInfo.port,
    'Is Localhost': pathInfo.isLocalhost,
    'Is Production': pathInfo.isProduction,
    'Environment': pathInfo.environment,
    'ALT:V Available': !!(window as any).alt
  })
}

// Добавляем в window для глобального доступа
declare global {
  interface Window {
    appPathInfo?: AppPathInfo
    getAppResourcePath?: (resource?: string) => string
  }
}

// Инициализируем при загрузке
if (typeof window !== 'undefined') {
  window.appPathInfo = detectAppPath()
  window.getAppResourcePath = getAppResourcePath
}
