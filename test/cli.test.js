import path from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'

import { createCli } from '../lib/cli.js'

const WORKSPACE = path.resolve('fake/workspace')

function createDependencies(overrides = {}) {
  const calls = {
    savedConfig: [],
    savedWorkspaces: [],
    discoveredWorkspaces: [],
    errors: [],
    logs: [],
  }

  const dependencies = {
    config: {
      getConfigPaths: () => ({
        directory: '/fake/home/.dev-workspace-cli',
        file: '/fake/home/.dev-workspace-cli/config.json',
      }),
      readWorkspaceConfig: async () => WORKSPACE,
      saveWorkspaceConfig: async (workspace, file) => {
        calls.savedWorkspaces.push({ workspace, file })
      },
    },

    workspace: {
      isDirectory: async () => true,
      getProjects: async (root, cliDirectory) => {
        calls.discoveredWorkspaces.push({ root, cliDirectory })
        return []
      },
      getScripts: async () => [],
    },

    commands: {
      runCommand: async () => ({ code: 0 }),
    },

    prompts: {
      askForWorkspace: async () => WORKSPACE,
      chooseProject: async () => null,
      chooseScript: async () => null,
      confirmWorkspaceChange: async () => true,
      waitAfterCommand: async () => undefined,
      waitForBack: async () => undefined,
    },

    ui: {
      color: value => String(value),
      printHeader: () => undefined,
    },

    output: {
      log: (...args) => calls.logs.push(args),
      error: (...args) => calls.errors.push(args),
    },
  }

  for (const group of Object.keys(overrides)) {
    Object.assign(dependencies[group], overrides[group])
  }

  return { dependencies, calls }
}

test('CLI loads the saved workspace and discovers its projects', async () => {
  const { dependencies, calls } = createDependencies()
  const cli = createCli(dependencies)

  await cli.run()

  assert.equal(calls.discoveredWorkspaces.length, 1)
  assert.equal(calls.discoveredWorkspaces[0].root, WORKSPACE)
  assert.equal(calls.savedWorkspaces.length, 0)
})

test('CLI configures and saves the workspace when no configuration exists', async () => {
  const { dependencies, calls } = createDependencies({
    config: {
      readWorkspaceConfig: async () => null,
    },
  })

  const cli = createCli(dependencies)

  await cli.run()

  assert.equal(calls.savedWorkspaces.length, 1)
  assert.equal(calls.savedWorkspaces[0].workspace, WORKSPACE)
  assert.equal(
    calls.savedWorkspaces[0].file,
    '/fake/home/.dev-workspace-cli/config.json',
  )
  assert.equal(calls.discoveredWorkspaces.length, 1)
})

test('CLI does not continue when the user declines workspace recovery', async () => {
  const { dependencies, calls } = createDependencies({
    workspace: {
      isDirectory: async () => false,
    },
    prompts: {
      confirmWorkspaceChange: async () => false,
    },
  })

  const cli = createCli(dependencies)

  await assert.rejects(
    cli.run(),
    /A valid workspace is required to continue/,
  )

  assert.equal(calls.discoveredWorkspaces.length, 0)
  assert.equal(calls.savedWorkspaces.length, 0)
})

test('CLI reports workspace discovery errors without crashing', async () => {
  const { dependencies, calls } = createDependencies({
    workspace: {
      getProjects: async () => {
        throw new Error('Permission denied')
      },
    },
  })

  const cli = createCli(dependencies)

  await cli.run()

  assert.equal(calls.errors.length, 1)
  assert.match(calls.errors[0][0], /Could not read workspace/)
  assert.match(calls.errors[0][0], /Permission denied/)
})

test('CLI exits cleanly when the project list is empty', async () => {
  const { dependencies, calls } = createDependencies()
  const cli = createCli(dependencies)

  await cli.run()

  assert.equal(calls.discoveredWorkspaces.length, 1)
  assert.ok(
    calls.logs.some(args => args.join(' ').includes('No project folders found')),
  )
})

test('CLI treats prompt cancellation as a normal exit', async () => {
  const cancellation = Object.assign(
    new Error('Prompt cancelled'),
    { name: 'ExitPromptError' },
  )

  const { dependencies, calls } = createDependencies({
    prompts: {
      chooseProject: async () => {
        throw cancellation
      },
    },
    workspace: {
      getProjects: async () => [
        { name: 'example', directory: '/fake/workspace/example' },
      ],
    },
  })

  const cli = createCli(dependencies)

  await assert.doesNotReject(cli.start())

  assert.ok(
    calls.logs.some(args => args.join(' ').includes('Goodbye!')),
  )
})


test('CLI opens a project and returns to the project list', async () => {
  const project = {
    name: 'example',
    directory: path.join(WORKSPACE, 'example'),
  }

  let projectSelections = 0
  const { dependencies } = createDependencies({
    workspace: {
      getProjects: async () => [project],
      getScripts: async () => [{ name: 'dev', command: 'vite' }],
    },
    prompts: {
      chooseProject: async () => {
        projectSelections++
        return projectSelections === 1 ? project : null
      },
      chooseScript: async () => null,
    },
  })

  await createCli(dependencies).run()

  assert.equal(projectSelections, 2)
})

test('CLI handles a project with no npm scripts', async () => {
  const project = {
    name: 'empty-project',
    directory: path.join(WORKSPACE, 'empty-project'),
  }

  const { dependencies, calls } = createDependencies({
    workspace: {
      getProjects: async () => [project],
      getScripts: async () => [],
    },
    prompts: {
      chooseProject: async () => project,
    },
  })

  // Select the project once, then exit the project list.
  let selections = 0
  dependencies.prompts.chooseProject = async () => {
    selections++
    return selections === 1 ? project : null
  }

  await createCli(dependencies).run()

  assert.ok(
    calls.logs.some(args =>
      args.join(' ').includes('No npm scripts found'),
    ),
  )
})

test('CLI runs a selected script and reports success', async () => {
  const project = {
    name: 'example',
    directory: path.join(WORKSPACE, 'example'),
  }
  const script = { name: 'dev', command: 'vite' }

  const { dependencies, calls } = createDependencies({
    workspace: {
      getProjects: async () => [project],
      getScripts: async () => [script],
    },
    prompts: {
      chooseProject: async () => project,
      chooseScript: async () => script,
      waitAfterCommand: async () => undefined,
    },
    commands: {
      runCommand: async () => ({ code: 0 }),
    },
  })

  let projectSelections = 0
  dependencies.prompts.chooseProject = async () => {
    projectSelections++
    return projectSelections === 1 ? project : null
  }

  let scriptSelections = 0
  dependencies.prompts.chooseScript = async () => {
    scriptSelections++
    return scriptSelections === 1 ? script : null
  }

  await createCli(dependencies).run()

  assert.ok(
    calls.logs.some(args =>
      args.join(' ').includes('Command completed successfully.'),
    ),
  )
})

test('CLI reports a non-zero script exit code', async () => {
  const project = {
    name: 'example',
    directory: path.join(WORKSPACE, 'example'),
  }
  const script = { name: 'test', command: 'vitest' }

  const { dependencies, calls } = createDependencies({
    workspace: {
      getProjects: async () => [project],
      getScripts: async () => [script],
    },
    commands: {
      runCommand: async () => ({ code: 7 }),
    },
  })

  let projectSelections = 0
  dependencies.prompts.chooseProject = async () =>
    ++projectSelections === 1 ? project : null

  let scriptSelections = 0
  dependencies.prompts.chooseScript = async () =>
    ++scriptSelections === 1 ? script : null

  await createCli(dependencies).run()

  assert.ok(
    calls.logs.some(args =>
      args.join(' ').includes('Command exited with code 7.'),
    ),
  )
})

test('CLI reports a command interrupted by a signal', async () => {
  const project = {
    name: 'example',
    directory: path.join(WORKSPACE, 'example'),
  }
  const script = { name: 'build', command: 'vite build' }

  const { dependencies, calls } = createDependencies({
    workspace: {
      getProjects: async () => [project],
      getScripts: async () => [script],
    },
    commands: {
      runCommand: async () => ({
        code: null,
        signal: 'SIGTERM',
      }),
    },
  })

  let projectSelections = 0
  dependencies.prompts.chooseProject = async () =>
    ++projectSelections === 1 ? project : null

  let scriptSelections = 0
  dependencies.prompts.chooseScript = async () =>
    ++scriptSelections === 1 ? script : null

  await createCli(dependencies).run()

  assert.ok(
    calls.logs.some(args =>
      args.join(' ').includes('Command was interrupted (SIGTERM).'),
    ),
  )
})

test('CLI handles errors while reading a project package.json', async () => {
  const project = {
    name: 'broken-project',
    directory: path.join(WORKSPACE, 'broken-project'),
  }

  const { dependencies, calls } = createDependencies({
    workspace: {
      getProjects: async () => [project],
      getScripts: async () => {
        throw new Error('Invalid package JSON')
      },
    },
  })

  let projectSelections = 0
  dependencies.prompts.chooseProject = async () =>
    ++projectSelections === 1 ? project : null

  await createCli(dependencies).run()

  assert.ok(
    calls.errors.some(args =>
      args.join(' ').includes('Could not read package.json'),
    ),
  )
  assert.ok(
    calls.errors.some(args =>
      args.join(' ').includes('Invalid package JSON'),
    ),
  )
})

test('CLI handles errors when starting a command', async () => {
  const project = {
    name: 'example',
    directory: path.join(WORKSPACE, 'example'),
  }
  const script = { name: 'dev', command: 'vite' }

  const { dependencies, calls } = createDependencies({
    workspace: {
      getProjects: async () => [project],
      getScripts: async () => [script],
    },
    commands: {
      runCommand: async () => {
        throw new Error('npm unavailable')
      },
    },
  })

  let projectSelections = 0
  dependencies.prompts.chooseProject = async () =>
    ++projectSelections === 1 ? project : null

  let scriptSelections = 0
  dependencies.prompts.chooseScript = async () =>
    ++scriptSelections === 1 ? script : null

  await createCli(dependencies).run()

  assert.ok(
    calls.errors.some(args =>
      args.join(' ').includes('Could not start command: npm unavailable'),
    ),
  )
})
