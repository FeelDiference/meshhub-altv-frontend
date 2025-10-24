/**
 * Speed Test Panel - Панель замеров времени и разгона
 * 
 * Показывает последний результат, историю всех замеров и графики
 * Позволяет копировать результаты и сбрасывать текущий замер
 */

import { useState, useEffect } from 'react'
import { Timer, Copy, RotateCcw, TrendingUp, Clock, Zap, ChevronDown, ChevronUp, Trophy, X } from 'lucide-react'
import toast from 'react-hot-toast'
import type { SpeedTestResult, SpeedTestState, SpeedTestHistoryResponse } from '@/types/speedtest'
import { 
  formatSpeedTestResult, 
  formatTimeShort, 
  formatDateTime, 
  copyToClipboard,
  compareTimes,
  getMedalEmoji
} from '@/utils/speedTestFormat'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const SpeedTestPanel = () => {
  const [latestResult, setLatestResult] = useState<SpeedTestResult | null>(null)
  const [history, setHistory] = useState<SpeedTestResult[]>([])
  const [state, setState] = useState<SpeedTestState>({ active: false })
  const [showHistory, setShowHistory] = useState(false)
  const [showGraphs, setShowGraphs] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // ==================== СОБЫТИЯ ALT:V ====================

  useEffect(() => {
    if (typeof window !== 'undefined' && 'alt' in window && (window as any).alt) {
      const alt = (window as any).alt

      // Новый результат замера
      const handleNewResult = (result: SpeedTestResult) => {
        console.log('[SpeedTestPanel] New result:', result)
        setLatestResult(result)
        
        // Добавляем в историю
        setHistory(prev => [result, ...prev])
        
        toast.success(`Заезд завершен! Время: ${formatTimeShort(result.segments.total)}`)
      }

      // Обновление состояния (активен/неактивен)
      const handleStateUpdate = (newState: SpeedTestState) => {
        console.log('[SpeedTestPanel] State update:', newState)
        setState(newState)
        
        if (newState.active && newState.currentCheckpoint === 0) {
          toast.success('Замер начат!')
        }
        
        if (newState.reset) {
          toast.success('Замер сброшен')
        }
      }

      // История загружена
      const handleHistoryLoaded = (response: SpeedTestHistoryResponse) => {
        console.log('[SpeedTestPanel] History loaded:', response)
        if (response.success && response.history) {
          // Сортируем по timestamp (новые первыми)
          const sorted = [...response.history].sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          )
          
          setHistory(sorted)
          
          // Последний результат
          if (sorted.length > 0) {
            setLatestResult(sorted[0])
          }
        }
        setIsLoading(false)
      }

      // Результат сохранен
      const handleResultSaved = (response: any) => {
        if (response.success) {
          console.log('[SpeedTestPanel] Result saved to server')
        } else {
          console.error('[SpeedTestPanel] Failed to save result:', response.error)
        }
      }

      // Регистрируем обработчики
      alt.on('speedtest:result:new', handleNewResult)
      alt.on('speedtest:state:update', handleStateUpdate)
      alt.on('speedtest:history:loaded', handleHistoryLoaded)
      alt.on('speedtest:result:saved', handleResultSaved)

      // Запрашиваем историю при монтировании
      alt.emit('speedtest:history:request')
      
      // Таймаут на случай если сервер не ответит
      const loadingTimeout = setTimeout(() => {
        console.log('[SpeedTestPanel] Loading timeout - setting isLoading to false')
        setIsLoading(false)
      }, 2000)

      return () => {
        clearTimeout(loadingTimeout)
        alt.off?.('speedtest:result:new', handleNewResult)
        alt.off?.('speedtest:state:update', handleStateUpdate)
        alt.off?.('speedtest:history:loaded', handleHistoryLoaded)
        alt.off?.('speedtest:result:saved', handleResultSaved)
      }
    } else {
      // Браузер - демо данные
      setIsLoading(false)
    }
  }, [])

  // ==================== ОБРАБОТЧИКИ ====================

  const handleCopyResult = async () => {
    if (!latestResult) {
      toast.error('Нет результата для копирования')
      return
    }

    const text = formatSpeedTestResult(latestResult)
    const success = await copyToClipboard(text)

    if (success) {
      toast.success('Результат скопирован в буфер!')
    } else {
      toast.error('Ошибка копирования')
    }
  }

  const handleReset = () => {
    if (typeof window !== 'undefined' && 'alt' in window && (window as any).alt) {
      (window as any).alt.emit('speedtest:reset:manual')
      console.log('[SpeedTestPanel] Manual reset requested')
    }
  }

  const handleDeleteResult = (resultId: string) => {
    setHistory(prev => prev.filter(r => r.id !== resultId))
    
    if (latestResult?.id === resultId) {
      const remaining = history.filter(r => r.id !== resultId)
      setLatestResult(remaining.length > 0 ? remaining[0] : null)
    }
    
    toast.success('Результат удален')
  }

  // ==================== ГРАФИКИ ====================

  const getSegmentChartData = () => {
    if (!latestResult) return []
    
    const segments = latestResult.segments
    return [
      { name: '0-100m', time: segments['0-100m'] || 0 },
      { name: '100-200m', time: segments['100-200m'] || 0 },
      { name: '200-300m', time: segments['200-300m'] || 0 },
      { name: '300-400m', time: segments['300-400m'] || 0 },
      { name: '400-500m', time: segments['400-500m'] || 0 }
    ]
  }

  const getAccelerationChartData = () => {
    if (!latestResult) return []
    
    const accel = latestResult.acceleration
    const data = []
    
    if (accel['0-100'] !== null) data.push({ name: '0-100 км/ч', time: accel['0-100'] })
    if (accel['0-200'] !== null) data.push({ name: '0-200 км/ч', time: accel['0-200'] })
    if (accel['100-200'] !== null) data.push({ name: '100-200 км/ч', time: accel['100-200'] })
    if (accel['200-300'] !== null) data.push({ name: '200-300 км/ч', time: accel['200-300'] })
    if (accel['300-400'] !== null) data.push({ name: '300-400 км/ч', time: accel['300-400'] })
    
    return data
  }

  const getSpeedChartData = () => {
    if (!latestResult || !latestResult.speeds) return []
    
    return [
      { name: '0-100m', avg: latestResult.speeds['0-100m']?.avg || 0, max: latestResult.speeds['0-100m']?.max || 0 },
      { name: '100-200m', avg: latestResult.speeds['100-200m']?.avg || 0, max: latestResult.speeds['100-200m']?.max || 0 },
      { name: '200-300m', avg: latestResult.speeds['200-300m']?.avg || 0, max: latestResult.speeds['200-300m']?.max || 0 },
      { name: '300-400m', avg: latestResult.speeds['300-400m']?.avg || 0, max: latestResult.speeds['300-400m']?.max || 0 },
      { name: '400-500m', avg: latestResult.speeds['400-500m']?.avg || 0, max: latestResult.speeds['400-500m']?.max || 0 }
    ]
  }

  const getBestTime = () => {
    if (history.length === 0) return null
    return Math.min(...history.map(r => r.segments.total).filter(t => t != null))
  }

  // ==================== RENDER ====================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-400 flex items-center space-x-2">
          <Timer className="w-5 h-5 animate-spin" />
          <span>Загрузка...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Кнопка сброса (всегда видна) */}
      <div className="flex justify-end">
        <button
          onClick={handleReset}
          className="flex items-center space-x-1 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded text-sm transition-colors"
          title="Сбросить текущий замер и готовность к новому заезду"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Сбросить трассу</span>
        </button>
      </div>

      {/* Состояние замера */}
      {state.active && (
        <div className="bg-green-600/20 border border-green-500/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Timer className="w-5 h-5 text-green-400 animate-pulse" />
              <span className="text-green-300 font-medium">Замер активен</span>
            </div>
            {state.currentCheckpoint !== undefined && state.totalCheckpoints && (
              <div className="text-sm text-green-300">
                Чекпоинт: {state.currentCheckpoint + 1} / {state.totalCheckpoints}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Последний результат */}
      {latestResult && (
        <div className="bg-base-800/50 rounded-lg p-4 border border-base-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              <h3 className="text-lg font-semibold text-white">Последний заезд</h3>
            </div>
            <button
              onClick={handleCopyResult}
              className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
            >
              <Copy className="w-4 h-4" />
              <span>Копировать</span>
            </button>
          </div>

          {/* Основная информация */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Автомобиль:</span>
              <span className="text-white font-medium">{latestResult.vehicleModel}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Дата:</span>
              <span className="text-white text-sm">{formatDateTime(latestResult.timestamp)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-lg">Общее время:</span>
              <span className="text-green-400 text-2xl font-bold">
                {formatTimeShort(latestResult.segments.total)}
              </span>
            </div>
            
            {getBestTime() && getBestTime() !== latestResult.segments.total && (
              <div className="text-xs text-gray-500 text-right">
                Разница с лучшим: {compareTimes(latestResult.segments.total, getBestTime())}
              </div>
            )}
          </div>

          {/* Участки с временем и скоростью */}
          <div className="mt-4 pt-4 border-t border-base-700">
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-white">Участки:</span>
            </div>
            <div className="space-y-2 text-sm">
              {['0-100m', '100-200m', '200-300m', '300-400m', '400-500m'].map(segment => (
                <div key={segment} className="flex items-center justify-between p-2 bg-base-700/30 rounded">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">{segment}:</span>
                      <span className="text-white font-medium">{formatTimeShort(latestResult.segments[segment])}</span>
                    </div>
                    {latestResult.speeds && latestResult.speeds[segment] && (
                      <div className="flex items-center justify-between mt-1 text-xs">
                        <span className="text-gray-500">Скорость:</span>
                        <span className="text-blue-400">
                          ср. {latestResult.speeds[segment].avg?.toFixed(1)} км/ч, 
                          макс. {latestResult.speeds[segment].max?.toFixed(1)} км/ч
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Разгон */}
          <div className="mt-4 pt-4 border-t border-base-700">
            <div className="flex items-center space-x-2 mb-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-medium text-white">Разгон:</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">0-100:</span>
                <span className="text-white">{formatTimeShort(latestResult.acceleration['0-100'])}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">0-200:</span>
                <span className="text-white">{formatTimeShort(latestResult.acceleration['0-200'])}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">100-200:</span>
                <span className="text-white">{formatTimeShort(latestResult.acceleration['100-200'])}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">200-300:</span>
                <span className="text-white">{formatTimeShort(latestResult.acceleration['200-300'])}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">300-400:</span>
                <span className="text-white">{formatTimeShort(latestResult.acceleration['300-400'])}</span>
              </div>
            </div>
          </div>

          {/* Графики */}
          <div className="mt-4">
            <button
              onClick={() => setShowGraphs(!showGraphs)}
              className="flex items-center justify-between w-full px-3 py-2 bg-base-700 hover:bg-base-600 rounded transition-colors"
            >
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-white">Графики</span>
              </div>
              {showGraphs ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>

            {showGraphs && (
              <div className="mt-4 space-y-4">
                {/* График времени участков */}
                <div>
                  <h4 className="text-sm font-medium text-white mb-2">Время участков</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={getSegmentChartData()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="name" stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                      <YAxis stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                        labelStyle={{ color: '#F3F4F6' }}
                      />
                      <Bar dataKey="time" fill="#3B82F6" name="Время (с)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* График скорости на участках */}
                {latestResult.speeds && getSpeedChartData().length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-white mb-2">Скорость на участках</h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={getSpeedChartData()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="name" stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                        <YAxis stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                          labelStyle={{ color: '#F3F4F6' }}
                        />
                        <Bar dataKey="avg" fill="#10B981" name="Средняя (км/ч)" />
                        <Bar dataKey="max" fill="#EF4444" name="Максимальная (км/ч)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* График разгона */}
                {getAccelerationChartData().length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-white mb-2">Разгон</h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={getAccelerationChartData()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="name" stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                        <YAxis stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                          labelStyle={{ color: '#F3F4F6' }}
                        />
                        <Bar dataKey="time" fill="#FBBF24" name="Время (с)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* История */}
      {history.length > 1 && (
        <div className="bg-base-800/50 rounded-lg p-4 border border-base-700">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center justify-between w-full"
          >
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-semibold text-white">История ({history.length})</h3>
            </div>
            {showHistory ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {showHistory && (
            <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
              {history.slice(0, 20).map((result, index) => (
                <div
                  key={result.id}
                  className="flex items-center justify-between p-3 bg-base-700/30 rounded hover:bg-base-700/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-xl">{getMedalEmoji(index + 1)}</span>
                      <span className="text-white font-medium truncate">{result.vehicleModel}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {formatDateTime(result.timestamp)}
                    </div>
                    <div className="flex items-center space-x-4 mt-2 text-sm">
                      <span className="text-green-400">
                        Total: {formatTimeShort(result.segments.total)}
                      </span>
                      {result.acceleration['0-100'] && (
                        <span className="text-yellow-400">
                          0-100: {formatTimeShort(result.acceleration['0-100'])}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteResult(result.id)}
                    className="ml-2 p-2 text-gray-500 hover:text-red-400 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Пустое состояние */}
      {!latestResult && history.length === 0 && (
        <div className="text-center py-12">
          <Timer className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg mb-2">Нет результатов</p>
          <p className="text-gray-500 text-sm">
            Проедьте через стартовый чекпоинт, чтобы начать замер
          </p>
          <p className="text-gray-600 text-xs mt-2">
            Локация: Airport - трасса вдоль взлетной полосы
          </p>
        </div>
      )}
    </div>
  )
}

export default SpeedTestPanel

