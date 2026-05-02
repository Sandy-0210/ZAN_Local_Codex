const JSON_HEADERS = { 'Content-Type': 'application/json' }
const API_URL =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV ? 'http://localhost:5050' : undefined)

if (!API_URL && import.meta.env.PROD) {
  throw new Error('VITE_API_URL environment variable is not set. Please configure the backend URL.')
}

async function parse(res) {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || data.message || 'Request failed')
  return data
}

function handleFetchError(err) {
  console.error('Backend not reachable', err)
  throw new Error('Backend not connected. Please check server.')
}

export async function postAgentMessage(text) {
  try {
    const res = await fetch(`${API_URL}/api/agent/message`, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ text }),
    })
    return parse(res)
  } catch (err) {
    handleFetchError(err)
  }
}

export async function suggestFix(payload) {
  try {
    const res = await fetch(`${API_URL}/api/agent/suggest-fix`, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify(payload),
    })
    return parse(res)
  } catch (err) {
    throw new Error('Backend not connected. Please check server.')
  }
}

export async function approveAgentProposal(proposalId, content) {
  try {
    const res = await fetch(`${API_URL}/api/agent/approve`, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ proposalId, content }),
    })
    return parse(res)
  } catch (err) {
    console.error('Backend not reachable', err)
    throw new Error('Backend not connected. Please check server.')
  }
}

export async function fetchChatHistory() {
  try {
    const res = await fetch(`${API_URL}/api/agent/history`)
    return parse(res)
  } catch (err) {
    handleFetchError(err)
  }
}

export async function fetchFileList() {
  try {
    const res = await fetch(`${API_URL}/api/files`)
    const data = await parse(res)
    return data.files ?? []
  } catch (err) {
    handleFetchError(err)
  }
}

export async function fetchFileContent(relPath) {
  try {
    const qp = encodeURIComponent(relPath)
    const res = await fetch(`${API_URL}/api/files/contents?path=${qp}`)
    return parse(res)
  } catch (err) {
    handleFetchError(err)
  }
}

export async function saveFileContent(relPath, content) {
  try {
    const res = await fetch(`${API_URL}/api/files/contents`, {
      method: 'PUT',
      headers: JSON_HEADERS,
      body: JSON.stringify({ path: relPath, content }),
    })
    return parse(res)
  } catch (err) {
    handleFetchError(err)
  }
}

export async function execSnippet(language, code) {
  try {
    const res = await fetch(`${API_URL}/api/exec`, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ language, code, sessionId: 'terminal' }),
    })
    return parse(res)
  } catch (err) {
    handleFetchError(err)
  }
}

export async function sendTerminalInput(input) {
  try {
    const res = await fetch(`${API_URL}/api/input`, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ input, sessionId: 'terminal' }),
    })
    return parse(res)
  } catch (err) {
    handleFetchError(err)
  }
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
  stream.onerror = () => {
    onEvent({ type: 'error', message: 'Backend connection lost' })
  }
  return () => stream.close()
}

export async function resetWorkspace() {
  try {
    const res = await fetch(`${API_URL}/api/workspace/new`, { method: 'POST' })
    return parse(res)
  } catch (err) {
    handleFetchError(err)
  }
}

export async function resetAgentSession() {
  try {
    const res = await fetch(`${API_URL}/api/reset`, { method: 'POST' })
    return parse(res)
  } catch (err) {
    throw new Error('Backend not connected. Please check server.')
  }
}
