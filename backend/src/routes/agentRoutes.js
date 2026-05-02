const express = require('express')
const { handleUserMessage, handleApproval, loadWorkspaceChat } = require('../agent/agentLoop')
const { getWorkspaceRoot } = require('../tools/paths')
const { getAgentBrain } = require('./agentRegistry')
const { suggestFix } = require('../agent/fixAgent')

const router = express.Router()

router.get('/history', async (_req, res) => {
  const histories = await loadWorkspaceChat(getWorkspaceRoot())
  res.json({ histories })
})

router.post('/message', async (req, res) => {
  const { text } = req.body ?? {}
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'text required' })
  }

  const state = await getAgentBrain()

  try {
    const bundle = await handleUserMessage(getWorkspaceRoot(), state, text.trim())

    res.json({
      assistantMessage: bundle.assistantMessage,
      finished: bundle.finished ?? true,
      pendingApproval: bundle.pendingApproval ?? null,
      agentTrace: bundle.steps ?? [],
      terminalLines: bundle.terminalChunk ?? [],
    })
  } catch (error) {
    res.status(500).json({
      error: error.message ?? 'agent_failed',
    })
  }
})

router.post('/approve', async (req, res) => {
  const { proposalId, content } = req.body ?? {}
  if (!proposalId || typeof proposalId !== 'string') {
    return res.status(400).json({ error: 'proposalId required' })
  }

  const state = await getAgentBrain()

  try {
    const bundle = await handleApproval(
      getWorkspaceRoot(),
      state,
      proposalId,
      typeof content === 'string' ? content : undefined,
    )

    res.json({
      assistantMessage: bundle.assistantMessage,
      finished: bundle.finished ?? true,
      pendingApproval: bundle.pendingApproval ?? null,
      agentTrace: bundle.steps ?? [],
      terminalLines: bundle.terminalChunk ?? [],
      observationBanner: bundle.observationBanner,
    })
  } catch (error) {
    res.status(400).json({ error: error.message ?? 'approval_failed' })
  }
})

router.post('/suggest-fix', async (req, res) => {
  const { filename, code, error, diagnostics } = req.body ?? {}
  if (!filename || typeof filename !== 'string') {
    return res.status(400).json({ error: 'filename required' })
  }
  if (typeof code !== 'string') {
    return res.status(400).json({ error: 'code required' })
  }

  try {
    const result = await suggestFix({
      filename,
      code,
      error: typeof error === 'string' ? error : '',
      diagnostics: Array.isArray(diagnostics) ? diagnostics : [],
    })
    if (!result.ok) {
      return res.json({
        type: 'raw_response',
        error: result.error || 'fix_suggestion_failed',
        raw_response: result.raw || '',
      })
    }
    return res.json(result.value)
  } catch (errorObj) {
    return res.status(500).json({ error: errorObj.message ?? 'fix_suggestion_failed' })
  }
})

module.exports = router
