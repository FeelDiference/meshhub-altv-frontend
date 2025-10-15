// Базовый компонент Input

import React, { forwardRef, InputHTMLAttributes } from 'react'
import { motion } from 'framer-motion'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = '', ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-sm font-medium text-gray-300">
            {label}
          </label>
        )}
        
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              {icon}
            </div>
          )}
          
          <input
            ref={ref}
            className={`
              w-full px-4 py-2 bg-base-800 border rounded-lg
              text-white placeholder-gray-400
              focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
              transition-all duration-200
              ${icon ? 'pl-10' : ''}
              ${error 
                ? 'border-red-500 focus:ring-red-500' 
                : 'border-base-700 hover:border-base-600'
              }
              ${className}
            `}
            {...props}
          />
        </div>
        
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="text-sm text-red-400"
          >
            {error}
          </motion.p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
