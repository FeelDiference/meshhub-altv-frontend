/**
 * Утилиты форматирования результатов Speed Test
 */

import type { SpeedTestResult } from '@/types/speedtest'

/**
 * Форматирует время в формат MM:SS.MS
 * @param seconds - Время в секундах
 * @returns Отформатированная строка
 */
export function formatTime(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) {
    return 'N/A'
  }
  
  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 1000)
  
  if (minutes > 0) {
    return `${minutes}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`
  }
  
  return `${secs}.${ms.toString().padStart(3, '0')}s`
}

/**
 * Форматирует время в компактный формат (без миллисекунд)
 * @param seconds - Время в секундах
 * @returns Отформатированная строка
 */
export function formatTimeShort(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) {
    return 'N/A'
  }
  
  return `${seconds.toFixed(2)}s`
}

/**
 * Форматирует дату и время
 * @param timestamp - ISO строка времени
 * @returns Отформатированная строка
 */
export function formatDateTime(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleString('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

/**
 * Форматирует результат для копирования в буфер обмена
 * @param result - Результат замера
 * @returns Текстовое представление
 */
export function formatSpeedTestResult(result: SpeedTestResult): string {
  const lines: string[] = []
  
  lines.push('═══════════════════════════════════════════════════')
  lines.push('              SPEED TEST RESULT                    ')
  lines.push('═══════════════════════════════════════════════════')
  lines.push('')
  
  lines.push(`Vehicle:   ${result.vehicleModel}`)
  lines.push(`Date:      ${formatDateTime(result.timestamp)}`)
  lines.push('')
  
  lines.push('───────────────────────────────────────────────────')
  lines.push('              SEGMENT TIMES & SPEEDS               ')
  lines.push('───────────────────────────────────────────────────')
  
  const segments = result.segments
  const speeds = result.speeds
  
  const segmentKeys = ['0-100m', '100-200m', '200-300m', '300-400m', '400-500m']
  
  segmentKeys.forEach(key => {
    if (segments && segments[key] !== undefined) {
      const timeStr = formatTimeShort(segments[key]).padEnd(10)
      let speedStr = ''
      
      if (speeds && speeds[key]) {
        const avgSpeed = speeds[key].avg?.toFixed(1) || 'N/A'
        const maxSpeed = speeds[key].max?.toFixed(1) || 'N/A'
        speedStr = `avg: ${avgSpeed} km/h, max: ${maxSpeed} km/h`
      }
      
      lines.push(`${key.padEnd(12)} ${timeStr}  ${speedStr}`)
    }
  })
  
  lines.push('')
  lines.push(`TOTAL TIME:    ${formatTimeShort(segments.total)}`)
  
  lines.push('')
  lines.push('───────────────────────────────────────────────────')
  lines.push('              ACCELERATION                         ')
  lines.push('───────────────────────────────────────────────────')
  
  const accel = result.acceleration
  if (accel) {
    lines.push(`0-100 km/h:    ${formatTimeShort(accel['0-100'])}`)
    lines.push(`0-200 km/h:    ${formatTimeShort(accel['0-200'])}`)
    lines.push(`100-200 km/h:  ${formatTimeShort(accel['100-200'])}`)
    lines.push(`200-300 km/h:  ${formatTimeShort(accel['200-300'])}`)
    lines.push(`300-400 km/h:  ${formatTimeShort(accel['300-400'])}`)
  }
  
  lines.push('')
  lines.push('═══════════════════════════════════════════════════')
  
  return lines.join('\n')
}

/**
 * Копирует текст в буфер обмена
 * @param text - Текст для копирования
 * @returns Promise<boolean> - Успешность операции
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    } else {
      // Fallback для старых браузеров
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      const success = document.execCommand('copy')
      document.body.removeChild(textarea)
      return success
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    return false
  }
}

/**
 * Форматирует результат в компактном виде (одна строка)
 * @param result - Результат замера
 * @returns Компактная строка
 */
export function formatResultCompact(result: SpeedTestResult): string {
  const time = result.segments?.total ? formatTimeShort(result.segments.total) : 'N/A'
  const accel = result.acceleration?.['0-100'] ? formatTimeShort(result.acceleration['0-100']) : 'N/A'
  return `${result.vehicleModel} | Total: ${time} | 0-100: ${accel}`
}

/**
 * Сравнивает два результата и возвращает разницу
 * @param current - Текущий результат
 * @param best - Лучший результат
 * @returns Строка с разницей ('+1.23s' или '-0.45s')
 */
export function compareTimes(current: number | null, best: number | null): string {
  if (current === null || best === null) {
    return ''
  }
  
  const diff = current - best
  if (diff === 0) {
    return '±0.00s'
  } else if (diff > 0) {
    return `+${diff.toFixed(2)}s`
  } else {
    return `${diff.toFixed(2)}s`
  }
}

/**
 * Получает emoji индикатор результата (🥇🥈🥉)
 * @param position - Позиция в топе (1-3)
 * @returns Emoji
 */
export function getMedalEmoji(position: number): string {
  switch (position) {
    case 1: return '🥇'
    case 2: return '🥈'
    case 3: return '🥉'
    default: return ''
  }
}

