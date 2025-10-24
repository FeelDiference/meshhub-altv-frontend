/**
 * Утилиты для трансформации координат между GTA V и Three.js
 * 
 * СИСТЕМА КООРДИНАТ:
 * - GTA V: X (восток), Y (север), Z (вверх)
 * - Three.js стандарт: X (право), Y (вверх), Z (вперед к камере)
 * - Модель во вьювере повернута: rotation={[Math.PI/2, Math.PI, 0]} = [90° X, 180° Y, 0° Z]
 * 
 * ПОСЛЕ ПОВОРОТА МОДЕЛИ:
 * - GTA X → Three.js -X (инверсия из-за 180° по Y)
 * - GTA Y → Three.js Y (остается)
 * - GTA Z → Three.js -Z (комбо поворотов)
 */

export interface Vec3 {
  x: number
  y: number
  z: number
}

/**
 * БАЗОВЫЕ ПОВОРОТЫ .YFT МОДЕЛИ
 * 
 * Normal View - для красивого отображения (модель на колесах)
 * Game View - для синхронизации с игрой
 */

// Для Normal View - красивое отображение (как было изначально)
export const YFT_NORMAL_VIEW_ROTATION: [number, number, number] = [
  Math.PI / 2,  // X: 90°
  Math.PI,      // Y: 180°
  0             // Z: 0°
]

// Для Game View - синхронизация с игрой (калибруется!)
export const YFT_GAME_VIEW_ROTATION: [number, number, number] = [
  Math.PI / 2,  // X: 90° - поворот для правильной ориентации
  Math.PI,      // Y: 180° - разворот по зеленой оси
  Math.PI       // Z: 180° - разворот по синей оси
]

export interface CameraSyncData {
  camera: {
    position: Vec3      // Относительная позиция камеры (относительно машины)
    rotation: Vec3      // Вращение камеры в градусах (pitch, roll, yaw)
    fov: number         // Field of View
  }
  vehicle: {
    rotation: Vec3  // Вращение машины в градусах
  }
  debug?: {
    camWorldPos: Vec3
    vehicleWorldPos: Vec3
  }
}

/**
 * Конвертирует относительную позицию камеры из GTA V в Three.js координаты
 * 
 * СИСТЕМА КООРДИНАТ:
 * - GTA V: X (восток), Y (север), Z (вверх)
 * - Three.js: X (право), Y (вверх), Z (назад к камере)
 * - YFT модель: Как в файле, но возможно повернута
 * 
 * @param gtaRelativePos - Позиция камеры относительно машины в GTA V координатах
 * @returns Позиция для Three.js камеры
 */
export function convertCameraPosition(gtaRelativePos: Vec3): Vec3 {
  // GTA V координаты:
  // X = восток (+) / запад (-)
  // Y = север (+) / юг (-)  
  // Z = вверх (+) / вниз (-)
  
  // Three.js координаты (стандарт):
  // X = право (+) / лево (-)
  // Y = вверх (+) / вниз (-)
  // Z = назад (+) / вперед (-) [от камеры]
  
  // ИСПРАВЛЕННАЯ КОНВЕРТАЦИЯ:
  // GTA Y (север) → Three.js Z (но инвертирован, так как север GTA = юг Three.js)
  // GTA Z (вверх) → Three.js Y (вверх)
  // GTA X (восток) → Three.js X (право)
  
  return {
    x: gtaRelativePos.x,    // восток → право (остается)
    y: gtaRelativePos.z,    // вверх → вверх (остается)  
    z: -gtaRelativePos.y    // север → юг (инвертирован)
  }
}

/**
 * Конвертирует вращение камеры из GTA V градусов в Three.js радианы
 * 
 * ВАЖНО: GTA V порядок осей отличается от Three.js!
 * - GTA V (getGameplayCamRot(2)): x=pitch, y=roll, z=yaw
 * - Three.js Euler: x=pitch, y=yaw, z=roll
 * 
 * @param gtaRotation - Вращение камеры в градусах {x: pitch, y: roll, z: yaw}
 * @returns Вращение для Three.js камеры в радианах {x: pitch, y: yaw, z: roll}
 */
export function convertCameraRotation(gtaRotation: Vec3): Vec3 {
  const DEG_TO_RAD = Math.PI / 180
  
  // GTA V: x=pitch, y=roll, z=yaw
  // Three.js: x=pitch, y=yaw, z=roll
  // Учитываем что Y и Z поменялись местами в координатной системе
  
  return {
    x: gtaRotation.x * DEG_TO_RAD,   // pitch остается X (наклон вверх/вниз)
    y: -gtaRotation.z * DEG_TO_RAD,  // yaw инвертирован (поворот влево/вправо)
    z: gtaRotation.y * DEG_TO_RAD    // roll остается Z (крен)
  }
}

/**
 * Конвертирует FOV (уже в правильном формате, но можем добавить коррекцию)
 * 
 * @param gtaFov - FOV от GTA V камеры
 * @returns FOV для Three.js камеры
 */
export function convertCameraFov(gtaFov: number): number {
  // GTA V и Three.js используют одинаковую систему FOV (vertical FOV в градусах)
  // Можем добавить небольшую коррекцию если нужно
  return gtaFov
}

/**
 * Линейная интерполяция для плавности движения
 * 
 * @param current - Текущее значение
 * @param target - Целевое значение
 * @param factor - Фактор интерполяции (0-1), где 1 = мгновенно
 * @returns Интерполированное значение
 */
export function lerp(current: number, target: number, factor: number): number {
  return current + (target - current) * factor
}

/**
 * Векторная линейная интерполяция
 * 
 * @param current - Текущий вектор
 * @param target - Целевой вектор
 * @param factor - Фактор интерполяции (0-1)
 * @returns Интерполированный вектор
 */
export function lerpVec3(current: Vec3, target: Vec3, factor: number): Vec3 {
  return {
    x: lerp(current.x, target.x, factor),
    y: lerp(current.y, target.y, factor),
    z: lerp(current.z, target.z, factor)
  }
}

/**
 * Сферическая линейная интерполяция для вращения (более плавная чем lerp)
 * Упрощенная версия для малых углов
 * 
 * @param current - Текущее вращение
 * @param target - Целевое вращение
 * @param factor - Фактор интерполяции (0-1)
 * @returns Интерполированное вращение
 */
export function slerpRotation(current: Vec3, target: Vec3, factor: number): Vec3 {
  // Для малых углов lerp достаточно хорош
  // Для больших углов нужна более сложная математика (quaternions)
  // Пока используем простой lerp с нормализацией
  return lerpVec3(current, target, factor)
}

/**
 * Вычисляет расстояние между двумя точками
 * 
 * @param a - Первая точка
 * @param b - Вторая точка
 * @returns Расстояние
 */
export function distance(a: Vec3, b: Vec3): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const dz = b.z - a.z
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

/**
 * Нормализует угол в диапазон [-180, 180] градусов
 * 
 * @param angle - Угол в градусах
 * @returns Нормализованный угол
 */
export function normalizeAngle(angle: number): number {
  while (angle > 180) angle -= 360
  while (angle < -180) angle += 360
  return angle
}

/**
 * Применяет полную трансформацию sync данных из GTA V для Three.js
 * 
 * @param syncData - Данные синхронизации от Alt:V Client
 * @returns Трансформированные данные для Three.js камеры
 */
export function transformSyncDataForThreeJS(
  syncData: CameraSyncData,
  cameraInvert?: { x: boolean; y: boolean; z: boolean }
) {
  // Применяем инверсию к ВХОДЯЩИМ данным от игры
  let cameraPos = { ...syncData.camera.position }
  let cameraRot = { ...syncData.camera.rotation }
  
  if (cameraInvert) {
    // Инвертируем входящие координаты камеры
    if (cameraInvert.x) cameraPos.x = -cameraPos.x
    if (cameraInvert.y) cameraPos.y = -cameraPos.y
    if (cameraInvert.z) cameraPos.z = -cameraPos.z
    
    // Инвертируем входящие углы камеры
    if (cameraInvert.x) cameraRot.x = -cameraRot.x
    if (cameraInvert.y) cameraRot.y = -cameraRot.y
    if (cameraInvert.z) cameraRot.z = -cameraRot.z
  }
  
  return {
    position: convertCameraPosition(cameraPos),
    rotation: convertCameraRotation(cameraRot),
    fov: convertCameraFov(syncData.camera.fov),
    vehicleRotation: syncData.vehicle.rotation,
    debug: syncData.debug
  }
}

/**
 * Класс для сглаживания данных синхронизации (буферизация и интерполяция)
 */
export class CameraSyncSmoother {
  private currentPosition: Vec3 = { x: 0, y: 0, z: 0 }
  private currentRotation: Vec3 = { x: 0, y: 0, z: 0 }
  private currentFov: number = 60
  
  // Фактор сглаживания (0-1): чем ближе к 1, тем быстрее реакция
  private readonly smoothFactor = 0.7
  
  /**
   * Обновляет текущее состояние с сглаживанием
   */
  update(targetPosition: Vec3, targetRotation: Vec3, targetFov: number) {
    // Плавно интерполируем к целевым значениям
    this.currentPosition = lerpVec3(this.currentPosition, targetPosition, this.smoothFactor)
    this.currentRotation = slerpRotation(this.currentRotation, targetRotation, this.smoothFactor)
    this.currentFov = lerp(this.currentFov, targetFov, this.smoothFactor)
  }
  
  /**
   * Сбрасывает к целевым значениям мгновенно (без сглаживания)
   */
  reset(position: Vec3, rotation: Vec3, fov: number) {
    this.currentPosition = { ...position }
    this.currentRotation = { ...rotation }
    this.currentFov = fov
  }
  
  /**
   * Получить текущие сглаженные значения
   */
  getCurrent() {
    return {
      position: { ...this.currentPosition },
      rotation: { ...this.currentRotation },
      fov: this.currentFov
    }
  }
}

/**
 * Логирует данные синхронизации для отладки
 */
export function logSyncData(syncData: CameraSyncData, label: string = 'Sync') {
  console.log(`[${label}] Camera:`, {
    pos: `(${syncData.camera.position.x.toFixed(2)}, ${syncData.camera.position.y.toFixed(2)}, ${syncData.camera.position.z.toFixed(2)})`,
    rot: `(${syncData.camera.rotation.x.toFixed(1)}°, ${syncData.camera.rotation.y.toFixed(1)}°, ${syncData.camera.rotation.z.toFixed(1)}°)`,
    fov: syncData.camera.fov.toFixed(1)
  })
  
  if (syncData.debug) {
    console.log(`[${label}] Debug:`, {
      camWorld: `(${syncData.debug.camWorldPos.x.toFixed(2)}, ${syncData.debug.camWorldPos.y.toFixed(2)}, ${syncData.debug.camWorldPos.z.toFixed(2)})`,
      vehWorld: `(${syncData.debug.vehicleWorldPos.x.toFixed(2)}, ${syncData.debug.vehicleWorldPos.y.toFixed(2)}, ${syncData.debug.vehicleWorldPos.z.toFixed(2)})`
    })
  }
}

