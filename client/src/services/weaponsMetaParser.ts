// Parser for weapons.meta XML file

import { getAccessToken } from './auth'

export interface WeaponMetaData {
  name: string
  model: string
  slot: string
  damageType: string
  fireType: string
  group: string
  clipSize: number
  accuracySpread: number
  recoilAccuracyMax: number
  recoilErrorTime: number
  recoilRecoveryRate: number
  damage: number
  force: number
  forceHitPed: number
  forceHitVehicle: number
  speed: number
  bulletsInBatch: number
  timeBetweenShots: number
  timeLeftBetweenShotsWhereShouldFireIsCached: number
  spinUpTime: number
  spinTime: number
  reloadTimeMP: number
  reloadTimeSP: number
  vehicleReloadTime: number
  animReloadTime: number
  range: number
  damageModifierAI: number
  networkPlayerDamageModifier: number
  networkPedDamageModifier: number
}

export interface WeaponsMetaIndex {
  [weaponName: string]: WeaponMetaData
}

/**
 * Парсит weapons.meta и создает индекс по названиям оружия
 */
export function parseWeaponsMeta(xmlString: string): WeaponsMetaIndex {
  try {
    // Очищаем XML от потенциально проблемных символов
    const cleanedXml = xmlString
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Убираем управляющие символы
      .replace(/&(?![a-zA-Z0-9#]+;)/g, '&amp;') // Экранируем неэкранированные &
      .replace(/"/g, '&quot;') // Экранируем кавычки
      .replace(/'/g, '&apos;') // Экранируем апострофы
    
    const parser = new DOMParser()
    const doc = parser.parseFromString(cleanedXml, 'text/xml')
    
    const parserError = doc.querySelector('parsererror')
    if (parserError) {
      console.error('[WeaponsMetaParser] Parse error:', parserError.textContent)
      console.error('[WeaponsMetaParser] XML content (first 500 chars):', xmlString.substring(0, 500))
      throw new Error(`Failed to parse weapons.meta XML: ${parserError.textContent}`)
    }

    const index: WeaponsMetaIndex = {}
    const weaponItems = doc.querySelectorAll('Item[type="CWeaponInfo"]')
    
    console.log(`[WeaponsMetaParser] Found ${weaponItems.length} weapon items`)

    weaponItems.forEach((item, idx) => {
      try {
        const name = item.querySelector('Name')?.textContent?.trim()
        if (!name) {
          console.warn(`[WeaponsMetaParser] Weapon ${idx} has no name, skipping`)
          return
        }

        const getTextContent = (selector: string): string => {
          return item.querySelector(selector)?.textContent?.trim() || ''
        }

      const getNumericValue = (selector: string): number => {
        const element = item.querySelector(selector)
        const valueAttr = element?.getAttribute('value')
        if (valueAttr) {
          return parseFloat(valueAttr)
        }
        return 0
      }

      const weaponData: WeaponMetaData = {
        name,
        model: getTextContent('Model'),
        slot: getTextContent('Slot'),
        damageType: getTextContent('DamageType'),
        fireType: getTextContent('FireType'),
        group: getTextContent('Group'),
        clipSize: getNumericValue('ClipSize'),
        accuracySpread: getNumericValue('AccuracySpread'),
        recoilAccuracyMax: getNumericValue('RecoilAccuracyMax'),
        recoilErrorTime: getNumericValue('RecoilErrorTime'),
        recoilRecoveryRate: getNumericValue('RecoilRecoveryRate'),
        damage: getNumericValue('Damage'),
        force: getNumericValue('Force'),
        forceHitPed: getNumericValue('ForceHitPed'),
        forceHitVehicle: getNumericValue('ForceHitVehicle'),
        speed: getNumericValue('Speed'),
        bulletsInBatch: getNumericValue('BulletsInBatch'),
        timeBetweenShots: getNumericValue('TimeBetweenShots'),
        timeLeftBetweenShotsWhereShouldFireIsCached: getNumericValue('TimeLeftBetweenShotsWhereShouldFireIsCached'),
        spinUpTime: getNumericValue('SpinUpTime'),
        spinTime: getNumericValue('SpinTime'),
        reloadTimeMP: getNumericValue('ReloadTimeMP'),
        reloadTimeSP: getNumericValue('ReloadTimeSP'),
        vehicleReloadTime: getNumericValue('VehicleReloadTime'),
        animReloadTime: getNumericValue('AnimReloadTime'),
        range: getNumericValue('Range'),
        damageModifierAI: getNumericValue('DamageModifierAI'),
        networkPlayerDamageModifier: getNumericValue('NetworkPlayerDamageModifier'),
        networkPedDamageModifier: getNumericValue('NetworkPedDamageModifier')
      }

      index[name] = weaponData
      
      if (idx < 3) {
        console.log(`[WeaponsMetaParser] Parsed weapon ${idx}:`, {
          name: weaponData.name,
          damage: weaponData.damage,
          range: weaponData.range,
          clipSize: weaponData.clipSize
        })
      }
    } catch (error) {
      console.error(`[WeaponsMetaParser] Error parsing weapon ${idx}:`, error)
    }
  })

    console.log(`[WeaponsMetaParser] Successfully indexed ${Object.keys(index).length} weapons`)
    return index
  } catch (error) {
    console.error('[WeaponsMetaParser] Failed to parse weapons.meta:', error)
    // Возвращаем пустой индекс вместо выброса ошибки
    return {}
  }
}

/**
 * Извлекает XML блок для конкретного оружия
 */
export function extractWeaponXml(xmlString: string, weaponName: string): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlString, 'text/xml')
  
  const weaponItems = doc.querySelectorAll('Item[type="CWeaponInfo"]')
  
  for (const item of Array.from(weaponItems)) {
    const name = item.querySelector('Name')?.textContent?.trim()
    if (name === weaponName) {
      // Возвращаем XML этого Item
      const serializer = new XMLSerializer()
      return serializer.serializeToString(item)
    }
  }
  
  return ''
}

/**
 * Обновляет числовое значение в XML
 */
export function updateWeaponXmlValue(xmlString: string, tagName: string, newValue: number): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlString, 'text/xml')
  
  const element = doc.querySelector(tagName)
  if (element) {
    element.setAttribute('value', newValue.toFixed(6))
  }
  
  const serializer = new XMLSerializer()
  return serializer.serializeToString(doc)
}

/**
 * Загружает weapons.meta для конкретного оружия через Alt:V API
 * @param weaponName - Имя оружия (например: "weapon_pistol")
 */
export async function loadWeaponsMeta(weaponName: string): Promise<string> {
  try {
    console.log(`[WeaponsMetaParser] Requesting weapons.meta for: ${weaponName}`)
    
    // Загружаем через Alt:V API (серверный индекс)
    if (typeof window !== 'undefined' && 'alt' in window) {
      console.log(`[WeaponsMetaParser] Loading weapons.meta via Alt:V API for ${weaponName}...`)
      
      // Получаем токен авторизации для кастомных оружий
      const token = getAccessToken()
      if (token) {
        console.log(`[WeaponsMetaParser] ✅ Token found, sending with request`)
      } else {
        console.warn(`[WeaponsMetaParser] ⚠️ No token found - custom weapons.meta may not load`)
      }
      
      // Эмитим событие на сервер для загрузки weapons.meta конкретного оружия
      // Передаем объект с weaponName и token (как для интерьеров)
      ;(window as any).alt.emit('weapons:meta:request', {
        weaponName: weaponName,
        token: token
      })
      
      // Ждём ответ от сервера
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Timeout waiting for weapons.meta for ${weaponName} from server`))
        }, 5000)
        
        // Обработчик успешного ответа
        const responseHandler = (xmlData: string) => {
          clearTimeout(timeout)
          console.log(`[WeaponsMetaParser] Received weapons.meta for ${weaponName} (${xmlData.length} chars)`)
          
          // Отписываемся от событий
          ;(window as any).alt.off('weapons:meta:response', responseHandler)
          ;(window as any).alt.off('weapons:meta:error', errorHandler)
          
          resolve(xmlData)
        }
        
        // Обработчик ошибки
        const errorHandler = (errorMsg: string) => {
          clearTimeout(timeout)
          console.error(`[WeaponsMetaParser] Server error for ${weaponName}: ${errorMsg}`)
          
          // Отписываемся от событий
          ;(window as any).alt.off('weapons:meta:response', responseHandler)
          ;(window as any).alt.off('weapons:meta:error', errorHandler)
          
          reject(new Error(`Server error: ${errorMsg}`))
        }
        
        ;(window as any).alt.on('weapons:meta:response', responseHandler)
        ;(window as any).alt.on('weapons:meta:error', errorHandler)
      })
    }
    
    throw new Error('Alt:V API not available')
  } catch (error) {
    console.error(`[WeaponsMetaParser] Failed to load weapons.meta for ${weaponName}:`, error)
    throw error
  }
}

