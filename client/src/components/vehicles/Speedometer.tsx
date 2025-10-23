import React, { useState, useEffect } from 'react'

interface SpeedometerProps {
  isVisible: boolean
  onToggle: () => void
}

export const Speedometer: React.FC<SpeedometerProps> = ({ isVisible, onToggle }) => {
  const [speed, setSpeed] = useState(0)
  
  console.log(`[Speedometer] Rendered with isVisible: ${isVisible}, speed: ${speed}`)

  useEffect(() => {
    if (!isVisible) return

    // Слушаем обновления скорости от Alt:V
    const handleSpeedUpdate = (data: { speed: number }) => {
      setSpeed(Math.round(data.speed))
    }

    if (typeof window !== 'undefined' && 'alt' in window) {
      ;(window as any).alt.on('vehicle:speed:update', handleSpeedUpdate)
      
      // Запрашиваем начальную скорость
      ;(window as any).alt.emit('vehicle:speed:request')
      
      return () => {
        ;(window as any).alt.off?.('vehicle:speed:update', handleSpeedUpdate)
      }
    }
  }, [isVisible])

  if (!isVisible) return null

  // Вычисляем угол поворота стрелки
  // 0 км/ч = -130.32°, 400 км/ч = 130.17°
  // Диапазон: 260.49° для 400 км/ч
  const minAngle = -130.32
  const maxAngle = 130.17
  const angleRange = maxAngle - minAngle
  const speedRatio = Math.min(speed / 400, 1) // Ограничиваем до 400 км/ч
  const needleAngle = minAngle + (angleRange * speedRatio)

  return (
    <div className="fixed bottom-4 right-4 z-50 pointer-events-auto">
      {/* Спидометр */}
      <div className="relative w-48 h-48 bg-black/20 rounded-full border-2 border-white/20">
        {/* Фон спидометра */}
        <img 
          src="http://resource/client/speedometer.png" 
          alt="Speedometer Background"
          className="absolute inset-0 w-full h-full object-contain"
          onError={(e) => {
            console.log('[Speedometer] Failed to load speedometer.png from http://resource/client/')
            e.currentTarget.style.display = 'none'
          }}
          onLoad={() => console.log('[Speedometer] speedometer.png loaded successfully from http://resource/client/')}
        />
        
        {/* Стрелка */}
        <img 
          src="http://resource/client/strelka.png" 
          alt="Speedometer Needle"
          className="absolute inset-0 w-full h-full object-contain transition-transform duration-100"
          style={{
            transform: `rotate(${needleAngle}deg)`,
            transformOrigin: '50% 75%' // Центр вращения стрелки
          }}
          onError={(e) => {
            console.log('[Speedometer] Failed to load strelka.png from http://resource/client/')
            e.currentTarget.style.display = 'none'
          }}
          onLoad={() => console.log('[Speedometer] strelka.png loaded successfully from http://resource/client/')}
        />
        
        {/* Текст скорости */}
        <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2">
          <div className="bg-black/80 px-3 py-2 rounded-lg text-white text-lg font-bold text-center border border-white/20">
            {speed}
            <div className="text-sm text-gray-300">км/ч</div>
          </div>
        </div>
        
        {/* Fallback если изображения не загрузились */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-white text-center">
            <div className="text-2xl font-bold">{speed}</div>
            <div className="text-sm">км/ч</div>
          </div>
        </div>
      </div>
      
      {/* Кнопка закрытия */}
      <button
        onClick={onToggle}
        className="absolute -top-2 -right-2 w-8 h-8 bg-red-600 hover:bg-red-700 text-white rounded-full text-sm font-bold transition-colors shadow-lg"
        title="Скрыть спидометр"
      >
        ×
      </button>
    </div>
  )
}
