// Типы для мира и телепортации

export interface Vec3 {
  x: number
  y: number
  z: number
}

export interface TeleportMarker {
  id: string
  name: string
  position: Vec3
  createdAt: string
}

export interface WorldFavorites {
  weather: string[]
  time: string[]
  timeSpeed: number[]
  teleportMarkers: string[] // IDs of favorite markers
}

