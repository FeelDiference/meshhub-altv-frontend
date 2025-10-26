/**
 * Централизованный сервис для работы с избранным
 * Единый источник правды для всей системы избранного
 */

import type { 
  FavoritesState, 
  FavoritesStorageData, 
  FavoriteType,
  IFavoritesService,
  HotkeyBinding
} from '@/types/favorites'
import { FAVORITE_CONFIGS } from '@/config/favorites'

// ============================================================================
// Константы
// ============================================================================

const STORAGE_KEY = 'meshhub_favorites_v2'
const STORAGE_VERSION = 2
const SYNC_DEBOUNCE_MS = 300

// ============================================================================
// Начальное состояние
// ============================================================================

const INITIAL_STATE: FavoritesState = {
  weather: [],
  time: [],
  timeSpeed: [],
  vehicles: [],
  vehicleActions: [],
  weaponActions: [],
  locations: [],
  teleportMarkers: [],
  hotkeys: [],
}

// ============================================================================
// FavoritesStorage - Основной класс
// ============================================================================

/**
 * Класс для работы с хранилищем избранного
 * Абстракция над localStorage + Alt:V LocalStorage
 */
class FavoritesStorage implements IFavoritesService {
  private state: FavoritesState = { ...INITIAL_STATE }
  private subscribers: Set<(state: FavoritesState) => void> = new Set()
  private syncTimeout: NodeJS.Timeout | null = null
  private initialized = false

  /**
   * Инициализация - загрузка данных из хранилища
   */
  async init(): Promise<void> {
    if (this.initialized) return
    
    console.log('[FavoritesService] Initializing...')
    
    // ВАЖНО: Начинаем с дефолтного состояния (гарантия что все поля есть)
    this.state = { ...INITIAL_STATE }
    
    // 1. ПРИОРИТЕТ: Загрузка из Alt:V LocalStorage (персистентное хранилище)
    const loadedFromAltV = await this.loadFromAltV()
    
    if (loadedFromAltV) {
      console.log('[FavoritesService] ✅ Loaded from Alt:V LocalStorage (persistent)')
      this.state = {
        ...INITIAL_STATE,
        ...loadedFromAltV
      }
      // Синхронизируем с браузерным localStorage для быстрого доступа
      await this.saveToStorage()
    } else {
      // 2. Fallback: Загрузка из браузерного localStorage
      const loaded = await this.loadFromStorage()
      
      if (loaded) {
        console.log('[FavoritesService] Loaded from browser localStorage (fallback)')
        this.state = {
          ...INITIAL_STATE,
          ...loaded
        }
        // Сохраняем в Alt:V для персистентности
        await this.syncWithAltV()
      } else {
        // 3. Миграция старых данных
        console.log('[FavoritesService] No storage found, checking for legacy data...')
        const migrated = await this.migrateLegacyData()
        
        if (migrated) {
          console.log('[FavoritesService] Migrated legacy data successfully')
          this.state = {
            ...INITIAL_STATE,
            ...migrated
          }
          await this.saveToStorage()
          await this.syncWithAltV()
        }
      }
    }
    
    this.initialized = true
    console.log('[FavoritesService] Initialized with state:', this.state)
    
    // Уведомляем подписчиков
    this.notifySubscribers()
  }

  /**
   * Получить все избранное по типу
   */
  async get<T>(type: FavoriteType): Promise<T[]> {
    if (!this.initialized) await this.init()
    
    // Маппинг типов к полям state
    const typeToField: Record<FavoriteType, keyof FavoritesState> = {
      weather: 'weather',
      time: 'time',
      timeSpeed: 'timeSpeed',
      vehicle: 'vehicles',
      vehicleAction: 'vehicleActions',
      weaponAction: 'weaponActions',
      location: 'locations',
      teleportMarker: 'teleportMarkers'
    }
    
    const field = typeToField[type]
    return this.state[field] as T[]
  }

  /**
   * Получить все избранное
   */
  async getAll(): Promise<FavoritesState> {
    if (!this.initialized) await this.init()
    return { ...this.state }
  }

  /**
   * Проверить наличие в избранном
   */
  has(type: FavoriteType, id: string): boolean {
    // Маппинг типов к полям state
    const typeToField: Record<FavoriteType, keyof FavoritesState> = {
      weather: 'weather',
      time: 'time',
      timeSpeed: 'timeSpeed',
      vehicle: 'vehicles',
      vehicleAction: 'vehicleActions',
      weaponAction: 'weaponActions',
      location: 'locations',
      teleportMarker: 'teleportMarkers'
    }
    
    const field = typeToField[type]
    const items: any[] = this.state[field] as any[]
    
    if (!Array.isArray(items) || items.length === 0) {
      return false
    }
    
    // Для примитивов (string, number)
    if (typeof items[0] === 'string') {
      return (items as string[]).includes(id)
    }
    
    if (typeof items[0] === 'number') {
      const numId = parseFloat(id)
      return !isNaN(numId) && (items as number[]).includes(numId)
    }
    
    // Для объектов (locations, teleportMarkers)
    return items.some((item: any) => {
      if (typeof item === 'object' && item !== null && 'id' in item) {
        return item.id === id
      }
      return false
    })
  }

  /**
   * Добавить в избранное
   */
  async add<T>(type: FavoriteType, item: T): Promise<void> {
    if (!this.initialized) await this.init()
    
    console.log(`[FavoritesService] Adding to ${type}:`, item)
    
    // Маппинг типов к полям state
    const typeToField: Record<FavoriteType, keyof FavoritesState> = {
      weather: 'weather',
      time: 'time',
      timeSpeed: 'timeSpeed',
      vehicle: 'vehicles',
      vehicleAction: 'vehicleActions',
      weaponAction: 'weaponActions',
      location: 'locations',
      teleportMarker: 'teleportMarkers'
    }
    
    const field = typeToField[type]
    const currentItems = this.state[field] as T[]
    const config = FAVORITE_CONFIGS[type]
    
    // Получаем ID элемента
    const itemId = config.getId(item)
    
    // Проверяем, не добавлен ли уже
    if (this.has(type, itemId)) {
      console.log(`[FavoritesService] Item ${itemId} already in favorites`)
      return
    }
    
    // Добавляем в state
    this.state = {
      ...this.state,
      [field]: [...currentItems, item]
    }
    
    // Сохраняем и синхронизируем
    await this.saveAndSync()
  }

  /**
   * Удалить из избранного
   */
  async remove(type: FavoriteType, id: string): Promise<void> {
    if (!this.initialized) await this.init()
    
    console.log(`[FavoritesService] Removing from ${type}:`, id)
    
    // Маппинг типов к полям state
    const typeToField: Record<FavoriteType, keyof FavoritesState> = {
      weather: 'weather',
      time: 'time',
      timeSpeed: 'timeSpeed',
      vehicle: 'vehicles',
      vehicleAction: 'vehicleActions',
      weaponAction: 'weaponActions',
      location: 'locations',
      teleportMarker: 'teleportMarkers'
    }
    
    const field = typeToField[type]
    const currentItems = this.state[field] as any[]
    
    // Фильтруем элементы
    const newItems = currentItems.filter((item: any) => {
      if (typeof item === 'string' || typeof item === 'number') {
        return item.toString() !== id
      }
      
      if (typeof item === 'object' && item !== null) {
        return item.id !== id
      }
      
      return true
    })
    
    // Обновляем state
    this.state = {
      ...this.state,
      [field]: newItems
    }
    
    // Сохраняем и синхронизируем
    await this.saveAndSync()
  }

  /**
   * Переключить избранное
   */
  async toggle<T>(type: FavoriteType, item: T): Promise<boolean> {
    if (!this.initialized) await this.init()
    
    const config = FAVORITE_CONFIGS[type]
    const itemId = config.getId(item)
    
    if (this.has(type, itemId)) {
      await this.remove(type, itemId)
      return false
    } else {
      await this.add(type, item)
      return true
    }
  }

  // ========================================================================
  // HotKeys методы
  // ========================================================================

  /**
   * Установить HotKey для избранного элемента
   */
  async setHotkey(
    type: FavoriteType, 
    itemId: string, 
    key: string, 
    modifiers?: HotkeyBinding['modifiers']
  ): Promise<void> {
    if (!this.initialized) await this.init()
    
    console.log(`[FavoritesService] Setting hotkey ${key} for ${type}:${itemId}`)
    
    // Проверяем, что элемент в избранном
    if (!this.has(type, itemId)) {
      console.warn('[FavoritesService] Cannot set hotkey for non-favorite item')
      return
    }
    
    // Защита от undefined
    if (!this.state.hotkeys || !Array.isArray(this.state.hotkeys)) {
      console.warn('[FavoritesService] hotkeys is not an array in setHotkey, initializing')
      this.state.hotkeys = []
    }
    
    // Удаляем предыдущую привязку этого элемента (если есть)
    const filtered = this.state.hotkeys.filter(
      h => !(h.type === type && h.itemId === itemId)
    )
    
    // Удаляем привязку этой клавиши к другим элементам (одна клавиша = один элемент)
    const withoutDuplicateKeys = filtered.filter(h => {
      const sameKey = h.key === key
      const sameModifiers = JSON.stringify(h.modifiers || {}) === JSON.stringify(modifiers || {})
      return !(sameKey && sameModifiers)
    })
    
    // Добавляем новую привязку
    const newBinding: HotkeyBinding = {
      type,
      itemId,
      key,
      modifiers
    }
    
    this.state = {
      ...this.state,
      hotkeys: [...withoutDuplicateKeys, newBinding]
    }
    
    await this.saveAndSync()
  }

  /**
   * Удалить HotKey для элемента
   */
  async removeHotkey(type: FavoriteType, itemId: string): Promise<void> {
    if (!this.initialized) await this.init()
    
    console.log(`[FavoritesService] Removing hotkey for ${type}:${itemId}`)
    
    // Защита от undefined
    if (!this.state.hotkeys || !Array.isArray(this.state.hotkeys)) {
      console.warn('[FavoritesService] hotkeys is not an array in removeHotkey')
      this.state.hotkeys = []
      return
    }
    
    this.state = {
      ...this.state,
      hotkeys: this.state.hotkeys.filter(
        h => !(h.type === type && h.itemId === itemId)
      )
    }
    
    await this.saveAndSync()
  }

  /**
   * Получить HotKey для элемента
   */
  getHotkey(type: FavoriteType, itemId: string): HotkeyBinding | null {
    // Защита от undefined
    if (!this.state.hotkeys || !Array.isArray(this.state.hotkeys)) {
      console.warn('[FavoritesService] hotkeys is not an array in getHotkey')
      this.state.hotkeys = []
      return null
    }
    
    const binding = this.state.hotkeys.find(
      h => h.type === type && h.itemId === itemId
    )
    return binding || null
  }

  /**
   * Получить все HotKey привязки
   */
  getAllHotkeys(): HotkeyBinding[] {
    // Защита от undefined
    if (!this.state.hotkeys || !Array.isArray(this.state.hotkeys)) {
      console.warn('[FavoritesService] hotkeys is not an array, returning empty array')
      this.state.hotkeys = []
    }
    return [...this.state.hotkeys]
  }

  /**
   * Найти привязку по нажатой клавише
   */
  findByHotkey(key: string, modifiers?: HotkeyBinding['modifiers']): HotkeyBinding | null {
    // Защита от undefined
    if (!this.state.hotkeys || !Array.isArray(this.state.hotkeys)) {
      console.warn('[FavoritesService] hotkeys is not an array in findByHotkey')
      this.state.hotkeys = []
      return null
    }
    
    const normalized = {
      ctrl: modifiers?.ctrl || false,
      alt: modifiers?.alt || false,
      shift: modifiers?.shift || false
    }
    
    const binding = this.state.hotkeys.find(h => {
      if (h.key !== key) return false
      
      const hModifiers = {
        ctrl: h.modifiers?.ctrl || false,
        alt: h.modifiers?.alt || false,
        shift: h.modifiers?.shift || false
      }
      
      return (
        hModifiers.ctrl === normalized.ctrl &&
        hModifiers.alt === normalized.alt &&
        hModifiers.shift === normalized.shift
      )
    })
    
    return binding || null
  }

  // ========================================================================
  // Синхронизация
  // ========================================================================

  /**
   * Синхронизация (общая)
   */
  async sync(): Promise<void> {
    await this.saveToStorage()
    await this.syncWithAltV()
  }

  /**
   * Синхронизация с Alt:V
   */
  async syncWithAltV(): Promise<void> {
    if (typeof window === 'undefined' || !('alt' in window)) return
    
    console.log('[FavoritesService] Syncing with Alt:V...')
    
    try {
      const alt = (window as any).alt
      
      // Защита от undefined для всех полей
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
      
      // Отправляем разные типы избранного на соответствующие каналы Alt:V
      // Погода, время, скорость времени, teleportMarkers
      alt.emit('world:favorites:save', { 
        favorites: {
          weather: safeState.weather,
          time: safeState.time,
          timeSpeed: safeState.timeSpeed,
          teleportMarkers: safeState.teleportMarkers
        }
      })
      
      // Автомобили
      alt.emit('favorites:vehicles:save', { vehicles: safeState.vehicles })
      
      // Действия с автомобилем
      alt.emit('favorites:vehicle-actions:save', { actions: safeState.vehicleActions })
      
      // Действия с оружием
      alt.emit('favorites:weapon-actions:save', { actions: safeState.weaponActions })
      
      // HotKeys
      alt.emit('favorites:hotkeys:save', { hotkeys: safeState.hotkeys })
      
      console.log('[FavoritesService] Synced with Alt:V')
    } catch (error) {
      console.error('[FavoritesService] Error syncing with Alt:V:', error)
    }
  }

  /**
   * Подписаться на изменения
   */
  subscribe(callback: (state: FavoritesState) => void): () => void {
    this.subscribers.add(callback)
    
    // Сразу вызываем callback с текущим состоянием
    callback(this.state)
    
    // Возвращаем функцию отписки
    return () => {
      this.subscribers.delete(callback)
    }
  }

  // ========================================================================
  // Приватные методы
  // ========================================================================

  /**
   * Загрузка из Alt:V LocalStorage (приоритетное, персистентное хранилище)
   */
  private async loadFromAltV(): Promise<FavoritesState | null> {
    if (typeof window === 'undefined' || !('alt' in window)) {
      console.log('[FavoritesService] Alt:V not available, skipping Alt:V load')
      return null
    }
    
    console.log('[FavoritesService] 🔄 Requesting favorites from Alt:V LocalStorage...')
    
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.log('[FavoritesService] ⏱️ Alt:V load timeout, using fallback')
        resolve(null)
      }, 2000) // 2 секунды таймаут
      
      // Обработчик ответа от Alt:V
      const handleResponse = (data: { favorites: FavoritesState | null }) => {
        clearTimeout(timeout)
        ;(window as any).alt.off('favorites:load:response', handleResponse)
        
        if (data.favorites) {
          console.log('[FavoritesService] ✅ Received favorites from Alt:V:', data.favorites)
          resolve(data.favorites)
        } else {
          console.log('[FavoritesService] No favorites in Alt:V LocalStorage')
          resolve(null)
        }
      }
      
      // Регистрируем обработчик и запрашиваем данные
      ;(window as any).alt.on('favorites:load:response', handleResponse)
      ;(window as any).alt.emit('favorites:load:request')
    })
  }

  /**
   * Загрузка из localStorage (fallback, не персистентный)
   */
  private async loadFromStorage(): Promise<FavoritesState | null> {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return null
      
      const parsed: FavoritesStorageData = JSON.parse(stored)
      
      // Проверяем версию
      if (parsed.version !== STORAGE_VERSION) {
        console.warn(`[FavoritesService] Storage version mismatch: ${parsed.version} vs ${STORAGE_VERSION}`)
        return null
      }
      
      // КРИТИЧНО: Убеждаемся что все поля существуют (merge с INITIAL_STATE)
      const data = {
        ...INITIAL_STATE,
        ...parsed.data,
        // Гарантируем что массивы существуют
        hotkeys: parsed.data.hotkeys || [],
        weather: parsed.data.weather || [],
        time: parsed.data.time || [],
        timeSpeed: parsed.data.timeSpeed || [],
        vehicles: parsed.data.vehicles || [],
        vehicleActions: parsed.data.vehicleActions || [],
        weaponActions: parsed.data.weaponActions || [],
        locations: parsed.data.locations || [],
        teleportMarkers: parsed.data.teleportMarkers || []
      }
      
      return data
    } catch (error) {
      console.error('[FavoritesService] Error loading from storage:', error)
      return null
    }
  }

  /**
   * Сохранение в localStorage (быстрый доступ) и Alt:V LocalStorage (персистентность)
   */
  private async saveToStorage(): Promise<void> {
    try {
      const data: FavoritesStorageData = {
        version: STORAGE_VERSION,
        data: this.state,
        lastUpdated: Date.now()
      }
      
      // 1. Сохраняем в браузерный localStorage для быстрого доступа
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      console.log('[FavoritesService] 💾 Saved to browser localStorage')
      
      // 2. КРИТИЧНО: Сохраняем в Alt:V LocalStorage для персистентности
      if (typeof window !== 'undefined' && 'alt' in window) {
        ;(window as any).alt.emit('favorites:save:request', { favorites: this.state })
        console.log('[FavoritesService] 💾 Sent to Alt:V LocalStorage for persistence')
      }
    } catch (error) {
      console.error('[FavoritesService] Error saving to storage:', error)
    }
  }

  /**
   * Сохранение и синхронизация с debounce
   */
  private async saveAndSync(): Promise<void> {
    // Сохраняем сразу
    await this.saveToStorage()
    
    // Уведомляем подписчиков
    this.notifySubscribers()
    
    // Синхронизация с Alt:V с debounce
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout)
    }
    
    this.syncTimeout = setTimeout(() => {
      this.syncWithAltV()
    }, SYNC_DEBOUNCE_MS)
  }

  /**
   * Уведомить всех подписчиков об изменениях
   */
  private notifySubscribers(): void {
    const stateCopy = { ...this.state }
    this.subscribers.forEach(callback => {
      try {
        callback(stateCopy)
      } catch (error) {
        console.error('[FavoritesService] Error in subscriber callback:', error)
      }
    })
    
    // Также отправляем custom event для глобальной синхронизации
    window.dispatchEvent(new CustomEvent('favorites:updated', {
      detail: { state: stateCopy }
    }))
  }

  /**
   * Миграция старых данных
   */
  private async migrateLegacyData(): Promise<FavoritesState | null> {
    console.log('[FavoritesService] Starting legacy data migration...')
    
    const migrated: FavoritesState = { ...INITIAL_STATE }
    let hasMigratedData = false
    
    try {
      // Миграция world favorites (погода, время, скорость, teleportMarkers)
      const worldFavs = localStorage.getItem('meshhub_world_favorites')
      if (worldFavs) {
        const parsed = JSON.parse(worldFavs)
        migrated.weather = parsed.weather || []
        migrated.time = parsed.time || []
        migrated.timeSpeed = parsed.timeSpeed || []
        migrated.teleportMarkers = parsed.teleportMarkers || []
        hasMigratedData = true
        console.log('[FavoritesService] Migrated world favorites')
      }
      
      // Миграция vehicle actions
      const vehicleActions = localStorage.getItem('vehicle_actions_favorites')
      if (vehicleActions) {
        migrated.vehicleActions = JSON.parse(vehicleActions)
        hasMigratedData = true
        console.log('[FavoritesService] Migrated vehicle actions')
      }
      
      // Миграция weapon actions
      const weaponActions = localStorage.getItem('weapon_actions_favorites')
      if (weaponActions) {
        migrated.weaponActions = JSON.parse(weaponActions)
        hasMigratedData = true
        console.log('[FavoritesService] Migrated weapon actions')
      }
      
      // Миграция interior locations
      const interiorLocs = localStorage.getItem('interior_favorite_locations')
      if (interiorLocs) {
        migrated.locations = JSON.parse(interiorLocs)
        hasMigratedData = true
        console.log('[FavoritesService] Migrated interior locations')
      }
      
      // Миграция vehicle favorites (запросим из Alt:V если доступен)
      // Это асинхронно, но для начальной миграции можем пропустить
      
    } catch (error) {
      console.error('[FavoritesService] Error during migration:', error)
      return null
    }
    
    return hasMigratedData ? migrated : null
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Глобальный экземпляр сервиса избранного
 */
export const favoritesService = new FavoritesStorage()

// ============================================================================
// Удобные хелперы
// ============================================================================

/**
 * Получить избранное по типу
 */
export async function getFavorites<T>(type: FavoriteType): Promise<T[]> {
  return favoritesService.get<T>(type)
}

/**
 * Добавить в избранное
 */
export async function addFavorite<T>(type: FavoriteType, item: T): Promise<void> {
  return favoritesService.add(type, item)
}

/**
 * Удалить из избранного
 */
export async function removeFavorite(type: FavoriteType, id: string): Promise<void> {
  return favoritesService.remove(type, id)
}

/**
 * Переключить избранное
 */
export async function toggleFavorite<T>(type: FavoriteType, item: T): Promise<boolean> {
  return favoritesService.toggle(type, item)
}

/**
 * Проверить наличие в избранном
 */
export function isFavorite(type: FavoriteType, id: string): boolean {
  return favoritesService.has(type, id)
}

/**
 * Подписаться на изменения избранного
 */
export function subscribeFavorites(callback: (state: FavoritesState) => void): () => void {
  return favoritesService.subscribe(callback)
}

// Автоматическая инициализация при импорте модуля
if (typeof window !== 'undefined') {
  favoritesService.init().catch(err => {
    console.error('[FavoritesService] Failed to initialize:', err)
  })
}

console.log('[FavoritesService] Service module loaded')

