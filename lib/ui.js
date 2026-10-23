const USE_COLORS = Boolean(
  process.stdout.isTTY && !process.env.NO_COLOR,
)

const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
}

export function createUi({
  useColors = USE_COLORS,
  log = (...args) => console.log(...args),
} = {}) {
  function color(value, shade) {
    if (!useColors || !ANSI[shade]) {
      return String(value)
    }

    return `${ANSI[shade]}${value}${ANSI.reset}`
  }

  function printHeader(workspace, section = 'PROJECT EXPLORER') {
    log()
    log(color('+----------------------------------------+', 'cyan'))
    log(
      color('|', 'cyan') +
        '          DEV WORKSPACE CLI             ' +
        color('|', 'cyan'),
    )
    log(color('+----------------------------------------+', 'cyan'))
    log()
    log(`  ${section}`)
    log(`  Workspace: ${workspace}`)
    log()
  }

  return { color, printHeader }
}

export const { color, printHeader } = createUi()
