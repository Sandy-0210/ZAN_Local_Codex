const fs = require('fs/promises')
const path = require('path')
const { getWorkspaceRoot, resolveSafe } = require('./paths')

async function createFile(relPath, content) {
  const target = resolveSafe(relPath)
  await fs.mkdir(path.dirname(target), { recursive: true })
  await fs.writeFile(target, content ?? '', 'utf8')
  return { ok: true, path: relPath, message: 'File created.' }
}

async function readFile(relPath) {
  const target = resolveSafe(relPath)
  const buf = await fs.readFile(target, 'utf8')
  return buf
}

async function updateFile(relPath, content) {
  const target = resolveSafe(relPath)
  await fs.mkdir(path.dirname(target), { recursive: true })
  await fs.writeFile(target, content ?? '', 'utf8')
  return { ok: true, path: relPath, message: 'File updated.' }
}

async function deleteFile(relPath) {
  await fs.unlink(resolveSafe(relPath))
  return { ok: true, path: relPath, message: 'File deleted.' }
}

async function listFiles(subdir = '') {
  const root = getWorkspaceRoot()
  const scoped = subdir ? resolveSafe(subdir.replace(/^[/\\]+/, '')) : root
  const result = []

  async function walk(dir, relPrefix) {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const ent of entries) {
      const name = ent.name
      if (name === '.gitkeep') continue
      if (name === '.agent-chat.json') continue
      if (name === '.tmp_exec') continue
      if (name.startsWith('.agent')) continue

      const rel = path.join(relPrefix, name).replace(/\\/g, '/')
      const full = path.join(dir, name)

      if (ent.isDirectory()) await walk(full, rel)
      else result.push(rel)
    }
  }

  await walk(scoped, subdir.replace(/^[/\\]+/, ''))

  result.sort((a, b) => a.localeCompare(b))
  return result
}

module.exports = {
  createFile,
  readFile,
  updateFile,
  deleteFile,
  listFiles,
  getWorkspaceRoot,
}
