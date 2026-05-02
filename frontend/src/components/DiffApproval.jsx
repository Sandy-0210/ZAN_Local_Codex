import { DiffEditor } from '@monaco-editor/react'
import { useState } from 'react'
import { languageFromFilename } from '../lib/language'

function DiffApproval({ pending, onApprove, onReject, busy }) {
  const [draft, setDraft] = useState(() => pending.after ?? '')

  const monacoLang = languageFromFilename(pending.filename)

  return (
    <div className="mt-4 rounded-2xl border border-emerald-500/40 bg-slate-950/80 p-4 shadow-inner shadow-emerald-500/15">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-200/70">
            {pending.actionType === 'suggest_fix' ? 'Suggested Fix' : 'Approval required'}
          </p>
          <p className="text-sm font-semibold text-slate-50">{pending.filename}</p>
          <p className="text-xs text-slate-400">
            {pending.actionType === 'create_file'
              ? 'New file'
              : pending.actionType === 'suggest_fix'
                ? 'Suggested fix'
                : 'Update file'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onReject()}
            disabled={busy}
            className="rounded-lg border border-slate-700 px-3 py-1 text-xs font-medium text-slate-200 hover:border-slate-500 disabled:opacity-40"
          >
            Reject
          </button>
          <button
            type="button"
            onClick={() => onApprove(draft)}
            disabled={busy}
            className="rounded-lg bg-emerald-500 px-4 py-1 text-xs font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-40"
          >
            Approve & apply
          </button>
        </div>
      </div>

      {pending.thought && (
        <p className="mb-3 rounded-xl border border-slate-800 bg-slate-900/80 p-3 text-xs leading-relaxed text-slate-300">{pending.thought}</p>
      )}

      <div className="h-96 overflow-hidden rounded-xl border border-slate-800">
        <DiffEditor
          height="100%"
          theme="vs-dark"
          language={monacoLang}
          original={pending.before ?? ''}
          modified={draft}
          options={{
            renderSideBySide: true,
            minimap: { enabled: false },
          }}
          onMount={(diffEditor) => {
            const modifiedEditor = diffEditor.getModifiedEditor()
            modifiedEditor.onDidChangeModelContent(() => {
              setDraft(modifiedEditor.getValue())
            })
          }}
        />
      </div>
    </div>
  )
}

export default DiffApproval
