import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  chmod,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import {
  addAlias,
  findCommand,
  listAliases,
  removeAlias,
  removeAllAliases,
} from '../lib/aliases.js'

// Create a fake global install: a bin directory holding dev-workspace
// launchers for the given platform, and a PATH that contains it.
async function withInstall(platform, callback) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'dev-workspace-alias-'))
  const bin = path.join(root, 'bin')
  const other = path.join(root, 'other')

  await mkdir(bin)
  await mkdir(other)

  const files =
    platform === 'win32'
      ? ['dev-workspace.cmd', 'dev-workspace.ps1', 'dev-workspace']
      : ['dev-workspace']

  for (const file of files) {
    await writeFile(path.join(bin, file), 'launcher', 'utf8')
  }

  const delimiter = platform === 'win32' ? ';' : ':'
  const options = {
    platform,
    env: { PATH: [other, bin].join(delimiter), PATHEXT: '.EXE;.CMD' },
  }

  try {
    await callback({ bin, other, options })
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}

// A Unix PATH uses ":" as separator, which cannot hold Windows drive paths.
const unixOnly = {
  skip: process.platform === 'win32' && 'needs a host without drive letters',
}

test(
  'addAlias writes a shell launcher next to dev-workspace',
  unixOnly,
  async () => {
    await withInstall('linux', async ({ bin, options }) => {
      const files = await addAlias('dev', options)

      assert.deepEqual(files, [path.join(bin, 'dev')])

      const content = await readFile(files[0], 'utf8')

      assert.match(content, /^#!\/bin\/sh/)
      assert.match(content, /dev-workspace-cli alias: dev -> dev-workspace/)
      assert.ok(content.includes(`exec '${path.join(bin, 'dev-workspace')}'`))
    })
  },
)

test('addAlias writes cmd, PowerShell and Git Bash launchers on Windows', async () => {
  await withInstall('win32', async ({ bin, options }) => {
    const files = await addAlias('ws', options)

    assert.deepEqual(files, [
      path.join(bin, 'ws.cmd'),
      path.join(bin, 'ws.ps1'),
      path.join(bin, 'ws'),
    ])

    const cmd = await readFile(files[0], 'utf8')
    const powershell = await readFile(files[1], 'utf8')
    const shell = await readFile(files[2], 'utf8')

    assert.ok(cmd.includes(`"${path.join(bin, 'dev-workspace.cmd')}" %*`))
    assert.ok(cmd.includes('\r\n'))
    assert.ok(powershell.includes(path.join(bin, 'dev-workspace.ps1')))
    assert.ok(
      shell.includes(path.join(bin, 'dev-workspace').replaceAll('\\', '/')),
    )
  })
})

test('addAlias falls back to the cmd launcher for PowerShell', async () => {
  await withInstall('win32', async ({ bin, options }) => {
    await rm(path.join(bin, 'dev-workspace.ps1'))

    const [, powershellFile] = await addAlias('ws', options)
    const content = await readFile(powershellFile, 'utf8')

    assert.ok(content.includes(path.join(bin, 'dev-workspace.cmd')))
  })
})

test('addAlias refuses names that are already commands', async () => {
  await withInstall('win32', async ({ other, options }) => {
    await writeFile(path.join(other, 'taken.exe'), 'other tool', 'utf8')

    await assert.rejects(
      addAlias('taken', options),
      /"taken" is already a command/,
    )
  })
})

test('addAlias refuses to overwrite an extensionless file on Windows', async () => {
  await withInstall('win32', async ({ bin, options }) => {
    await writeFile(path.join(bin, 'tool'), 'other tool', 'utf8')

    await assert.rejects(addAlias('tool', options), /already a command/)
    assert.equal(await readFile(path.join(bin, 'tool'), 'utf8'), 'other tool')
  })
})

test('addAlias reports an alias that already exists', async () => {
  await withInstall('win32', async ({ options }) => {
    await addAlias('dev', options)

    await assert.rejects(addAlias('dev', options), /alias "dev" already exists/)
  })
})

test('addAlias rejects invalid and reserved names', async () => {
  await withInstall('linux', async ({ options }) => {
    for (const name of ['', '-x', 'a b', 'a/b', '../x', 'x'.repeat(33)]) {
      await assert.rejects(addAlias(name, options), /Invalid alias/)
    }

    for (const name of ['dws', 'dev-workspace', 'cd', 'EXIT']) {
      await assert.rejects(addAlias(name, options), /is reserved/)
    }
  })
})

test('addAlias explains that a global install is needed', async () => {
  await assert.rejects(
    addAlias('dev', { platform: 'linux', env: { PATH: '' } }),
    /Could not find the dev-workspace command[\s\S]*npm install --global/,
  )
})

test('removeAlias deletes every launcher of an alias', async () => {
  await withInstall('win32', async ({ bin, options }) => {
    const files = await addAlias('ws', options)

    assert.deepEqual(await removeAlias('ws', options), files)
    assert.deepEqual((await readdir(bin)).sort(), [
      'dev-workspace',
      'dev-workspace.cmd',
      'dev-workspace.ps1',
    ])
  })
})

test('removeAlias never deletes files it did not create', async () => {
  await withInstall('win32', async ({ bin, options }) => {
    await writeFile(path.join(bin, 'node.cmd'), 'not an alias', 'utf8')

    await assert.rejects(removeAlias('node', options), /No alias named "node"/)
    await assert.rejects(removeAlias('../etc', options), /No alias named/)
    assert.equal(
      await readFile(path.join(bin, 'node.cmd'), 'utf8'),
      'not an alias',
    )
  })
})

test('listAliases returns only aliases created by the CLI', async () => {
  await withInstall('win32', async ({ bin, options }) => {
    await addAlias('ws', options)
    await addAlias('dev', options)
    await writeFile(path.join(bin, 'other.cmd'), '@echo other', 'utf8')
    await writeFile(path.join(bin, 'large'), 'x'.repeat(5000), 'utf8')

    assert.deepEqual(await listAliases(options), ['dev', 'ws'])
  })
})

test('listAliases returns an empty list without a global install', async () => {
  assert.deepEqual(
    await listAliases({ platform: 'linux', env: { PATH: '' } }),
    [],
  )
})

test('removeAllAliases deletes every alias', async () => {
  await withInstall('win32', async ({ options }) => {
    await addAlias('a1', options)
    await addAlias('a2', options)

    assert.deepEqual(await removeAllAliases(options), ['a1', 'a2'])
    assert.deepEqual(await listAliases(options), [])
  })
})

test('findCommand uses PATHEXT on Windows', async () => {
  await withInstall('win32', async ({ bin, options }) => {
    assert.equal(
      await findCommand('dev-workspace', options),
      path.join(bin, 'dev-workspace.cmd'),
    )
    assert.equal(await findCommand('missing', options), null)
  })
})

// Run a generated launcher with the real shell of this operating system.
function runLauncher(bin, name, args) {
  const result =
    process.platform === 'win32'
      ? spawnSync(
          'cmd.exe',
          ['/d', '/c', path.join(bin, `${name}.cmd`), ...args],
          { encoding: 'utf8' },
        )
      : spawnSync(path.join(bin, name), args, { encoding: 'utf8' })

  return { code: result.status, stdout: result.stdout, stderr: result.stderr }
}

test('a generated launcher starts dev-workspace with its arguments', async () => {
  const platform = process.platform
  const root = await mkdtemp(path.join(os.tmpdir(), 'dev-workspace-run-'))
  const options = {
    platform,
    env: { ...process.env, PATH: root, Path: undefined },
  }

  try {
    if (platform === 'win32') {
      await writeFile(
        path.join(root, 'dev-workspace.cmd'),
        '@echo off\r\necho target %*\r\nexit /b 3\r\n',
        'utf8',
      )
    } else {
      const target = path.join(root, 'dev-workspace')

      await writeFile(target, '#!/bin/sh\necho target "$@"\nexit 3\n', 'utf8')
      await chmod(target, 0o755)
    }

    await addAlias('wsx', options)

    const started = runLauncher(root, 'wsx', ['--help', 'two'])

    assert.equal(started.stdout.trim(), 'target --help two')
    assert.equal(started.code, 3)

    // After an uninstall the launcher explains what happened.
    await rm(
      path.join(
        root,
        platform === 'win32' ? 'dev-workspace.cmd' : 'dev-workspace',
      ),
    )

    const orphaned = runLauncher(root, 'wsx', [])

    assert.equal(orphaned.code, 127)
    assert.match(orphaned.stderr, /"wsx" alias points to .*no longer exists/)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
