/**
 * Утилита для парсинга координат из строки в различных форматах
 */

import type { Vec3 } from '@/types/world'

/**
 * Парсит строку координат в формате "x, y, z" в объект Vec3
 * Поддерживает гибкие форматы:
 * - "192.23, 11.33, 33.22" (запятая + пробел)
 * - "192.23,11.33,33.22" (только запятая)
 * - "192.23 11.33 33.22" (только пробелы)
 * - "192.23; 11.33; 33.22" (точка с запятой)
 * - Комбинации вышеперечисленного
 * 
 * @param coordsString - Строка с координатами
 * @returns Vec3 объект или null при ошибке парсинга
 */
export function parseCoordinates(coordsString: string): Vec3 | null {
  if (!coordsString || typeof coordsString !== 'string') {
    return null
  }

  try {
    // Нормализуем строку: заменяем все разделители на пробелы
    const normalized = coordsString
      .replace(/,/g, ' ')      // Запятые → пробелы
      .replace(/;/g, ' ')      // Точки с запятой → пробелы
      .replace(/\s+/g, ' ')    // Множественные пробелы → один пробел
      .trim()

    // Разбиваем по пробелам
    const parts = normalized.split(' ').filter(part => part.length > 0)

    // Должно быть ровно 3 числа
    if (parts.length !== 3) {
      console.warn(`[parseCoordinates] Expected 3 coordinates, got ${parts.length}`)
      return null
    }

    // Парсим числа
    const x = parseFloat(parts[0])
    const y = parseFloat(parts[1])
    const z = parseFloat(parts[2])

    // Валидация: все должны быть валидными числами
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
      console.warn(`[parseCoordinates] Invalid numeric values:`, { x, y, z })
      return null
    }

    return { x, y, z }
  } catch (error) {
    console.error(`[parseCoordinates] Error parsing coordinates:`, error)
    return null
  }
}

/**
 * Форматирует Vec3 координаты в строку формата "x, y, z"
 * @param coords - Координаты
 * @param precision - Количество знаков после запятой (по умолчанию 2)
 * @returns Строка в формате "192.23, 11.33, 33.22"
 */
export function formatCoordinates(coords: Vec3, precision: number = 2): string {
  return `${coords.x.toFixed(precision)}, ${coords.y.toFixed(precision)}, ${coords.z.toFixed(precision)}`
}

/**
 * Валидация координат - проверяет, что все значения в разумных пределах GTA V
 * @param coords - Координаты для проверки
 * @returns true если координаты валидны
 */
export function isValidGTACoordinates(coords: Vec3): boolean {
  // GTA V мир имеет примерные границы от -4000 до +4000 по X/Y
  // Z может быть от -500 до +1500 (с учетом высоты)
  const isInBounds = (value: number, min: number, max: number) => {
    return Number.isFinite(value) && value >= min && value <= max
  }

  return (
    isInBounds(coords.x, -5000, 5000) &&
    isInBounds(coords.y, -5000, 5000) &&
    isInBounds(coords.z, -1000, 2000)
  )
}

