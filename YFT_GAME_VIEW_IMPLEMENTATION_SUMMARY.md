# YFT Game View - Camera Synchronization Implementation

## ✅ РЕАЛИЗАЦИЯ ЗАВЕРШЕНА

**Дата**: 24 октября 2025  
**Версия**: 1.0.0  
**Статус**: Готово к тестированию

---

## 📋 Что реализовано

### Основной функционал

✅ **Полная синхронизация камеры с игрой**
- Позиция камеры (X, Y, Z)
- Вращение камеры (Pitch, Roll, Yaw)
- Field of View (FOV)
- Учет вращения автомобиля

✅ **Координатная трансформация**
- GTA V мировые координаты → Three.js локальные координаты
- Машина в центре (0, 0, 0) во вьювере
- Камера движется относительно модели

✅ **Производительность**
- everyTick на Alt:V Client с throttling 60 FPS
- RequestAnimationFrame на WebView
- Lerp/Slerp сглаживание для плавности

✅ **Управление**
- OrbitControls автоматически отключаются в Game View
- Lifecycle управление (start/stop при входе/выходе)
- ESC для выхода из Game View

✅ **Debug инструменты**
- Визуальные маркеры в игре (камера, машина, направление взгляда)
- UI индикатор (FPS, Offset, FOV)
- Console logging с детальной информацией

---

## 📁 Созданные файлы

### 1. Alt:V Client - camera-sync.js (362 строки)
**Путь**: `altv-server/resources/meshhub/client/modules/camera-sync.js`

**Функции**:
- `startCameraSync()` - запуск синхронизации
- `stopCameraSync()` - остановка синхронизации  
- `setDebugMode(enabled)` - debug режим
- `collectCameraSyncData()` - сбор данных каждый тик
- `rotatePointAroundOrigin()` - трансформация координат

**Особенности**:
- everyTick с throttling 16ms (~60 FPS)
- Получение данных через GTA V natives
- Конвертация в относительные координаты
- Debug визуализация (маркеры и линии)
- FPS счетчик

### 2. WebView - coordinateTransform.ts (229 строк)
**Путь**: `meshhub_altv_integration/client/src/utils/coordinateTransform.ts`

**Экспорты**:
- `convertCameraPosition()` - GTA → Three.js позиция
- `convertCameraRotation()` - градусы → радианы
- `transformSyncDataForThreeJS()` - полная трансформация
- `CameraSyncSmoother` - класс сглаживания
- `lerp()`, `lerpVec3()`, `slerpRotation()` - интерполяция

**Особенности**:
- Учет поворота модели [90°, 180°, 0°]
- Сглаживание с factor 0.7
- Типизация TypeScript
- Debug утилиты

### 3. Документация

**YFT_GAME_VIEW_SYNC.md** - техническая документация  
**DOCS/YFT_GAME_VIEW_CAMERA_SYNC.md** - полная сводка

---

## 🔧 Измененные файлы

### 1. events.js
**Изменения**:
- Импорт `camera-sync.js`
- Передача webview в camera-sync
- Регистрация событий в `setWebView()`
- Cleanup при disconnect

### 2. YftViewer.tsx
**Изменения**:
- Новый компонент `CameraSync`
- Debug UI индикатор
- `cameraRef` для доступа к камере
- Lifecycle управление (start/stop events)
- OrbitControls: `enabled={!gameViewMode}`
- Подписка на sync события

### 3. misc-events.js
**Изменения**:
- Комментарий о camera sync

---

## 🎮 Как тестировать

### Быстрый тест

1. **Запустите Alt:V сервер**
2. **Войдите в игру**
3. **Откройте MeshHub** (F10)
4. **Выберите любой автомобиль** (например, baze_senna)
5. **Нажмите "YFT Viewer (3D)"**
6. **Нажмите "Game View"** (оранжевая кнопка)
7. **Двигайте камеру в игре** (мышь, WASD, V для zoom)
8. ✅ **Модель должна синхронизироваться с игровой камерой**

### Детальное тестирование

#### Сценарий 1: Статичная машина
1. Заспавните машину (`/meshhub`)
2. Выйдите из нее (F)
3. Откройте YFT Viewer → Game View
4. Ходите вокруг машины
5. ✅ Модель остается в центре, камера двигается

#### Сценарий 2: Движущаяся машина
1. Сядьте в машину
2. Включите Game View
3. Двигайтесь по городу
4. ✅ Модель остается в центре, синхронизация работает

#### Сценарий 3: Поворот машины
1. В машине, Game View активен
2. Поворачивайте руль влево/вправо
3. ✅ Синхронизация учитывает вращение

#### Сценарий 4: Zoom камеры
1. Game View активен
2. Используйте V для zoom in/out
3. ✅ FOV меняется корректно

#### Сценарий 5: Переключение режимов
1. Normal View → Game View → Normal View
2. ✅ OrbitControls включаются/отключаются
3. ✅ Нет ошибок в консоли

### Debug проверка

**Включить debug маркеры** (для разработчиков):

В `camera-sync.js` измените:
```javascript
let debugMode = true  // было: false
```

**Что увидите в игре**:
- 🟢 Зеленая сфера = позиция камеры
- 🔴 Красная сфера = центр машины
- 🟡 Желтая линия = соединяет камеру и машину
- 🟣 Фиолетовая линия = направление взгляда

**Debug UI** (правый верхний угол в Game View):
- **FPS**: должен быть ~60 (зеленый)
- **Offset**: расстояние камеры от машины в метрах
- **FOV**: текущий угол обзора

---

## 📊 Метрики производительности

### Целевые показатели

| Параметр | Целевое значение | Минимум |
|----------|------------------|---------|
| FPS синхронизации | 60 | 30 |
| Латентность | <16ms | <33ms |
| Сглаживание | factor 0.7 | 0.5-1.0 |

### Настройка при лагах

**Если FPS < 30** (система лагает):

1. Увеличьте throttling в `camera-sync.js`:
   ```javascript
   const THROTTLE_MS = 33  // 30 FPS вместо 60
   ```

2. Уменьшите сглаживание в `coordinateTransform.ts`:
   ```javascript
   private readonly smoothFactor = 0.5  // было 0.7
   ```

3. Отключите debug:
   ```javascript
   let debugMode = false
   ```

---

## 🐛 Troubleshooting

### Модель не синхронизируется

**Проверьте**:
- ✅ Game View активен (кнопка мигает оранжевым)
- ✅ Вы в автомобиле (синхронизация работает только в машине)
- ✅ Console: должны быть логи `[CameraSync] 🎥 Starting...`
- ✅ Debug UI: FPS > 0

### Модель дергается

**Решение**:
- Увеличьте `smoothFactor` до 0.8-0.9
- Уменьшите `THROTTLE_MS` до 10-12

### Низкий FPS синхронизации

**Решение**:
- Увеличьте `THROTTLE_MS` до 33 (30 FPS)
- Отключите debug маркеры
- Проверьте общий FPS игры

### Модель смещена

**Калибровка** (если нужна):

В `coordinateTransform.ts` → `convertCameraPosition()`:
```typescript
return {
  x: -gtaRelativePos.x + OFFSET_X,  // Добавьте offset
  y: gtaRelativePos.y + OFFSET_Y,
  z: -gtaRelativePos.z + OFFSET_Z
}
```

Подберите OFFSET_X/Y/Z экспериментально.

---

## 📝 Технические детали

### События

**WebView → Client**:
- `yft-viewer:camera:sync:start` - старт синхронизации
- `yft-viewer:camera:sync:stop` - стоп синхронизации

**Client → WebView**:
- `yft-viewer:camera:sync` - данные синхронизации (каждый кадр)
- `yft-viewer:sync:fps` - FPS (раз в секунду)

### Структура sync данных

```typescript
{
  camera: {
    position: { x, y, z },  // Относительно машины
    rotation: { x, y, z },  // Градусы
    fov: number
  },
  vehicle: {
    rotation: { x, y, z }   // Градусы
  },
  debug?: {
    camWorldPos: { x, y, z },
    vehicleWorldPos: { x, y, z }
  }
}
```

### Трансформация координат

```
GTA V Camera (world)
  ↓ - Vehicle Position
Relative Camera Position (GTA V local)
  ↓ rotatePointAroundOrigin(-vehicle.rotation)
Relative Camera Position (vehicle local space)
  ↓ convertCameraPosition() → invert X and Z
Three.js Camera Position
  ↓ lerp smoothing
Final Camera Position (applied to Three.js)
```

---

## 🚀 Следующие шаги

### Для пользователя

1. **Пересобрать WebView**:
   ```bash
   cd meshhub_altv_integration
   npm run build
   ```

2. **Перезапустить Alt:V сервер** (или перезагрузить ресурс)

3. **Тестировать в игре**:
   - F10 → Vehicles → YFT Viewer → Game View

### Возможные улучшения (будущее)

- 🔄 Adaptive throttling (динамическая частота)
- 🎯 Predictive smoothing (предсказание)
- 📹 Запись сессий (replay)
- 🎨 Кастомизация debug UI
- 🚗 Поддержка нескольких машин

---

## 📞 Поддержка

При проблемах проверьте:
1. Console logs в игре (F8)
2. Browser console (F12 в Dev Tools если используете localhost:3000)
3. Debug UI в Game View (FPS, Offset, FOV)

**Логи должны содержать**:
- `[CameraSync] ✅ Camera sync module loaded`
- `[CameraSync] 🎥 Starting camera synchronization...`
- `[YftViewer] ✅ Subscribed to camera sync events`

---

## 📄 Итого

**Создано**:
- 3 новых файла (~600 строк кода)
- 2 файла документации

**Изменено**:
- 3 файла (events.js, YftViewer.tsx, misc-events.js)

**Функционал**:
- ✅ Синхронизация камеры
- ✅ Координатная трансформация
- ✅ Сглаживание движений
- ✅ Debug визуализация
- ✅ Оптимизация производительности

**Готово к использованию! 🎉**

