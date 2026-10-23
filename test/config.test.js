
import test from 'node:test'
import assert from 'node:assert/strict'

import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises'

import os from 'node:os'
import path from 'node:path'

import {
  getConfigPaths,
  readWorkspaceConfig,
  saveWorkspaceConfig,
} from '../lib/config.js'

async function withTempHome(callback) {
  const home = await mkdtemp(
    path.join(os.tmpdir(), 'dev-workspace-config-test-'),
  )

  try {
    await callback(home)
  } finally {
    await rm(home, { recursive: true, force: true })
  }
}

test('getConfigPaths keeps configuration inside the supplied home directory', () => {
  const paths = getConfigPaths('/fake/home')

  assert.equal(
    paths.directory,
    path.join('/fake/home', '.dev-workspace-cli'),
  )
  assert.equal(
    paths.file,
    path.join('/fake/home', '.dev-workspace-cli', 'config.json'),
  )
})

test('readWorkspaceConfig returns null when the config is missing', async () => {
  await withTempHome(async home => {
    const { file } = getConfigPaths(home)

    assert.equal(await readWorkspaceConfig(file), null)
  })
})

test('saveWorkspaceConfig creates the directory and saves the workspace', async () => {
  await withTempHome(async home => {
    const { file } = getConfigPaths(home)
    const workspace = path.join(home, 'projects')

    await saveWorkspaceConfig(workspace, file)

    const content = JSON.parse(await readFile(file, 'utf8'))

    assert.equal(content.workspace, workspace)
  })
})

test('saved workspace can be loaded again', async () => {
  await withTempHome(async home => {
    const { file } = getConfigPaths(home)
    const workspace = path.join(home, 'projects')

    await saveWorkspaceConfig(workspace, file)

    assert.equal(await readWorkspaceConfig(file), workspace)
  })
})

test('readWorkspaceConfig trims surrounding whitespace', async () => {
  await withTempHome(async home => {
    const { directory, file } = getConfigPaths(home)

    await mkdir(directory, { recursive: true })
    await writeFile(
      file,
      JSON.stringify({ workspace: '  /projects  ' }),
      'utf8',
    )

    assert.equal(await readWorkspaceConfig(file), '/projects')
  })
})

test('readWorkspaceConfig rejects malformed JSON', async () => {
  await withTempHome(async home => {
    const { directory, file } = getConfigPaths(home)

    await mkdir(directory, { recursive: true }),
    await writeFile(file, '{ invalid json', 'utf8')

    await assert.rejects(
      readWorkspaceConfig(file),
      /Invalid configuration JSON/,
    )
  })
})

test('readWorkspaceConfig rejects missing or invalid workspace values', async () => {
  await withTempHome(async home => {
    const { directory, file } = getConfigPaths(home)

    await mkdir(directory, { recursive: true })

    const invalidConfigs = [
      {},
      { workspace: '' },
      { workspace: '   ' },
      { workspace: 123 },
      null,
      [],
    ]

    for (const config of invalidConfigs) {
      await writeFile(file, JSON.stringify(config), 'utf8')

      await assert.rejects(
        readWorkspaceConfig(file),
        /Invalid configuration/,
      )
    }
  })
})

test('saveWorkspaceConfig rejects an empty workspace path', async () => {
  await withTempHome(async home => {
    const { file } = getConfigPaths(home)

    await assert.rejects(
      saveWorkspaceConfig('   ', file),
      /empty workspace path/,
    )
  })
})
