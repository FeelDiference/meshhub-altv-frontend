// Компонент формы авторизации

import React, { useState, FormEvent, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LogIn, Mail, Lock, AlertCircle, Wifi, WifiOff, Loader2 } from 'lucide-react'
import { Input } from '@/components/common/Input'
import { Button } from '@/components/common/Button'
import { useAuth } from '@/hooks/useAuth'
import { useBackendStatus } from '@/hooks/useBackendStatus'
import type { LoginRequest } from '@/types/auth'

interface LoginFormProps {
  onSuccess?: () => void
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const { login, isLoading, error, clearError } = useAuth()
  const { status, isConnected, isMock, isChecking } = useBackendStatus()
  
  const [formData, setFormData] = useState<LoginRequest>({
    username: '',
    password: '',
  })
  
  const [formErrors, setFormErrors] = useState<{
    username?: string
    password?: string
  }>({})

  const [loginState, setLoginState] = useState<'idle' | 'success' | 'error'>('idle')

  // Очищаем ошибки при изменении полей
  useEffect(() => {
    if (error) {
      clearError()
    }
    setFormErrors({})
    setLoginState('idle')
  }, [formData.username, formData.password, clearError])

  // Валидация формы
  const validateForm = (): boolean => {
    const errors: typeof formErrors = {}

    if (!formData.username.trim()) {
      errors.username = 'Email не может быть пустым'
    } else if (!formData.username.includes('@')) {
      errors.username = 'Некорректный формат email'
    } else if (!formData.username.endsWith('@1win.pro')) {
      errors.username = 'Email должен быть в формате user@1win.pro'
    }

    if (!formData.password.trim()) {
      errors.password = 'Пароль не может быть пустым'
    } else if (formData.password.length < 6) {
      errors.password = 'Пароль должен содержать минимум 6 символов'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Обработчик отправки формы
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      setLoginState('error')
      setTimeout(() => setLoginState('idle'), 400)
      return
    }

    try {
      await login(formData)
      setLoginState('success')
      
      // Вызываем callback успеха через небольшую задержку для анимации
      setTimeout(() => {
        onSuccess?.()
      }, 500)
      
    } catch (error) {
      setLoginState('error')
      setTimeout(() => setLoginState('idle'), 400)
    }
  }

  // Обработчик изменения полей
  const handleChange = (field: keyof LoginRequest) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value,
    }))
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ 
          opacity: 1, 
          y: 0,
          scale: loginState === 'success' ? 0.95 : 1,
        }}
        transition={{ duration: 0.3 }}
        className="card-glass p-6 rounded-xl"
      >
        {/* Заголовок */}
        <div className="text-center mb-6">
          <motion.div
            animate={{ 
              rotate: loginState === 'success' ? 360 : 0,
              scale: loginState === 'error' ? 1.1 : 1,
            }}
            transition={{ duration: 0.3 }}
            className="w-12 h-12 mx-auto mb-4 bg-primary-600 rounded-lg flex items-center justify-center"
          >
            <LogIn className="w-6 h-6 text-white" />
          </motion.div>
          
          <h1 className="text-xl font-bold text-white mb-2">
            MeshHub ALT:V
          </h1>
          <p className="text-gray-400 text-sm">
            Вход в систему управления автомобилями
          </p>
        </div>

        {/* Форма */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            label="Email"
            placeholder="user@1win.pro"
            value={formData.username}
            onChange={handleChange('username')}
            error={formErrors.username}
            icon={<Mail className="w-4 h-4" />}
            disabled={isLoading}
            autoComplete="email"
          />

          <Input
            type="password"
            label="Пароль"
            placeholder="••••••••"
            value={formData.password}
            onChange={handleChange('password')}
            error={formErrors.password}
            icon={<Lock className="w-4 h-4" />}
            disabled={isLoading}
            autoComplete="current-password"
          />

          {/* Глобальная ошибка */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center space-x-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg"
              >
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <p className="text-red-400 text-sm">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Кнопка входа */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={isLoading}
            className="w-full"
            icon={!isLoading ? <LogIn className="w-4 h-4" /> : undefined}
          >
            {isLoading ? 'Вход...' : 'Войти'}
          </Button>
        </form>

        {/* Дополнительная информация */}
        <div className="mt-6 pt-4 border-t border-base-700">
          <p className="text-xs text-gray-500 text-center">
            Используйте корпоративный email для доступа к системе
          </p>
        </div>
      </motion.div>

      {/* Индикатор состояния подключения */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-4 text-center"
      >
        <div className="inline-flex items-center space-x-2 text-xs text-gray-500">
          {isChecking && (
            <>
              <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
              <span>Проверка подключения...</span>
            </>
          )}
          {isConnected && (
            <>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>Подключено к hub.feeld.space</span>
            </>
          )}
          {isMock && (
            <>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <span>Demo режим (Mock авторизация)</span>
            </>
          )}
          {status === 'error' && (
            <>
              <div className="w-2 h-2 bg-red-500 rounded-full" />
              <span>Ошибка подключения</span>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}
