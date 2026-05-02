function FileExplorer({ files, selected, onSelectFile, busy, onNewProject }) {
  return (
    <aside className="flex h-full w-64 flex-shrink-0 flex-col border-r border-slate-800 bg-slate-900/70">
      <div className="border-b border-slate-800 p-4">
        <div className="mb-4">
          <p className="text-lg font-semibold tracking-tight text-slate-100">Local Codex</p>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Agent IDE</p>
        </div>
        <button
          type="button"
          onClick={() => !busy && onNewProject()}
          disabled={busy}
          className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-100 transition hover:border-blue-400 disabled:opacity-40"
        >
          New Project
        </button>
      </div>
      <div className="px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">Workspace</div>
      <div className="flex-1 space-y-1 overflow-y-auto px-2 pb-6">
        {files.length === 0 && (
          <p className="px-2 text-xs text-slate-500">
            Workspace is empty — ask the agent to scaffold files or paste into the editor and save manually.
          </p>
        )}
        {files.map((file) => {
          const active = file === selected
          return (
            <button
              key={file}
              type="button"
              disabled={busy}
              onClick={() => onSelectFile(file)}
              className={`w-full truncate rounded-lg px-3 py-2 text-left text-sm transition disabled:opacity-40 ${
                active
                  ? 'bg-blue-600/90 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {file}
            </button>
          )
        })}
      </div>
    </aside>
  )
}

export default FileExplorer
