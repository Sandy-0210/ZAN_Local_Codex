const fs = require('fs/promises')
const path = require('path')
const { chat } = require('./ollamaClient')
const { SYSTEM_PROMPT } = require('./systemPrompt')

const CHAT_HISTORY_FILE = '.agent-chat.json'

async function persistWorkspaceChat(workspaceRoot, lines) {
  try {
    const file = path.join(workspaceRoot, CHAT_HISTORY_FILE)
    await fs.writeFile(file, JSON.stringify(lines.slice(-200), null, 2), 'utf8')
  } catch {
    //
  }
}

async function loadWorkspaceChat(workspaceRoot) {
  try {
    const file = path.join(workspaceRoot, CHAT_HISTORY_FILE)
    const buf = await fs.readFile(file, 'utf8')
    const arr = JSON.parse(buf)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

async function finalizeAssistant(workspaceRoot, historyLines, assistantPayload) {
  const text =
    typeof assistantPayload === 'string'
      ? assistantPayload
      : assistantPayload?.response ?? String(assistantPayload ?? '')

  historyLines.push({ role: 'assistant', ts: Date.now(), text })

  await persistWorkspaceChat(
    workspaceRoot,
    historyLines.map((row) => ({ role: row.role, text: row.text })),
  )

  return text
}

async function pushUserTurn(workspaceRoot, historyLines, messages, text) {
  historyLines.push({ role: 'user', ts: Date.now(), text })
  messages.push({ role: 'user', content: text })

  await persistWorkspaceChat(
    workspaceRoot,
    historyLines.map((row) => ({ role: row.role, text: row.text })),
  )
}

async function runSingleTurn(userText) {
  const { content } = await chat([
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userText },
  ])

  return {
    assistantMessage: String(content ?? '').trim() || 'No response generated.',
    finished: true,
    pendingApproval: null,
    steps: [],
    terminalChunk: [],
  }
}

function createInitialConversation() {
  return [{ role: 'system', content: SYSTEM_PROMPT }]
}

async function handleUserMessage(workspaceRoot, state, text) {
  await pushUserTurn(workspaceRoot, state.historyLines, state.messages, text)

  const bundle = await runSingleTurn(text)

  state.messages.push({
    role: 'assistant',
    content: bundle.assistantMessage,
  })

  await finalizeAssistant(workspaceRoot, state.historyLines, bundle.assistantMessage)

  bundle.historyLines = state.historyLines
  return bundle
}

async function handleApproval(workspaceRoot, state, proposalId, optionalEditedContent) {
  pendingApprovalById.delete(proposalId)
  void workspaceRoot
  void optionalEditedContent
  return {
    finished: true,
    assistantMessage: 'No pending autonomous edits. Use Fix Code for explicit suggestions.',
    pendingApproval: null,
    steps: [],
    terminalChunk: [],
    historyLines: state.historyLines,
  }
}

async function seedHistorySummary(workspaceRoot, state) {
  const existing = await loadWorkspaceChat(workspaceRoot)
  state.historyLines = existing

  const recap = existing
    .slice(-40)
    .filter((entry) => entry.role === 'user' || entry.role === 'assistant')
    .map((entry) => `${entry.role}:${entry.text}`)
    .join('\n')

  if (!recap) return

  const clipped = recap.length > 6000 ? `${recap.slice(0, 6000)}\n...[truncated]` : recap

  state.messages.push({
    role: 'user',
    content: `[chat-history recap]\n${clipped}`,
  })
}

async function hydrateAgentState(workspaceRoot) {
  const state = {
    messages: createInitialConversation(),
    historyLines: [],
  }

  const existing = await loadWorkspaceChat(workspaceRoot)
  state.historyLines = existing
  await persistWorkspaceChat(workspaceRoot, state.historyLines)

  return state
}

async function purgePending() {
  pendingApprovalById.clear()
}

module.exports = {
  createInitialConversation,
  handleUserMessage,
  handleApproval,
  hydrateAgentState,
  loadWorkspaceChat,
  persistWorkspaceChat,
  purgePending,
}
