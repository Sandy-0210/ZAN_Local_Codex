import MonacoEditor from '@monaco-editor/react'
import { useRef } from 'react'
import { detectRunLanguage, languageFromFilename } from '../lib/language'

function WorkspaceEditor({
  activeFile,
  contents,
  onChange,
  onDiagnosticsChange,
  onSaveNow,
  onRun,
  onFixCode,
  onCreateFileRequest,
  onExport,
  onImportFile,
  runBusy,
  saveStatus,
  errorCount = 0,
}) {
  const language = languageFromFilename(activeFile ?? '')
  const runLang = detectRunLanguage(activeFile?.split('.').pop()?.toLowerCase() ?? 'js')
  const fileInputRef = useRef(null)
  const editorRef = useRef(null)

  const handleFileUpload = (event) => {
    const file = event.target.files[0]
    if (!file) return

    // File size limit
    if (file.size > 1024 * 1024) { // 1MB
      alert('File too large (max 1MB)')
      return
    }

    // Supported types
    const allowedExts = ['py', 'js', 'html', 'css', 'txt']
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!allowedExts.includes(ext)) {
      alert('Unsupported file type. Allowed: .py, .js, .html, .css, .txt')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target.result
      // Update editor
      editorRef.current?.setValue(content)
      onChange(content)
      // Update filename and clear state
      onImportFile?.(file.name, content)
    }
    reader.readAsText(file)
  }

  const statusLabel =
    saveStatus === 'saving' ? 'Saving…' : saveStatus === 'error' ? 'Save failed' : saveStatus === 'saved' ? 'Autosaved ✓' : 'Ready'

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col border-l border-slate-900 bg-[#090f1f]">
      <header className="flex flex-wrap items-center gap-3 border-b border-slate-800 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Editor</p>
          <p className="truncate text-base font-semibold text-slate-100">{activeFile ?? 'Untitled workspace'}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-200">
          <button
            type="button"
            onClick={() => {
              void onSaveNow?.()
            }}
            disabled={!activeFile || saveStatus === 'saving'}
            className="rounded-lg border border-slate-600 px-3 py-2 hover:border-emerald-300 disabled:opacity-35"
          >
            Save now
          </button>
          <button
            type="button"
            onClick={() => onExport?.()}
            disabled={!contents.trim()}
            className="rounded-lg border border-blue-600 px-3 py-2 hover:border-blue-400 disabled:opacity-35"
          >
            Export File
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg border border-purple-600 px-3 py-2 hover:border-purple-400"
          >
            Import File
          </button>
          <button
            type="button"
            onClick={() => onCreateFileRequest?.()}
            className="rounded-lg border border-blue-900/70 bg-blue-900/60 px-3 py-2 text-white hover:bg-blue-800"
          >
            New file…
          </button>
          <button
            type="button"
            disabled={runBusy || !contents.trim()}
            onClick={() => onRun(contents, runLang)}
            className="rounded-lg border border-transparent bg-emerald-500 px-4 py-2 text-slate-950 hover:bg-emerald-400 disabled:opacity-30"
          >
            Run ▶︎
          </button>
          <button
            type="button"
            disabled={!activeFile || !contents.trim() || runBusy}
            onClick={() => onFixCode?.()}
            className="rounded-lg border border-amber-600/70 bg-amber-500/20 px-4 py-2 text-amber-200 hover:bg-amber-500/30 disabled:opacity-30"
          >
            Fix Code
          </button>
        </div>
        <span className={`text-[11px] ${errorCount > 0 ? 'text-rose-300' : 'text-slate-500'}`}>
          {errorCount > 0 ? `${errorCount} syntax issue(s)` : statusLabel}
        </span>
      </header>

      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileUpload}
        accept=".py,.js,.html,.css,.txt"
      />

      <div className="flex-1 min-h-[320px]">
        {!activeFile && (
          <div className="flex h-full items-center px-10 text-center text-sm text-slate-400">
            Select a workspace file or tap “New file…” to scaffold something locally.
          </div>
        )}
        {activeFile && (
          <MonacoEditor
            height="100%"
            theme="vs-dark"
            path={activeFile}
            language={language}
            value={contents}
            onChange={(value) => onChange(typeof value === 'string' ? value : '')}
            onValidate={(markers) => {
              onDiagnosticsChange?.(markers)
            }}
            onMount={(editor) => {
              editorRef.current = editor
            }}
            options={{
              fontSize: 13,
              minimap: { enabled: false },
              smoothScrolling: true,
              scrollbar: {
                horizontalScrollbarSize: 8,
                verticalScrollbarSize: 8,
              },
            }}
          />
        )}
      </div>
    </section>
  )
}

export default WorkspaceEditor
