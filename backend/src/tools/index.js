const {
  createFile,
  readFile,
  updateFile,
  deleteFile,
  listFiles,
} = require('./filesystem')
const { runCode } = require('./runtime')
const { resolveSafe } = require('./paths')

async function readFileGuarded(relPath) {
  try {
    const body = await readFile(relPath)
    return { ok: true, path: relPath, content: body }
  } catch (e) {
    return {
      ok: false,
      path: relPath,
      content: '',
      error: e.message,
    }
  }
}

async function applyCreateOrUpdate(relPath, content, isCreate) {
  try {
    if (isCreate) {
      await createFile(relPath, content)
    } else {
      await updateFile(relPath, content)
    }
    return { ok: true, path: relPath }
  } catch (e) {
    return { ok: false, path: relPath, error: e.message }
  }
}

async function deleteFileGuarded(relPath) {
  try {
    await deleteFile(relPath)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

async function listFilesSafe(subdir = '') {
  try {
    const paths = await listFiles(subdir)
    return { ok: true, files: paths }
  } catch (e) {
    return { ok: false, error: e.message, files: [] }
  }
}

async function execTool(action, input) {
  switch (action) {
    case 'create_file':
    case 'createFile': {
      const filename = input?.filename
      const content = input?.content ?? ''
      await createFile(filename, content)
      return await readFileGuarded(filename)
    }
    case 'edit_file':
    case 'update_file':
    case 'editFile':
    case 'updateFile': {
      const filename = input?.filename
      const content = input?.content ?? ''
      await updateFile(filename, content)
      return await readFileGuarded(filename)
    }
    case 'read_file':
    case 'readFile': {
      return await readFileGuarded(input?.filename)
    }
    case 'delete_file':
    case 'deleteFile': {
      return await deleteFileGuarded(input?.filename)
    }
    case 'list_files':
    case 'listFiles':
      return await listFilesSafe(input?.subdir ?? '')
    case 'run_code':
    case 'runCode': {
      const sessionId = String(input?.sessionId ?? 'agent')
      const defaultTimeout = sessionId === 'agent' ? 8000 : 30_000
      const out = await runCode(input?.language || 'javascript', input?.code || '', {
        sessionId,
        stdin: input?.stdin || [],
        waitForExit: input?.waitForExit !== false,
        timeoutMs: Number.isFinite(input?.timeoutMs) ? input.timeoutMs : defaultTimeout,
      })
      return {
        stdout: out.stdout,
        stderr: out.stderr,
        exitCode: out.exitCode,
        started: out.started,
        pid: out.pid,
      }
    }
    default:
      return { ok: false, error: `Unknown tool action: ${action}` }
  }
}

module.exports = {
  execTool,
  applyCreateOrUpdate,
  readFileGuarded,
  resolveSafePath: resolveSafe,
}
