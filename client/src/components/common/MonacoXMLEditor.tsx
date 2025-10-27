/**
 * Lightweight XML Editor Component
 * Быстрый редактор XML с подсветкой синтаксиса и всеми необходимыми функциями
 * Без тяжелых зависимостей - работает мгновенно в ALT:V WebView
 */

import { useRef, useEffect } from 'react'
import Editor, { OnMount } from '@monaco-editor/react'
import type * as Monaco from 'monaco-editor'

interface MonacoXMLEditorProps {
  value: string
  onChange: (value: string) => void
  highlightedParam?: string
  height?: string
  readOnly?: boolean
}

export function MonacoXMLEditor({ 
  value, 
  onChange, 
  highlightedParam,
  height = '70vh',
  readOnly = false
}: MonacoXMLEditorProps) {
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<typeof Monaco | null>(null)
  
  // Обработчик монтирования Monaco Editor
  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco
    
    // Настройка темы (только один раз глобально)
    if (!(window as any).__monacoThemeConfigured) {
      monaco.editor.defineTheme('meshhub-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'tag', foreground: '569CD6' },
          { token: 'attribute.name', foreground: '9CDCFE' },
          { token: 'attribute.value', foreground: 'CE9178' },
          { token: 'string', foreground: 'CE9178' },
          { token: 'number', foreground: 'B5CEA8' },
          { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
        ],
        colors: {
          'editor.background': '#0a0a0a',
          'editor.foreground': '#d4d4d4',
          'editor.lineHighlightBackground': '#1f1f1f',
          'editor.selectionBackground': '#3b82f680',
          'editor.inactiveSelectionBackground': '#3b82f640',
          'editorCursor.foreground': '#ffffff',
          'editorLineNumber.foreground': '#858585',
          'editorLineNumber.activeForeground': '#c6c6c6',
        }
      })
      
      monaco.editor.setTheme('meshhub-dark')
      ;(window as any).__monacoThemeConfigured = true
      console.log('[MonacoEditor] Theme configured globally')
    }
    
    console.log('[MonacoEditor] Editor mounted')
  }
  
  // Подсветка и скролл к параметру
  useEffect(() => {
    if (!highlightedParam || !value || !editorRef.current || !monacoRef.current) {
      return
    }
    
    const editor = editorRef.current
    const monaco = monacoRef.current
    
    // Ищем строку с параметром
    const lines = value.split('\n')
    const lineNumber = lines.findIndex(line => {
      // Проверяем на тег (например, <lodDist value="100">)
      if (line.includes(`<${highlightedParam} `) || line.includes(`<${highlightedParam}>`)) {
        return true
      }
      // Проверяем на значение внутри тега (например, <archetypeName>qt_cyber_...</archetypeName>)
      if (line.includes(`>${highlightedParam}<`)) {
        return true
      }
      return false
    }) + 1 // Monaco использует 1-based индексы
    
    if (lineNumber > 0) {
      console.log(`[MonacoEditor] Highlighting parameter ${highlightedParam} at line ${lineNumber}`)
      
      // Скролл к строке
      editor.revealLineInCenter(lineNumber)
      
      // Временная подсветка строки
      const decorations = editor.deltaDecorations([], [
        {
          range: new monaco.Range(lineNumber, 1, lineNumber, 1),
          options: {
            isWholeLine: true,
            className: 'monaco-line-highlight',
            glyphMarginClassName: 'monaco-line-glyph'
          }
        }
      ])
      
      // Убираем подсветку через 2 секунды
      setTimeout(() => {
        editor.deltaDecorations(decorations, [])
      }, 2000)
    }
  }, [highlightedParam, value])
  
  return (
    <div className="relative w-full" style={{ height }}>
      <Editor
        height="100%"
        defaultLanguage="xml"
        value={value}
        onChange={(newValue) => onChange(newValue || '')}
        onMount={handleEditorDidMount}
        theme="meshhub-dark"
        options={{
          // Базовые настройки
          readOnly,
          fontSize: 12,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          lineHeight: 18,
          tabSize: 2,
          insertSpaces: true,
          detectIndentation: false,
          
          // Оптимизация производительности
          automaticLayout: true,
          scrollBeyondLastLine: false,
          wordWrap: 'off',
          
          // Визуальные улучшения
          minimap: { enabled: true, scale: 1 },
          folding: true,
          foldingHighlight: true,
          bracketPairColorization: { enabled: true },
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          
          // Автоформатирование
          formatOnPaste: true,
          formatOnType: true,
          
          // Отключаем лишнее для производительности
          codeLens: false,
          contextmenu: true,
          quickSuggestions: false,
          parameterHints: { enabled: false },
          suggest: { 
            showWords: false,
            showSnippets: false
          },
        }}
        loading={
          <div className="flex items-center justify-center h-full bg-base-950">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <div className="text-gray-400 text-sm">Загрузка Monaco Editor...</div>
              <div className="text-gray-500 text-xs mt-2">Может занять несколько секунд при первом запуске</div>
            </div>
          </div>
        }
        beforeMount={() => {
          // Предварительная настройка перед монтированием
          console.log('[MonacoEditor] beforeMount called')
        }}
        onValidate={(markers) => {
          // Обработка ошибок валидации XML
          if (markers.length > 0) {
            console.warn('[MonacoEditor] XML validation errors:', markers)
          }
        }}
      />
      
      {/* Дополнительные стили для подсветки */}
      <style>{`
        .monaco-line-highlight {
          background: rgba(250, 204, 21, 0.2) !important;
          animation: flash-highlight 2s ease-in-out;
        }
        
        .monaco-line-glyph {
          background: rgba(250, 204, 21, 0.4) !important;
        }
        
        @keyframes flash-highlight {
          0%, 100% { background: rgba(250, 204, 21, 0.05) !important; }
          50% { background: rgba(250, 204, 21, 0.3) !important; }
        }
      `}</style>
    </div>
  )
}

export default MonacoXMLEditor


