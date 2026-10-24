#!/usr/bin/env node

// Check whether the current terminal reports mouse events to Node.
// Run it in each terminal you want to support:
//
//   node scripts/mouse-check.js
//
// Click, hover and scroll over the menu, then press q to quit.
// Without a TTY it parses stdin instead, for automated checks.

import { pathToFileURL } from 'node:url'

const ESC = '\x1b'
const MOUSE_ON = `${ESC}[?1000h${ESC}[?1003h${ESC}[?1006h`
const MOUSE_OFF = `${ESC}[?1006l${ESC}[?1003l${ESC}[?1000l`
const SCREEN_ON = `${ESC}[?1049h${ESC}[?25l`
const SCREEN_OFF = `${ESC}[?25h${ESC}[?1049l`

const ITEMS = ['web-app', 'api-server', 'design-system', 'docs', 'scripts']
const FIRST_ITEM_ROW = 4

// Parse SGR mouse sequences: ESC [ < button ; column ; row (M press | m release).
// Return the parsed events and any incomplete sequence left at the end.
export function parseMouse(buffer) {
  const events = []
  const pattern = new RegExp(`${ESC}\\[<(\\d+);(\\d+);(\\d+)([Mm])`, 'g')
  let match
  let consumed = 0

  while ((match = pattern.exec(buffer))) {
    const code = Number(match[1])
    const event = {
      column: Number(match[2]),
      row: Number(match[3]),
      released: match[4] === 'm',
    }

    if (code & 64) {
      event.type = code & 1 ? 'wheel-down' : 'wheel-up'
    } else if (code & 32) {
      event.type = 'move'
    } else {
      event.type = ['left', 'middle', 'right', 'none'][code & 3]
    }

    events.push(event)
    consumed = pattern.lastIndex
  }

  const rest = buffer.slice(consumed)
  const partial = rest.lastIndexOf(`${ESC}[<`)

  return { events, rest: partial === -1 ? '' : rest.slice(partial) }
}

function describeTerminal() {
  const env = process.env

  return [
    `platform=${process.platform}`,
    `node=${process.version}`,
    `size=${process.stdout.columns}x${process.stdout.rows}`,
    env.WT_SESSION ? 'host=Windows Terminal' : null,
    env.TERM_PROGRAM ? `TERM_PROGRAM=${env.TERM_PROGRAM}` : null,
    env.TERM ? `TERM=${env.TERM}` : null,
  ]
    .filter(Boolean)
    .join('  ')
}

function runInteractive() {
  const { stdin, stdout } = process
  const counts = { clicks: 0, moves: 0, wheel: 0, keys: 0 }
  const recent = []
  let selected = 0
  let hovered = -1
  let opened = null
  let pending = ''
  let restored = false

  function restore() {
    if (restored) return
    restored = true
    stdout.write(MOUSE_OFF + SCREEN_OFF)
    stdin.setRawMode(false)
  }

  // Leave the terminal usable whatever happens.
  process.on('exit', restore)
  process.on('uncaughtException', error => {
    restore()
    console.error(error)
    process.exit(1)
  })

  function itemAt(row) {
    const index = row - FIRST_ITEM_ROW
    return index >= 0 && index < ITEMS.length ? index : -1
  }

  function render() {
    const lines = [
      '  Mouse test: click, hover or scroll. Arrows + Enter also work. q quits.',
      `  ${describeTerminal()}`,
      '',
      ...ITEMS.map((item, index) => {
        const marker = index === selected ? '❯' : ' '
        const text = `  ${marker} ${item}`.padEnd(30)

        if (index === selected) return `${ESC}[36m${text}${ESC}[0m`
        if (index === hovered) return `${ESC}[7m${text}${ESC}[0m`
        return text
      }),
      '',
      `  Opened: ${opened ?? '-'}`,
      `  Clicks: ${counts.clicks}   Moves: ${counts.moves}   Wheel: ${counts.wheel}   Keys: ${counts.keys}`,
      counts.clicks + counts.moves + counts.wheel === 0
        ? `  ${ESC}[33mNo mouse events received yet.${ESC}[0m`
        : `  ${ESC}[32mMouse events are reported by this terminal.${ESC}[0m`,
      '',
      '  Last input (raw):',
      ...recent.map(entry => `    ${entry}`),
    ]

    stdout.write(`${ESC}[H${ESC}[2J` + lines.join('\r\n'))
  }

  function record(raw) {
    const visible = JSON.stringify(raw).slice(1, -1).slice(0, 60)
    recent.unshift(visible)
    recent.length = Math.min(recent.length, 5)
  }

  function open(index) {
    selected = index
    opened = ITEMS[index]
  }

  function handleMouse(event) {
    if (event.type === 'move') {
      counts.moves++
      hovered = itemAt(event.row)
    } else if (event.type.startsWith('wheel')) {
      counts.wheel++
      const step = event.type === 'wheel-down' ? 1 : -1
      selected = Math.min(ITEMS.length - 1, Math.max(0, selected + step))
    } else if (event.type === 'left' && !event.released) {
      counts.clicks++
      const index = itemAt(event.row)

      // First click selects, a click on the selected item opens it.
      if (index === selected) open(index)
      else if (index !== -1) selected = index
    }
  }

  function handleKeys(text) {
    counts.keys++

    if (text === 'q' || text === '\x03') {
      restore()
      process.exit(0)
    }

    if (text === `${ESC}[A`) selected = Math.max(0, selected - 1)
    if (text === `${ESC}[B`) selected = Math.min(ITEMS.length - 1, selected + 1)
    if (text === '\r') open(selected)
  }

  stdin.setRawMode(true)
  stdin.setEncoding('utf8')
  stdout.write(SCREEN_ON + MOUSE_ON)

  stdin.on('data', chunk => {
    record(chunk)

    const { events, rest } = parseMouse(pending + chunk)
    pending = rest

    if (events.length > 0) {
      events.forEach(handleMouse)
    } else if (!rest) {
      handleKeys(chunk)
    }

    render()
  })

  stdout.on('resize', render)
  render()
}

function runParser() {
  let input = ''

  process.stdin.setEncoding('utf8')
  process.stdin.on('data', chunk => (input += chunk))
  process.stdin.on('end', () => {
    for (const event of parseMouse(input).events) {
      console.log(JSON.stringify(event))
    }
  })
}

// Only start when run directly, so tests can import parseMouse.
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  if (process.stdin.isTTY && process.stdout.isTTY) {
    runInteractive()
  } else {
    runParser()
  }
}
