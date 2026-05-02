import { useEffect, useRef, useState } from 'react'

function Terminal({ lines, running, inputEnabled, onSendInput, inputSuggested }) {
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const [input, setInput] = useState('')

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  useEffect(() => {
    if (inputSuggested && inputEnabled) inputRef.current?.focus()
  }, [inputSuggested, inputEnabled])

  const submitInput = async () => {
    const value = input.trim()
    if (!value || !inputEnabled) return
    setInput('')
    await onSendInput?.(value)
  }

  return (
    <div className="flex h-full flex-col bg-slate-950">
      <div className="flex items-center justify-between border-b border-slate-900 px-3 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
        <span>Console</span>
        <span className={running ? 'text-emerald-300' : 'text-slate-500'}>
          {running ? '▶ Running...' : 'Idle'}
        </span>
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto p-3 font-mono text-xs leading-relaxed">
        {lines.length === 0 && (
          <p className="text-slate-500">Run snippets or delegate to the agent to stream output.</p>
        )}
        {lines.map((entry, idx) => (
          <div
            key={`${idx}-${entry.line.slice(0, 40)}`}
            className={`whitespace-pre-wrap ${entry.stream === 'stderr' ? 'text-rose-300' : 'text-emerald-200'}`}
          >
            <span className="mr-2 text-[10px] uppercase text-slate-500">{entry.stream}</span>
            <span>{entry.line}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="border-t border-slate-900 p-2">
        <input
          ref={inputRef}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              void submitInput()
            }
          }}
          disabled={!inputEnabled}
          placeholder={inputEnabled ? 'Send input to running process...' : 'No active interactive process'}
          className={`w-full rounded-lg border px-3 py-2 font-mono text-xs outline-none ${
            inputEnabled
              ? inputSuggested
                ? 'border-amber-400 bg-slate-900 text-slate-100'
                : 'border-slate-700 bg-slate-900 text-slate-100'
              : 'border-slate-800 bg-slate-900/60 text-slate-500'
          }`}
        />
      </div>
    </div>
  )
}

export default Terminal
