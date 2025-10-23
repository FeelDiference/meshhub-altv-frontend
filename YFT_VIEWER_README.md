# YFT 3D Wireframe Viewer

## 📋 Описание

**YFT Viewer** - это полноценный 3D просмотрщик моделей автомобилей с wireframe режимом, интегрированный в MeshHub ALT:V.

### ✨ Возможности:

- 🎨 **Wireframe режим** - отображение каркаса модели (аппаратный GPU rendering)
- 🔵 **Solid режим** - отображение полноценной 3D модели с освещением
- 📐 **Grid** - координатная сетка для ориентации
- 🔄 **Автоматическое вращение** - модель вращается автоматически
- 🖱️ **OrbitControls** - полный контроль камеры (вращение, зум, панорамирование)
- ⚡ **GPU acceleration** - без лагов благодаря аппаратному wireframe

## 🏗️ Архитектура

### Компоненты системы:

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   React UI      │ ◄───► │  ALT:V Server   │ ◄───► │  C# CodeWalker  │
│   (Three.js)    │       │   (JS Events)   │       │  (Mesh Extract) │
└─────────────────┘       └─────────────────┘       └─────────────────┘
```

### Поток данных:

1. **UI** → Кнопка "YFT Viewer (3D)" нажата
2. **React** → Отправляет событие `vehicle:mesh:request` с именем автомобиля
3. **ALT:V Server** → Получает событие и вызывает C# экспорт
4. **C# CodeWalker** → Парсит .yft файл, извлекает vertices и indices
5. **ALT:V Server** → Отправляет mesh данные клиенту
6. **React/Three.js** → Рендерит модель с wireframe

## 🔧 Технические детали

### C# CodeWalker (MeshService.cs)

```csharp
// Извлекает mesh данные из .yft файла
public MeshDataResult? ExtractVehicleMeshData(string vehicleName)
{
    // 1. Открывает dlc.rpf архив
    // 2. Находит .yft файл
    // 3. Парсит YftFile
    // 4. Извлекает vertices и indices из Drawable
    // 5. Возвращает данные для Three.js
}
```

### ALT:V Server (mesh-handlers.js)

```javascript
// Обработчик запроса mesh данных
alt.onClient('vehicle:mesh:request', async (player, data) => {
  // 1. Вызывает C# extractVehicleMeshData
  // 2. Преобразует данные в JS формат
  // 3. Отправляет клиенту через vehicle:mesh:response
})
```

### React Component (YftViewer.tsx)

```typescript
// Three.js компонент с wireframe
function VehicleModel({ meshData }) {
  // 1. Создает BufferGeometry из vertices
  // 2. Добавляет indices
  // 3. Рендерит с wireframe: true
  // GPU делает всю работу!
}
```

## 🚀 Использование

### В игре (ALT:V):

1. Откройте панель MeshHub (F10)
2. Перейдите в раздел "Автомобили"
3. Выберите автомобиль
4. В блоке "Действия с автомобилем" → "Тестирование"
5. Нажмите кнопку "YFT Viewer (3D)"

### Управление камерой:

- **ЛКМ + движение мыши** - Вращение модели
- **ПКМ + движение мыши** - Панорамирование
- **Колесико мыши** - Зум
- **Кнопка "Reset"** - Сброс камеры

### Режимы отображения:

- **Wireframe** (зеленый) - Каркас модели
- **Solid** (синий) - Полноценная 3D модель
- **Grid** - Координатная сетка

## ⚡ Производительность

### Почему нет лагов?

**Аппаратный wireframe:**
```javascript
// НЕ рисуем линии вручную (лаги):
for (каждый треугольник) {
  drawLine(v1, v2)
  drawLine(v2, v3)
  drawLine(v3, v1)
}

// Используем GPU wireframe (без лагов):
<meshBasicMaterial wireframe={true} />
```

**GPU делает всю работу:**
- ✅ Один draw call вместо 300k
- ✅ Mesh данные загружаются один раз
- ✅ Все вычисления на GPU
- ✅ Оптимизированный rendering pipeline

### Оптимизации:

1. **Mesh в GPU memory** - данные загружаются один раз
2. **BufferGeometry** - эффективное представление
3. **Аппаратный wireframe** - DirectX FillMode.Wireframe эквивалент
4. **LOD ready** - можно добавить Level of Detail в будущем

## 📦 Структура файлов

```
altv-cw-module/
  └── MeshHub.Rpf/
      ├── Services/
      │   ├── RpfService.cs       # Работа с RPF архивами
      │   ├── HandlingService.cs  # Handling параметры
      │   └── MeshService.cs      # ✨ НОВЫЙ: Извлечение mesh данных
      └── ModuleMain.cs           # Регистрация экспортов

altv-server/resources/meshhub/
  └── server/
      └── handlers/
          └── mesh-handlers.js    # ✨ НОВЫЙ: Обработчики mesh событий

meshhub_altv_integration/client/src/
  └── components/vehicles/
      ├── VehicleActions.tsx      # ✨ ОБНОВЛЕН: Добавлена кнопка YFT Viewer
      └── YftViewer.tsx           # ✨ НОВЫЙ: Three.js 3D viewer
```

## 🔍 API Events

### Client → Server:

```typescript
// Запрос mesh данных
alt.emit('vehicle:mesh:request', {
  vehicleName: 'baze_senna'
})
```

### Server → Client:

```typescript
// Успешный ответ
alt.on('vehicle:mesh:response', (data: {
  vertices: number[]  // [x, y, z, x, y, z, ...]
  indices: number[]   // [i1, i2, i3, i1, i2, i3, ...]
  bounds?: {
    min: { x, y, z }
    max: { x, y, z }
  }
}) => {
  // Рендер в Three.js
})

// Ошибка
alt.on('vehicle:mesh:error', (error: {
  message: string
}) => {
  // Показываем ошибку
})
```

## 🎯 Следующие шаги

### Возможные улучшения:

1. **LOD система** - разные уровни детализации
2. **Mesh simplification** - упрощение для больших моделей
3. **Texture mapping** - отображение текстур
4. **Bone visualization** - визуализация костей
5. **Export функции** - экспорт в .obj/.fbx формат
6. **Collision mesh** - отображение collision модели

### Performance optimization:

- Реализовать decimation для моделей > 100k треугольников
- Добавить кэширование mesh данных
- Compress данные перед отправкой клиенту
- Использовать web workers для обработки

## 📚 Технологии

- **Three.js** v0.158.0 - 3D рендеринг
- **@react-three/fiber** v8.15.0 - React интеграция
- **@react-three/drei** v9.88.0 - Утилиты (OrbitControls, Grid)
- **CodeWalker.Core** - Парсинг .yft файлов
- **ALT:V** - Server-Client коммуникация

## 🎓 Как это работает?

### Wireframe в CodeWalker (C#):

```csharp
// SharpDX DirectX11
rsd.FillMode = FillMode.Wireframe;
context.Rasterizer.State = rsWireframe;
```

### Wireframe в Three.js (WebGL):

```javascript
// WebGL (OpenGL ES)
material.wireframe = true
// GPU автоматически рисует только edges!
```

**Это ОДИНАКОВЫЙ подход** - аппаратный wireframe на уровне GPU!

---

**Автор:** MeshHub Team  
**Дата:** 2025-10-23  
**Версия:** 1.0.0

