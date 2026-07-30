const DASH = '—'

const decimal2 = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const integer = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })

export const isBlank = (value) => value === null || value === undefined || value === ''

/** Two decimals, en-IN grouping. Blank values render as an em dash, not "NaN". */
export function formatNumber(value, fractionDigits = 2) {
  if (isBlank(value) || Number.isNaN(Number(value))) return DASH
  if (fractionDigits === 0) return integer.format(Number(value))
  if (fractionDigits === 2) return decimal2.format(Number(value))
  return Number(value).toFixed(fractionDigits)
}

export function formatPercent(value, fractionDigits = 2) {
  if (isBlank(value) || Number.isNaN(Number(value))) return DASH
  return `${formatNumber(value, fractionDigits)}%`
}

/**
 * AUM in the Indian convention the source data uses: crore, promoted to
 * thousands of crore once the digits stop being readable.
 */
export function formatCrore(value) {
  if (isBlank(value) || Number.isNaN(Number(value))) return DASH
  const amount = Number(value)
  if (amount >= 100_000) return `₹${formatNumber(amount / 1000, 1)}k Cr`
  return `₹${formatNumber(amount, amount >= 1000 ? 0 : 2)} Cr`
}

export function formatScore(value) {
  return isBlank(value) ? DASH : formatNumber(value, 2)
}

export function formatCompleteness(value) {
  if (isBlank(value)) return DASH
  return `${Math.round(Number(value) * 100)}%`
}

export function formatWeight(value) {
  if (isBlank(value)) return DASH
  return `${formatNumber(Number(value) * 100, 1)}%`
}

/** Absolute local date+time, for the "last updated" line. */
export function formatDateTime(iso) {
  const ms = Date.parse(iso ?? '')
  if (Number.isNaN(ms)) return DASH
  return new Date(ms).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatTime(iso) {
  const ms = Date.parse(iso ?? '')
  if (Number.isNaN(ms)) return DASH
  return new Date(ms).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

/** "3 hours ago" / "in 14 hours" -- the part people actually read. */
export function formatRelative(iso, now = Date.now()) {
  const ms = Date.parse(iso ?? '')
  if (Number.isNaN(ms)) return DASH

  const diffSeconds = Math.round((ms - now) / 1000)
  const magnitude = Math.abs(diffSeconds)
  const units = [
    ['second', 60],
    ['minute', 60],
    ['hour', 24],
    ['day', 7],
    ['week', 4.35],
    ['month', 12],
  ]

  if (magnitude < 45) return diffSeconds >= 0 ? 'in a moment' : 'just now'

  let value = diffSeconds
  for (const [unit, limit] of units) {
    if (Math.abs(value) < limit) {
      return new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(
        Math.round(value),
        unit,
      )
    }
    value /= limit
  }
  return new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(
    Math.round(value),
    'year',
  )
}

export { DASH }
