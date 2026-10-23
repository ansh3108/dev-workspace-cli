import test from 'node:test'
import assert from 'node:assert/strict'
import {
  mkdtemp,
  mkdir,
  rm,
  writeFile,
} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import {
  isDirectory,
  getProjects,
  getScripts,
} from '../lib/workspace.js'

// Each test gets its own isolated temporary directory.
async function withTempDirectory(callback) {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), 'dev-workspace-test-'),
  )

  try {
    await callback(directory)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

test('isDirectory recognizes directories and rejects missing paths', async () => {
  await withTempDirectory(async directory => {
    assert.equal(await isDirectory(directory), true)
    assert.equal(
      await isDirectory(path.join(directory, 'missing')),
      false,
    )
  })
})

test('getProjects lists immediate folders alphabetically', async () => {
  await withTempDirectory(async directory => {
    await mkdir(path.join(directory, 'zeta'))
    await mkdir(path.join(directory, 'alpha'))
    await writeFile(path.join(directory, 'notes.txt'), 'Not a project')

    const projects = await getProjects(
      directory,
      path.join(directory, 'cli'),
    )

    assert.deepEqual(
      projects.map(project => project.name),
      ['alpha', 'zeta'],
    )
  })
})

test('getProjects excludes the CLI directory', async () => {
  await withTempDirectory(async directory => {
    const cliDirectory = path.join(directory, 'dev-cli')
    await mkdir(cliDirectory)
    await mkdir(path.join(directory, 'my-project'))

    const projects = await getProjects(directory, cliDirectory)

    assert.deepEqual(
      projects.map(project => project.name),
      ['my-project'],
    )
  })
})

test('getScripts returns scripts from package.json', async () => {
  await withTempDirectory(async directory => {
    await writeFile(
      path.join(directory, 'package.json'),
      JSON.stringify({
        name: 'test-project',
        scripts: {
          dev: 'vite',
          build: 'vite build',
        },
      }),
    )

    assert.deepEqual(await getScripts(directory), [
      { name: 'dev', command: 'vite' },
      { name: 'build', command: 'vite build' },
    ])
  })
})

test('getScripts returns an empty array when package.json is missing', async () => {
  await withTempDirectory(async directory => {
    assert.deepEqual(await getScripts(directory), [])
  })
})

test('getScripts returns an empty array when scripts are absent', async () => {
  await withTempDirectory(async directory => {
    await writeFile(
      path.join(directory, 'package.json'),
      JSON.stringify({ name: 'test-project' }),
    )

    assert.deepEqual(await getScripts(directory), [])
  })
})

test('getScripts rejects malformed JSON', async () => {
  await withTempDirectory(async directory => {
    await writeFile(
      path.join(directory, 'package.json'),
      '{ invalid json',
    )

    await assert.rejects(
      getScripts(directory),
      /Invalid JSON in .*package\.json/,
    )
  })
})

test('getScripts rejects a non-object scripts field', async () => {
  await withTempDirectory(async directory => {
    await writeFile(
      path.join(directory, 'package.json'),
      JSON.stringify({ scripts: ['not', 'an', 'object'] }),
    )

    await assert.rejects(
      getScripts(directory),
      /"scripts" must be an object/,
    )
  })
})

test('getProjects rejects a missing workspace', async () => {
  await withTempDirectory(async directory => {
    await assert.rejects(
      getProjects(
        path.join(directory, 'missing'),
        directory,
      ),
    )
  })
})
