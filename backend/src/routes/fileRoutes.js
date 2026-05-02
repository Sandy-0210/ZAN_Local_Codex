const express = require('express')
const { listFilesSafe, execTool } = require('../tools/index')

const router = express.Router()

router.get('/', async (_req, res) => {
  const listing = await listFilesSafe('')
  res.json(listing)
})

router.get('/contents', async (req, res) => {
  const target = typeof req.query.path === 'string' ? req.query.path : ''
  if (!target.trim()) return res.status(400).json({ error: 'path required' })

  const snapshot = await execTool('readFile', { filename: target })
  if (!snapshot.ok) {
    return res.status(404).json(snapshot)
  }

  return res.json(snapshot)
})

router.put('/contents', async (req, res) => {
  const { path: relPath, content } = req.body ?? {}
  if (!relPath || typeof relPath !== 'string')
    return res.status(400).json({ error: 'path required' })

  await execTool('updateFile', { filename: relPath, content: content ?? '' }).catch((_err) => null)
  const snapshot = await execTool('readFile', { filename: relPath })
  return res.json(snapshot)
})

router.post('/', async (req, res) => {
  const { path: relPath, content } = req.body ?? {}
  if (!relPath || typeof relPath !== 'string')
    return res.status(400).json({ error: 'path required' })

  await execTool('createFile', { filename: relPath, content: content ?? '' })
  const snapshot = await execTool('readFile', { filename: relPath })

  res.status(201).json(snapshot)
})

router.delete('/contents', async (req, res) => {
  const target = typeof req.query.path === 'string' ? req.query.path : ''
  if (!target.trim()) return res.status(400).json({ error: 'path required' })

  const result = await execTool('deleteFile', { filename: target })
  return res.json(result)
})

module.exports = router
