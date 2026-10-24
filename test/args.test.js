import test from 'node:test'
import assert from 'node:assert/strict'

import { HELP_TEXT, parseCliArgs } from '../lib/args.js'

test('parseCliArgs returns no options for an empty command line', () => {
  assert.deepEqual({ ...parseCliArgs([]) }, {})
})

test('parseCliArgs reads long and short flags', () => {
  assert.deepEqual(
    { ...parseCliArgs(['-w', '/projects', '-v', '-h']) },
    { workspace: '/projects', version: true, help: true },
  )
  assert.deepEqual(
    { ...parseCliArgs(['--workspace=/projects', '--config-path', '--reset']) },
    { workspace: '/projects', 'config-path': true, reset: true },
  )
})

test('parseCliArgs reads alias options', () => {
  assert.deepEqual(
    { ...parseCliArgs(['--add-alias', 'dev', '--list-aliases']) },
    { 'add-alias': 'dev', 'list-aliases': true },
  )
  assert.deepEqual(
    { ...parseCliArgs(['--remove-alias=dev']) },
    { 'remove-alias': 'dev' },
  )
})

test('parseCliArgs explains how to get help for invalid input', () => {
  for (const args of [['--nope'], ['extra'], ['--workspace']]) {
    assert.throws(
      () => parseCliArgs(args),
      error => {
        assert.match(error.message, /dev-workspace --help/)
        assert.match(error.cause.code, /^ERR_PARSE_ARGS/)
        return true
      },
    )
  }
})

test('HELP_TEXT documents every option', () => {
  for (const flag of [
    '--workspace',
    '--config-path',
    '--add-alias',
    '--remove-alias',
    '--list-aliases',
    '--reset',
    '--version',
    '--help',
    'DEV_WORKSPACE_CONFIG',
  ]) {
    assert.ok(HELP_TEXT.includes(flag), flag)
  }
})
