
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

    assert.ok(lines.some(line => line.includes('DEV WORKSPACE CLI')))
    assert.ok(lines.some(line => line.includes('DEVELOPER TOOLKIT')))
    assert.ok(lines.some(line => line.includes('WORKSPACE')))
    assert.ok(lines.some(line => line.includes('/projects')))
    assert.ok(lines.some(line => line.includes('PROJECT EXPLORER')))
})

test('printHeader supports a custom section', () => {
    const lines = []
    const { printHeader } = createUi({
        useColors: false,
        log: (...args) => lines.push(args.join(' ')),
    })

    printHeader('/projects', 'PROJECT SCRIPTS')

    assert.ok(lines.some(line => line.includes('PROJECT SCRIPTS')))
})

test('printHeader applies colors when enabled', () => {
    const lines = []
    const { printHeader } = createUi({
        useColors: true,
        log: (...args) => lines.push(args.join(' ')),
    })

    printHeader('/projects')

    assert.ok(lines.some(line => line.includes('\x1b[36m')))
    assert.ok(lines.some(line => line.includes('\x1b[0m')))
})
