// Конфигурация для ALT:V интеграции

import type { ALTVConfig } from '@/types/altv'

export const ALTV_CONFIG: ALTVConfig = {
  // URL для разработки (когда не в ALT:V)
  devServerUrl: 'http://localhost:3000',
  
  // Таймауты
  timeouts: {
    spawn: 5000, // 5 секунд на спавн
    handlingUpdate: 1000, // 1 секунда на обновление параметра
    installationCheck: 3000, // 3 секунды на проверку установки
  },
  
  // Дебаг режим (включен в development)
  debug: import.meta.env.DEV,
}

// Параметры handling для валидации
export const HANDLING_PARAMS = {
  // Физические параметры
  physics: {
    mass: { min: 100, max: 50000, step: 10, unit: 'kg' },
    initialDragCoeff: { min: 0, max: 50, step: 0.1, unit: '' },
    percentSubmerged: { min: 10, max: 120, step: 1, unit: '%' },
  },
  
  // Трансмиссия
  transmission: {
    driveBiasFront: { min: 0, max: 1, step: 0.01, unit: '' },
    initialDriveGears: { min: 1, max: 10, step: 1, unit: '' },
    initialDriveForce: { min: 0.1, max: 2, step: 0.01, unit: '' },
    brakeForce: { min: 0, max: 5, step: 0.05, unit: '' },
    steeringLock: { min: 10, max: 90, step: 1, unit: '°' },
  },
  
  // Тяга колес
  traction: {
    tractionCurveMax: { min: 0.5, max: 10, step: 0.1, unit: '' },
    tractionCurveMin: { min: 0.5, max: 10, step: 0.1, unit: '' },
    tractionCurveLateral: { min: 5, max: 50, step: 0.5, unit: '' },
  },
  
  // Подвеска
  suspension: {
    suspensionForce: { min: 0.5, max: 10, step: 0.1, unit: '' },
    suspensionCompDamp: { min: 0.5, max: 5, step: 0.1, unit: '' },
    suspensionReboundDamp: { min: 0.5, max: 5, step: 0.1, unit: '' },
    suspensionUpperLimit: { min: 0, max: 0.5, step: 0.01, unit: 'm' },
    suspensionLowerLimit: { min: -0.5, max: 0, step: 0.01, unit: 'm' },
  },
  
  // Повреждения
  damage: {
    collisionDamageMult: { min: 0, max: 10, step: 0.1, unit: '' },
    weaponDamageMult: { min: 0, max: 10, step: 0.1, unit: '' },
    deformationDamageMult: { min: 0, max: 10, step: 0.1, unit: '' },
    engineDamageMult: { min: 0, max: 10, step: 0.1, unit: '' },
  }
} as const

// Описания параметров для UI
export const HANDLING_DESCRIPTIONS = {
  mass: 'Масса автомобиля в килограммах',
  initialDragCoeff: 'Коэффициент аэродинамического сопротивления',
  percentSubmerged: 'Процент погружения в воду для плавучести',
  driveBiasFront: 'Распределение крутящего момента (0 = RWD, 1 = FWD)',
  initialDriveGears: 'Количество передач',
  initialDriveForce: 'Сила тяги двигателя',
  brakeForce: 'Сила торможения',
  steeringLock: 'Максимальный угол поворота руля в градусах',
  tractionCurveMax: 'Максимальное сцепление с дорогой',
  tractionCurveMin: 'Минимальное сцепление с дорогой',
  suspensionForce: 'Жесткость подвески',
  suspensionCompDamp: 'Демпфирование сжатия подвески',
  suspensionReboundDamp: 'Демпфирование отскока подвески',
  collisionDamageMult: 'Множитель урона от столкновений',
  weaponDamageMult: 'Множитель урона от оружия',
  deformationDamageMult: 'Множитель деформации кузова',
  engineDamageMult: 'Множитель урона двигателя',
} as const

// Проверка запуска в ALT:V
export const isRunningInALTV = (): boolean => {
  return typeof window !== 'undefined' && 'alt' in window
}

// Получить объект alt (если доступен)
export const getALT = (): any => {
  if (isRunningInALTV()) {
    return (window as any).alt
  }
  return null
}
