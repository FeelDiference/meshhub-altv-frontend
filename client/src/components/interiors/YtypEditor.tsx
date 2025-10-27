/**
 * YTYP XML Editor Component
 * Monaco редактор для редактирования YTYP файлов интерьеров (архетипы объектов)
 */

import { useState } from 'react'
import { Copy, Check, Save, FileCode } from 'lucide-react'
import toast from 'react-hot-toast'
import MonacoXMLEditor from '@/components/common/MonacoXMLEditor'

interface YtypEditorProps {
  xml: string
  onXmlChange?: (xml: string) => void
  interiorName?: string
  highlightedParam?: string
  loading?: boolean
}

export function YtypEditor({ xml, onXmlChange, interiorName, highlightedParam, loading = false }: YtypEditorProps) {
  const [copied, setCopied] = useState(false)
  
  /**
   * Копировать XML в буфер обмена
   */
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(xml)
      setCopied(true)
      toast.success('YTYP XML скопирован в буфер обмена')
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('[YtypEditor] Failed to copy:', error)
      toast.error('Не удалось скопировать XML')
    }
  }
  
  /**
   * Сохранить YTYP локально (мокап - в будущем отправит на сервер)
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
          ytypContent: xml
        }
        
        console.log('[YtypEditor] Sending save request to Alt:V...')
        
        // @ts-ignore
        if (typeof alt !== 'undefined' && typeof alt.emit === 'function') {
          // @ts-ignore
          alt.emit('meshhub:interior:save:ytyp', eventData)
          toast.success('YTYP сохранен')
          return
        }
        
        if (typeof (window as any).alt !== 'undefined' && typeof (window as any).alt.emit === 'function') {
          ;(window as any).alt.emit('meshhub:interior:save:ytyp', eventData)
          toast.success('YTYP сохранен')
          return
        }
        
        console.error('[YtypEditor] alt.emit не доступен!')
        toast.error('Ошибка: WebView не подключён к AltV')
        return
      }
      
      // Fallback для браузера - обычная загрузка
      const blob = new Blob([xml], { type: 'application/xml' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${interiorName}.ytyp`
      a.style.display = 'none'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast.success(`Файл ${interiorName}.ytyp сохранён`)
    } catch (err) {
      console.error('[YtypEditor] Save failed:', err)
      toast.error('Ошибка сохранения файла')
    }
  }
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <FileCode className="w-4 h-4 text-purple-400" />
          <div className="text-sm font-semibold text-white">.ytyp XML</div>
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
            className="flex items-center space-x-2 px-3 py-1.5 bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-500 hover:to-purple-500 text-white rounded transition-all text-xs"
          >
            <Save className="w-3 h-3" />
            <span>Сохранить</span>
          </button>
        </div>
      </div>
      
      {/* Monaco XML Editor */}
      <div className="flex-1 overflow-hidden rounded-lg border border-base-700 bg-base-950">
        {loading ? (
          <div className="flex items-center justify-center h-full text-center">
            <div>
              <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <div className="text-lg font-semibold text-gray-400 mb-2">
                Загрузка YTYP...
              </div>
              <div className="text-sm text-gray-500">
                Поиск CMloArchetypeDef в RPF архиве
              </div>
            </div>
          </div>
        ) : xml && xml.trim() ? (
          <MonacoXMLEditor 
            value={xml}
            onChange={(newXml) => onXmlChange?.(newXml)}
            highlightedParam={highlightedParam}
            height="100%"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-center">
            <div>
              <FileCode className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <div className="text-lg font-semibold text-gray-400 mb-2">
                YTYP файл не найден
              </div>
              <div className="text-sm text-gray-500">
                Для этого интерьера отсутствует YTYP конфигурация
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Info */}
      <div className="mt-3 p-3 bg-base-800 rounded-lg border border-base-700">
        <div className="text-xs text-gray-400">
          💡 YTYP содержит определения архетипов объектов (мебель, props, структуры)
        </div>
      </div>
    </div>
  )
}

export default YtypEditor
