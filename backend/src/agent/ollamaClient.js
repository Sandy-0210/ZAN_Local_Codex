const OLLAMA_URL = process.env.OLLAMA_URL ?? 'http://localhost:11434'
const MODEL = process.env.OLLAMA_MODEL ?? 'llama3'

async function chat(messages) {
  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages,
      stream: false,
    }),
  })

  if (!response.ok) {
    const txt = await response.text()
    throw new Error(`Ollama chat failed: ${response.status} ${txt}`)
  }

  const data = await response.json()
  const content = data.message?.content ?? ''
  return { content: String(content).trimEnd(), raw: data }
}

module.exports = { chat, MODEL }
