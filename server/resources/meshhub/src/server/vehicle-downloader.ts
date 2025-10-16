// Менеджер для скачивания автомобилей с backend
import * as alt from 'alt-server'
import axios from 'axios'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const BACKEND_URL = 'https://hub.feeld.space'
const VEHICLES_DIR = path.resolve(__dirname, '../../../../../../[vehicles]')

/**
 * Скачивает автомобиль с backend и сохраняет в resources/[vehicles]/
 */
export async function downloadVehicle(
  vehicleId: string,
  vehicleName: string,
  token: string
): Promise<{ success: boolean; message: string; path?: string }> {
  alt.log(`[VehicleDownloader] Starting download: ${vehicleName} (ID: ${vehicleId})`)

  try {
    // Создаём папку [vehicles] если её нет
    if (!fs.existsSync(VEHICLES_DIR)) {
      fs.mkdirSync(VEHICLES_DIR, { recursive: true })
      alt.log(`[VehicleDownloader] Created directory: ${VEHICLES_DIR}`)
    }

    // Папка для конкретного автомобиля
    const vehicleDir = path.join(VEHICLES_DIR, vehicleName)
    if (!fs.existsSync(vehicleDir)) {
      fs.mkdirSync(vehicleDir, { recursive: true })
      alt.log(`[VehicleDownloader] Created vehicle directory: ${vehicleDir}`)
    }

    // Папка stream для RPF файла
    const streamDir = path.join(vehicleDir, 'stream')
    if (!fs.existsSync(streamDir)) {
      fs.mkdirSync(streamDir, { recursive: true })
      alt.log(`[VehicleDownloader] Created stream directory: ${streamDir}`)
    }

    // Скачиваем файл с backend
    alt.log(`[VehicleDownloader] Downloading from: ${BACKEND_URL}/api/rpf/archives/${vehicleId}/download`)
    
    const response = await axios.get(`${BACKEND_URL}/api/rpf/archives/${vehicleId}/download`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      responseType: 'arraybuffer',
      timeout: 300000, // 5 минут таймаут
    })

    // Сохраняем файл
    const rpfPath = path.join(streamDir, `${vehicleName}.rpf`)
    fs.writeFileSync(rpfPath, response.data)
    alt.log(`[VehicleDownloader] Saved RPF file: ${rpfPath}`)

    // Создаём resource.toml
    const resourceToml = `type = 'dlc'
client-files = ['stream/*']

[[meta]]
type = 'dlcdata'
path = 'data/dlclist.xml'
`
    const tomlPath = path.join(vehicleDir, 'resource.toml')
    fs.writeFileSync(tomlPath, resourceToml)
    alt.log(`[VehicleDownloader] Created resource.toml: ${tomlPath}`)

    // Создаём data/dlclist.xml
    const dataDir = path.join(vehicleDir, 'data')
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }

    const dlclistXml = `<?xml version="1.0" encoding="UTF-8"?>
<SMandatoryPacksData>
    <Name />
    <Item>dlcpacks:/${vehicleName}/</Item>
</SMandatoryPacksData>
`
    const xmlPath = path.join(dataDir, 'dlclist.xml')
    fs.writeFileSync(xmlPath, dlclistXml)
    alt.log(`[VehicleDownloader] Created dlclist.xml: ${xmlPath}`)

    alt.log(`[VehicleDownloader] ✅ Vehicle ${vehicleName} downloaded successfully`)
    alt.log(`[VehicleDownloader] 📁 Location: ${vehicleDir}`)
    alt.log(`[VehicleDownloader] ⚠️ Server restart required to load the resource`)

    return {
      success: true,
      message: `Автомобиль ${vehicleName} скачан. Требуется перезапуск сервера.`,
      path: vehicleDir,
    }
  } catch (error: any) {
    alt.logError(`[VehicleDownloader] ❌ Failed to download ${vehicleName}: ${error.message}`)
    
    if (error.response) {
      alt.logError(`[VehicleDownloader] HTTP Status: ${error.response.status}`)
      alt.logError(`[VehicleDownloader] Response: ${JSON.stringify(error.response.data)}`)
    }

    return {
      success: false,
      message: `Ошибка скачивания: ${error.message}`,
    }
  }
}

/**
 * Проверяет наличие автомобиля в resources/[vehicles]/
 */
export function checkVehicleExists(vehicleName: string): boolean {
  const vehicleDir = path.join(VEHICLES_DIR, vehicleName)
  const rpfPath = path.join(vehicleDir, 'stream', `${vehicleName}.rpf`)
  
  const exists = fs.existsSync(rpfPath)
  alt.log(`[VehicleDownloader] Check ${vehicleName}: ${exists ? 'EXISTS' : 'NOT FOUND'}`)
  
  return exists
}

/**
 * Удаляет автомобиль из resources/[vehicles]/
 */
export function deleteVehicle(vehicleName: string): boolean {
  try {
    const vehicleDir = path.join(VEHICLES_DIR, vehicleName)
    
    if (fs.existsSync(vehicleDir)) {
      fs.rmSync(vehicleDir, { recursive: true, force: true })
      alt.log(`[VehicleDownloader] ✅ Vehicle ${vehicleName} deleted`)
      return true
    } else {
      alt.log(`[VehicleDownloader] Vehicle ${vehicleName} not found`)
      return false
    }
  } catch (error: any) {
    alt.logError(`[VehicleDownloader] ❌ Failed to delete ${vehicleName}: ${error.message}`)
    return false
  }
}

