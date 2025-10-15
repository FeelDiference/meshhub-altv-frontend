# 📡 API СПЕЦИФИКАЦИЯ

## Обзор

Документация всех API endpoints для взаимодействия между WebView, ALT:V и MeshHub Backend.

---

## MeshHub Backend API

**Base URL**: `https://hub.feeld.space`

### Авторизация

#### POST /api/auth/login

Авторизация пользователя.

**Request Body**:
```json
{
  "username": "string",
  "password": "string"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "username": "string",
    "email": "string",
    "department": "string",
    "position": "string",
    "avatar": "url"
  }
}
```

**Response** (401 Unauthorized):
```json
{
  "success": false,
  "error": "invalid_credentials",
  "message": "Неверный логин или пароль"
}
```

---

### Автомобили

#### GET /api/rpf/vehicles

Получить список всех автомобилей с метаданными.

**Query Parameters**:
- `with_metadata` (boolean, optional): Только с метаданными (default: true)
- `installed` (boolean, optional): Фильтр по установке

**Headers**:
```
Authorization: Bearer {token}
```

**Response** (200 OK):
```json
{
  "success": true,
  "vehicles": [
    {
      "id": "uuid",
      "name": "adder",
      "displayName": "Truffade Adder",
      "modelName": "adder",
      "path": "/dlcpacks/patchday3ng/dlc.rpf",
      "archiveId": "uuid",
      "size": 15728640,
      "metadata": {
        "modelName": "adder",
        "vehicleMakeName": ["Truffade"],
        "vehicleClass": "Super",
        "wheelType": "HighEnd",
        "handling": {
          "handlingName": "ADDER",
          "calculatedMaxSpeedKmh": 350.5,
          "calculatedMaxSpeedMph": 217.8,
          "mass": 1800.0,
          "initialDragCoeff": 10.5,
          "initialDriveGears": 6,
          "driveBiasFront": 0.0,
          "initialDriveForce": 0.35,
          "brakeForce": 1.0,
          "steeringLock": 40.0,
          "tractionCurveMax": 2.4,
          "tractionCurveMin": 2.0,
          "suspensionForce": 2.2,
          "suspensionCompDamp": 1.2,
          // ... остальные параметры
        },
        "tuning": {
          "kitName": "adder_modkit",
          "engine": [
            {"level": 1, "modifier": 10, "weight": 50},
            {"level": 2, "modifier": 15, "weight": 75},
            // ...
          ],
          "brakes": [...],
          "gearbox": [...],
          // ...
        },
        "colors": {
          "colorIndices": [0, 1, 2, 3],
          "liveries": [true, true, false],
          "kits": ["default"]
        }
      },
      "createdAt": "2025-10-15T10:00:00Z",
      "updatedAt": "2025-10-15T12:00:00Z"
    }
  ],
  "total": 150
}
```

---

#### GET /api/rpf/vehicles/{id}

Получить детальную информацию об автомобиле.

**Path Parameters**:
- `id` (string): ID автомобиля

**Headers**:
```
Authorization: Bearer {token}
```

**Response** (200 OK):
```json
{
  "success": true,
  "vehicle": {
    // Полная информация как в списке
  }
}
```

**Response** (404 Not Found):
```json
{
  "success": false,
  "error": "not_found",
  "message": "Автомобиль не найден"
}
```

---

#### GET /api/rpf/vehicles/{id}/download

Скачать ресурс автомобиля в формате ZIP.

**Path Parameters**:
- `id` (string): ID автомобиля

**Headers**:
```
Authorization: Bearer {token}
```

**Response** (200 OK):
```
Content-Type: application/zip
Content-Disposition: attachment; filename="adder.zip"

<binary data>
```

**Структура ZIP**:
```
adder/
  └── dlc.rpf
```

**Response** (404 Not Found):
```json
{
  "success": false,
  "error": "not_found",
  "message": "Файл не найден"
}
```

---

#### GET /api/rpf/vehicles/{id}/metadata

Получить только метаданные автомобиля.

**Path Parameters**:
- `id` (string): ID автомобиля

**Headers**:
```
Authorization: Bearer {token}
```

**Response** (200 OK):
```json
{
  "success": true,
  "metadata": {
    // Объект VehicleMetadata
  }
}
```

---

#### POST /api/rpf/vehicles/{id}/handling

Сохранить handling.meta в RPF архив.

**Path Parameters**:
- `id` (string): ID автомобиля

**Headers**:
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body**:
```json
{
  "handling": {
    "handlingName": "ADDER",
    "mass": 1850.0,
    "initialDragCoeff": 10.2,
    "percentSubmerged": 85.0,
    "centreOfMassOffset": {"x": 0.0, "y": 0.0, "z": 0.0},
    "inertiaMultiplier": {"x": 1.0, "y": 1.0, "z": 1.0},
    "driveBiasFront": 0.0,
    "initialDriveGears": 6,
    "initialDriveForce": 0.36,
    "driveInertia": 1.0,
    "clutchChangeRateUp": 3.5,
    "clutchChangeRateDown": 3.5,
    "initialDriveMaxFlatVel": 180.0,
    "brakeForce": 1.05,
    "brakeBiasFront": 0.5,
    "handBrakeForce": 0.8,
    "steeringLock": 40.0,
    "tractionCurveMax": 2.5,
    "tractionCurveMin": 2.1,
    "tractionCurveLateral": 22.5,
    "tractionSpringDeltaMax": 0.15,
    "lowSpeedTractionLoss": 1.0,
    "camberStiffness": 0.0,
    "tractionBiasFront": 0.485,
    "tractionLossMult": 1.0,
    "suspensionForce": 2.3,
    "suspensionCompDamp": 1.3,
    "suspensionReboundDamp": 2.5,
    "suspensionUpperLimit": 0.1,
    "suspensionLowerLimit": -0.15,
    "suspensionRaise": 0.0,
    "suspensionBiasFront": 0.5,
    "antiRollBarForce": 0.8,
    "antiRollBarBiasFront": 0.6,
    "rollCentreHeightFront": 0.4,
    "rollCentreHeightRear": 0.41,
    "collisionDamageMult": 1.0,
    "weaponDamageMult": 1.0,
    "deformationDamageMult": 1.0,
    "engineDamageMult": 1.5,
    "petrolTankVolume": 65.0,
    "oilVolume": 5.0,
    "seatOffsetDist": {"x": 0.0, "y": -0.2, "z": 0.0},
    "monetaryValue": 1000000
  }
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Handling успешно сохранен в RPF архив",
  "backup": {
    "id": "uuid",
    "filename": "adder_backup_20251015_120000.rpf",
    "path": "/backups/vehicles/adder_backup_20251015_120000.rpf",
    "size": 15728640,
    "createdAt": "2025-10-15T12:00:00Z"
  },
  "updated": {
    "archiveId": "uuid",
    "path": "/dlcpacks/patchday3ng/dlc.rpf",
    "size": 15730000,
    "hashMD5": "abc123...",
    "hashSHA256": "def456...",
    "updatedAt": "2025-10-15T12:00:01Z"
  }
}
```

**Response** (400 Bad Request):
```json
{
  "success": false,
  "error": "validation_error",
  "message": "Некорректные параметры handling",
  "details": {
    "mass": "Должно быть больше 0",
    "initialDriveGears": "Должно быть от 1 до 10"
  }
}
```

**Response** (500 Internal Server Error):
```json
{
  "success": false,
  "error": "repack_failed",
  "message": "Не удалось перепаковать RPF архив",
  "details": "RPF tool error: ..."
}
```

---

#### POST /api/rpf/vehicles/{id}/repack

Перепаковать RPF с новыми файлами (расширенная версия).

**Path Parameters**:
- `id` (string): ID автомобиля

**Headers**:
```
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**Request Body**:
```
handling: <file>
vehicles: <file> (optional)
carcols: <file> (optional)
carvariations: <file> (optional)
```

**Response**: Аналогично POST /handling

---

## ALT:V Client ↔ WebView Events

### Client → WebView

#### vehicle:spawned

Уведомление о том, что автомобиль заспавнился.

**Payload**:
```typescript
{
  vehicleId: number;
  modelName: string;
  position: { x: number; y: number; z: number };
}
```

**Example**:
```typescript
webview.emit('vehicle:spawned', {
  vehicleId: 123,
  modelName: 'adder',
  position: { x: 100.0, y: 200.0, z: 30.0 }
});
```

---

#### vehicle:destroyed

Уведомление о том, что автомобиль был уничтожен.

**Payload**:
```typescript
{
  vehicleId: number;
}
```

---

#### installation:checked

Результат проверки установки ресурса.

**Payload**:
```typescript
{
  modelName: string;
  isInstalled: boolean;
}
```

---

#### handling:applied

Подтверждение применения параметра.

**Payload**:
```typescript
{
  parameter: string;
  value: number;
  success: boolean;
}
```

---

### WebView → Client

#### vehicle:spawn

Запрос на спавн автомобиля.

**Payload**:
```typescript
{
  modelName: string;
}
```

**Example**:
```typescript
alt.emit('vehicle:spawn', { modelName: 'adder' });
```

---

#### vehicle:destroy

Запрос на уничтожение текущего автомобиля.

**Payload**:
```typescript
{
  vehicleId: number;
}
```

---

#### installation:check

Запрос на проверку установки ресурса.

**Payload**:
```typescript
{
  modelName: string;
}
```

---

#### handling:update

Запрос на обновление параметра handling (live).

**Payload**:
```typescript
{
  parameter: string;
  value: number;
}
```

**Example**:
```typescript
alt.emit('handling:update', {
  parameter: 'fMass',
  value: 1850.0
});
```

---

#### panel:close

Запрос на закрытие панели.

**Payload**: none

---

## ALT:V Server ↔ Client Events

### Server → Client

#### meshhub:open

Команда открыть панель MeshHub.

**Payload**: none

**Example**:
```typescript
alt.emitClient(player, 'meshhub:open');
```

---

#### meshhub:close

Команда закрыть панель MeshHub.

**Payload**: none

---

### Client → Server

#### meshhub:log

Отправка лога на сервер (для debugging).

**Payload**:
```typescript
{
  level: 'info' | 'warn' | 'error';
  message: string;
  data?: any;
}
```

---

## TypeScript типы

```typescript
// types/vehicle.ts

export interface VehicleResource {
  id: string;
  name: string;
  displayName: string;
  modelName: string;
  path: string;
  archiveId: string;
  size: number;
  metadata: VehicleMetadata | null;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleMetadata {
  modelName: string;
  vehicleMakeName: string[];
  vehicleClass: string;
  wheelType: string;
  handling?: HandlingData;
  tuning?: TuningData;
  colors?: ColorVariationData;
}

// types/handling.ts

export interface HandlingData {
  handlingName: string;
  
  // Вычисленные значения
  calculatedMaxSpeedKmh: number;
  calculatedMaxSpeedMph: number;
  
  // Физические параметры
  mass: number;
  initialDragCoeff: number;
  percentSubmerged: number;
  centreOfMassOffset: Vec3;
  inertiaMultiplier: Vec3;
  
  // Трансмиссия
  driveBiasFront: number;
  initialDriveGears: number;
  initialDriveForce: number;
  driveInertia: number;
  clutchChangeRateUp: number;
  clutchChangeRateDown: number;
  initialDriveMaxFlatVel: number;
  brakeForce: number;
  brakeBiasFront: number;
  handBrakeForce: number;
  steeringLock: number;
  
  // Тяга колес
  tractionCurveMax: number;
  tractionCurveMin: number;
  tractionCurveLateral: number;
  tractionSpringDeltaMax: number;
  lowSpeedTractionLoss: number;
  camberStiffness: number;
  tractionBiasFront: number;
  tractionLossMult: number;
  
  // Подвеска
  suspensionForce: number;
  suspensionCompDamp: number;
  suspensionReboundDamp: number;
  suspensionUpperLimit: number;
  suspensionLowerLimit: number;
  suspensionRaise: number;
  suspensionBiasFront: number;
  antiRollBarForce: number;
  antiRollBarBiasFront: number;
  rollCentreHeightFront: number;
  rollCentreHeightRear: number;
  
  // Повреждения
  collisionDamageMult: number;
  weaponDamageMult: number;
  deformationDamageMult: number;
  engineDamageMult: number;
  petrolTankVolume: number;
  oilVolume: number;
  
  // Разное
  seatOffsetDist: Vec3;
  monetaryValue: number;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface TuningData {
  kitName: string;
  engine?: ModificationLevel[];
  brakes?: ModificationLevel[];
  gearbox?: ModificationLevel[];
  armour?: ModificationLevel[];
  suspension?: ModificationLevel[];
  horns?: HornModification[];
  hasLightSettings: boolean;
}

export interface ModificationLevel {
  level: number;
  modifier: number;
  weight: number;
}

export interface HornModification {
  identifier: string;
  modifier: number;
}

export interface ColorVariationData {
  colorIndices: number[];
  liveries: boolean[];
  kits: string[];
}

// types/auth.ts

export interface User {
  id: string;
  username: string;
  email: string;
  department: string;
  position: string;
  avatar: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  token: string;
  user: User;
}

export interface SessionData {
  userId: string;
  token: string;
  expiresAt: number;
}

// types/download.ts

export interface DownloadTask {
  id: string;
  vehicleId: string;
  status: 'idle' | 'downloading' | 'extracting' | 'installing' | 'complete' | 'error';
  progress: number;
  totalSize: number;
  downloadedSize: number;
  error: string | null;
}
```

---

## Коды ошибок

| Код | Название | Описание |
|-----|----------|----------|
| 400 | `bad_request` | Некорректный запрос |
| 401 | `unauthorized` | Не авторизован |
| 403 | `forbidden` | Доступ запрещен |
| 404 | `not_found` | Ресурс не найден |
| 409 | `conflict` | Конфликт (например, файл уже существует) |
| 422 | `validation_error` | Ошибка валидации |
| 500 | `internal_error` | Внутренняя ошибка сервера |
| 503 | `service_unavailable` | Сервис недоступен |

### Специфичные коды ошибок

| Код | Описание |
|-----|----------|
| `invalid_credentials` | Неверный логин или пароль |
| `token_expired` | Токен истек |
| `no_metadata` | У автомобиля нет метаданных |
| `repack_failed` | Ошибка при перепаковке RPF |
| `backup_failed` | Ошибка при создании бэкапа |
| `file_not_found` | Файл не найден |
| `model_not_loaded` | Модель не загружена в ALT:V |

---

## Rate Limiting

| Endpoint | Лимит |
|----------|-------|
| POST /api/auth/login | 5 запросов / минута |
| GET /api/rpf/vehicles | 60 запросов / минута |
| GET /api/rpf/vehicles/{id}/download | 10 запросов / минута |
| POST /api/rpf/vehicles/{id}/handling | 30 запросов / минута |

---

## Примеры использования

### Авторизация

```typescript
import axios from 'axios';

async function login(username: string, password: string): Promise<LoginResponse> {
  const response = await axios.post('https://hub.feeld.space/api/auth/login', {
    username,
    password
  });
  return response.data;
}
```

### Получение списка автомобилей

```typescript
async function getVehicles(token: string): Promise<VehicleResource[]> {
  const response = await axios.get('https://hub.feeld.space/api/rpf/vehicles', {
    headers: {
      Authorization: `Bearer ${token}`
    },
    params: {
      with_metadata: true
    }
  });
  return response.data.vehicles;
}
```

### Скачивание автомобиля

```typescript
async function downloadVehicle(id: string, token: string): Promise<Blob> {
  const response = await axios.get(`https://hub.feeld.space/api/rpf/vehicles/${id}/download`, {
    headers: {
      Authorization: `Bearer ${token}`
    },
    responseType: 'blob'
  });
  return response.data;
}
```

### Сохранение handling

```typescript
async function saveHandling(id: string, handling: HandlingData, token: string): Promise<any> {
  const response = await axios.post(
    `https://hub.feeld.space/api/rpf/vehicles/${id}/handling`,
    { handling },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return response.data;
}
```

