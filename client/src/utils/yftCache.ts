/**
 * YFT Model Cache System
 * Система кэширования для YFT моделей с использованием IndexedDB
 */

export interface CachedYFTData {
  /** Хэш файла для проверки изменений */
  fileHash: string
  /** Имя файла */
  fileName: string
  /** Размер файла в байтах */
  fileSize: number
  /** Время создания кэша */
  cachedAt: number
  /** Версия кэша (для миграций) */
  version: string
  /** Данные mesh в формате ArrayBuffer */
  meshData: ArrayBuffer
  /** Метаданные модели */
  metadata: {
    vertexCount: number
    faceCount: number
    hasNormals: boolean
    hasUVs: boolean
    boundingBox: {
      min: [number, number, number]
      max: [number, number, number]
    }
  }
}

export interface CacheStats {
  totalItems: number
  totalSize: number
  oldestCache: number | null
  newestCache: number | null
}

export class YFTCache {
  private dbName = 'yft-cache'
  private dbVersion = 1
  private storeName = 'yft-models'
  private db: IDBDatabase | null = null
  private readonly maxCacheSize = 500 * 1024 * 1024 // 500MB
  private readonly maxCacheAge = 7 * 24 * 60 * 60 * 1000 // 7 дней

  /**
   * Инициализация IndexedDB
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        // Создаем хранилище если не существует
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'fileName' })
          store.createIndex('cachedAt', 'cachedAt', { unique: false })
          store.createIndex('fileHash', 'fileHash', { unique: false })
        }
      }
    })
  }

  /**
   * Проверка доступности IndexedDB
   */
  isAvailable(): boolean {
    return typeof indexedDB !== 'undefined'
  }

  /**
   * Получение кэшированных данных по имени файла
   */
  async get(fileName: string, fileHash?: string): Promise<CachedYFTData | null> {
    if (!this.db) await this.init()
    if (!this.db) return null

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.get(fileName)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const result = request.result as CachedYFTData | undefined
        
        if (!result) {
          console.log(`[YFTCache] ❌ Cache miss for ${fileName} (not found in DB)`)
          resolve(null)
          return
        }

        // Проверяем хэш файла если указан
        if (fileHash && result.fileHash !== fileHash) {
          console.log(`[YFTCache] 🗑️ Cache invalid for ${fileName} (hash mismatch: expected ${fileHash}, got ${result.fileHash})`)
          resolve(null)
          return
        }

        // Проверяем возраст кэша
        const age = Date.now() - result.cachedAt
        if (age > this.maxCacheAge) {
          console.log(`[YFTCache] 🗑️ Cache expired for ${fileName} (age: ${Math.round(age / 1000 / 60 / 60)}h)`)
          resolve(null)
          return
        }

        console.log(`[YFTCache] ✅ Cache hit for ${fileName} (size: ${YFTCache.formatSize(result.fileSize)}, age: ${YFTCache.formatTime(result.cachedAt)})`)
        resolve(result)
      }
    })
  }

  /**
   * Сохранение данных в кэш
   */
  async set(data: CachedYFTData): Promise<void> {
    if (!this.db) await this.init()
    if (!this.db) throw new Error('IndexedDB not available')

    // Проверяем размер кэша и очищаем старые записи если нужно
    await this.cleanupIfNeeded()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.put(data)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        console.log(`[YFTCache] 💾 Cached ${data.fileName} (${Math.round(data.fileSize / 1024)}KB)`)
        resolve()
      }
    })
  }

  /**
   * Удаление записи из кэша
   */
  async delete(fileName: string): Promise<void> {
    if (!this.db) await this.init()
    if (!this.db) return

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.delete(fileName)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        console.log(`[YFTCache] 🗑️ Deleted cache for ${fileName}`)
        resolve()
      }
    })
  }

  /**
   * Очистка всего кэша
   */
  async clear(): Promise<void> {
    if (!this.db) await this.init()
    if (!this.db) return

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.clear()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        console.log(`[YFTCache] 🧹 Cleared all cache`)
        resolve()
      }
    })
  }

  /**
   * Получение статистики кэша
   */
  async getStats(): Promise<CacheStats> {
    if (!this.db) await this.init()
    if (!this.db) return { totalItems: 0, totalSize: 0, oldestCache: null, newestCache: null }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.getAll()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const items = request.result as CachedYFTData[]
        
        const stats: CacheStats = {
          totalItems: items.length,
          totalSize: items.reduce((sum, item) => sum + item.fileSize, 0),
          oldestCache: items.length > 0 ? Math.min(...items.map(item => item.cachedAt)) : null,
          newestCache: items.length > 0 ? Math.max(...items.map(item => item.cachedAt)) : null
        }

        resolve(stats)
      }
    })
  }

  /**
   * Очистка старых записей если кэш превышает лимит
   */
  private async cleanupIfNeeded(): Promise<void> {
    const stats = await this.getStats()
    
    if (stats.totalSize <= this.maxCacheSize) return

    console.log(`[YFTCache] 🧹 Cache size ${Math.round(stats.totalSize / 1024 / 1024)}MB exceeds limit, cleaning up...`)

    // Получаем все записи отсортированные по дате (старые первыми)
    const allItems = await this.getAllItemsSortedByDate()
    
    let currentSize = stats.totalSize
    const itemsToDelete: string[] = []

    // Удаляем старые записи пока не освободим достаточно места
    for (const item of allItems) {
      if (currentSize <= this.maxCacheSize * 0.8) break // Оставляем 20% запаса
      
      itemsToDelete.push(item.fileName)
      currentSize -= item.fileSize
    }

    // Удаляем выбранные записи
    for (const fileName of itemsToDelete) {
      await this.delete(fileName)
    }

    console.log(`[YFTCache] 🧹 Cleaned up ${itemsToDelete.length} old cache entries`)
  }

  /**
   * Получение всех записей отсортированных по дате
   */
  private async getAllItemsSortedByDate(): Promise<CachedYFTData[]> {
    if (!this.db) return []

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const index = store.index('cachedAt')
      const request = index.getAll()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const items = request.result as CachedYFTData[]
        items.sort((a, b) => a.cachedAt - b.cachedAt) // Сортируем по дате (старые первыми)
        resolve(items)
      }
    })
  }

  /**
   * Создание хэша файла (упрощенная версия)
   * ВАЖНО: Хэш основан ТОЛЬКО на имени файла для стабильности кэша
   */
  static async createFileHash(fileName: string, _fileSize?: number, _lastModified?: number): Promise<string> {
    // Простой хэш на основе ТОЛЬКО имени файла (стабильный хэш для кэширования)
    // _fileSize и _lastModified игнорируются для YFT файлов, т.к. они не меняются
    const data = `${fileName}`
    
    // Используем Web Crypto API если доступен
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoder = new TextEncoder()
      const dataBuffer = encoder.encode(data)
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    }
    
    // Fallback - простой хэш
    let hash = 0
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Конвертируем в 32-битное число
    }
    return hash.toString(16)
  }

  /**
   * Форматирование размера в человекочитаемый вид
   */
  static formatSize(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 B'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`
  }

  /**
   * Форматирование времени в человекочитаемый вид
   */
  static formatTime(timestamp: number): string {
    const now = Date.now()
    const diff = now - timestamp
    
    if (diff < 60000) return `${Math.round(diff / 1000)}s ago`
    if (diff < 3600000) return `${Math.round(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.round(diff / 3600000)}h ago`
    return `${Math.round(diff / 86400000)}d ago`
  }
}

// Экспортируем singleton instance
export const yftCache = new YFTCache()
