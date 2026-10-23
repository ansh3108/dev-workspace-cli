const USE_COLORS = Boolean(process.stdout.isTTY && !process.env.NO_COLOR)

const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
}

export function color(value, shade) {
  if (!USE_COLORS || !ANSI[shade]) {
    return String(value)
  }

  return `${ANSI[shade]}${value}${ANSI.reset}`
}

export function printHeader(workspace, section = 'PROJECT EXPLORER') {
  console.log()
  console.log(color('+----------------------------------------+', 'cyan'))
  console.log(
    color('|', 'cyan') +
      '          DEV WORKSPACE CLI             ' +
      color('|', 'cyan'),
  )
  console.log(color('+----------------------------------------+', 'cyan'))
  console.log()
  console.log(`  ${section}`)
  console.log(`  Workspace: ${workspace}`)
  console.log()
}
