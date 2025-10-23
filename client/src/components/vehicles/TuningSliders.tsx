import React from 'react'
import { RotateCcw, Save, Maximize2, Minimize2, RefreshCw, Upload, HelpCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import type { UploadStatus as UploadStatusType } from '@/services/uploadService'
import UploadStatus from '@/components/UploadStatus'
import { getAccessToken } from '@/services/auth'

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
  tooltip: string
}

// Подсказки для параметров (на русском, из документации)
const TOOLTIPS: Record<string, string> = {
  // Трансмиссия
  initialDriveMaxFlatVel: 'Максимальная скорость в км/ч на последней передаче при максимальных оборотах. Установка этого значения не гарантирует достижения этой скорости.',
  initialDriveForce: 'Тяговое усилие (ускорение) автомобиля на колёсах. Формула: TorqueWheelsNm/WeightKg. Значения: 0.01-2.0. Большинство автомобилей имеют значение от 0.10 до 0.40.',
  driveInertia: 'Скорость набора оборотов двигателя. Чем больше значение, тем быстрее двигатель достигает максимальных оборотов. Значения: 0.01-2.0. По умолчанию 1.0.',
  clutchChangeRateScaleUpShift: 'Множитель скорости сцепления при переключении вверх. Чем больше число, тем быстрее переключение. Рекомендуется не превышать 13. Значение 1 = 0.9 секунды.',
  clutchChangeRateScaleDownShift: 'Множитель скорости сцепления при переключении вниз. Чем больше число, тем быстрее переключение. Рекомендуется не превышать 13. Значение 1 = 0.9 секунды.',
  
  // Тормоза и руль
  brakeForce: 'Множитель силы торможения. Чем больше число, тем сильнее торможение. Значения: 0.01-2.0. Увеличение не даст эффекта, если колёса ограничены сцеплением.',
  brakeBiasFront: 'Распределение силы торможения между передней и задней осями. 0.0 = только задняя ось, 1.0 = только передняя ось, 0.5 = равномерно. В реальности обычно ~0.65.',
  handBrakeForce: 'Мощность ручного тормоза. Чем больше значение, тем сильнее тормоз.',
  steeringLock: 'Максимальный угол поворота рулевых колёс в градусах. Больший угол уменьшает радиус разворота на малой скорости. Значения: 1-90, обычно ~40 градусов.',
  
  // Сцепление с дорогой
  tractionCurveMax: 'Максимальный коэффициент сцепления при прохождении поворотов/разгоне. Пиковое сцепление до потери контроля.',
  tractionCurveMin: 'Коэффициент сцепления при скольжении (пробуксовка, занос, недостаточная поворачиваемость).',
  tractionCurveLateral: 'Форма кривой бокового сцепления (угол скольжения). Меньшие значения делают сцепление отзывчивее, но менее прощающим. Большие - наоборот.',
  tractionSpringDeltaMax: 'Максимальное расстояние бокового хода боковины шины в метрах. Сила тянет автомобиль в противоположном направлении от бокового хода.',
  lowSpeedTractionLossMult: 'Насколько снижается сцепление на малой скорости. 0.0 = нормальное сцепление. Влияет на пробуксовку при старте (burnout). Чем выше, тем больше пробуксовка.',
  camberStiffnesss: 'Насколько автомобиль толкается в направлении крена. Развал дороги также влияет на крен и силы. Значения < 0.0 или > 1.0 создают нереалистичные силы.',
  tractionBiasFront: 'Распределение тяги между передней и задней осями. 0.01 = только задняя ось, 0.99 = только передняя ось, 0.5 = равномерно. 0.0 или 1.0 вызовут отказ шин.',
  tractionLossMult: 'Насколько сцепление зависит от разницы материала покрытия от 1.0. Влияет на потерю сцепления при езде по асфальту vs грязи (чем выше, тем больше потеря).',
  
  // Подвеска
  suspensionForce: '1 / (Сила * КоличествоКолёс) = нижний предел силы при полном растяжении. Влияет на жёсткость подвески. Может помочь, если машину легко переворачивает.',
  suspensionCompDamp: 'Демпфирование при сжатии стойки подвески. Чем больше, тем жёстче.',
  suspensionReboundDamp: 'Демпфирование при отбое стойки подвески. Чем больше, тем жёстче.',
  suspensionUpperLimit: 'Насколько колёса могут двигаться вверх от исходного положения.',
  suspensionLowerLimit: 'Насколько колёса могут двигаться вниз от исходного положения.',
  suspensionRaise: 'Насколько подвеска поднимает кузов над колёсами. Рекомендуется изменять на втором знаке после запятой. Слишком большое значение вызовет клипинг колёс.',
  suspensionBiasFront: 'Масштаб демпфирования спереди/сзади. Если больше колёс сзади (грузовики), передняя подвеска должна быть сильнее. > 0.50 = передняя жёстче, < 0.50 = задняя жёстче.',
  
  // Стабильность
  antiRollBarForce: 'Константа пружины стабилизатора, передаваемая противоположному колесу при сжатии. Большие значения = меньше крена кузова.',
  antiRollBarBiasFront: 'Баланс между передним и задним стабилизатором (0 = перед, 1 = зад).',
  rollCentreHeightFront: 'Высота центра крена передней оси от дна модели (дороги) в метрах. Высокие значения уменьшают крен кузова. Слишком высокие могут вызвать отрицательный крен.',
  rollCentreHeightRear: 'Высота центра крена задней оси от дна модели (дороги) в метрах. Высокие значения уменьшают крен кузова. Слишком высокие могут вызвать отрицательный крен.',
  
  // Масса
  mass: 'Вес автомобиля в килограммах. Используется только при столкновении с другим автомобилем или не статическим объектом. Значения: 0.0-10000.0 и выше.',
}

// Расширенный набор параметров (ключи соответствуют HandlingData / тегам handling.meta)
const SLIDERS: SliderDef[] = [
  // Трансмиссия / двигатель
  { key: 'initialDriveMaxFlatVel', label: 'Макс. скорость (км/ч)', min: 20, max: 1000, step: 5, tooltip: TOOLTIPS.initialDriveMaxFlatVel },
  { key: 'initialDriveForce', label: 'Мощность двигателя', min: 0.0, max: 5.0, step: 0.01, tooltip: TOOLTIPS.initialDriveForce },
  { key: 'driveInertia', label: 'Инерция двигателя', min: 0.1, max: 20, step: 0.1, tooltip: TOOLTIPS.driveInertia },
  { key: 'clutchChangeRateScaleUpShift', label: 'Скорость переключения ↑', min: 0.1, max: 50, step: 0.1, tooltip: TOOLTIPS.clutchChangeRateScaleUpShift },
  { key: 'clutchChangeRateScaleDownShift', label: 'Скорость переключения ↓', min: 0.1, max: 50, step: 0.1, tooltip: TOOLTIPS.clutchChangeRateScaleDownShift },
  // Тормоза / руль
  { key: 'brakeForce', label: 'Сила торможения', min: 0, max: 20, step: 0.1, tooltip: TOOLTIPS.brakeForce },
  { key: 'brakeBiasFront', label: 'Баланс торможения (перед)', min: 0.0, max: 1.0, step: 0.01, tooltip: TOOLTIPS.brakeBiasFront },
  { key: 'handBrakeForce', label: 'Сила ручника', min: 0, max: 20, step: 0.1, tooltip: TOOLTIPS.handBrakeForce },
  { key: 'steeringLock', label: 'Угол поворота (°)', min: 10, max: 90, step: 1, tooltip: TOOLTIPS.steeringLock },
  // Сцепление
  { key: 'tractionCurveMax', label: 'Сцепление MAX', min: 0, max: 50, step: 0.1, tooltip: TOOLTIPS.tractionCurveMax },
  { key: 'tractionCurveMin', label: 'Сцепление MIN', min: 0, max: 50, step: 0.1, tooltip: TOOLTIPS.tractionCurveMin },
  { key: 'tractionCurveLateral', label: 'Боковое сцепление', min: 1, max: 200, step: 1, tooltip: TOOLTIPS.tractionCurveLateral },
  { key: 'tractionSpringDeltaMax', label: 'Пружинистость сцепления', min: 0, max: 5, step: 0.01, tooltip: TOOLTIPS.tractionSpringDeltaMax },
  { key: 'lowSpeedTractionLossMult', label: 'Потеря сцепл. на мал. скорости', min: 0, max: 10, step: 0.1, tooltip: TOOLTIPS.lowSpeedTractionLossMult },
  { key: 'camberStiffnesss', label: 'Жёсткость развала', min: 0, max: 10, step: 0.1, tooltip: TOOLTIPS.camberStiffnesss },
  { key: 'tractionBiasFront', label: 'Баланс сцепления (перед)', min: 0.0, max: 1.0, step: 0.01, tooltip: TOOLTIPS.tractionBiasFront },
  { key: 'tractionLossMult', label: 'Потеря сцепления (дрифт)', min: 0, max: 10, step: 0.1, tooltip: TOOLTIPS.tractionLossMult },
  // Подвеска
  { key: 'suspensionForce', label: 'Жёсткость подвески', min: 0.1, max: 50, step: 0.1, tooltip: TOOLTIPS.suspensionForce },
  { key: 'suspensionCompDamp', label: 'Демпфер сжатия', min: 0.1, max: 50, step: 0.1, tooltip: TOOLTIPS.suspensionCompDamp },
  { key: 'suspensionReboundDamp', label: 'Демпфер отскока', min: 0.1, max: 50, step: 0.1, tooltip: TOOLTIPS.suspensionReboundDamp },
  { key: 'suspensionUpperLimit', label: 'Верхний предел подвески', min: -2, max: 2, step: 0.01, tooltip: TOOLTIPS.suspensionUpperLimit },
  { key: 'suspensionLowerLimit', label: 'Нижний предел подвески', min: -2, max: 2, step: 0.01, tooltip: TOOLTIPS.suspensionLowerLimit },
  { key: 'suspensionRaise', label: 'Высота подвески', min: -1, max: 1, step: 0.01, tooltip: TOOLTIPS.suspensionRaise },
  { key: 'suspensionBiasFront', label: 'Баланс подвески (перед)', min: 0.0, max: 1.0, step: 0.01, tooltip: TOOLTIPS.suspensionBiasFront },
  // Стабильность / крен
  { key: 'antiRollBarForce', label: 'Сила стабилизатора', min: 0, max: 20, step: 0.1, tooltip: TOOLTIPS.antiRollBarForce },
  { key: 'antiRollBarBiasFront', label: 'Баланс стабилизатора (перед)', min: 0.0, max: 1.0, step: 0.01, tooltip: TOOLTIPS.antiRollBarBiasFront },
  { key: 'rollCentreHeightFront', label: 'Центр крена (перед)', min: -5, max: 5, step: 0.05, tooltip: TOOLTIPS.rollCentreHeightFront },
  { key: 'rollCentreHeightRear', label: 'Центр крена (зад)', min: -5, max: 5, step: 0.05, tooltip: TOOLTIPS.rollCentreHeightRear },
  // Масса
  { key: 'mass', label: 'Масса (эквив. гравитации)', min: 400, max: 8000, step: 50, tooltip: TOOLTIPS.mass },
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

export function TuningSliders({ onChange, onReset, onXmlPatch, disabled, initialValues, vehicleKey, currentXml, onFocusModeToggle, focusMode }: { onChange: (parameter: string, value: number) => void; onReset?: () => void; onXmlPatch?: (parameter: string, value: number) => void; disabled?: boolean; initialValues?: string; vehicleKey?: string; currentXml?: string; onFocusModeToggle?: () => void; focusMode?: boolean }) {
  const [values, setValues] = React.useState<Record<string, number>>({})
  const [defaults, setDefaults] = React.useState<Record<string, number>>({})
  const lastVehicleKey = React.useRef<string | null>(null)
  const [supportedParams, setSupportedParams] = React.useState<string[]>([])
  const [unsupportedParams, setUnsupportedParams] = React.useState<string[]>([])
  const hasShownRestoreToast = React.useRef<boolean>(false) // Флаг для показа toast только один раз
  const [hasLocalEdits, setHasLocalEdits] = React.useState<boolean>(false) // Флаг локальных изменений (статус L)
  const [isLocallyEdited, setIsLocallyEdited] = React.useState<boolean>(false) // Флаг L от сервера
  const [uploadStatus, setUploadStatus] = React.useState<UploadStatusType | null>(null)
  const [isUploading, setIsUploading] = React.useState(false)

  const handleFocusToggle = () => {
    if (onFocusModeToggle) {
      (window as any).__focusMode = focusMode ? 'off' : 'tuning'
      window.dispatchEvent(new Event('focusModeChanged'))
      onFocusModeToggle()
    }
  }

  // Отслеживаем флаг L от сервера
  React.useEffect(() => {
    if (typeof window !== 'undefined' && 'alt' in window) {
      const alt = (window as any).alt
      
      // Слушаем обновления локальных изменений
      const handleLocalEditsUpdate = (data: any) => {
        console.log('[TuningSliders] 📨 Received local-edits-update:', data)
        if (data.localEdits && vehicleKey) {
          const isLocallyEdited = data.localEdits.includes(vehicleKey)
          setIsLocallyEdited(isLocallyEdited)
          console.log(`[TuningSliders] 🔍 Vehicle ${vehicleKey} locally edited: ${isLocallyEdited}`)
        }
      }
      
      alt.on('local-edits-update', handleLocalEditsUpdate)
      
      return () => {
        alt.off('local-edits-update', handleLocalEditsUpdate)
      }
    }
  }, [vehicleKey])

  // Запрос информации о поддержке параметров при монтировании
  React.useEffect(() => {
    if (typeof window !== 'undefined' && 'alt' in window) {
      const alt = (window as any).alt
      if (alt && typeof alt.emit === 'function' && typeof alt.on === 'function') {
        // Обработчик ответа capabilities
        const handleCapabilities = (data: any) => {
          console.log('[TuningSliders] 📡 Received handling capabilities:', data)
          if (data && data.working && data.nonWorking) {
            setSupportedParams(data.working)
            setUnsupportedParams(data.nonWorking)
            console.log(`[TuningSliders] ✅ ${data.working.length} supported, ❌ ${data.nonWorking.length} unsupported`)
          }
        }
        
        // Обработчик сохранённых значений
        const handleCurrentValues = (data: any) => {
          if (data && Object.keys(data).length > 0) {
            console.log('[TuningSliders] 💾 Received saved handling values:', data)
            // Применяем сохранённые значения поверх текущих
            setValues(prev => ({ ...prev, ...data }))
            
            // Показываем toast только ОДИН раз за сессию
            if (!hasShownRestoreToast.current) {
              toast.success(`Восстановлено ${Object.keys(data).length} сохранённых параметров`, {
                duration: 2000,
              })
              hasShownRestoreToast.current = true
            }
          } else {
            console.log('[TuningSliders] No saved handling values')
          }
        }
        
        // Обработчик обновления handling после применения мода
        const handleHandlingUpdated = (data: any) => {
          console.log('[TuningSliders] 🔄 Received handling update after mod:', data)
          if (data && data.newHandling) {
            // Обновляем значения ползунков
            setValues(prev => ({ ...prev, ...data.newHandling }))
            
            // Показываем уведомление
            toast.success(`Параметры обновлены после применения мода`, {
              duration: 2000,
            })
          }
        }
        
        // Регистрируем обработчики
        alt.on('handling:supported:response', handleCapabilities)
        alt.on('handling:current:response', handleCurrentValues)
        alt.on('vehicle:handling:updated', handleHandlingUpdated)
        
        // Запрашиваем capabilities
        alt.emit('handling:supported:request')
        console.log('[TuningSliders] 🔍 Requesting handling capabilities...')
        
        // ПРИМЕЧАНИЕ: Сохранённые значения запрашиваются ПОСЛЕ парсинга XML
        // (см. useEffect для initialValues)
        
        // Очистка при размонтировании
        return () => {
          if (alt && typeof alt.off === 'function') {
            alt.off('handling:supported:response', handleCapabilities)
            alt.off('handling:current:response', handleCurrentValues)
            alt.off('vehicle:handling:updated', handleHandlingUpdated)
          }
        }
      }
    }
  }, [])

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
      
      // Сбрасываем флаг toast при смене автомобиля
      hasShownRestoreToast.current = false
    }
    
    // ВАЖНО: После парсинга XML запрашиваем сохранённые значения
    // чтобы они применились поверх дефолтных из XML
    if (typeof window !== 'undefined' && 'alt' in window) {
      const alt = (window as any).alt
      if (alt && typeof alt.emit === 'function') {
        console.log('[TuningSliders] 🔄 XML parsed, requesting saved values to override...')
        alt.emit('handling:current:request')
      }
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
    
    // Сначала вызываем reset всех нативов на клиенте
    if (onReset) {
      onReset()
    }
    
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
    // Всегда сохраняем локально
    handleSaveLocal()
    // Устанавливаем флаг локальных изменений (статус L)
    setHasLocalEdits(true)
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

  // Обработчик уведомления об одобрении загрузки
  React.useEffect(() => {
    if (typeof window !== 'undefined' && 'alt' in window) {
      const handleUploadApproved = (data: any) => {
        console.log('[TuningSliders] 🎉 Upload approved:', data)
        
        if (data.success && data.uploadId === uploadStatus?.id) {
          // Обновляем статус загрузки
          setUploadStatus(prev => prev ? {
            ...prev,
            status: 'approved',
            approved: true
          } : null)
          
          // Показываем успешное уведомление
          toast.success(data.message || 'Ваша загрузка была одобрена! 🎉', {
            duration: 8000
          })
          
          // Автоматически скрываем уведомление через 5 секунд
          setTimeout(() => {
            setUploadStatus(null)
          }, 5000)
        }
      }
      
      ;(window as any).alt.on('meshhub:upload:approved', handleUploadApproved)
      
      return () => {
        ;(window as any).alt.off('meshhub:upload:approved', handleUploadApproved)
      }
    }
  }, [uploadStatus?.id])

  // Функция обновления статуса загрузки
  const handleRefreshUploadStatus = async () => {
    if (!uploadStatus?.id) return
    
    try {
      console.log('[TuningSliders] Refreshing upload status for:', uploadStatus.id)
      
      // Импортируем функцию получения статуса
      const { getUploadStatus } = await import('@/services/uploadService')
      const updatedStatus = await getUploadStatus(uploadStatus.id)
      
      console.log('[TuningSliders] Updated status:', updatedStatus)
      setUploadStatus(updatedStatus)
      
      // Если статус изменился на одобренный, показываем уведомление
      if (updatedStatus.status === 'approved' || updatedStatus.status === 'completed') {
        toast.success('Ваша загрузка была одобрена! 🎉', {
          duration: 5000
        })
        
        // Автоматически скрываем через 3 секунды
        setTimeout(() => {
          setUploadStatus(null)
        }, 3000)
      }
    } catch (error) {
      console.error('[TuningSliders] Failed to refresh upload status:', error)
      toast.error('Ошибка обновления статуса')
    }
  }

  const handleUpload = async () => {
    if (!vehicleKey) {
      console.warn('[TuningSliders] No vehicle key provided')
      toast.error('Нет данных для отправки')
      return
    }

    // Проверяем что мы в ALT:V WebView
    if (typeof window === 'undefined' || !('alt' in window)) {
      console.error('[TuningSliders] Not in ALT:V WebView, cannot upload to server')
      toast.error('Отправка на сервер доступна только в игре')
      return
    }

    try {
      setIsUploading(true)
      
      console.log('[TuningSliders] Uploading resource to server via ALT:V...', {
        resourceName: vehicleKey
      })
      
      // Получаем токен
      const token = getAccessToken()
      if (!token) {
        throw new Error('Токен авторизации не найден. Пожалуйста, войдите в систему.')
      }
      
      console.log('[TuningSliders] Token found, length:', token.length)
      
      // Создаем Promise для ожидания ответа от сервера
      const uploadPromise = new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Таймаут ожидания ответа от сервера'))
        }, 60000) // 60 секунд для ZIP архива
        
        // Слушаем ответ от сервера
        const handleResponse = (response: any) => {
          clearTimeout(timeout)
          ;(window as any).alt.off('meshhub:vehicle:upload:response', handleResponse)
          
          if (response.success) {
            resolve(response)
          } else {
            reject(new Error(response.error || 'Upload failed'))
          }
        }
        
        ;(window as any).alt.on('meshhub:vehicle:upload:response', handleResponse)
      })
      
      // Отправляем событие на сервер
      ;(window as any).alt.emit('meshhub:vehicle:upload:toserver', {
        resourceName: vehicleKey,
        token
      })
      
      console.log('[TuningSliders] Event sent, waiting for server response...')
      
      // Ждем ответа
      const response = await uploadPromise
      
      if (response.upload) {
        setUploadStatus(response.upload)
        toast.success('Ресурс отправлен на модерацию! 🎉', {
          duration: 5000
        })
        console.log('[TuningSliders] Upload successful:', response.upload.id)
      }
      
    } catch (error: any) {
      console.error('[TuningSliders] Upload failed:', error)
      console.error('[TuningSliders] Error message:', error?.message)
      
      toast.error(`Ошибка отправки: ${error.message || 'Неизвестная ошибка'}`, {
        duration: 10000
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-3 tuning-panel">
      {/* Блок кнопок сверху */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-base-700">
        {/* Левая часть - кнопки сброса и фокуса */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            disabled={disabled}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-base-800 border border-base-700 hover:bg-base-700 hover:border-primary-500/50 disabled:opacity-50 transition-all group"
            title="Сбросить параметры"
          >
            <RotateCcw className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-300" />
            <span>Сбросить</span>
          </button>
          
          {onFocusModeToggle && (
            <button
              onClick={handleFocusToggle}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-base-800 border border-base-700 hover:bg-base-700 hover:border-purple-500/50 transition-all"
              title={focusMode ? 'Показать меню' : 'Скрыть меню'}
            >
              {focusMode ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Выход</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-purple-400" />
                  <span>Фокус</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Правая часть - кнопки сохранения и отправки */}
        <div className="flex items-center gap-2">
          {/* Кнопка сохранения */}
          <button
            onClick={handleSave}
            disabled={disabled || isUploading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-gradient-to-r from-primary-600 to-fuchsia-600 hover:from-primary-500 hover:to-fuchsia-500 text-white disabled:opacity-50 transition-all"
          >
            <Save className={`w-3.5 h-3.5 ${isUploading ? 'animate-spin' : ''}`} />
            <span>{isUploading ? 'Отправка...' : 'Сохранить'}</span>
          </button>
          
          {/* Кнопка отправки (доступна только если есть локальные изменения) */}
          <button
            onClick={handleUpload}
            disabled={disabled || isUploading || (!hasLocalEdits && !isLocallyEdited)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title={(!hasLocalEdits && !isLocallyEdited) ? 'Доступно только при наличии локальных изменений (статус L)' : 'Отправить ресурс на сервер'}
          >
            <Upload className={`w-3.5 h-3.5 ${isUploading ? 'animate-spin' : ''}`} />
            <span>Отправить</span>
          </button>
        </div>
      </div>

      {/* Статус загрузки */}
        {uploadStatus && uploadStatus.resource_name === vehicleKey && (
          <UploadStatus 
            upload={uploadStatus} 
            onRefresh={handleRefreshUploadStatus}
          />
        )}

      {/* Сетка слайдеров */}
      <div className="grid grid-cols-2 gap-4">
        {SLIDERS.map(s => {
          const isUnsupported = unsupportedParams.includes(s.key)
          const isSupported = supportedParams.includes(s.key)
          
          return (
            <div 
              key={s.key} 
              className="text-xs text-gray-300"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span>{s.label}</span>
                  
                  {/* Tooltip с подсказкой */}
                  <div className="relative group/tooltip">
                    <HelpCircle className="w-3 h-3 text-gray-500 hover:text-blue-400 cursor-help transition-colors" />
                    {/* Tooltip справа (по умолчанию) */}
                    <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 w-64 p-2.5 bg-base-800/95 backdrop-blur-sm border border-base-600 rounded-lg shadow-2xl text-xs leading-relaxed text-gray-200 opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 z-[9999] pointer-events-none hidden group-hover/tooltip:block tooltip-right">
                      {s.tooltip}
                    </div>
                    {/* Tooltip слева (для правого столбца) */}
                    <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 w-64 p-2.5 bg-base-800/95 backdrop-blur-sm border border-base-600 rounded-lg shadow-2xl text-xs leading-relaxed text-gray-200 opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 z-[9999] pointer-events-none hidden group-hover/tooltip:block tooltip-left">
                      {s.tooltip}
                    </div>
                  </div>
                  
                  {isUnsupported && (
                    <span 
                      className="text-xs text-amber-500 cursor-help inline-flex items-center gap-0.5" 
                      title="Требуется перезагрузка сервера для применения изменений"
                    >
                      <RefreshCw className="w-3 h-3" />
                    </span>
                  )}
                  {isSupported && (
                    <span 
                      className="text-xs text-green-500" 
                      title="Параметр работает в реальном времени"
                    >
                      ✓
                    </span>
                  )}
                </div>
                <span className="text-gray-400">
                  {(values[s.key] ?? s.min)?.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min={s.min}
                max={s.max}
                step={s.step}
                value={values[s.key] ?? s.min}
                onChange={(e) => update(s.key, Number(e.target.value))}
                className={`w-full ${isUnsupported ? 'brand-range-restart' : 'brand-range'}`}
                disabled={disabled}
              />
              {isUnsupported && (
                <div className="text-[10px] text-amber-500/70 mt-0.5 flex items-center gap-1">
                  <RefreshCw className="w-2.5 h-2.5" />
                  <span>Требует перезагрузку сервера</span>
                </div>
              )}
            </div>
          )
        })}
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
        
        /* Ползунки для параметров, требующих перезагрузку - янтарный цвет */
        .tuning-panel .brand-range-restart {
          -webkit-appearance: none;
          height: 6px;
          background: linear-gradient(90deg, rgba(245,158,11,.4), rgba(217,119,6,.4));
          border-radius: 9999px;
          outline: none;
        }
        .tuning-panel .brand-range-restart::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 14px; height: 14px; border-radius: 9999px;
          background: #f59e0b; border: 2px solid #d97706;
          box-shadow: 0 0 0 3px rgba(245,158,11,.25);
        }
        .tuning-panel .brand-range-restart::-moz-range-thumb {
          width: 14px; height: 14px; border-radius: 9999px;
          background: #f59e0b; border: 2px solid #d97706;
        }
        
        /* Tooltips: левый столбец - справа, правый столбец - слева */
        .grid > *:nth-child(odd) .tooltip-left {
          display: none !important;
        }
        .grid > *:nth-child(even) .tooltip-right {
          display: none !important;
        }
      `}</style>
    </div>
  )
}

export default TuningSliders


