import type { Candle } from './chartData'

export type IndicatorGroup = 'overlay' | 'oscillator'

export interface IndicatorDef {
  id: string
  name: string
  group: IndicatorGroup
  category: string
  desc: string
}

export const INDICATORS: IndicatorDef[] = [
  { id: 'liq', name: 'Liquidations Heatmap', group: 'overlay', category: 'Liquidity', desc: 'Modeled liquidation clusters' },
  { id: 'cvd', name: 'CVD', group: 'overlay', category: 'Order flow', desc: 'Cumulative volume delta' },
  { id: 'ema20', name: 'EMA 20', group: 'overlay', category: 'Moving averages', desc: 'Exponential moving average' },
  { id: 'ema50', name: 'EMA 50', group: 'overlay', category: 'Moving averages', desc: 'Exponential moving average' },
  { id: 'sma200', name: 'SMA 200', group: 'overlay', category: 'Moving averages', desc: 'Simple moving average' },
  { id: 'vwap', name: 'VWAP', group: 'overlay', category: 'Volume', desc: 'Volume weighted average price' },
  { id: 'bb', name: 'Bollinger Bands', group: 'overlay', category: 'Volatility', desc: '20, 2 standard deviations' },
  { id: 'psar', name: 'Parabolic SAR', group: 'overlay', category: 'Trend', desc: 'Stop and reverse' },
  { id: 'volume', name: 'Volume', group: 'overlay', category: 'Volume', desc: 'Traded volume histogram' },
  { id: 'rsi', name: 'RSI', group: 'oscillator', category: 'Momentum', desc: 'Relative strength index (14)' },
  { id: 'macd', name: 'MACD', group: 'oscillator', category: 'Momentum', desc: '12, 26, 9' },
  { id: 'stoch', name: 'Stochastic', group: 'oscillator', category: 'Momentum', desc: '%K and %D (14, 3)' },
  { id: 'atr', name: 'ATR', group: 'oscillator', category: 'Volatility', desc: 'Average true range (14)' },
  { id: 'cci', name: 'CCI', group: 'oscillator', category: 'Momentum', desc: 'Commodity channel index (20)' },
  { id: 'mom', name: 'Momentum', group: 'oscillator', category: 'Momentum', desc: 'Price change (10)' },
  { id: 'awesome', name: 'Awesome Oscillator', group: 'oscillator', category: 'Momentum', desc: 'Median price momentum' },
]

export interface Series {
  key: string
  label: string
  color: string
  data: (number | null)[]
  dashed?: boolean
}

export interface IndicatorResult {
  overlays: Series[]
  oscillator: Series[]
  histogram?: { data: number[]; positive: string; negative: string }
}

function sma(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = []
  let sum = 0
  for (let i = 0; i < values.length; i++) {
    sum += values[i]
    if (i >= period) sum -= values[i - period]
    out.push(i >= period - 1 ? sum / period : null)
  }
  return out
}

function ema(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = []
  const k = 2 / (period + 1)
  let prev: number | null = null
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      out.push(null)
      continue
    }
    if (prev === null) {
      let sum = 0
      for (let j = i - period + 1; j <= i; j++) sum += values[j]
      prev = sum / period
    } else {
      prev = values[i] * k + prev * (1 - k)
    }
    out.push(prev)
  }
  return out
}

function stddev(values: number[], period: number, offset: number): (number | null)[] {
  const out: (number | null)[] = []
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      out.push(null)
      continue
    }
    const slice = values.slice(i - period + 1, i + 1)
    const mean = slice.reduce((a, b) => a + b, 0) / period
    const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period
    out.push(Math.sqrt(variance) * offset)
  }
  return out
}

function rsi(values: number[], period = 14): (number | null)[] {
  const out: (number | null)[] = [null]
  let gain = 0
  let loss = 0
  for (let i = 1; i < values.length; i++) {
    const diff = values[i] - values[i - 1]
    const g = Math.max(diff, 0)
    const l = Math.max(-diff, 0)
    if (i <= period) {
      gain += g
      loss += l
      if (i === period) {
        gain /= period
        loss /= period
        out.push(loss === 0 ? 100 : 100 - 100 / (1 + gain / loss))
      } else out.push(null)
    } else {
      gain = (gain * (period - 1) + g) / period
      loss = (loss * (period - 1) + l) / period
      out.push(loss === 0 ? 100 : 100 - 100 / (1 + gain / loss))
    }
  }
  return out
}

function psar(candles: Candle[], step = 0.02, max = 0.2): (number | null)[] {
  const out: (number | null)[] = new Array(candles.length).fill(null)
  if (candles.length < 2) return out
  let bull = candles[1].close >= candles[0].close
  let sar = bull ? candles[0].low : candles[0].high
  let ep = bull ? candles[0].high : candles[0].low
  let af = step
  for (let i = 1; i < candles.length; i++) {
    sar = sar + af * (ep - sar)
    const c = candles[i]
    if (bull) {
      if (c.low < sar) {
        bull = false
        sar = ep
        ep = c.low
        af = step
      } else {
        if (c.high > ep) {
          ep = c.high
          af = Math.min(af + step, max)
        }
      }
    } else {
      if (c.high > sar) {
        bull = true
        sar = ep
        ep = c.high
        af = step
      } else {
        if (c.low < ep) {
          ep = c.low
          af = Math.min(af + step, max)
        }
      }
    }
    out[i] = sar
  }
  return out
}

export function computeIndicator(id: string, candles: Candle[]): IndicatorResult | null {
  const closes = candles.map((c) => c.close)
  const highs = candles.map((c) => c.high)
  const lows = candles.map((c) => c.low)
  const n = candles.length

  switch (id) {
    case 'ema20':
      return { overlays: [{ key: 'ema20', label: 'EMA 20', color: '#4c9aff', data: ema(closes, 20) }], oscillator: [] }
    case 'ema50':
      return { overlays: [{ key: 'ema50', label: 'EMA 50', color: '#ff9f40', data: ema(closes, 50) }], oscillator: [] }
    case 'sma200':
      return { overlays: [{ key: 'sma200', label: 'SMA 200', color: '#c084fc', data: sma(closes, 200) }], oscillator: [] }
    case 'vwap': {
      let pv = 0
      let vol = 0
      const data = candles.map((c) => {
        const tp = (c.high + c.low + c.close) / 3
        pv += tp * c.volume
        vol += c.volume
        return vol ? pv / vol : null
      })
      return { overlays: [{ key: 'vwap', label: 'VWAP', color: '#22d3ee', data, dashed: true }], oscillator: [] }
    }
    case 'bb': {
      const mid = sma(closes, 20)
      const sd = stddev(closes, 20, 2)
      const upper = mid.map((m, i) => (m === null || sd[i] === null ? null : m + sd[i]!))
      const lower = mid.map((m, i) => (m === null || sd[i] === null ? null : m - sd[i]!))
      return {
        overlays: [
          { key: 'bb-m', label: 'BB 20', color: '#4c9aff', data: mid },
          { key: 'bb-u', label: 'BB upper', color: '#4c9aff', data: upper, dashed: true },
          { key: 'bb-l', label: 'BB lower', color: '#4c9aff', data: lower, dashed: true },
        ],
        oscillator: [],
      }
    }
    case 'psar':
      return { overlays: [{ key: 'psar', label: 'PSAR', color: '#f472b6', data: psar(candles) }], oscillator: [] }
    case 'volume':
      return {
        overlays: [],
        oscillator: [],
        histogram: {
          data: candles.map((c) => c.volume),
          positive: 'var(--th-buy)',
          negative: 'var(--th-sell)',
        },
      }
    case 'rsi':
      return { overlays: [], oscillator: [{ key: 'rsi', label: 'RSI 14', color: '#c084fc', data: rsi(closes, 14) }] }
    case 'macd': {
      const fast = ema(closes, 12)
      const slow = ema(closes, 26)
      const macd = fast.map((f, i) => (f === null || slow[i] === null ? null : f - slow[i]!))
      const macdClean = macd.map((v) => v ?? 0)
      const signal = ema(macdClean, 9)
      const hist = macd.map((m, i) => (m === null || signal[i] === null ? 0 : m - signal[i]!))
      return {
        overlays: [],
        oscillator: [
          { key: 'macd', label: 'MACD 12,26', color: '#4c9aff', data: macd },
          { key: 'signal', label: 'Signal 9', color: '#ff9f40', data: signal },
        ],
        histogram: { data: hist, positive: 'var(--th-buy)', negative: 'var(--th-sell)' },
      }
    }
    case 'stoch': {
      const k: (number | null)[] = []
      for (let i = 0; i < n; i++) {
        if (i < 13) {
          k.push(null)
          continue
        }
        const hi = Math.max(...highs.slice(i - 13, i + 1))
        const lo = Math.min(...lows.slice(i - 13, i + 1))
        k.push(hi === lo ? 50 : ((closes[i] - lo) / (hi - lo)) * 100)
      }
      const kClean = k.map((v) => v ?? 0)
      const d = sma(kClean, 3)
      return {
        overlays: [],
        oscillator: [
          { key: 'k', label: '%K 14', color: '#4c9aff', data: k },
          { key: 'd', label: '%D 3', color: '#ff9f40', data: d },
        ],
      }
    }
    case 'atr': {
      const tr = candles.map((c, i) => {
        if (i === 0) return c.high - c.low
        const pc = candles[i - 1].close
        return Math.max(c.high - c.low, Math.abs(c.high - pc), Math.abs(c.low - pc))
      })
      return { overlays: [], oscillator: [{ key: 'atr', label: 'ATR 14', color: '#22d3ee', data: sma(tr, 14) }] }
    }
    case 'cci': {
      const tp = candles.map((c) => (c.high + c.low + c.close) / 3)
      const out: (number | null)[] = []
      for (let i = 0; i < n; i++) {
        if (i < 19) {
          out.push(null)
          continue
        }
        const slice = tp.slice(i - 19, i + 1)
        const mean = slice.reduce((a, b) => a + b, 0) / 20
        const md = slice.reduce((a, b) => a + Math.abs(b - mean), 0) / 20
        out.push(md === 0 ? 0 : (tp[i] - mean) / (0.015 * md))
      }
      return { overlays: [], oscillator: [{ key: 'cci', label: 'CCI 20', color: '#f472b6', data: out }] }
    }
    case 'mom':
      return {
        overlays: [],
        oscillator: [
          {
            key: 'mom',
            label: 'Momentum 10',
            color: '#4c9aff',
            data: closes.map((c, i) => (i < 10 ? null : c - closes[i - 10])),
          },
        ],
      }
    case 'awesome': {
      const median = candles.map((c) => (c.high + c.low) / 2)
      const fast = sma(median, 5)
      const slow = sma(median, 34)
      return {
        overlays: [],
        oscillator: [
          {
            key: 'ao',
            label: 'Awesome',
            color: '#22d3ee',
            data: fast.map((f, i) => (f === null || slow[i] === null ? null : f - slow[i]!)),
          },
        ],
      }
    }
    default:
      return null
  }
}