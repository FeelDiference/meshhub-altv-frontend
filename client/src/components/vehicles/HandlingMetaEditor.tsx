/**
 * Handling Meta Editor - Monaco Edition
 * Использует Monaco Editor для удобного редактирования XML
 */

import MonacoXMLEditor from '@/components/common/MonacoXMLEditor'
import HandlingPresetsManager from './HandlingPresetsManager'
import type { HandlingPreset } from '@/hooks/useHandlingPresets'

interface Props {
  xml: string
  onXmlChange: (v: string) => void
  highlightedParam?: string
  // Пропсы для управления пресетами
  currentValues?: HandlingPreset
  onPresetLoad?: (preset: HandlingPreset) => void
  disabled?: boolean
}

export function HandlingMetaEditor({ 
  xml, 
  onXmlChange, 
  highlightedParam,
  currentValues,
  onPresetLoad,
  disabled = false
}: Props) {
  return (
    <div className="w-full">
      <MonacoXMLEditor
        value={xml}
        onChange={onXmlChange}
        highlightedParam={highlightedParam}
        height="70vh"
      />
      
      {/* Управление пресетами */}
      {currentValues && onPresetLoad && (
        <>
          {/* Разделитель с заголовком */}
          <div className="mt-3 mb-2 flex items-center gap-2">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Пресеты</div>
            <div className="flex-1 h-px bg-gray-700"></div>
          </div>
          
          <HandlingPresetsManager
            currentValues={currentValues}
            onPresetLoad={onPresetLoad}
            disabled={disabled}
          />
        </>
      )}
    </div>
  )
}

export default HandlingMetaEditor


