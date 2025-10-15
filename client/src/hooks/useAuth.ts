// React hook для авторизации

import { useState, useEffect, useCallback } from 'react'
import * as authService from '@/services/auth'
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
    const initAuth = async () => {
      try {
        const isAuthed = await authService.initializeAuth()
        const user = isAuthed ? authService.getUser() : null

        setState({
          user,
          isAuthenticated: isAuthed,
          isLoading: false,
          error: null,
        })
      } catch (error) {
        console.error('Auth initialization error:', error)
        setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: 'Ошибка инициализации авторизации',
        })
      }
    }

    initAuth()
  }, [])

  // Слушаем события авторизации
  useEffect(() => {
    const handleLogout = () => {
      setState(prev => ({
        ...prev,
        user: null,
        isAuthenticated: false,
        error: null,
      }))
    }

    window.addEventListener('auth:logout', handleLogout)
    return () => window.removeEventListener('auth:logout', handleLogout)
  }, [])

  // Функция входа
  const login = useCallback(async (credentials: LoginRequest): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      // Валидация email
      const emailValidation = authService.validateEmail(credentials.username)
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
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Ошибка входа в систему',
      }))
      throw error
    }
  }, [])

  // Функция выхода
  const logout = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true }))

    try {
      await authService.logout()
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      })
    } catch (error: any) {
      console.error('Logout error:', error)
      // Все равно очищаем состояние
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      })
    }
  }, [])

  // Функция обновления токена
  const refreshToken = useCallback(async (): Promise<void> => {
    try {
      await authService.refreshToken()
      const user = authService.getUser()
      setState(prev => ({
        ...prev,
        user,
        isAuthenticated: !!user,
        error: null,
      }))
    } catch (error: any) {
      console.error('Token refresh error:', error)
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

  // Проверка прав доступа
  const hasPermission = useCallback((permission: string): boolean => {
    return authService.hasPermission(permission)
  }, [])

  // Проверка ролей пользователя
  const hasRole = useCallback((role: string): boolean => {
    if (!state.user) return false
    
    // Проверяем позицию/роль пользователя
    return state.user.position === role || state.user.department === role
  }, [state.user])

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
    hasPermission,
    hasRole,
    isAdmin,

    // Вычисляемые свойства
    userDisplayName: state.user ? `${state.user.username}` : null,
    userDepartment: state.user?.department || null,
    userPosition: state.user?.position || null,
  }
}
