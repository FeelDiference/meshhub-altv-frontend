// Основной server скрипт для MeshHub ALT:V Integration

import * as alt from 'alt-server'
import { CommandManager } from './command-manager'
import { VehicleManager } from './vehicle-manager'
import { InteriorManager } from './interior-manager'
import { downloadVehicle, checkVehicleExists } from './vehicle-downloader'

/**
 * Отправка сообщения в чат игроку
 */
function sendChatMessage(player: alt.Player, message: string) {
  alt.emitClient(player, 'chat:message', null, message)
}

/**
 * Инициализация ресурса на сервере
 */
alt.on('resourceStart', () => {
  alt.log('[MeshHub] Server starting...')
  
  // Инициализируем менеджеры
  CommandManager.initialize()
  VehicleManager.initialize()
  InteriorManager.initialize()
  
  alt.log('[MeshHub] ✅ Server initialization complete')
  alt.log('[MeshHub] Version: 1.0.0')
  alt.log('[MeshHub] Commands: /meshhub')
  alt.log('[MeshHub] Controls: F10 - toggle panel, ESC - close panel')
})

/**
 * Обработка подключения игрока
 */
alt.on('playerConnect', (player: alt.Player) => {
  alt.log(`[MeshHub] Player connected: ${player.name} (ID: ${player.id})`)
  
  // Приветственное сообщение
  sendChatMessage(player, '[MeshHub] 🚀 MeshHub ALT:V Integration loaded')
  sendChatMessage(player, '[MeshHub] Press F10 to open vehicle management panel')
  sendChatMessage(player, '[MeshHub] Use /meshhub command for help')
})

/**
 * Обработка отключения игрока
 */
alt.on('playerDisconnect', (player: alt.Player) => {
  alt.log(`[MeshHub] Player disconnected: ${player.name} (ID: ${player.id})`)
  
  // Очищаем данные игрока
  VehicleManager.cleanupPlayerVehicles(player)
})

/**
 * Обработка скачивания автомобиля
 */
alt.onClient('meshhub:vehicle:download', async (player: alt.Player, data: { vehicleId: string; vehicleName: string; token: string }) => {
  alt.log(`[MeshHub] Download request from ${player.name}: ${data.vehicleName}`)
  
  try {
    sendChatMessage(player, `[MeshHub] 📥 Скачивание ${data.vehicleName}...`)
    
    const result = await downloadVehicle(data.vehicleId, data.vehicleName, data.token)
    
    if (result.success) {
      sendChatMessage(player, `[MeshHub] ✅ ${result.message}`)
      alt.emitClient(player, 'meshhub:vehicle:downloaded', {
        success: true,
        vehicleId: data.vehicleId,
        vehicleName: data.vehicleName,
        message: result.message,
      })
    } else {
      sendChatMessage(player, `[MeshHub] ❌ ${result.message}`)
      alt.emitClient(player, 'meshhub:vehicle:downloaded', {
        success: false,
        vehicleId: data.vehicleId,
        vehicleName: data.vehicleName,
        message: result.message,
      })
    }
  } catch (error: any) {
    alt.logError(`[MeshHub] Download error: ${error.message}`)
    sendChatMessage(player, `[MeshHub] ❌ Ошибка скачивания: ${error.message}`)
    alt.emitClient(player, 'meshhub:vehicle:downloaded', {
      success: false,
      vehicleId: data.vehicleId,
      vehicleName: data.vehicleName,
      message: error.message,
    })
  }
})

/**
 * Обработка выдачи оружия
 */
alt.onClient('meshhub:weapon:give', (player: alt.Player, weaponName: string, weaponHash: string | number) => {
  alt.log(`[MeshHub] Weapon give request from ${player.name}: ${weaponName}`)
  
  try {
    // Convert hash to number if string
    let hash: number
    if (typeof weaponHash === 'string') {
      // Try to parse as hash name (e.g., "WEAPON_PISTOL")
      hash = alt.hash(weaponHash)
    } else {
      hash = weaponHash
    }
    
    // Convert negative hash to unsigned 32-bit integer if needed
    if (hash < 0) {
      hash = hash >>> 0
    }
    
    alt.log(`[MeshHub] Giving weapon ${weaponName} (hash: ${hash}) to player ${player.name}`)
    
    // Give weapon with ammo
    player.giveWeapon(hash, 250, true)
    
    sendChatMessage(player, `[MeshHub] ✅ Выдано оружие: ${weaponName}`)
    
  } catch (error: any) {
    alt.logError(`[MeshHub] Error giving weapon: ${error.message}`)
    sendChatMessage(player, `[MeshHub] ❌ Ошибка выдачи оружия: ${error.message}`)
  }
})

/**
 * Обработка остановки ресурса
 */
alt.on('resourceStop', () => {
  alt.log('[MeshHub] Server stopping...')
  
  // Уведомляем всех игроков
  alt.Player.all.forEach((player: alt.Player) => {
    if (player.valid) {
      sendChatMessage(player, '[MeshHub] ⚠️ MeshHub resource is restarting...')
      // Закрываем панель у всех игроков
      alt.emitClient(player, 'meshhub:close')
    }
  })
  
  // Очищаем все данные
  VehicleManager.cleanup()
  InteriorManager.cleanup()
  
  alt.log('[MeshHub] ✅ Server stopped')
})

/**
 * Обработка ошибок
 */
alt.on('error', (error: Error) => {
  alt.logError(`[MeshHub] Server error: ${error.message}`)
  alt.logError(error.stack || 'No stack trace available')
})

// Логируем информацию о загрузке
alt.log('[MeshHub] 🚀 Server script loaded')
alt.log('[MeshHub] Ready to initialize on resource start')
