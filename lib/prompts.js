import { confirm, input, select } from '@inquirer/prompts'

export async function askForWorkspace(validate) {
  return input({
    message: 'Workspace path',
    validate,
  })
}

export async function confirmWorkspaceChange() {
  return confirm({
    message: 'Choose a new workspace?',
    default: true,
  })
}

export async function chooseProject(projects) {
  return select({
    message: 'Select a project',
    choices: [
      ...projects.map(project => ({
        name: project.name,
        value: project,
      })),
      { name: 'Exit', value: null },
    ],
    pageSize: 15,
    loop: false,
  })
}

export async function chooseScript(scripts) {
  return select({
    message: 'Select a script to run',
    choices: [
      ...scripts.map(script => ({
        name: `${script.name}  -  ${script.command}`,
        value: script,
      })),
      { name: 'Back to projects', value: null },
    ],
    pageSize: 15,
    loop: false,
  })
}

export async function waitForBack(message = 'Return to projects') {
  return select({
    message,
    choices: [{ name: 'Back', value: true }],
  })
}

export async function waitAfterCommand() {
  return select({
    message: 'What next?',
    choices: [
      { name: 'Return to project scripts', value: true },
    ],
  })
}
