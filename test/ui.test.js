
import test from 'node:test'
import assert from 'node:assert/strict'
import { createUi } from '../lib/ui.js'

test('color returns plain text when colors are disabled', () => {
  const { color } = createUi({ useColors: false })

  assert.equal(color('Hello', 'cyan'), 'Hello')
})

test('color converts values to strings when colors are disabled', () => {
  const { color } = createUi({ useColors: false })

  assert.equal(color(123, 'green'), '123')
  assert.equal(color(null, 'red'), 'null')
})

test('color wraps text in ANSI codes when colors are enabled', () => {
  const { color } = createUi({ useColors: true })

  assert.equal(color('Hello', 'cyan'), '\x1b[36mHello\x1b[0m')
  assert.equal(color('Warning', 'yellow'), '\x1b[33mWarning\x1b[0m')
})

test('color returns plain text for an unknown shade', () => {
  const { color } = createUi({ useColors: true })

  assert.equal(color('Hello', 'purple'), 'Hello')
})

test('printHeader logs the default section and workspace', () => {
  const lines = []
  const { printHeader } = createUi({
    useColors: false,
    log: (...args) => lines.push(args.join(' ')),
  })

  printHeader('/projects')

  assert.deepEqual(lines, [
    '',
    '+----------------------------------------+',
    '|          DEV WORKSPACE CLI             |',
    '+----------------------------------------+',
    '',
    '  PROJECT EXPLORER',
    '  Workspace: /projects',
    '',
  ])
})

test('printHeader supports a custom section', () => {
  const lines = []
  const { printHeader } = createUi({
    useColors: false,
    log: (...args) => lines.push(args.join(' ')),
  })

  printHeader('/projects', 'PROJECT SCRIPTS')

  assert.ok(lines.includes('  PROJECT SCRIPTS'))
  assert.ok(lines.includes('  Workspace: /projects'))
})

test('printHeader applies colors when enabled', () => {
  const lines = []
  const { printHeader } = createUi({
    useColors: true,
    log: (...args) => lines.push(args.join(' ')),
  })

  printHeader('/projects')

  assert.equal(lines[1], '\x1b[36m+----------------------------------------+\x1b[0m')
  assert.equal(
    lines[2],
    '\x1b[36m|\x1b[0m          DEV WORKSPACE CLI             \x1b[36m|\x1b[0m',
  )
  assert.equal(lines[3], '\x1b[36m+----------------------------------------+\x1b[0m')
})
