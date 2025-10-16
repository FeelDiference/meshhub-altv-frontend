# ALT:V Installation Guide

## Установка и настройка ALT:V интеграции

### 🎯 Фаза 3: ALT:V интеграция - ЗАВЕРШЕНА ✅

### Структура проекта

```
meshhub_altv_integration/
├── client/                     # React WebView приложение
│   ├── src/
│   │   ├── services/
│   │   │   └── altv-bridge.ts  # Мост для коммуникации с ALT:V
│   │   ├── hooks/
│   │   │   └── useALTV.ts      # React хук для ALT:V
│   │   └── types/
│   │       └── altv.ts         # Типы ALT:V событий
├── server/resources/meshhub/    # ALT:V ресурс
│   ├── resource.toml           # Конфигурация ресурса
│   ├── client.js               # Client-side скрипт
│   ├── server.js               # Server-side скрипт
│   └── src/                    # TypeScript исходники (для разработки)
```

### Установка в ALT:V сервер

#### 1. Копирование ресурса

```bash
# Скопируйте папку ресурса в ваш ALT:V сервер
cp -r server/resources/meshhub /path/to/your/altv/server/resources/
```

#### 2. Настройка server.toml

Добавьте ресурс в конфигурацию сервера:

```toml
# server.toml
resources = [
  "meshhub",
  # ... другие ресурсы
]
```

#### 3. Настройка WebView URL

**Вариант A: Локальная разработка**
- Запустите WebView сервер: `npm run dev` (порт 3000)
- В `client.js` используется `http://localhost:3000`

**Вариант B: Production**
- Соберите WebView: `npm run build`
- Загрузите собранный build на веб-хостинг
- Обновите URL в `client.js`

### Использование

#### Команды в игре

```
/meshhub           - Открыть/закрыть панель
/meshhub open      - Открыть панель
/meshhub close     - Закрыть панель
/meshhub help      - Показать справку
```

#### Горячие клавиши

- **F10** - Открыть/закрыть панель
- **ESC** - Закрыть панель (только когда открыта)

#### Функциональность

1. **Спавн автомобилей**
   - Выберите автомобиль из списка
   - Автомобиль заспавнится перед игроком
   - Игрок автоматически сядет в автомобиль

2. **Управление автомобилями**
   - Удаление текущего автомобиля
   - Просмотр информации об автомобиле

### События между WebView и ALT:V

#### WebView → Client
```typescript
'vehicle:spawn'        // Запрос на спавн автомобиля
'vehicle:destroy'      // Запрос на удаление
'panel:close'          // Запрос на закрытие панели
'handling:update'      // Обновление параметров handling (будущее)
'installation:check'   // Проверка установки модели (будущее)
```

#### Client → WebView
```typescript
'vehicle:spawned'      // Автомобиль заспавнен
'vehicle:destroyed'    // Автомобиль удален
'panel:opened'         // Панель открыта
'panel:closed'         // Панель закрыта
'handling:applied'     // Параметры применены (будущее)
```

### Режимы работы

#### 🎮 ALT:V Mode (в игре)
- Полная функциональность
- Реальный спавн автомобилей
- Интеграция с game natives
- Обмен событиями с сервером

#### 🌐 Browser Mode (разработка)
- Demo режим для тестирования UI
- Эмуляция событий ALT:V
- Полнофункциональная авторизация
- Отладка интерфейса

### Разработка и отладка

#### Запуск для разработки

```bash
# Terminal 1: WebView development server
npm run dev

# Terminal 2: ALT:V server (если нужен)
# Запустите ваш ALT:V сервер с ресурсом meshhub
```

#### TypeScript разработка (опционально)

```bash
cd server/resources/meshhub
npm install
npm run dev  # Компиляция TypeScript в watch режиме
```

#### Логи и отладка

**Client-side логи:**
- Откройте F8 консоль в ALT:V
- Найдите логи с префиксом `[MeshHub]`

**Server-side логи:**
- Проверьте консоль ALT:V сервера
- Логи событий и команд

**WebView логи:**
- F12 Developer Tools в браузере (dev режим)
- Console.log в WebView

### Troubleshooting

#### ❌ WebView не загружается
1. Проверьте URL в `client.js`
2. Убедитесь что dev server запущен (локально)
3. Проверьте network доступ к URL

#### ❌ Команды не работают
1. Проверьте что ресурс загружен: `/restart meshhub`
2. Проверьте server.toml конфигурацию
3. Проверьте логи сервера

#### ❌ Автомобили не спавнятся
1. Проверьте что модель валидна
2. Проверьте позицию игрока
3. Проверьте server-side логи

### Расширение функциональности

#### Добавление новых моделей автомобилей

```javascript
// В VehiclesPage компоненте
const testVehicles = [
  { name: 'your_model', label: 'Your Model Name' },
  // ...
]
```

#### Добавление новых событий

```typescript
// В altv-bridge.ts
interface WebViewToClientEvents {
  'your:event': { data: any }
}
```

### Безопасность

- ✅ Авторизация через MeshHub Backend
- ✅ Проверка владельца автомобилей
- ✅ Валидация моделей автомобилей
- ⚠️ Admin права (требует интеграции с вашей системой прав)

### Производительность

- ✅ Lazy loading компонентов
- ✅ Оптимизированные события
- ✅ Минимальное количество запросов
- ✅ Эффективная очистка ресурсов

---

## Статус интеграции: ✅ ГОТОВО К ТЕСТИРОВАНИЮ

### Что работает:
- ✅ WebView панель с React UI
- ✅ Авторизация через MeshHub Backend
- ✅ Спавн автомобилей через команды и UI
- ✅ Hotkeys (F10, ESC)
- ✅ Двунаправленная коммуникация WebView ↔ ALT:V
- ✅ Demo режим для браузера
- ✅ Детекция ALT:V vs Browser режима

### Следующие этапы:
- 🔄 Система handling параметров
- 🔄 Интеграция с MeshHub catalog API
- 🔄 Системы прав и ролей
- 🔄 Сохранение конфигураций

Готов к тестированию в ALT:V! 🚀
