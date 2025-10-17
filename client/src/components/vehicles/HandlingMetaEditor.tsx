export function HandlingMetaEditor({ xml, onXmlChange }: { xml: string; onXmlChange: (v: string) => void }) {
  return (
    <textarea
      value={xml}
      onChange={(e) => onXmlChange(e.target.value)}
      className="w-full h-[70vh] text-xs font-mono bg-black/80 text-gray-200 border border-base-700 rounded p-2"
      spellCheck={false}
    />
  )
}

export default HandlingMetaEditor


