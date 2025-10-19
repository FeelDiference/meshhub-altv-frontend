# План реализации функциональности интерьеров (MLO)

## 📋 Общее описание

Добавление поддержки интерьеров (MLO - Multi-Level Objects) в систему MeshHub ALT:V с возможностью:
- Просмотра списка интерьеров из разных источников (HUB, GTAV, Local)
- Загрузки/установки интерьеров
- Телепортации к интерьерам
- Управления интерьерами через панель

**Важно**: Основной фронтенд (rpf-frontend) НЕ трогаем. Работаем только с:
- `rpf-backend` (Go API)
- `meshhub_altv_integration` (React панель для ALT:V)
- `altv-server/resources/meshhub` (ALT:V серверная и клиентская часть - если есть, иначе используем TypeScript версию)

---

## 🎯 Этап 1: Backend (Go) - rpf-backend

### 1.1 Обновление схемы базы данных

**Файл**: `rpf-backend/internal/rpf/storage/schema.sql`

#### Добавить поля в таблицу `rpf_archives`:
```sql
ALTER TABLE rpf_archives 
ADD COLUMN IF NOT EXISTS has_interior BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS interior_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS interior_metadata JSONB DEFAULT '{}';

-- Индекс для быстрого поиска архивов с интерьерами
CREATE INDEX IF NOT EXISTS idx_rpf_archives_has_interior ON rpf_archives(has_interior) WHERE has_interior = TRUE;
```

#### Создать новую таблицу для хранения информации об интерьерах:
```sql
CREATE TABLE IF NOT EXISTS rpf_interiors (
    id VARCHAR(36) PRIMARY KEY,
    archive_id VARCHAR(36) NOT NULL REFERENCES rpf_archives(id) ON DELETE CASCADE,
    ymap_file_id VARCHAR(36) NOT NULL REFERENCES rpf_files(id) ON DELETE CASCADE,
    
    -- Информация из YMAP
    archetype_name TEXT NOT NULL,
    position_x REAL NOT NULL,
    position_y REAL NOT NULL,
    position_z REAL NOT NULL,
    rotation_x REAL,
    rotation_y REAL,
    rotation_z REAL,
    rotation_w REAL,
    
    -- Дополнительные данные из YMAP
    lod_dist REAL,
    lod_level VARCHAR(50),
    guid INTEGER,
    flags INTEGER,
    
    -- Метаданные
    display_name TEXT,
    description TEXT,
    category VARCHAR(100),
    tags TEXT[],
    
    -- Временные метки
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_rpf_interiors_archive_id ON rpf_interiors(archive_id);
CREATE INDEX IF NOT EXISTS idx_rpf_interiors_ymap_file_id ON rpf_interiors(ymap_file_id);
CREATE INDEX IF NOT EXISTS idx_rpf_interiors_archetype_name ON rpf_interiors(archetype_name);
CREATE INDEX IF NOT EXISTS idx_rpf_interiors_position ON rpf_interiors(position_x, position_y, position_z);
```

**Создать файл миграции**: `rpf-backend/migrations/add_interior_support.sql`

---

### 1.2 Обновление моделей

**Файл**: `rpf-backend/internal/rpf/models/archive.go`

#### Добавить в структуру `RpfArchive`:
```go
// Интерьеры
HasInterior     bool   `json:"has_interior" db:"has_interior"`
InteriorCount   int    `json:"interior_count" db:"interior_count"`
InteriorMetadata string `json:"interior_metadata" db:"interior_metadata"` // JSONB
```

#### Создать новую модель `Interior`:
```go
type Interior struct {
    ID             string    `json:"id" db:"id"`
    ArchiveID      string    `json:"archive_id" db:"archive_id"`
    YmapFileID     string    `json:"ymap_file_id" db:"ymap_file_id"`
    
    // Информация из YMAP
    ArchetypeName  string    `json:"archetype_name" db:"archetype_name"`
    PositionX      float32   `json:"position_x" db:"position_x"`
    PositionY      float32   `json:"position_y" db:"position_y"`
    PositionZ      float32   `json:"position_z" db:"position_z"`
    RotationX      *float32  `json:"rotation_x" db:"rotation_x"`
    RotationY      *float32  `json:"rotation_y" db:"rotation_y"`
    RotationZ      *float32  `json:"rotation_z" db:"rotation_z"`
    RotationW      *float32  `json:"rotation_w" db:"rotation_w"`
    
    // Дополнительные данные
    LodDist        *float32  `json:"lod_dist" db:"lod_dist"`
    LodLevel       *string   `json:"lod_level" db:"lod_level"`
    Guid           *int      `json:"guid" db:"guid"`
    Flags          *int      `json:"flags" db:"flags"`
    
    // Метаданные
    DisplayName    *string   `json:"display_name" db:"display_name"`
    Description    *string   `json:"description" db:"description"`
    Category       *string   `json:"category" db:"category"`
    Tags           []string  `json:"tags" db:"tags"`
    
    // Временные метки
    CreatedAt      time.Time `json:"created_at" db:"created_at"`
    UpdatedAt      time.Time `json:"updated_at" db:"updated_at"`
}

type InteriorResource struct {
    ID            string      `json:"id"`
    Name          string      `json:"name"`
    DisplayName   string      `json:"display_name"`
    ResourceType  string      `json:"resource_type"`
    Size          int64       `json:"size"`
    InteriorCount int         `json:"interior_count"`
    Interiors     []Interior  `json:"interiors"`
    CreatedAt     time.Time   `json:"created_at"`
    UpdatedAt     time.Time   `json:"updated_at"`
}
```

---

### 1.3 Создать сервис для парсинга интерьеров

**Файл**: `rpf-backend/internal/rpf/services/interior_parser.go`

```go
package services

import (
    "encoding/xml"
    "github.com/google/uuid"
    "github.com/rs/zerolog"
    "rpf-backend/internal/rpf/models"
)

type InteriorParser struct {
    logger zerolog.Logger
}

type CMapData struct {
    XMLName  xml.Name       `xml:"CMapData"`
    Entities []EntityItem   `xml:"entities>Item"`
}

type EntityItem struct {
    Type          string        `xml:"type,attr"`
    ArchetypeName string        `xml:"archetypeName"`
    Position      Position      `xml:"position"`
    Rotation      Rotation      `xml:"rotation"`
    Flags         IntValue      `xml:"flags"`
    Guid          IntValue      `xml:"guid"`
    LodDist       FloatValue    `xml:"lodDist"`
    LodLevel      string        `xml:"lodLevel"`
}

type Position struct {
    X float32 `xml:"x,attr"`
    Y float32 `xml:"y,attr"`
    Z float32 `xml:"z,attr"`
}

type Rotation struct {
    X float32 `xml:"x,attr"`
    Y float32 `xml:"y,attr"`
    Z float32 `xml:"z,attr"`
    W float32 `xml:"w,attr"`
}

type IntValue struct {
    Value int `xml:"value,attr"`
}

type FloatValue struct {
    Value float32 `xml:"value,attr"`
}

func NewInteriorParser(logger zerolog.Logger) *InteriorParser {
    return &InteriorParser{logger: logger}
}

// ParseYmapForInteriors парсит YMAP файл и извлекает интерьеры (CMloInstanceDef)
func (p *InteriorParser) ParseYmapForInteriors(xmlData []byte, archiveID, ymapFileID string) ([]models.Interior, error) {
    var mapData CMapData
    if err := xml.Unmarshal(xmlData, &mapData); err != nil {
        return nil, err
    }
    
    interiors := make([]models.Interior, 0)
    
    for _, entity := range mapData.Entities {
        // Ищем только MLO объекты (CMloInstanceDef)
        if entity.Type != "CMloInstanceDef" {
            continue
        }
        
        interior := models.Interior{
            ID:            uuid.New().String(),
            ArchiveID:     archiveID,
            YmapFileID:    ymapFileID,
            ArchetypeName: entity.ArchetypeName,
            PositionX:     entity.Position.X,
            PositionY:     entity.Position.Y,
            PositionZ:     entity.Position.Z,
        }
        
        // Опциональные поля
        interior.RotationX = &entity.Rotation.X
        interior.RotationY = &entity.Rotation.Y
        interior.RotationZ = &entity.Rotation.Z
        interior.RotationW = &entity.Rotation.W
        
        lodDist := entity.LodDist.Value
        interior.LodDist = &lodDist
        
        if entity.LodLevel != "" {
            interior.LodLevel = &entity.LodLevel
        }
        
        guid := entity.Guid.Value
        if guid != 0 {
            interior.Guid = &guid
        }
        
        flags := entity.Flags.Value
        if flags != 0 {
            interior.Flags = &flags
        }
        
        interiors = append(interiors, interior)
    }
    
    return interiors, nil
}

// CheckIfArchiveHasInteriors проверяет, есть ли в архиве интерьеры
func (p *InteriorParser) CheckIfArchiveHasInteriors(xmlData []byte) (bool, int, error) {
    var mapData CMapData
    if err := xml.Unmarshal(xmlData, &mapData); err != nil {
        return false, 0, err
    }
    
    count := 0
    for _, entity := range mapData.Entities {
        if entity.Type == "CMloInstanceDef" {
            count++
        }
    }
    
    return count > 0, count, nil
}
```

---

### 1.4 Обновление хранилища

**Файл**: `rpf-backend/internal/rpf/storage/interior_store.go` (создать новый)

```go
package storage

import (
    "context"
    "database/sql"
    "github.com/jmoiron/sqlx"
    "rpf-backend/internal/rpf/models"
)

type InteriorStore struct {
    db *sqlx.DB
}

func NewInteriorStore(db *sqlx.DB) *InteriorStore {
    return &InteriorStore{db: db}
}

// SaveInterior сохраняет интерьер в БД
func (s *InteriorStore) SaveInterior(ctx context.Context, interior *models.Interior) error {
    query := `
        INSERT INTO rpf_interiors (
            id, archive_id, ymap_file_id, archetype_name,
            position_x, position_y, position_z,
            rotation_x, rotation_y, rotation_z, rotation_w,
            lod_dist, lod_level, guid, flags,
            display_name, description, category, tags
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
        )
    `
    
    _, err := s.db.ExecContext(ctx, query,
        interior.ID, interior.ArchiveID, interior.YmapFileID, interior.ArchetypeName,
        interior.PositionX, interior.PositionY, interior.PositionZ,
        interior.RotationX, interior.RotationY, interior.RotationZ, interior.RotationW,
        interior.LodDist, interior.LodLevel, interior.Guid, interior.Flags,
        interior.DisplayName, interior.Description, interior.Category, interior.Tags,
    )
    
    return err
}

// GetInteriorsByArchive получает все интерьеры из архива
func (s *InteriorStore) GetInteriorsByArchive(ctx context.Context, archiveID string) ([]models.Interior, error) {
    query := `SELECT * FROM rpf_interiors WHERE archive_id = $1 ORDER BY created_at DESC`
    
    var interiors []models.Interior
    err := s.db.SelectContext(ctx, &interiors, query, archiveID)
    if err != nil {
        return nil, err
    }
    
    return interiors, nil
}

// GetArchivesWithInteriors получает список архивов, содержащих интерьеры
func (s *InteriorStore) GetArchivesWithInteriors(ctx context.Context, limit, offset int) ([]models.InteriorResource, error) {
    query := `
        SELECT 
            a.id,
            a.name,
            a.group_name as display_name,
            a.resource_type,
            a.size,
            a.interior_count,
            a.created_at,
            a.updated_at
        FROM rpf_archives a
        WHERE a.has_interior = TRUE
        ORDER BY a.updated_at DESC
        LIMIT $1 OFFSET $2
    `
    
    var resources []models.InteriorResource
    err := s.db.SelectContext(ctx, &resources, query, limit, offset)
    if err != nil {
        return nil, err
    }
    
    // Загружаем интерьеры для каждого архива
    for i := range resources {
        interiors, err := s.GetInteriorsByArchive(ctx, resources[i].ID)
        if err != nil {
            continue
        }
        resources[i].Interiors = interiors
    }
    
    return resources, nil
}

// UpdateArchiveInteriorStatus обновляет статус интерьеров в архиве
func (s *InteriorStore) UpdateArchiveInteriorStatus(ctx context.Context, archiveID string, hasInterior bool, count int) error {
    query := `
        UPDATE rpf_archives 
        SET has_interior = $1, interior_count = $2, updated_at = NOW()
        WHERE id = $3
    `
    
    _, err := s.db.ExecContext(ctx, query, hasInterior, count, archiveID)
    return err
}

// DeleteInteriorsByArchive удаляет все интерьеры из архива
func (s *InteriorStore) DeleteInteriorsByArchive(ctx context.Context, archiveID string) error {
    query := `DELETE FROM rpf_interiors WHERE archive_id = $1`
    _, err := s.db.ExecContext(ctx, query, archiveID)
    return err
}
```

---

### 1.5 Создать обработчики (handlers)

**Файл**: `rpf-backend/internal/rpf/handlers/interior.go` (создать новый)

```go
package handlers

import (
    "context"
    "net/http"
    "strconv"
    
    "github.com/go-chi/chi/v5"
    "github.com/rs/zerolog"
    "rpf-backend/internal/auth"
    "rpf-backend/internal/rpf/models"
    "rpf-backend/internal/rpf/services"
    "rpf-backend/internal/rpf/storage"
    "rpf-backend/internal/util"
)

type InteriorHandler struct {
    logger         zerolog.Logger
    interiorStore  *storage.InteriorStore
    archiveStore   *storage.ArchiveStore
    fileStore      *storage.FileStore
    interiorParser *services.InteriorParser
}

func NewInteriorHandler(
    logger zerolog.Logger,
    interiorStore *storage.InteriorStore,
    archiveStore *storage.ArchiveStore,
    fileStore *storage.FileStore,
    interiorParser *services.InteriorParser,
) *InteriorHandler {
    return &InteriorHandler{
        logger:         logger,
        interiorStore:  interiorStore,
        archiveStore:   archiveStore,
        fileStore:      fileStore,
        interiorParser: interiorParser,
    }
}

// GetInteriors возвращает список архивов с интерьерами
func (h *InteriorHandler) GetInteriors(w http.ResponseWriter, r *http.Request) {
    // Проверяем аутентификацию
    _, ok := auth.UserClaimsFromContext(r.Context())
    if !ok {
        util.WriteError(w, http.StatusUnauthorized, "auth_required", "missing user claims")
        return
    }
    
    // Параметры пагинации
    limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
    if limit <= 0 || limit > 200 {
        limit = 100
    }
    
    offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
    if offset < 0 {
        offset = 0
    }
    
    // Получаем архивы с интерьерами
    resources, err := h.interiorStore.GetArchivesWithInteriors(r.Context(), limit, offset)
    if err != nil {
        h.logger.Error().Err(err).Msg("Failed to get interiors")
        util.WriteError(w, http.StatusInternalServerError, "db_error", "Failed to get interiors")
        return
    }
    
    util.WriteJSON(w, http.StatusOK, map[string]interface{}{
        "success":   true,
        "interiors": resources,
        "total":     len(resources),
    })
}

// GetInteriorDetails возвращает детальную информацию об интерьере
func (h *InteriorHandler) GetInteriorDetails(w http.ResponseWriter, r *http.Request) {
    _, ok := auth.UserClaimsFromContext(r.Context())
    if !ok {
        util.WriteError(w, http.StatusUnauthorized, "auth_required", "missing user claims")
        return
    }
    
    archiveID := chi.URLParam(r, "id")
    if archiveID == "" {
        util.WriteError(w, http.StatusBadRequest, "missing_id", "archive ID is required")
        return
    }
    
    // Получаем интерьеры архива
    interiors, err := h.interiorStore.GetInteriorsByArchive(r.Context(), archiveID)
    if err != nil {
        h.logger.Error().Err(err).Str("archiveID", archiveID).Msg("Failed to get interior details")
        util.WriteError(w, http.StatusInternalServerError, "db_error", "Failed to get interior details")
        return
    }
    
    // Получаем информацию об архиве
    archive, err := h.archiveStore.GetArchive(archiveID)
    if err != nil {
        h.logger.Error().Err(err).Str("archiveID", archiveID).Msg("Failed to get archive")
        util.WriteError(w, http.StatusNotFound, "not_found", "Archive not found")
        return
    }
    
    util.WriteJSON(w, http.StatusOK, map[string]interface{}{
        "success": true,
        "archive": archive,
        "interiors": interiors,
        "count": len(interiors),
    })
}

// ScanArchiveForInteriors сканирует архив на наличие интерьеров
func (h *InteriorHandler) ScanArchiveForInteriors(w http.ResponseWriter, r *http.Request) {
    _, ok := auth.UserClaimsFromContext(r.Context())
    if !ok {
        util.WriteError(w, http.StatusUnauthorized, "auth_required", "missing user claims")
        return
    }
    
    archiveID := chi.URLParam(r, "id")
    if archiveID == "" {
        util.WriteError(w, http.StatusBadRequest, "missing_id", "archive ID is required")
        return
    }
    
    // Получаем все YMAP файлы архива
    ymapFiles, err := h.fileStore.GetFilesByArchiveAndExtension(archiveID, ".ymap.xml")
    if err != nil {
        h.logger.Error().Err(err).Str("archiveID", archiveID).Msg("Failed to get ymap files")
        util.WriteError(w, http.StatusInternalServerError, "db_error", "Failed to get ymap files")
        return
    }
    
    totalInteriors := 0
    
    // Очищаем старые данные об интерьерах
    if err := h.interiorStore.DeleteInteriorsByArchive(r.Context(), archiveID); err != nil {
        h.logger.Error().Err(err).Msg("Failed to delete old interiors")
    }
    
    // Парсим каждый YMAP файл
    for _, ymapFile := range ymapFiles {
        // Получаем содержимое файла
        content, err := h.fileStore.GetFileContent(ymapFile.ID)
        if err != nil {
            h.logger.Warn().Err(err).Str("fileID", ymapFile.ID).Msg("Failed to get file content")
            continue
        }
        
        // Парсим интерьеры
        interiors, err := h.interiorParser.ParseYmapForInteriors(content.Data, archiveID, ymapFile.ID)
        if err != nil {
            h.logger.Warn().Err(err).Str("fileID", ymapFile.ID).Msg("Failed to parse interiors")
            continue
        }
        
        // Сохраняем интерьеры
        for i := range interiors {
            if err := h.interiorStore.SaveInterior(r.Context(), &interiors[i]); err != nil {
                h.logger.Error().Err(err).Msg("Failed to save interior")
                continue
            }
            totalInteriors++
        }
    }
    
    // Обновляем статус архива
    hasInterior := totalInteriors > 0
    if err := h.interiorStore.UpdateArchiveInteriorStatus(r.Context(), archiveID, hasInterior, totalInteriors); err != nil {
        h.logger.Error().Err(err).Msg("Failed to update archive interior status")
    }
    
    util.WriteJSON(w, http.StatusOK, map[string]interface{}{
        "success": true,
        "message": "Interior scan completed",
        "archive_id": archiveID,
        "interiors_found": totalInteriors,
    })
}
```

---

### 1.6 Добавить роуты

**Файл**: `rpf-backend/internal/router/router.go`

Добавить в секцию API роутов:

```go
// Interior endpoints
r.Route("/mlo", func(r chi.Router) {
    r.Get("/", interiorHandler.GetInteriors)
    r.Get("/{id}", interiorHandler.GetInteriorDetails)
    r.Post("/{id}/scan", interiorHandler.ScanArchiveForInteriors)
})
```

---

### 1.7 Обновить индексацию при обработке архивов

**Файл**: `rpf-backend/internal/rpf/services/unpacker.go`

В функцию `IndexArchive` добавить проверку на интерьеры:

```go
// После индексации файлов, проверяем наличие интерьеров
if archive.YmapFilesCount > 0 {
    // Получаем все YMAP файлы
    ymapFiles, err := u.fileStore.GetFilesByArchiveAndExtension(archiveID, ".ymap.xml")
    if err == nil {
        totalInteriors := 0
        
        for _, ymapFile := range ymapFiles {
            content, err := u.fileStore.GetFileContent(ymapFile.ID)
            if err != nil {
                continue
            }
            
            // Проверяем наличие интерьеров
            hasInteriors, count, err := u.interiorParser.CheckIfArchiveHasInteriors(content.Data)
            if err != nil {
                continue
            }
            
            if hasInteriors {
                // Парсим и сохраняем интерьеры
                interiors, err := u.interiorParser.ParseYmapForInteriors(content.Data, archiveID, ymapFile.ID)
                if err != nil {
                    continue
                }
                
                for i := range interiors {
                    if err := u.interiorStore.SaveInterior(ctx, &interiors[i]); err != nil {
                        u.logger.Error().Err(err).Msg("Failed to save interior")
                        continue
                    }
                }
                
                totalInteriors += count
            }
        }
        
        // Обновляем статус архива
        if totalInteriors > 0 {
            u.interiorStore.UpdateArchiveInteriorStatus(ctx, archiveID, true, totalInteriors)
        }
    }
}
```

---

## 🎨 Этап 2: Frontend (React) - meshhub_altv_integration/client

### 2.1 Создать типы

**Файл**: `meshhub_altv_integration/client/src/types/interior.ts` (создать новый)

```typescript
export interface Vec3 {
  x: number
  y: number
  z: number
}

export interface Vec4 {
  x: number
  y: number
  z: number
  w: number
}

export interface Interior {
  id: string
  archiveId: string
  ymapFileId: string
  archetypeName: string
  position: Vec3
  rotation?: Vec4
  lodDist?: number
  lodLevel?: string
  guid?: number
  flags?: number
  displayName?: string
  description?: string
  category?: string
  tags?: string[]
  createdAt: string
  updatedAt: string
}

export interface InteriorResource {
  id: string
  name: string
  displayName: string
  resourceType: string
  size: number
  interiorCount: number
  interiors: Interior[]
  createdAt: string
  updatedAt: string
}

export type InteriorStatus = 'not_installed' | 'installing' | 'installed' | 'error'
```

---

### 2.2 Создать сервис для работы с интерьерами

**Файл**: `meshhub_altv_integration/client/src/services/interiors.ts` (создать новый)

```typescript
import { apiClient } from '../config/api'
import type { InteriorResource, Interior } from '../types/interior'

export interface InteriorListResponse {
  success: boolean
  total: number
  interiors: InteriorResource[]
}

export interface InteriorDetailsResponse {
  success: boolean
  archive: any
  interiors: Interior[]
  count: number
}

export async function getInteriors(): Promise<InteriorResource[]> {
  console.log('🏠 Загружаем список интерьеров с backend...')

  try {
    const response = await apiClient.get<InteriorListResponse>('/api/rpf/mlo', {
      params: {
        limit: 200
      }
    })

    console.log('✅ Интерьеры загружены:', response.data)

    const interiors = response.data.interiors || []
    console.log(`🏠 Найдено интерьеров: ${interiors.length}`)

    return interiors
  } catch (error: any) {
    console.error('❌ Ошибка загрузки интерьеров:', error)
    throw new Error(`Не удалось загрузить список интерьеров: ${error.message}`)
  }
}

export async function getInteriorDetails(archiveId: string): Promise<InteriorDetailsResponse> {
  console.log(`🏠 Загружаем детали интерьера ${archiveId}...`)

  try {
    const response = await apiClient.get<InteriorDetailsResponse>(`/api/rpf/mlo/${archiveId}`)
    console.log('✅ Детали интерьера загружены:', response.data)
    return response.data
  } catch (error: any) {
    console.error('❌ Ошибка загрузки деталей интерьера:', error)
    throw new Error(`Не удалось загрузить детали интерьера: ${error.message}`)
  }
}

export async function scanArchiveForInteriors(archiveId: string): Promise<void> {
  console.log(`🔍 Сканируем архив ${archiveId} на наличие интерьеров...`)

  try {
    await apiClient.post(`/api/rpf/mlo/${archiveId}/scan`)
    console.log('✅ Сканирование завершено')
  } catch (error: any) {
    console.error('❌ Ошибка сканирования:', error)
    throw new Error(`Не удалось сканировать архив: ${error.message}`)
  }
}

export async function downloadInterior(archiveId: string) {
  console.log(`⬇️ Скачиваем интерьер ${archiveId}...`)
  
  try {
    const response = await apiClient.get(`/api/rpf/archives/${archiveId}/download`, {
      responseType: 'blob'
    })
    
    // Создаем blob URL и скачиваем
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.download = `interior_${archiveId}.rpf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    
    console.log('✅ Интерьер скачан')
  } catch (error: any) {
    console.error('❌ Ошибка скачивания:', error)
    throw new Error(`Не удалось скачать интерьер: ${error.message}`)
  }
}
```

---

### 2.3 Создать менеджер интерьеров

**Файл**: `meshhub_altv_integration/client/src/services/interiorManager.ts` (создать новый)

```typescript
import type { InteriorResource } from '../types/interior'

export type InteriorStatus = 'not_installed' | 'installing' | 'installed' | 'error'

export interface InteriorState {
  status: InteriorStatus
  lastChecked?: number
}

const interiorStates = new Map<string, InteriorState>()
const LOCAL_STORAGE_KEY = 'installedInteriors'

export async function checkInteriorExists(interior: InteriorResource): Promise<boolean> {
  console.log(`🔍 Проверяем установку интерьера: ${interior.name}`)
  
  // Проверяем в localStorage
  const installed = getInstalledInteriors()
  return installed.includes(interior.id)
}

export async function downloadInteriorToLocal(
  interior: InteriorResource,
  token: string
): Promise<{ success: boolean; message: string }> {
  console.log(`⬇️ Устанавливаем интерьер: ${interior.name}`)
  
  return new Promise((resolve) => {
    if (!window.alt) {
      console.error('❌ ALT:V недоступен')
      resolve({ success: false, message: 'ALT:V недоступен' })
      return
    }
    
    const timeout = setTimeout(() => {
      window.alt?.off('meshhub:interior:download:response', handler)
      resolve({ success: false, message: 'Timeout' })
    }, 30000)
    
    const handler = (response: { success: boolean; message: string; interiorId?: string }) => {
      clearTimeout(timeout)
      window.alt?.off('meshhub:interior:download:response', handler)
      
      if (response.success) {
        // Сохраняем в localStorage
        const installed = getInstalledInteriors()
        if (!installed.includes(interior.id)) {
          installed.push(interior.id)
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(installed))
        }
        
        // Обновляем статус
        interiorStates.set(interior.id, {
          status: 'installed',
          lastChecked: Date.now()
        })
      }
      
      resolve(response)
    }
    
    window.alt?.on('meshhub:interior:download:response', handler)
    window.alt?.emit('meshhub:interior:download', {
      interiorId: interior.id,
      interiorName: interior.name,
      token: token
    })
  })
}

export function getInteriorStatus(interior: InteriorResource): InteriorStatus {
  const state = interiorStates.get(interior.id)
  if (state) {
    return state.status
  }
  
  // Проверяем localStorage
  const installed = getInstalledInteriors()
  return installed.includes(interior.id) ? 'installed' : 'not_installed'
}

export function clearInteriorCache(interiorId: string): void {
  interiorStates.delete(interiorId)
}

export function clearAllInteriorCaches(): void {
  interiorStates.clear()
}

function getInstalledInteriors(): string[] {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export async function getInstalledInteriorsFromClient(): Promise<string[]> {
  if (!window.alt) {
    return getInstalledInteriors()
  }
  
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      window.alt?.off('meshhub:interior:list:response', handler)
      resolve([])
    }, 5000)
    
    const handler = (response: { interiors: string[]; error?: string }) => {
      clearTimeout(timeout)
      window.alt?.off('meshhub:interior:list:response', handler)
      
      if (response.error) {
        console.error('❌ Ошибка получения списка интерьеров:', response.error)
        resolve([])
      } else {
        resolve(response.interiors || [])
      }
    }
    
    window.alt?.on('meshhub:interior:list:response', handler)
    window.alt?.emit('meshhub:interior:list:request', {})
  })
}

export async function teleportToInterior(interior: Interior): Promise<void> {
  if (!window.alt) {
    console.error('❌ ALT:V недоступен')
    return
  }
  
  console.log(`🚀 Телепортация к интерьеру: ${interior.archetypeName}`)
  
  window.alt.emit('meshhub:interior:teleport', {
    interiorId: interior.id,
    position: {
      x: interior.position.x,
      y: interior.position.y,
      z: interior.position.z
    }
  })
}
```

---

### 2.4 Создать компонент страницы интерьеров

**Файл**: `meshhub_altv_integration/client/src/components/interiors/InteriorsPage.tsx` (создать новый)

```typescript
import React, { useState, useEffect } from 'react'
import { useALTV } from '../../hooks/useALTV'
import { getInteriors, downloadInterior } from '../../services/interiors'
import { 
  checkInteriorExists, 
  downloadInteriorToLocal, 
  getInteriorStatus,
  teleportToInterior 
} from '../../services/interiorManager'
import { getAccessToken } from '../../services/auth'
import type { InteriorResource, Interior, InteriorStatus } from '../../types/interior'
import { 
  Download, 
  Loader, 
  AlertCircle, 
  MapPin,
  Building2,
  CheckCircle
} from 'lucide-react'
import { Button } from '../common/Button'

export function InteriorsPage() {
  const { isAvailable } = useALTV()
  const [interiors, setInteriors] = useState<InteriorResource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [interiorStatuses, setInteriorStatuses] = useState<Map<string, InteriorStatus>>(new Map())
  const [activeTab, setActiveTab] = useState<'hub' | 'gtav' | 'local'>('hub')
  const [selectedInterior, setSelectedInterior] = useState<InteriorResource | null>(null)

  useEffect(() => {
    loadInteriors()
  }, [])

  const loadInteriors = async () => {
    try {
      setLoading(true)
      setError(null)

      const interiorsData = await getInteriors()
      setInteriors(interiorsData)

      // Проверяем статус установки для каждого интерьера
      const statuses = new Map<string, InteriorStatus>()
      for (const interior of interiorsData) {
        const isInstalled = await checkInteriorExists(interior)
        statuses.set(interior.id, isInstalled ? 'installed' : 'not_installed')
      }
      setInteriorStatuses(statuses)
    } catch (err: any) {
      setError(err.message)
      console.error('Ошибка загрузки интерьеров:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (interior: InteriorResource) => {
    try {
      setInteriorStatuses(prev => new Map(prev.set(interior.id, 'installing')))
      
      const token = getAccessToken()
      if (!token) {
        throw new Error('Не авторизован')
      }
      
      const result = await downloadInteriorToLocal(interior, token)
      
      if (result.success) {
        setInteriorStatuses(prev => new Map(prev.set(interior.id, 'installed')))
      } else {
        setInteriorStatuses(prev => new Map(prev.set(interior.id, 'error')))
      }
    } catch (err) {
      console.error('Ошибка установки интерьера:', err)
      setInteriorStatuses(prev => new Map(prev.set(interior.id, 'not_installed')))
    }
  }

  const handleTeleport = (interior: Interior) => {
    teleportToInterior(interior)
  }

  const handleSelectInterior = (interior: InteriorResource) => {
    setSelectedInterior(interior)
  }

  return (
    <div className="flex-1 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Интерьеры (MLO)</h1>
        <div className="flex items-center space-x-2 text-sm">
          <div className={`px-2 py-1 rounded-full text-xs ${
            isAvailable ? 'bg-green-900 text-green-300' : 'bg-orange-900 text-orange-300'
          }`}>
            {isAvailable ? '🎮 ALT:V' : '🌐 Browser'}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 mb-4">
        <button
          onClick={() => setActiveTab('hub')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'hub'
              ? 'bg-primary-600 text-white'
              : 'text-gray-400 hover:text-white hover:bg-base-800'
          }`}
        >
          HUB
        </button>
        <button
          onClick={() => setActiveTab('gtav')}
          disabled
          className="px-4 py-2 rounded-lg text-gray-600 cursor-not-allowed"
        >
          GTAV <span className="ml-2 text-xs">(Soon)</span>
        </button>
        <button
          onClick={() => setActiveTab('local')}
          disabled
          className="px-4 py-2 rounded-lg text-gray-600 cursor-not-allowed"
        >
          Local <span className="ml-2 text-xs">(Soon)</span>
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader className="w-6 h-6 animate-spin text-primary-400" />
          <span className="ml-2 text-gray-400">Загрузка интерьеров...</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span className="text-red-400 text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Content */}
      {!loading && !error && (
        <div className="grid grid-cols-1 gap-3">
          {interiors.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Интерьеры не найдены
            </div>
          ) : (
            interiors.map((interior) => {
              const status = interiorStatuses.get(interior.id) || 'not_installed'
              const isInstalled = status === 'installed'
              const isInstalling = status === 'installing'

              return (
                <div 
                  key={interior.id}
                  className="p-4 bg-base-800 border border-base-700 rounded-lg hover:bg-base-700 transition-colors cursor-pointer"
                  onClick={() => handleSelectInterior(interior)}
                >
                  <div className="flex items-center justify-between">
                    {/* Info */}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <Building2 className="w-4 h-4 text-primary-400" />
                        <div className="text-sm font-medium text-white">
                          {interior.displayName || interior.name}
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">{interior.name}</div>
                      <div className="flex items-center space-x-2 mt-2">
                        <span className="px-2 py-0.5 bg-primary-900 text-primary-300 text-xs rounded">
                          {interior.interiorCount} интерьер(ов)
                        </span>
                        <span className="text-xs text-gray-500">
                          {(interior.size / 1024 / 1024).toFixed(1)} MB
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      {isInstalled ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          <span className="text-xs text-green-400">Установлен</span>
                        </>
                      ) : (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDownload(interior)
                          }}
                          disabled={isInstalling}
                          variant="primary"
                          size="sm"
                          icon={isInstalling ? <Loader className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                        >
                          {isInstalling ? 'Установка...' : 'Скачать'}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Interior locations (если выбран) */}
                  {selectedInterior?.id === interior.id && interior.interiors.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-base-600">
                      <div className="text-xs font-medium text-gray-400 mb-2">Локации:</div>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {interior.interiors.map((loc) => (
                          <div
                            key={loc.id}
                            className="flex items-center justify-between p-2 bg-base-900 rounded text-xs"
                          >
                            <div className="flex-1">
                              <div className="text-white">{loc.archetypeName}</div>
                              <div className="text-gray-500">
                                X: {loc.position.x.toFixed(1)}, 
                                Y: {loc.position.y.toFixed(1)}, 
                                Z: {loc.position.z.toFixed(1)}
                              </div>
                            </div>
                            {isAvailable && isInstalled && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleTeleport(loc)
                                }}
                                className="p-1 text-primary-400 hover:text-primary-300 hover:bg-primary-900/20 rounded"
                                title="Телепортироваться"
                              >
                                <MapPin className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
```

---

### 2.5 Обновить App.tsx

**Файл**: `meshhub_altv_integration/client/src/App.tsx`

Изменить строку 1741:

```typescript
const menuItems: MenuItem[] = [
  { id: 'vehicles', label: 'Автомобили', icon: Car, component: VehiclesPage, enabled: true, order: 1 },
  { id: 'interiors', label: 'Интерьеры', icon: Building2, component: InteriorsPage, enabled: true, order: 2 },
  { id: 'weapons', label: 'Оружие', icon: Zap, component: WeaponsPage, enabled: true, order: 3 },
].sort((a, b) => a.order - b.order)
```

И добавить импорт:
```typescript
import { InteriorsPage } from './components/interiors/InteriorsPage'
import { Building2 } from 'lucide-react'
```

---

## 🎮 Этап 3: ALT:V Client - meshhub_altv_integration/server

### 3.1 Добавить типы событий

**Файл**: `meshhub_altv_integration/client/src/types/altv.ts`

Добавить в интерфейсы:

```typescript
// События WebView → Client
export interface WebViewToClientEvents {
  // ... существующие события
  'interior:download': { interiorId: string; interiorName: string; token: string }
  'interior:teleport': { interiorId: string; position: Vec3 }
  'interior:list:request': {}
}

// События Client → WebView
export interface ClientToWebViewEvents {
  // ... существующие события
  'meshhub:interior:download:response': { success: boolean; message: string; interiorId?: string }
  'meshhub:interior:list:response': { interiors: string[]; error?: string }
}
```

---

### 3.2 Создать контроллер интерьеров (TypeScript)

**Файл**: `meshhub_altv_integration/server/resources/meshhub/src/client/interior-controller.ts` (создать новый)

```typescript
import * as alt from 'alt-client'

export class InteriorController {
  private static installedInteriors: Set<string> = new Set()
  private static isInitialized = false
  private static readonly STORAGE_PATH = 'hubresource/interiors/'

  static initialize(): void {
    if (this.isInitialized) {
      alt.log('[InteriorController] Already initialized')
      return
    }

    this.loadInstalledInteriors()
    this.registerEventHandlers()
    this.isInitialized = true

    alt.log('[InteriorController] ✅ Initialized')
  }

  private static registerEventHandlers(): void {
    // Получить список установленных интерьеров
    alt.on('meshhub:interior:list:request', () => {
      this.handleListRequest()
    })

    // Телепортация к интерьеру
    alt.on('meshhub:interior:teleport', (data: { interiorId: string; position: { x: number; y: number; z: number } }) => {
      this.teleportToInterior(data.position)
    })

    // Скачивание интерьера (запрос к серверу)
    alt.on('meshhub:interior:download', (data: { interiorId: string; interiorName: string; token: string }) => {
      this.downloadInterior(data.interiorId, data.interiorName, data.token)
    })

    alt.log('[InteriorController] Event handlers registered')
  }

  private static handleListRequest(): void {
    const interiors = Array.from(this.installedInteriors)
    
    alt.emit('meshhub:interior:list:response', {
      interiors: interiors,
      error: undefined
    })
  }

  private static teleportToInterior(position: { x: number; y: number; z: number }): void {
    try {
      const player = alt.Player.local
      
      alt.log(`[InteriorController] Teleporting to: ${position.x}, ${position.y}, ${position.z}`)
      
      // Телепортируем игрока
      player.pos = new alt.Vector3(position.x, position.y, position.z)
      
      // Небольшая задержка для загрузки интерьера
      alt.setTimeout(() => {
        alt.log('[InteriorController] ✅ Teleported to interior')
      }, 100)
    } catch (error) {
      alt.logError(`[InteriorController] Failed to teleport: ${error}`)
    }
  }

  private static downloadInterior(interiorId: string, interiorName: string, token: string): void {
    alt.log(`[InteriorController] Downloading interior: ${interiorName}`)

    // Отправляем запрос на сервер для скачивания
    alt.emitServer('meshhub:interior:download', {
      interiorId: interiorId,
      interiorName: interiorName,
      token: token
    })

    // Слушаем ответ от сервера
    const responseHandler = (response: { success: boolean; message: string; interiorId?: string }) => {
      alt.off('meshhub:interior:download:server:response', responseHandler)

      if (response.success && response.interiorId) {
        this.installedInteriors.add(response.interiorId)
        this.saveInstalledInteriors()
      }

      alt.emit('meshhub:interior:download:response', response)
    }

    alt.on('meshhub:interior:download:server:response', responseHandler)
  }

  private static loadInstalledInteriors(): void {
    // Загружаем из localStorage или проверяем файловую систему через сервер
    // Для простоты используем set
    this.installedInteriors = new Set()
    alt.log('[InteriorController] Loaded installed interiors')
  }

  private static saveInstalledInteriors(): void {
    // Сохраняем список установленных интерьеров
    alt.log('[InteriorController] Saved installed interiors')
  }
}
```

---

### 3.3 Обновить инициализацию клиента

**Файл**: `meshhub_altv_integration/server/resources/meshhub/src/client/index.ts`

```typescript
import { InteriorController } from './interior-controller'

// В функции инициализации добавить:
InteriorController.initialize()
```

---

### 3.4 Создать серверный обработчик

**Файл**: `meshhub_altv_integration/server/resources/meshhub/src/server/interior-manager.ts` (создать новый)

```typescript
import * as alt from 'alt-server'
import * as fs from 'fs'
import * as path from 'path'
import axios from 'axios'

export class InteriorManager {
  private static readonly BACKEND_URL = 'https://hub.feeld.space'
  private static readonly INTERIOR_PATH = 'hubresource/interiors/'

  static initialize(): void {
    this.registerEventHandlers()
    alt.log('[InteriorManager] ✅ Initialized')
  }

  private static registerEventHandlers(): void {
    alt.onClient('meshhub:interior:download', this.handleDownloadRequest.bind(this))
  }

  private static async handleDownloadRequest(
    player: alt.Player,
    data: { interiorId: string; interiorName: string; token: string }
  ): Promise<void> {
    alt.log(`[InteriorManager] Download request from player ${player.id}: ${data.interiorName}`)

    try {
      // Скачиваем архив с backend
      const response = await axios.get(
        `${this.BACKEND_URL}/api/rpf/archives/${data.interiorId}/download`,
        {
          headers: {
            'Authorization': `Bearer ${data.token}`
          },
          responseType: 'arraybuffer'
        }
      )

      // Создаем папку если не существует
      const interiorDir = path.join(this.INTERIOR_PATH, data.interiorName)
      if (!fs.existsSync(interiorDir)) {
        fs.mkdirSync(interiorDir, { recursive: true })
      }

      // Сохраняем архив
      const archivePath = path.join(interiorDir, 'dlc.rpf')
      fs.writeFileSync(archivePath, Buffer.from(response.data))

      alt.log(`[InteriorManager] ✅ Interior saved to: ${archivePath}`)

      // Отправляем ответ клиенту
      player.emit('meshhub:interior:download:server:response', {
        success: true,
        message: 'Interior downloaded successfully',
        interiorId: data.interiorId
      })
    } catch (error: any) {
      alt.logError(`[InteriorManager] Failed to download interior: ${error.message}`)

      player.emit('meshhub:interior:download:server:response', {
        success: false,
        message: `Failed to download: ${error.message}`
      })
    }
  }
}
```

---

### 3.5 Обновить инициализацию сервера

**Файл**: `meshhub_altv_integration/server/resources/meshhub/src/server/index.ts`

```typescript
import { InteriorManager } from './interior-manager'

// В начале файла добавить:
InteriorManager.initialize()
```

---

## 📊 Этап 4: Обработка при индексации

### 4.1 Автоматическое обнаружение интерьеров

**Файл**: `rpf-backend/internal/rpf/services/unpacker.go`

В функции `IndexArchive` добавить после индексации файлов:

```go
// Сканируем на наличие интерьеров
if archive.YmapFilesCount > 0 {
    go func() {
        ctx := context.Background()
        if err := u.scanArchiveForInteriors(ctx, archiveID); err != nil {
            u.logger.Error().Err(err).Str("archiveID", archiveID).Msg("Failed to scan for interiors")
        }
    }()
}
```

Добавить метод:

```go
func (u *Unpacker) scanArchiveForInteriors(ctx context.Context, archiveID string) error {
    u.logger.Info().Str("archiveID", archiveID).Msg("🏠 Scanning archive for interiors...")
    
    // Получаем все YMAP файлы
    ymapFiles, err := u.fileStore.GetFilesByArchiveAndExtension(archiveID, ".ymap.xml")
    if err != nil {
        return err
    }
    
    totalInteriors := 0
    
    // Удаляем старые данные
    if err := u.interiorStore.DeleteInteriorsByArchive(ctx, archiveID); err != nil {
        u.logger.Warn().Err(err).Msg("Failed to delete old interiors")
    }
    
    // Парсим каждый YMAP
    for _, ymapFile := range ymapFiles {
        content, err := u.fileStore.GetFileContent(ymapFile.ID)
        if err != nil {
            continue
        }
        
        // Парсим интерьеры
        interiors, err := u.interiorParser.ParseYmapForInteriors(content.Data, archiveID, ymapFile.ID)
        if err != nil {
            u.logger.Warn().Err(err).Str("fileID", ymapFile.ID).Msg("Failed to parse interiors")
            continue
        }
        
        // Сохраняем
        for i := range interiors {
            if err := u.interiorStore.SaveInterior(ctx, &interiors[i]); err != nil {
                u.logger.Error().Err(err).Msg("Failed to save interior")
                continue
            }
            totalInteriors++
        }
    }
    
    // Обновляем архив
    if totalInteriors > 0 {
        if err := u.interiorStore.UpdateArchiveInteriorStatus(ctx, archiveID, true, totalInteriors); err != nil {
            u.logger.Error().Err(err).Msg("Failed to update archive interior status")
        }
        
        u.logger.Info().
            Str("archiveID", archiveID).
            Int("interiorsFound", totalInteriors).
            Msg("✅ Interiors scan completed")
    }
    
    return nil
}
```

---

## 📝 Этап 5: Тестирование и документация

### 5.1 Создать тестовые данные

1. Выбрать несколько архивов с интерьерами из базы
2. Проверить корректность парсинга YMAP
3. Проверить сохранение в БД

### 5.2 Документация

**Файл**: `meshhub_altv_integration/INTERIORS_QUICK_START.md` (создать новый)

```markdown
# Быстрый старт: Интерьеры (MLO)

## Описание

Модуль интерьеров позволяет управлять MLO (Multi-Level Objects) - интерьерами из GTA V.

## Использование

### 1. Просмотр интерьеров

- Откройте вкладку "Интерьеры"
- Выберите источник: HUB / GTAV / Local
- Просмотрите список доступных интерьеров

### 2. Установка интерьера

- Нажмите "Скачать" на нужном интерьере
- Дождитесь завершения установки
- Интерьер будет установлен в `hubresource/interiors/`

### 3. Телепортация

- Раскройте детали интерьера (клик по карточке)
- Нажмите на иконку телепорта рядом с нужной локацией
- Игрок будет перемещен к интерьеру

## API Endpoints

- `GET /api/rpf/mlo` - Список интерьеров
- `GET /api/rpf/mlo/{id}` - Детали интерьера
- `POST /api/rpf/mlo/{id}/scan` - Сканирование архива
```

---

## ✅ Чеклист выполнения

### Backend (Go)
- [ ] Создать миграцию БД для интерьеров
- [ ] Добавить поля в модель `RpfArchive`
- [ ] Создать модель `Interior` и `InteriorResource`
- [ ] Создать `InteriorParser` сервис
- [ ] Создать `InteriorStore` для работы с БД
- [ ] Создать `InteriorHandler` с endpoint'ами
- [ ] Добавить роуты в router
- [ ] Обновить `Unpacker` для автосканирования
- [ ] Протестировать API endpoints

### Frontend (React)
- [ ] Создать типы для интерьеров
- [ ] Создать сервис `interiors.ts`
- [ ] Создать `interiorManager.ts`
- [ ] Создать компонент `InteriorsPage`
- [ ] Обновить `App.tsx` (разблокировать вкладку)
- [ ] Добавить иконки и стили
- [ ] Протестировать UI

### ALT:V Integration
- [ ] Добавить типы событий в `altv.ts`
- [ ] Создать `InteriorController` (client)
- [ ] Создать `InteriorManager` (server)
- [ ] Обновить инициализацию client/server
- [ ] Протестировать телепортацию
- [ ] Протестировать загрузку интерьеров

### Документация
- [ ] Создать `INTERIORS_QUICK_START.md`
- [ ] Обновить `README.md`
- [ ] Добавить примеры использования

---

## 🔄 Порядок выполнения

1. **Backend first** - начинаем с базы данных и API
2. **Frontend integration** - подключаем UI
3. **ALT:V integration** - добавляем игровую логику
4. **Testing** - тестируем весь flow
5. **Documentation** - документируем функциональность

---

## 📌 Важные замечания

### Распознавание интерьеров

Интерьеры определяются по наличию в YMAP файлах элементов типа `CMloInstanceDef`:

```xml
<Item type="CMloInstanceDef">
  <archetypeName>baze_int_dealership_echelon_col</archetypeName>
  <position x="1680.5336" y="3588.8337" z="39.76234" />
  <rotation x="0" y="0" z="0" w="1" />
  <lodDist value="200" />
  <guid value="930630" />
  <flags value="1572864" />
</Item>
```

### Структура хранения

```
hubresource/
└── interiors/
    ├── interior_name_1/
    │   └── dlc.rpf
    ├── interior_name_2/
    │   └── dlc.rpf
    └── ...
```

### Особенности телепортации

- Телепортация происходит на клиенте через `alt.Player.local.pos`
- Координаты берутся напрямую из YMAP
- Может потребоваться небольшая задержка для загрузки интерьера

---

## 🚀 Следующие шаги после базовой реализации

1. **GTAV Interiors** - добавить список базовых интерьеров GTA V
2. **Local Interiors** - сканирование локальных установленных интерьеров
3. **Preview** - превью интерьеров (скриншоты/модели)
4. **Categories** - категоризация интерьеров (дома, офисы, склады и т.д.)
5. **Search** - поиск по интерьерам
6. **Filters** - фильтрация по категориям, размеру и т.д.

---

## 🔗 Связанные файлы

### Backend
- `rpf-backend/internal/rpf/storage/schema.sql`
- `rpf-backend/internal/rpf/models/archive.go`
- `rpf-backend/internal/rpf/services/interior_parser.go`
- `rpf-backend/internal/rpf/storage/interior_store.go`
- `rpf-backend/internal/rpf/handlers/interior.go`
- `rpf-backend/internal/router/router.go`

### Frontend
- `meshhub_altv_integration/client/src/types/interior.ts`
- `meshhub_altv_integration/client/src/services/interiors.ts`
- `meshhub_altv_integration/client/src/services/interiorManager.ts`
- `meshhub_altv_integration/client/src/components/interiors/InteriorsPage.tsx`
- `meshhub_altv_integration/client/src/App.tsx`

### ALT:V
- `meshhub_altv_integration/server/resources/meshhub/src/client/interior-controller.ts`
- `meshhub_altv_integration/server/resources/meshhub/src/server/interior-manager.ts`
- `meshhub_altv_integration/client/src/types/altv.ts`

---

## 💡 Оптимизации

1. **Кэширование** - кэшировать список интерьеров на клиенте
2. **Batch loading** - загружать интерьеры пачками
3. **Lazy loading** - подгружать детали только при необходимости
4. **WebSocket** - real-time обновления статуса установки
5. **Background indexing** - индексация интерьеров в фоне

---

## 🎯 Приоритет реализации

1. ✅ **P0 (Critical)**: Backend API + DB schema
2. ✅ **P1 (High)**: Frontend UI + Services
3. ✅ **P2 (Medium)**: ALT:V Integration
4. ⏳ **P3 (Low)**: GTAV/Local tabs
5. ⏳ **P4 (Future)**: Advanced features

