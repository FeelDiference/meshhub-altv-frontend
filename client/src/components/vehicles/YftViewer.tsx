/**
 * YFT 3D Viewer Component
 * Отображает 3D модель автомобиля в wireframe режиме используя Three.js
 */

import React, { useState, useEffect, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Grid as ThreeGrid } from '@react-three/drei'
import * as THREE from 'three'
import { X, RotateCcw, Eye, Box, Grid as GridIcon } from 'lucide-react'
import toast from 'react-hot-toast'

interface YftViewerProps {
  vehicleName: string
  onClose: () => void
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
function VehicleModel({ meshData, viewMode }: { meshData: MeshData; viewMode: 'wireframe' | 'solid' | 'real' }) {
  
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
  const position = React.useMemo(() => {
    if (!geometry) return [0, 0, 0] as const
    
    // Вычисляем Bounding Box
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
    
    return [0, yOffset, 0] as const
  }, [geometry])
  
  return (
    <group rotation={[Math.PI / 2, Math.PI, 0]} position={position}>
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
    </group>
  )
}

/**
 * Главный компонент YFT Viewer
 */
export function YftViewer({ vehicleName, onClose }: YftViewerProps) {
  const [meshData, setMeshData] = useState<MeshData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showGrid, setShowGrid] = useState(true)
  const [viewMode, setViewMode] = useState<'wireframe' | 'solid' | 'real'>('real')
  const [progress, setProgress] = useState<{ v: number; i: number; phase: 'idle' | 'start' | 'chunk' | 'end' }>(
    { v: 0, i: 0, phase: 'idle' }
  )
  
  // Загрузка mesh данных при монтировании
  useEffect(() => {
    loadMeshData()
  }, [vehicleName])
  
  // Отключаем глобальный ПКМ обработчик в режиме 3D viewer
  useEffect(() => {
    // ВАЖНО: Устанавливаем глобальный флаг для events.js
    ;(globalThis as any).__focusMode = 'yft-viewer'
    console.log('[YftViewer] Set globalThis.__focusMode = yft-viewer (WebView context)')
    
    // КРИТИЧЕСКИ ВАЖНО: Отправляем событие в Alt:V Client-side JS
    // Потому что WebView и Client JS - это РАЗНЫЕ контексты!
    if ((window as any).alt) {
      ;(window as any).alt.emit('yft-viewer:focus-mode', { mode: 'yft-viewer' })
      console.log('[YftViewer] ✅ Sent yft-viewer:focus-mode to Alt:V Client')
    }
    
    const handleRightClick = (e: MouseEvent) => {
      // Блокируем только ПКМ, который переключает фокус на игру
      e.preventDefault()
      e.stopPropagation()
      return false
    }
    
    // Добавляем обработчик на весь документ
    document.addEventListener('contextmenu', handleRightClick, true) // capture phase
    document.addEventListener('mousedown', (e) => {
      if (e.button === 2) { // ПКМ
        e.preventDefault()
        e.stopPropagation()
        return false
      }
    }, true) // capture phase
    
    return () => {
      // Восстанавливаем обычный режим
      ;(globalThis as any).__focusMode = 'off'
      console.log('[YftViewer] Reset globalThis.__focusMode = off (WebView context)')
      
      // Отправляем событие в Alt:V Client-side JS
      if ((window as any).alt) {
        ;(window as any).alt.emit('yft-viewer:focus-mode', { mode: 'off' })
        console.log('[YftViewer] ✅ Sent yft-viewer:focus-mode OFF to Alt:V Client')
      }
      
      document.removeEventListener('contextmenu', handleRightClick, true)
      document.removeEventListener('mousedown', handleRightClick, true)
    }
  }, [])
  
  /**
   * Загрузка mesh данных через ALT:V → C# CodeWalker
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
    <div className="w-full h-full flex flex-col">
      {/* Контейнер viewer занимает всё пространство родителя */}
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-base-700">
          <div className="flex items-center space-x-3">
            <Box className="w-5 h-5 text-primary-400" />
            <h2 className="text-lg font-bold text-white">
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
          <div className="flex items-center space-x-2">
            {/* Wireframe */}
            <button
              onClick={() => setViewMode('wireframe')}
              disabled={loading}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
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
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
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
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                viewMode === 'real'
                  ? 'bg-purple-600 text-white'
                  : 'bg-base-800 text-gray-400 hover:bg-base-700'
              }`}
              title="Real View (solid + wireframe)"
            >
              <Eye className="w-4 h-4" />
              <span>Real View</span>
            </button>
            
            {/* Toggle Grid */}
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                showGrid
                  ? 'bg-purple-600 text-white'
                  : 'bg-base-800 text-gray-400 hover:bg-base-700'
              }`}
              title={showGrid ? 'Скрыть сетку' : 'Показать сетку'}
            >
              <GridIcon className="w-4 h-4" />
              <span>Grid</span>
            </button>
            
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
        
        {/* 3D Canvas */}
        <div className="flex-1 relative bg-gradient-to-b from-base-900 to-black">
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
            <Canvas>
              <Suspense fallback={null}>
                {/* Камера */}
                <PerspectiveCamera makeDefault position={[5, 3, 5]} />
                
                {/* Освещение */}
                <ambientLight intensity={0.5} />
                <directionalLight position={[10, 10, 5]} intensity={1} />
                <pointLight position={[-10, -10, -5]} intensity={0.5} />
                
                {/* Сетка координат */}
                {showGrid && (
                  <ThreeGrid 
                    args={[20, 20]} 
                    cellColor="#444444" 
                    sectionColor="#666666"
                    fadeDistance={50}
                    fadeStrength={1}
                    position={[0, 0, 0]}
                  />
                )}
                
                {/* 3D Модель */}
                <VehicleModel 
                  meshData={meshData} 
                  viewMode={viewMode}
                />
                
                {/* Контроллы камеры */}
                <OrbitControls 
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
        
        {/* Footer - Controls Help */}
        <div className="px-6 py-3 border-t border-base-700 bg-base-800/50">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center space-x-4">
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
    </div>
  )
}

export default YftViewer

