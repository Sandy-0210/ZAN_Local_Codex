const fs = require('fs/promises')
const path = require('path')
const { getWorkspaceRoot } = require('../tools/paths')

async function resetWorkspaceArtifacts() {
  const root = getWorkspaceRoot()

  const entries = await fs.readdir(root, { withFileTypes: true })
  for (const ent of entries) {
    await fs.rm(path.join(root, ent.name), { recursive: true, force: true })
  }

  await fs.writeFile(path.join(root, '.gitkeep'), '')
}

module.exports = { resetWorkspaceArtifacts }
