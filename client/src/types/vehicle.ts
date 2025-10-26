// Типы для автомобилей

import type { GTAVVehicle } from '@/data/gtav-vehicles-with-categories'

export interface Vec3 {
  x: number
  y: number
  z: number
}

export interface VehicleResource {
  id: string
  name: string
  displayName?: string
  modelName?: string
  category?: string
  tags?: string[]
  size: number
  metadata: VehicleMetadata | null
  createdAt: string
  updatedAt: string
}

export interface VehicleMetadata {
  modelName: string
  vehicleMakeName: string[]
  vehicleClass: string
  wheelType: string
  handling?: HandlingData
  tuning?: TuningData
  colors?: ColorVariationData
}

export interface HandlingData {
  handlingName: string
  
  // Вычисленные значения
  calculatedMaxSpeedKmh: number
  calculatedMaxSpeedMph: number
  
  // Физические параметры
  mass: number
  initialDragCoeff: number
  percentSubmerged: number
  centreOfMassOffset: Vec3
  inertiaMultiplier: Vec3
  
  // Трансмиссия
  driveBiasFront: number
  initialDriveGears: number
  initialDriveForce: number
  driveInertia: number
  clutchChangeRateUp: number
  clutchChangeRateDown: number
  initialDriveMaxFlatVel: number
  brakeForce: number
  brakeBiasFront: number
  handBrakeForce: number
  steeringLock: number
  
  // Тяга колес
  tractionCurveMax: number
  tractionCurveMin: number
  tractionCurveLateral: number
  tractionSpringDeltaMax: number
  lowSpeedTractionLoss: number
  camberStiffness: number
  tractionBiasFront: number
  tractionLossMult: number
  
  // Подвеска
  suspensionForce: number
  suspensionCompDamp: number
  suspensionReboundDamp: number
  suspensionUpperLimit: number
  suspensionLowerLimit: number
  suspensionRaise: number
  suspensionBiasFront: number
  antiRollBarForce: number
  antiRollBarBiasFront: number
  rollCentreHeightFront: number
  rollCentreHeightRear: number
  
  // Повреждения
  collisionDamageMult: number
  weaponDamageMult: number
  deformationDamageMult: number
  engineDamageMult: number
  petrolTankVolume: number
  oilVolume: number
  
  // Разное
  seatOffsetDist: Vec3
  monetaryValue: number
}

export interface TuningData {
  kitName: string
  engine?: ModificationLevel[]
  brakes?: ModificationLevel[]
  gearbox?: ModificationLevel[]
  armour?: ModificationLevel[]
  suspension?: ModificationLevel[]
  horns?: HornModification[]
  hasLightSettings: boolean
}

export interface ModificationLevel {
  level: number
  modifier: number
  weight: number
}

export interface HornModification {
  identifier: string
  modifier: number
}

export interface ColorVariationData {
  colorIndices: number[]
  liveries: boolean[]
  kits: string[]
}

export interface VehicleListResponse {
  success: boolean
  vehicles: VehicleResource[]
  total: number
}

export interface VehicleResponse {
  success: boolean
  vehicle: VehicleResource
}

export interface SaveHandlingRequest {
  handling: HandlingData
}

export interface SaveHandlingResponse {
  success: boolean
  message: string
  backup: BackupInfo
  updated: UpdatedInfo
}

export interface BackupInfo {
  id: string
  filename: string
  path: string
  size: number
  createdAt: string
}

export interface UpdatedInfo {
  archiveId: string
  path: string
  size: number
  hashMD5: string
  hashSHA256: string
  updatedAt: string
}

// Общий тип для всех машин (HUB + GTAV)
export type AnyVehicle = VehicleResource | (GTAVVehicle & { 
  id: string
  modelName: string
})
