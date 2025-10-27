/**
 * Мокап данные для интерьеров (YTYP/YMAP)
 * Используется для тестирования редакторов и EntityList компонента
 */

import type { YtypEntity, InteriorEntitySet } from '@/types/interior'

// ============================================================================
// YTYP XML Example (архетипы объектов интерьера)
// ============================================================================

export const MOCK_YTYP_XML = `<?xml version="1.0" encoding="UTF-8"?>
<CMapTypes>
  <extensions />
  <archetypes>
    <!-- Главное здание -->
    <Item type="CBaseArchetypeDef">
      <lodDist value="500.000000" />
      <flags value="32" />
      <specialAttribute value="0" />
      <bbMin x="-20.000000" y="-20.000000" z="-5.000000" />
      <bbMax x="20.000000" y="20.000000" z="15.000000" />
      <bsCentre x="0.000000" y="0.000000" z="5.000000" />
      <bsRadius value="35.000000" />
      <hdTextureDist value="100.000000" />
      <name>int_building_main</name>
      <textureDictionary>int_building_txd</textureDictionary>
      <clipDictionary />
      <drawableDictionary>int_building</drawableDictionary>
      <physicsDictionary />
      <assetType>ASSET_TYPE_DRAWABLE</assetType>
      <assetName>int_building_main</assetName>
      <extensions>
        <Item type="CEntityDefExtension">
          <archetypeName>int_building_main</archetypeName>
          <flags value="1572864" />
          <guid value="0" />
          <offsetPosition x="0.000000" y="0.000000" z="0.000000" />
          <offsetRotation x="0.000000" y="0.000000" z="0.000000" w="1.000000" />
          <scaleXY value="1.000000" />
          <scaleZ value="1.000000" />
          <parentIndex value="-1" />
          <lodDist value="500.000000" />
          <childLodDist value="500.000000" />
          <numChildren value="0" />
          <priorityLevel>PRI_REQUIRED</priorityLevel>
          <ambientOcclusionMultiplier value="255" />
          <artificialAmbientOcclusion value="255" />
        </Item>
      </extensions>
    </Item>
    
    <!-- Мебель 1 -->
    <Item type="CBaseArchetypeDef">
      <lodDist value="50.000000" />
      <flags value="32" />
      <specialAttribute value="0" />
      <bbMin x="-1.000000" y="-1.000000" z="0.000000" />
      <bbMax x="1.000000" y="1.000000" z="2.000000" />
      <bsCentre x="0.000000" y="0.000000" z="1.000000" />
      <bsRadius value="2.000000" />
      <hdTextureDist value="25.000000" />
      <name>prop_furniture_table_01</name>
      <textureDictionary>int_props_txd</textureDictionary>
      <clipDictionary />
      <drawableDictionary>int_props</drawableDictionary>
      <physicsDictionary>int_props_physics</physicsDictionary>
      <assetType>ASSET_TYPE_DRAWABLE</assetType>
      <assetName>prop_furniture_table_01</assetName>
    </Item>
    
    <!-- Мебель 2 -->
    <Item type="CBaseArchetypeDef">
      <lodDist value="50.000000" />
      <flags value="32" />
      <specialAttribute value="0" />
      <bbMin x="-0.500000" y="-0.500000" z="0.000000" />
      <bbMax x="0.500000" y="0.500000" z="1.000000" />
      <bsCentre x="0.000000" y="0.000000" z="0.500000" />
      <bsRadius value="1.000000" />
      <hdTextureDist value="25.000000" />
      <name>prop_furniture_chair_01</name>
      <textureDictionary>int_props_txd</textureDictionary>
      <clipDictionary />
      <drawableDictionary>int_props</drawableDictionary>
      <physicsDictionary>int_props_physics</physicsDictionary>
      <assetType>ASSET_TYPE_DRAWABLE</assetType>
      <assetName>prop_furniture_chair_01</assetName>
    </Item>
    
    <!-- Освещение -->
    <Item type="CBaseArchetypeDef">
      <lodDist value="100.000000" />
      <flags value="32" />
      <specialAttribute value="0" />
      <bbMin x="-0.200000" y="-0.200000" z="0.000000" />
      <bbMax x="0.200000" y="0.200000" z="0.500000" />
      <bsCentre x="0.000000" y="0.000000" z="0.250000" />
      <bsRadius value="0.300000" />
      <hdTextureDist value="50.000000" />
      <name>prop_ceiling_light_01</name>
      <textureDictionary>int_props_txd</textureDictionary>
      <clipDictionary />
      <drawableDictionary>int_props</drawableDictionary>
      <physicsDictionary />
      <assetType>ASSET_TYPE_DRAWABLE</assetType>
      <assetName>prop_ceiling_light_01</assetName>
    </Item>
  </archetypes>
  <name>int_example</name>
  <dependencies />
</CMapTypes>`

// ============================================================================
// YMAP XML Example (размещение объектов в мире)
// ============================================================================

export const MOCK_YMAP_XML = `<?xml version="1.0" encoding="UTF-8"?>
<CMapData>
  <name>int_example_placement</name>
  <parent />
  <flags value="0" />
  <contentFlags value="65" />
  <streamingExtentsMin x="-200.000000" y="-200.000000" z="-50.000000" />
  <streamingExtentsMax x="200.000000" y="200.000000" z="100.000000" />
  <entitiesExtentsMin x="-200.000000" y="-200.000000" z="-50.000000" />
  <entitiesExtentsMax x="200.000000" y="200.000000" z="100.000000" />
  <entities>
    <!-- Главное здание -->
    <Item type="CEntityDef">
      <archetypeName>int_building_main</archetypeName>
      <flags value="1572864" />
      <guid value="1234567890" />
      <position x="100.000000" y="200.000000" z="50.000000" />
      <rotation x="0.000000" y="0.000000" z="0.000000" w="1.000000" />
      <scaleXY value="1.000000" />
      <scaleZ value="1.000000" />
      <parentIndex value="-1" />
      <lodDist value="500.000000" />
      <childLodDist value="500.000000" />
      <lodLevel>LODTYPES_DEPTH_HD</lodLevel>
      <numChildren value="0" />
      <priorityLevel>PRI_REQUIRED</priorityLevel>
      <extensions />
      <ambientOcclusionMultiplier value="255" />
      <artificialAmbientOcclusion value="255" />
    </Item>
    
    <!-- Стол -->
    <Item type="CEntityDef">
      <archetypeName>prop_furniture_table_01</archetypeName>
      <flags value="32" />
      <guid value="1234567891" />
      <position x="105.000000" y="205.000000" z="51.000000" />
      <rotation x="0.000000" y="0.000000" z="0.000000" w="1.000000" />
      <scaleXY value="1.000000" />
      <scaleZ value="1.000000" />
      <parentIndex value="-1" />
      <lodDist value="50.000000" />
      <childLodDist value="50.000000" />
      <lodLevel>LODTYPES_DEPTH_HD</lodLevel>
      <numChildren value="0" />
      <priorityLevel>PRI_REQUIRED</priorityLevel>
      <extensions />
      <ambientOcclusionMultiplier value="255" />
      <artificialAmbientOcclusion value="255" />
    </Item>
    
    <!-- Стулья -->
    <Item type="CEntityDef">
      <archetypeName>prop_furniture_chair_01</archetypeName>
      <flags value="32" />
      <guid value="1234567892" />
      <position x="104.000000" y="205.000000" z="51.000000" />
      <rotation x="0.000000" y="0.000000" z="0.707107" w="0.707107" />
      <scaleXY value="1.000000" />
      <scaleZ value="1.000000" />
      <parentIndex value="-1" />
      <lodDist value="50.000000" />
      <childLodDist value="50.000000" />
      <lodLevel>LODTYPES_DEPTH_HD</lodLevel>
      <numChildren value="0" />
      <priorityLevel>PRI_REQUIRED</priorityLevel>
      <extensions />
      <ambientOcclusionMultiplier value="255" />
      <artificialAmbientOcclusion value="255" />
    </Item>
    
    <!-- Освещение -->
    <Item type="CEntityDef">
      <archetypeName>prop_ceiling_light_01</archetypeName>
      <flags value="32" />
      <guid value="1234567893" />
      <position x="105.000000" y="205.000000" z="53.500000" />
      <rotation x="0.000000" y="0.000000" z="0.000000" w="1.000000" />
      <scaleXY value="1.000000" />
      <scaleZ value="1.000000" />
      <parentIndex value="-1" />
      <lodDist value="100.000000" />
      <childLodDist value="100.000000" />
      <lodLevel>LODTYPES_DEPTH_HD</lodLevel>
      <numChildren value="0" />
      <priorityLevel>PRI_REQUIRED</priorityLevel>
      <extensions />
      <ambientOcclusionMultiplier value="255" />
      <artificialAmbientOcclusion value="255" />
    </Item>
  </entities>
  <containerLods />
  <boxOccluders />
  <occludeModels />
  <physicsDictionaries />
  <instancedData>
    <ImapLink />
    <defaultRooms />
    <portalLinks />
    <unk1 />
    <timeCycleModifiers />
    <carGenerators />
    <LODLightsSOA />
    <DistantLODLightsSOA />
  </instancedData>
  <timeCycleModifiers />
  <carGenerators />
</CMapData>`

// ============================================================================
// Парсинг Entity из YTYP (мокап парсер)
// ============================================================================

/**
 * Парсит YTYP XML и возвращает список entity (архетипов)
 */
export function parseYtypEntities(ytypXml: string): YtypEntity[] {
  const entities: YtypEntity[] = []
  
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(ytypXml, 'text/xml')
    
    // Ищем MLO архетип
    const mloItem = doc.querySelector('archetypes > Item[type="CMloArchetypeDef"]')
    if (!mloItem) {
      console.warn('[InteriorMock] No CMloArchetypeDef found')
      return entities
    }
    
    // Парсим entities из MLO
    const entityItems = mloItem.querySelectorAll('entities > Item[type="CEntityDef"]')
    
    entityItems.forEach((item, index) => {
      const nameEl = item.querySelector('archetypeName')
      const posEl = item.querySelector('position')
      const rotEl = item.querySelector('rotation')
      const lodDistEl = item.querySelector('lodDist')
      const flagsEl = item.querySelector('flags')
      const guidEl = item.querySelector('guid')
      const scaleXYEl = item.querySelector('scaleXY')
      const scaleZEl = item.querySelector('scaleZ')
      
      const position = posEl ? {
        x: parseFloat(posEl.getAttribute('x') || '0'),
        y: parseFloat(posEl.getAttribute('y') || '0'),
        z: parseFloat(posEl.getAttribute('z') || '0')
      } : { x: 0, y: 0, z: 0 }
      
      const rotation = rotEl ? {
        x: parseFloat(rotEl.getAttribute('x') || '0'),
        y: parseFloat(rotEl.getAttribute('y') || '0'),
        z: parseFloat(rotEl.getAttribute('z') || '0'),
        w: parseFloat(rotEl.getAttribute('w') || '1')
      } : undefined
      
      if (nameEl?.textContent) {
        entities.push({
          archetypeName: nameEl.textContent,
          position,
          rotation,
          lodDist: lodDistEl ? parseFloat(lodDistEl.getAttribute('value') || '0') : undefined,
          flags: flagsEl ? parseInt(flagsEl.getAttribute('value') || '0') : undefined,
          guid: guidEl ? parseInt(guidEl.getAttribute('value') || '0') : undefined,
          scaleXY: scaleXYEl ? parseFloat(scaleXYEl.getAttribute('value') || '1') : undefined,
          scaleZ: scaleZEl ? parseFloat(scaleZEl.getAttribute('value') || '1') : undefined,
          index // Индекс для связи с комнатами
        })
      }
    })
  } catch (error) {
    console.error('[InteriorMock] Error parsing YTYP XML:', error)
  }
  
  return entities
}

/**
 * Парсинг комнат из YTYP XML
 */
export function parseYtypRooms(ytypXml: string) {
  const rooms: import('@/types/interior').YtypRoom[] = []
  
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(ytypXml, 'text/xml')
    
    const mloItem = doc.querySelector('archetypes > Item[type="CMloArchetypeDef"]')
    if (!mloItem) return rooms
    
    const roomItems = mloItem.querySelectorAll('rooms > Item')
    
    roomItems.forEach((item) => {
      const nameEl = item.querySelector('name')
      const attachedEl = item.querySelector('attachedObjects')
      const bbMinEl = item.querySelector('bbMin')
      const bbMaxEl = item.querySelector('bbMax')
      
      // Парсим индексы объектов
      const indices: number[] = []
      if (attachedEl?.textContent) {
        const text = attachedEl.textContent.trim()
        text.split(/\s+/).forEach(s => {
          const num = parseInt(s.trim())
          if (!isNaN(num)) indices.push(num)
        })
      }
      
      rooms.push({
        name: nameEl?.textContent || 'Unknown Room',
        attachedObjects: indices,
        bbMin: bbMinEl ? {
          x: parseFloat(bbMinEl.getAttribute('x') || '0'),
          y: parseFloat(bbMinEl.getAttribute('y') || '0'),
          z: parseFloat(bbMinEl.getAttribute('z') || '0')
        } : undefined,
        bbMax: bbMaxEl ? {
          x: parseFloat(bbMaxEl.getAttribute('x') || '0'),
          y: parseFloat(bbMaxEl.getAttribute('y') || '0'),
          z: parseFloat(bbMaxEl.getAttribute('z') || '0')
        } : undefined
      })
    })
  } catch (error) {
    console.error('[InteriorMock] Error parsing rooms:', error)
  }
  
  return rooms
}

/**
 * Парсинг порталов из YTYP XML (полная информация)
 */
export function parseYtypPortals(ytypXml: string) {
  const portals: import('@/types/interior').YtypPortal[] = []
  
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(ytypXml, 'text/xml')
    
    const mloItem = doc.querySelector('archetypes > Item[type="CMloArchetypeDef"]')
    if (!mloItem) return portals
    
    const portalItems = mloItem.querySelectorAll('portals > Item')
    
    portalItems.forEach((item) => {
      const roomFromEl = item.querySelector('roomFrom')
      const roomToEl = item.querySelector('roomTo')
      const flagsEl = item.querySelector('flags')
      const attachedEl = item.querySelector('attachedObjects')
      
      // Парсим индексы объектов
      const indices: number[] = []
      if (attachedEl?.textContent) {
        const text = attachedEl.textContent.trim()
        text.split(/\s+/).forEach(s => {
          const num = parseInt(s.trim())
          if (!isNaN(num)) indices.push(num)
        })
      }
      
      // Парсим углы портала (corners) и сразу конвертируем в объекты координат
      const corners: Array<{ x: number; y: number; z: number }> = []
      const cornersItems = item.querySelectorAll('corners > Item')
      cornersItems.forEach(cornerItem => {
        const cornerText = cornerItem.textContent?.trim()
        if (cornerText) {
          // Парсим формат "x, y, z, w"
          const parts = cornerText.split(',').map(s => parseFloat(s.trim()))
          if (parts.length >= 3 && !parts.slice(0, 3).some(isNaN)) {
            corners.push({ 
              x: parts[0], 
              y: parts[1], 
              z: parts[2] 
            })
          }
        }
      })
      
      // Добавляем портал только если есть 4 угла (прямоугольник)
      if (corners.length === 4) {
        portals.push({
          roomFrom: roomFromEl ? parseInt(roomFromEl.getAttribute('value') || '0') : 0,
          roomTo: roomToEl ? parseInt(roomToEl.getAttribute('value') || '0') : 0,
          attachedObjects: indices,
          flags: flagsEl ? parseInt(flagsEl.getAttribute('value') || '0') : undefined,
          corners: corners
        })
      }
    })
  } catch (error) {
    console.error('[InteriorMock] Error parsing portals:', error)
  }
  
  return portals
}

/**
 * Парсит Entity Sets из YTYP XML (только имена)
 */
export function parseYtypEntitySets(ytypXml: string): string[] {
  const entitySets: string[] = []
  
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(ytypXml, 'text/xml')
    
    const mloItem = doc.querySelector('archetypes > Item[type="CMloArchetypeDef"]')
    if (!mloItem) return entitySets
    
    const entitySetItems = mloItem.querySelectorAll('entitySets > Item')
    
    entitySetItems.forEach((item) => {
      const nameEl = item.querySelector('name')
      if (nameEl?.textContent) {
        entitySets.push(nameEl.textContent.trim())
      }
    })
    
    console.log(`[InteriorMock] ✅ Parsed ${entitySets.length} entity sets from XML`)
  } catch (error) {
    console.error('[InteriorMock] Error parsing entity sets:', error)
  }
  
  return entitySets
}

/**
 * Парсит Entity Sets с их entities из YTYP XML
 */
export function parseYtypEntitySetsWithEntities(ytypXml: string) {
  const entitySetsWithEntities: Array<{
    name: string
    entities: import('@/types/interior').YtypEntity[]
  }> = []
  
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(ytypXml, 'text/xml')
    
    const mloItem = doc.querySelector('archetypes > Item[type="CMloArchetypeDef"]')
    if (!mloItem) return entitySetsWithEntities
    
    const entitySetItems = mloItem.querySelectorAll('entitySets > Item')
    
    entitySetItems.forEach((item) => {
      const nameEl = item.querySelector('name')
      const entitiesEl = item.querySelector('entities')
      
      if (!nameEl?.textContent || !entitiesEl) return
      
      const entities: import('@/types/interior').YtypEntity[] = []
      const entityItems = entitiesEl.querySelectorAll('Item[type="CEntityDef"]')
      
      entityItems.forEach((entityItem) => {
        const archetypeNameEl = entityItem.querySelector('archetypeName')
        const posEl = entityItem.querySelector('position')
        const rotEl = entityItem.querySelector('rotation')
        const lodDistEl = entityItem.querySelector('lodDist')
        const flagsEl = entityItem.querySelector('flags')
        const guidEl = entityItem.querySelector('guid')
        
        if (!archetypeNameEl?.textContent || !posEl) return
        
        const position = {
          x: parseFloat(posEl.getAttribute('x') || '0'),
          y: parseFloat(posEl.getAttribute('y') || '0'),
          z: parseFloat(posEl.getAttribute('z') || '0')
        }
        
        const rotation = rotEl ? {
          x: parseFloat(rotEl.getAttribute('x') || '0'),
          y: parseFloat(rotEl.getAttribute('y') || '0'),
          z: parseFloat(rotEl.getAttribute('z') || '0'),
          w: parseFloat(rotEl.getAttribute('w') || '1')
        } : undefined
        
        entities.push({
          archetypeName: archetypeNameEl.textContent.trim(),
          position,
          rotation,
          lodDist: lodDistEl ? parseFloat(lodDistEl.getAttribute('value') || '0') : undefined,
          flags: flagsEl ? parseInt(flagsEl.getAttribute('value') || '0') : undefined,
          guid: guidEl ? parseInt(guidEl.getAttribute('value') || '0') : undefined
        })
      })
      
      if (entities.length > 0) {
        entitySetsWithEntities.push({
          name: nameEl.textContent.trim(),
          entities
        })
      }
    })
    
    console.log(`[InteriorMock] ✅ Parsed ${entitySetsWithEntities.length} entity sets with entities`)
  } catch (error) {
    console.error('[InteriorMock] Error parsing entity sets with entities:', error)
  }
  
  return entitySetsWithEntities
}

// ============================================================================
// Парсинг Entity из YMAP (мокап парсер)
// ============================================================================

/**
 * Парсит YMAP XML и возвращает список entity (размещенных объектов)
 */
export function parseYmapEntities(ymapXml: string): YtypEntity[] {
  const entities: YtypEntity[] = []
  
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(ymapXml, 'text/xml')
    
    // Находим все <Item type="CEntityDef">
    const items = doc.querySelectorAll('entities > Item[type="CEntityDef"]')
    
    items.forEach((item) => {
      const nameEl = item.querySelector('archetypeName')
      const posEl = item.querySelector('position')
      const rotEl = item.querySelector('rotation')
      const lodDistEl = item.querySelector('lodDist')
      const flagsEl = item.querySelector('flags')
      const guidEl = item.querySelector('guid')
      const scaleXYEl = item.querySelector('scaleXY')
      const scaleZEl = item.querySelector('scaleZ')
      const parentIndexEl = item.querySelector('parentIndex')
      const childLodDistEl = item.querySelector('childLodDist')
      const numChildrenEl = item.querySelector('numChildren')
      
      if (nameEl?.textContent && posEl) {
        entities.push({
          archetypeName: nameEl.textContent,
          position: {
            x: parseFloat(posEl.getAttribute('x') || '0'),
            y: parseFloat(posEl.getAttribute('y') || '0'),
            z: parseFloat(posEl.getAttribute('z') || '0')
          },
          rotation: rotEl ? {
            x: parseFloat(rotEl.getAttribute('x') || '0'),
            y: parseFloat(rotEl.getAttribute('y') || '0'),
            z: parseFloat(rotEl.getAttribute('z') || '0'),
            w: parseFloat(rotEl.getAttribute('w') || '1')
          } : undefined,
          lodDist: lodDistEl ? parseFloat(lodDistEl.getAttribute('value') || '0') : undefined,
          flags: flagsEl ? parseInt(flagsEl.getAttribute('value') || '0') : undefined,
          guid: guidEl ? parseInt(guidEl.getAttribute('value') || '0') : undefined,
          scaleXY: scaleXYEl ? parseFloat(scaleXYEl.getAttribute('value') || '1') : undefined,
          scaleZ: scaleZEl ? parseFloat(scaleZEl.getAttribute('value') || '1') : undefined,
          parentIndex: parentIndexEl ? parseInt(parentIndexEl.getAttribute('value') || '-1') : undefined,
          childLodDist: childLodDistEl ? parseFloat(childLodDistEl.getAttribute('value') || '0') : undefined,
          numChildren: numChildrenEl ? parseInt(numChildrenEl.getAttribute('value') || '0') : undefined
        })
      }
    })
  } catch (error) {
    console.error('[InteriorMock] Error parsing YMAP XML:', error)
  }
  
  return entities
}

// ============================================================================
// Entity Sets (наборы объектов для вкл/выкл)
// ============================================================================

export const MOCK_ENTITY_SETS: InteriorEntitySet[] = []

// ============================================================================
// Timecycles (освещение и атмосфера)
// ============================================================================

export const MOCK_TIMECYCLES = [
  'int_warehouse',
  'int_garage',
  'int_house',
  'int_office',
  'int_dark',
  'int_bright',
  'int_club',
  'int_hospital',
  'int_gunshop',
  'int_tattoo'
]

// ============================================================================
// Комнаты (для будущего функционала)
// ============================================================================

export const MOCK_ROOMS = [
  {
    index: 0,
    name: 'Main Hall',
    flags: 0,
    timecycle: 'int_warehouse',
    extents: {
      min: { x: -10, y: -10, z: 0 },
      max: { x: 10, y: 10, z: 5 }
    }
  },
  {
    index: 1,
    name: 'Side Room',
    flags: 0,
    timecycle: 'int_office',
    extents: {
      min: { x: 10, y: -5, z: 0 },
      max: { x: 20, y: 5, z: 5 }
    }
  }
]

// ============================================================================
// Порталы (для будущей отрисовки в игре)
// ============================================================================

export const MOCK_PORTALS = [
  {
    index: 0,
    roomFrom: 0,
    roomTo: 1,
    position: { x: 10, y: 0, z: 2.5 },
    corners: [
      { x: 10, y: -1.5, z: 0 },
      { x: 10, y: 1.5, z: 0 },
      { x: 10, y: 1.5, z: 5 },
      { x: 10, y: -1.5, z: 5 }
    ],
    flags: 0
  }
]

