[![CI](https://github.com/modulane/dev-workspace-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/modulane/dev-workspace-cli/actions/workflows/ci.yml)
![Coverage](https://modulane.github.io/dev-workspace-cli/coverage.svg)
[![npm version](https://img.shields.io/npm/v/@modulane/dev-workspace-cli)](https://www.npmjs.com/package/@modulane/dev-workspace-cli)

# Dev Workspace CLI

An interactive command-line tool for browsing your development workspace and running npm scripts without manually navigating between project folders.

## Features

- Browse project directories from a configurable workspace.
- Discover npm scripts from each project's `package.json`.
- Run scripts directly from the selected project's directory.
- Save your workspace configuration between launches.
- Use an interactive terminal interface with keyboard navigation.
- Run on Windows, macOS, and Linux.

## Requirements

- Node.js 20 or newer
- npm

## Installation

Install globally using npm:

```bash
npm install --global @modulane/dev-workspace-cli
```

Launch the CLI:

```bash
dev-workspace
```

or with the shorter built-in alias:

```bash
dws
```

## Getting started

On the first launch, the CLI asks you to select a workspace directory.

Choose the directory that contains your projects. For example:

```text
C:/dev/
├── foo-1/
│   └── package.json
├── foo-2/
│   └── package.json
└── foo-3/
    └── package.json
```

The CLI lists the immediate subdirectories of your workspace. Select a project to browse the npm scripts defined in its `package.json`, then choose a script to execute.

For example, a project with the following scripts:

```json
{
  "scripts": {
    "dev": "nuxt dev",
    "build": "nuxt build",
    "test": "vitest"
  }
}
```

will expose `dev`, `build`, and `test` in the project menu.

Scripts are executed through npm from the selected project's directory, so relative paths and project-local dependencies resolve in the appropriate context.

To switch to another workspace later, choose **Change workspace** in the project list, or start the CLI with `--workspace <path>`.

## Options

```text
dev-workspace [options]

  -w, --workspace <path>   Use <path> as the workspace and save it
      --config-path        Print the configuration file location
      --add-alias <name>   Create another command that starts the CLI
      --remove-alias <name>
                           Delete an alias created with --add-alias
      --list-aliases       List the available commands
      --reset              Delete the saved configuration and aliases
  -v, --version            Print the version
  -h, --help               Show this help
```

## Aliases

The CLI installs two commands: `dev-workspace` and the shorter `dws`. You can add your own names:

```bash
dws --add-alias dev
dev
```

An alias is a small launcher file created next to the `dev-workspace` command, in the folder where your package manager installs global commands. It works immediately in every shell, including cmd, PowerShell and Git Bash on Windows.

- `--list-aliases` shows every available command.
- `--remove-alias <name>` deletes an alias.
- A name that is already a command on your system, such as `ls` or another tool, is refused, so an alias never hides an existing program.
- The CLI only lists or deletes launchers it created itself.

Aliases need a global install. If the folder needs administrator rights (for example `/usr/local/bin`), run the command with the same rights you used to install the CLI.

## Workspace configuration

Your workspace path is saved in your operating system's standard location for user configuration:

| Platform | Location                                                                                                 |
| -------- | -------------------------------------------------------------------------------------------------------- |
| Linux    | `$XDG_CONFIG_HOME/dev-workspace-cli/config.json` (defaults to `~/.config/dev-workspace-cli/config.json`) |
| macOS    | `~/Library/Preferences/dev-workspace-cli/config.json`                                                    |
| Windows  | `%APPDATA%\dev-workspace-cli\config.json`                                                                |

Run `dev-workspace --config-path` to print the exact path on your machine. To use a different file, set the `DEV_WORKSPACE_CONFIG` environment variable to its path.

The configuration is stored separately from the package, so updating, reinstalling, or uninstalling the CLI keeps your workspace preference.

Versions 0.1.x stored the configuration in `~/.dev-workspace-cli/config.json`. If that file exists, the CLI moves it to the new location automatically on the next launch.

If the saved workspace is no longer accessible, the CLI offers to configure another one.

## Uninstalling

Because the configuration and your custom aliases outlive the package, delete them before uninstalling if you want to remove every trace of the CLI:

```bash
dev-workspace --reset
npm uninstall --global @modulane/dev-workspace-cli
```

## Development

Clone the repository and install dependencies:

```bash
npm install
```

Start the CLI locally:

```bash
npm start
```

Run the automated tests:

```bash
npm test
```

Run the complete local verification command:

```bash
npm run check
```

## Limitations

- The CLI discovers immediate subdirectories rather than recursively searching for projects.
- A project must have a `package.json` with a `scripts` object to expose npm scripts.
- The CLI currently focuses on npm scripts; it does not automatically select pnpm, Yarn, or other package managers.
- Project scripts execute with the permissions of the current user. Only run scripts from projects you trust.

See the [roadmap](ROADMAP.md) for the features planned up to version 1.0.0.

## Contributing

Bug reports, feature suggestions, and contributions are welcome. Please include clear reproduction steps when reporting a problem.

## License

MIT
