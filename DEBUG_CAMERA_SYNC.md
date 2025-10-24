# Debug Camera Sync - Диагностика проблемы

## Проблема

❌ **Модель улетает** - offset 5.87m  
❌ **Низкий FPS** - 5.87 вместо ~60  

## Что добавлено для диагностики

### 1. Детальное логирование Alt:V Client

**Файл**: `camera-sync.js`
- ✅ Логи первых 3 кадров sync данных
- ✅ Показывает camera pos, rotation, FOV
- ✅ Показывает vehicle rotation
- ✅ Показывает world координаты (debug)
- ✅ FPS каждую секунду
- ✅ **ВРЕМЕННО отключен throttling** для полной диагностики

### 2. Детальное логирование WebView

**Файл**: `YftViewer.tsx`
- ✅ Логи первых 3 сообщений от Alt:V
- ✅ Показывает трансформированные координаты
- ✅ Показывает примененные значения к камере

---

## Шаги для диагностики

### Шаг 1: Пересоберите WebView

```bash
cd meshhub_altv_integration
npm run build
```

### Шаг 2: Перезапустите Alt:V

**Важно**: Полный перезапуск сервера, не просто reload!

### Шаг 3: Откройте консоли

**В игре**: Откройте F8 (console)
**В браузере**: Если используете dev режим - F12

### Шаг 4: Активируйте Game View

1. F10 → Vehicles
2. Выберите машину (например baze_rx7)
3. Откройте YFT Viewer
4. **Сядьте в машину** (очень важно!)
5. Нажмите "Game View"

### Шаг 5: Смотрите логи

#### Console в игре (F8)

**Должны появиться**:

```
[CameraSync] 🎥 Starting camera synchronization (everyTick mode)...
[CameraSync] 📤 Sending sync data #0:
  Camera pos: X.XX, Y.YY, Z.ZZ
  Camera rot: XX°, YY°, ZZ°
  FOV: XX
  Vehicle rot: XX°, YY°, ZZ°
  Camera world: X.XX, Y.YY, Z.ZZ
  Vehicle world: X.XX, Y.YY, Z.ZZ
```

Через 1 секунду:
```
[CameraSync] 📊 Sync FPS: XX
```

#### Browser Console (F12 или в игре если localhost)

**Должны появиться**:

```
[YftViewer] ✅ Subscribed to camera sync events
[CameraSync] 📥 Received sync data: { camPos: {...}, ... }
[CameraSync] 📸 Applied to camera: { position: [...], ... }
```

---

## Что проверить в логах

### ✅ Проверка 1: Данные приходят?

**Лог должен быть**:
```
[CameraSync] 📤 Sending sync data #0:
```

❌ **Если нет** → синхронизация не запустилась  
✅ **Если есть** → данные отправляются

### ✅ Проверка 2: Camera Position правильная?

**Camera pos** должна быть относительно машины (несколько метров):
```
Camera pos: 0.50, 1.20, -3.50  // Примерно так
```

❌ **Если огромные числа** (>100) → ошибка в relative координатах  
❌ **Если (0, 0, 0)** → не вычисляется offset  
✅ **Если малые числа** (~1-10) → корректно

### ✅ Проверка 3: FPS адекватный?

**Через секунду должно быть**:
```
[CameraSync] 📊 Sync FPS: 60  // Или близко к этому
```

❌ **Если FPS < 10** → everyTick не работает или throttling проблема  
⚠️ **Если FPS 20-40** → нормально, но можно оптимизировать  
✅ **Если FPS > 50** → отлично

### ✅ Проверка 4: WebView получает данные?

**В Browser Console должно быть**:
```
[CameraSync] 📥 Received sync data: { ... }
```

❌ **Если нет** → данные не доходят до WebView (проблема с events)  
✅ **Если есть** → коммуникация работает

---

## Возможные проблемы и решения

### Проблема A: FPS очень низкий (<10)

**Причина**: everyTick не работает или webview не инициализирован

**Решение**:
1. Проверьте лог при старте:
   ```
   [CameraSync] ✅ Camera sync module loaded
   [MeshHub] ✅ Camera sync event handlers registered
   ```
2. Проверьте что webview установлен:
   ```
   [CameraSync] WebView reference set
   ```

### Проблема B: Модель улетает (большой offset)

**Причина**: Ошибка в трансформации координат

**Диагностика по логам**:

Смотрите на **Camera world** vs **Vehicle world**:
```
Camera world: 100.50, 200.30, 30.10
Vehicle world: 100.00, 200.00, 30.00
```

Разница должна быть малой (несколько метров):
```
Diff: 0.50, 0.30, 0.10  ✅ Норм
```

Если разница огромная:
```
Diff: 50.00, 30.00, 10.00  ❌ Проблема!
```

**Решение**: Проверить что игрок **В МАШИНЕ** (не просто рядом!)

### Проблема C: Данные не приходят в WebView

**Причина**: События не зарегистрированы

**Проверка**:
```javascript
// В YftViewer должно быть при входе в Game View:
[YftViewer] 🎥 Started camera synchronization
[YftViewer] ✅ Subscribed to camera sync events
```

**Решение**: Проверить что `alt.emit('yft-viewer:camera:sync:start')` вызывается

---

## Следующие действия

1. **Пересоберите и перезапустите** (см. выше)
2. **Активируйте Game View** (ОБЯЗАТЕЛЬНО сидя в машине!)
3. **Скопируйте ВСЕ логи**:
   - Из игры (F8) - первые 10-20 строк после "[CameraSync] 🎥 Starting..."
   - Из Browser Console - первые 5-10 строк после "[YftViewer] ✅ Subscribed..."
4. **Отправьте мне логи** для анализа

### Пример что отправить:

```
=== GAME CONSOLE (F8) ===
[CameraSync] 🎥 Starting camera synchronization...
[CameraSync] 📤 Sending sync data #0:
  Camera pos: ???
  ...

=== BROWSER CONSOLE ===
[CameraSync] 📥 Received sync data: ???
...
```

---

## Временные изменения

⚠️ **ВНИМАНИЕ**: Throttling временно отключен для диагностики!

После исправления проблемы нужно будет вернуть:

```javascript
// В camera-sync.js раскомментировать:
if (now - lastSyncTime < THROTTLE_MS) {
  return
}
```

---

**Жду логи для продолжения диагностики!** 🔍

