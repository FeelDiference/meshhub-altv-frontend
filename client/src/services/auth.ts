// Сервис авторизации с интеграцией в MeshHub Backend

import axios, { AxiosResponse } from 'axios'
import { API_CONFIG, ERROR_CODES } from '@/config/api'
import type { User, LoginRequest, LoginResponse, SessionData } from '@/types/auth'
import { SessionCrypto } from '@/utils/crypto'
import { mockLogin, checkBackendAvailability } from './auth-mock'

// Ключи для localStorage
const STORAGE_KEYS = {
  SESSION: 'meshhub_altv_session',
  USER: 'meshhub_altv_user',
} as const

// Создаем экземпляр axios с базовой конфигурацией
const apiClient = axios.create({
  baseURL: API_CONFIG.baseUrl,
  timeout: API_CONFIG.timeouts.default,
  headers: API_CONFIG.defaultHeaders,
})

// Интерцептор для добавления токена к запросам
apiClient.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Интерцептор для обработки ответов
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Токен истек, попробуем обновить
      try {
        await refreshToken()
        // Повторяем оригинальный запрос
        return apiClient.request(error.config)
      } catch (refreshError) {
        // Refresh не удался, очищаем сессию
        clearSession()
        // Можно dispatch event для уведомления UI о разлогине
        window.dispatchEvent(new CustomEvent('auth:logout'))
        throw error
      }
    }
    throw error
  }
)

/**
 * Авторизация пользователя
 */
export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  // Сначала пытаемся реальную авторизацию через backend (с proxy в dev)
  try {
    console.log('🔄 Попытка авторизации через MeshHub Backend...')
    
    const response: AxiosResponse<LoginResponse> = await apiClient.post(
      API_CONFIG.endpoints.login,
      credentials
    )

    console.log('✅ Успешная авторизация через backend')
    
    const { token, user } = response.data

    // Создаем данные сессии
    const sessionData: SessionData = {
      userId: user.id,
      token,
      expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 часа по умолчанию
    }

    // Сохраняем зашифрованную сессию
    saveSession(sessionData)
    saveUser(user)

    // Уведомляем о успешном подключении к backend
    window.dispatchEvent(new CustomEvent('auth:backend-success'))

    return response.data
    
  } catch (error: any) {
    console.log('❌ Ошибка авторизации через backend:', error.message)
    
    // Если backend недоступен, используем mock в dev режиме
    if (import.meta.env.DEV && (
      error.code === 'ERR_NETWORK' || 
      error.code === 'ECONNABORTED' ||
      error.response?.status >= 500
    )) {
      console.log('🎭 Backend недоступен, переключаемся на mock авторизацию')
      
      try {
        const mockResponse = await mockLogin(credentials)
        
        // Создаем данные сессии
        const sessionData: SessionData = {
          userId: mockResponse.user.id,
          token: mockResponse.token,
          expiresAt: Date.now() + (24 * 60 * 60 * 1000),
        }

        // Сохраняем зашифрованную сессию
        saveSession(sessionData)
        saveUser(mockResponse.user)

        // Уведомляем о переключении на mock
        window.dispatchEvent(new CustomEvent('auth:mock-fallback'))

        return mockResponse
      } catch (mockError: any) {
        throw new Error(mockError.message)
      }
    }
    
    // Обработка других ошибок
    if (error.response?.status === 401) {
      throw new Error('Неверный логин или пароль')
    } else if (error.response?.status === 429) {
      throw new Error('Слишком много попыток входа. Попробуйте через минуту')
    } else if (error.code === 'ECONNABORTED') {
      throw new Error('Превышено время ожидания. Проверьте интернет-соединение')
    } else {
      throw new Error(error.response?.data?.message || 'Ошибка при входе в систему')
    }
  }
}

/**
 * Обновление токена
 */
export async function refreshToken(): Promise<void> {
  try {
    const response: AxiosResponse<{ access_token: string; user: User }> = await apiClient.post(
      API_CONFIG.endpoints.refresh
    )

    const { access_token, user } = response.data

    // Обновляем сессию
    const sessionData: SessionData = {
      userId: user.id,
      token: access_token,
      expiresAt: Date.now() + (24 * 60 * 60 * 1000),
    }

    saveSession(sessionData)
    saveUser(user)
  } catch (error) {
    console.error('Token refresh failed:', error)
    throw error
  }
}

/**
 * Выход из системы
 */
export async function logout(): Promise<void> {
  try {
    // Отправляем запрос на logout (опционально)
    await apiClient.post(API_CONFIG.endpoints.logout)
  } catch (error) {
    console.error('Logout request failed:', error)
    // Продолжаем очистку локальных данных даже если запрос не удался
  } finally {
    clearSession()
    window.dispatchEvent(new CustomEvent('auth:logout'))
  }
}

/**
 * Получить токен доступа
 */
export function getAccessToken(): string | null {
  const session = getSession()
  return session?.token || null
}

/**
 * Получить данные пользователя
 */
export function getUser(): User | null {
  try {
    const encryptedUser = localStorage.getItem(STORAGE_KEYS.USER)
    if (!encryptedUser) return null

    const user = SessionCrypto.decrypt(encryptedUser)
    return user as User
  } catch (error) {
    console.error('Failed to decrypt user data:', error)
    return null
  }
}

/**
 * Проверить авторизацию
 */
export function isAuthenticated(): boolean {
  const session = getSession()
  if (!session) return false

  // Проверяем срок действия токена
  if (Date.now() > session.expiresAt) {
    clearSession()
    return false
  }

  return true
}

/**
 * Проверить права пользователя
 */
export function hasPermission(permission: string): boolean {
  const user = getUser()
  if (!user) return false

  // Супер админ имеет все права
  if (user.department === 'IT' && user.position === 'Admin') {
    return true
  }

  // Проверяем конкретные права (если будут добавлены в типы)
  return false
}

/**
 * Сохранить сессию (зашифрованно)
 */
function saveSession(sessionData: SessionData): void {
  try {
    const encrypted = SessionCrypto.encrypt(sessionData)
    localStorage.setItem(STORAGE_KEYS.SESSION, encrypted)
  } catch (error) {
    console.error('Failed to save session:', error)
    throw new Error('Ошибка сохранения сессии')
  }
}

/**
 * Получить сессию
 */
function getSession(): SessionData | null {
  try {
    const encryptedSession = localStorage.getItem(STORAGE_KEYS.SESSION)
    if (!encryptedSession) return null

    const session = SessionCrypto.decrypt(encryptedSession)
    return session as SessionData
  } catch (error) {
    console.error('Failed to decrypt session:', error)
    // Очищаем поврежденную сессию
    localStorage.removeItem(STORAGE_KEYS.SESSION)
    return null
  }
}

/**
 * Сохранить данные пользователя (зашифрованно)
 */
function saveUser(user: User): void {
  try {
    const encrypted = SessionCrypto.encrypt(user)
    localStorage.setItem(STORAGE_KEYS.USER, encrypted)
  } catch (error) {
    console.error('Failed to save user data:', error)
    throw new Error('Ошибка сохранения данных пользователя')
  }
}

/**
 * Очистить сессию
 */
function clearSession(): void {
  localStorage.removeItem(STORAGE_KEYS.SESSION)
  localStorage.removeItem(STORAGE_KEYS.USER)
}

/**
 * Проверить email на соответствие формату
 */
export function validateEmail(email: string): { isValid: boolean; error?: string } {
  if (!email) {
    return { isValid: false, error: 'Email не может быть пустым' }
  }

  if (!email.includes('@')) {
    return { isValid: false, error: 'Некорректный формат email' }
  }

  // Проверяем домен согласно основному проекту
  if (!email.endsWith('@1win.pro')) {
    return { isValid: false, error: 'Email должен быть в формате user@1win.pro' }
  }

  return { isValid: true }
}

/**
 * Автоматическая проверка и обновление токена при загрузке
 */
export function initializeAuth(): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      if (!isAuthenticated()) {
        resolve(false)
        return
      }

      // Если токен скоро истечет (< 1 часа), обновляем его
      const session = getSession()
      if (session && (session.expiresAt - Date.now()) < (60 * 60 * 1000)) {
        refreshToken()
          .then(() => resolve(true))
          .catch(() => {
            clearSession()
            resolve(false)
          })
      } else {
        resolve(true)
      }
    } catch (error) {
      console.error('Auth initialization failed:', error)
      clearSession()
      resolve(false)
    }
  })
}
