import { parseArgs } from 'node:util'

export const HELP_TEXT = `
  Usage: dev-workspace [options]

  Browse the projects in your workspace and run their npm scripts.

  Options:
    -w, --workspace <path>  Use <path> as the workspace and save it
        --config-path       Print the configuration file location
        --reset             Delete the saved configuration
    -v, --version           Print the version
    -h, --help              Show this help

  Environment:
    DEV_WORKSPACE_CONFIG    Use a custom configuration file path
`

// Parse command-line flags. Invalid input produces an actionable error.
export function parseCliArgs(args) {
  try {
    const { values } = parseArgs({
      args,
      options: {
        workspace: { type: 'string', short: 'w' },
        'config-path': { type: 'boolean' },
        reset: { type: 'boolean' },
        version: { type: 'boolean', short: 'v' },
        help: { type: 'boolean', short: 'h' },
      },
      strict: true,
      allowPositionals: false,
    })

    return values
  } catch (error) {
    if (!error.code?.startsWith('ERR_PARSE_ARGS')) throw error

    throw new Error(
      `${error.message}\n  Run "dev-workspace --help" to see the available options.`,
      { cause: error },
    )
  }
}
