
import {
  readdir,
  readFile,
  stat,
} from 'node:fs/promises'
import path from 'node:path'

// Check whether a path points to an accessible directory.
export async function isDirectory(directory) {
  try {
    return (await stat(directory)).isDirectory()
  } catch {
    return false
  }
}

// List immediate child directories in the workspace.
// Exclude the CLI's own directory and sort names consistently.
export async function getProjects(root, cliDirectory) {
  const entries = await readdir(root, { withFileTypes: true })

  return entries
    .filter(entry => entry.isDirectory())
    .map(entry => ({
      name: entry.name,
      directory: path.join(root, entry.name),
    }))
    .filter(
      project =>
        path.resolve(project.directory) !== path.resolve(cliDirectory),
    )
    .sort((a, b) => a.name.localeCompare(b.name))
}

// Read npm scripts from a project's package.json.
export async function getScripts(directory) {
  const packagePath = path.join(directory, 'package.json')
  let content

  try {
    content = await readFile(packagePath, 'utf8')
  } catch (error) {
    if (error.code === 'ENOENT') return []

    throw new Error(
      `Cannot read ${packagePath}: ${error.message}`,
      { cause: error },
    )
  }

  let packageJson

  try {
    packageJson = JSON.parse(content)
  } catch (error) {
    throw new Error(
      `Invalid JSON in ${packagePath}: ${error.message}`,
      { cause: error },
    )
  }

  if (
    packageJson === null ||
    typeof packageJson !== 'object' ||
    Array.isArray(packageJson)
  ) {
    throw new Error(
      `Invalid ${packagePath}: expected a JSON object.`,
    )
  }

  const scripts = packageJson.scripts

  if (scripts == null) return []

  if (
    typeof scripts !== 'object' ||
    Array.isArray(scripts)
  ) {
    throw new Error(
      `Invalid ${packagePath}: "scripts" must be an object.`,
    )
  }

  return Object.entries(scripts)
    .filter(([, command]) => typeof command === 'string')
    .map(([name, command]) => ({ name, command }))
}
