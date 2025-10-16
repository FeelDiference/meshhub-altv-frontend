# 🏗️ АРХИТЕКТУРА СИСТЕМЫ

## Обзор архитектуры

```
┌─────────────────┐
│   ALT:V Game    │
│                 │
│  ┌───────────┐  │     ┌──────────────────────┐
│  │  WebView  │◄─┼─────┤  React Application   │
│  │ (Overlay) │  │     │  (client/src/)       │
│  └─────▲─────┘  │     └──────────┬───────────┘
│        │        │                │
│  ┌─────┴─────┐  │                │
│  │   Client  │  │                │
│  │  Scripts  │  │                │
│  └─────▲─────┘  │                │
│        │        │                │
│  ┌─────┴─────┐  │                │
│  │  Server   │  │                │
│  │  Scripts  │  │                │
│  └─────▲─────┘  │                │
└────────┼────────┘                │
         │                         │
         │  ┌──────────────────────┘
         │  │
         ▼  ▼
   ┌──────────────────────┐
   │   MeshHub Backend    │
   │  (hub.feeld.space)   │
   │                      │
   │  ┌────────────────┐  │
   │  │   PostgreSQL   │  │
   │  └────────────────┘  │
   │  ┌────────────────┐  │
   │  │  RPF Archives  │  │
   │  └────────────────┘  │
   └──────────────────────┘
```

## Компоненты системы

### 1. WebView (React Application)

**Назначение**: Пользовательский интерфейс

**Технологии**:
- React 18 + TypeScript
- Tailwind CSS
- Framer Motion
- Axios

**Ключевые особенности**:
- Прозрачный фон
- Позиция: справа, 400px ширина
- Overlay режим (не блокирует игру)
- Темная тема

**Основные модули**:

```typescript
// Структура состояния приложения
interface AppState {
  auth: {
    isAuthenticated: boolean;
    user: User | null;
    token: string | null;
  };
  vehicles: {
    list: VehicleResource[];
    selected: VehicleResource | null;
    currentSpawned: number | null;
  };
  editor: {
    originalHandling: HandlingData | null;
    currentHandling: HandlingData | null;
    isDirty: boolean;
  };
  ui: {
    currentPage: PageName;
    isLoading: boolean;
    notifications: Notification[];
  };
}
```

### 2. ALT:V Client Scripts

**Назначение**: Клиентская логика в игре

**Файлы**:
- `client/index.ts` - точка входа
- `client/webview.ts` - управление WebView
- `client/vehicle-controller.ts` - управление автомобилями
- `client/handling-applier.ts` - применение параметров

**Ключевые функции**:

```typescript
// client/index.ts
import * as alt from 'alt-client';
import { WebViewManager } from './webview';
import { VehicleController } from './vehicle-controller';

alt.on('connectionComplete', () => {
  WebViewManager.init();
});

alt.onServer('meshhub:open', () => {
  WebViewManager.show();
});

// client/webview.ts
export class WebViewManager {
  static webview: alt.WebView | null = null;
  
  static init(): void {
    this.webview = new alt.WebView('http://localhost:3000', false);
    this.webview.pos = { x: 1920 - 400, y: 0 };
    this.webview.size = { x: 400, y: 1080 };
    this.webview.isVisible = false;
    
    // Регистрация обработчиков
    this.registerHandlers();
  }
  
  static show(): void {
    if (this.webview) {
      this.webview.isVisible = true;
      alt.showCursor(true);
    }
  }
  
  static hide(): void {
    if (this.webview) {
      this.webview.isVisible = false;
      alt.showCursor(false);
    }
  }
  
  static registerHandlers(): void {
    this.webview?.on('vehicle:spawn', (modelName: string) => {
      VehicleController.spawn(modelName);
    });
    
    this.webview?.on('handling:update', (param: string, value: number) => {
      VehicleController.updateHandling(param, value);
    });
    
    this.webview?.on('panel:close', () => {
      this.hide();
    });
  }
}

// client/vehicle-controller.ts
export class VehicleController {
  static currentVehicle: alt.Vehicle | null = null;
  
  static async spawn(modelName: string): Promise<void> {
    // 1. Удалить предыдущее авто
    if (this.currentVehicle) {
      this.currentVehicle.destroy();
    }
    
    // 2. Загрузить модель
    const hash = alt.hash(modelName);
    await this.loadModel(hash);
    
    // 3. Получить позицию игрока
    const player = alt.Player.local;
    const pos = player.pos;
    const heading = player.rot.z;
    
    // 4. Создать автомобиль
    const spawnPos = {
      x: pos.x + 3 * Math.cos(heading),
      y: pos.y + 3 * Math.sin(heading),
      z: pos.z
    };
    
    this.currentVehicle = new alt.Vehicle(hash, spawnPos.x, spawnPos.y, spawnPos.z, 0, 0, heading);
    
    // 5. Посадить игрока
    await alt.Utils.wait(100);
    native.setPedIntoVehicle(player.scriptID, this.currentVehicle.scriptID, -1);
    
    // 6. Уведомить WebView
    WebViewManager.webview?.emit('vehicle:spawned', {
      vehicleId: this.currentVehicle.id,
      modelName: modelName
    });
  }
  
  static updateHandling(param: string, value: number): void {
    if (!this.currentVehicle) return;
    
    // Применить параметр через нативы
    HandlingApplier.apply(this.currentVehicle, param, value);
  }
  
  private static loadModel(hash: number): Promise<void> {
    return new Promise((resolve) => {
      native.requestModel(hash);
      const interval = alt.setInterval(() => {
        if (native.hasModelLoaded(hash)) {
          alt.clearInterval(interval);
          resolve();
        }
      }, 100);
    });
  }
}

// client/handling-applier.ts
export class HandlingApplier {
  static apply(vehicle: alt.Vehicle, param: string, value: number): void {
    const veh = vehicle.scriptID;
    
    switch (param) {
      // Физика
      case 'fMass':
        native.setVehicleHandlingFloat(veh, 'CHandlingData', 'fMass', value);
        break;
      case 'fInitialDragCoeff':
        native.setVehicleHandlingFloat(veh, 'CHandlingData', 'fInitialDragCoeff', value);
        break;
      
      // Трансмиссия
      case 'fDriveBiasFront':
        native.setVehicleHandlingFloat(veh, 'CHandlingData', 'fDriveBiasFront', value);
        break;
      case 'nInitialDriveGears':
        native.setVehicleHandlingInt(veh, 'CHandlingData', 'nInitialDriveGears', Math.floor(value));
        break;
      case 'fInitialDriveForce':
        native.setVehicleHandlingFloat(veh, 'CHandlingData', 'fInitialDriveForce', value);
        break;
      case 'fBrakeForce':
        native.setVehicleHandlingFloat(veh, 'CHandlingData', 'fBrakeForce', value);
        break;
      case 'fSteeringLock':
        native.setVehicleHandlingFloat(veh, 'CHandlingData', 'fSteeringLock', value);
        break;
      
      // Тяга
      case 'fTractionCurveMax':
        native.setVehicleHandlingFloat(veh, 'CHandlingData', 'fTractionCurveMax', value);
        break;
      case 'fTractionCurveMin':
        native.setVehicleHandlingFloat(veh, 'CHandlingData', 'fTractionCurveMin', value);
        break;
      
      // Подвеска
      case 'fSuspensionForce':
        native.setVehicleHandlingFloat(veh, 'CHandlingData', 'fSuspensionForce', value);
        break;
      case 'fSuspensionCompDamp':
        native.setVehicleHandlingFloat(veh, 'CHandlingData', 'fSuspensionCompDamp', value);
        break;
      
      // ... и так далее для всех ~60 параметров
    }
    
    // Применить изменения
    native.modifyVehicleTopSpeed(veh, 1.0);
  }
}
```

### 3. ALT:V Server Scripts

**Назначение**: Серверная логика

**Файлы**:
- `server/index.ts` - точка входа
- `server/commands.ts` - команды
- `server/api-client.ts` - клиент для MeshHub API

**Ключевые функции**:

```typescript
// server/index.ts
import * as alt from 'alt-server';
import { registerCommands } from './commands';

alt.on('playerConnect', (player: alt.Player) => {
  alt.log(`[MeshHub] Player ${player.name} connected`);
});

registerCommands();

// server/commands.ts
import * as alt from 'alt-server';

export function registerCommands(): void {
  alt.on('consoleCommand', (name: string, ...args: string[]) => {
    if (name === 'meshhub') {
      // Отправить событие клиенту для открытия UI
      const player = alt.Player.all[0]; // Для примера
      alt.emitClient(player, 'meshhub:open');
    }
  });
}

// server/api-client.ts
import axios from 'axios';

const API_URL = 'https://hub.feeld.space';

export class MeshHubAPI {
  static async getVehicles(): Promise<VehicleResource[]> {
    const response = await axios.get(`${API_URL}/api/rpf/vehicles`);
    return response.data;
  }
  
  static async downloadVehicle(id: string): Promise<Blob> {
    const response = await axios.get(`${API_URL}/api/rpf/vehicles/${id}/download`, {
      responseType: 'blob'
    });
    return response.data;
  }
  
  static async saveHandling(id: string, handling: HandlingData): Promise<SaveResult> {
    const response = await axios.post(`${API_URL}/api/rpf/vehicles/${id}/handling`, handling);
    return response.data;
  }
}
```

### 4. MeshHub Backend Integration

**Новые эндпоинты**:

```go
// GET /api/rpf/vehicles
// Возвращает список всех автомобилей с метаданными
func (h *RPFHandler) GetVehicles(w http.ResponseWriter, r *http.Request) {
  // 1. Получить все архивы типа vehicle из БД
  // 2. Фильтровать только те, у которых есть метаданные
  // 3. Вернуть список с полной информацией
}

// GET /api/rpf/vehicles/{id}/download
// Скачать ресурс в формате ZIP
func (h *RPFHandler) DownloadVehicle(w http.ResponseWriter, r *http.Request) {
  // 1. Найти архив по ID
  // 2. Запаковать в ZIP (уже есть в download_service.go)
  // 3. Отдать ZIP
}

// POST /api/rpf/vehicles/{id}/handling
// Сохранить handling.meta в RPF
func (h *RPFHandler) SaveVehicleHandling(w http.ResponseWriter, r *http.Request) {
  // 1. Получить handling из body
  // 2. Найти .rpf архив
  // 3. Извлечь handling.meta
  // 4. Создать бэкап
  // 5. Обновить XML
  // 6. Перепаковать .rpf
  // 7. Обновить метаданные в БД
  // 8. Вернуть результат
}
```

## Потоки данных

### Авторизация

```
User -> WebView -> hub.feeld.space/api/auth/login
                         ↓
                    JWT Token
                         ↓
                   SessionManager (шифрование AES-256)
                         ↓
                   LocalStorage
```

### Загрузка списка автомобилей

```
WebView -> GET /api/rpf/vehicles
             ↓
        Backend проверяет метаданные
             ↓
        Возвращает список [{id, name, metadata, ...}]
             ↓
        WebView отображает карточки
```

### Скачивание автомобиля

```
User нажимает "Скачать"
        ↓
WebView -> GET /api/rpf/vehicles/{id}/download
        ↓
Backend создает ZIP
        ↓
WebView получает Blob
        ↓
Сохранение в resources/meshhub/{name}/dlc.rpf
        ↓
Уведомление о перезапуске
```

### Спавн и редактирование

```
User нажимает "Заспавнить"
        ↓
WebView -> emit('vehicle:spawn', modelName)
        ↓
ALT:V Client -> VehicleController.spawn()
        ↓
Создание автомобиля, посадка игрока
        ↓
Client -> emit('vehicle:spawned', {id, modelName})
        ↓
WebView переключается на редактор
        ↓
User изменяет параметр
        ↓
WebView -> emit('handling:update', param, value)
        ↓
Client -> HandlingApplier.apply()
        ↓
Применение через нативы (LIVE)
```

### Сохранение (Server Mode)

```
User выбирает "Server" и нажимает "Сохранить"
        ↓
WebView -> POST /api/rpf/vehicles/{id}/handling
        ↓
Backend:
  - Извлекает handling.meta из .rpf
  - Создает бэкап
  - Обновляет XML
  - Перепаковывает .rpf
  - Обновляет БД
        ↓
Возвращает результат
        ↓
WebView показывает уведомление:
"Успешно сохранено! Перекачать и перезапустить?"
```

### Сохранение (Client Mode)

```
User выбирает "Client" и нажимает "Сохранить"
        ↓
WebView генерирует XML
        ↓
Создает Blob
        ↓
Скачивает как handling_{name}.meta
```

## Безопасность

### Шифрование сессий

```typescript
// utils/crypto.ts
import CryptoJS from 'crypto-js';

export class SessionCrypto {
  private static getKey(): string {
    // Используем hardware ID как ключ
    // В ALT:V можно получить через alt.getMacAddress() или подобное
    return 'unique-hardware-id';
  }
  
  static encrypt(data: any): string {
    const key = this.getKey();
    const json = JSON.stringify(data);
    return CryptoJS.AES.encrypt(json, key).toString();
  }
  
  static decrypt(encrypted: string): any {
    const key = this.getKey();
    const bytes = CryptoJS.AES.decrypt(encrypted, key);
    const json = bytes.toString(CryptoJS.enc.Utf8);
    return JSON.parse(json);
  }
}
```

### HTTPS

Все запросы к `hub.feeld.space` через HTTPS.

### Валидация

Валидация на клиенте И сервере для всех параметров.

## Расширяемость

### Добавление нового модуля

1. Создать компоненты в `/components/{module}/`
2. Создать страницу в `/pages/{Module}Page.tsx`
3. Добавить в меню:

```typescript
// App.tsx
const menuItems: MenuItem[] = [
  // ... существующие
  {
    id: 'new-module',
    label: 'Новый модуль',
    icon: SomeIcon,
    component: NewModulePage,
    enabled: true,
    order: 4
  }
];
```

### Добавление нового типа ресурса

1. Создать типы в `/types/`
2. Создать API методы в `/services/`
3. Создать компоненты
4. Добавить обработчики в ALT:V клиент

## Производительность

### Оптимизации

- **React.memo** для компонентов
- **useMemo** и **useCallback** для вычислений
- **Lazy loading** для страниц
- **Debounce** для live обновлений (100ms)
- **WebView optimization**: минимальный размер, только необходимые ресурсы




