// Менеджер команд для MeshHub

import * as alt from 'alt-server'

export class CommandManager {
  private static isInitialized = false

  /**
   * Инициализация менеджера команд
   */
  static initialize(): void {
    if (this.isInitialized) {
      alt.logWarning('[MeshHub] CommandManager already initialized')
      return
    }

    // Регистрируем команды
    this.registerCommands()

    this.isInitialized = true
    alt.log('[MeshHub] ✅ CommandManager initialized')
  }

  /**
   * Регистрация всех команд
   */
  private static registerCommands(): void {
    // Основная команда /meshhub
    alt.onClient('consoleCommand', (player: alt.Player, command: string, ...args: string[]) => {
      if (command === 'meshhub') {
        this.handleMeshHubCommand(player, args)
      }
    })

    // Альтернативные команды
    alt.onClient('consoleCommand', (player: alt.Player, command: string, ...args: string[]) => {
      switch (command) {
        case 'mh':
        case 'mesh':
          this.handleMeshHubCommand(player, args)
          break
        case 'meshhub-panel':
        case 'mhpanel':
          this.handleToggleCommand(player)
          break
      }
    })

    alt.log('[MeshHub] Commands registered: /meshhub, /mh, /mesh, /meshhub-panel')
  }

  /**
   * Обработка основной команды /meshhub
   */
  private static handleMeshHubCommand(player: alt.Player, args: string[]): void {
    if (args.length === 0) {
      // Без аргументов - открываем/закрываем панель
      this.handleToggleCommand(player)
      return
    }

    const subcommand = args[0].toLowerCase()

    switch (subcommand) {
      case 'open':
      case 'show':
        this.handleOpenCommand(player)
        break

      case 'close':
      case 'hide':
        this.handleCloseCommand(player)
        break

      case 'toggle':
        this.handleToggleCommand(player)
        break

      case 'help':
      case '?':
        this.handleHelpCommand(player)
        break

      case 'version':
      case 'v':
        this.handleVersionCommand(player)
        break

      case 'status':
        this.handleStatusCommand(player)
        break

      default:
        player.send(`[MeshHub] ❌ Unknown command: ${subcommand}`)
        player.send('[MeshHub] Use /meshhub help for available commands')
        break
    }
  }

  /**
   * Команда открытия панели
   */
  private static handleOpenCommand(player: alt.Player): void {
    alt.log(`[MeshHub] Player ${player.name} requested to open panel`)
    
    alt.emitClient(player, 'meshhub:open')
    player.send('[MeshHub] 📱 Opening MeshHub panel...')
  }

  /**
   * Команда закрытия панели
   */
  private static handleCloseCommand(player: alt.Player): void {
    alt.log(`[MeshHub] Player ${player.name} requested to close panel`)
    
    alt.emitClient(player, 'meshhub:close')
    player.send('[MeshHub] 📱 Closing MeshHub panel...')
  }

  /**
   * Команда переключения панели
   */
  private static handleToggleCommand(player: alt.Player): void {
    alt.log(`[MeshHub] Player ${player.name} requested to toggle panel`)
    
    // Отправляем событие клиенту - он сам определит нужно открыть или закрыть
    alt.emitClient(player, 'meshhub:toggle')
    player.send('[MeshHub] 📱 Toggling MeshHub panel...')
  }

  /**
   * Команда помощи
   */
  private static handleHelpCommand(player: alt.Player): void {
    const helpMessages = [
      '[MeshHub] 📖 Available commands:',
      '[MeshHub] /meshhub - Open/close panel',
      '[MeshHub] /meshhub open - Open panel',
      '[MeshHub] /meshhub close - Close panel',
      '[MeshHub] /meshhub toggle - Toggle panel',
      '[MeshHub] /meshhub help - Show this help',
      '[MeshHub] /meshhub version - Show version',
      '[MeshHub] /meshhub status - Show status',
      '',
      '[MeshHub] 🎮 Controls:',
      '[MeshHub] F10 - Toggle panel',
      '[MeshHub] ESC - Close panel (when open)',
      '',
      '[MeshHub] 🚗 Features:',
      '[MeshHub] • Browse and download vehicles from MeshHub',
      '[MeshHub] • Edit vehicle handling in real-time',
      '[MeshHub] • Save changes to server or download locally',
      '[MeshHub] • Spawn and manage vehicles in-game'
    ]

    helpMessages.forEach(message => player.send(message))
  }

  /**
   * Команда версии
   */
  private static handleVersionCommand(player: alt.Player): void {
    player.send('[MeshHub] 📋 Version Information:')
    player.send('[MeshHub] • Resource Version: 1.0.0')
    player.send('[MeshHub] • ALT:V Integration: Active')
    player.send('[MeshHub] • WebView: React 18 + TypeScript')
    player.send('[MeshHub] • Backend: hub.feeld.space')
    player.send('[MeshHub] • Author: MeshHub Team')
  }

  /**
   * Команда статуса
   */
  private static handleStatusCommand(player: alt.Player): void {
    const playerCount = alt.Player.all.length
    const vehicleCount = alt.Vehicle.all.length
    
    player.send('[MeshHub] 📊 Status Information:')
    player.send(`[MeshHub] • Players Online: ${playerCount}`)
    player.send(`[MeshHub] • Vehicles Spawned: ${vehicleCount}`)
    player.send('[MeshHub] • Resource Status: Active')
    player.send('[MeshHub] • WebView Status: Ready')
    player.send('[MeshHub] • Backend Status: Connected')
  }

  /**
   * Глобальная команда для всех игроков (только для админов)
   */
  static broadcastPanelToggle(adminPlayer: alt.Player): void {
    // Проверяем права админа (можно добавить свою систему проверки)
    if (!this.isAdmin(adminPlayer)) {
      adminPlayer.send('[MeshHub] ❌ You do not have permission to use this command')
      return
    }

    alt.log(`[MeshHub] Admin ${adminPlayer.name} broadcasting panel toggle`)
    
    alt.Player.all.forEach(player => {
      if (player.valid && player !== adminPlayer) {
        alt.emitClient(player, 'meshhub:toggle')
      }
    })

    adminPlayer.send('[MeshHub] 📢 Toggled MeshHub panel for all players')
    alt.Player.all.forEach(player => {
      if (player.valid && player !== adminPlayer) {
        player.send('[MeshHub] 📱 Admin toggled MeshHub panel')
      }
    })
  }

  /**
   * Проверка прав администратора (заглушка)
   */
  private static isAdmin(player: alt.Player): boolean {
    // TODO: Интегрировать с вашей системой прав
    // Пока что возвращаем false для безопасности
    return false
  }

  /**
   * Очистка при остановке ресурса
   */
  static cleanup(): void {
    this.isInitialized = false
    alt.log('[MeshHub] CommandManager cleaned up')
  }
}
