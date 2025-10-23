// Простая и логичная система авторизации

import axios, { AxiosResponse } from 'axios'
import type { User, LoginRequest, LoginResponse, SessionData } from '@/types/auth'
import { SessionCrypto } from '@/utils/crypto'
import { checkBackendAvailability } from './auth-mock'
import { API_CONFIG } from '@/config/api'

// Типы для ответа от backend
interface BackendLoginResponse {
  access_token: string
  expires_in: number
  user: {
    id: string
    email: string
    first_name: string
    last_name: string
    is_admin: boolean
    is_super_admin?: boolean
    [key: string]: any
  }
}

// Создаем отдельный axios клиент без interceptor'ов для auth запросов
const authClient = axios.create({
  baseURL: API_CONFIG.baseUrl,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Создаем основной клиент с простым interceptor'ом
const apiClient = axios.create({
  baseURL: API_CONFIG.baseUrl,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ПРОСТОЙ interceptor - только добавляет токен, без автоматического refresh
apiClient.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Экспортируем клиенты для использования в других местах
export { apiClient, authClient }

/**
 * АВТОРИЗАЦИЯ
 */
export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  console.log('🚪 Начинаем авторизацию...')

  // Проверяем доступность backend'а
  const backendAvailable = await checkBackendAvailability()
  
  if (backendAvailable) {
    // РЕАЛЬНАЯ авторизация через backend
    console.log('📡 Авторизация через MeshHub Backend...')
    
    try {
      const response: AxiosResponse<BackendLoginResponse> = await authClient.post(
        API_CONFIG.endpoints.login,
        credentials
      )

      console.log('✅ Успешная авторизация через backend')
      console.log('📋 Response data:', response.data)
      
      const { access_token, user: backendUser } = response.data
      
      // Адаптируем структуру пользователя под frontend типы
      const user = {
        id: backendUser.id,
        username: backendUser.email, // Используем email как username
        email: backendUser.email,
        department: 'IT', // Временно устанавливаем значения по умолчанию
        position: backendUser.is_super_admin ? 'Super Admin' : backendUser.is_admin ? 'Admin' : 'User',
        avatar: '',
      }
      
      const sessionData: SessionData = {
        userId: user.id,
        token: access_token,
        expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 часа
      }

      saveSession(sessionData)
      saveUser(user)

      // Сохраняем токен в ALT:V LocalStorage для использования серверной частью
      console.log('💾 Checking window.alt availability...')
      console.log('💾 window object exists:', !!window)
      console.log('💾 window.alt exists:', !!(window as any).alt)
      console.log('💾 window.alt type:', typeof (window as any).alt)
      console.log('💾 window.alt object:', (window as any).alt)

      // Пробуем отправить событие даже если window.alt существует
      if ((window as any).alt) {
        console.log('💾 Attempting to save session to ALT:V LocalStorage...')
        console.log('💾 Token to save:', access_token.substring(0, 20) + '...')
        console.log('💾 User data:', user)
        console.log('💾 Expires at:', new Date(sessionData.expiresAt))

        try {
          // Проверяем структуру window.alt
          const altObj = (window as any).alt
          console.log('💾 ALT object methods:', Object.getOwnPropertyNames(altObj))

          if (altObj.emit) {
            altObj.emit('auth:save-token', {
              token: access_token,
              user: user,
              expiresAt: sessionData.expiresAt
            })
            console.log('💾 Event auth:save-token emitted to ALT:V')
          } else {
            console.log('💾 No emit method on alt object')
          }
        } catch (error) {
          console.error('💾 Error emitting auth:save-token event:', error)
        }
      } else {
        console.log('⚠️ window.alt not available - cannot save token to ALT:V')
        console.log('⚠️ Available window properties:', Object.keys(window))
      }

      window.dispatchEvent(new CustomEvent('auth:backend-success'))
      // Возвращаем адаптированный ответ
      return {
        success: true,
        token: access_token,
        user: user,
      }
      
    } catch (error: any) {
      console.error('❌ Backend авторизация не удалась:', error.message)
      
      if (error.response?.status === 401) {
        throw new Error('Неверные учетные данные')
      } else if (error.response?.status === 403) {
        throw new Error('Доступ запрещен')
      } else if (error.response?.status >= 500) {
        throw new Error('Ошибка сервера. Попробуйте позже.')
      } else if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK') {
        throw new Error('Сервер недоступен. Проверьте подключение.')
      } else {
        throw new Error('Ошибка подключения к серверу')
      }
    }
    
  } else {
    // Backend недоступен - отклоняем авторизацию
    throw new Error('Сервер недоступен. Авторизация невозможна.')
  }
}

/**
 * ОБНОВЛЕНИЕ ТОКЕНА (только по требованию)
 */
export async function refreshToken(): Promise<void> {
  console.log('🔄 Обновление токена...')

  // Проверяем есть ли вообще сессия
  const session = getSession()
  if (!session) {
    throw new Error('No session to refresh')
  }

  // Проверяем доступность backend'а
  const backendAvailable = await checkBackendAvailability()
  
  if (!backendAvailable) {
    throw new Error('Сервер недоступен. Невозможно обновить токен.')
  }

  try {
    const response = await authClient.post(API_CONFIG.endpoints.refresh, {
      refreshToken: session.token // Используем существующий токен как refresh
    })

    const { token, user } = response.data
    const sessionData: SessionData = {
      userId: user.id,
      token,
      expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 часа
    }

    saveSession(sessionData)
    saveUser(user)
    
    console.log('✅ Токен обновлен')
    
  } catch (error) {
    console.error('❌ Refresh токена не удался:', error)
    // При ошибке refresh - разлогиниваем пользователя
    await logout()
    throw error
  }
}

/**
 * ВЫХОД ИЗ СИСТЕМЫ (простой и понятный)
 */
export async function logout(): Promise<void> {
  console.log('🚪 Выход из системы...')

  // JWT токены stateless - logout работает только на клиенте
  // Нет необходимости обращаться к серверу
  console.log('🗑️ Очищаем локальные данные авторизации...')

  // ВСЕГДА очищаем локальные данные
  clearSession()
  window.dispatchEvent(new CustomEvent('auth:logout'))
  
  console.log('✅ Logout завершен')
}

/**
 * ПРОВЕРКА ВАЛИДНОСТИ ТОКЕНА
 */
export function isTokenValid(): boolean {
  const session = getSession()
  if (!session) return false
  
  // Всегда проверяем срок действия токена
  
  // В реальном режиме проверяем срок действия
  return session.expiresAt > Date.now()
}

/**
 * ПОЛУЧИТЬ ТОКЕН ДОСТУПА
 */
export function getAccessToken(): string | null {
  const session = getSession()
  return session && isTokenValid() ? session.token : null
}

/**
 * ПРОВЕРКА АВТОРИЗАЦИИ
 */
export function isAuthenticated(): boolean {
  const session = getSession()
  const user = getUser()
  return !!(session && user && isTokenValid())
}

/**
 * Проверка окружения ALT:V
 */
function isAltVEnvironment(): boolean {
  return typeof (window as any).alt !== 'undefined'
}

/**
 * СОХРАНЕНИЕ СЕССИИ (зашифрованно)
 */
function saveSession(sessionData: SessionData): void {
  try {
    if (isAltVEnvironment()) {
      // В ALT:V - сохраняем через клиентскую часть
      console.log('💾 Saving session via ALT:V LocalStorage...')
      console.log('💾 Token to save:', sessionData.token.substring(0, 20) + '...')
      console.log('💾 User data:', getUser())
      console.log('💾 Expires at:', new Date(sessionData.expiresAt))

      ;(window as any).alt.emit('auth:save-token', {
        token: sessionData.token,
        user: getUser(),
        expiresAt: sessionData.expiresAt
      })
      console.log('💾 Event auth:save-token emitted to ALT:V')
    } else {
      // В браузере - fallback к localStorage
      console.log('💾 ALT:V not available, using localStorage fallback')
      const encryptedData = SessionCrypto.encrypt(JSON.stringify(sessionData))
      localStorage.setItem('auth_session', encryptedData)
    }
  } catch (error) {
    console.error('Failed to save session:', error)
  }
}

/**
 * ПОЛУЧЕНИЕ СЕССИИ (расшифровка)
 */
function getSession(): SessionData | null {
  try {
    if (isAltVEnvironment()) {
      // В ALT:V - сессия будет восстановлена через событие
      // Используем временное хранилище или запрашиваем у клиента
      console.log('🔍 Checking for ALT:V session...')

      // Пробуем получить из временного хранилища (устанавливается событием восстановления)
      const tempSession = (window as any).__altv_temp_session
      if (tempSession) {
        console.log('✅ Found temp session:', tempSession)
        return tempSession
      }

      // Если нет временной сессии, запрашиваем у ALT:V клиента
      console.log('🔍 No temp session, requesting from ALT:V...')
      ;(window as any).alt.emit('auth:request-token')

      // Возвращаем null, сессия будет восстановлена через событие
      return null
    } else {
      // В браузере - из localStorage
      console.log('💻 Browser environment, using localStorage')
      const encryptedData = localStorage.getItem('auth_session')
      if (!encryptedData) return null

      const decryptedData = SessionCrypto.decrypt(encryptedData)
      return JSON.parse(decryptedData)
    }
  } catch (error) {
    console.error('Failed to get session:', error)
    return null
  }
}

/**
 * ЭКСПОРТ ФУНКЦИИ ПОЛУЧЕНИЯ СЕССИИ ДЛЯ ОТЛАДКИ
 */
export { getSession }

/**
 * ОЧИСТКА СЕССИИ
 */
function clearSession(): void {
  if (isAltVEnvironment()) {
    console.log('🗑️ Clearing session via ALT:V...')
    ;(window as any).alt.emit('auth:logout')
  } else {
    console.log('🗑️ Clearing localStorage session...')
    localStorage.removeItem('auth_session')
    localStorage.removeItem('auth_user')
  }
}

/**
 * СОХРАНЕНИЕ ПОЛЬЗОВАТЕЛЯ
 */
function saveUser(user: User): void {
  try {
    localStorage.setItem('auth_user', JSON.stringify(user))
  } catch (error) {
    console.error('Failed to save user:', error)
  }
}

/**
 * ПОЛУЧЕНИЕ ПОЛЬЗОВАТЕЛЯ
 */
export function getUser(): User | null {
  try {
    if (isAltVEnvironment()) {
      // В ALT:V пользователь может быть в temp storage или запрошен у клиента
      const tempSession = (window as any).__altv_temp_session
      if (tempSession && tempSession.user) {
        return tempSession.user
      }

      // Запрашиваем у клиента
      ;(window as any).alt.emit('auth:request-token')
      return null
    } else {
      // В браузере - из localStorage
      const userData = localStorage.getItem('auth_user')
      return userData ? JSON.parse(userData) : null
    }
  } catch (error) {
    console.error('Failed to get user:', error)
    return null
  }
}

/**
 * НАСТРОЙКА ОБРАБОТЧИКОВ СОБЫТИЙ ДЛЯ ALT:V
 */
export function setupAltVAuthHandlers(): void {
  if (!isAltVEnvironment()) return

  console.log('🎮 Setting up ALT:V auth event handlers...')

  // Обработчик восстановления сессии
  ;(window as any).alt.on('auth:restore-session', (data: any) => {
    console.log('✅ Restoring session from ALT:V LocalStorage:', data)

    // Сохраняем во временное хранилище для getSession()
    ;(window as any).__altv_temp_session = {
      userId: data.user?.id,
      token: data.token,
      expiresAt: data.expiresAt,
      user: data.user // Добавляем пользователя в temp session
    }

    // Сохраняем пользователя в localStorage (для быстрого доступа)
    if (data.user) {
      localStorage.setItem('auth_user', JSON.stringify(data.user))
    }

    console.log('🔄 Temp session set:', (window as any).__altv_temp_session)

    // Триггерим событие для обновления UI
    window.dispatchEvent(new CustomEvent('auth:restored'))
  })

  // Обработчик отсутствия сессии
  ;(window as any).alt.on('auth:no-session', () => {
    console.log('ℹ️ No stored session in ALT:V LocalStorage')
    ;(window as any).__altv_temp_session = null
  })

  // Запрашиваем токен при инициализации
  console.log('🔐 Requesting stored token from ALT:V...')
  ;(window as any).alt.emit('auth:request-token')
}

console.log('🔐 Auth service loaded - simple & clean version')