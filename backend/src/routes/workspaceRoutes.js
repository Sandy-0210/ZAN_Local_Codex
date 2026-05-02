const express = require('express')
const { resetWorkspaceArtifacts } = require('../workspace/resetWorkspace')
const { resetAgentBrain } = require('./agentRegistry')

const router = express.Router()

router.post('/new', async (_req, res) => {
  try {
    await resetWorkspaceArtifacts()
    await resetAgentBrain()
    res.json({ ok: true })
  } catch (error) {
    res.status(500).json({ error: error.message ?? 'reset_failed' })
  }
})

module.exports = router
