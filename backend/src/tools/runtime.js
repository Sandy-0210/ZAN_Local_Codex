const { spawn } = require('child_process')
const fs = require('fs/promises')
const path = require('path')
const { getWorkspaceRoot } = require('./paths')

const activeProcesses = new Map()
const streamSubscribers = new Map()

function getSessionId(sessionId) {
  return String(sessionId || 'default')
}

function subscribeToRuntime(sessionId, send) {
  const id = getSessionId(sessionId)
  if (!streamSubscribers.has(id)) streamSubscribers.set(id, new Set())
  streamSubscribers.get(id).add(send)

  send({
    type: 'status',
    running: activeProcesses.has(id),
  })

  return () => {
    const set = streamSubscribers.get(id)
    if (!set) return
    set.delete(send)
    if (set.size === 0) streamSubscribers.delete(id)
  }
}

function emitRuntimeEvent(sessionId, event) {
  const id = getSessionId(sessionId)
  const subscribers = streamSubscribers.get(id)
  if (!subscribers || subscribers.size === 0) return
  for (const send of subscribers) send(event)
}

async function writeTempSnippet(ext, code) {
  const dir = path.join(getWorkspaceRoot(), '.tmp_exec')
  await fs.mkdir(dir, { recursive: true })
  const name = `run_${Date.now()}_${Math.random().toString(16).slice(2)}.${ext}`
  const filePath = path.join(dir, name)
  await fs.writeFile(filePath, code ?? '', 'utf8')
  return filePath
}

function writeStdin(sessionId, input) {
  const id = getSessionId(sessionId)
  const active = activeProcesses.get(id)
  if (!active || !active.process || active.process.killed) {
    return { ok: false, error: 'No active process.' }
  }

  const line = String(input ?? '')
  active.process.stdin.write(`${line}\n`)
  emitRuntimeEvent(id, {
    type: 'stdin',
    data: line,
    at: Date.now(),
  })

  return { ok: true }
}

function closeExistingProcess(sessionId) {
  const id = getSessionId(sessionId)
  const active = activeProcesses.get(id)
  if (!active || !active.process) return
  try {
    active.process.kill('SIGTERM')
  } catch {
    //
  }
  activeProcesses.delete(id)
}

function stopAllProcesses() {
  for (const [sessionId, active] of activeProcesses.entries()) {
    if (active?.process) {
      try {
        active.process.kill('SIGTERM')
      } catch {
        //
      }
    }
    activeProcesses.delete(sessionId)
    emitRuntimeEvent(sessionId, { type: 'status', running: false, at: Date.now() })
  }
}

async function clearTempSnippets() {
  const dir = path.join(getWorkspaceRoot(), '.tmp_exec')
  try {
    await fs.rm(dir, { recursive: true, force: true })
  } catch {
    //
  }
}

async function resetRuntimeState() {
  stopAllProcesses()
  await clearTempSnippets()
}

async function runCode(language, code, options = {}) {
  const lang = String(language || '').toLowerCase()
  const root = getWorkspaceRoot()
  const sessionId = getSessionId(options.sessionId)
  const waitForExit = options.waitForExit !== false
  const stdinBatch = Array.isArray(options.stdin) ? options.stdin : []
  const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : 30000

  closeExistingProcess(sessionId)

  let command = null
  let args = []
  let ext = null
  if (lang === 'javascript' || lang === 'node' || lang === 'js') {
    ext = 'mjs'
    command = 'node'
  } else if (lang === 'python' || lang === 'py') {
    ext = 'py'
    command = process.platform === 'win32' ? 'python' : 'python3'
  }

  if (!command || !ext) {
    return {
      stdout: '',
      stderr: `Unsupported language: ${language}. Use javascript or python.`,
      exitCode: -1,
      started: false,
    }
  }

  const filePath = await writeTempSnippet(ext, code)
  args = [filePath]

  const child = spawn(command, args, {
    cwd: root,
    env: {
      ...process.env,
      NODE_ENV: process.env.NODE_ENV || 'development',
    },
    stdio: 'pipe',
  })

  const runtimeState = {
    process: child,
    startedAt: Date.now(),
    stdout: '',
    stderr: '',
  }
  activeProcesses.set(sessionId, runtimeState)

  emitRuntimeEvent(sessionId, {
    type: 'status',
    running: true,
    pid: child.pid,
    language: lang,
  })

  let stdout = ''
  let stderr = ''
  let hasClosed = false
  let killedForTimeout = false

  child.stdout.on('data', (chunk) => {
    const data = chunk.toString()
    stdout += data
    runtimeState.stdout += data
    emitRuntimeEvent(sessionId, { type: 'stdout', data, at: Date.now() })
  })

  child.stderr.on('data', (chunk) => {
    const data = chunk.toString()
    stderr += data
    runtimeState.stderr += data
    emitRuntimeEvent(sessionId, { type: 'stderr', data, at: Date.now() })
  })

  for (const line of stdinBatch) {
    writeStdin(sessionId, line)
  }

  const timeoutHandle = setTimeout(() => {
    if (hasClosed) return
    killedForTimeout = true
    try {
      child.kill('SIGTERM')
    } catch {
      //
    }
  }, timeoutMs)

  const closePromise = new Promise((resolve) => {
    child.on('close', (code) => {
      hasClosed = true
      clearTimeout(timeoutHandle)
      activeProcesses.delete(sessionId)
      emitRuntimeEvent(sessionId, {
        type: 'exit',
        code: typeof code === 'number' ? code : -1,
        stdout: runtimeState.stdout,
        stderr: runtimeState.stderr,
        success: typeof code === 'number' ? code === 0 : false,
        at: Date.now(),
      })
      emitRuntimeEvent(sessionId, {
        type: 'status',
        running: false,
      })
      resolve(typeof code === 'number' ? code : -1)
    })
  })

  if (!waitForExit) {
    return {
      started: true,
      pid: child.pid,
      stdout: '',
      stderr: '',
      exitCode: null,
    }
  }

  const exitCode = await closePromise

  const finalStderr =
    killedForTimeout && !String(stderr).trim()
      ? `Execution timed out after ${timeoutMs}ms (possible infinite loop or blocking input wait).`
      : stderr

  return { stdout, stderr: finalStderr, exitCode, started: true, pid: child.pid }
}

module.exports = {
  runCode,
  writeStdin,
  subscribeToRuntime,
  resetRuntimeState,
}
