// Типы для меню приложения

import type React from 'react'

export interface MenuItem {
  id: string
  label: string
  icon: React.ComponentType<any>
  component: React.ComponentType
  enabled: boolean
  order: number
}


