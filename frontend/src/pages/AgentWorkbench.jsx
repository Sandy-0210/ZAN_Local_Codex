import { useCallback, useEffect, useRef, useState } from 'react'
import Chat from '../components/Chat'
import WorkspaceEditor from '../components/Editor'
import FileExplorer from '../components/FileExplorer'
import Terminal from '../components/Terminal'
import {
  approveAgentProposal,
  execSnippet,
  fetchChatHistory,
  fetchFileContent,
  fetchFileList,
  postAgentMessage,
  resetAgentSession,
  resetWorkspace,
  saveFileContent,
  sendTerminalInput,
  suggestFix,
  subscribeTerminalStream,
} from '../services/agentApi'
import { extractCode } from '../lib/language'

const initialAssistantId = crypto.randomUUID()

const welcomeMessage = {
  id: initialAssistantId,
  role: 'assistant',
  content:
    'I am your **local engineering agent**. I can read/write files in the workspace, run JavaScript or Python snippets, and explain results. Tell me what to build or fix.',
  trace: [],
}

function normalizeTerminalLines(lines = []) {
  return lines.map((entry) => ({
    stream: entry.stream === 'stderr' ? 'stderr' : 'stdout',
    line: entry.line ?? JSON.stringify(entry),
  }))
}

function BottomPanel({
  activeTab,
  setActiveTab,
  terminalLines,
  agentTraceLog,
  flatFiles,
  selectedFile,
  onPickFile,
  terminalRunning,
  terminalInputEnabled,
  terminalInputSuggested,
  onTerminalInput,
}) {
  return (
    <div className="flex h-60 flex-shrink-0 flex-col border-t border-slate-800 bg-slate-950/95">
      <div className="flex border-b border-slate-900 text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-500">
        {[
          { id: 'chat', label: 'Chat' },
          { id: 'files', label: 'Files' },
          { id: 'terminal', label: 'Terminal' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-2 transition ${
              activeTab === tab.id ? 'border-b-2 border-blue-500 text-blue-200' : 'text-slate-500 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1">
        {activeTab === 'chat' && (
          <div className="h-full overflow-y-auto p-4 text-xs leading-relaxed text-slate-300">
            {agentTraceLog.length === 0 && <p className="text-slate-500">Tool observations will land here chronologically.</p>}
            <ul className="space-y-2">
              {agentTraceLog.map((entry, idx) => (
                <li key={`${idx}-${entry.label}`} className="rounded-xl border border-slate-900 bg-slate-900/50 p-3">
                  <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">{entry.phase}</p>
                  {entry.thought && <p className="mt-2 text-slate-200">{entry.thought}</p>}
                  {entry.agentAction && <p className="text-slate-400">→ {entry.agentAction}</p>}
                  {entry.observation && (
                    <pre className="mt-2 max-h-32 overflow-auto rounded-lg bg-black/60 p-2 font-mono text-[11px] text-emerald-200">
                      {JSON.stringify(entry.observation, null, 2)}
                    </pre>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
        {activeTab === 'files' && (
          <div className="h-full overflow-y-auto p-4 text-xs text-slate-300">
            {flatFiles.length === 0 && <p className="text-slate-500">No files yet.</p>}
            <ul className="space-y-2">
              {flatFiles.map((file) => (
                <li key={file}>
                  <button
                    type="button"
                    onClick={() => onPickFile(file)}
                    className={`w-full rounded-lg px-3 py-2 text-left transition ${
                      file === selectedFile ? 'bg-blue-600/60 text-white' : 'hover:bg-slate-900'
                    }`}
                  >
                    {file}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {activeTab === 'terminal' && (
          <Terminal
            lines={terminalLines}
            running={terminalRunning}
            inputEnabled={terminalInputEnabled}
            inputSuggested={terminalInputSuggested}
            onSendInput={onTerminalInput}
          />
        )}
      </div>
    </div>
  )
}

function AgentWorkbench() {
  const [files, setFiles] = useState([])
  const [selectedFile, setSelectedFile] = useState(null)
  const [editorContents, setEditorContents] = useState('')
  const [editorDiagnostics, setEditorDiagnostics] = useState([])
  const [saveStatus, setSaveStatus] = useState('idle')
  const [messages, setMessages] = useState([welcomeMessage])
  const [terminalLines, setTerminalLines] = useState([])
  const [agentTraceLog, setAgentTraceLog] = useState([])
  const [pendingApproval, setPendingApproval] = useState(null)
  const [fixSuggestion, setFixSuggestion] = useState(null)
  const [fixBusy, setFixBusy] = useState(false)
  const [showAgent, setShowAgent] = useState(true)
  const [showTerminal, setShowTerminal] = useState(true)
  const [agentThinking, setAgentThinking] = useState(false)
  const [approveBusy, setApproveBusy] = useState(false)
  const [runBusy, setRunBusy] = useState(false)
  const [terminalRunning, setTerminalRunning] = useState(false)
  const [terminalInputSuggested, setTerminalInputSuggested] = useState(false)
  const [operationBusy, setOperationBusy] = useState(false)
  const [bottomTab, setBottomTab] = useState('chat')
  const [chatResetToken, setChatResetToken] = useState(0)
  const lastPersistedRef = useRef('')
  const skipHydrateSave = useRef(false)
  const lastRuntimeErrorRef = useRef('')
  const lastFixTriggerRef = useRef('')

  const refreshFiles = useCallback(async () => {
    try {
      const list = await fetchFileList()
      setFiles(list)
      return list
    } catch {
      setFiles([])
      return []
    }
  }, [])

  const loadFileIntoEditor = useCallback(async (relativePath) => {
    if (!relativePath || typeof relativePath !== 'string') return

    skipHydrateSave.current = true
    setSaveStatus('saving')

    try {
      const snapshot = await fetchFileContent(relativePath)
      const body = snapshot.content ?? ''

      lastPersistedRef.current = body
      setSelectedFile(relativePath)
      setEditorContents(body)
      setSaveStatus('saved')
    } catch {
      lastPersistedRef.current = ''
      setSelectedFile(relativePath)
      setEditorContents('')
      setSaveStatus('idle')
    } finally {
      setTimeout(() => {
        skipHydrateSave.current = false
      }, 250)
    }
  }, [])

  const persistFile = useCallback(async () => {
    if (!selectedFile) return
    setSaveStatus('saving')
    try {
      await saveFileContent(selectedFile, editorContents)
      lastPersistedRef.current = editorContents
      void refreshFiles()
      setSaveStatus('saved')
    } catch {
      setSaveStatus('error')
      setTerminalLines((prev) => [...prev, { stream: 'stderr', line: 'Autosave failed' }])
    }
  }, [editorContents, refreshFiles, selectedFile])

  const handleExport = useCallback(() => {
    if (!editorContents.trim()) return

    const code = editorContents
    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = selectedFile || 'code.py'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    // Optional: show toast
    setTerminalLines((prev) => [...prev, { stream: 'stdout', line: 'File exported to Downloads' }])
  }, [editorContents, selectedFile])

  useEffect(() => {
    void refreshFiles()
    // Auto-clear chat history on load (Codex style)
    setMessages([welcomeMessage])
    // Reset backend session
    void resetAgentSession()
  }, [refreshFiles])

  useEffect(() => {
    if (!selectedFile) return
    if (skipHydrateSave.current) return

    const handler = window.setTimeout(() => {
      if (editorContents === lastPersistedRef.current) return
      void persistFile()
    }, 900)

    return () => window.clearTimeout(handler)
  }, [editorContents, persistFile, selectedFile])

  const appendAssistantBubble = useCallback((text, trace) => {
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: text,
        trace: trace ?? [],
      },
    ])
  }, [])

  const applyAgentTerminal = useCallback((bundleLines) => {
    const normalized = normalizeTerminalLines(bundleLines)
    if (!normalized.length) return

    setTerminalLines((prev) => [...prev, ...normalized])
  }, [])

  const requestFixSuggestion = useCallback(
    async (errorText, source = 'manual') => {
      if (!selectedFile || !editorContents.trim()) return

      const diagnostics = editorDiagnostics.map((m) => ({
        message: m.message,
        severity: m.severity,
        startLine: m.startLineNumber,
        endLine: m.endLineNumber,
      }))

      const normalizedError = String(errorText || '').trim()
      if (!normalizedError && diagnostics.length === 0) return

      const fingerprint = `${selectedFile}|${normalizedError}|${editorContents.length}|${diagnostics.length}|${source}`
      if (lastFixTriggerRef.current === fingerprint) return
      lastFixTriggerRef.current = fingerprint

      setFixBusy(true)
      setAgentThinking(true)
      try {
        const fix = await suggestFix({
          filename: selectedFile,
          code: editorContents,
          error: normalizedError,
          diagnostics,
        })

        if (fix.type === 'raw_response') {
          appendAssistantBubble(
            `Fix parser fallback (${source}):\n\n\`\`\`\n${fix.raw_response || fix.error || 'No raw response'}\n\`\`\``,
            [],
          )
          return
        }

        setFixSuggestion({
          proposalId: crypto.randomUUID(),
          filename: fix.file || selectedFile,
          before: editorContents,
          after: extractCode(fix.fixed_code),
          thought: fix.summary,
          actionType: 'suggest_fix',
        })
        setPendingApproval(null)
        setShowAgent(true)
        setBottomTab('chat')
        appendAssistantBubble(
          `Suggested fix for \`${fix.file || selectedFile}\`. Review changes before applying.`,
          [],
        )
      } catch (error) {
        applyAgentTerminal([{ stream: 'stderr', line: `[fix-agent] ${error.message}` }])
      } finally {
        setFixBusy(false)
        setAgentThinking(false)
      }
    },
    [selectedFile, editorContents, editorDiagnostics, appendAssistantBubble, applyAgentTerminal],
  )

  useEffect(() => {
    const unsubscribe = subscribeTerminalStream((event) => {
      if (!event || typeof event !== 'object') return
      if (event.type === 'status') {
        setTerminalRunning(Boolean(event.running))
        if (!event.running) setTerminalInputSuggested(false)
        return
      }
      if (event.type === 'stdout' || event.type === 'stderr') {
        const line = String(event.data ?? '')
        if (line.trim().length > 0) {
          applyAgentTerminal([{ stream: event.type, line }])
          if (event.type === 'stderr') {
            lastRuntimeErrorRef.current = line
          }
          if (/(enter|input|:)\s*$/im.test(line) || /(enter|input)/i.test(line)) {
            setTerminalInputSuggested(true)
            setBottomTab('terminal')
          }
        }
        return
      }
      if (event.type === 'stdin') {
        applyAgentTerminal([{ stream: 'stdout', line: `> ${event.data}` }])
        setTerminalInputSuggested(false)
        return
      }
      if (event.type === 'exit') {
        applyAgentTerminal([{ stream: 'stdout', line: `Process exited with code ${event.code}` }])
        setTerminalRunning(false)
        setTerminalInputSuggested(false)
        if (event.success === false && String(event.stderr || '').trim()) {
          lastRuntimeErrorRef.current = String(event.stderr)
        }
      }
    })
    return () => unsubscribe()
  }, [applyAgentTerminal])

  const handleAgentBundle = useCallback(
    (bundle) => {
      if (bundle.observationBanner) {
        setTerminalLines((prev) => [...prev, { stream: 'stdout', line: bundle.observationBanner }])
      }

      applyAgentTerminal(bundle.terminalLines ?? [])

      if (bundle.agentTrace?.length) {
        const enriched = bundle.agentTrace.map((step) => ({
          phase: `${step.phase ?? 'step'}${step.iteration ? ` #${step.iteration}` : ''}`,
          label: step.uiLabel ?? step.label ?? step.phase,
          thought: step.thought,
          plan: step.plan,
          agentAction: step.action ?? step.agentAction ?? step.phase,
          observation: step.observation,
          diff: step.diff,
        }))
        setAgentTraceLog((prev) => [...prev, ...enriched])
      }

      if (bundle.pendingApproval) {
        setPendingApproval(bundle.pendingApproval)
        appendAssistantBubble(bundle.assistantMessage ?? 'Awaiting approval for file changes.', bundle.agentTrace)
        void refreshFiles()

        setBottomTab('chat')
      } else {
        appendAssistantBubble(bundle.assistantMessage ?? '(no textual summary)', bundle.agentTrace)
      }

      if (!bundle.pendingApproval) void refreshFiles()
    },
    [appendAssistantBubble, applyAgentTerminal, refreshFiles],
  )

  const handleSend = async (text) => {
    setAgentThinking(true)
    setPendingApproval(null)
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'user', content: text, trace: [] }])
    try {
      const bundle = await postAgentMessage(text)
      handleAgentBundle(bundle)

      await refreshFiles()
      if (selectedFile) await loadFileIntoEditor(selectedFile)
    } catch (error) {
      appendAssistantBubble(`**Agent offline**: ${error.message}`, [])
      setTerminalLines((prev) => [...prev, { stream: 'stderr', line: error.message }])
    } finally {
      setAgentThinking(false)
    }
  }

  const handleApproveProposal = async (editedContent) => {
    if (!pendingApproval?.proposalId) return
    const targetFile = pendingApproval.filename

    setApproveBusy(true)
    try {
      const bundle = await approveAgentProposal(pendingApproval.proposalId, editedContent)
      setPendingApproval(null)

      handleAgentBundle(bundle)

      await refreshFiles()

      if (!bundle.pendingApproval && targetFile) await loadFileIntoEditor(targetFile)
      setBottomTab('terminal')
    } catch (error) {
      setTerminalLines((prev) => [...prev, { stream: 'stderr', line: error.message }])
    } finally {
      setApproveBusy(false)
    }
  }

  const handleRejectProposal = () => {
    appendAssistantBubble('Change rejected — tell me how you want to proceed.')
    setPendingApproval(null)
  }

  const handleApplyFixSuggestion = async (fixedCode) => {
    if (!fixSuggestion || !selectedFile) return
    setFixBusy(true)
    const cleanCode = extractCode(fixedCode)
    setEditorContents(cleanCode)
    setFixSuggestion(null)
    setSaveStatus('saving')
    try {
      await saveFileContent(selectedFile, cleanCode)
      lastPersistedRef.current = cleanCode
      setSaveStatus('saved')
      appendAssistantBubble('Fix suggestion ready. Code updated.', [])
      applyAgentTerminal([{ stream: 'stdout', line: 'Code updated' }])
    } catch (error) {
      setSaveStatus('error')
      applyAgentTerminal([{ stream: 'stderr', line: `[apply-fix] ${error.message}` }])
    } finally {
      setFixBusy(false)
    }
  }

  const handleRejectFixSuggestion = () => {
    setFixSuggestion(null)
    appendAssistantBubble('Fix suggestion rejected. You can run again or request another fix.', [])
  }

  const handleRun = async (code, language) => {
    setRunBusy(true)
    setTerminalRunning(true)
    setTerminalInputSuggested(false)
    applyAgentTerminal([{ stream: 'stdout', line: `▶︎ run ${language} (interactive)` }])

    try {
      const result = await execSnippet(language, code)
      appendAssistantBubble(
        `Execution started${result?.pid ? ` (pid ${result.pid})` : ''}. Terminal is streaming live output.`,
        [],
      )
      setBottomTab('terminal')
    } catch (error) {
      applyAgentTerminal([{ stream: 'stderr', line: error.message }])
      setTerminalRunning(false)
    } finally {
      setRunBusy(false)
    }
  }

  const handleFixCode = async () => {
    const syntaxMessages = editorDiagnostics
      .map((d) => d.message)
      .filter(Boolean)
      .slice(0, 5)
      .join('\n')

    const contextError = [lastRuntimeErrorRef.current, syntaxMessages]
      .filter(Boolean)
      .join('\n')

    await requestFixSuggestion(contextError, 'manual')
  }

  const handleTerminalInput = async (value) => {
    try {
      await sendTerminalInput(value)
      setTerminalInputSuggested(false)
    } catch (error) {
      applyAgentTerminal([{ stream: 'stderr', line: error.message }])
    }
  }

  const handleNewProject = async () => {
    if (!window.confirm('Reset workspace and agent memory?')) return
    setOperationBusy(true)
    try {
      await resetWorkspace()
      lastPersistedRef.current = ''
      setSelectedFile(null)
      setEditorContents('')
      setMessages([welcomeMessage])
      setTerminalLines([])
      setAgentTraceLog([])
      setPendingApproval(null)
      setFixSuggestion(null)
      await refreshFiles()
    } catch (error) {
      setTerminalLines((prev) => [...prev, { stream: 'stderr', line: error.message }])
    } finally {
      setOperationBusy(false)
    }
  }

  const clearChat = async () => {
    if (!window.confirm('Are you sure you want to clear chat?')) return

    setOperationBusy(true)
    try {
      await resetAgentSession()
      setMessages([welcomeMessage])
      setTerminalLines([])
      setAgentTraceLog([])
      setPendingApproval(null)
      setFixSuggestion(null)
      setAgentThinking(false)
      setApproveBusy(false)
      setRunBusy(false)
      setTerminalRunning(false)
      setTerminalInputSuggested(false)
      setBottomTab('chat')
      setChatResetToken((prev) => prev + 1)
    } catch (error) {
      setTerminalLines((prev) => [...prev, { stream: 'stderr', line: error.message }])
    } finally {
      setOperationBusy(false)
    }
  }

  const handleNewFilePrompt = () => {
    const name = window.prompt('Relative path (e.g. src/app.js)', 'main.js')
    if (!name) return
    const normalized = name.replace(/^\//, '')
    setSelectedFile(normalized)
    setEditorContents('// new file\n')
    lastPersistedRef.current = ''
    void saveFileContent(normalized, '// new file\n')
      .then(() => refreshFiles())
      .catch((error) => setTerminalLines((prev) => [...prev, { stream: 'stderr', line: error.message }]))
  }

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-100">
      <div className="flex min-h-0 flex-1">
        <FileExplorer
          files={files}
          selected={selectedFile}
          onSelectFile={(file) => void loadFileIntoEditor(file)}
          busy={operationBusy}
          onNewProject={handleNewProject}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-end gap-2 border-b border-slate-800 bg-slate-900/40 px-3 py-2 text-xs">
            <button
              type="button"
              onClick={() => void clearChat()}
              disabled={operationBusy}
              className="rounded-lg border border-slate-700 px-3 py-1 text-slate-200 hover:border-slate-500 disabled:opacity-40"
            >
              Clear Chat
            </button>
            <button
              type="button"
              onClick={() => setShowAgent((v) => !v)}
              className="rounded-lg border border-slate-700 px-3 py-1 text-slate-200 hover:border-slate-500"
            >
              {showAgent ? 'Hide Agent' : 'Show Agent'}
            </button>
            <button
              type="button"
              onClick={() => setShowTerminal((v) => !v)}
              className="rounded-lg border border-slate-700 px-3 py-1 text-slate-200 hover:border-slate-500"
            >
              {showTerminal ? 'Hide Terminal' : 'Show Terminal'}
            </button>
            {fixSuggestion && (
              <span className="rounded-full bg-amber-500 px-2 py-1 text-[10px] font-semibold text-slate-950">
                Fix available
              </span>
            )}
          </div>
          <div className="flex min-h-0 flex-1">
            {showAgent && (
              <Chat
                messages={messages}
                onSend={handleSend}
                pendingApproval={fixSuggestion || pendingApproval}
                approveBusy={approveBusy || fixBusy}
                onApprove={fixSuggestion ? handleApplyFixSuggestion : handleApproveProposal}
                onReject={fixSuggestion ? handleRejectFixSuggestion : handleRejectProposal}
                agentThinking={agentThinking}
                resetToken={chatResetToken}
              />
            )}
            <WorkspaceEditor
              activeFile={selectedFile}
              contents={editorContents}
              onChange={setEditorContents}
              onDiagnosticsChange={setEditorDiagnostics}
              onSaveNow={persistFile}
              onRun={handleRun}
              onFixCode={handleFixCode}
              onCreateFileRequest={handleNewFilePrompt}
              onExport={handleExport}
              runBusy={runBusy}
              saveStatus={saveStatus}
              errorCount={editorDiagnostics.length}
            />
          </div>
          {showTerminal && (
            <BottomPanel
              activeTab={bottomTab}
              setActiveTab={setBottomTab}
              terminalLines={terminalLines}
              agentTraceLog={agentTraceLog}
              flatFiles={files}
              selectedFile={selectedFile}
              onPickFile={(file) => void loadFileIntoEditor(file)}
              terminalRunning={terminalRunning}
              terminalInputEnabled={terminalRunning}
              terminalInputSuggested={terminalInputSuggested}
              onTerminalInput={handleTerminalInput}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default AgentWorkbench
