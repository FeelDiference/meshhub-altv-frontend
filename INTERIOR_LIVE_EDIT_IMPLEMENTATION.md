# Interior Live Edit - Документация реализации

## 📋 Обзор

Реализован функционал **Live Edit** для страницы интерьеров - отдельный overlay компонент для диагностики интерьеров в реальном времени.

## ✅ Выполненные изменения

### 1. Обновлен InteriorDetails.tsx

**Изменения в UI:**
- ✅ Удалено поле "Название" из блока информации (дублирует заголовок)
- ✅ Удалено поле "Локаций" (дублирует информацию из списка)
- ✅ Удалено поле "Размер" (дублирует информацию из списка)
- ✅ Заголовок теперь отображает имя интерьера: `interior.displayName || interior.name`
- ✅ Секция "Порталы" переименована в "Диагностика"
- ✅ Кнопка "Показать в игре" переименована в "Показать порталы"
- ✅ Увеличены размеры кнопки порталов: padding `p-3.5`, иконка `w-5 h-5`, текст `text-sm`

**Новый функционал:**
- ✅ Добавлен разделитель с отступом после кнопки порталов
- ✅ Добавлена кнопка "Live Edit" с toggle функционалом
- ✅ Новые props: `liveEditVisible`, `onToggleLiveEdit`
- ✅ Импорты: `Monitor`, `MonitorOff` из lucide-react

### 2. Создан InteriorLiveEdit.tsx

Новый компонент overlay для диагностики интерьеров:

**Местоположение:** `meshhub_altv_integration/client/src/components/interiors/InteriorLiveEdit.tsx`

**Функциональность:**
- ✅ Отображается как отдельный overlay (независимо от основной панели)
- ✅ Показывает Interior ID (если доступен)
- ✅ Отображает локальные координаты (X, Y, Z) в формате с 2 знаками после запятой
- ✅ Показывает количество загруженных entity
- ✅ Кнопка закрытия в заголовке
- ✅ Стилизация: cyan цветовая схема, backdrop blur, border glow

**Props:**
```typescript
interface InteriorLiveEditProps {
  isVisible: boolean
  onToggle: () => void
  currentInteriorId?: number
}
```

### 3. Обновлен InteriorsPage.tsx

**Добавлено:**
- ✅ State: `liveEditVisible` (boolean)
- ✅ Handler: `handleToggleLiveEdit()` с отправкой событий в Alt:V
- ✅ Передача props в InteriorDetails: `liveEditVisible`, `onToggleLiveEdit`
- ✅ Рендеринг Live Edit через Portal в конце компонента
- ✅ Импорт: `InteriorLiveEdit` компонент

## 🔌 Alt:V Integration (требуется реализация на сервере)

### События WebView → Alt:V Client

#### 1. `interior:liveedit:enable`
Включает режим Live Edit.

**Данные:** отсутствуют

**Действия на сервере:**
- Начать отправку данных в WebView с интервалом (например, каждые 100-200ms)
- Вычислять локальные координаты
- Считать количество entity

#### 2. `interior:liveedit:disable`
Выключает режим Live Edit.

**Данные:** отсутствуют

**Действия на сервере:**
- Остановить отправку данных
- Очистить интервал обновления

#### 3. `interior:liveedit:request`
Запрос начальных данных при открытии Live Edit.

**Данные:**
```typescript
{
  interiorId?: number  // GTA V interior ID (может быть undefined)
}
```

**Действия на сервере:**
- Отправить текущие данные один раз через событие `interior:liveedit:update`

### События Alt:V Client → WebView

#### 1. `interior:liveedit:update`
Обновление данных для Live Edit (отправляется периодически когда режим включен).

**Данные:**
```typescript
{
  localCoords: {
    x: number  // Координата X относительно entry point интерьера
    y: number  // Координата Y относительно entry point интерьера
    z: number  // Координата Z относительно entry point интерьера
  },
  entityCount: number  // Общее количество загруженных entity (через нативку Alt:V)
}
```

**Вычисление localCoords:**
```typescript
// Псевдокод
const playerPos = alt.Player.local.pos
const interiorEntryPoint = getInteriorEntryPoint(currentInteriorId)

const localCoords = {
  x: playerPos.x - interiorEntryPoint.x,
  y: playerPos.y - interiorEntryPoint.y,
  z: playerPos.z - interiorEntryPoint.z
}
```

**Получение entityCount:**
```typescript
// Через нативку Alt:V
const entityCount = alt.getEntityCount() // или аналогичная функция
```

## 📁 Измененные файлы

1. `meshhub_altv_integration/client/src/components/interiors/InteriorDetails.tsx` - обновление UI
2. `meshhub_altv_integration/client/src/components/interiors/InteriorLiveEdit.tsx` - новый компонент (создан)
3. `meshhub_altv_integration/client/src/pages/interiors/InteriorsPage.tsx` - интеграция компонента

## 🎨 UI Детали

### Live Edit Overlay

**Позиция:** `fixed bottom-24 right-4`
**Z-index:** `z-50`
**Минимальная ширина:** `280px`

**Цветовая схема:**
- Заголовок: cyan-400
- Граница: cyan-500/50
- Фон: base-900/95 с backdrop-blur
- Координаты X: green-400
- Координаты Y: blue-400
- Координаты Z: purple-400
- Entity count: orange-400

**Кнопка закрытия:**
- Красная (red-600/red-700)
- Круглая форма
- Символ: ×
- Размер: 6x6

## 🚀 Как использовать

1. **Открыть страницу интерьеров**
2. **Выбрать интерьер из списка** (правые панели откроются)
3. **В панели "Диагностика"** нажать кнопку **"Live Edit"**
4. **Overlay появится в правом нижнем углу** экрана
5. **Данные обновляются в реальном времени** (когда реализовано на сервере)
6. **Закрыть** можно через:
   - Кнопку × в overlay
   - Кнопку "Live Edit" в панели Диагностика

## 📝 Примечания

- Live Edit работает независимо от видимости основной панели интерьеров
- Компонент остается видимым даже при закрытии панелей через ESC
- Для корректной работы требуется реализация обработчиков на стороне Alt:V клиента
- Координаты вычисляются относительно entry point интерьера (0,0,0 интерьера)
- Entity count - это общее количество всех entity вокруг игрока (через нативку Alt:V)

## ✨ Расширяемость

Компонент спроектирован для будущего расширения функционала:

- Добавление новых метрик (FPS, memory usage и т.д.)
- Отображение информации о комнатах
- Статистика по entity sets
- Debugging информация о порталах
- Визуализация bounding boxes

Достаточно расширить интерфейс данных в событии `interior:liveedit:update` и добавить соответствующие элементы UI в компонент.

