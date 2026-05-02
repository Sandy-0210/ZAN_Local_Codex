const { chat } = require('./ollamaClient')

function extractCode(text) {
  const raw = String(text ?? '')
  const match = raw.match(/```[a-z]*\n([\s\S]*?)```/i)
  if (match && match[1]) return match[1].trim()
  return raw.trim()
}

async function suggestFix({ filename, code, error, diagnostics = [] }) {
  const fixPrompt = [
    'You are an expert Python developer.',
    'Fix the given code based on the error.',
    '',
    'Rules:',
    '- Return FULL corrected code',
    '- Do NOT explain',
    '- Do NOT return partial code',
    '- Do NOT return JSON',
    '- ONLY return code inside ```python block',
    '',
    `filename: ${filename}`,
    `runtime_error: ${error || ''}`,
    `syntax_diagnostics: ${JSON.stringify(diagnostics)}`,
    'original_code:',
    code ?? '',
  ].join('\n')

  const { content } = await chat([
    { role: 'system', content: 'Return ONLY the fixed full code inside triple backticks. Do not return JSON.' },
    { role: 'user', content: fixPrompt },
  ])

  const fixedCode = extractCode(content)
  if (!fixedCode.trim()) {
    return { ok: false, error: 'No code extracted from model output', raw: String(content ?? '') }
  }

  return {
    ok: true,
    value: {
      type: 'suggestion',
      file: filename,
      fixed_code: fixedCode,
      summary: 'Fix suggestion ready',
      raw_response: String(content ?? ''),
    },
  }
}

module.exports = {
  suggestFix,
}
