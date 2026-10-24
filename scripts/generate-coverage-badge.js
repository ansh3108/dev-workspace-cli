import { readFile, mkdir, writeFile } from 'node:fs/promises'

const summary = JSON.parse(
  await readFile('coverage/coverage-summary.json', 'utf8'),
)

const percentage = summary.total.lines.pct
const value = `${percentage.toFixed(2)}%`

const color =
  percentage >= 90 ? '#4c1' : percentage >= 80 ? '#dfb317' : '#e05d44'

const labelWidth = 74
const valueWidth = Math.max(36, value.length * 7 + 12)
const width = labelWidth + valueWidth

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="20" role="img" aria-label="coverage: ${value}">
  <title>Coverage: ${value}</title>
  <linearGradient id="b" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r"><rect width="${width}" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <path fill="#555" d="M0 0h${labelWidth}v20H0z"/>
    <path fill="${color}" d="M${labelWidth} 0h${valueWidth}v20H${labelWidth}z"/>
    <path fill="url(#b)" d="M0 0h${width}v20H0z"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,sans-serif" font-size="11">
    <text x="${labelWidth / 2}" y="14">coverage</text>
    <text x="${labelWidth + valueWidth / 2}" y="14">${value}</text>
  </g>
</svg>
`

await mkdir('public', { recursive: true })
await writeFile('public/coverage.svg', svg)

console.log(`Coverage badge generated: ${value}`)
