/**
 * Handling Meta Editor - Monaco Edition
 * Использует Monaco Editor для удобного редактирования XML
 */

import MonacoXMLEditor from '@/components/common/MonacoXMLEditor'

interface Props {
  xml: string
  onXmlChange: (v: string) => void
  highlightedParam?: string
}

export function HandlingMetaEditor({ xml, onXmlChange, highlightedParam }: Props) {
  return (
    <div className="w-full">
      <MonacoXMLEditor
        value={xml}
        onChange={onXmlChange}
        highlightedParam={highlightedParam}
        height="70vh"
      />
      
      {/* Подсказки */}
      <div className="mt-2 p-2 bg-base-800/50 rounded text-xs text-gray-400">
        💡 <strong>Горячие клавиши:</strong> Ctrl+F - поиск, Ctrl+H - замена, Ctrl+Shift+F - форматирование, Alt+Click - множественные курсоры
      </div>
    </div>
  )
}

export default HandlingMetaEditor


