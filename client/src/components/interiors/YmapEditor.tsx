/**
 * YMAP XML Editor Component
 * Monaco редактор для редактирования YMAP файлов интерьеров (размещение объектов)
 */

import { useState } from 'react'
import { Copy, Check, Save, Map } from 'lucide-react'
import toast from 'react-hot-toast'
import MonacoXMLEditor from '@/components/common/MonacoXMLEditor'

interface YmapEditorProps {
  xml: string
  onXmlChange?: (xml: string) => void
  interiorName?: string
  highlightedParam?: string
}

export function YmapEditor({ xml, onXmlChange, interiorName, highlightedParam }: YmapEditorProps) {
  const [copied, setCopied] = useState(false)
  
  /**
   * Копировать XML в буфер обмена
   */
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(xml)
      setCopied(true)
      toast.success('YMAP XML скопирован в буфер обмена')
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('[YmapEditor] Failed to copy:', error)
      toast.error('Не удалось скопировать XML')
    }
  }
  
  /**
   * Сохранить YMAP локально (мокап - в будущем отправит на сервер)
   */
  const handleSave = () => {
    if (!xml || !interiorName) {
      toast.error('Нет данных для сохранения')
      return
    }
    
    try {
      // Проверяем, что мы в AltV WebView
      if (typeof window !== 'undefined' && 'alt' in window) {
        const eventData = {
          interiorName: interiorName,
          ymapContent: xml
        }
        
        console.log('[YmapEditor] Sending save request to Alt:V...')
        
        // @ts-ignore
        if (typeof alt !== 'undefined' && typeof alt.emit === 'function') {
          // @ts-ignore
          alt.emit('meshhub:interior:save:ymap', eventData)
          toast.success('YMAP сохранен')
          return
        }
        
        if (typeof (window as any).alt !== 'undefined' && typeof (window as any).alt.emit === 'function') {
          ;(window as any).alt.emit('meshhub:interior:save:ymap', eventData)
          toast.success('YMAP сохранен')
          return
        }
        
        console.error('[YmapEditor] alt.emit не доступен!')
        toast.error('Ошибка: WebView не подключён к AltV')
        return
      }
      
      // Fallback для браузера - обычная загрузка
      const blob = new Blob([xml], { type: 'application/xml' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${interiorName}.ymap`
      a.style.display = 'none'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast.success(`Файл ${interiorName}.ymap сохранён`)
    } catch (err) {
      console.error('[YmapEditor] Save failed:', err)
      toast.error('Ошибка сохранения файла')
    }
  }
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Map className="w-4 h-4 text-blue-400" />
          <div className="text-sm font-semibold text-white">.ymap XML</div>
        </div>
        <div className="flex items-center space-x-2">
          {/* Copy button */}
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
          
          {/* Save button */}
          <button
            onClick={handleSave}
            className="flex items-center space-x-2 px-3 py-1.5 bg-gradient-to-r from-primary-600 to-blue-600 hover:from-primary-500 hover:to-blue-500 text-white rounded transition-all text-xs"
          >
            <Save className="w-3 h-3" />
            <span>Сохранить</span>
          </button>
        </div>
      </div>
      
      {/* Monaco XML Editor */}
      <div className="flex-1 overflow-hidden rounded-lg border border-base-700 bg-base-950">
        {xml && xml.trim() ? (
          <MonacoXMLEditor 
            value={xml}
            onChange={(newXml) => onXmlChange?.(newXml)}
            highlightedParam={highlightedParam}
            height="100%"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-center">
            <div>
              <Map className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <div className="text-lg font-semibold text-gray-400 mb-2">
                YMAP файл не найден
              </div>
              <div className="text-sm text-gray-500">
                Для этого интерьера отсутствует YMAP конфигурация
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Info */}
      <div className="mt-3 p-3 bg-base-800 rounded-lg border border-base-700">
        <div className="text-xs text-gray-400">
          💡 YMAP содержит размещение объектов в мире (координаты, вращение, масштаб)
        </div>
      </div>
    </div>
  )
}

export default YmapEditor
