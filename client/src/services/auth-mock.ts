// Mock версия авторизации для демонстрации (когда backend недоступен)

import type { User, LoginRequest, LoginResponse } from '@/types/auth'
import { API_CONFIG } from '@/config/api'

// Mock пользователь для демонстрации
const MOCK_USER: User = {
  id: 'demo-user-123',
  username: 'demo@1win.pro',
  email: 'demo@1win.pro',
  department: 'IT',
  position: 'Developer',
  avatar: '',
}

// Mock токен
const MOCK_TOKEN = 'mock-jwt-token-for-demo-purposes'

/**
 * Mock версия логина
 */
export async function mockLogin(credentials: LoginRequest): Promise<LoginResponse> {
  // Симуляция задержки сети
  await new Promise(resolve => setTimeout(resolve, 1000))

  // Простая валидация
  if (!credentials.email.endsWith('@1win.pro')) {
    throw new Error('Email должен быть в формате user@1win.pro')
  }

  if (credentials.password.length < 6) {
    throw new Error('Пароль должен содержать минимум 6 символов')
  }

  // Симуляция случайной ошибки (10% вероятность)
  if (Math.random() < 0.1) {
    throw new Error('Временная ошибка сервера. Попробуйте еще раз')
  }

  return {
    success: true,
    token: MOCK_TOKEN,
    user: {
      ...MOCK_USER,
      username: credentials.email,
      email: credentials.email,
    }
  }
}

/**
 * Проверить доступность настоящего backend
 */
export async function checkBackendAvailability(): Promise<boolean> {
  try {
    // Пытаемся подключиться к локальному backend (теперь с CORS поддержкой)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000)
    
    // Используем единую конфигурацию API
    const healthUrl = `${API_CONFIG.baseUrl}/healthz`
    console.log('🌐 Проверка backend на', healthUrl)
    
    const response = await fetch(healthUrl, {
      method: 'GET',
      signal: controller.signal,
      // Добавляем заголовки для CORS
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    clearTimeout(timeoutId)
    
    if (response.ok) {
      console.log('✅ Backend доступен - используем реальную авторизацию')
      return true
    } else {
      console.log('❌ Backend вернул ошибку:', response.status, response.statusText)
      return false
    }
  } catch (error: any) {
    console.log('🔧 Backend недоступен:', error.message, '- используем mock')
    return false
  }
}
