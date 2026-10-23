#!/usr/bin/env node

import { startCli } from './lib/cli.js'

startCli().catch(error => {
  console.error(`\n  CLI error: ${error.message}`)
  process.exitCode = 1
})
