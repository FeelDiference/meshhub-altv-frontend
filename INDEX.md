# 📚 ИНДЕКС ДОКУМЕНТАЦИИ

> Навигация по всей документации проекта MeshHub ALT-V Integration

## 🎯 Начало работы

Если вы новичок в проекте, рекомендуем читать документы в следующем порядке:

1. **[README.md](./README.md)** - Краткое описание проекта
2. **[DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md)** - Общая концепция и цели
3. **[PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)** - Понять структуру файлов
4. **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Понять архитектуру системы
5. **[IMPLEMENTATION_PHASES.md](./IMPLEMENTATION_PHASES.md)** - План реализации
6. **[API_SPECIFICATION.md](./API_SPECIFICATION.md)** - API endpoints
7. **[BACKEND_INTEGRATION.md](./BACKEND_INTEGRATION.md)** - Backend интеграция

## 📖 Основные документы

### 📋 [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md)
**Что внутри**:
- 🎯 Общая концепция проекта
- 📝 Описание основных функций
- 🎨 Дизайн и UI/UX
- 🛠️ Технологический стек
- ⚡ Быстрый старт
- 🎯 Цели проекта

**Когда читать**: Первым делом, чтобы понять суть проекта

---

### 📁 [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)
**Что внутри**:
- 📦 Полная файловая структура
- 📂 Описание ключевых директорий
- 🔧 Конфигурационные файлы (package.json, tsconfig.json, tailwind.config.js, и т.д.)
- 📝 Примечания по модульности и расширяемости

**Когда читать**: Перед началом разработки, чтобы понять где что находится

---

### 🏗️ [ARCHITECTURE.md](./ARCHITECTURE.md)
**Что внутри**:
- 🗺️ Обзор архитектуры (диаграммы)
- 🧩 Компоненты системы:
  - WebView (React Application)
  - ALT:V Client Scripts
  - ALT:V Server Scripts
  - MeshHub Backend Integration
- 🔄 Потоки данных
- 🔐 Безопасность
- 📈 Расширяемость
- ⚡ Производительность

**Когда читать**: Чтобы понять как все компоненты взаимодействуют

---

### 🚀 [IMPLEMENTATION_PHASES.md](./IMPLEMENTATION_PHASES.md)
**Что внутри**:
- 📅 Детальный план по фазам (9 фаз)
- ✅ Чек-листы задач для каждой фазы
- ⏱️ Оценка времени
- 🎯 Критерии готовности
- 📊 Метрики успеха

**Фазы**:
1. Инфраструктура и настройка (1-2 дня)
2. Система авторизации (2-3 дня)
3. ALT:V интеграция (2-3 дня)
4. UI и система меню (2-3 дня)
5. Модуль автомобилей - Список (3-4 дня)
6. Загрузка и установка ресурсов (3-4 дня)
7. Спавн и редактор параметров (5-7 дней)
8. Сохранение параметров (4-5 дней)
9. Тестирование и полировка (3-5 дней)

**Когда читать**: При планировании спринтов и задач

---

### 📡 [API_SPECIFICATION.md](./API_SPECIFICATION.md)
**Что внутри**:
- 🌐 MeshHub Backend API
  - POST /api/auth/login
  - GET /api/rpf/vehicles
  - GET /api/rpf/vehicles/{id}
  - GET /api/rpf/vehicles/{id}/download
  - POST /api/rpf/vehicles/{id}/handling
- 🔌 ALT:V Client ↔ WebView Events
- 📨 ALT:V Server ↔ Client Events
- 📝 TypeScript типы
- ⚠️ Коды ошибок
- ⏱️ Rate Limiting
- 💡 Примеры использования

**Когда читать**: При реализации API запросов и событий

---

### 🔌 [BACKEND_INTEGRATION.md](./BACKEND_INTEGRATION.md)
**Что внутри**:
- 🆕 Новые файлы для backend
- 📝 Handlers для автомобилей (vehicle_handlers.go)
- 🔧 Services (vehicle_updater.go, vehicle_validator.go)
- 🗃️ API Models (vehicle_api.go)
- 🛣️ Регистрация роутов
- 💾 База данных (новые таблицы)
- ⚙️ Конфигурация
- 🧪 Тестирование
- 📊 Мониторинг и логирование
- 🔐 Безопасность
- ⚡ Производительность

**Когда читать**: При работе с backend частью

---

## 🗂️ Дополнительные файлы

### [.gitignore](./.gitignore)
Исключения для Git (node_modules, dist, и т.д.)

---

## 📊 Быстрая навигация по темам

### 🔐 Авторизация
- [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md) - Раздел "Авторизация"
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Раздел "Безопасность"
- [IMPLEMENTATION_PHASES.md](./IMPLEMENTATION_PHASES.md) - Фаза 2
- [API_SPECIFICATION.md](./API_SPECIFICATION.md) - POST /api/auth/login

### 🚗 Модуль автомобилей
- [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md) - Раздел "Настройка автомобилей"
- [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) - `/client/src/components/vehicles/`
- [IMPLEMENTATION_PHASES.md](./IMPLEMENTATION_PHASES.md) - Фазы 5, 6, 7
- [API_SPECIFICATION.md](./API_SPECIFICATION.md) - /api/rpf/vehicles endpoints

### ⚙️ Редактор параметров
- [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md) - Раздел "Редактор параметров INGAME"
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Раздел "Редактор параметров"
- [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) - `/client/src/components/editor/`
- [IMPLEMENTATION_PHASES.md](./IMPLEMENTATION_PHASES.md) - Фаза 7

### 💾 Сохранение
- [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md) - Раздел "Сохранение параметров"
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Раздел "Сохранение параметров"
- [IMPLEMENTATION_PHASES.md](./IMPLEMENTATION_PHASES.md) - Фаза 8
- [API_SPECIFICATION.md](./API_SPECIFICATION.md) - POST /api/rpf/vehicles/{id}/handling
- [BACKEND_INTEGRATION.md](./BACKEND_INTEGRATION.md) - vehicle_updater.go

### 🔌 ALT:V интеграция
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Разделы "ALT:V Client Scripts" и "ALT:V Server Scripts"
- [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) - `/server/resources/meshhub/`
- [IMPLEMENTATION_PHASES.md](./IMPLEMENTATION_PHASES.md) - Фаза 3
- [API_SPECIFICATION.md](./API_SPECIFICATION.md) - ALT:V Events

### 🎨 UI/UX
- [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md) - Раздел "Дизайн"
- [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) - tailwind.config.js
- [IMPLEMENTATION_PHASES.md](./IMPLEMENTATION_PHASES.md) - Фаза 4

---

## 🔍 Поиск по ключевым словам

| Ключевое слово | Где искать |
|----------------|------------|
| **handling** | API_SPECIFICATION.md, BACKEND_INTEGRATION.md, ARCHITECTURE.md |
| **авторизация** | DEVELOPMENT_PLAN.md, ARCHITECTURE.md, IMPLEMENTATION_PHASES.md |
| **WebView** | ARCHITECTURE.md, PROJECT_STRUCTURE.md, IMPLEMENTATION_PHASES.md |
| **скачивание** | DEVELOPMENT_PLAN.md, IMPLEMENTATION_PHASES.md, API_SPECIFICATION.md |
| **спавн** | ARCHITECTURE.md, IMPLEMENTATION_PHASES.md, API_SPECIFICATION.md |
| **валидация** | BACKEND_INTEGRATION.md, API_SPECIFICATION.md |
| **бэкап** | BACKEND_INTEGRATION.md, API_SPECIFICATION.md |
| **шифрование** | DEVELOPMENT_PLAN.md, ARCHITECTURE.md |
| **TypeScript типы** | API_SPECIFICATION.md, PROJECT_STRUCTURE.md |

---

## 📈 Прогресс проекта

### ✅ Завершено
- [x] Планирование
- [x] Архитектура
- [x] Документация
- [x] API спецификация
- [x] Структура проекта

### 🚧 В процессе
- [ ] Инициализация проекта
- [ ] Разработка

### ⏳ Запланировано
- [ ] Тестирование
- [ ] Деплой

---

## 💡 Советы по использованию документации

1. **Для менеджеров**: Начните с [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md) и [IMPLEMENTATION_PHASES.md](./IMPLEMENTATION_PHASES.md)

2. **Для разработчиков Frontend**: 
   - [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) - `/client/`
   - [ARCHITECTURE.md](./ARCHITECTURE.md) - WebView
   - [API_SPECIFICATION.md](./API_SPECIFICATION.md) - События и типы

3. **Для разработчиков Backend**:
   - [BACKEND_INTEGRATION.md](./BACKEND_INTEGRATION.md)
   - [API_SPECIFICATION.md](./API_SPECIFICATION.md) - Endpoints

4. **Для разработчиков ALT:V**:
   - [ARCHITECTURE.md](./ARCHITECTURE.md) - ALT:V Scripts
   - [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) - `/server/`
   - [API_SPECIFICATION.md](./API_SPECIFICATION.md) - ALT:V Events

5. **Для тестировщиков**:
   - [IMPLEMENTATION_PHASES.md](./IMPLEMENTATION_PHASES.md) - Фаза 9
   - [API_SPECIFICATION.md](./API_SPECIFICATION.md) - Все endpoints

---

## 🆘 Нужна помощь?

- Если не можете найти нужную информацию, используйте поиск по файлам (Ctrl+F)
- Проверьте раздел "Поиск по ключевым словам" выше
- Каждый документ имеет подробное содержание в начале

---

**Последнее обновление**: 15 октября 2025  
**Версия документации**: 1.0

