const path = require('path')
const fs = require('fs')

const WORKSPACE_NAME = 'workspace'

function getWorkspaceRoot() {
  const root = path.join(__dirname, '..', '..', WORKSPACE_NAME)
  if (!fs.existsSync(root)) fs.mkdirSync(root, { recursive: true })
  return root
}

function resolveSafe(relPath) {
  if (typeof relPath !== 'string') throw new Error('filename must be a string')
  const trimmed = relPath.replace(/^[/\\]+/, '')
  const normalized = path.normalize(trimmed).replace(/^(\.\.(\/|\\|$))+/, '')
  const root = getWorkspaceRoot()
  const resolved = path.join(root, normalized)
  if (!resolved.startsWith(root)) {
    throw new Error('Path escapes workspace')
  }
  return resolved
}

module.exports = { getWorkspaceRoot, resolveSafe }
