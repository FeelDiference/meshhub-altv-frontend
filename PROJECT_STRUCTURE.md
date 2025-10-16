с# MeshHub ALT:V — Интеграция WebView (сборка и деплой)

## Где править исходники

- WebView (React/Vite): `meshhub_altv_integration/client/src/**`
- Клиент ALT:V: `altv-server/resources/meshhub/client/script.js`
- Сервер ALT:V: `altv-server/resources/meshhub/server/index.js`

## Сборка фронтенда

1. В каталоге `meshhub_altv_integration` запустить:
   ```bash
   npx vite build
   ```
2. Результат: `dist/index.html` и `dist/assets/*`.

## Копирование в ресурс ALT:V

Скопировать файлы в `altv-server/resources/meshhub/client/`:

- `dist/index.html` → `client/index.html`
- `dist/assets/*` → `client/assets/*`

После копирования перезапустить ресурс в консоли сервера:

```
/restart meshhub
```

## Как работает панели и доступность

- При F10 клиент сообщает WebView текущее состояние:
  - Если игрок сидит в авто — открываются обе панели (слайдеры + handling.meta), редактирование доступно.
  - Если игрок не в авто — открыта только правая панель handling.meta.
- Слайдеры активны только если текущая модель совпадает с выбранной.

## Загрузка handling.meta

- Файл загружается с бэка вызовами `find-by-name` → `rpf-content`.
- После загрузки в левой панели формируются «заводские» значения для Reset.

## Reset параметров

- Кнопка «Сбросить параметры» внизу левой панели возвращает значения слайдеров к исходным.
- Одновременно отправляется применение в игру (через ALT:V) и правый XML обновляется.

## Полезные пути

- Путь загрузки DLC: `resources/meshhub_resources/vehicles/<vehicleName>/dlc.rpf`
- Кэш установленных: `resources/meshhub/.cache/installed.json`

# 📁 СТРУКТУРА ПРОЕКТА

## Полная файловая структура

```
meshhub_altv_integration/
├── README.md
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.cjs
├── .gitignore
│
├── client/                          # WebView интерфейс (React)
│   ├── src/
│   │   ├── main.tsx                # Точка входа
│   │   ├── App.tsx                 # Главный компонент
│   │   ├── styles.css              # Глобальные стили
│   │   │
│   │   ├── config/                 # Конфигурация
│   │   │   ├── api.ts             # API endpoints для hub.feeld.space
│   │   │   └── altv.ts            # Конфигурация для alt:v
│   │   │
│   │   ├── components/             # UI компоненты
│   │   │   ├── auth/              # Авторизация
│   │   │   │   ├── LoginForm.tsx
│   │   │   │   └── SessionManager.tsx
│   │   │   │
│   │   │   ├── layout/            # Макет приложения
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── Header.tsx
│   │   │   │   └── MenuItem.tsx
│   │   │   │
│   │   │   ├── vehicles/          # Модуль автомобилей
│   │   │   │   ├── VehicleList.tsx
│   │   │   │   ├── VehicleCard.tsx
│   │   │   │   ├── VehicleDownloader.tsx
│   │   │   │   ├── VehicleSpawner.tsx
│   │   │   │   └── VehicleEditor.tsx
│   │   │   │
│   │   │   ├── editor/            # Редактор параметров
│   │   │   │   ├── HandlingEditor.tsx
│   │   │   │   ├── sections/
│   │   │   │   │   ├── PhysicsSection.tsx
│   │   │   │   │   ├── TransmissionSection.tsx
│   │   │   │   │   ├── TractionSection.tsx
│   │   │   │   │   ├── SuspensionSection.tsx
│   │   │   │   │   └── DamageSection.tsx
│   │   │   │   ├── SavePanel.tsx
│   │   │   │   └── LivePreview.tsx
│   │   │   │
│   │   │   ├── common/            # Общие компоненты
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   ├── Spinner.tsx
│   │   │   │   ├── Toast.tsx
│   │   │   │   ├── Slider.tsx
│   │   │   │   ├── Card.tsx
│   │   │   │   └── ProgressBar.tsx
│   │   │   │
│   │   │   └── placeholders/      # Заглушки для будущих модулей
│   │   │       ├── InteriorsPlaceholder.tsx
│   │   │       └── WeaponsPlaceholder.tsx
│   │   │
│   │   ├── services/              # Сервисы
│   │   │   ├── api.ts            # HTTP клиент для MeshHub
│   │   │   ├── auth.ts           # Авторизация
│   │   │   ├── session.ts        # Управление сессиями (шифрование)
│   │   │   ├── vehicles.ts       # API для автомобилей
│   │   │   ├── download.ts       # Загрузка ресурсов
│   │   │   └── altv-bridge.ts    # Мост для общения с ALT:V
│   │   │
│   │   ├── hooks/                 # React hooks
│   │   │   ├── useAuth.ts
│   │   │   ├── useVehicles.ts
│   │   │   ├── useHandlingEditor.ts
│   │   │   ├── useDownload.ts
│   │   │   ├── useLiveUpdate.ts
│   │   │   └── useAltV.ts        # Взаимодействие с alt:v
│   │   │
│   │   ├── types/                 # TypeScript типы
│   │   │   ├── vehicle.ts
│   │   │   ├── handling.ts
│   │   │   ├── auth.ts
│   │   │   ├── download.ts
│   │   │   └── altv.ts
│   │   │
│   │   ├── utils/                 # Утилиты
│   │   │   ├── crypto.ts         # Шифрование для сессий
│   │   │   ├── validation.ts     # Валидация
│   │   │   ├── formatting.ts     # Форматирование значений
│   │   │   ├── xml-generator.ts  # Генерация handling.meta XML
│   │   │   └── altv-natives.ts   # Обертки для ALT:V нативов
│   │   │
│   │   └── pages/                 # Страницы
│   │       ├── LoginPage.tsx
│   │       ├── Dashboard.tsx
│   │       ├── VehiclesPage.tsx
│   │       ├── VehicleEditorPage.tsx
│   │       ├── InteriorsPage.tsx
│   │       └── WeaponsPage.tsx
│   │
│   ├── public/                    # Публичные файлы
│   │   └── assets/
│   │       ├── logo.png
│   │       └── icons/
│   │
│   └── index.html
│
├── server/                        # ALT:V серверная часть
│   ├── resources/
│   │   └── meshhub/
│   │       ├── resource.toml     # Конфигурация ресурса
│   │       │
│   │       ├── server/           # Серверная логика
│   │       │   ├── index.ts
│   │       │   ├── commands.ts
│   │       │   ├── events.ts
│   │       │   ├── vehicle-manager.ts
│   │       │   └── api-client.ts
│   │       │
│   │       └── client/           # Клиентская логика
│   │           ├── index.ts
│   │           ├── webview.ts
│   │           ├── vehicle-controller.ts
│   │           ├── handling-applier.ts
│   │           └── natives/
│   │               ├── vehicle.ts
│   │               └── ui.ts
│   │
│   └── meshub-installer/         # Скрипт установки
│       ├── install.js
│       └── README.md
│
├── docs/                          # Документация
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── INSTALLATION.md
│   ├── USAGE.md
│   ├── CONTRIBUTING.md
│   └── CHANGELOG.md
│
└── scripts/                       # Скрипты сборки
    ├── build.sh
    ├── build-webview.sh
    ├── build-resource.sh
    └── dev.sh
```

## 📦 Описание ключевых директорий

### `/client`
WebView интерфейс на React. Это то, что видит пользователь в игре.

**Особенности**:
- Прозрачный фон
- Адаптивный дизайн
- Идентичный стиль MeshHub

### `/server/resources/meshhub`
ALT:V ресурс с серверной и клиентской логикой.

**Серверная часть** (`server/`):
- Обработка команд
- API запросы к hub.feeld.space
- Управление игроками

**Клиентская часть** (`client/`):
- Управление WebView
- Спавн автомобилей
- Применение параметров через нативы

### `/docs`
Полная документация проекта.

### `/scripts`
Скрипты для сборки и разработки.

## 🔧 Конфигурационные файлы

### `package.json`
```json
{
  "name": "meshhub-altv-integration",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "framer-motion": "^11.18.2",
    "lucide-react": "^0.453.0",
    "axios": "^1.6.0",
    "crypto-js": "^4.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.5",
    "@types/react-dom": "^18.3.0",
    "@types/crypto-js": "^4.2.0",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.13",
    "typescript": "^5.5.4",
    "vite": "^5.4.5"
  }
}
```

### `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./client/src/*"]
    },
    "strict": true
  },
  "include": ["client/src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### `tailwind.config.js`
```js
// Идентичная конфигурация из rpf-frontend
module.exports = {
  content: [
    "./client/index.html",
    "./client/src/**/*.{ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Roboto",
          "-apple-system",
          "BlinkMacSystemFont",
          "Helvetica Neue",
          "system-ui",
          "sans-serif",
        ],
      },
      colors: {
        base: {
          50: "#fafafa",
          100: "#f5f5f5",
          200: "#e5e5e5",
          300: "#d4d4d4",
          400: "#a3a3a3",
          500: "#737373",
          600: "#525252",
          700: "#3a3a3a",
          800: "#1f1f1f",
          900: "#141414",
          950: "#0a0a0a",
        },
      },
      boxShadow: {
        soft: "0 10px 30px -12px rgba(0,0,0,0.35)",
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};
```

### `vite.config.ts`
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
```

### `resource.toml`
```toml
type = 'js'
client-main = 'client/index.js'
server-main = 'server/index.js'

client-files = [
    'client/*',
    'webview/*'
]

[deps]
```

## 📝 Примечания

### Модульность
Структура спроектирована так, чтобы легко добавлять новые модули:
1. Создать компонент в `/components/{module_name}/`
2. Добавить страницу в `/pages/{ModuleName}Page.tsx`
3. Зарегистрировать в меню в `App.tsx`

### Переиспользование кода
Максимальное переиспользование компонентов из `rpf-frontend`:
- Те же UI компоненты
- Те же стили
- Те же утилиты

### Расширяемость
Архитектура позволяет:
- Добавлять новые типы ресурсов (не только авто)
- Расширять функционал редактора
- Добавлять новые режимы сохранения




