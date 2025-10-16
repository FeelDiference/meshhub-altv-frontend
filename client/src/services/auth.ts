// Простая и логичная система авторизации

import axios, { AxiosResponse } from 'axios'
import type { User, LoginRequest, LoginResponse, SessionData } from '@/types/auth'
import { SessionCrypto } from '@/utils/crypto'
import { mockLogin, checkBackendAvailability } from './auth-mock'
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
      } else if (error.response?.status >= 500) {
        throw new Error('Ошибка сервера. Попробуйте позже.')
      } else {
        throw new Error('Ошибка подключения к серверу')
      }
    }
    
  } else {
    // DEMO авторизация 
    console.log('🎭 Demo режим - используем mock авторизацию')
    
    try {
      const mockResponse = await mockLogin(credentials)
      console.log('🎭 Mock response:', mockResponse)
      
      const sessionData: SessionData = {
        userId: mockResponse.user.id,
        token: mockResponse.token,
        expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 часа
      }

      saveSession(sessionData)
      saveUser(mockResponse.user)
      
      window.dispatchEvent(new CustomEvent('auth:mock-fallback'))
      return mockResponse
      
    } catch (mockError: any) {
      throw new Error(mockError.message)
    }
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
    console.log('🎭 Demo режим - токен не нуждается в обновлении')
    return // В demo режиме токены не истекают
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
 * СОХРАНЕНИЕ СЕССИИ (зашифрованно)
 */
function saveSession(sessionData: SessionData): void {
  try {
    const encryptedData = SessionCrypto.encrypt(JSON.stringify(sessionData))
    localStorage.setItem('auth_session', encryptedData)
  } catch (error) {
    console.error('Failed to save session:', error)
  }
}

/**
 * ПОЛУЧЕНИЕ СЕССИИ (расшифровка)
 */
function getSession(): SessionData | null {
  try {
    const encryptedData = localStorage.getItem('auth_session')
    if (!encryptedData) return null

    const decryptedData = SessionCrypto.decrypt(encryptedData)
    return JSON.parse(decryptedData)
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
  localStorage.removeItem('auth_session')
  localStorage.removeItem('auth_user')
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
    const userData = localStorage.getItem('auth_user')
    return userData ? JSON.parse(userData) : null
  } catch (error) {
    console.error('Failed to get user:', error)
    return null
  }
}

console.log('🔐 Auth service loaded - simple & clean version')