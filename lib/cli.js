
import path from 'node:path'

import {
    getConfigPaths,
    readWorkspaceConfig,
    saveWorkspaceConfig,
} from './config.js'

import {
    getProjects,
    getScripts,
    isDirectory,
} from './workspace.js'

import { runCommand } from './commands.js'

import {
    askForWorkspace,
    chooseProject,
    chooseScript,
    confirmWorkspaceChange,
    waitAfterCommand,
    waitForBack,
} from './prompts.js'

import { clearScreen, color, printHeader } from './ui.js'

const defaultDependencies = {
    config: {
        getConfigPaths,
        readWorkspaceConfig,
        saveWorkspaceConfig,
    },
    workspace: {
        getProjects,
        getScripts,
        isDirectory,
    },
    commands: {
        runCommand,
    },
    prompts: {
        askForWorkspace,
        chooseProject,
        chooseScript,
        confirmWorkspaceChange,
        waitAfterCommand,
        waitForBack,
    },
    ui: {
        clearScreen,
        color,
        printHeader,
    },
    output: {
        log: (...args) => console.log(...args),
        error: (...args) => console.error(...args),
    },
}

function mergeDependencies(overrides = {}) {
    return {
        config: { ...defaultDependencies.config, ...overrides.config },
        workspace: { ...defaultDependencies.workspace, ...overrides.workspace },
        commands: { ...defaultDependencies.commands, ...overrides.commands },
        prompts: { ...defaultDependencies.prompts, ...overrides.prompts },
        ui: { ...defaultDependencies.ui, ...overrides.ui },
        output: { ...defaultDependencies.output, ...overrides.output },
    }
}

// Create an isolated CLI instance. Each instance owns its workspace state.
export function createCli(overrides = {}) {
    const dependencies = mergeDependencies(overrides)
    const { config, workspace, commands, prompts, ui, output } = dependencies

    const { file: configFile } = config.getConfigPaths()

    let root = ''

    async function configureWorkspace() {
        output.log()
        output.log('  Configure your development workspace.')
        output.log('  Enter the folder containing your projects.')
        output.log()

        const directory = await prompts.askForWorkspace(async value => {
            const candidate = value.trim()

            if (!candidate) {
                return 'Please enter a directory path.'
            }

            if (!(await workspace.isDirectory(path.resolve(candidate)))) {
                return 'That directory does not exist or is not accessible.'
            }

            return true
        })

        root = path.resolve(directory.trim())

        await config.saveWorkspaceConfig(root, configFile)

        output.log()
        output.log(ui.color(`  Workspace saved: ${root}`, 'green'))
        output.log()

        return root
    }

    async function initializeWorkspace() {
        let savedPath = null

        try {
            savedPath = await config.readWorkspaceConfig(configFile)
        } catch (error) {
            output.log(ui.color(`  ${error.message}`, 'yellow'))
            output.log(
                ui.color('  Configuration must be repaired or recreated.', 'yellow'),
            )
        }

        if (savedPath && await workspace.isDirectory(path.resolve(savedPath))) {
            root = path.resolve(savedPath)
            return root
        }

        if (savedPath) {
            output.log()
            output.log(
                ui.color(`  Saved workspace is unavailable: ${savedPath}`, 'yellow'),
            )

            const reconfigure = await prompts.confirmWorkspaceChange()

            if (!reconfigure) {
                throw new Error('A valid workspace is required to continue.')
            }
        }

        return configureWorkspace()
    }

    async function projectMenu(project) {
        let scripts

        try {
            scripts = await workspace.getScripts(project.directory)
        } catch (error) {
            ui.clearScreen()
            ui.printHeader(root, `PROJECT / ${project.name}`)
            output.error(
                ui.color(`  Could not read package.json: ${error.message}`, 'red'),
            )
            output.log()

            await prompts.waitForBack('Return to projects')
            return
        }

        while (true) {
            ui.clearScreen()
            ui.printHeader(root, `PROJECT / ${project.name}`)

            if (scripts.length === 0) {
                output.log(
                    ui.color('  No npm scripts found in this project.', 'yellow'),
                )
                output.log('  Check that package.json defines a scripts object.')
                output.log()

                await prompts.waitForBack('Return to projects')
                return
            }

            const selected = await prompts.chooseScript(scripts)

            if (!selected) return

            output.log()
            output.log(ui.color('  ----------------------------------------', 'dim'))
            output.log(`  Running: ${selected.name}`)
            output.log(`  Directory: ${project.directory}`)
            output.log(ui.color('  ----------------------------------------', 'dim'))
            output.log()

            try {
                const result = await commands.runCommand(
                    selected.name,
                    project.directory,
                )

                output.log()

                if (result.code === 0) {
                    output.log(ui.color('  Command completed successfully.', 'green'))
                } else if (result.signal) {
                    output.log(
                        ui.color(`  Command was interrupted (${result.signal}).`, 'yellow'),
                    )
                } else {
                    output.log(
                        ui.color(
                            `  Command exited with code ${result.code ?? 'unknown'}.`,
                            'red',
                        ),
                    )
                }
            } catch (error) {
                output.error(
                    ui.color(`  Could not start command: ${error.message}`, 'red'),
                )
            }

            output.log()
            await prompts.waitAfterCommand()
        }
    }

    async function run() {
        await initializeWorkspace()

        while (true) {
            ui.clearScreen()
            ui.printHeader(root)

            let projects

            try {
                projects = await workspace.getProjects(root)
            } catch (error) {
                output.error(
                    ui.color(`  Could not read workspace: ${error.message}`, 'red'),
                )
                return
            }

            if (projects.length === 0) {
                output.log(ui.color('  No project folders found.', 'yellow'))
                output.log()
                return
            }

            const project = await prompts.chooseProject(projects)

            if (!project) return

            await projectMenu(project)
        }
    }

    async function start() {
        try {
            await run()
        } catch (error) {
            if (
                error.name === 'ExitPromptError' ||
                error.name === 'AbortPromptError'
            ) {
                output.log(`\n  ${ui.color('Goodbye!', 'cyan')}\n`)
                return
            }

            throw error
        }
    }

    return { run, start }
}

// Preserve the simple production entry point.
export function startCli(overrides) {
    return createCli(overrides).start()
}
