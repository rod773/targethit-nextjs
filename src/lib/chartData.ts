export interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface LiqBand {
  price: number
  thickness: number
  side: 'long' | 'short'
  strength: number
}

export const INTERVALS = ['1m', '15m', '1h', '4h', '1d'] as const
export type Interval = (typeof INTERVALS)[number]

export const RANGES = ['1D', '3D', '1W', '2W', '1M', '3M', '6M'] as const
export type Range = (typeof RANGES)[number]

export const INTERVAL_MS: Record<Interval, number> = {
  '1m': 60_000,
  '15m': 900_000,
  '1h': 3_600_000,
  '4h': 14_400_000,
  '1d': 86_400_000,
}

export const RANGE_MS: Record<Range, number> = {
  '1D': 86_400_000,
  '3D': 3 * 86_400_000,
  '1W': 7 * 86_400_000,
  '2W': 14 * 86_400_000,
  '1M': 30 * 86_400_000,
  '3M': 90 * 86_400_000,
  '6M': 180 * 86_400_000,
}

function hashSeed(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(a: number) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function barCount(interval: Interval, range: Range): number {
  const n = Math.round(RANGE_MS[range] / INTERVAL_MS[interval])
  return Math.max(24, Math.min(600, n))
}

/**
 * Deterministic synthetic OHLCV history that ends exactly at `base`.
 * Volatility scales with the square root of the interval so higher
 * timeframes look proportionally larger.
 */
export function generateCandles(
  symbol: string,
  base: number,
  interval: Interval,
  range: Range,
): Candle[] {
  return generateCandlesN(symbol, base, interval, barCount(interval, range))
}

export function generateCandlesN(
  symbol: string,
  base: number,
  interval: Interval,
  count: number,
): Candle[] {
  const rnd = mulberry32(hashSeed(`${symbol}:${interval}:${count}`))
  const intervalFactor = Math.sqrt(INTERVAL_MS[interval] / INTERVAL_MS['1h'])
  const vol = 0.0045 * intervalFactor

  const raw: Candle[] = []
  let price = base * (0.82 + rnd() * 0.36)
  const end = Math.floor(Date.now() / INTERVAL_MS[interval]) * INTERVAL_MS[interval]

  for (let i = 0; i < count; i++) {
    const drift = (rnd() - 0.5) * vol * 2
    const open = price
    const close = open * (1 + drift)
    const high = Math.max(open, close) * (1 + rnd() * vol * 0.7)
    const low = Math.min(open, close) * (1 - rnd() * vol * 0.7)
    const volume = 0.4 + rnd() * 3.2
    raw.push({
      time: end - (count - 1 - i) * INTERVAL_MS[interval],
      open,
      high,
      low,
      close,
      volume,
    })
    price = close
  }

  const factor = base / raw[raw.length - 1].close
  return raw.map((c) => ({
    time: c.time,
    open: c.open * factor,
    high: c.high * factor,
    low: c.low * factor,
    close: c.close * factor,
    volume: c.volume,
  }))
}

/** Advance the final candle with a small random tick, returning a new array. */
export function tick(candles: Candle[], volatility = 0.0012): Candle[] {
  if (candles.length === 0) return candles
  const next = candles.slice()
  const last = { ...next[next.length - 1] }
  const move = (Math.random() - 0.5) * last.close * volatility * 2
  last.close = Math.max(0.000001, last.close + move)
  last.high = Math.max(last.high, last.close)
  last.low = Math.min(last.low, last.close)
  last.volume += Math.random() * 0.15
  next[next.length - 1] = last
  return next
}

export function liqBands(candles: Candle[], seedKey: string): LiqBand[] {
  if (candles.length === 0) return []
  const rnd = mulberry32(hashSeed(`liq:${seedKey}`))
  const lows = candles.map((c) => c.low)
  const highs = candles.map((c) => c.high)
  const min = Math.min(...lows)
  const max = Math.max(...highs)
  const span = max - min || max * 0.02
  const bands: LiqBand[] = []
  const count = 46
  for (let i = 0; i < count; i++) {
    const t = rnd()
    const price = min + span * t
    const side: 'long' | 'short' = price > (min + max) / 2 ? 'short' : 'long'
    bands.push({
      price,
      thickness: span * (0.002 + rnd() * 0.006),
      side,
      strength: 0.18 + rnd() * 0.5,
    })
  }
  return bands
}

export interface CvPoint {
  time: number
  cvd: number
}

/** Cumulative volume delta derived from candles (deterministic-ish). */
export function cvdSeries(candles: Candle[]): CvPoint[] {
  const rnd = mulberry32(hashSeed(candles.length ? String(candles[0].time) : 'cvd'))
  let cum = 0
  return candles.map((c) => {
    const dir = c.close >= c.open ? 1 : -1
    const delta = dir * c.volume * (0.6 + rnd() * 0.8)
    cum += delta
    return { time: c.time, cvd: cum }
  })
}