// Command-line parsing and the `--help` text.
//
// parseCliArgs() turns process arguments into an options object using Node's
// built-in parseArgs, and replaces its errors with a message pointing to
// `--help`. HELP_TEXT must list every option defined here.
//
// Used by cli.js, whose start() decides what each option does.

import { parseArgs } from 'node:util'

export const HELP_TEXT = `
  Usage: dev-workspace [options]
         dws [options]

  Browse the projects in your workspace and run their scripts.

  Options:
    -w, --workspace <path>   Use <path> as the workspace and save it
        --config-path        Print the configuration file location
        --add-alias <name>   Create another command that starts the CLI
        --remove-alias <name>
                             Delete an alias created with --add-alias
        --list-aliases       List the available commands
        --reset              Delete the saved configuration and aliases
    -v, --version            Print the version
    -h, --help               Show this help

  Environment:
    DEV_WORKSPACE_CONFIG     Use a custom configuration file path
`

// Parse command-line flags. Invalid input produces an actionable error.
export function parseCliArgs(args) {
  try {
    const { values } = parseArgs({
      args,
      options: {
        workspace: { type: 'string', short: 'w' },
        'config-path': { type: 'boolean' },
        'add-alias': { type: 'string' },
        'remove-alias': { type: 'string' },
        'list-aliases': { type: 'boolean' },
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
