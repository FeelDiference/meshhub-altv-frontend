# YFT Game View - Быстрый старт

## 🚀 Для тестирования

### Шаг 1: Пересоберите WebView

```bash
cd meshhub_altv_integration
npm run build
```

Это создаст обновленные файлы в `altv-server/resources/meshhub/client/`

### Шаг 2: Перезапустите ресурс в игре

**Вариант A - Полный перезапуск сервера**:
- Остановите Alt:V сервер
- Запустите снова

**Вариант B - Перезагрузка ресурса** (если поддерживается):
```
/restart meshhub
```

### Шаг 3: Тестируйте в игре

1. **Откройте MeshHub**: Нажмите `F10`
2. **Перейдите в Vehicles**
3. **Выберите любой автомобиль** (например: baze_senna, baze_rx7)
4. **Нажмите кнопку "YFT Viewer (3D)"**
5. **Нажмите кнопку "Game View"** (в toolbar)
6. **Двигайте камеру в игре**:
   - 🖱️ Мышь - поворот камеры
   - ⌨️ W/A/S/D - движение
   - ⌨️ V - zoom
7. ✅ **Модель должна синхронизироваться!**

---

## 🎯 Что проверять

### ✅ Позиция камеры
- Двигайтесь вокруг машины → модель остается в центре

### ✅ Вращение камеры  
- Поворачивайте голову → модель поворачивается соответственно

### ✅ FOV (Zoom)
- Нажимайте V → модель приближается/отдаляется

### ✅ Вращение машины
- Поворачивайте руль → синхронизация учитывает вращение

### ✅ Debug UI (правый верхний угол)
- **FPS**: должен быть ~60 (зеленый цвет)
- **Offset**: расстояние камеры от машины
- **FOV**: текущий угол обзора

---

## 🐛 Debug режим (опционально)

### Включение visual debug маркеров

**Файл**: `altv-server/resources/meshhub/client/modules/camera-sync.js`

Измените строку:
```javascript
let debugMode = true  // было: false
```

Пересоберите и перезапустите.

**Что увидите в игре**:
- 🟢 Зеленая сфера в позиции камеры
- 🔴 Красная сфера в центре машины
- 🟡 Желтая линия соединяет их
- 🟣 Фиолетовая линия показывает направление взгляда

---

## ⚙️ Настройка производительности

### Если лагает (FPS < 30)

**1. Уменьшите частоту синхронизации**

`camera-sync.js`:
```javascript
const THROTTLE_MS = 33  // 30 FPS вместо 60
```

**2. Уменьшите сглаживание**

`coordinateTransform.ts`:
```javascript
private readonly smoothFactor = 0.5  // было 0.7
```

**3. Отключите debug**

`camera-sync.js`:
```javascript
let debugMode = false
```

### Если модель дергается

**Увеличьте сглаживание**:
```javascript
private readonly smoothFactor = 0.9  // было 0.7
```

---

## 📸 Скриншоты для проверки

### Правильная синхронизация

✅ **Модель точно совпадает с машиной в игре**  
✅ **Поворот камеры = поворот модели**  
✅ **Zoom работает корректно**  
✅ **FPS стабильный (~60)**

### Что может пойти не так

❌ **Модель смещена** → нужна калибровка offset  
❌ **Модель дергается** → увеличить smoothFactor  
❌ **Низкий FPS** → увеличить THROTTLE_MS  
❌ **Модель не двигается** → проверить console logs

---

## 🔍 Логи для проверки

### Console в игре (F8)

Должны быть:
```
[CameraSync] ✅ Camera sync module loaded
[MeshHub] ✅ Camera sync event handlers registered
[MeshHub] 📸 YFT Viewer requested camera sync START
[CameraSync] 🎥 Starting camera synchronization (everyTick mode)...
[CameraSync] ✅ Camera sync started (everyTick)
```

При остановке:
```
[MeshHub] 📸 YFT Viewer requested camera sync STOP
[CameraSync] 🛑 Stopping camera synchronization...
[CameraSync] ✅ Camera sync stopped
```

### Browser Console (F12)

Должны быть:
```
[YftViewer] ✅ Subscribed to camera sync events
[YftViewer] 🎥 Started camera synchronization
```

При получении данных (если включен debug):
```
[Sync] Camera: { pos: (X, Y, Z), rot: (pitch, roll, yaw), fov: 60 }
```

---

## ✅ Чеклист готовности

Перед тестированием убедитесь:

- [ ] WebView пересобран (`npm run build`)
- [ ] Alt:V ресурс перезагружен
- [ ] В игре (не в меню)
- [ ] MeshHub открывается (F10)
- [ ] YFT Viewer открывается для машины
- [ ] Game View кнопка доступна

Если все ✅ → можно тестировать!

---

**Готово к тестированию! 🎮**

Сообщите о результатах тестирования для финальной калибровки.

