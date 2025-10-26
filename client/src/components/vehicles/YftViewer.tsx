/**
 * YFT 3D Viewer Component
 * Отображает 3D модель автомобиля в wireframe режиме используя Three.js
 */

import React, { useState, useEffect, Suspense, useRef } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Grid as ThreeGrid } from '@react-three/drei'
import * as THREE from 'three'
import { X, RotateCcw, Eye, Box, Grid as GridIcon, Database, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { 
  transformSyncDataForThreeJS, 
  CameraSyncSmoother,
  type CameraSyncData,
  type Vec3,
  YFT_NORMAL_VIEW_ROTATION
} from '@/utils/coordinateTransform'
import { useYFTCache } from '@/hooks/useYFTCache'
import { YFTCache } from '@/utils/yftCache'

interface YftViewerProps {
  vehicleName: string
  onClose: () => void
  onGameViewChange?: (active: boolean) => void
}

interface MeshData {
  vertices: number[] // [x, y, z, x, y, z, ...]
  indices: number[]  // [i1, i2, i3, i1, i2, i3, ...]
  bounds?: {
    min: { x: number; y: number; z: number }
    max: { x: number; y: number; z: number }
  }
}

/**
 * Компонент 3D модели с wireframe
 */
function VehicleModel({ 
  meshData, 
  viewMode, 
  gameViewMode = false,
  vehicleRotation,
  showDebugAxes = false,
  calibration
}: { 
  meshData: MeshData
  viewMode: 'wireframe' | 'solid' | 'real'
  gameViewMode?: boolean
  vehicleRotation?: Vec3  // Вращение машины в Game View (в градусах)
  showDebugAxes?: boolean  // Показывать ли debug оси координат
  calibration?: {
    modelRotation: { x: number; y: number; z: number }
    modelOffset: { x: number; y: number; z: number }
  }
}) {
  
  // Создаем геометрию из mesh данных БЕЗ вычисления нормалей (для производительности!)
  const geometry = React.useMemo(() => {
    console.log('[YftViewer] 🏗️ Building geometry...')
    const startTime = performance.now()
    
    const geo = new THREE.BufferGeometry()
    
    // Преобразуем массив вершин в Float32Array
    const vertices = new Float32Array(meshData.vertices)
    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
    
    // Добавляем индексы если есть
    if (meshData.indices && meshData.indices.length > 0) {
      const indices = new Uint32Array(meshData.indices)
      geo.setIndex(new THREE.BufferAttribute(indices, 1))
    }
    
    // ВАЖНО: НЕ вычисляем нормали для wireframe - это очень медленно!
    // Для solid mesh нормали не критичны, используем flat shading
    
    const elapsed = performance.now() - startTime
    console.log(`[YftViewer] ✅ Geometry built in ${elapsed.toFixed(0)}ms`)
    
    return geo
  }, [meshData])
  
  // Вычисляем Bounding Box и позицию для правильного размещения на полу
  // В Game View режиме модель СТРОГО в центре (0, 0, 0) без offset (или с калибровочным offset)!
  const position: [number, number, number] = React.useMemo(() => {
    if (!geometry) return [0, 0, 0]
    
    // В Game View режиме - модель в центре + калибровочный offset
    if (gameViewMode && calibration) {
      const offset = calibration.modelOffset
      return [offset.x, offset.y, offset.z]
    }
    
    if (gameViewMode) {
      return [0, 0, 0]
    }
    
    // В обычном режиме - позиционируем на полу как раньше
    geometry.computeBoundingBox()
    const box = geometry.boundingBox!
    
    console.log('[YftViewer] 📦 Original Bounding Box:', {
      min: { x: box.min.x, y: box.min.y, z: box.min.z },
      max: { x: box.max.x, y: box.max.y, z: box.max.z },
      size: { x: box.max.x - box.min.x, y: box.max.y - box.min.y, z: box.max.z - box.min.z }
    })
    
    // Учитываем поворот [Math.PI / 2, Math.PI, 0] = [90°, 180°, 0°]
    // После поворота на 90° по X: Y становится Z, Z становится -Y
    // После поворота на 180° по Y: X становится -X, Z становится -Z
    
    // Итоговые координаты после поворотов:
    // newX = -oldX
    // newY = -oldZ  
    // newZ = -oldY
    
    // Находим минимальную Y координату после поворота
    const rotatedMinY = Math.min(
      -box.max.z,  // -oldZ (когда oldY = min)
      -box.min.z   // -oldZ (когда oldY = max)
    )
    
    console.log(`[YftViewer] 🔄 After rotation [90°, 180°, 0°]: minY = ${rotatedMinY.toFixed(3)}`)
    
    // Позиционируем по нижней границе после поворота
    const yOffset = -rotatedMinY
    console.log(`[YftViewer] ⬇️ Positioning at Y offset: ${yOffset.toFixed(3)}`)
    
    return [0, yOffset, 0]
  }, [geometry, gameViewMode, calibration])
  
  // Определяем вращение модели - РАЗНЫЕ для Normal и Game View!
  const rotation: [number, number, number] = React.useMemo(() => {
    const DEG_TO_RAD = Math.PI / 180
    
    if (gameViewMode && vehicleRotation) {
      // В Game View: калибровочный поворот + вращение автомобиля из игры (НАКЛОНЫ!)
      const baseRot = calibration?.modelRotation || 
        { x: 90, y: 180, z: 180 } // Дефолт из YFT_GAME_VIEW_ROTATION
      
      // ВАЖНО: После поворота модели (90°X, 180°Y, 180°Z) оси GTA не совпадают с осями Three.js!
      // Экспериментально подобранный маппинг (поменяли X и Y местами):
      // GTA pitch (X - продольный наклон нос вверх/вниз) → Three.js Y (зеленая)
      // GTA roll (Y - крен левое/правое колесо) → Three.js X (красная)
      // GTA yaw (Z - поворот на колесах) → Three.js Z (синяя ось) ✅
      
      const finalRotation = [
        baseRot.x * DEG_TO_RAD - vehicleRotation.y * DEG_TO_RAD,  // X (красная): roll машины (крен)
        baseRot.y * DEG_TO_RAD - vehicleRotation.x * DEG_TO_RAD,  // Y (зеленая): -pitch машины (инвертирован!)
        baseRot.z * DEG_TO_RAD + vehicleRotation.z * DEG_TO_RAD   // Z (синяя): yaw машины (поворот на колесах) ✅
      ] as [number, number, number]
      
      // Логирование для отладки
      const count = (window as any).__vehicleRotationAppliedCount || 0
      if (count < 3) {
        console.log('[YftViewer] 🎯 Model rotation applied (FIXED AXES):',
          `GTA(pitch=${vehicleRotation.x.toFixed(1)}, roll=${vehicleRotation.y.toFixed(1)}, yaw=${vehicleRotation.z.toFixed(1)})`,
          `→ Three.js(X=${(finalRotation[0] * 180 / Math.PI).toFixed(1)}, Y=${(finalRotation[1] * 180 / Math.PI).toFixed(1)}, Z=${(finalRotation[2] * 180 / Math.PI).toFixed(1)})`
        )
        ;(window as any).__vehicleRotationAppliedCount = count + 1
      }
      
      return finalRotation
    } else if (gameViewMode) {
      // Game View без данных вращения - калибровочный поворот
      const baseRot = calibration?.modelRotation || 
        { x: 90, y: 180, z: 180 }
      
      return [
        baseRot.x * DEG_TO_RAD,
        baseRot.y * DEG_TO_RAD,
        baseRot.z * DEG_TO_RAD
      ]
    } else {
      // Normal View: стандартный поворот для красивого отображения (на колесах)
      return YFT_NORMAL_VIEW_ROTATION
    }
  }, [gameViewMode, vehicleRotation, calibration])
  
  return (
    <group rotation={rotation} position={position}>
      {/* Wireframe режим */}
      {viewMode === 'wireframe' && (
        <mesh geometry={geometry}>
          <meshBasicMaterial 
            color="#00ff00" 
            wireframe={true}
            transparent
            opacity={0.8}
          />
        </mesh>
      )}
      
      {/* Solid режим */}
      {viewMode === 'solid' && (
        <mesh geometry={geometry}>
          <meshBasicMaterial 
            color="#3b82f6"
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
      
      {/* Real режим (wireframe + solid) */}
      {viewMode === 'real' && (
        <>
          <mesh geometry={geometry}>
            <meshBasicMaterial 
              color="#3b82f6"
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh geometry={geometry}>
            <meshBasicMaterial 
              color="#00ff00" 
              wireframe={true}
              transparent
              opacity={0.6}
            />
          </mesh>
        </>
      )}
      
      {/* Debug оси координат для калибровки */}
      {showDebugAxes && (
        <axesHelper args={[5]} />
      )}
    </group>
  )
}

/**
 * Компонент синхронизации камеры - применяет sync данные к Three.js камере
 */
function CameraSync({ 
  enabled, 
  cameraRef,
  calibration
}: { 
  enabled: boolean
  cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>
  calibration: {
    cameraInvert: { x: boolean; y: boolean; z: boolean }
    baseFov: number
    fovMultiplier: number
    applyRoll: boolean
  }
}) {
  const { camera } = useThree()
  const smootherRef = useRef(new CameraSyncSmoother())
  const rafRef = useRef<number | null>(null)
  const lastSyncDataRef = useRef<any>(null)
  const logCounterRef = useRef(0) // Для ограничения логирования
  
  // Базовый FOV из калибровки (не синхронизируется из игры)
  const baseFov = calibration.baseFov
  
  useEffect(() => {
    // Сохраняем ссылку на камеру
    if (camera instanceof THREE.PerspectiveCamera) {
      cameraRef.current = camera
    }
  }, [camera, cameraRef])
  
  // Применяем FOV при изменении калибровки
  useEffect(() => {
    if (enabled && cameraRef.current) {
      const finalFov = baseFov * calibration.fovMultiplier
      cameraRef.current.fov = finalFov
      cameraRef.current.updateProjectionMatrix()
      console.log('[CameraSync] 🔍 FOV updated:', finalFov.toFixed(1))
    }
  }, [enabled, baseFov, calibration.fovMultiplier])
  
  useEffect(() => {
    if (!enabled) {
      // Если синхронизация отключена, останавливаем RAF
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      return
    }
    
    // Обработчик данных синхронизации от Alt:V
    const handleCameraSync = (syncData: CameraSyncData) => {
      lastSyncDataRef.current = syncData
      
      // ДЕТАЛЬНОЕ ЛОГИРОВАНИЕ для диагностики (только первые 3 сообщения)
      if (logCounterRef.current < 3) {
        console.log('[CameraSync] 📥 Received sync data:', {
          camPos: syncData?.camera?.position,
          camRot: syncData?.camera?.rotation,
          vehRot: syncData?.vehicle?.rotation,
          debug: syncData?.debug
        })
        logCounterRef.current++
      }
    }
    
    // Подписываемся на событие синхронизации
    if ((window as any).alt) {
      ;(window as any).alt.on('yft-viewer:camera-sync:update', handleCameraSync)
      console.log('[CameraSync] ✅ Subscribed to yft-viewer:camera-sync:update event')
    }
    
    // RAF цикл для плавного применения данных
    const animate = () => {
      if (!enabled || !cameraRef.current || !lastSyncDataRef.current) {
        rafRef.current = requestAnimationFrame(animate)
        return
      }
      
      try {
        const syncData = lastSyncDataRef.current
        
        // Трансформируем данные из GTA V в Three.js координаты с инверсией
        const transformed = transformSyncDataForThreeJS(syncData, calibration.cameraInvert)
        
        // Применяем сглаживание для плавности (только position и rotation)
        smootherRef.current.update(
          transformed.position,
          transformed.rotation
        )
        
        const smoothed = smootherRef.current.getCurrent()
        
        // Применяем к камере
        const cam = cameraRef.current
        
        // 1. Позиционируем камеру в пространстве
        cam.position.set(smoothed.position.x, smoothed.position.y, smoothed.position.z)
        
        // 2. ВАЖНО: Камера ВСЕГДА смотрит на центр модели (0, 0, 0)
        // Это обеспечивает правильное вращение вокруг модели
        // lookAt автоматически вычисляет pitch и yaw
        cam.lookAt(0, 0, 0)
        
        // 3. ОПЦИОНАЛЬНО: Применяем ROLL (крен камеры по оси Z)
        // Pitch и Yaw уже заданы через lookAt, а roll нужно применить вручную
        if (calibration.applyRoll) {
          cam.rotation.z = smoothed.rotation.z
        }
        
        // ГИБРИДНЫЙ ПОДХОД:
        // - Position: полная синхронизация из игры (камера движется в пространстве)
        // - Pitch/Yaw: автоматически через lookAt(0,0,0) (камера всегда смотрит на модель)
        // - Roll: опционально, для крена камеры (если нужно)
        // - FOV: НЕ обновляется здесь, только через useEffect при изменении калибровки
        
        // ЛОГИРОВАНИЕ только раз в секунду для диагностики (не забиваем консоль)
        if (logCounterRef.current < 3) {
          console.log('[CameraSync] 📸 Applied to camera:', {
            rawData: {
              pos: [syncData.camera.position.x.toFixed(2), syncData.camera.position.y.toFixed(2), syncData.camera.position.z.toFixed(2)],
              rot: [syncData.camera.rotation.x.toFixed(1), syncData.camera.rotation.y.toFixed(1), syncData.camera.rotation.z.toFixed(1)]
            },
            transformed: {
              pos: [smoothed.position.x.toFixed(2), smoothed.position.y.toFixed(2), smoothed.position.z.toFixed(2)],
              rot: [smoothed.rotation.x.toFixed(2), smoothed.rotation.y.toFixed(2), smoothed.rotation.z.toFixed(2)]
            },
            camera: {
              position: [cam.position.x.toFixed(2), cam.position.y.toFixed(2), cam.position.z.toFixed(2)],
              fov: cam.fov.toFixed(1)
            },
            calibration: {
              invert: calibration.cameraInvert,
              fovMult: calibration.fovMultiplier
            }
          })
        }
        
      } catch (err) {
        console.error('[YftViewer] Error applying camera sync:', err)
      }
      
      rafRef.current = requestAnimationFrame(animate)
    }
    
    // Запускаем RAF
    rafRef.current = requestAnimationFrame(animate)
    
    // Cleanup
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      
      if ((window as any).alt) {
        ;(window as any).alt.off('yft-viewer:camera-sync:update', handleCameraSync)
        console.log('[CameraSync] ✅ Unsubscribed from yft-viewer:camera-sync:update event')
      }
    }
  }, [enabled, cameraRef])
  
  return null // Этот компонент не рендерит ничего, только управляет камерой
}

/**
 * Главный компонент YFT Viewer
 */
export function YftViewer({ vehicleName, onClose, onGameViewChange }: YftViewerProps) {
  const [meshData, setMeshData] = useState<MeshData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showGrid, setShowGrid] = useState(true)
  const [viewMode, setViewMode] = useState<'wireframe' | 'solid' | 'real'>('real')
  const [gameViewMode, setGameViewMode] = useState(false) // Режим наложения на игру
  const [progress, setProgress] = useState<{ v: number; i: number; phase: 'idle' | 'start' | 'chunk' | 'end' }>(
    { v: 0, i: 0, phase: 'idle' }
  )
  
  // Кэширование YFT моделей
  const { cacheStatus, loadFromCache, saveToCache, clearCache, refreshStats, isCacheAvailable } = useYFTCache()
  
  // Ref для доступа к Three.js камере из CameraSync компонента
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  
  // Debug информация для Game View
  const [debugInfo, setDebugInfo] = useState({
    cameraOffset: 0
  })
  
  // Вращение автомобиля для синхронизации модели
  const [vehicleRotation, setVehicleRotation] = useState<{ x: number; y: number; z: number } | null>(null)
  
  // Debug оси координат для калибровки
  const [showDebugAxes, setShowDebugAxes] = useState(false)
  
  // Калибровочные параметры (live настройка)
  const [calibration, setCalibration] = useState({
    modelRotation: { x: 90, y: 180, z: 180 }, // В градусах
    cameraInvert: { x: false, y: false, z: false },
    modelOffset: { x: 0, y: -0.8, z: 0 }, // Y = -0.8 для точного позиционирования
    baseFov: 50, // Базовый FOV (не из игры, статичный)
    fovMultiplier: 1.0,
    applyRoll: false // Применять roll (крен) камеры
  })
  
  // Загрузка mesh данных при монтировании
  useEffect(() => {
    loadMeshData()
  }, [vehicleName])
  
  // Подписка на данные синхронизации камеры от Alt:V
  useEffect(() => {
    if (!gameViewMode) return
    
    const handleCameraSync = (syncData: any) => {
      // Вычисляем offset камеры от машины для debug UI
      const pos = syncData?.camera?.position
      if (pos) {
        const offset = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z)
        setDebugInfo({ cameraOffset: offset })
      }
      
      // Сохраняем вращение автомобиля для синхронизации наклонов модели
      if (syncData?.vehicle?.rotation) {
        setVehicleRotation(syncData.vehicle.rotation)
        
        // Логирование для отладки (первые 3 раза)
        const count = (window as any).__vehicleRotationLogCount || 0
        if (count < 3) {
          console.log('[YftViewer] 🔄 Vehicle rotation received:', syncData.vehicle.rotation)
          ;(window as any).__vehicleRotationLogCount = count + 1
        }
      }
    }
    
    if ((window as any).alt) {
      ;(window as any).alt.on('yft-viewer:camera-sync:update', handleCameraSync)
    }
    
    return () => {
      if ((window as any).alt) {
        ;(window as any).alt.off('yft-viewer:camera-sync:update', handleCameraSync)
      }
    }
  }, [gameViewMode])
  
  // Обработка ESC для выхода из Game View
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && gameViewMode) {
        console.log('[YftViewer] ESC pressed in Game View - exiting...')
        setGameViewMode(false)
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [gameViewMode])
  
  // Уведомляем App о смене Game View режима
  useEffect(() => {
    if (onGameViewChange) {
      onGameViewChange(gameViewMode)
    }
  }, [gameViewMode, onGameViewChange])
  
  // Принудительное обновление камеры при изменении калибровки
  useEffect(() => {
    if (gameViewMode && cameraRef.current) {
      // Логируем изменение калибровки - обновление произойдет в RAF цикле CameraSync
      console.log('[YftViewer] 🔧 Calibration changed:', {
        fovMultiplier: calibration.fovMultiplier,
        modelRotation: calibration.modelRotation,
        modelOffset: calibration.modelOffset,
        cameraInvert: calibration.cameraInvert,
        applyRoll: calibration.applyRoll
      })
    }
  }, [calibration, gameViewMode])

  // Управляем скрытием UI и камерой в Game View режиме
  useEffect(() => {
    if (gameViewMode) {
      // В Game View режиме - скрываем основной UI
      const focusMode = 'game-view'
      ;(globalThis as any).__focusMode = focusMode
      ;(window as any).__focusMode = focusMode
      console.log(`[YftViewer] Set __focusMode = ${focusMode} (Game View ON)`)
      
      // Отправляем CUSTOM EVENT для перерендера App
      window.dispatchEvent(new CustomEvent('focusModeChanged', { detail: { mode: focusMode } }))
      console.log(`[YftViewer] ✅ Dispatched focusModeChanged event: ${focusMode}`)
      
      // Отправляем событие в Alt:V Client-side JS
      if ((window as any).alt) {
        ;(window as any).alt.emit('yft-viewer:focus-mode', { mode: focusMode })
        console.log(`[YftViewer] ✅ Sent yft-viewer:focus-mode ${focusMode} to Alt:V Client`)
        
        // ЗАПУСКАЕМ СИНХРОНИЗАЦИЮ КАМЕРЫ
        ;(window as any).alt.emit('yft-viewer:camera:sync:start')
        console.log(`[YftViewer] 🎥 Started camera synchronization`)
      }
    } else {
      // В обычном режиме YftViewer - НЕ скрываем основной UI
      console.log(`[YftViewer] Game View OFF - not changing focusMode`)
      
      // ОСТАНАВЛИВАЕМ СИНХРОНИЗАЦИЮ КАМЕРЫ
      if ((window as any).alt) {
        ;(window as any).alt.emit('yft-viewer:camera:sync:stop')
        console.log(`[YftViewer] 🛑 Stopped camera synchronization`)
      }
    }
    
    const handleRightClick = (e: MouseEvent) => {
      // Блокируем только ПКМ, который переключает фокус на игру (только если НЕ в Game View)
      if (!gameViewMode) {
        e.preventDefault()
        e.stopPropagation()
        return false
      }
    }
    
    // Добавляем обработчик на весь документ
    document.addEventListener('contextmenu', handleRightClick, true) // capture phase
    document.addEventListener('mousedown', (e) => {
      if (e.button === 2 && !gameViewMode) { // ПКМ (только если НЕ в Game View)
        e.preventDefault()
        e.stopPropagation()
        return false
      }
    }, true) // capture phase
    
    return () => {
      // Восстанавливаем обычный режим ТОЛЬКО если был в Game View
      if (gameViewMode) {
        ;(globalThis as any).__focusMode = 'off'
        ;(window as any).__focusMode = 'off'
        console.log('[YftViewer] Reset __focusMode = off (Game View was ON)')
        
        // Отправляем CUSTOM EVENT для перерендера App
        window.dispatchEvent(new CustomEvent('focusModeChanged', { detail: { mode: 'off' } }))
        console.log('[YftViewer] ✅ Dispatched focusModeChanged event: off')
        
        // Отправляем событие в Alt:V Client-side JS
        if ((window as any).alt) {
          ;(window as any).alt.emit('yft-viewer:focus-mode', { mode: 'off' })
          console.log('[YftViewer] ✅ Sent yft-viewer:focus-mode OFF to Alt:V Client')
        }
      }
      
      document.removeEventListener('contextmenu', handleRightClick, true)
      document.removeEventListener('mousedown', handleRightClick, true)
    }
  }, [gameViewMode])
  
  /**
   * Загрузка mesh данных через ALT:V → C# CodeWalker с кэшированием
   */
  const loadMeshData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log(`[YftViewer] Requesting mesh data for vehicle: ${vehicleName}`)
      
      // Проверяем доступность ALT:V
      if (typeof window === 'undefined' || !('alt' in window)) {
        throw new Error('ALT:V недоступен. Viewer работает только в игре.')
      }

      // Создаем хэш файла для сохранения в кэш (стабильный, основан на имени)
      const fileHash = await YFTCache.createFileHash(vehicleName, 0)
      console.log(`[YftViewer] 🔍 File hash for ${vehicleName}: ${fileHash}`)
      
      // Пытаемся загрузить из кэша (без проверки хэша для совместимости)
      console.log(`[YftViewer] 🔍 Trying to load from cache: ${vehicleName}`)
      const cachedData = await loadFromCache(vehicleName)
      if (cachedData) {
        console.log(`[YftViewer] ✅ Loaded from cache: ${vehicleName} (vertices: ${cachedData.metadata.vertexCount})`)
        
        // Конвертируем ArrayBuffer обратно в массивы
        const verticesArray = new Float32Array(cachedData.meshData, 0, cachedData.metadata.vertexCount * 3)
        const indicesArray = new Uint32Array(cachedData.meshData, verticesArray.byteLength)
        
        const data: MeshData = {
          vertices: Array.from(verticesArray),
          indices: Array.from(indicesArray),
          bounds: {
            min: { 
              x: cachedData.metadata.boundingBox.min[0],
              y: cachedData.metadata.boundingBox.min[1],
              z: cachedData.metadata.boundingBox.min[2]
            },
            max: { 
              x: cachedData.metadata.boundingBox.max[0],
              y: cachedData.metadata.boundingBox.max[1],
              z: cachedData.metadata.boundingBox.max[2]
            }
          }
        }
        
        setMeshData(data)
        toast.success(`Модель загружена из кэша: ${cachedData.metadata.vertexCount.toLocaleString()} вершин`)
        return
      }
      
      console.log(`[YftViewer] Cache miss, loading from server: ${vehicleName}`)
      
      // Запрашиваем mesh данные у C# модуля через ALT:V
      const data = await requestMeshDataFromServer(vehicleName)
      
      if (!data) {
        throw new Error('Не удалось получить mesh данные')
      }
      
      console.log(`[YftViewer] Mesh data loaded:`, {
        vertices: data.vertices.length / 3,
        triangles: data.indices.length / 3
      })
      
      setMeshData(data)
      toast.success(`Модель загружена: ${(data.vertices.length / 3).toLocaleString()} вершин`)
      
      // Сохраняем в кэш асинхронно
      try {
        // Создаем ArrayBuffer для mesh данных
        const totalSize = data.vertices.length * 4 + data.indices.length * 4 // Float32 + Uint32
        const meshDataBuffer = new ArrayBuffer(totalSize)
        
        // Копируем данные в ArrayBuffer
        const verticesView = new Float32Array(meshDataBuffer, 0, data.vertices.length)
        const indicesView = new Uint32Array(meshDataBuffer, verticesView.byteLength, data.indices.length)
        verticesView.set(data.vertices)
        indicesView.set(data.indices)
        
        // Сохраняем в кэш
        await saveToCache({
          fileHash,
          fileName: vehicleName,
          fileSize: totalSize,
          meshData: meshDataBuffer,
          metadata: {
            vertexCount: data.vertices.length / 3,
            faceCount: data.indices.length / 3,
            hasNormals: false, // YFT файлы не содержат нормали
            hasUVs: false, // YFT файлы не содержат UV координаты
            boundingBox: data.bounds ? {
              min: [data.bounds.min.x, data.bounds.min.y, data.bounds.min.z] as [number, number, number],
              max: [data.bounds.max.x, data.bounds.max.y, data.bounds.max.z] as [number, number, number]
            } : {
              min: [0, 0, 0] as [number, number, number],
              max: [0, 0, 0] as [number, number, number]
            }
          }
        })
        
        console.log(`[YftViewer] ✅ Cached ${vehicleName} successfully`)
      } catch (err) {
        console.error('[YftViewer] Cache save failed:', err)
      }
      
    } catch (err: any) {
      console.error('[YftViewer] Error loading mesh data:', err)
      setError(err.message || 'Ошибка загрузки модели')
      toast.error(err.message || 'Ошибка загрузки модели')
    } finally {
      setLoading(false)
    }
  }
  
  /**
   * Запрос mesh данных от сервера через ALT:V (чанкованная передача с плавным UI)
   */
  const requestMeshDataFromServer = (vehicleName: string): Promise<MeshData> => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout: сервер не ответил в течение 2 минут'))
      }, 120000) // 2 минуты для плавной загрузки
      
      let webviewState: {
        vertices: number[]
        indices: number[]
        bounds: any
        receivedV: number
        receivedI: number
        totalV: number
        totalI: number
      } | null = null
      
      const handleWebviewStart = (data: { totalVertices: number; totalIndices: number; bounds: any }) => {
        console.log(`[YftViewer] 🚀 Webview streaming start: V=${data.totalVertices}, I=${data.totalIndices}`)
        webviewState = {
          vertices: new Array(data.totalVertices).fill(0),
          indices: new Array(data.totalIndices).fill(0),
          bounds: data.bounds,
          receivedV: 0,
          receivedI: 0,
          totalV: data.totalVertices,
          totalI: data.totalIndices
        }
      }
      
      const handleWebviewChunk = (chunk: { kind: string; offset: number; data: number[] }) => {
        if (!webviewState) return
        
        if (chunk.kind === 'v') {
          for (let i = 0; i < chunk.data.length; i++) {
            webviewState.vertices[chunk.offset + i] = chunk.data[i]
          }
          webviewState.receivedV += chunk.data.length
        } else if (chunk.kind === 'i') {
          for (let i = 0; i < chunk.data.length; i++) {
            webviewState.indices[chunk.offset + i] = chunk.data[i]
          }
          webviewState.receivedI += chunk.data.length
        }
        
        // Обновляем прогресс плавно
        setProgress({
          v: Math.round((webviewState.receivedV / webviewState.totalV) * 100),
          i: Math.round((webviewState.receivedI / webviewState.totalI) * 100),
          phase: 'chunk'
        })
      }
      
      const handleWebviewEnd = () => {
        if (!webviewState) {
          reject(new Error('No data received'))
          return
        }
        
        console.log(`[YftViewer] ✅ Webview streaming complete!`)
        
        cleanup()
        resolve({
          vertices: webviewState.vertices,
          indices: webviewState.indices,
          bounds: webviewState.bounds
        })
      }
      
      const handleMeshError = (error: { message: string }) => {
        cleanup()
        reject(new Error(error.message || 'Ошибка сервера'))
      }

      const handleProgress = (data: { phase: 'start'|'chunk'|'end'; vProgress?: number; iProgress?: number }) => {
        if (!data) return
        if (data.phase === 'start') setProgress({ v: 0, i: 0, phase: 'start' })
        else if (data.phase === 'chunk') setProgress({ v: Math.round((data.vProgress || 0)*100), i: Math.round((data.iProgress || 0)*100), phase: 'chunk' })
        else if (data.phase === 'end') setProgress({ v: 100, i: 100, phase: 'end' })
      }
      
      const cleanup = () => {
        clearTimeout(timeout)
        ;(window as any).alt.off('vehicle:mesh:webview:start', handleWebviewStart)
        ;(window as any).alt.off('vehicle:mesh:webview:chunk', handleWebviewChunk)
        ;(window as any).alt.off('vehicle:mesh:webview:end', handleWebviewEnd)
        ;(window as any).alt.off('vehicle:mesh:error', handleMeshError)
        ;(window as any).alt.off('vehicle:mesh:progress', handleProgress)
      }
      
      // Регистрируем обработчики
      ;(window as any).alt.on('vehicle:mesh:webview:start', handleWebviewStart)
      ;(window as any).alt.on('vehicle:mesh:webview:chunk', handleWebviewChunk)
      ;(window as any).alt.on('vehicle:mesh:webview:end', handleWebviewEnd)
      ;(window as any).alt.on('vehicle:mesh:error', handleMeshError)
      ;(window as any).alt.on('vehicle:mesh:progress', handleProgress)
      
      // Отправляем запрос
      ;(window as any).alt.emit('vehicle:mesh:request', { vehicleName })
      
      console.log(`[YftViewer] 📤 Request sent for vehicle: ${vehicleName}`)
    })
  }
  
  /**
   * Сброс камеры
   */
  const handleResetCamera = () => {
    toast.success('Камера сброшена')
    // Камера автоматически сбросится через OrbitControls reset
  }
  
  return (
    <div 
      className={`w-full h-full flex flex-col ${gameViewMode ? 'game-view-transparent' : ''}`}
      style={gameViewMode ? { 
        background: 'transparent',
        backgroundColor: 'transparent'
      } : undefined}
    >
      {/* Контейнер viewer занимает всё пространство родителя */}
        {/* Header - скрываем в Game View режиме */}
        {!gameViewMode && (
        <div className="flex items-center justify-between px-3 sm:px-4 lg:px-6 py-3 sm:py-4 border-b border-base-700">
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
            <Box className="w-4 sm:w-5 h-4 sm:h-5 text-primary-400 flex-shrink-0" />
            <h2 className="text-base lg:text-lg font-bold text-white truncate">
              YFT 3D Viewer - {vehicleName}
            </h2>
            {meshData && (
              <div className="flex items-center space-x-2 text-xs text-gray-400">
                <span className="px-2 py-1 bg-primary-900/30 rounded">
                  {(meshData.vertices.length / 3).toLocaleString()} вершин
                </span>
                <span className="px-2 py-1 bg-fuchsia-900/30 rounded">
                  {(meshData.indices.length / 3).toLocaleString()} треугольников
                </span>
              </div>
            )}
          </div>
          
          {/* Toolbar */}
          <div className="flex items-center space-x-1 sm:space-x-2 flex-wrap gap-1">
            {/* Wireframe */}
            <button
              onClick={() => setViewMode('wireframe')}
              disabled={loading}
              className={`flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                viewMode === 'wireframe'
                  ? 'bg-green-600 text-white'
                  : 'bg-base-800 text-gray-400 hover:bg-base-700'
              }`}
              title="Wireframe режим"
            >
              <Eye className="w-4 h-4" />
              <span>Wireframe</span>
            </button>
            
            {/* Solid */}
            <button
              onClick={() => setViewMode('solid')}
              disabled={loading}
              className={`flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                viewMode === 'solid'
                  ? 'bg-blue-600 text-white'
                  : 'bg-base-800 text-gray-400 hover:bg-base-700'
              }`}
              title="Solid режим"
            >
              <Box className="w-4 h-4" />
              <span>Solid</span>
            </button>
            
            {/* Real View */}
            <button
              onClick={() => setViewMode('real')}
              disabled={loading}
              className={`flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                viewMode === 'real'
                  ? 'bg-purple-600 text-white'
                  : 'bg-base-800 text-gray-400 hover:bg-base-700'
              }`}
              title="Real View (solid + wireframe)"
            >
              <Eye className="w-4 h-4" />
              <span>Real View</span>
            </button>
            
            {/* Разделитель */}
            <div className="w-px h-8 bg-base-700" />
            
            {/* Game View */}
            <button
              onClick={() => setGameViewMode(!gameViewMode)}
              disabled={loading}
              className={`flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                gameViewMode
                  ? 'bg-orange-600 text-white animate-pulse'
                  : 'bg-base-800 text-gray-400 hover:bg-base-700'
              }`}
              title="Game View - наложение на машину в игре (ESC для выхода)"
            >
              <Eye className="w-4 h-4" />
              <span>Game View</span>
            </button>
            
            {/* Toggle Grid */}
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                showGrid
                  ? 'bg-purple-600 text-white'
                  : 'bg-base-800 text-gray-400 hover:bg-base-700'
              }`}
              title={showGrid ? 'Скрыть сетку' : 'Показать сетку'}
            >
              <GridIcon className="w-4 h-4" />
              <span>Grid</span>
            </button>
            
            {/* Cache Management */}
            {isCacheAvailable && (
              <>
                <div className="w-px h-8 bg-base-700" />
                
                {/* Cache Stats */}
                <button
                  onClick={refreshStats}
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium bg-base-800 text-gray-400 hover:bg-base-700 transition-all"
                  title={`Кэш: ${cacheStatus.stats ? `${cacheStatus.stats.totalItems} моделей, ${YFTCache.formatSize(cacheStatus.stats.totalSize)}` : 'Загрузка...'}`}
                >
                  <Database className="w-4 h-4" />
                  <span>
                    {cacheStatus.stats ? `${cacheStatus.stats.totalItems}` : '?'}
                  </span>
                </button>
                
                {/* Clear Cache */}
                <button
                  onClick={clearCache}
                  disabled={cacheStatus.savingToCache}
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium bg-red-800 text-red-200 hover:bg-red-700 transition-all disabled:opacity-50"
                  title="Очистить кэш моделей"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Clear</span>
                </button>
              </>
            )}
            
            {/* Reset Camera */}
            <button
              onClick={handleResetCamera}
              className="p-2 rounded-lg bg-base-800 text-gray-400 hover:bg-base-700 hover:text-white transition-all"
              title="Сбросить камеру"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            
            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-all"
              title="Закрыть"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        )}
        
        {/* 3D Canvas */}
        <div 
          className={`flex-1 relative ${gameViewMode ? '' : 'bg-gradient-to-b from-base-900 to-black'}`}
          style={gameViewMode ? {
            background: 'transparent',
            backgroundColor: 'transparent'
          } : undefined}
        >
          
          {/* Экстренная кнопка выхода из Game View + Debug Info */}
          {gameViewMode && (
            <div className="absolute top-4 right-4 z-50 flex flex-col items-end space-y-2">
              <button
                onClick={() => setGameViewMode(false)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-lg flex items-center space-x-2 transition-all animate-pulse"
                title="Выйти из Game View (ESC)"
              >
                <X className="w-4 h-4" />
                <span className="font-medium">Выход (ESC)</span>
              </button>
              
              {/* Debug Info Panel */}
              <div className="bg-black/80 backdrop-blur-sm px-3 py-2 rounded-lg border border-green-500/30 space-y-1">
                <div className="text-xs font-bold text-green-400 mb-1">
                  🎥 Camera Sync Debug
                </div>
                <div className="text-xs text-white font-mono">
                  <div className="flex justify-between space-x-3">
                    <span className="text-gray-400">Offset:</span>
                    <span className="text-blue-400">{debugInfo.cameraOffset.toFixed(2)}m</span>
                  </div>
                </div>
              </div>
              
              {/* Debug Axes Toggle */}
              <div className="text-xs text-white bg-black/70 px-3 py-2 rounded-lg">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={showDebugAxes}
                    onChange={(e) => setShowDebugAxes(e.target.checked)}
                    className="w-3 h-3 rounded"
                  />
                  <span>Debug Axes</span>
                </label>
              </div>
              
              {/* Calibration Panel */}
              <div className="text-xs text-white bg-black/90 p-3 rounded-lg border border-purple-500/50 w-full max-w-xs overflow-y-auto max-h-[60vh] overflow-x-hidden">
                <div className="font-bold text-purple-400 mb-2">🎛️ Live Calibration</div>
                
                {/* Model Rotation */}
                <div className="space-y-1 mb-3">
                  <div className="text-gray-300 font-semibold">Model Rotation (degrees):</div>
                  {(['x', 'y', 'z'] as const).map((axis) => (
                    <div key={axis} className="flex items-center gap-2">
                      <span className={`w-12 ${axis === 'x' ? 'text-red-400' : axis === 'y' ? 'text-green-400' : 'text-blue-400'}`}>
                        {axis.toUpperCase()}:
                      </span>
                      <button onClick={() => setCalibration(prev => ({ ...prev, modelRotation: { ...prev.modelRotation, [axis]: prev.modelRotation[axis] - 15 } }))} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded">-15</button>
                      <button onClick={() => setCalibration(prev => ({ ...prev, modelRotation: { ...prev.modelRotation, [axis]: prev.modelRotation[axis] - 5 } }))} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded">-5</button>
                      <span className="w-12 text-center text-yellow-300">{calibration.modelRotation[axis]}°</span>
                      <button onClick={() => setCalibration(prev => ({ ...prev, modelRotation: { ...prev.modelRotation, [axis]: prev.modelRotation[axis] + 5 } }))} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded">+5</button>
                      <button onClick={() => setCalibration(prev => ({ ...prev, modelRotation: { ...prev.modelRotation, [axis]: prev.modelRotation[axis] + 15 } }))} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded">+15</button>
                    </div>
                  ))}
                </div>
                
                {/* Model Offset */}
                <div className="space-y-1 mb-3">
                  <div className="text-gray-300 font-semibold">Model Offset (meters):</div>
                  {(['x', 'y', 'z'] as const).map((axis) => (
                    <div key={axis} className="flex items-center gap-2">
                      <span className={`w-12 ${axis === 'x' ? 'text-red-400' : axis === 'y' ? 'text-green-400' : 'text-blue-400'}`}>
                        {axis.toUpperCase()}:
                      </span>
                      <button onClick={() => setCalibration(prev => ({ ...prev, modelOffset: { ...prev.modelOffset, [axis]: prev.modelOffset[axis] - 0.5 } }))} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded">-0.5</button>
                      <button onClick={() => setCalibration(prev => ({ ...prev, modelOffset: { ...prev.modelOffset, [axis]: prev.modelOffset[axis] - 0.1 } }))} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded">-0.1</button>
                      <span className="w-12 text-center text-yellow-300">{calibration.modelOffset[axis].toFixed(1)}</span>
                      <button onClick={() => setCalibration(prev => ({ ...prev, modelOffset: { ...prev.modelOffset, [axis]: prev.modelOffset[axis] + 0.1 } }))} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded">+0.1</button>
                      <button onClick={() => setCalibration(prev => ({ ...prev, modelOffset: { ...prev.modelOffset, [axis]: prev.modelOffset[axis] + 0.5 } }))} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded">+0.5</button>
                    </div>
                  ))}
                </div>
                
                {/* Camera Invert */}
                <div className="space-y-1 mb-3">
                  <div className="text-gray-300 font-semibold">Camera Invert:</div>
                  {(['x', 'y', 'z'] as const).map((axis) => (
                    <div key={axis} className="flex items-center gap-2">
                      <span className={`w-12 ${axis === 'x' ? 'text-red-400' : axis === 'y' ? 'text-green-400' : 'text-blue-400'}`}>
                        {axis.toUpperCase()}:
                      </span>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox"
                          checked={calibration.cameraInvert[axis]}
                          onChange={(e) => setCalibration(prev => ({ ...prev, cameraInvert: { ...prev.cameraInvert, [axis]: e.target.checked } }))}
                          className="w-3 h-3 rounded"
                        />
                        <span>{calibration.cameraInvert[axis] ? 'Inverted' : 'Normal'}</span>
                      </label>
                    </div>
                  ))}
                </div>
                
                {/* Apply Roll */}
                <div className="space-y-1 mb-3">
                  <div className="text-gray-300 font-semibold">Camera Roll:</div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={calibration.applyRoll}
                      onChange={(e) => setCalibration(prev => ({ ...prev, applyRoll: e.target.checked }))}
                      className="w-3 h-3 rounded"
                    />
                    <span>{calibration.applyRoll ? 'Applied' : 'Disabled'} (крен камеры)</span>
                  </label>
                </div>
                
                {/* Base FOV */}
                <div className="space-y-1 mb-3">
                  <div className="text-gray-300 font-semibold">Base FOV (static):</div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setCalibration(prev => ({ ...prev, baseFov: prev.baseFov - 10 }))} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded">-10</button>
                    <button onClick={() => setCalibration(prev => ({ ...prev, baseFov: prev.baseFov - 5 }))} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded">-5</button>
                    <span className="w-16 text-center text-cyan-300">{calibration.baseFov.toFixed(0)}°</span>
                    <button onClick={() => setCalibration(prev => ({ ...prev, baseFov: prev.baseFov + 5 }))} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded">+5</button>
                    <button onClick={() => setCalibration(prev => ({ ...prev, baseFov: prev.baseFov + 10 }))} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded">+10</button>
                  </div>
                </div>
                
                {/* FOV Multiplier */}
                <div className="space-y-1 mb-3">
                  <div className="text-gray-300 font-semibold">FOV Multiplier:</div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setCalibration(prev => ({ ...prev, fovMultiplier: prev.fovMultiplier - 0.1 }))} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded">-0.1</button>
                    <button onClick={() => setCalibration(prev => ({ ...prev, fovMultiplier: prev.fovMultiplier - 0.05 }))} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded">-0.05</button>
                    <span className="w-16 text-center text-yellow-300">{calibration.fovMultiplier.toFixed(2)}x</span>
                    <button onClick={() => setCalibration(prev => ({ ...prev, fovMultiplier: prev.fovMultiplier + 0.05 }))} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded">+0.05</button>
                    <button onClick={() => setCalibration(prev => ({ ...prev, fovMultiplier: prev.fovMultiplier + 0.1 }))} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded">+0.1</button>
                  </div>
                  <div className="text-xs text-gray-400 text-center">Final: {(calibration.baseFov * calibration.fovMultiplier).toFixed(1)}°</div>
                </div>
                
                {/* Copy Config Button */}
                <button
                  onClick={() => {
                    const config = JSON.stringify(calibration, null, 2)
                    navigator.clipboard.writeText(config)
                    toast.success('Config copied to clipboard!')
                  }}
                  className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold"
                >
                  📋 Copy Config
                </button>
              </div>
              
              <div className="text-xs text-white bg-black/70 px-3 py-2 rounded-lg">
                Game View Mode Active
              </div>
            </div>
          )}
          
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="text-center space-y-3">
                <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-white text-sm">Загрузка модели...</p>
                <p className="text-gray-400 text-xs">Извлечение mesh данных из .yft файла</p>
                {/* Прогресс-бар стриминга */}
                {(progress.phase !== 'idle') && (
                  <div className="mt-2 w-80 mx-auto text-left">
                    <div className="text-xs text-gray-400 mb-1">Vertices: {progress.v}%</div>
                    <div className="w-full h-2 bg-base-800 rounded">
                      <div className="h-2 bg-primary-600 rounded" style={{ width: `${progress.v}%` }} />
                    </div>
                    <div className="text-xs text-gray-400 mt-2 mb-1">Indices: {progress.i}%</div>
                    <div className="w-full h-2 bg-base-800 rounded">
                      <div className="h-2 bg-fuchsia-600 rounded" style={{ width: `${progress.i}%` }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {error && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="text-center space-y-3 p-8 bg-red-900/20 border border-red-500/30 rounded-lg">
                <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
                  <X className="w-6 h-6 text-red-400" />
                </div>
                <p className="text-red-400 text-sm font-medium">Ошибка загрузки модели</p>
                <p className="text-gray-400 text-xs max-w-md">{error}</p>
                <button
                  onClick={loadMeshData}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-all"
                >
                  Повторить
                </button>
              </div>
            </div>
          )}
          
          {!loading && !error && meshData && (
            <Canvas 
              gl={{ 
                alpha: true,
                premultipliedAlpha: false,
                preserveDrawingBuffer: true
              }}
              style={{ 
                background: gameViewMode ? 'transparent' : 'linear-gradient(to bottom, #0a0a0a, #000000)'
              }}
            >
              <Suspense fallback={null}>
                {/* Камера */}
                <PerspectiveCamera makeDefault position={[5, 3, 5]} />
                
                {/* Синхронизация камеры в Game View режиме */}
                <CameraSync 
                  enabled={gameViewMode} 
                  cameraRef={cameraRef}
                  calibration={{
                    cameraInvert: calibration.cameraInvert,
                    baseFov: calibration.baseFov,
                    fovMultiplier: calibration.fovMultiplier,
                    applyRoll: calibration.applyRoll
                  }}
                />
                
                {/* Освещение */}
                <ambientLight intensity={0.5} />
                <directionalLight position={[10, 10, 5]} intensity={1} />
                <pointLight position={[-10, -10, -5]} intensity={0.5} />
                
                {/* Сетка координат - скрываем в Game View режиме */}
                {showGrid && !gameViewMode && (
                  <ThreeGrid 
                    args={[20, 20]} 
                    cellColor="#444444" 
                    sectionColor="#666666"
                    fadeDistance={50}
                    fadeStrength={1}
                    position={[0, 0, 0]}
                  />
                )}
                
                {/* 3D Модель - передаем gameViewMode и vehicleRotation для синхронизации */}
                <VehicleModel 
                  meshData={meshData} 
                  viewMode={viewMode}
                  gameViewMode={gameViewMode}
                  vehicleRotation={vehicleRotation || undefined}
                  showDebugAxes={showDebugAxes}
                  calibration={gameViewMode ? calibration : undefined}
                />
                
                {/* Контроллы камеры - ОТКЛЮЧЕНЫ в Game View режиме */}
                <OrbitControls 
                  enabled={!gameViewMode}
                  enableDamping
                  dampingFactor={0.05}
                  rotateSpeed={0.5}
                  zoomSpeed={0.8}
                  minDistance={2}
                  maxDistance={50}
                  mouseButtons={{
                    LEFT: THREE.MOUSE.ROTATE,
                    MIDDLE: THREE.MOUSE.DOLLY,
                    RIGHT: THREE.MOUSE.PAN // ПКМ для перемещения камеры
                  }}
                />
              </Suspense>
            </Canvas>
          )}
        </div>
        
        {/* Footer - Controls Help - скрываем в Game View режиме */}
        {!gameViewMode && (
        <div className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 border-t border-base-700 bg-base-800/50">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-gray-400">
            <div className="flex items-center space-x-2 sm:space-x-4 flex-wrap gap-1">
              <span>🖱️ ЛКМ - Вращение</span>
              <span>🖱️ ПКМ - Перемещение</span>
              <span>🖱️ Колесико - Зум</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`${viewMode === 'wireframe' ? 'text-green-400' : viewMode === 'solid' ? 'text-blue-400' : 'text-purple-400'}`}>●</span>
              <span>
                {viewMode === 'wireframe' && 'Wireframe режим активен'}
                {viewMode === 'solid' && 'Solid режим активен'}
                {viewMode === 'real' && 'Real View режим активен'}
              </span>
            </div>
          </div>
        </div>
        )}
    </div>
  )
}

export default YftViewer

