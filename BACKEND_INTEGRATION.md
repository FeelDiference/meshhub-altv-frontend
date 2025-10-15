# 🔌 ИНТЕГРАЦИЯ С BACKEND

## Обзор

Документация по интеграции ALT:V инструмента с существующим MeshHub Backend (rpf-backend).

---

## Расширение Backend

### Новые файлы

```
rpf-backend/
├── internal/
│   └── rpf/
│       ├── handlers/
│       │   └── vehicle_handlers.go      # НОВЫЙ: Handlers для автомобилей
│       ├── services/
│       │   ├── vehicle_updater.go       # НОВЫЙ: Обновление handling в RPF
│       │   └── vehicle_validator.go     # НОВЫЙ: Валидация параметров
│       └── models/
│           └── vehicle_api.go           # НОВЫЙ: API модели
```

---

## Новые Handlers

### `internal/rpf/handlers/vehicle_handlers.go`

```go
package handlers

import (
	"encoding/json"
	"net/http"
	
	"github.com/gorilla/mux"
	"go_back_jira/internal/rpf/models"
	"go_back_jira/internal/rpf/services"
	"go_back_jira/internal/util"
)

// VehicleHandlers содержит handlers для работы с автомобилями
type VehicleHandlers struct {
	MetaParser     *services.VehicleMetaParser
	Updater        *services.VehicleUpdater
	Validator      *services.VehicleValidator
	DownloadService *fileops.DownloadService
	DB             *sql.DB
}

// GetVehicles возвращает список всех автомобилей с метаданными
// GET /api/rpf/vehicles
func (h *VehicleHandlers) GetVehicles(w http.ResponseWriter, r *http.Request) {
	// Получить параметры фильтрации
	withMetadata := r.URL.Query().Get("with_metadata") != "false"
	
	// Запрос к БД для получения всех vehicle архивов
	query := `
		SELECT 
			a.id, 
			a.name, 
			a.original_name, 
			a.path,
			a.size,
			a.resource_type,
			a.created_at,
			a.updated_at,
			vm.metadata
		FROM archives a
		LEFT JOIN vehicle_metadata vm ON a.id = vm.archive_id
		WHERE a.resource_type = 'vehicle'
	`
	
	if withMetadata {
		query += " AND vm.metadata IS NOT NULL"
	}
	
	query += " ORDER BY a.name ASC"
	
	rows, err := h.DB.Query(query)
	if err != nil {
		util.WriteError(w, http.StatusInternalServerError, "database_error", "Failed to query vehicles")
		return
	}
	defer rows.Close()
	
	var vehicles []models.VehicleResourceAPI
	
	for rows.Next() {
		var v models.VehicleResourceAPI
		var metadataJSON []byte
		
		err := rows.Scan(
			&v.ID,
			&v.Name,
			&v.OriginalName,
			&v.Path,
			&v.Size,
			&v.ResourceType,
			&v.CreatedAt,
			&v.UpdatedAt,
			&metadataJSON,
		)
		if err != nil {
			continue
		}
		
		// Парсим метаданные
		if metadataJSON != nil {
			var metadata models.VehicleMetadata
			if err := json.Unmarshal(metadataJSON, &metadata); err == nil {
				v.Metadata = &metadata
			}
		}
		
		// Генерируем displayName
		v.DisplayName = h.generateDisplayName(v.Name, v.Metadata)
		
		vehicles = append(vehicles, v)
	}
	
	// Отправляем ответ
	util.WriteJSON(w, http.StatusOK, map[string]interface{}{
		"success":  true,
		"vehicles": vehicles,
		"total":    len(vehicles),
	})
}

// GetVehicle возвращает детальную информацию об автомобиле
// GET /api/rpf/vehicles/{id}
func (h *VehicleHandlers) GetVehicle(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	
	// Запрос к БД
	query := `
		SELECT 
			a.id, 
			a.name, 
			a.original_name, 
			a.path,
			a.size,
			a.resource_type,
			a.created_at,
			a.updated_at,
			vm.metadata
		FROM archives a
		LEFT JOIN vehicle_metadata vm ON a.id = vm.archive_id
		WHERE a.id = $1 AND a.resource_type = 'vehicle'
	`
	
	var v models.VehicleResourceAPI
	var metadataJSON []byte
	
	err := h.DB.QueryRow(query, id).Scan(
		&v.ID,
		&v.Name,
		&v.OriginalName,
		&v.Path,
		&v.Size,
		&v.ResourceType,
		&v.CreatedAt,
		&v.UpdatedAt,
		&metadataJSON,
	)
	
	if err != nil {
		if err == sql.ErrNoRows {
			util.WriteError(w, http.StatusNotFound, "not_found", "Vehicle not found")
		} else {
			util.WriteError(w, http.StatusInternalServerError, "database_error", "Failed to query vehicle")
		}
		return
	}
	
	// Парсим метаданные
	if metadataJSON != nil {
		var metadata models.VehicleMetadata
		if err := json.Unmarshal(metadataJSON, &metadata); err == nil {
			v.Metadata = &metadata
		}
	}
	
	v.DisplayName = h.generateDisplayName(v.Name, v.Metadata)
	
	util.WriteJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"vehicle": v,
	})
}

// DownloadVehicle скачивает ресурс автомобиля в формате ZIP
// GET /api/rpf/vehicles/{id}/download
func (h *VehicleHandlers) DownloadVehicle(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	
	// Получить информацию об архиве
	var archivePath string
	var archiveName string
	
	err := h.DB.QueryRow(
		"SELECT path, name FROM archives WHERE id = $1 AND resource_type = 'vehicle'",
		id,
	).Scan(&archivePath, &archiveName)
	
	if err != nil {
		if err == sql.ErrNoRows {
			util.WriteError(w, http.StatusNotFound, "not_found", "Vehicle not found")
		} else {
			util.WriteError(w, http.StatusInternalServerError, "database_error", "Failed to query vehicle")
		}
		return
	}
	
	// Используем существующий DownloadService для создания ZIP
	// Генерируем task ID
	taskID := fmt.Sprintf("vehicle_%s_%d", id, time.Now().Unix())
	
	// Устанавливаем headers для скачивания
	w.Header().Set("Content-Type", "application/zip")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%q.zip", archiveName))
	w.WriteHeader(http.StatusOK)
	
	// Стримим ZIP напрямую в response
	err = h.DownloadService.StreamZipFolder(w, archivePath, taskID)
	if err != nil {
		// Ошибка уже записана в response
		return
	}
}

// GetVehicleMetadata возвращает только метаданные автомобиля
// GET /api/rpf/vehicles/{id}/metadata
func (h *VehicleHandlers) GetVehicleMetadata(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	
	// Запрос метаданных
	var metadataJSON []byte
	
	err := h.DB.QueryRow(
		"SELECT metadata FROM vehicle_metadata WHERE archive_id = $1",
		id,
	).Scan(&metadataJSON)
	
	if err != nil {
		if err == sql.ErrNoRows {
			util.WriteError(w, http.StatusNotFound, "not_found", "Metadata not found")
		} else {
			util.WriteError(w, http.StatusInternalServerError, "database_error", "Failed to query metadata")
		}
		return
	}
	
	// Парсим метаданные
	var metadata models.VehicleMetadata
	if err := json.Unmarshal(metadataJSON, &metadata); err != nil {
		util.WriteError(w, http.StatusInternalServerError, "parse_error", "Failed to parse metadata")
		return
	}
	
	util.WriteJSON(w, http.StatusOK, map[string]interface{}{
		"success":  true,
		"metadata": metadata,
	})
}

// SaveVehicleHandling сохраняет handling.meta в RPF архив
// POST /api/rpf/vehicles/{id}/handling
func (h *VehicleHandlers) SaveVehicleHandling(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	
	// Парсим request body
	var req models.SaveHandlingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		util.WriteError(w, http.StatusBadRequest, "invalid_json", "Invalid JSON")
		return
	}
	
	// Валидация handling
	if err := h.Validator.ValidateHandling(&req.Handling); err != nil {
		util.WriteError(w, http.StatusUnprocessableEntity, "validation_error", err.Error())
		return
	}
	
	// Получить путь к архиву
	var archivePath string
	err := h.DB.QueryRow(
		"SELECT path FROM archives WHERE id = $1 AND resource_type = 'vehicle'",
		id,
	).Scan(&archivePath)
	
	if err != nil {
		if err == sql.ErrNoRows {
			util.WriteError(w, http.StatusNotFound, "not_found", "Vehicle not found")
		} else {
			util.WriteError(w, http.StatusInternalServerError, "database_error", "Failed to query vehicle")
		}
		return
	}
	
	// Обновить handling в RPF
	result, err := h.Updater.UpdateHandling(archivePath, &req.Handling)
	if err != nil {
		util.WriteError(w, http.StatusInternalServerError, "update_failed", fmt.Sprintf("Failed to update handling: %v", err))
		return
	}
	
	// Обновить метаданные в БД
	// (здесь можно обновить vehicle_metadata таблицу)
	
	// Отправляем успешный ответ
	util.WriteJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Handling успешно сохранен в RPF архив",
		"backup":  result.Backup,
		"updated": result.Updated,
	})
}

// generateDisplayName генерирует отображаемое имя
func (h *VehicleHandlers) generateDisplayName(name string, metadata *models.VehicleMetadata) string {
	if metadata != nil && metadata.ModelName != "" {
		// Используем modelName из метаданных
		return metadata.ModelName
	}
	return name
}
```

---

## Новые Services

### `internal/rpf/services/vehicle_updater.go`

```go
package services

import (
	"encoding/xml"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"time"
	
	"go_back_jira/internal/rpf/models"
)

// VehicleUpdater обновляет файлы в RPF архивах
type VehicleUpdater struct {
	RPFTool    *RPFTool
	BackupDir  string
}

// UpdateResult содержит результат обновления
type UpdateResult struct {
	Backup  BackupInfo  `json:"backup"`
	Updated UpdatedInfo `json:"updated"`
}

type BackupInfo struct {
	ID        string    `json:"id"`
	Filename  string    `json:"filename"`
	Path      string    `json:"path"`
	Size      int64     `json:"size"`
	CreatedAt time.Time `json:"createdAt"`
}

type UpdatedInfo struct {
	ArchiveID string    `json:"archiveId"`
	Path      string    `json:"path"`
	Size      int64     `json:"size"`
	HashMD5   string    `json:"hashMD5"`
	HashSHA256 string   `json:"hashSHA256"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// UpdateHandling обновляет handling.meta в RPF архиве
func (u *VehicleUpdater) UpdateHandling(archivePath string, handling *models.HandlingData) (*UpdateResult, error) {
	// 1. Создать временную директорию для работы
	tempDir, err := os.MkdirTemp("", "vehicle_update_*")
	if err != nil {
		return nil, fmt.Errorf("failed to create temp dir: %w", err)
	}
	defer os.RemoveAll(tempDir)
	
	// 2. Извлечь .rpf архив
	extractDir := filepath.Join(tempDir, "extracted")
	if err := u.RPFTool.Extract(archivePath, extractDir); err != nil {
		return nil, fmt.Errorf("failed to extract RPF: %w", err)
	}
	
	// 3. Найти handling.meta
	handlingPath := ""
	err = filepath.Walk(extractDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}
		if !info.IsDir() && strings.ToLower(info.Name()) == "handling.meta" {
			handlingPath = path
			return filepath.SkipDir
		}
		return nil
	})
	
	if handlingPath == "" {
		return nil, fmt.Errorf("handling.meta not found in archive")
	}
	
	// 4. Создать бэкап оригинального .rpf
	backup, err := u.createBackup(archivePath)
	if err != nil {
		return nil, fmt.Errorf("failed to create backup: %w", err)
	}
	
	// 5. Обновить handling.meta
	if err := u.updateHandlingFile(handlingPath, handling); err != nil {
		return nil, fmt.Errorf("failed to update handling file: %w", err)
	}
	
	// 6. Перепаковать .rpf
	if err := u.RPFTool.Pack(extractDir, archivePath); err != nil {
		// Если перепаковка не удалась, восстановить из бэкапа
		u.restoreBackup(backup.Path, archivePath)
		return nil, fmt.Errorf("failed to repack RPF: %w", err)
	}
	
	// 7. Получить информацию об обновленном файле
	updated, err := u.getFileInfo(archivePath)
	if err != nil {
		return nil, fmt.Errorf("failed to get file info: %w", err)
	}
	
	return &UpdateResult{
		Backup:  *backup,
		Updated: *updated,
	}, nil
}

// createBackup создает бэкап файла
func (u *VehicleUpdater) createBackup(filePath string) (*BackupInfo, error) {
	// Создать директорию для бэкапов если не существует
	if err := os.MkdirAll(u.BackupDir, 0755); err != nil {
		return nil, err
	}
	
	// Генерировать имя бэкапа
	baseName := filepath.Base(filePath)
	timestamp := time.Now().Format("20060102_150405")
	backupName := fmt.Sprintf("%s_backup_%s", strings.TrimSuffix(baseName, filepath.Ext(baseName)), timestamp) + filepath.Ext(baseName)
	backupPath := filepath.Join(u.BackupDir, backupName)
	
	// Копировать файл
	if err := copyFile(filePath, backupPath); err != nil {
		return nil, err
	}
	
	// Получить размер
	info, err := os.Stat(backupPath)
	if err != nil {
		return nil, err
	}
	
	return &BackupInfo{
		ID:        fmt.Sprintf("backup_%d", time.Now().Unix()),
		Filename:  backupName,
		Path:      backupPath,
		Size:      info.Size(),
		CreatedAt: time.Now(),
	}, nil
}

// updateHandlingFile обновляет handling.meta файл
func (u *VehicleUpdater) updateHandlingFile(filePath string, handling *models.HandlingData) error {
	// Читаем существующий файл
	file, err := os.Open(filePath)
	if err != nil {
		return err
	}
	defer file.Close()
	
	content, err := io.ReadAll(file)
	if err != nil {
		return err
	}
	
	// Парсим XML
	// (используем структуры из vehicle_meta_parser.go)
	// ...
	
	// Обновляем значения
	// ...
	
	// Сериализуем обратно в XML
	updatedXML, err := xml.MarshalIndent(/* структура */, "", "  ")
	if err != nil {
		return err
	}
	
	// Записываем обратно
	if err := os.WriteFile(filePath, updatedXML, 0644); err != nil {
		return err
	}
	
	return nil
}

// getFileInfo получает информацию о файле
func (u *VehicleUpdater) getFileInfo(filePath string) (*UpdatedInfo, error) {
	info, err := os.Stat(filePath)
	if err != nil {
		return nil, err
	}
	
	// Вычислить хеши
	md5Hash, err := calculateMD5(filePath)
	if err != nil {
		return nil, err
	}
	
	sha256Hash, err := calculateSHA256(filePath)
	if err != nil {
		return nil, err
	}
	
	return &UpdatedInfo{
		Path:       filePath,
		Size:       info.Size(),
		HashMD5:    md5Hash,
		HashSHA256: sha256Hash,
		UpdatedAt:  time.Now(),
	}, nil
}

// Вспомогательные функции
func copyFile(src, dst string) error {
	// ...
}

func calculateMD5(filePath string) (string, error) {
	// ...
}

func calculateSHA256(filePath string) (string, error) {
	// ...
}
```

### `internal/rpf/services/vehicle_validator.go`

```go
package services

import (
	"fmt"
	
	"go_back_jira/internal/rpf/models"
)

// VehicleValidator валидирует параметры автомобилей
type VehicleValidator struct{}

// ValidateHandling валидирует все параметры handling
func (v *VehicleValidator) ValidateHandling(h *models.HandlingData) error {
	// Валидация физических параметров
	if h.Mass <= 0 {
		return fmt.Errorf("mass must be greater than 0")
	}
	
	if h.InitialDragCoeff < 0 {
		return fmt.Errorf("initialDragCoeff must be >= 0")
	}
	
	if h.PercentSubmerged < 0 || h.PercentSubmerged > 100 {
		return fmt.Errorf("percentSubmerged must be between 0 and 100")
	}
	
	// Валидация трансмиссии
	if h.InitialDriveGears < 1 || h.InitialDriveGears > 10 {
		return fmt.Errorf("initialDriveGears must be between 1 and 10")
	}
	
	if h.DriveBiasFront < 0 || h.DriveBiasFront > 1 {
		return fmt.Errorf("driveBiasFront must be between 0 and 1")
	}
	
	if h.BrakeForce < 0 {
		return fmt.Errorf("brakeForce must be >= 0")
	}
	
	if h.SteeringLock < 0 || h.SteeringLock > 90 {
		return fmt.Errorf("steeringLock must be between 0 and 90")
	}
	
	// Валидация тяги
	if h.TractionCurveMax < 0 {
		return fmt.Errorf("tractionCurveMax must be >= 0")
	}
	
	if h.TractionCurveMin < 0 {
		return fmt.Errorf("tractionCurveMin must be >= 0")
	}
	
	// ... остальные валидации
	
	return nil
}
```

---

## Новые API Models

### `internal/rpf/models/vehicle_api.go`

```go
package models

import "time"

// VehicleResourceAPI представляет автомобиль для API
type VehicleResourceAPI struct {
	ID           string            `json:"id"`
	Name         string            `json:"name"`
	OriginalName string            `json:"originalName"`
	DisplayName  string            `json:"displayName"`
	ModelName    string            `json:"modelName"`
	Path         string            `json:"path"`
	ArchiveID    string            `json:"archiveId"`
	Size         int64             `json:"size"`
	ResourceType string            `json:"resourceType"`
	Metadata     *VehicleMetadata  `json:"metadata,omitempty"`
	CreatedAt    time.Time         `json:"createdAt"`
	UpdatedAt    time.Time         `json:"updatedAt"`
}

// SaveHandlingRequest запрос на сохранение handling
type SaveHandlingRequest struct {
	Handling HandlingData `json:"handling"`
}
```

---

## Регистрация роутов

### `internal/router/router.go`

Добавить новые роуты:

```go
// Vehicle routes
vehicleHandlers := &handlers.VehicleHandlers{
	MetaParser:      rpfService.VehicleMetaParser,
	Updater:         rpfService.VehicleUpdater,
	Validator:       rpfService.VehicleValidator,
	DownloadService: downloadService,
	DB:              db,
}

// Защищенные роуты
protected.HandleFunc("/rpf/vehicles", vehicleHandlers.GetVehicles).Methods("GET")
protected.HandleFunc("/rpf/vehicles/{id}", vehicleHandlers.GetVehicle).Methods("GET")
protected.HandleFunc("/rpf/vehicles/{id}/download", vehicleHandlers.DownloadVehicle).Methods("GET")
protected.HandleFunc("/rpf/vehicles/{id}/metadata", vehicleHandlers.GetVehicleMetadata).Methods("GET")
protected.HandleFunc("/rpf/vehicles/{id}/handling", vehicleHandlers.SaveVehicleHandling).Methods("POST")
```

---

## База данных

### Новая таблица (если еще не существует)

```sql
CREATE TABLE IF NOT EXISTS vehicle_metadata (
  id SERIAL PRIMARY KEY,
  archive_id VARCHAR(255) UNIQUE NOT NULL REFERENCES archives(id) ON DELETE CASCADE,
  metadata JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_archive FOREIGN KEY (archive_id) REFERENCES archives(id)
);

CREATE INDEX idx_vehicle_metadata_archive_id ON vehicle_metadata(archive_id);
CREATE INDEX idx_vehicle_metadata_metadata ON vehicle_metadata USING GIN (metadata);
```

---

## Конфигурация

### Добавить в config

```go
// BackupDir директория для бэкапов
BackupDir string `env:"BACKUP_DIR" envDefault:"/app/backups/vehicles"`
```

---

## Тестирование

### Unit тесты

```go
// internal/rpf/services/vehicle_updater_test.go

package services

import (
	"testing"
	
	"go_back_jira/internal/rpf/models"
)

func TestUpdateHandling(t *testing.T) {
	// Создать тестовый .rpf
	// Обновить handling
	// Проверить что бэкап создан
	// Проверить что handling обновлен
	// Проверить что .rpf перепакован
}

func TestCreateBackup(t *testing.T) {
	// Создать тестовый файл
	// Создать бэкап
	// Проверить что бэкап существует
	// Проверить что содержимое идентично
}
```

---

## Мониторинг и логирование

### Логирование

Добавить логирование для всех критических операций:

```go
logger.Info().
	Str("vehicle_id", id).
	Str("archive_path", archivePath).
	Msg("Starting handling update")

logger.Info().
	Str("backup_path", backup.Path).
	Int64("backup_size", backup.Size).
	Msg("Backup created successfully")

logger.Info().
	Str("archive_path", archivePath).
	Msg("Handling updated successfully")
```

### Метрики (Prometheus)

```go
var (
	handlingUpdatesTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "vehicle_handling_updates_total",
			Help: "Total number of handling updates",
		},
		[]string{"status"},
	)
	
	handlingUpdateDuration = prometheus.NewHistogram(
		prometheus.HistogramOpts{
			Name: "vehicle_handling_update_duration_seconds",
			Help: "Duration of handling update operations",
		},
	)
)

// Использование
start := time.Now()
defer func() {
	handlingUpdateDuration.Observe(time.Since(start).Seconds())
}()

// После успеха
handlingUpdatesTotal.WithLabelValues("success").Inc()

// После ошибки
handlingUpdatesTotal.WithLabelValues("error").Inc()
```

---

## Безопасность

### Авторизация

Все endpoints требуют авторизации через JWT токен.

### Валидация

Всегда валидировать все входные данные на сервере.

### Rate Limiting

```go
// Настроить rate limiter для endpoints
rateLimiter := middleware.NewRateLimiter(
	30, // 30 requests
	time.Minute, // per minute
)

protected.Use(rateLimiter.Middleware)
```

---

## Производительность

### Кэширование

Кэшировать метаданные автомобилей:

```go
type VehicleCache struct {
	sync.RWMutex
	data map[string]*models.VehicleMetadata
	ttl  time.Duration
}

func (c *VehicleCache) Get(id string) (*models.VehicleMetadata, bool) {
	c.RLock()
	defer c.RUnlock()
	meta, ok := c.data[id]
	return meta, ok
}

func (c *VehicleCache) Set(id string, meta *models.VehicleMetadata) {
	c.Lock()
	defer c.Unlock()
	c.data[id] = meta
}
```

### Оптимизация запросов

Использовать batch запросы где возможно.

---

Это основные изменения для backend интеграции. Backend готов к работе с ALT:V инструментом! 🚀

