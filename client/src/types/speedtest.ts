/**
 * TypeScript типы для Speed Test Track
 */

/**
 * Времена прохождения участков
 */
export interface SegmentTimes {
  '0-100m': number
  '100-200m': number
  '200-300m': number
  '300-400m': number
  '400-500m': number
  total: number
  [key: string]: number // Для динамических ключей
}

/**
 * Скорость на участке
 */
export interface SegmentSpeed {
  avg: number // Средняя скорость
  max: number // Максимальная скорость
}

/**
 * Скорости на участках
 */
export interface SegmentSpeeds {
  '0-100m': SegmentSpeed
  '100-200m': SegmentSpeed
  '200-300m': SegmentSpeed
  '300-400m': SegmentSpeed
  '400-500m': SegmentSpeed
  [key: string]: SegmentSpeed // Для динамических ключей
}

/**
 * Времена разгона (может быть null если не успели разогнаться)
 */
export interface AccelerationTimes {
  '0-100': number | null
  '0-200': number | null
  '100-200': number | null
  '200-300': number | null
  '300-400': number | null
}

/**
 * Результат замера
 */
export interface SpeedTestResult {
  id: string
  timestamp: string
  vehicleModel: string
  segments: SegmentTimes
  speeds?: SegmentSpeeds // Скорости на участках (опционально для обратной совместимости)
  acceleration: AccelerationTimes
  checkpointTimestamps?: number[] // Абсолютные времена прохождения чекпоинтов
}

/**
 * Состояние замера
 */
export interface SpeedTestState {
  active: boolean // Замер активен
  currentCheckpoint?: number // Текущий чекпоинт (индекс)
  totalCheckpoints?: number // Всего чекпоинтов
  lastSegmentTime?: number // Время последнего сегмента
  reset?: boolean // Флаг сброса
}

/**
 * Статистика пользователя
 */
export interface SpeedTestStats {
  totalRuns: number
  bestTime: number | null
  averageTime: number | null
  vehicles: string[]
}

/**
 * Ответ с историей
 */
export interface SpeedTestHistoryResponse {
  success: boolean
  history: SpeedTestResult[]
  error?: string
}

/**
 * Ответ с сохранением результата
 */
export interface SpeedTestSaveResponse {
  success: boolean
  result?: SpeedTestResult
  error?: string
}

/**
 * Ответ со статистикой
 */
export interface SpeedTestStatsResponse {
  success: boolean
  stats?: SpeedTestStats
  error?: string
}

