/**
 * Hook для отслеживания онлайн статуса пользователя
 * Отправляет heartbeat на backend каждую минуту для индикации активности
 */

import { useEffect, useRef } from 'react'
import { getAccessToken } from '@/services/auth'
import { API_CONFIG } from '@/config/api'

const HEARTBEAT_INTERVAL = 60000 // 1 минута (60 секунд)

/**
 * Отправка heartbeat на backend
 */
async function sendHeartbeat(): Promise<boolean> {
  try {
    const token = getAccessToken()
    
    if (!token) {
      console.warn('[OnlineStatus] No access token, skipping heartbeat')
      return false
    }
    
    const url = `${API_CONFIG.baseUrl}/api/users/heartbeat`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
    
    if (response.ok) {
      const data = await response.json()
      console.debug('[OnlineStatus] Heartbeat sent successfully:', data.message)
      return true
    } else {
      console.warn('[OnlineStatus] Heartbeat failed:', response.status, response.statusText)
      return false
    }
  } catch (error) {
    console.error('[OnlineStatus] Error sending heartbeat:', error)
    return false
  }
}

/**
 * Hook для автоматической отправки heartbeat
 * Работает только если пользователь авторизован
 */
export function useOnlineStatus() {
  const intervalRef = useRef<number | null>(null)
  const isActiveRef = useRef(false)
  
  useEffect(() => {
    console.log('[OnlineStatus] Hook mounted')
    
    // Проверяем что пользователь авторизован
    const token = getAccessToken()
    if (!token) {
      console.log('[OnlineStatus] User not authenticated, heartbeat disabled')
      return
    }
    
    console.log('[OnlineStatus] Starting heartbeat service (interval: 60s)')
    isActiveRef.current = true
    
    // Отправляем первый heartbeat сразу
    sendHeartbeat()
    
    // Устанавливаем интервал для периодической отправки
    intervalRef.current = window.setInterval(() => {
      if (isActiveRef.current) {
        sendHeartbeat()
      }
    }, HEARTBEAT_INTERVAL)
    
    // Cleanup при unmount
    return () => {
      console.log('[OnlineStatus] Hook unmounted, stopping heartbeat')
      isActiveRef.current = false
      
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, []) // Пустой массив зависимостей - запускаем только при mount
  
  // Дополнительно: отслеживаем изменение auth статуса
  useEffect(() => {
    const handleAuthChange = () => {
      const token = getAccessToken()
      
      if (!token && isActiveRef.current) {
        // Пользователь разлогинился - останавливаем heartbeat
        console.log('[OnlineStatus] User logged out, stopping heartbeat')
        isActiveRef.current = false
        
        if (intervalRef.current !== null) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      } else if (token && !isActiveRef.current) {
        // Пользователь залогинился - запускаем heartbeat
        console.log('[OnlineStatus] User logged in, starting heartbeat')
        isActiveRef.current = true
        
        sendHeartbeat()
        
        intervalRef.current = window.setInterval(() => {
          if (isActiveRef.current) {
            sendHeartbeat()
          }
        }, HEARTBEAT_INTERVAL)
      }
    }
    
    // Слушаем события авторизации
    window.addEventListener('auth:backend-success', handleAuthChange)
    window.addEventListener('auth:restored', handleAuthChange)
    window.addEventListener('auth:logout', handleAuthChange)
    
    return () => {
      window.removeEventListener('auth:backend-success', handleAuthChange)
      window.removeEventListener('auth:restored', handleAuthChange)
      window.removeEventListener('auth:logout', handleAuthChange)
    }
  }, [])
}

export default useOnlineStatus

