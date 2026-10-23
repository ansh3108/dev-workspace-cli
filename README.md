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

## Workspace configuration

Your workspace path is saved in your user home directory:

```text
~/.dev-workspace-cli/config.json
```

On Windows, this resolves to a file under your user profile directory.

The configuration is separate from the package installation, so reinstalling or updating the CLI does not normally overwrite your workspace preference.

If the saved workspace is no longer accessible, the CLI offers to configure another one.

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

## Contributing

Bug reports, feature suggestions, and contributions are welcome. Please include clear reproduction steps when reporting a problem.

## License

MIT
