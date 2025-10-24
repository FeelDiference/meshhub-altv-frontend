# Camera Sync Fix V2 - Исправление "улетающей" модели

## Проблема

На скриншоте видно: **синяя wireframe модель улетела влево и вперед** от реальной черной машины.

**Диагностика показала**:
```
Camera world: (1062.91, -1138.93, 29.10)
Vehicle world: (1063.72, -1142.36, 24.87)
Разница (факт): (-0.81, 3.43, 4.23)

Но передавалось: (-1.95, 2.86, 4.28)  ❌ НЕ СОВПАДАЕТ!
```

**Причина**: Функция `rotatePointAroundOrigin()` искажала координаты камеры!

---

## Исправления

### Исправление 1: Убран `rotatePointAroundOrigin()`

**Файл**: `camera-sync.js`

**Было**:
```javascript
const relativeCamPos = {
  x: camCoord.x - vehiclePos.x,
  y: camCoord.y - vehiclePos.y,
  z: camCoord.z - vehiclePos.z
}

// НЕПРАВИЛЬНО: вращение искажает координаты!
const rotatedRelativePos = rotatePointAroundOrigin(
  relativeCamPos,
  vehicleRot
)

syncData.camera.position = rotatedRelativePos
```

**Стало**:
```javascript
const relativeCamPos = {
  x: camCoord.x - vehiclePos.x,
  y: camCoord.y - vehiclePos.y,
  z: camCoord.z - vehiclePos.z
}

// ПРАВИЛЬНО: простая разница, без вращения!
syncData.camera.position = relativeCamPos
```

**Почему**: 
- Камера в мировых координатах
- Машина в мировых координатах
- Разница = относительная позиция
- Вращение применяется к МОДЕЛИ, не к камере!

---

### Исправление 2: Правильный маппинг вращения

**Файл**: `coordinateTransform.ts`

**Было**:
```typescript
return {
  x: gtaRotation.x * DEG_TO_RAD,  // pitch
  y: gtaRotation.y * DEG_TO_RAD,  // roll
  z: gtaRotation.z * DEG_TO_RAD   // yaw
}
```

**Стало**:
```typescript
return {
  x: gtaRotation.x * DEG_TO_RAD,  // pitch (X → X)
  y: gtaRotation.z * DEG_TO_RAD,  // yaw (Z → Y)
  z: gtaRotation.y * DEG_TO_RAD   // roll (Y → Z)
}
```

**Почему**:
- GTA V `getGameplayCamRot(2)`: x=pitch, **y=roll**, **z=yaw**
- Three.js Euler: x=pitch, **y=yaw**, **z=roll**
- Порядок YAW и ROLL разный!

---

## Теперь система работает так

```
┌─────────────────────────────────────────────────────────┐
│ Alt:V Client (camera-sync.js)                           │
│                                                           │
│ Camera world: (1062.91, -1138.93, 29.10)                │
│ Vehicle world: (1063.72, -1142.36, 24.87)               │
│                                                           │
│ Relative = Camera - Vehicle                             │
│ = (-0.81, 3.43, 4.23)  ← ТОЧНО!                         │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ WebView (coordinateTransform.ts)                        │
│                                                           │
│ Прямая передача координат (без трансформаций)          │
│ position = (-0.81, 3.43, 4.23)                          │
│                                                           │
│ Переставляем оси вращения:                              │
│ rotation.y = GTA.z (yaw)                                │
│ rotation.z = GTA.y (roll)                               │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Three.js (VehicleModel + Camera)                        │
│                                                           │
│ Модель: position=(0,0,0), rotation=vehicle.rotation    │
│ Камера: position=(-0.81, 3.43, 4.23)                    │
│                                                           │
│ = ТОЧНОЕ СОВПАДЕНИЕ! ✨                                  │
└─────────────────────────────────────────────────────────┘
```

---

## Что нужно сделать

### 1. Пересоберите WebView

```bash
cd meshhub_altv_integration
npm run build
```

**Важно**: После этого новые файлы попадут в `altv-server/resources/meshhub/client/`

### 2. Перезапустите Alt:V сервер

**Полный restart**, не reload!

### 3. Тестируйте в игре

1. **ОБЯЗАТЕЛЬНО сядьте в машину** (F)
2. F10 → Vehicles → YFT Viewer
3. Нажмите "Game View"
4. ✅ **Модель должна быть точно на месте реальной машины!**

---

## Ожидаемый результат

**До исправления**:
```
Camera pos: -1.95, 2.86, 4.28  ❌ Неправильно
Модель улетает влево и вперед  ❌
```

**После исправления**:
```
Camera pos: -0.81, 3.43, 4.23  ✅ Правильно (совпадает с world разницей)
Модель точно на месте         ✅
```

**Debug UI**:
- FPS: ~134 (отлично!)
- Offset: 1.5-5m (зависит от угла камеры)
- FOV: ~50°

**Визуально**:
- Синяя wireframe модель точно накладывается на реальную черную машину
- При повороте камеры - модель поворачивается корректно
- При движении машины - модель остается в центре
- При повороте руля - модель вращается

---

## Технические детали исправлений

### Убрана ненужная трансформация

**rotatePointAroundOrigin()** больше не используется для позиции камеры!

Эта функция пыталась конвертировать относительную позицию в локальную систему координат машины, применяя обратное вращение. Но это неправильно:

- ❌ Камера в мировых координатах → не нужно локальное вращение
- ✅ Простая разница координат уже дает правильную относительную позицию

### Исправлен маппинг осей вращения

**GTA V → Three.js**:
```
GTA.x (pitch) → Three.x (pitch)  ✅
GTA.y (roll)  → Three.z (roll)   ⚠️ Переставлены!
GTA.z (yaw)   → Three.y (yaw)    ⚠️ Переставлены!
```

Без этого камера бы смотрела не в ту сторону.

---

## Debug опции

### Если модель все еще смещена

Можно добавить **калибровочный offset** в `coordinateTransform.ts`:

```typescript
export function convertCameraPosition(gtaRelativePos: Vec3): Vec3 {
  return {
    x: gtaRelativePos.x + OFFSET_X,  // Подберите экспериментально
    y: gtaRelativePos.y + OFFSET_Y,
    z: gtaRelativePos.z + OFFSET_Z
  }
}
```

Начните с малых значений (±0.5, ±1.0) и подберите визуально.

### Если модель повернута неправильно

Может потребоваться коррекция вращения модели автомобиля:

```typescript
// В VehicleModel компоненте
const rotation = [
  vehicleRotation.x * DEG_TO_RAD + PITCH_OFFSET,
  vehicleRotation.y * DEG_TO_RAD + ROLL_OFFSET,
  vehicleRotation.z * DEG_TO_RAD + YAW_OFFSET
]
```

---

## Что изменилось

### camera-sync.js
- ❌ Убрана функция `rotatePointAroundOrigin()` из использования
- ✅ Простое вычисление: `relativeCamPos = camCoord - vehiclePos`
- ✅ Добавлено детальное логирование первых 3 кадров

### coordinateTransform.ts
- ✅ Прямая передача координат (без инверсии)
- ✅ Исправлен маппинг вращения (yaw ↔ roll переставлены)
- ✅ Обновлены комментарии с правильной документацией

### YftViewer.tsx
- ✅ Модель в центре (0,0,0) в Game View
- ✅ Применяется вращение vehicle
- ✅ Детальное логирование первых 3 сообщений

---

## Checklist для проверки

После пересборки и перезапуска проверьте:

✅ **Логи Alt:V** (F8):
```
Camera pos: -0.81, 3.43, 4.23  // Должно совпадать с (Camera world - Vehicle world)
```

✅ **Browser Console**:
```
[CameraSync] 📥 Received sync data: {camPos: {x: -0.81, y: 3.43, z: 4.23}}
```

✅ **Визуально в игре**:
- Синяя модель накладывается на черную машину
- Без смещения влево/вправо/вперед/назад

✅ **Debug UI**:
- FPS: ~100-137 (хорошо)
- Offset: разумный (1-5m)
- FOV: ~50°

---

**Готово к тестированию! Пересоберите и перезапустите! 🚀**

Сообщите результат после тестирования.

