import { useEffect, useRef, useState } from 'react'

interface Props {
  xml: string
  onXmlChange: (v: string) => void
  highlightedParam?: string
}

export function HandlingMetaEditor({ xml, onXmlChange, highlightedParam }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [highlightedLine, setHighlightedLine] = useState<number | null>(null)
  const [showHighlight, setShowHighlight] = useState(false)
  
  // Подсветка и скролл к изменяемому параметру
  useEffect(() => {
    if (!highlightedParam || !xml || !textareaRef.current) {
      setHighlightedLine(null)
      setShowHighlight(false)
      return
    }
    
    // Ищем строку с параметром в XML
    const lines = xml.split('\n')
    const lineIndex = lines.findIndex(line => line.includes(`<${highlightedParam} `) || line.includes(`<${highlightedParam}>`))
    
    if (lineIndex !== -1) {
      setHighlightedLine(lineIndex)
      setShowHighlight(true)
      
      // Скролл к строке
      const textarea = textareaRef.current
      const lineHeight = 16 // приблизительная высота строки в пикселях
      const scrollTop = lineIndex * lineHeight - textarea.clientHeight / 2
      textarea.scrollTop = Math.max(0, scrollTop)
      
      // Моргание: показываем/скрываем подсветку несколько раз
      let blinkCount = 0
      const maxBlinks = 4 // 4 моргания
      const blinkInterval = 300 // 300мс между морганиями
      
      const blinkTimer = setInterval(() => {
        setShowHighlight(prev => !prev)
        blinkCount++
        
        if (blinkCount >= maxBlinks) {
          clearInterval(blinkTimer)
          setShowHighlight(false)
          setHighlightedLine(null)
        }
      }, blinkInterval)
      
      return () => {
        clearInterval(blinkTimer)
        setShowHighlight(false)
        setHighlightedLine(null)
      }
    }
  }, [highlightedParam, xml])
  
  // Рендерим XML с подсветкой строки
  const renderXmlWithHighlight = () => {
    const lines = xml.split('\n')
    return lines.map((line, index) => (
      <div
        key={index}
        className={`font-mono text-xs leading-4 ${
          highlightedLine === index && showHighlight 
            ? 'bg-yellow-400/30 text-yellow-100 px-1 rounded' 
            : 'text-gray-200'
        }`}
      >
        {line}
      </div>
    ))
  }
  
  return (
    <div className="relative w-full h-[70vh] bg-black/80 border border-base-700 rounded p-2 overflow-y-auto">
      <div className="space-y-0">
        {renderXmlWithHighlight()}
      </div>
      
      {/* Скрытый textarea для редактирования */}
      <textarea
        ref={textareaRef}
        value={xml}
        onChange={(e) => onXmlChange(e.target.value)}
        className="absolute inset-0 w-full h-full text-xs font-mono bg-transparent text-transparent caret-white resize-none outline-none opacity-0"
        spellCheck={false}
        style={{ zIndex: 10 }}
      />
    </div>
  )
}

export default HandlingMetaEditor


