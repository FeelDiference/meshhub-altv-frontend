// Страница авторизации

import React from 'react'
import { motion } from 'framer-motion'
import { LoginForm } from '@/components/auth/LoginForm'

interface LoginPageProps {
  onSuccess?: () => void
}

export function LoginPage({ onSuccess }: LoginPageProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Фоновые эффекты */}
      <div className="absolute inset-0 bg-gradient-to-br from-base-900 via-base-800 to-base-900" />
      
      {/* Анимированные световые эффекты */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute -top-40 -left-40 w-80 h-80 bg-primary-500/5 rounded-full blur-3xl"
        />
        
        <motion.div
          animate={{
            x: [0, -80, 0],
            y: [0, 60, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute -bottom-40 -right-40 w-96 h-96 bg-primary-400/3 rounded-full blur-3xl"
        />
      </div>

      {/* Контент */}
      <div className="relative z-10 w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <LoginForm onSuccess={onSuccess} />
        </motion.div>

        {/* Информация о WebView */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.4 }}
          className="mt-8 text-center"
        >
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-base-800/50 rounded-lg border border-base-700/50">
            <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
            <span className="text-xs text-gray-400">
              ALT:V WebView Panel | 400px × 1080px
            </span>
          </div>
        </motion.div>

        {/* Клавиши управления */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.4 }}
          className="mt-4 text-center"
        >
          <div className="text-xs text-gray-500 space-y-1">
            <div>/meshhub - открыть панель</div>
            <div>ESC - закрыть панель</div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
