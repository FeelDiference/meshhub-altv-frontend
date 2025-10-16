// Типы для авторизации

export interface User {
  id: string
  username: string
  email: string
  department: string
  position: string
  avatar: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  success: boolean
  token: string
  user: User
}

export interface SessionData {
  userId: string
  token: string
  expiresAt: number
}

export interface AuthState {
  isAuthenticated: boolean
  user: User | null
  token: string | null
  isLoading: boolean
  error: string | null
}
