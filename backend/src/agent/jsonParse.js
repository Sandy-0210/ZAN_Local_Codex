function extractJsonCandidate(raw) {
  const text = String(raw ?? '').trim()
  if (!text) return ''

  try {
    JSON.parse(text)
    return text
  } catch {
    //
  }

  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence) {
    return fence[1].trim()
  }

  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start !== -1 && end > start) {
    return text.slice(start, end + 1)
  }

  return text
}

function safeParse(jsonString) {
  const source = String(jsonString ?? '')
  try {
    return JSON.parse(source)
  } catch {
    const fixed = source
      .replace(/\n/g, '\\n')
      .replace(/\t/g, '\\t')
      .replace(/\r/g, '\\r')
    try {
      return JSON.parse(fixed)
    } catch {
      return null
    }
  }
}

const ALLOWED_ACTIONS = new Set(['create_file', 'edit_file', 'run_code', 'fix_error', 'none'])

/** Legacy chatbot-shaped responses (rejected for autonomous agent). */
function parseAgentJson(raw) {
  const parsed = safeParse(extractJsonCandidate(raw))
  if (!parsed) {
    return {
      thought: '',
      action: 'none',
      input: {},
      response: String(raw ?? '').slice(0, 2000) || '(empty model output)',
    }
  }
  return parsed
}

/**
 * Parses and validates autonomous agent schema. Does NOT coerce invalid models into dummy objects.
 */
function parseStrictAgentJson(raw) {
  const candidate = extractJsonCandidate(raw)
  if (!candidate) {
    return { ok: false, error: 'Empty model output', raw: String(raw ?? '') }
  }

  const obj = safeParse(candidate)
  if (!obj) {
    return { ok: false, error: 'Invalid JSON', raw: String(raw ?? '') }
  }

  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return { ok: false, error: 'Root must be a JSON object', raw: String(raw ?? '') }
  }

  const requiredKeys = ['thought', 'plan', 'action', 'target', 'code', 'run', 'response']
  for (const key of requiredKeys) {
    if (!(key in obj)) {
      return { ok: false, error: `Missing required key "${key}"`, raw: String(raw ?? '') }
    }
  }

  const action = String(obj.action || '')
    .toLowerCase()
    .replace(/\s+/g, '_')

  const normalized =
    ({ createfile: 'create_file', editfile: 'edit_file', fixerror: 'fix_error', runcode: 'run_code', run_code: 'run_code' }[action]) ||
    action

  if (!ALLOWED_ACTIONS.has(normalized)) {
    return {
      ok: false,
      error: `Invalid action "${obj.action}". Must be one of: ${[...ALLOWED_ACTIONS].join(', ')}`,
      raw: String(raw ?? ''),
    }
  }

  if (!Array.isArray(obj.plan)) {
    return { ok: false, error: '"plan" must be an array of strings', raw: String(raw ?? '') }
  }

  obj.plan = obj.plan.map((p) => String(p))

  obj.action = normalized
  obj.thought = String(obj.thought ?? '')
  obj.target = String(obj.target ?? '')
  obj.code = String(obj.code ?? '')
  obj.response = String(obj.response ?? '')

  const run = obj.run
  if (!run || typeof run !== 'object') {
    return { ok: false, error: '"run" must be an object', raw: String(raw ?? '') }
  }

  const rl = String(run.language ?? 'python').toLowerCase()
  const normalizedLang =
    rl === 'py' || rl === 'python'
      ? 'python'
      : rl === 'js' || rl === 'node' || rl === 'javascript'
        ? 'javascript'
        : ''

  if (!normalizedLang) {
    return {
      ok: false,
      error:
        '"run.language" must be "python" or "javascript"',
      raw: String(raw ?? ''),
    }
  }

  obj.run = {
    language: normalizedLang,
    stdin: Array.isArray(run.stdin) ? run.stdin.map((s) => String(s)) : [],
  }

  if (
    normalized !== 'none' &&
    ['create_file', 'edit_file', 'fix_error'].includes(normalized) &&
    obj.target.includes('..')
  ) {
    return { ok: false, error: '"target" must not contain ".."', raw: String(raw ?? '') }
  }

  if (normalized !== 'none' && obj.plan.length === 0) {
    return { ok: false, error: '"plan" must be non-empty unless action is "none"', raw: String(raw ?? '') }
  }

  return { ok: true, value: obj }
}

module.exports = { parseAgentJson, parseStrictAgentJson }
