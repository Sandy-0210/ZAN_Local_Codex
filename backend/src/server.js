const express = require('express')
const cors = require('cors')

const agentRoutes = require('./routes/agentRoutes')
const fileRoutes = require('./routes/fileRoutes')
const execRoutes = require('./routes/execRoutes')
const workspaceRoutes = require('./routes/workspaceRoutes')

const { resetAgentBrain } = require('./routes/agentRegistry')
const { resetRuntimeState, writeStdin } = require('./tools/runtime')

const app = express()
const PORT = process.env.PORT || 5050

// ✅ CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || "https://frontend-five-cyan-14.vercel.app/"
}))

// ✅ JSON
app.use(express.json({ limit: '2mb' }))

// ✅ Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`)
  next()
})

// ✅ Timeout safety
app.use((req, res, next) => {
  res.setTimeout(30000, () => {
    res.status(408).json({ error: "Request timeout" })
  })
  next()
})

// ✅ Health routes
app.get('/api/health', (_req, res) => {
  res.json({ status: "ok" })
})

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

// ✅ Routes
app.use('/api/agent', agentRoutes)
app.use('/api/files', fileRoutes)
app.use('/api/exec', execRoutes)
app.use('/api/workspace', workspaceRoutes)

// ✅ Reset
app.post('/api/reset', async (_req, res) => {
  try {
    await resetRuntimeState()
    await resetAgentBrain()
    res.json({ ok: true })
  } catch (error) {
    res.status(500).json({ error: error.message ?? 'reset_failed' })
  }
})

// ✅ Terminal input
app.post('/api/input', (req, res) => {
  const { input, sessionId } = req.body ?? {}
  const result = writeStdin(sessionId ?? 'terminal', input ?? '')
  if (!result.ok) return res.status(400).json(result)
  return res.json(result)
})

// ✅ Error handler
app.use((err, _req, res, _next) => {
  res.status(500).json({ error: err.message ?? 'internal_error' })
})

// ✅ Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})