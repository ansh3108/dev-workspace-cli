
import {
  mkdir,
  readFile,
  writeFile,
} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

// Keep user settings outside the installed package.
export function getConfigPaths(homeDirectory = os.homedir()) {
  const directory = path.join(
    homeDirectory,
    '.dev-workspace-cli',
  )

  return {
    directory,
    file: path.join(directory, 'config.json'),
  }
}

// Return null when no configuration exists yet.
// Invalid configuration should produce an actionable error.
export async function readWorkspaceConfig(configFile) {
  let content

  try {
    content = await readFile(configFile, 'utf8')
  } catch (error) {
    if (error.code === 'ENOENT') return null

    throw new Error(
      `Cannot read configuration at ${configFile}: ${error.message}`,
      { cause: error },
    )
  }

  let config

  try {
    config = JSON.parse(content)
  } catch (error) {
    throw new Error(
      `Invalid configuration JSON at ${configFile}: ${error.message}`,
      { cause: error },
    )
  }

  if (
    config === null ||
    typeof config !== 'object' ||
    Array.isArray(config) ||
    typeof config.workspace !== 'string' ||
    !config.workspace.trim()
  ) {
    throw new Error(
      `Invalid configuration at ${configFile}: expected a non-empty "workspace" path.`,
    )
  }

  return config.workspace.trim()
}

// Create the configuration directory if needed, then persist the path.
export async function saveWorkspaceConfig(workspace, configFile) {
  const normalizedWorkspace =
    typeof workspace === 'string' ? workspace.trim() : ''

  if (!normalizedWorkspace) {
    throw new Error('Cannot save an empty workspace path.')
  }

  await mkdir(path.dirname(configFile), { recursive: true })

  await writeFile(
    configFile,
    JSON.stringify({ workspace: normalizedWorkspace }, null, 2) + '\n',
    'utf8',
  )
}
