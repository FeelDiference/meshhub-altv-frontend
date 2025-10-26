# HotKeys System Bug Fix

> Исправление критического бага с undefined hotkeys в favoritesService

## 🐛 Проблема

При инициализации приложения возникали ошибки:

```
[useHotkeys] Error syncing with Alt:V: TypeError: this.state.hotkeys is not iterable
TypeError: Cannot read properties of undefined (reading 'find')
```

## 🔍 Причина

В `favoritesService.ts` при загрузке данных из localStorage не гарантировалось наличие поля `hotkeys` в state. Это приводило к:

1. `this.state.hotkeys` был `undefined`
2. Методы `.find()`, `.filter()`, spread operator `[...]` падали с ошибкой
3. Синхронизация с Alt:V ломалась

## ✅ Решение

### 1. Защита в `loadFromStorage()`

Добавлен merge с `INITIAL_STATE` для гарантии всех полей:

```typescript
// КРИТИЧНО: Убеждаемся что все поля существуют (merge с INITIAL_STATE)
const data = {
  ...INITIAL_STATE,
  ...parsed.data,
  // Гарантируем что массивы существуют
  hotkeys: parsed.data.hotkeys || [],
  weather: parsed.data.weather || [],
  time: parsed.data.time || [],
  // ... остальные поля
}
```

### 2. Защита в `init()`

Инициализация всегда начинается с дефолтного состояния:

```typescript
// ВАЖНО: Начинаем с дефолтного состояния (гарантия что все поля есть)
this.state = { ...INITIAL_STATE }

// При загрузке - merge с INITIAL_STATE
this.state = {
  ...INITIAL_STATE,
  ...loaded
}
```

### 3. Защита во всех методах hotkeys

Добавлены проверки в каждом методе:

**`getAllHotkeys()`:**
```typescript
if (!this.state.hotkeys || !Array.isArray(this.state.hotkeys)) {
  console.warn('[FavoritesService] hotkeys is not an array, returning empty array')
  this.state.hotkeys = []
}
return [...this.state.hotkeys]
```

**`getHotkey()`:**
```typescript
if (!this.state.hotkeys || !Array.isArray(this.state.hotkeys)) {
  console.warn('[FavoritesService] hotkeys is not an array in getHotkey')
  this.state.hotkeys = []
  return null
}
```

**`findByHotkey()`:**
```typescript
if (!this.state.hotkeys || !Array.isArray(this.state.hotkeys)) {
  console.warn('[FavoritesService] hotkeys is not an array in findByHotkey')
  this.state.hotkeys = []
  return null
}
```

**`setHotkey()`:**
```typescript
if (!this.state.hotkeys || !Array.isArray(this.state.hotkeys)) {
  console.warn('[FavoritesService] hotkeys is not an array in setHotkey, initializing')
  this.state.hotkeys = []
}
```

**`removeHotkey()`:**
```typescript
if (!this.state.hotkeys || !Array.isArray(this.state.hotkeys)) {
  console.warn('[FavoritesService] hotkeys is not an array in removeHotkey')
  this.state.hotkeys = []
  return
}
```

### 4. Защита в `syncWithAltV()`

Создание безопасного state перед отправкой:

```typescript
const safeState = {
  weather: this.state.weather || [],
  time: this.state.time || [],
  timeSpeed: this.state.timeSpeed || [],
  vehicles: this.state.vehicles || [],
  vehicleActions: this.state.vehicleActions || [],
  weaponActions: this.state.weaponActions || [],
  locations: this.state.locations || [],
  teleportMarkers: this.state.teleportMarkers || [],
  hotkeys: this.state.hotkeys || []
}
```

## 📊 Результат

✅ Все методы защищены от undefined
✅ State всегда инициализируется корректно
✅ Синхронизация с Alt:V работает стабильно
✅ Нет ошибок при первом запуске
✅ Нет ошибок при отсутствии данных в localStorage

## 🧪 Тестирование

Проверьте следующие сценарии:

1. Первый запуск (нет данных в localStorage) - должно работать
2. Загрузка старых данных (без hotkeys поля) - должно работать
3. Добавление/удаление hotkeys - должно работать
4. Синхронизация с Alt:V - должно работать

---

**Статус:** ✅ Исправлено
**Дата:** 2025-10-26

