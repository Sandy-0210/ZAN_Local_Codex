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
