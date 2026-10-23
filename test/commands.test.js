import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'

import { runCommand } from '../lib/commands.js'

// Create a fake child process whose events can be triggered by each test.
function createFakeProcess() {
    const child = new EventEmitter()

    return child
}

// Run the command with a fake process and return the captured spawn call.
function createSpawnMock(child) {
    const calls = []

    function spawnMock(...args) {
        calls.push(args)
        return child
    }

    return { spawnMock, calls}
}

test('runCommand launches the selected npm script in the project directory', async () => {
    const child = createFakeProcess()
    const { spawnMock, calls } = createSpawnMock(child)

    const resultPromise = runCommand('dev', '/projects/example', { spawnProcess: spawnMock })

    assert.equal(calls.length, 1)

    const [command, args, options] = calls[0]

    assert.equal(command, 'npm')
    assert.deepEqual(args, ['run', 'dev'])
    assert.equal(options.cwd, '/projects/example')
    assert.equal(options.stdio, 'inherit')
    assert.equal('shell' in options, false)

    child.emit('close', 0, null)

    assert.deepEqual(await resultPromise, { code: 0 })
}) 

test('runCommand returns a non-zero exit code when a script fails', async () => {
  const child = createFakeProcess()
  const { spawnMock } = createSpawnMock(child)

  const resultPromise = runCommand('test', '/projects/example', {
    spawnProcess: spawnMock,
  })

  child.emit('close', 7, null)

  assert.deepEqual(await resultPromise, { code: 7 })
})

test('runCommand reports a signal when a command is interrupted', async () => {
  const child = createFakeProcess()
  const { spawnMock } = createSpawnMock(child)

  const resultPromise = runCommand('build', '/projects/example', {
    spawnProcess: spawnMock,
  })

  child.emit('close', null, 'SIGTERM')

  assert.deepEqual(await resultPromise, {
    code: null,
    signal: 'SIGTERM',
  })
})

test('runCommand provides an actionable error when npm cannot be found', async () => {
  const child = createFakeProcess()
  const { spawnMock } = createSpawnMock(child)

  const resultPromise = runCommand('dev', '/projects/example', {
    spawnProcess: spawnMock,
  })

  const originalError = Object.assign(
    new Error('spawn npm ENOENT'),
    { code: 'ENOENT' },
  )

  child.emit('error', originalError)

  await assert.rejects(resultPromise, error => {
    assert.match(error.message, /Could not find npm/)
    assert.equal(error.cause, originalError)
    return true
  })
})

test('runCommand wraps other process startup errors', async () => {
  const child = createFakeProcess()
  const { spawnMock } = createSpawnMock(child)

  const resultPromise = runCommand('dev', '/projects/example', {
    spawnProcess: spawnMock,
  })

  const originalError = Object.assign(
    new Error('Permission denied'),
    { code: 'EACCES' },
  )

  child.emit('error', originalError)

  await assert.rejects(resultPromise, error => {
    assert.match(error.message, /Could not start npm: Permission denied/)
    assert.equal(error.cause, originalError)
    return true
  })
})

test('runCommand supports a custom npm executable', async () => {
  const child = createFakeProcess()
  const { spawnMock, calls } = createSpawnMock(child)

  const resultPromise = runCommand('test', '/projects/example', {
    spawnProcess: spawnMock,
    npmCommand: 'custom-npm',
  })

  assert.equal(calls[0][0], 'custom-npm')

  child.emit('close', 0, null)

  assert.deepEqual(await resultPromise, { code: 0 })
})