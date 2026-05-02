import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useEffect, useRef, useState } from 'react'
import DiffApproval from './DiffApproval'

function Chat({ messages, onSend, pendingApproval, approveBusy, onApprove, onReject, agentThinking }) {
  const bottomRef = useRef(null)
  const [draft, setDraft] = useState('')

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, pendingApproval, agentThinking])

  const handleSubmit = (event) => {
    event.preventDefault()
    const text = draft.trim()
    if (!text || agentThinking || approveBusy) return
    onSend(text)
    setDraft('')
  }

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col border-r border-slate-900 bg-slate-950/60">
      <header className="border-b border-slate-800 px-4 py-3">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Agent</p>
        <p className="text-base font-semibold text-slate-100">Chat & reasoning</p>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.map((message) => (
          <article
            key={message.id}
            className={`message-enter flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                message.role === 'user'
                  ? 'rounded-br-md bg-blue-600 text-white'
                  : 'rounded-bl-md border border-slate-800 bg-slate-900/80 text-slate-100'
              }`}
            >
              {message.role === 'assistant' ? (
                <div className="space-y-2 text-sm leading-relaxed text-slate-100">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{message.content}</p>
              )}

              {/* Keep chat clean; detailed traces stay in bottom tabs. */}
            </div>
          </article>
        ))}

        {agentThinking && (
          <div className="message-enter flex justify-start">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-sm text-slate-300">
              <p className="font-semibold text-blue-200">Agent thinking…</p>
              <div className="mt-2 flex gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-blue-300 [animation-delay:-0.2s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-blue-300 [animation-delay:-0.1s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-blue-300" />
              </div>
            </div>
          </div>
        )}

        {pendingApproval && (
          <DiffApproval
            key={pendingApproval.proposalId}
            pending={pendingApproval}
            onApprove={onApprove}
            onReject={onReject}
            busy={approveBusy}
          />
        )}

        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="border-t border-slate-800 bg-slate-900/80 p-4">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={3}
          disabled={agentThinking || approveBusy}
          placeholder="Describe the change, bug, or task for the agent…"
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500 disabled:opacity-40"
        />
        <div className="mt-2 flex justify-end">
          <button
            type="submit"
            disabled={agentThinking || approveBusy || !draft.trim()}
            className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-40"
          >
            Send to agent
          </button>
        </div>
      </form>
    </section>
  )
}

export default Chat
