import {
  confirm as inquirerConfirm,
  input as inquirerInput,
  select as inquirerSelect,
} from '@inquirer/prompts'

// Returned by chooseProject when the user wants another workspace.
export const CHANGE_WORKSPACE = Symbol('change-workspace')

export function createPrompts({
  confirm = inquirerConfirm,
  input = inquirerInput,
  select = inquirerSelect,
} = {}) {
  const menuTheme = {
    prefix: {
      idle: ' ',
      done: ' ',
    },
    style: {
      message: text => text,
      highlight: text => `\x1b[36m${text}\x1b[0m`,
      description: text => `\x1b[2m${text}\x1b[0m`,
    },
  }

  return {
    async askForWorkspace(validate) {
      return input({
        message: 'Workspace path',
        validate,
      })
    },

    async confirmWorkspaceChange() {
      return confirm({
        message: 'Choose a new workspace directory?',
        default: true,
      })
    },

    async chooseProject(projects) {
      return select({
        message: 'Select a project',
        choices: [
          ...projects.map(project => ({
            name: `📁  ${project.name}`,
            value: project,
          })),
          { name: '⚙  Change workspace', value: CHANGE_WORKSPACE },
          { name: '↩  Exit', value: null },
        ],
        pageSize: 15,
        loop: false,
      })
    },

    async chooseScript(scripts) {
      return select({
        message: 'Select a script',
        choices: [
          ...scripts.map(script => ({
            name: `▶  ${script.name}`,
            value: script,
            description: script.command,
          })),
          { name: '↩  Back to projects', value: null },
        ],
        pageSize: 15,
        loop: false,
      })
    },

    async waitForBack(message = 'Return to projects') {
      return select({
        message,
        choices: [{ name: '↩  Back', value: true }],
      })
    },

    async waitAfterCommand() {
      return select({
        message: 'What next?',
        choices: [{ name: '↩  Return to project scripts', value: true }],
      })
    },
  }
}

export const {
  askForWorkspace,
  confirmWorkspaceChange,
  chooseProject,
  chooseScript,
  waitForBack,
  waitAfterCommand,
} = createPrompts()
