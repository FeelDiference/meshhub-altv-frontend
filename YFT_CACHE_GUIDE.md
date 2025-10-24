# YFT Model Cache System Guide

## Обзор

Система кэширования YFT моделей использует **IndexedDB** для хранения загруженных 3D моделей в браузере. Это значительно ускоряет повторную загрузку моделей.

## Основные возможности

### ✅ Автоматическое кэширование
- При первой загрузке модель автоматически сохраняется в кэш
- При повторной загрузке модель берется из кэша (мгновенно)
- Кэш валидируется по хэшу файла

### 📊 Умное управление памятью
- Максимальный размер кэша: **500 MB**
- Автоматическое удаление старых моделей при превышении лимита
- Срок хранения модели: **7 дней**

### 🎯 Валидация кэша
- Проверка хэша файла (изменилась ли модель)
- Проверка возраста кэша (удаление устаревших записей)
- Проверка версии кэша (для миграций)

## Архитектура

### Файлы системы

```
meshhub_altv_integration/client/src/
├── utils/
│   └── yftCache.ts              # Основной класс кэширования
├── hooks/
│   └── useYFTCache.ts           # React хук для интеграции
└── components/vehicles/
    └── YftViewer.tsx            # Интеграция в YFT Viewer
```

### Структура данных

```typescript
interface CachedYFTData {
  fileHash: string                 // Хэш для проверки изменений
  fileName: string                 // Имя файла (ключ)
  fileSize: number                 // Размер в байтах
  cachedAt: number                 // Timestamp создания
  version: string                  // Версия кэша
  meshData: ArrayBuffer            // Сырые данные mesh (vertices + indices)
  metadata: {
    vertexCount: number            // Количество вершин
    faceCount: number              // Количество граней
    hasNormals: boolean            // Есть ли нормали
    hasUVs: boolean                // Есть ли UV координаты
    boundingBox: {
      min: [number, number, number]
      max: [number, number, number]
    }
  }
}
```

## API

### YFTCache (класс)

#### Методы instance

```typescript
// Инициализация IndexedDB
await yftCache.init()

// Получение модели из кэша
const cached = await yftCache.get(fileName, fileHash)

// Сохранение модели в кэш
await yftCache.set(cachedData)

// Удаление модели из кэша
await yftCache.delete(fileName)

// Очистка всего кэша
await yftCache.clear()

// Статистика кэша
const stats = await yftCache.getStats()
```

#### Статические методы

```typescript
// Создание хэша файла
const hash = await YFTCache.createFileHash(fileName, fileSize, lastModified)

// Форматирование размера
const formatted = YFTCache.formatSize(bytes) // "1.5 MB"

// Форматирование времени
const timeAgo = YFTCache.formatTime(timestamp) // "2h ago"
```

### useYFTCache (React Hook)

```typescript
const {
  cacheStatus,      // Статус кэша (loading, stats, error)
  loadFromCache,    // Загрузка из кэша
  saveToCache,      // Сохранение в кэш
  clearCache,       // Очистка кэша
  refreshStats,     // Обновление статистики
  isCacheAvailable  // Доступен ли IndexedDB
} = useYFTCache()
```

## Интеграция в YftViewer

### Процесс загрузки модели

1. **Создание хэша файла**
   ```typescript
   const fileHash = await YFTCache.createFileHash(vehicleName, 0)
   ```

2. **Попытка загрузки из кэша**
   ```typescript
   const cachedData = await loadFromCache(vehicleName, fileHash)
   if (cachedData) {
     // Загружено из кэша - мгновенно
     setMeshData(convertCachedToMeshData(cachedData))
     return
   }
   ```

3. **Загрузка с сервера (если кэш промах)**
   ```typescript
   const data = await requestMeshDataFromServer(vehicleName)
   setMeshData(data)
   ```

4. **Сохранение в кэш**
   ```typescript
   await saveToCache({
     fileHash,
     fileName: vehicleName,
     meshData: convertToArrayBuffer(data),
     metadata: {
       vertexCount: data.vertices.length / 3,
       faceCount: data.indices.length / 3,
       // ...
     }
   })
   ```

## UI компоненты

### Кнопки управления кэшем

В YftViewer добавлены кнопки:

1. **Cache Stats (Database icon)**
   - Показывает количество закэшированных моделей
   - Tooltip: размер кэша в MB
   - Клик: обновление статистики

2. **Clear Cache (Trash icon)**
   - Очищает весь кэш
   - Подтверждение перед очисткой
   - Disabled во время сохранения

### Пример использования

```tsx
{isCacheAvailable && (
  <>
    <button onClick={refreshStats} title={`Кэш: ${stats.totalItems} моделей`}>
      <Database /> {stats.totalItems}
    </button>
    
    <button onClick={clearCache} title="Очистить кэш">
      <Trash2 /> Clear
    </button>
  </>
)}
```

## Логирование

Система активно логирует свои действия:

```javascript
[YftViewer] ✅ Loaded from cache: adder
[YftViewer] Cache miss, loading from server: zentorno
[YftViewer] ✅ Cached zentorno successfully
[YFTCache] 💾 Cached zentorno (1.2MB)
[YFTCache] 🗑️ Cache expired for old_model (age: 168h)
[YFTCache] 🧹 Cleaned up 3 old cache entries
```

## Производительность

### Без кэша
- Загрузка модели: **2-10 секунд** (зависит от размера)
- Чанкованная передача данных через Alt:V
- Прогресс-бар загрузки

### С кэшем (cache hit)
- Загрузка модели: **~50-200ms** (мгновенно)
- Без передачи данных по сети
- Без прогресс-бара

### Экономия ресурсов
- Снижение нагрузки на сервер
- Экономия трафика
- Лучший UX для пользователя

## Ограничения

### Технические
- Максимальный размер кэша: **500 MB**
- Срок хранения: **7 дней**
- Требуется поддержка IndexedDB в браузере

### Браузеры
- ✅ Chromium (Alt:V CEF) - **полная поддержка**
- ✅ Chrome/Edge/Opera - полная поддержка
- ✅ Firefox - полная поддержка
- ⚠️ Safari - ограничения на размер
- ❌ IE11 - не поддерживается

## Отладка

### Проверка доступности

```typescript
if (yftCache.isAvailable()) {
  console.log('IndexedDB доступен')
} else {
  console.log('IndexedDB недоступен - кэш отключен')
}
```

### Просмотр кэша в DevTools

1. Открыть DevTools (F12)
2. Вкладка **Application**
3. Раздел **IndexedDB**
4. База данных **yft-cache**
5. Object Store **yft-models**

### Ручная очистка

```javascript
// В консоли браузера
indexedDB.deleteDatabase('yft-cache')
```

## Миграции

При изменении структуры кэша:

1. Увеличить `version` в `CachedYFTData`
2. Добавить логику миграции в `YFTCache.init()`
3. Старые данные будут автоматически удалены

## Best Practices

### ✅ Рекомендуется
- Всегда проверять `isCacheAvailable` перед использованием
- Обрабатывать ошибки кэширования (не ломать основной флоу)
- Периодически очищать кэш (кнопка Clear Cache)
- Логировать cache hit/miss для мониторинга

### ❌ Не рекомендуется
- Хранить в кэше временные/тестовые модели
- Полагаться только на кэш (всегда иметь fallback)
- Кэшировать невалидные данные
- Игнорировать ошибки валидации

## Troubleshooting

### Проблема: Модель не кэшируется

**Решение:**
1. Проверить `isCacheAvailable`
2. Проверить логи в консоли
3. Проверить квоту хранилища браузера
4. Попробовать очистить кэш

### Проблема: Старая версия модели в кэше

**Решение:**
1. Хэш файла должен измениться при изменении модели
2. Проверить `fileHash` в логах
3. Очистить кэш вручную

### Проблема: Кэш переполнен

**Решение:**
1. Автоматическая очистка старых записей
2. Уменьшить `maxCacheSize` если нужно
3. Очистить кэш вручную

## Дальнейшие улучшения

### Возможные улучшения
- [ ] Compression (gzip/brotli) для mesh данных
- [ ] LRU (Least Recently Used) для более умного удаления
- [ ] Предзагрузка популярных моделей
- [ ] Синхронизация кэша между сессиями
- [ ] Web Workers для фоновой обработки
- [ ] Service Worker для offline режима

---

**Версия:** 1.0  
**Дата создания:** 2025-01-24  
**Автор:** MeshHub Development Team
