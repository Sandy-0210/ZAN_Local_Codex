const path = require('path')
const { listFiles } = require('../tools/filesystem')
const { readFileGuarded } = require('../tools/index')

const MAX_FILES = 35
const MAX_PER_FILE = 12_000
const MAX_TOTAL = 80_000

function classifyError(stderr) {
  const s = String(stderr || '').toLowerCase()
  if (!s.trim()) return null
  if (s.includes('timed out') || s.includes('possible infinite loop')) return 'timeout'
  if (s.includes('syntaxerror') || s.includes('syntax error') || s.includes('indentationerror')) return 'syntax'
  return 'runtime'
}

async function buildProjectContext(workspaceRootHint) {
  const paths = await listFiles('')

  const filtered = paths
    .filter((p) => p && !String(p).startsWith('.tmp_exec'))
    .slice(0, MAX_FILES)

  const files = {}
  let total = 0

  for (const rel of filtered) {
    const snap = await readFileGuarded(rel)
    if (!snap.ok) continue
    let content = String(snap.content ?? '')
    const origLen = content.length
    if (content.length > MAX_PER_FILE) {
      content =
        `${content.slice(0, MAX_PER_FILE)}\n\n...[truncated from ${origLen} chars]\n`
    }
    if (total + content.length > MAX_TOTAL) break
    files[rel.replace(/\\/g, '/')] = content
    total += content.length
  }

  return {
    workspaceHint: workspaceRootHint || '',
    fileList: filtered,
    files,
  }
}

function languageFromTarget(targetPath) {
  const ext = path.extname(String(targetPath || '')).toLowerCase()
  if (ext === '.py') return 'python'
  if (ext === '.js' || ext === '.mjs' || ext === '.cjs') return 'javascript'
  return null
}

module.exports = {
  buildProjectContext,
  classifyError,
  languageFromTarget,
}
