import React, { useState, useEffect } from 'react'
import { Copy, Check } from 'lucide-react'
import toast from 'react-hot-toast'

interface WeaponMetaEditorProps {
  xml: string
  onXmlChange?: (xml: string) => void
  onFocusModeToggle?: () => void
  focusMode?: boolean
}

const WeaponMetaEditor: React.FC<WeaponMetaEditorProps> = ({ xml }) => {
  const [editedXml, setEditedXml] = useState(xml)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setEditedXml(xml)
  }, [xml])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editedXml)
      setCopied(true)
      toast.success('XML скопирован в буфер обмена')
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('[WeaponMetaEditor] Failed to copy:', error)
      toast.error('Не удалось скопировать XML')
    }
  }

  // Format XML for better readability
  const formattedXml = editedXml
    .split('\n')
    .map((line, index) => {
      const trimmed = line.trim()
      if (!trimmed) return null
      
      return (
        <div key={index} className="flex">
          <div className="w-12 flex-shrink-0 text-right pr-4 text-gray-600 select-none">
            {index + 1}
          </div>
          <div className="flex-1 text-gray-300 font-mono text-xs whitespace-pre">
            {line}
          </div>
        </div>
      )
    })
    .filter(Boolean)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold text-white">weapons.meta XML</div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopy}
            className="flex items-center space-x-2 px-3 py-1.5 bg-base-800 hover:bg-base-700 text-gray-300 rounded transition-colors text-xs"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3" />
                <span>Скопировано!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Копировать</span>
              </>
            )}
          </button>
          
        </div>
      </div>

      {/* XML viewer */}
      <div className="flex-1 overflow-hidden rounded-lg border border-base-700 bg-base-950">
        <div className="h-full overflow-y-auto p-4">
          {xml && xml.trim() ? (
            formattedXml
          ) : (
            <div className="flex items-center justify-center h-full text-center">
              <div>
                <div className="text-lg font-semibold text-gray-400 mb-2">
                  Meta данные не найдены
                </div>
                <div className="text-sm text-gray-500">
                  Для этого оружия отсутствует XML конфигурация
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="mt-3 p-3 bg-base-800 rounded-lg border border-base-700">
        <div className="text-xs text-gray-400">
          💡 XML обновляется автоматически при изменении параметров на ползунках
        </div>
      </div>
    </div>
  )
}

export default WeaponMetaEditor





