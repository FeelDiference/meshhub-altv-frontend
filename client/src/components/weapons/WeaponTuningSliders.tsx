import React, { useState, useEffect } from 'react'
import { RotateCcw, Save, Maximize2, Minimize2, User, HardDrive, Cloud } from 'lucide-react'
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

type WeaponSliderDef = {
  key: string
  label: string
  min: number
  max: number
  step: number
}

// Параметры оружия из weapons.meta
const WEAPON_SLIDERS: WeaponSliderDef[] = [
  // Урон и сила
  { key: 'damage', label: 'Урон', min: 0, max: 500, step: 1 },
  { key: 'force', label: 'Сила отдачи', min: 0, max: 500, step: 5 },
  { key: 'forceHitPed', label: 'Сила удара (люди)', min: 0, max: 1000, step: 10 },
  { key: 'forceHitVehicle', label: 'Сила удара (тр-ты)', min: 0, max: 2000, step: 50 },
  
  // Точность и отдача
  { key: 'accuracySpread', label: 'Разброс', min: 0, max: 10, step: 0.1 },
  { key: 'recoilAccuracyMax', label: 'Макс. отдача', min: 0, max: 5, step: 0.05 },
  { key: 'recoilErrorTime', label: 'Время ошибки отдачи', min: 0, max: 10, step: 0.1 },
  { key: 'recoilRecoveryRate', label: 'Скорость восстановления', min: 0, max: 5, step: 0.05 },
  
  // Магазин и скорострельность
  { key: 'clipSize', label: 'Размер магазина', min: 1, max: 200, step: 1 },
  { key: 'timeBetweenShots', label: 'Время между выстрелами (мс)', min: 0, max: 2000, step: 10 },
  { key: 'bulletsInBatch', label: 'Пуль за выстрел', min: 1, max: 50, step: 1 },
  
  // Перезарядка
  { key: 'reloadTimeMP', label: 'Время перезарядки MP', min: 100, max: 10000, step: 100 },
  { key: 'reloadTimeSP', label: 'Время перезарядки SP', min: 100, max: 10000, step: 100 },
  { key: 'animReloadTime', label: 'Время анимации', min: 100, max: 10000, step: 100 },
  
  // Скорость и дальность
  { key: 'speed', label: 'Скорость пули', min: 100, max: 5000, step: 50 },
  { key: 'range', label: 'Дальность', min: 10, max: 1000, step: 10 },
  
  // Модификаторы урона
  { key: 'networkPlayerDamageModifier', label: 'Мод. урона (игроки)', min: 0, max: 5, step: 0.05 },
  { key: 'networkPedDamageModifier', label: 'Мод. урона (NPC)', min: 0, max: 5, step: 0.05 },
]

// Mapping from slider key to XML tag (camelCase -> PascalCase)
const sliderKeyToXmlTag: Record<string, string> = {
  damage: 'Damage',
  force: 'Force',
  forceHitPed: 'ForceHitPed',
  forceHitVehicle: 'ForceHitVehicle',
  accuracySpread: 'AccuracySpread',
  recoilAccuracyMax: 'RecoilAccuracyMax',
  recoilErrorTime: 'RecoilErrorTime',
  recoilRecoveryRate: 'RecoilRecoveryRate',
  clipSize: 'ClipSize',
  timeBetweenShots: 'TimeBetweenShots',
  bulletsInBatch: 'BulletsInBatch',
  reloadTimeMP: 'ReloadTimeMP',
  reloadTimeSP: 'ReloadTimeSP',
  animReloadTime: 'AnimReloadTime',
  speed: 'Speed',
  range: 'Range',
  networkPlayerDamageModifier: 'NetworkPlayerDamageModifier',
  networkPedDamageModifier: 'NetworkPedDamageModifier',
}

// Helper function to parse weapon XML and extract values
function parseWeaponXml(xml: string): Record<string, number> {
  const values: Record<string, number> = {}
  if (!xml) return values
  
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, 'text/xml')
    
    for (const [sliderKey, xmlTag] of Object.entries(sliderKeyToXmlTag)) {
      const element = doc.querySelector(xmlTag)
      if (element) {
        const valueAttr = element.getAttribute('value')
        if (valueAttr) {
          values[sliderKey] = parseFloat(valueAttr)
        }
      }
    }
  } catch (error) {
    console.error('[WeaponTuningSliders] Error parsing weapon XML:', error)
  }
  
  return values
}

interface WeaponTuningSlidersProps {
  onChange: (param: string, value: number) => void
  onReset: () => void
  onXmlPatch?: (param: string, value: number) => void
  disabled?: boolean
  initialValues?: string // XML string
  weaponKey?: string
  currentXml?: string
  onFocusModeToggle?: () => void
  focusMode?: boolean
}

const WeaponTuningSliders: React.FC<WeaponTuningSlidersProps> = ({
  onChange,
  onReset,
  onXmlPatch,
  disabled,
  initialValues,
  weaponKey,
  currentXml,
  onFocusModeToggle,
  focusMode
}) => {
  const [values, setValues] = useState<Record<string, number>>({})
  const [saveMode, setSaveMode] = useState<'local' | 'remote'>('local')

  const handleFocusToggle = () => {
    if (onFocusModeToggle) {
      (window as any).__focusMode = focusMode ? 'off' : 'weapon'
      window.dispatchEvent(new Event('focusModeChanged'))
      onFocusModeToggle()
    }
  }

  // Parse initial values from XML
  useEffect(() => {
    if (initialValues) {
      const parsed = parseWeaponXml(initialValues)
      setValues(parsed)
    } else if (currentXml) {
      const parsed = parseWeaponXml(currentXml)
      setValues(parsed)
    }
  }, [initialValues, currentXml, weaponKey])

  const handleSliderChange = (key: string, value: number) => {
    setValues(prev => ({ ...prev, [key]: value }))
    onChange(key, value)
    if (onXmlPatch) {
      onXmlPatch(key, value)
    }
  }

  const handleReset = () => {
    onReset()
    toast.success('Параметры сброшены')
  }

  const handleSave = () => {
    if (saveMode === 'local') {
      handleSaveLocal()
    } else {
      handleSaveRemote()
    }
  }

  const handleSaveLocal = () => {
    if (!currentXml || !weaponKey) {
      console.warn('[WeaponTuningSliders] No XML to save')
      toast.error('Нет данных для сохранения')
      return
    }

    try {
      // Проверяем, что мы в AltV WebView
      if (typeof window !== 'undefined' && 'alt' in window) {
        const eventData = {
          weaponName: weaponKey,
          xmlContent: currentXml
        }
        
        console.log('[WeaponTuningSliders] 🔍 Checking alt availability...')
        console.log('[WeaponTuningSliders] Data to send:', eventData.weaponName, 'XML length:', eventData.xmlContent.length)
        
        // Пробуем оба способа
        let sent = false
        
        // Способ 1: Глобальный alt
        // @ts-ignore
        if (typeof alt !== 'undefined' && typeof alt.emit === 'function') {
          console.log('[WeaponTuningSliders] ✅ Using global alt.emit')
          // @ts-ignore
          alt.emit('meshhub:weapon:save:meta', eventData)
          sent = true
        }
        
        // Способ 2: window.alt (на случай если глобальный не работает)
        if (typeof (window as any).alt !== 'undefined' && typeof (window as any).alt.emit === 'function') {
          console.log('[WeaponTuningSliders] ✅ Using window.alt.emit')
          ;(window as any).alt.emit('meshhub:weapon:save:meta', eventData)
          sent = true
        }
        
        if (sent) {
          console.log('[WeaponTuningSliders] ✅ Event sent successfully')
          toast.success('Запрос на сохранение отправлен')
          return
        } else {
          console.error('[WeaponTuningSliders] ❌ alt.emit не доступен!')
          toast.error('Ошибка: WebView не подключён к AltV')
          return
        }
      }

      // Fallback для браузера - обычная загрузка
      const blob = new Blob([currentXml], { type: 'application/xml' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${weaponKey}_weapon.meta`
      a.style.display = 'none'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast.success(`Файл ${weaponKey}_weapon.meta сохранён`)
    } catch (err) {
      console.error('[WeaponTuningSliders] Save failed:', err)
      toast.error('Ошибка сохранения файла')
    }
  }

  const handleSaveRemote = () => {
    // TODO: Реализовать сохранение на сервер
    console.log('[WeaponTuningSliders] Save to remote (not implemented yet)')
    toast('Сохранение на сервер будет доступно в следующей версии', {
      icon: '🚀',
      duration: 4000,
    })
  }

  return (
    <div className="space-y-3 weapon-tuning-panel">
      {/* Блок кнопок сверху */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-base-700">
        {/* Левая часть - кнопки спавна педа, сброса и фокуса */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (typeof window !== 'undefined' && window.alt) {
                window.alt.emit('weapon:spawn:ped', { frozen: true, distance: 20 })
                toast.success('Пед заспавнен на 20 метрах')
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-base-800 border border-base-700 hover:bg-base-700 hover:border-purple-500/50 transition-all"
            title="Заспавнить тестового педа на 20 метрах"
          >
            <User className="w-3.5 h-3.5 text-purple-400" />
            <span>Пед</span>
          </button>
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
        {WEAPON_SLIDERS.map(slider => {
          const value = values[slider.key] ?? slider.min

          return (
            <div 
              key={slider.key} 
              className="text-xs text-gray-300"
            >
              <div className="flex items-center justify-between mb-1">
                <span>{slider.label}</span>
                <span className="text-gray-400">
                  {value.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min={slider.min}
                max={slider.max}
                step={slider.step}
                value={value}
                onChange={(e) => handleSliderChange(slider.key, parseFloat(e.target.value))}
                className="w-full brand-range"
                disabled={disabled}
              />
            </div>
          )
        })}
      </div>

      {/* Info */}
      <div className="mt-4 p-3 bg-base-800 rounded-lg border border-base-700">
        <div className="text-xs text-gray-400">
          {disabled
            ? '⚠️ Возьмите оружие в руки для редактирования параметров'
            : '✅ Параметры применяются в реальном времени'}
        </div>
      </div>
      
      <style>{`
        .weapon-tuning-panel .brand-range {
          -webkit-appearance: none;
          height: 6px;
          background: linear-gradient(90deg, rgba(99,102,241,.4), rgba(147,51,234,.4));
          border-radius: 9999px;
          outline: none;
        }
        .weapon-tuning-panel .brand-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 14px; height: 14px; border-radius: 9999px;
          background: #8b5cf6; border: 2px solid #3b82f6;
          box-shadow: 0 0 0 3px rgba(59,130,246,.25);
        }
        .weapon-tuning-panel .brand-range::-moz-range-thumb {
          width: 14px; height: 14px; border-radius: 9999px;
          background: #8b5cf6; border: 2px solid #3b82f6;
        }
      `}</style>
    </div>
  )
}

export default WeaponTuningSliders



