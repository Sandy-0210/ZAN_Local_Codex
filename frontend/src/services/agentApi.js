const JSON_HEADERS = { 'Content-Type': 'application/json' }
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001'

async function parse(res) {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || data.message || 'Request failed')
  return data
}

export async function postAgentMessage(text) {
  const res = await fetch(`${API_URL}/api/agent/message`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ text }),
  })

  return parse(res)
}

export async function suggestFix(payload) {
  const res = await fetch(`${API_URL}/api/agent/suggest-fix`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  })
  return parse(res)
}

export async function approveAgentProposal(proposalId, content) {
  const res = await fetch(`${API_URL}/api/agent/approve`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ proposalId, content }),
  })

  return parse(res)
}

export async function fetchChatHistory() {
  const res = await fetch(`${API_URL}/api/agent/history`)
  return parse(res)
}

export async function fetchFileList() {
  const res = await fetch(`${API_URL}/api/files`)
  const data = await parse(res)
  return data.files ?? []
}

export async function fetchFileContent(relPath) {
  const qp = encodeURIComponent(relPath)
  const res = await fetch(`${API_URL}/api/files/contents?path=${qp}`)
  return parse(res)
}

export async function saveFileContent(relPath, content) {
  const res = await fetch(`${API_URL}/api/files/contents`, {
    method: 'PUT',
    headers: JSON_HEADERS,
    body: JSON.stringify({ path: relPath, content }),
  })
  return parse(res)
}

export async function execSnippet(language, code) {
  const res = await fetch(`${API_URL}/api/exec`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ language, code, sessionId: 'terminal' }),
  })
  return parse(res)
}

export async function sendTerminalInput(input) {
  const res = await fetch(`${API_URL}/api/input`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ input, sessionId: 'terminal' }),
  })
  return parse(res)
}

export function subscribeTerminalStream(onEvent) {
  const stream = new EventSource(`${API_URL}/api/exec/stream?sessionId=terminal`)
  stream.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      onEvent(data)
    } catch {
      //
    }
  }
  return () => stream.close()
}

export async function resetWorkspace() {
  const res = await fetch(`${API_URL}/api/workspace/new`, { method: 'POST' })
  return parse(res)
}

export async function resetAgentSession() {
  const res = await fetch(`${API_URL}/api/reset`, { method: 'POST' })
  return parse(res)
}
