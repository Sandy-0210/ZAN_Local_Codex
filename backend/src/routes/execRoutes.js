const express = require('express')
const { runCode, writeStdin, subscribeToRuntime } = require('../tools/runtime')

const router = express.Router()

router.post('/', async (req, res) => {
  const { language, code, stdin, sessionId } = req.body ?? {}
  const result = await runCode(language ?? 'javascript', code ?? '', {
    sessionId: sessionId ?? 'terminal',
    stdin: Array.isArray(stdin) ? stdin : [],
    waitForExit: false,
  })
  res.json(result)
})

router.post('/input', (req, res) => {
  const { input, sessionId } = req.body ?? {}
  const result = writeStdin(sessionId ?? 'terminal', input ?? '')
  if (!result.ok) {
    return res.status(400).json(result)
  }
  return res.json(result)
})

router.get('/stream', (req, res) => {
  const sessionId = typeof req.query.sessionId === 'string' ? req.query.sessionId : 'terminal'
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders?.()

  const send = (payload) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`)
  }

  const unsubscribe = subscribeToRuntime(sessionId, send)

  req.on('close', () => {
    unsubscribe()
    res.end()
  })
})

module.exports = router
