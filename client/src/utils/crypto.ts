// Утилиты для шифрования сессий (AES-256)

import CryptoJS from 'crypto-js'

export class SessionCrypto {
  /**
   * Получить ключ шифрования на основе характеристик системы
   * В ALT:V можно использовать уникальные характеристики клиента
   */
  private static getEncryptionKey(): string {
    // В реальном ALT:V можно использовать hardware ID или другие уникальные характеристики
    // Для разработки используем комбинацию характеристик браузера
    const navigator = window.navigator
    const screen = window.screen
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width,
      screen.height,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
      // В ALT:V здесь можно добавить alt.getMacAddress() или подобное
    ].join('|')
    
    // Хешируем fingerprint для получения стабильного ключа
    return CryptoJS.SHA256(fingerprint).toString()
  }

  /**
   * Зашифровать данные
   */
  static encrypt(data: any): string {
    try {
      const key = this.getEncryptionKey()
      const jsonString = JSON.stringify(data)
      const encrypted = CryptoJS.AES.encrypt(jsonString, key)
      return encrypted.toString()
    } catch (error) {
      console.error('Encryption failed:', error)
      throw new Error('Failed to encrypt session data')
    }
  }

  /**
   * Расшифровать данные
   */
  static decrypt(encryptedData: string): any {
    try {
      const key = this.getEncryptionKey()
      const decrypted = CryptoJS.AES.decrypt(encryptedData, key)
      const jsonString = decrypted.toString(CryptoJS.enc.Utf8)
      
      if (!jsonString) {
        throw new Error('Invalid encrypted data')
      }
      
      return JSON.parse(jsonString)
    } catch (error) {
      console.error('Decryption failed:', error)
      return null
    }
  }

  /**
   * Проверить валидность зашифрованных данных
   */
  static isValidEncryptedData(encryptedData: string): boolean {
    try {
      const decrypted = this.decrypt(encryptedData)
      return decrypted !== null
    } catch {
      return false
    }
  }

  /**
   * Получить hash от данных для проверки целостности
   */
  static getDataHash(data: any): string {
    const jsonString = JSON.stringify(data)
    return CryptoJS.SHA256(jsonString).toString()
  }

  /**
   * Проверить целостность данных
   */
  static verifyDataIntegrity(data: any, expectedHash: string): boolean {
    const actualHash = this.getDataHash(data)
    return actualHash === expectedHash
  }
}
