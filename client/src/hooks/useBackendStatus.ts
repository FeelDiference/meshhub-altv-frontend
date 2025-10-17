// Hook для отслеживания статуса подключения к backend

import { useState, useEffect } from 'react'
import { API_CONFIG } from '@/config/api'

export type BackendStatus = 'checking' | 'connected' | 'mock' | 'error'

export function useBackendStatus() {
  const [status, setStatus] = useState<BackendStatus>('checking')
  const [lastCheck, setLastCheck] = useState<Date | null>(null)

  const checkBackendStatus = async (): Promise<BackendStatus> => {
    try {
      // Проверяем доступность через прямой запрос к backend
      const response = await fetch(`${API_CONFIG.baseUrl}/healthz`, {
        method: 'GET',
        timeout: 3000,
      } as any)
      
      if (response.ok) {
        return 'connected'
      } else {
        return 'mock'
      }
    } catch (error) {
      // В dev режиме при ошибке сети переключаемся на mock
      if (process.env.NODE_ENV === 'development') {
        return 'mock'
      }
      return 'error'
    }
  }

  const refreshStatus = async () => {
    const newStatus = await checkBackendStatus()
    setStatus(newStatus)
    setLastCheck(new Date())
  }

  useEffect(() => {
    // Проверяем статус при монтировании
    refreshStatus()

    // Проверяем статус периодически (каждые 30 секунд)
    const interval = setInterval(refreshStatus, 30000)

    return () => clearInterval(interval)
  }, [])

  // Слушаем события авторизации для обновления статуса
  useEffect(() => {
    const handleAuthSuccess = () => {
      setStatus('connected')
      setLastCheck(new Date())
    }

    const handleAuthMock = () => {
      setStatus('mock')
      setLastCheck(new Date())
    }

    window.addEventListener('auth:backend-success', handleAuthSuccess)
    window.addEventListener('auth:mock-fallback', handleAuthMock)

    return () => {
      window.removeEventListener('auth:backend-success', handleAuthSuccess)
      window.removeEventListener('auth:mock-fallback', handleAuthMock)
    }
  }, [])

  return {
    status,
    lastCheck,
    refreshStatus,
    isConnected: status === 'connected',
    isMock: status === 'mock',  
    isChecking: status === 'checking',
    isError: status === 'error',
  }
}
