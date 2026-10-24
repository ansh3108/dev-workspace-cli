import spawn from 'cross-spawn'

// Ctrl+C reaches every process attached to the terminal. The child decides
// how to stop; the CLI ignores it so it can return to the menu afterwards.
function ignoreInterrupt() {}

// Run a project's npm script without invoking a shell.
export function runCommand(
  scriptName,
  directory,
  { spawnProcess = spawn, npmCommand = 'npm', signals = process } = {},
) {
  return new Promise((resolve, reject) => {
    const child = spawnProcess(npmCommand, ['run', scriptName], {
      cwd: directory,
      stdio: 'inherit',
    })

    signals.on('SIGINT', ignoreInterrupt)

    const finish = () => signals.off('SIGINT', ignoreInterrupt)

    child.on('error', error => {
      finish()

      if (error.code === 'ENOENT') {
        reject(
          new Error(
            `Could not find ${npmCommand}. Install Node.js with npm, then restart the CLI.`,
            { cause: error },
          ),
        )
        return
      }

      reject(
        new Error(`Could not start npm: ${error.message}`, {
          cause: error,
        }),
      )
    })

    child.on('close', (code, signal) => {
      finish()

      if (signal) {
        resolve({ code: null, signal })
        return
      }

      resolve({ code })
    })
  })
}
