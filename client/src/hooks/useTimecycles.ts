/**
 * Hook для загрузки Timecycle Modifiers из GTA V
 */

import { useMemo } from 'react'
import type { TimecycleModifier } from '@/types/interior'
import { TIMECYCLES } from '@/data/timecycles'

/**
 * Получение списка всех доступных таймциклов (из статического импорта)
 */
export function useTimecycles() {
  // Конвертируем в правильный тип
  const timecycles = useMemo(() => {
    return TIMECYCLES as unknown as TimecycleModifier[]
  }, [])

  return { 
    timecycles, 
    loading: false, 
    error: null 
  }
}

/**
 * Группировка таймциклов по DLC
 */
export function groupTimecyclesByDlc(timecycles: TimecycleModifier[]) {
  const grouped = new Map<string, TimecycleModifier[]>()

  timecycles.forEach(tc => {
    const dlc = tc.DlcName || 'unknown'
    if (!grouped.has(dlc)) {
      grouped.set(dlc, [])
    }
    grouped.get(dlc)!.push(tc)
  })

  return grouped
}

/**
 * Фильтрация таймциклов по поисковому запросу
 */
export function filterTimecycles(
  timecycles: TimecycleModifier[],
  searchQuery: string
): TimecycleModifier[] {
  if (!searchQuery.trim()) return timecycles

  const query = searchQuery.toLowerCase()
  
  return timecycles.filter(tc =>
    tc.Name.toLowerCase().includes(query) ||
    tc.DlcName.toLowerCase().includes(query)
  )
}

