const express = require('express')
const cors = require('cors')
const agentRoutes = require('./routes/agentRoutes')
const fileRoutes = require('./routes/fileRoutes')
const execRoutes = require('./routes/execRoutes')
const workspaceRoutes = require('./routes/workspaceRoutes')
const { resetAgentBrain } = require('./routes/agentRegistry')
const { resetRuntimeState } = require('./tools/runtime')
const { writeStdin } = require('./tools/runtime')

const app = express()
const PORT = process.env.PORT || 5050

app.use(cors({
  origin: "*"
}))
app.use(express.json({ limit: '2mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ status: "ok" })
})

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

app.use('/api/agent', agentRoutes)
app.use('/api/files', fileRoutes)
app.use('/api/exec', execRoutes)
app.use('/api/workspace', workspaceRoutes)
app.post('/api/reset', async (_req, res) => {
  try {
    await resetRuntimeState()
    await resetAgentBrain()
    res.json({ ok: true })
  } catch (error) {
    res.status(500).json({ error: error.message ?? 'reset_failed' })
  }
})
app.post('/api/input', (req, res) => {
  const { input, sessionId } = req.body ?? {}
  const result = writeStdin(sessionId ?? 'terminal', input ?? '')
  if (!result.ok) return res.status(400).json(result)
  return res.json(result)
})

app.use((err, _req, res, _next) => {
  res.status(500).json({ error: err.message ?? 'internal_error' })
})

app.listen(PORT, () => {
  console.log(`Agent backend ready on http://localhost:${PORT}`)
})
