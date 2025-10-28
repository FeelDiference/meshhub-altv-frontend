// Простой React hook для авторизации

import { useState, useEffect, useCallback } from 'react'
import * as authService from '@/services/auth'
import { getSession } from '@/services/auth'
import type { User, LoginRequest } from '@/types/auth'

interface UseAuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

export function useAuth() {
  const [state, setState] = useState<UseAuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  })

  // Инициализация авторизации при загрузке
  useEffect(() => {
    console.log('🔐 Инициализация авторизации...')
    
    const checkAuth = () => {
      try {
        // Проверяем сохраненную сессию
        const isAuthed = authService.isAuthenticated()
        const user = isAuthed ? authService.getUser() : null

        console.log('🔍 Init check: isAuthed =', isAuthed, 'user =', user)
        console.log('🔍 Auth service session:', getSession())
        console.log('🔍 LocalStorage session:', localStorage.getItem('auth_session'))
        console.log('🔍 LocalStorage user:', localStorage.getItem('auth_user'))

        setState(prev => {
          console.log('🔍 setState in init: prev.isAuthenticated =', prev.isAuthenticated, '-> new:', isAuthed)
          return {
            user,
            isAuthenticated: isAuthed,
            isLoading: false,
            error: null,
          }
        })

        console.log(`🔐 Авторизация ${isAuthed ? 'восстановлена' : 'не найдена'}`)
        
      } catch (error) {
        console.error('❌ Ошибка инициализации авторизации:', error)
        setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: 'Ошибка инициализации авторизации',
        })
      }
    }

    // Обработчик восстановления сессии из Alt:V
    const handleAuthRestored = () => {
      console.log('🔄 Auth restored event received, rechecking auth...')
      setTimeout(() => {
        checkAuth()
      }, 100) // Небольшая задержка для обновления данных
    }

    // Слушаем событие восстановления сессии
    window.addEventListener('auth:restored', handleAuthRestored)

    checkAuth()

    return () => {
      window.removeEventListener('auth:restored', handleAuthRestored)
    }
  }, [])

  // Слушаем события авторизации
  useEffect(() => {
    const handleLogout = () => {
      console.log('🔐 Обработка события logout')
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      })
    }

    const handleBackendSuccess = () => {
      console.log('🔐 Backend авторизация успешна')
    }

    window.addEventListener('auth:logout', handleLogout)
    window.addEventListener('auth:backend-success', handleBackendSuccess)
    
    return () => {
      window.removeEventListener('auth:logout', handleLogout)
      window.removeEventListener('auth:backend-success', handleBackendSuccess)
    }
  }, [])

  // Простая валидация email
  const validateEmail = (email: string): { isValid: boolean; error?: string } => {
    if (!email || email.trim().length === 0) {
      return { isValid: false, error: 'Email не может быть пустым' }
    }
    
    if (!email.includes('@')) {
      return { isValid: false, error: 'Email должен содержать @' }
    }
    
    return { isValid: true }
  }

  // Функция входа
  const login = useCallback(async (credentials: LoginRequest): Promise<void> => {
    console.log('🔐 Начинаем логин...')
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      // Валидация email
      const emailValidation = validateEmail(credentials.email)
      if (!emailValidation.isValid) {
        throw new Error(emailValidation.error)
      }

      const response = await authService.login(credentials)
      
      setState({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      })

      console.log('✅ Логин успешен')
      console.log('🔐 User set:', response.user)
      console.log('🔐 State updated: isAuthenticated =', true)
      
      // FiveM: НЕ перезагружаем страницу (это сбрасывает localStorage в NUI)
      // React автоматически обновит UI через setState
      console.log('✅ Auth state updated, React will re-render automatically')
      
    } catch (error: any) {
      console.error('❌ Ошибка логина:', error.message)
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Ошибка входа в систему',
      }))
      throw error
    }
  }, [])

  // Функция выхода - ПРОСТАЯ И ПОНЯТНАЯ
  const logout = useCallback(async (): Promise<void> => {
    console.log('🔐 Начинаем logout...')

    try {
      // Вызываем logout функцию
      await authService.logout()
      
      // Сразу обновляем состояние (событие тоже сработает, но это не страшно)
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      })
      
      console.log('✅ Logout успешен, перенаправление на логин')
      
    } catch (error: any) {
      console.error('❌ Ошибка logout (но продолжаем):', error)
      
      // Все равно очищаем состояние локально
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      })
    }
  }, [])

  // Функция обновления токена (вызывается вручную)
  const refreshToken = useCallback(async (): Promise<void> => {
    console.log('🔐 Обновляем токен...')
    
    try {
      await authService.refreshToken()
      const user = authService.getUser()
      
      setState(prev => ({
        ...prev,
        user,
        isAuthenticated: !!user,
        error: null,
      }))

      console.log('✅ Токен обновлен')
      
    } catch (error: any) {
      console.error('❌ Ошибка refresh токена:', error)
      
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: 'Сессия истекла',
      })
    }
  }, [])

  // Очистка ошибки
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  // Проверка на админа
  const isAdmin = useCallback((): boolean => {
    return state.user?.department === 'IT' && state.user?.position === 'Admin'
  }, [state.user])

  return {
    // Состояние
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    error: state.error,

    // Действия
    login,
    logout,
    refreshToken,
    clearError,

    // Проверки
    isAdmin,

    // Вычисляемые свойства
    userDisplayName: state.user ? `${state.user.username}` : null,
    userDepartment: state.user?.department || null,
    userPosition: state.user?.position || null,
  }
}