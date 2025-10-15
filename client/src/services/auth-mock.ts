// Mock версия авторизации для демонстрации (когда backend недоступен)

import type { User, LoginRequest, LoginResponse } from '@/types/auth'

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
  if (!credentials.username.endsWith('@1win.pro')) {
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
      username: credentials.username,
      email: credentials.username,
    }
  }
}

/**
 * Проверить доступность настоящего backend
 */
export async function checkBackendAvailability(): Promise<boolean> {
  try {
    const response = await fetch('https://hub.feeld.space/health', {
      method: 'GET',
      timeout: 5000,
    } as any)
    return response.ok
  } catch {
    return false
  }
}
