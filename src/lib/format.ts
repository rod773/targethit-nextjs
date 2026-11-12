export function formatPrice(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  const abs = Math.abs(value)
  let d = decimals
  if (abs > 0 && abs < 0.01) d = Math.max(decimals, 6)
  else if (abs < 1) d = Math.max(decimals, 4)
  return value.toLocaleString('en-US', {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  })
}

export function formatCompact(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1e9) return (value / 1e9).toFixed(2) + 'B'
  if (abs >= 1e6) return (value / 1e6).toFixed(2) + 'M'
  if (abs >= 1e3) return (value / 1e3).toFixed(1) + 'K'
  return value.toFixed(2)
}

export function formatPct(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

export function formatSigned(value: number, decimals = 1): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`
}