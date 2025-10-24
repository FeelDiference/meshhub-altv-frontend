# Координаты и телепортация - Функционал

## ✅ Реализовано

### 1. Frontend (WebView)

#### `WorldPage.tsx`
- Интегрирован компонент `TeleportMarkers` (первым блоком перед погодой)
- Добавлен `CoordinatesViewer` для fullscreen отображения
- Управление favorites для маркеров телепортации
- Синхронизация с localStorage и Alt:V

#### `TeleportMarkers.tsx` - Компактная верстка для узкого меню
**Inline координаты:**
- Компактное поле ввода с live обновлением
- Формат: `192.23, 11.33, 33.22` (без меток осей)
- Кнопка телепорта (иконка Send)
- Поддержка Enter для быстрого телепорта
- Автоматическое форматирование при обновлении позиции

**Кнопки управления:**
- Первый ряд (2 в ряд):
  - "Сохранить" - быстрое создание маркера с координатами как название
  - "Координаты Вкл/Выкл" - toggle отдельного viewer (как спидометр)
- Второй ряд (полная ширина):
  - "Телепорт по маркеру" - телепортация к waypoint, установленному на карте (иконка Target)

**Список маркеров (дизайн как у погоды):**
- Полная кнопка локации (клик → телепортация)
- Звездочка избранного справа (отдельная кнопка)
- Иконки редактирования и удаления внутри кнопки
- Inline редактирование названий
- Координаты отображаются под названием

#### `coordinates-viewer.html` + `coordinates-viewer.js`
**Отдельный WebView (как спидометр):**
- Независимый от основной панели (не скрывается при F10)
- Крупные координаты вверху по центру (32px)
- Зеленый цвет текста для контраста
- Live обновление каждый тик (только при изменении > 0.01)
- Кнопка "Скрыть" в правом верхнем углу
- Состояние сохраняется при закрытии панели F10
- Полностью прозрачный фон

#### `parseCoordinates.ts`
**Утилита парсинга:**
- Гибкий формат: `X, Y, Z` / `X Y Z` / `X; Y; Z` / `X,Y,Z`
- Валидация GTA V границ карты (-5000 до +5000)
- Функции форматирования координат

#### `App.tsx` - Dashboard
**Отображение избранных маркеров:**
- Секция "Телепорты:" на главной странице
- Показывает только избранные маркеры (помеченные звездочкой)
- Клик по локации → мгновенная телепортация
- Отображаются координаты под названием
- Интеграция с единой системой избранного (как погода, машины)

### 2. Backend (Alt:V Client)

#### `world-events.js`
**Обработчики для TeleportMarkers:**
- `world:position:get` - разовый запрос позиции для поля ввода
- `world:teleport` - телепортация к координатам
- `world:waypoint:teleport` - телепортация к waypoint на карте:
  - ✅ Проверка активного waypoint (`isWaypointActive()`)
  - ✅ Получение координат через natives (`getFirstBlipInfoId(8)`, `getBlipInfoIdCoord()`)
  - ✅ Вычисление высоты земли (`getGroundZFor3dCoord()`)
  - ✅ События: `world:waypoint:success` / `world:waypoint:error`
- `alt.everyTick()` - отправка позиции каждый тик (если изменилась > 0.01)

#### `coordinates-viewer.js` (новый модуль)
**Управление отдельным WebView:**
- `showCoordinatesViewer()` / `hideCoordinatesViewer()` / `toggleCoordinatesViewer()`
- `isCoordinatesViewerEnabled()` - проверка состояния
- `setCoordinatesViewerState(enabled)` - установка состояния

**Live обновление через everyTick:**
- Отправка координат в отдельный WebView
- Оптимизация: обновление только при изменении > 0.01
- State сохраняется независимо от основной панели

#### `misc-events.js`
**Обработчики WebView событий:**
- `coordinates:viewer:toggle` - переключение viewer
- `coordinates:viewer:get-status` - запрос текущего состояния
- Отправка статуса обратно в основную панель

## 🎮 Использование

### В игре:
1. Открыть панель MeshHub (F10)
2. Перейти на вкладку "Мир и Погода"
3. В блоке "Координаты":
   - **Поле ввода** - видны текущие координаты (live обновление)
   - **Кнопка Send** - телепорт по введенным координатам (или Enter)
   - **Кнопка "Сохранить"** - создать маркер с текущей позицией
   - **Кнопка "Координаты Вкл/Выкл"** - включить/выключить отдельный viewer
   - **Кнопка "Телепорт по маркеру"** - 🎯 телепорт к waypoint на карте:
     1. Открыть карту (M)
     2. Установить маркер (ЛКМ)
     3. Нажать "Телепорт по маркеру"
     4. Мгновенная телепортация к маркеру

### Форматы ввода координат:
```
192.23, 11.33, 33.22  ✅
192.23,11.33,33.22    ✅
192.23 11.33 33.22    ✅
192.23; 11.33; 33.22  ✅
```

### Сохраненные маркеры:
- Отображаются списком
- Можно переименовывать
- Добавление в favorites (звездочка)
- Быстрый телепорт одной кнопкой

### Fullscreen координаты:
- Включаются toggle switch
- Отображаются вверху по центру
- Обновляются в реальном времени
- Удобны для навигации и скриншотов

## 🔧 Технические детали

### События Alt:V:
- `world:position:get` → `world:position:response` - получение текущей позиции
- `world:teleport` (принимает `{ position: Vec3 }`) - телепортация к координатам
- `world:waypoint:teleport` → `world:waypoint:success` / `world:waypoint:error` - телепортация к waypoint
- `coordinates:viewer:toggle` / `coordinates:viewer:get-status` → `coordinates:viewer:status`
- `world:markers:load` → `world:markers:loaded` - загрузка маркеров с сервера
- `world:markers:save` - сохранение маркеров на сервер (JSON файл)

### Хранение данных:
- **Маркеры**: JSON файл на сервере → `resources/meshhub/data/teleport_markers.json`
  - Структура: `{ version, last_updated, users: { userId: [markers] } }`
  - Персистентность между перезапусками сервера
  - По пользователям (userId или player name)
  - Загрузка: Client → Server → JSON файл → Client → WebView
  - Сохранение: WebView → Client → Server → JSON файл
  
- **Favorites маркеров**: Alt:V LocalStorage → `meshhub_user_favorites_{userId}`
  - ✅ Интегрировано с единым сервисом избранного (через `favorite-storage.js`)
  - Структура: `{ weather: [], time: [], timeSpeed: [], teleportMarkers: [markerId1, markerId2, ...] }`
  - Загрузка: `world:favorites:load` → `world:favorites:response`
  - Сохранение: `world:favorites:save` (единый механизм с погодой/временем)
  - Отображение на Dashboard: фильтрация allTeleportMarkers по favorites.teleportMarkers
  
- **Координаты viewer state**: сохраняется в модуле `coordinates-viewer.js`

### Производительность:
- Live обновление: 1 раз в секунду (оптимально)
- Синхронизация только при открытом компоненте
- Автоматическая остановка при размонтировании

### GTA V Natives (Waypoint телепортация):
**Получение координат waypoint:**
- `isWaypointActive()` - проверка активного waypoint на карте
- `getFirstBlipInfoId(8)` - получение blip waypoint (8 = sprite ID waypoint)
- `getBlipInfoIdCoord(blip)` - получение X, Y координат waypoint

**Определение высоты земли (многоступенчатый подход):**

1. **Загрузка коллизии:**
   - `requestCollisionAtCoord(x, y, z)` - запрос загрузки коллизии
   - Задержка 100ms для загрузки

2. **Метод 1 (Ground Z - основной):**
   - `getGroundZFor3dCoord(x, y, startHeight, false, false)`
   - Проверка с 11 разных высот: [1000, 800, 500, 300, 200, 150, 100, 50, 0, -50, -100]
   - Выбирается первая найденная валидная высота (≠ 0, отличается от startHeight > 0.1)

3. **Метод 2 (Waypoint Z):**
   - Если `getGroundZFor3dCoord` не сработал
   - Используем Z координату из waypoint (если ≠ 0)

4. **Метод 3 (Fallback):**
   - Последний fallback: текущая высота игрока

**Финальная телепортация:**
- `player.pos = { x, y, z: finalZ + 1.0 }`
- +1.0 чтобы не застрять в земле/текстурах

## 📋 Файлы

### Созданы (Frontend):
- `client/src/utils/parseCoordinates.ts` - утилита парсинга координат

### Созданы (Alt:V Client):
- `altv-server/resources/meshhub/client/modules/coordinates-viewer.js` - модуль управления WebView
- `altv-server/resources/meshhub/client/coordinates-viewer.html` - отдельный WebView для координат

### Созданы (Alt:V Server):
- `altv-server/resources/meshhub/server/services/teleport-markers-service.js` - сервис хранения маркеров в JSON файле

### Обновлены (Frontend):
- `client/src/components/world/WorldPage.tsx` - интеграция TeleportMarkers, управление favorites
- `client/src/components/world/TeleportMarkers.tsx` - дизайн как у погоды, waypoint телепортация
- `client/src/App.tsx` - Dashboard с секцией "Телепорты:" для избранных маркеров

### Обновлены (Alt:V Client):
- `altv-server/resources/meshhub/client/modules/webview/handlers/world/world-events.js` - обработчики позиции, телепортации, **waypoint**
- `altv-server/resources/meshhub/client/modules/webview/handlers/world/world-favorites.js` - обработчики загрузки/сохранения маркеров и favorites
- `altv-server/resources/meshhub/client/modules/webview/handlers/misc/misc-events.js` - обработчики coordinates viewer
- `altv-server/resources/meshhub/client/modules/favorite-storage.js` - добавлен `teleportMarkers: []` в defaults

### Обновлены (Alt:V Server):
- `altv-server/resources/meshhub/server/handlers/world-handlers.js` - серверные обработчики загрузки/сохранения маркеров

## 🔄 Поток данных (сохранение маркеров)

```
WebView (TeleportMarkers.tsx)
    ↓ нажатие "Сохранить"
    emit('world:markers:save', { markers })
    ↓
Client (world-favorites.js)
    ↓ emitServer('world:markers:save', { markers })
    ↓
Server (world-handlers.js)
    ↓ teleportMarkersService.saveUserMarkers(userId, markers)
    ↓
JSON файл (teleport_markers.json)
    {
      "version": "1.0",
      "last_updated": "2025-10-24T...",
      "users": {
        "player_JohnDoe": [
          {
            "id": "1729...",
            "name": "192.23, 11.33, 33.22",
            "position": { "x": 192.23, "y": 11.33, "z": 33.22 },
            "createdAt": "2025-10-24T..."
          }
        ]
      }
    }
```

## 🔄 Поток данных (загрузка маркеров)

```
WebView (TeleportMarkers.tsx)
    ↓ при монтировании
    emit('world:markers:load')
    ↓
Client (world-favorites.js)
    ↓ emitServer('world:markers:load')
    ↓
Server (world-handlers.js)
    ↓ teleportMarkersService.getUserMarkers(userId)
    ↓ emitClient('world:markers:loaded', { markers })
    ↓
Client (world-favorites.js)
    ↓ webview.emit('world:markers:loaded', { markers })
    ↓
WebView (TeleportMarkers.tsx)
    ✅ setMarkers(markers)
```

## ✨ Особенности

1. **Inline редактирование** - координаты можно редактировать прямо в поле
2. **Гибкий парсинг** - поддержка различных форматов ввода
3. **Live обновление** - координаты обновляются каждый тик
4. **Fullscreen viewer** - отдельный WebView поверх игры (не скрывается при F10)
5. **Favorites** - быстрый доступ к избранным локациям
6. **Валидация** - проверка границ карты GTA V
7. **Персистентность** - маркеры сохраняются в JSON файл на диске
8. **По пользователям** - каждый пользователь имеет свои маркеры

---

**Статус:** ✅ Готово к тестированию

