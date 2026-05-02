export function languageFromFilename(name = '') {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''

  const map = {
    js: 'javascript',
    mjs: 'javascript',
    cjs: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    json: 'json',
    css: 'css',
    md: 'markdown',
    py: 'python',
    txt: 'plaintext',
    html: 'html',
    yaml: 'yaml',
    yml: 'yaml',
  }

  return map[ext] ?? 'plaintext'
}

export function detectRunLanguage(ext) {
  if (['py'].includes(ext)) return 'python'
  return 'javascript'
}

export function extractCode(text) {
  const raw = String(text ?? '')
  // Match ```language\ncode\n```
  const match = raw.match(/```[a-z]*\n([\s\S]*?)```/i)
  if (match && match[1]) {
    return match[1].trim()
  }
  // Failsafe: remove stray markers
  return raw
    .replace(/```[a-z]*/gi, '')
    .replace(/```/g, '')
    .trim()
}
