
import spawn from 'cross-spawn'

// Run a project's npm script without invoking a shell.
export function runCommand(
  scriptName,
  directory,
  {
    spawnProcess = spawn,
    npmCommand = 'npm',
  } = {},
) {
  return new Promise((resolve, reject) => {
    const child = spawnProcess(
      npmCommand,
      ['run', scriptName],
      {
        cwd: directory,
        stdio: 'inherit',
      },
    )

    child.on('error', error => {
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
      if (signal) {
        resolve({ code: null, signal })
        return
      }

      resolve({ code })
    })
  })
}
