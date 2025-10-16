import React from 'react'
import { RotateCcw, Save, HardDrive, Cloud } from 'lucide-react'
import toast from 'react-hot-toast'

// Декларация для глобального alt в WebView
declare global {
  interface Window {
    alt?: {
      emit: (event: string, ...args: any[]) => void
      on: (event: string, callback: (...args: any[]) => void) => void
      off: (event: string, callback: (...args: any[]) => void) => void
    }
  }
  var alt: {
    emit: (event: string, ...args: any[]) => void
    on: (event: string, callback: (...args: any[]) => void) => void
    off: (event: string, callback: (...args: any[]) => void) => void
  } | undefined
}

type SliderDef = {
  key: string
  label: string
  min: number
  max: number
  step: number
}

// Расширенный набор параметров (ключи соответствуют HandlingData / тегам handling.meta)
const SLIDERS: SliderDef[] = [
  // Трансмиссия / двигатель
  { key: 'initialDriveMaxFlatVel', label: 'Макс. скорость (км/ч)', min: 80, max: 1000, step: 5 },
  { key: 'initialDriveForce', label: 'Мощность двигателя', min: 0.0, max: 5.0, step: 0.01 },
  { key: 'driveInertia', label: 'Инерция двигателя', min: 0.1, max: 20, step: 0.1 },
  { key: 'clutchChangeRateScaleUpShift', label: 'Скорость переключения ↑', min: 0.1, max: 50, step: 0.1 },
  { key: 'clutchChangeRateScaleDownShift', label: 'Скорость переключения ↓', min: 0.1, max: 50, step: 0.1 },
  // Тормоза / руль
  { key: 'brakeForce', label: 'Сила торможения', min: 0, max: 20, step: 0.1 },
  { key: 'brakeBiasFront', label: 'Баланс торможения (перед)', min: 0.0, max: 1.0, step: 0.01 },
  { key: 'handBrakeForce', label: 'Сила ручника', min: 0, max: 20, step: 0.1 },
  { key: 'steeringLock', label: 'Угол поворота (°)', min: 10, max: 90, step: 1 },
  // Сцепление
  { key: 'tractionCurveMax', label: 'Сцепление MAX', min: 0, max: 50, step: 0.1 },
  { key: 'tractionCurveMin', label: 'Сцепление MIN', min: 0, max: 50, step: 0.1 },
  { key: 'tractionCurveLateral', label: 'Боковое сцепление', min: 1, max: 200, step: 1 },
  { key: 'tractionSpringDeltaMax', label: 'Пружинистость сцепления', min: 0, max: 5, step: 0.01 },
  { key: 'lowSpeedTractionLossMult', label: 'Потеря сцепл. на мал. скорости', min: 0, max: 10, step: 0.1 },
  { key: 'camberStiffnesss', label: 'Жёсткость развала', min: 0, max: 10, step: 0.1 },
  { key: 'tractionBiasFront', label: 'Баланс сцепления (перед)', min: 0.0, max: 1.0, step: 0.01 },
  { key: 'tractionLossMult', label: 'Потеря сцепления (дрифт)', min: 0, max: 10, step: 0.1 },
  // Подвеска
  { key: 'suspensionForce', label: 'Жёсткость подвески', min: 0.1, max: 50, step: 0.1 },
  { key: 'suspensionCompDamp', label: 'Демпфер сжатия', min: 0.1, max: 50, step: 0.1 },
  { key: 'suspensionReboundDamp', label: 'Демпфер отскока', min: 0.1, max: 50, step: 0.1 },
  { key: 'suspensionUpperLimit', label: 'Верхний предел подвески', min: -2, max: 2, step: 0.01 },
  { key: 'suspensionLowerLimit', label: 'Нижний предел подвески', min: -2, max: 2, step: 0.01 },
  { key: 'suspensionRaise', label: 'Высота подвески', min: -1, max: 1, step: 0.01 },
  { key: 'suspensionBiasFront', label: 'Баланс подвески (перед)', min: 0.0, max: 1.0, step: 0.01 },
  // Стабильность / крен
  { key: 'antiRollBarForce', label: 'Сила стабилизатора', min: 0, max: 20, step: 0.1 },
  { key: 'antiRollBarBiasFront', label: 'Баланс стабилизатора (перед)', min: 0.0, max: 1.0, step: 0.01 },
  { key: 'rollCentreHeightFront', label: 'Центр крена (перед)', min: -5, max: 5, step: 0.05 },
  { key: 'rollCentreHeightRear', label: 'Центр крена (зад)', min: -5, max: 5, step: 0.05 },
  // Масса
  { key: 'mass', label: 'Масса (эквив. гравитации)', min: 400, max: 8000, step: 50 },
]

// Helper function to parse handling XML and extract values
function parseHandlingXml(xml: string): Record<string, number> {
  const values: Record<string, number> = {}
  if (!xml) return values
  
  try {
    // Parse XML tags like <fInitialDriveMaxFlatVel value="150.00" />
    const tagMap: Record<string, string> = {
      'fInitialDriveMaxFlatVel': 'initialDriveMaxFlatVel',
      'fInitialDriveForce': 'initialDriveForce',
      'fDriveInertia': 'driveInertia',
      'fClutchChangeRateScaleUpShift': 'clutchChangeRateScaleUpShift',
      'fClutchChangeRateScaleDownShift': 'clutchChangeRateScaleDownShift',
      'fBrakeForce': 'brakeForce',
      'fBrakeBiasFront': 'brakeBiasFront',
      'fHandBrakeForce': 'handBrakeForce',
      'fSteeringLock': 'steeringLock',
      'fTractionCurveMax': 'tractionCurveMax',
      'fTractionCurveMin': 'tractionCurveMin',
      'fTractionCurveLateral': 'tractionCurveLateral',
      'fTractionSpringDeltaMax': 'tractionSpringDeltaMax',
      'fLowSpeedTractionLossMult': 'lowSpeedTractionLossMult',
      'fCamberStiffnesss': 'camberStiffnesss',
      'fTractionBiasFront': 'tractionBiasFront',
      'fTractionLossMult': 'tractionLossMult',
      'fSuspensionForce': 'suspensionForce',
      'fSuspensionCompDamp': 'suspensionCompDamp',
      'fSuspensionReboundDamp': 'suspensionReboundDamp',
      'fSuspensionUpperLimit': 'suspensionUpperLimit',
      'fSuspensionLowerLimit': 'suspensionLowerLimit',
      'fSuspensionRaise': 'suspensionRaise',
      'fSuspensionBiasFront': 'suspensionBiasFront',
      'fAntiRollBarForce': 'antiRollBarForce',
      'fAntiRollBarBiasFront': 'antiRollBarBiasFront',
      'fRollCentreHeightFront': 'rollCentreHeightFront',
      'fRollCentreHeightRear': 'rollCentreHeightRear',
      'fMass': 'mass',
    }
    
    for (const [xmlTag, paramKey] of Object.entries(tagMap)) {
      const regex = new RegExp(`<${xmlTag}\\s+value="([^"]+)"`, 'i')
      const match = xml.match(regex)
      if (match && match[1]) {
        const numValue = parseFloat(match[1])
        if (!isNaN(numValue)) {
          values[paramKey] = numValue
        }
      }
    }
  } catch (e) {
    console.error('Failed to parse handling XML:', e)
  }
  
  return values
}

export function TuningSliders({ onChange, onXmlPatch, disabled, initialValues, vehicleKey, currentXml }: { onChange: (parameter: string, value: number) => void; onXmlPatch?: (parameter: string, value: number) => void; disabled?: boolean; initialValues?: string; vehicleKey?: string; currentXml?: string }) {
  const [values, setValues] = React.useState<Record<string, number>>({})
  const [defaults, setDefaults] = React.useState<Record<string, number>>({})
  const lastVehicleKey = React.useRef<string | null>(null)
  const [saveMode, setSaveMode] = React.useState<'local' | 'remote'>('local')

  // Parse XML when initialValues changes
  React.useEffect(() => {
    if (!initialValues) return
    
    const parsed = parseHandlingXml(initialValues)
    setValues(parsed)
    
    // Запомним "заводские" для reset при первой загрузке ИЛИ при смене машины
    const isNewVehicle = vehicleKey && vehicleKey !== lastVehicleKey.current
    if (isNewVehicle || !lastVehicleKey.current) {
      console.log('[TuningSliders] Saving initial defaults for', vehicleKey, ':', parsed)
      setDefaults(parsed)
      lastVehicleKey.current = vehicleKey || null
    }
  }, [initialValues, vehicleKey])

  const update = (key: string, value: number) => {
    setValues(prev => ({ ...prev, [key]: value }))
    onChange(key, value)
    onXmlPatch?.(key, value)
  }

  const handleReset = () => {
    if (!defaults || Object.keys(defaults).length === 0) {
      console.warn('[TuningSliders] Reset failed: no defaults saved!')
      toast.error('Не удалось сбросить параметры')
      return
    }
    
    console.log('[TuningSliders] Resetting to defaults:', defaults)
    
    // Применяем заводские значения в игру и XML
    Object.entries(defaults).forEach(([k, v]) => {
      if (typeof v === 'number') {
        onChange(k, v)
        onXmlPatch?.(k, v)
      }
    })
    
    // Обновляем локальное состояние ползунков
    setValues({ ...defaults })
    toast.success('Параметры сброшены к заводским')
  }

  const handleSave = () => {
    if (saveMode === 'local') {
      handleSaveLocal()
    } else {
      handleSaveRemote()
    }
  }

  const handleSaveLocal = () => {
    if (!currentXml || !vehicleKey) {
      console.warn('[TuningSliders] No XML to save')
      toast.error('Нет данных для сохранения')
      return
    }

    try {
      // Проверяем, что мы в AltV WebView
      if (typeof window !== 'undefined' && 'alt' in window) {
        const eventData = {
          vehicleName: vehicleKey,
          xmlContent: currentXml
        }
        
        console.log('[TuningSliders] 🔍 Checking alt availability...')
        console.log('[TuningSliders] typeof alt:', typeof alt)
        console.log('[TuningSliders] typeof window.alt:', typeof (window as any).alt)
        console.log('[TuningSliders] Data to send:', eventData.vehicleName, 'XML length:', eventData.xmlContent.length)
        
        // Пробуем оба способа
        let sent = false
        
        // Способ 1: Глобальный alt
        // @ts-ignore
        if (typeof alt !== 'undefined' && typeof alt.emit === 'function') {
          console.log('[TuningSliders] ✅ Using global alt.emit')
          // @ts-ignore
          alt.emit('meshhub:vehicle:save:handling:meta', eventData)
          sent = true
        }
        
        // Способ 2: window.alt (на случай если глобальный не работает)
        if (typeof (window as any).alt !== 'undefined' && typeof (window as any).alt.emit === 'function') {
          console.log('[TuningSliders] ✅ Using window.alt.emit')
          ;(window as any).alt.emit('meshhub:vehicle:save:handling:meta', eventData)
          sent = true
        }
        
        if (sent) {
          console.log('[TuningSliders] ✅ Event sent successfully')
          toast.success('Запрос на сохранение отправлен')
          return
        } else {
          console.error('[TuningSliders] ❌ alt.emit не доступен!')
          toast.error('Ошибка: WebView не подключён к AltV')
          return
        }
      }

      // Fallback для браузера - обычная загрузка
      const blob = new Blob([currentXml], { type: 'application/xml' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${vehicleKey}_handling.meta`
      a.style.display = 'none'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast.success(`Файл ${vehicleKey}_handling.meta сохранён`)
    } catch (err) {
      console.error('[TuningSliders] Save failed:', err)
      toast.error('Ошибка сохранения файла')
    }
  }

  const handleSaveRemote = () => {
    // TODO: Реализовать сохранение на сервер
    console.log('[TuningSliders] Save to remote (not implemented yet)')
    toast('Сохранение на сервер будет доступно в следующей версии', {
      icon: '🚀',
      duration: 4000,
    })
  }

  return (
    <div className="space-y-3 tuning-panel">
      {/* Блок кнопок сверху */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-base-700">
        {/* Левая часть - кнопка сброса */}
        <button
          onClick={handleReset}
          disabled={disabled}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-base-800 border border-base-700 hover:bg-base-700 hover:border-primary-500/50 disabled:opacity-50 transition-all group"
          title="Сбросить параметры"
        >
          <RotateCcw className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-300" />
          <span>Сбросить</span>
        </button>

        {/* Правая часть - переключатель и кнопка сохранения */}
        <div className="flex items-center gap-2">
          {/* Переключатель режима */}
          <div className="flex items-center bg-base-800 border border-base-700 rounded-lg p-0.5">
            <button
              onClick={() => setSaveMode('local')}
              className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-all ${
                saveMode === 'local'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <HardDrive className="w-3 h-3" />
              <span>Локально</span>
            </button>
            <button
              onClick={() => setSaveMode('remote')}
              className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-all ${
                saveMode === 'remote'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Cloud className="w-3 h-3" />
              <span>Удалённо</span>
            </button>
          </div>

          {/* Кнопка сохранения */}
          <button
            onClick={handleSave}
            disabled={disabled}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-gradient-to-r from-primary-600 to-fuchsia-600 hover:from-primary-500 hover:to-fuchsia-500 text-white disabled:opacity-50 transition-all"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Сохранить</span>
          </button>
        </div>
      </div>

      {/* Сетка слайдеров */}
      <div className="grid grid-cols-2 gap-4">
        {SLIDERS.map(s => (
          <div key={s.key} className="text-xs text-gray-300">
            <div className="flex items-center justify-between mb-1">
              <span>{s.label}</span>
              <span className="text-gray-400">{(values[s.key] ?? s.min)?.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={s.min}
              max={s.max}
              step={s.step}
              value={values[s.key] ?? s.min}
              onChange={(e) => update(s.key, Number(e.target.value))}
              className="w-full brand-range"
              disabled={disabled}
            />
          </div>
        ))}
      </div>
      <style>{`
        .tuning-panel .brand-range {
          -webkit-appearance: none;
          height: 6px;
          background: linear-gradient(90deg, rgba(99,102,241,.4), rgba(147,51,234,.4));
          border-radius: 9999px;
          outline: none;
        }
        .tuning-panel .brand-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 14px; height: 14px; border-radius: 9999px;
          background: #8b5cf6; border: 2px solid #3b82f6;
          box-shadow: 0 0 0 3px rgba(59,130,246,.25);
        }
        .tuning-panel .brand-range::-moz-range-thumb {
          width: 14px; height: 14px; border-radius: 9999px;
          background: #8b5cf6; border: 2px solid #3b82f6;
        }
      `}</style>
    </div>
  )
}

export default TuningSliders


