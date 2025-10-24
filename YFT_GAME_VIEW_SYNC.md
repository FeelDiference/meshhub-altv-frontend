# YFT Viewer Game View - Camera Synchronization

## Описание

Полная синхронизация 3D модели автомобиля в YFT Viewer с реальной машиной и игровой камерой в режиме Game View.

## Архитектура

### Система координат

**GTA V (мировая система)**:
- X - восток
- Y - север  
- Z - вверх

**Three.js (локальная система вьювера)**:
- Машина в центре координат (0, 0, 0)
- Камера движется ОТНОСИТЕЛЬНО модели
- X - право, Y - вверх, Z - вперед

**Трансформация**:
- Модель повернута на `[90° X, 180° Y, 0° Z]`
- Позиция камеры: `relativeCam = gameCam - vehiclePos` (с учетом вращения машины)
- Конвертация: `ThreeX = -GTAX`, `ThreeY = GTAY`, `ThreeZ = -GTAZ`

### Поток данных

```
┌─────────────────────────────────────────────────────────────┐
│ Alt:V Client (camera-sync.js)                               │
│                                                               │
│ everyTick (throttled 60 FPS):                                │
│   1. Получаем camera pos/rot/fov                             │
│   2. Получаем vehicle pos/rot                                │
│   3. Конвертируем в relative координаты                      │
│   4. Учитываем вращение машины                               │
│   5. webview.emit('yft-viewer:camera:sync', data)            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ WebView (YftViewer.tsx + CameraSync component)              │
│                                                               │
│ RequestAnimationFrame:                                        │
│   1. Получаем sync данные                                    │
│   2. Трансформируем GTA → Three.js координаты                │
│   3. Применяем сглаживание (lerp/slerp)                      │
│   4. Обновляем camera.position/rotation/fov                  │
│   5. camera.updateProjectionMatrix()                         │
└─────────────────────────────────────────────────────────────┘
```

## Компоненты системы

### Alt:V Client

**camera-sync.js** - Ядро синхронизации
- `startCameraSync()` - запуск синхронизации
- `stopCameraSync()` - остановка синхронизации
- `setDebugMode(enabled)` - включение debug маркеров в игре
- everyTick цикл с throttling 60 FPS
- Сбор данных через natives: `getGameplayCamCoord()`, `getGameplayCamRot()`, `getGameplayCamFov()`
- Конвертация в относительные координаты с учетом вращения машины

**events.js** - Регистрация обработчиков
- Регистрация в `setWebView()` после инициализации webview
- Обработчики `yft-viewer:camera:sync:start/stop` от WebView

### WebView (React)

**coordinateTransform.ts** - Утилиты трансформации
- `convertCameraPosition()` - конвертация позиции GTA → Three.js
- `convertCameraRotation()` - конвертация вращения градусы → радианы
- `transformSyncDataForThreeJS()` - полная трансформация
- `CameraSyncSmoother` - класс для сглаживания движений (lerp/slerp)

**YftViewer.tsx** - Применение синхронизации
- `CameraSync` компонент - применяет sync данные к Three.js камере
- `cameraRef` - ref для доступа к камере из CameraSync
- OrbitControls отключены в Game View: `enabled={!gameViewMode}`
- Lifecycle управление: start/stop sync при входе/выходе из Game View
- Debug UI: FPS, Camera Offset, FOV

## Использование

### Активация Game View

1. Откройте YFT Viewer для любого автомобиля
2. Нажмите кнопку **"Game View"** в toolbar
3. Синхронизация камеры запустится автоматически
4. Модель будет следовать за игровой камерой в реальном времени

### Выход из Game View

- Нажмите **ESC**
- Или нажмите кнопку **"Выход (ESC)"** в правом верхнем углу
- Синхронизация остановится автоматически

### Debug режим

**Включение debug маркеров в игре** (для разработчиков):

В коде `camera-sync.js` измените:
```javascript
let debugMode = true  // было: false
```

**Debug маркеры в игре**:
- 🟢 **Зеленая сфера** - позиция игровой камеры
- 🔴 **Красная сфера** - центр машины (= 0,0,0 в Three.js)
- 🟡 **Желтая линия** - соединяет камеру и машину (показывает offset)
- 🟣 **Фиолетовая линия** - направление взгляда камеры

**Debug UI в Game View**:
- **FPS** - частота синхронизации (должно быть ~60)
  - 🟢 Зеленый: ≥50 FPS (отлично)
  - 🟡 Желтый: 30-49 FPS (нормально)
  - 🔴 Красный: <30 FPS (плохо, нужна оптимизация)
- **Offset** - расстояние камеры от центра машины в метрах
- **FOV** - текущий Field of View камеры

## Производительность

### Throttling

**Alt:V Client** (`camera-sync.js`):
```javascript
const THROTTLE_MS = 16 // ~60 FPS максимум
```

Можно изменить для экономии:
- `33` = ~30 FPS (экономия ресурсов)
- `50` = ~20 FPS (минимум для плавности)
- `0` = без ограничений (максимальная точность, но нагрузка)

**WebView** (`coordinateTransform.ts`):
```javascript
private readonly smoothFactor = 0.7 // Фактор сглаживания
```

Можно изменить:
- `1.0` = мгновенная реакция (может дергаться)
- `0.7` = плавная реакция (рекомендуется)
- `0.5` = очень плавная (может отставать)

### Оптимизация при лагах

Если система лагает:

1. **Увеличить THROTTLE_MS**:
   ```javascript
   const THROTTLE_MS = 33 // 30 FPS вместо 60
   ```

2. **Уменьшить smoothFactor**:
   ```javascript
   private readonly smoothFactor = 0.5 // Меньше вычислений
   ```

3. **Отключить debug визуализацию**:
   ```javascript
   let debugMode = false
   ```

## Тестирование

### Сценарии проверки

1. **Статичная машина**:
   - Заспавните машину
   - Откройте YFT Viewer → Game View
   - Двигайте камеру вокруг машины (W/A/S/D + мышь)
   - ✅ Модель должна оставаться на месте, камера двигается

2. **Движущаяся машина**:
   - Сядьте в машину и двигайтесь
   - Включите Game View
   - ✅ Модель остается в центре, камера синхронизируется

3. **Поворот машины**:
   - Поворачивайте машину влево/вправо
   - ✅ Синхронизация учитывает вращение

4. **Zoom камеры**:
   - Приближайте/отдаляйте камеру (колесико мыши или V)
   - ✅ Модель масштабируется корректно

5. **Переключение режимов**:
   - Переключайтесь между Normal View и Game View
   - ✅ Плавный переход, OrbitControls включаются/отключаются

### Проверка корректности синхронизации

**Визуальная проверка**:
- Модель должна точно совпадать с реальной машиной по позиции
- Поворот головы = поворот камеры Three.js
- Zoom в игре = изменение FOV во вьювере

**Debug информация**:
- FPS должен быть стабильным (~60)
- Offset показывает расстояние от камеры до машины
- FOV меняется при изменении zoom в игре

## Известные ограничения

1. **Поворот модели**: Модель повернута `[90°, 180°, 0°]` для корректного отображения. Это учитывается в трансформации координат.

2. **Первый кадр**: Первый кадр синхронизации может быть не точным - камера автоматически скорректируется.

3. **Быстрые движения**: При очень быстрых движениях камеры возможна небольшая задержка из-за сглаживания (smoothFactor).

## Расширение функционала

### Добавление новых параметров синхронизации

**Alt:V Client** (`camera-sync.js`):
```javascript
const syncData = {
  camera: {
    position: rotatedRelativePos,
    rotation: { ... },
    fov: camFov,
    // НОВЫЙ ПАРАМЕТР
    aspectRatio: native.getAspectRatio()
  }
}
```

**WebView** (`coordinateTransform.ts`):
```typescript
export interface CameraSyncData {
  camera: {
    // ... существующие
    aspectRatio?: number  // НОВЫЙ
  }
}
```

**YftViewer** (`CameraSync` компонент):
```typescript
if (transformed.aspectRatio) {
  cam.aspect = transformed.aspectRatio
}
```

## Troubleshooting

### Модель не двигается
- Проверьте что Game View активен (кнопка должна мигать оранжевым)
- Проверьте console на ошибки
- Убедитесь что вы в автомобиле

### Модель дергается
- Увеличьте `smoothFactor` в `coordinateTransform.ts`
- Уменьшите `THROTTLE_MS` в `camera-sync.js`

### Низкий FPS синхронизации
- Увеличьте `THROTTLE_MS` (30 FPS вместо 60)
- Отключите debug визуализацию
- Проверьте общую производительность игры

### Модель смещена относительно машины
- Калибруйте в `convertCameraPosition()` - добавьте offset
- Проверьте правильность поворота модели в `VehicleModel` компоненте

## Файлы системы

### Alt:V Client
- `altv-server/resources/meshhub/client/modules/camera-sync.js`
- `altv-server/resources/meshhub/client/modules/events.js`
- `altv-server/resources/meshhub/client/modules/webview/handlers/misc/misc-events.js`

### WebView (React)
- `meshhub_altv_integration/client/src/utils/coordinateTransform.ts`
- `meshhub_altv_integration/client/src/components/vehicles/YftViewer.tsx`

## Техническая информация

### Natives используемые

- `native.getGameplayCamCoord()` - позиция камеры (Vector3)
- `native.getGameplayCamRot(2)` - вращение камеры (Vector3, order XYZ)
- `native.getGameplayCamFov()` - FOV камеры (float)
- `native.getEntityRotation(entityId, 2)` - вращение машины (Vector3)
- `native.drawMarker()` - debug маркеры
- `native.drawLine()` - debug линии

### Events

**WebView → Client**:
- `yft-viewer:camera:sync:start` - запустить синхронизацию
- `yft-viewer:camera:sync:stop` - остановить синхронизацию
- `yft-viewer:focus-mode` - смена focus mode

**Client → WebView**:
- `yft-viewer:camera:sync` - данные синхронизации (каждый кадр)
- `yft-viewer:sync:fps` - FPS синхронизации (раз в секунду)

### Частота обновления

- **Alt:V Client**: everyTick с throttling 60 FPS (~16ms между кадрами)
- **WebView**: RequestAnimationFrame (~60 FPS браузера)
- **Сглаживание**: Lerp/Slerp с factor 0.7

## Changelog

### v1.0.0 (Initial Release)
- ✅ Базовая синхронизация позиции камеры
- ✅ Синхронизация вращения камеры
- ✅ Синхронизация FOV
- ✅ Учет вращения машины
- ✅ Сглаживание движений (lerp/slerp)
- ✅ OrbitControls отключаются в Game View
- ✅ Debug UI с FPS/Offset/FOV
- ✅ Debug визуализация в игре (маркеры)
- ✅ Lifecycle управление (start/stop)
- ✅ Throttling 60 FPS на client
- ✅ RAF оптимизация на webview

---

**Дата создания**: 24.10.2025  
**Версия**: 1.0.0  
**Автор**: AI Assistant + User

