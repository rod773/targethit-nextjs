import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react'
import type { Market } from '../data/markets'
import {
  barCount,
  generateCandlesN,
  liqBands,
  tick,
  type Candle,
  type Interval,
  type Range,
} from '../lib/chartData'
import {
  drawDrawing,
  hitTest,
  newId,
  type Drawing,
  type Pt,
  type ThemeColors,
  type ToolId,
  type View,
} from '../lib/drawings'
import { computeIndicator, type Series } from '../lib/indicators'
import { formatCompact, formatPct, formatPrice, formatSigned } from '../lib/format'
import type { ChartType, ScaleMode } from '../lib/types'

export type { ChartType, ScaleMode } from '../lib/types'

export interface ChartHandle {
  snapshot: () => void
}

interface ChartProps {
  market: Market
  interval: Interval
  range: Range
  chartType: ChartType
  indicators: string[]
  drawings: Drawing[]
  setDrawings: (updater: (prev: Drawing[]) => Drawing[]) => void
  selectedId: string | null
  setSelectedId: (id: string | null) => void
  activeTool: ToolId
  showGrid: boolean
  showLastPrice: boolean
  scaleMode: ScaleMode
  invert: boolean
  theme: string
  replayMode: boolean
  compare: string[]
}

const PAD = { left: 52, right: 68, top: 8, bottom: 26 }
const OSC_HEIGHT = 92
const AXIS_GAP = 12
const RIGHT_GAP_RATIO = 0.1 // 10% del ancho del plot como separación derecha

  /** Devuelve los límites de tiempo con una separación derecha proporcional al número de velas. */
  function timeBounds(cs: Candle[]) {
    const timeMin = cs[0].time
    const intervalMs = (cs[1]?.time ?? cs[0].time + 1) - cs[0].time
    const gapBars = RIGHT_GAP_RATIO * cs.length
    const timeMax = cs[cs.length - 1].time + intervalMs * (1 + gapBars)
    return { timeMin, timeMax, intervalMs }
  }

function readTheme(): ThemeColors {
  const cs = getComputedStyle(document.documentElement)
  const v = (n: string, f: string) => cs.getPropertyValue(n).trim() || f
  return {
    fg: v('--th-fg', '#f2f2f2'),
    muted: v('--th-muted', '#999999'),
    border: v('--th-border', '#333333'),
    buy: v('--th-buy', '#26a69a'),
    sell: v('--th-sell', '#ef5350'),
    primary: v('--th-primary', '#ce2c31'),
    grid: v('--th-border-soft', '#262626'),
    bg: v('--th-bg', '#0d0d0d'),
    card: v('--th-card', '#171717'),
  }
}

function fmtAxisTime(t: number, interval: Interval): string {
  const d = new Date(t)
  if (interval === '1d')
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return (
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  )
}

function fmtLegendTime(t: number): string {
  const d = new Date(t)
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const Chart = forwardRef<ChartHandle, ChartProps>(function Chart(props, ref) {
  const {
    market,
    interval,
    range,
    chartType,
    indicators,
    drawings,
    setDrawings,
    selectedId,
    setSelectedId,
    activeTool,
    showGrid,
    showLastPrice,
    scaleMode,
    invert,
    theme,
    replayMode,
    compare,
  } = props

  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [size, setSize] = useState({ w: 800, h: 600 })
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null)
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const [replayIdx, setReplayIdx] = useState<number>(-1)

  const base = market.last ?? 100
  const TOTAL_BARS = 1200
  const baseCount = useMemo(() => barCount(interval, range), [interval, range])
  const [zoom, setZoom] = useState(1)
  const viewCount = Math.max(20, Math.min(TOTAL_BARS, Math.round(baseCount * zoom)))
  const allCandles = useMemo(
    () => generateCandlesN(market.id + market.name, base, interval, TOTAL_BARS),
    [market.id, market.name, base, interval],
  )

  const [candles, setCandles] = useState<Candle[]>(allCandles)
  const [offset, setOffset] = useState(Math.max(0, allCandles.length - baseCount))
  const [panning, setPanning] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)
  const pan = useRef<{ startX: number; startY: number; startOffset: number; moved: boolean } | null>(null)
  const [yZoom, setYZoom] = useState(1)
  const [yPan, setYPan] = useState(0)
  const axisDrag = useRef<{ startY: number; startZoom: number } | null>(null)

  useEffect(() => {
    setCandles(allCandles)
    setReplayIdx(-1)
  }, [allCandles])

  // reset the viewport when the market / timeframe / range changes
  useEffect(() => {
    setZoom(1)
    setYZoom(1)
    setYPan(0)
    setOffset(Math.max(0, allCandles.length - baseCount))
    setReplayIdx(-1)
  }, [allCandles, baseCount])

  // cuando autoScroll está activo, mantener la última vela alineada a la derecha con el gap
  useEffect(() => {
    if (!autoScroll || panning) return
    const maxOffset = Math.max(0, candles.length - viewCount)
    setOffset(maxOffset)
  }, [candles.length, autoScroll])

  useEffect(() => {
    if (replayMode) return
    const t = setInterval(() => {
      setCandles((c) => tick(c))
      if (autoScroll && !panning) {
        setOffset((o) => Math.max(0, o + 1))
      }
    }, 1400)
    return () => clearInterval(t)
  }, [replayMode, market.id, autoScroll, panning])

  useEffect(() => {
    if (!replayMode) {
      setReplayIdx(-1)
      return
    }
    setReplayIdx((i) => (i < 0 ? Math.floor(candles.length * 0.7) : i))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replayMode])

  const displayCandles = useMemo(() => {
    if (replayMode && replayIdx >= 0) return candles.slice(0, replayIdx + 1)
    const maxOffset = Math.max(0, candles.length - viewCount)
    const start = Math.min(Math.max(0, offset), maxOffset)
    return candles.slice(start, start + viewCount)
  }, [candles, offset, viewCount, replayMode, replayIdx])

  // resize observer
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight })
    })
    ro.observe(el)
    setSize({ w: el.clientWidth, h: el.clientHeight })
    return () => ro.disconnect()
  }, [])

  // wheel zoom (native listener so preventDefault works)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const onWheel = (e: WheelEvent) => {
      if (activeTool !== 'cursor') return
      const rect = canvas.getBoundingClientRect()
      const overAxis = e.clientX - rect.left > rect.width - PAD.right
      e.preventDefault()
      if (overAxis) {
        const factor = e.deltaY > 0 ? 0.9 : 1.1
        setYZoom((z) => Math.min(30, Math.max(0.2, z * factor)))
        return
      }
      const factor = e.deltaY > 0 ? 1.12 : 0.89
      setZoom((z) => {
        const newZoom = Math.min(Math.max(z * factor, 20 / baseCount), TOTAL_BARS / baseCount)
        if (autoScroll) {
          const newViewCount = Math.max(20, Math.min(TOTAL_BARS, Math.round(baseCount * newZoom)))
          const maxOffset = Math.max(0, candles.length - newViewCount)
          setOffset(maxOffset)
        }
        return newZoom
      })
    }
    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', onWheel)
  }, [activeTool, baseCount, autoScroll, candles.length])

  // drawing draft + drag state (refs to avoid re-render storms)
  const draft = useRef<{ tool: ToolId; pts: Pt[]; moved: boolean } | null>(null)
  const drag = useRef<{
    id: string
    startX: number
    startY: number
    orig: Drawing
    moved: boolean
  } | null>(null)

  const geom = useCallback(() => {
    const { w, h } = size
    const hasOsc = indicators.some((id) => {
      const def = ['rsi', 'macd', 'stoch', 'atr', 'cci', 'mom', 'awesome'].includes(id)
      return def
    })
    const oscH = hasOsc ? OSC_HEIGHT : 0
    const plot = {
      x: PAD.left,
      y: PAD.top,
      w: Math.max(10, w - PAD.left - PAD.right),
      h: Math.max(10, h - PAD.top - PAD.bottom - oscH),
    }
    return { w, h, plot, oscH }
  }, [size, indicators])

  const toXY = useCallback(
    (clientX: number, clientY: number) => {
      const rect = canvasRef.current!.getBoundingClientRect()
      return { x: clientX - rect.left, y: clientY - rect.top }
    },
    [],
  )

  const dataToPrice = useCallback(
    (x: number, y: number, plot: { x: number; y: number; w: number; h: number }) => {
      const { priceMin, priceMax, tf, inv } = scales(displayCandles, scaleMode)
      const v = priceMax - ((y - plot.y) / plot.h) * (priceMax - priceMin)
      const t = ((x - plot.x) / plot.w) * 1
      return { price: inv(v), time: t, tf, inv, priceMin, priceMax }
    },
    [displayCandles, scaleMode],
  )

const scales = (cs: Candle[], mode: ScaleMode) => {
    const firstClose = cs[0]?.close ?? 1
    const tf = (p: number) =>
      mode === 'log'
        ? Math.log(p)
        : mode === 'percent'
          ? (p / firstClose - 1) * 100
          : mode === 'indexed'
            ? (p / firstClose) * 100
            : p
    const inv = (v: number) =>
      mode === 'log'
        ? Math.exp(v)
        : mode === 'percent'
          ? firstClose * (1 + v / 100)
          : mode === 'indexed'
            ? (firstClose * v) / 100
            : v
    const lows = cs.map((c) => tf(c.low))
    const highs = cs.map((c) => tf(c.high))
    let priceMin = Math.min(...lows)
    let priceMax = Math.max(...highs)
    if (!isFinite(priceMin) || !isFinite(priceMax)) {
      priceMin = 0
      priceMax = 1
    }
    const padding = (priceMax - priceMin) * 0.06 || priceMax * 0.02
    let pMin = priceMin - padding
    let pMax = priceMax + padding
    if (yZoom !== 1) {
      const center = (pMin + pMax) / 2
      const half = (pMax - pMin) / 2 / yZoom
      pMin = center - half
      pMax = center + half
    }
    // vertical pan
    if (yPan !== 0) {
      const range = pMax - pMin
      const shift = range * yPan * 0.15
      pMin += shift
      pMax += shift
    }
    return { priceMin: pMin, priceMax: pMax, tf, inv, firstClose }
  }

  // main draw
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const { w, h, plot, oscH } = geom()
    canvas.width = Math.floor(w * dpr)
    canvas.height = Math.floor(h * dpr)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)
    const theme = readTheme()
    const cs = displayCandles
    if (cs.length === 0) return

const sc = scales(cs, scaleMode)
    const { timeMin, timeMax } = timeBounds(cs)
    const xOf = (t: number) =>
      plot.x + ((t - timeMin) / (timeMax - timeMin || 1)) * plot.w
    const yOf = (p: number) => {
      const v = sc.tf(p)
      const y = plot.y + ((sc.priceMax - v) / (sc.priceMax - sc.priceMin || 1)) * plot.h
      return invert ? plot.y + plot.h - (y - plot.y) : y
    }
    const barW = Math.max(1, (plot.w / cs.length) * 0.7)

    // heatmap
    if (indicators.includes('liq')) {
      const bands = liqBands(cs, market.id)
      for (const b of bands) {
        const y = yOf(b.price)
        const th = Math.max(1, (b.thickness / (sc.priceMax - sc.priceMin)) * plot.h)
        ctx.fillStyle =
          b.side === 'short'
            ? `rgba(239, 83, 80, ${0.05 + b.strength * 0.14})`
            : `rgba(38, 166, 154, ${0.05 + b.strength * 0.14})`
        ctx.fillRect(plot.x, y, plot.w, th)
      }
    }

    // grid
    if (showGrid) {
      ctx.strokeStyle = theme.grid
      ctx.lineWidth = 1
      ctx.globalAlpha = 0.7
      const rows = 6
      for (let i = 0; i <= rows; i++) {
        const y = plot.y + (plot.h / rows) * i
        ctx.beginPath()
        ctx.moveTo(plot.x, y)
        ctx.lineTo(plot.x + plot.w, y)
        ctx.stroke()
      }
      const cols = 6
      for (let i = 0; i <= cols; i++) {
        const x = plot.x + (plot.w / cols) * i
        ctx.beginPath()
        ctx.moveTo(x, plot.y)
        ctx.lineTo(x, plot.y + plot.h)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    }

    // candles / bars / area
    const drawSeries = (list: Candle[]) => {
      if (chartType === 'candles') {
        list.forEach((c, i) => {
          const x = xOf(c.time)
          const up = c.close >= c.open
          ctx.strokeStyle = up ? theme.buy : theme.sell
          ctx.fillStyle = up ? theme.buy : theme.sell
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(x, yOf(c.high))
          ctx.lineTo(x, yOf(c.low))
          ctx.stroke()
          const yo = yOf(c.open)
          const yc = yOf(c.close)
          const top = Math.min(yo, yc)
          const bh = Math.max(1, Math.abs(yc - yo))
          ctx.fillRect(x - barW / 2, top, barW, bh)
        })
      } else if (chartType === 'bars') {
        list.forEach((c) => {
          const x = xOf(c.time)
          const up = c.close >= c.open
          ctx.strokeStyle = up ? theme.buy : theme.sell
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(x - barW / 2, yOf(c.open))
          ctx.lineTo(x, yOf(c.open))
          ctx.moveTo(x, yOf(c.high))
          ctx.lineTo(x, yOf(c.low))
          ctx.moveTo(x, yOf(c.close))
          ctx.lineTo(x + barW / 2, yOf(c.close))
          ctx.stroke()
        })
      } else {
        // area / line
        ctx.beginPath()
        list.forEach((c, i) => {
          const x = xOf(c.time)
          const y = yOf(c.close)
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        })
        if (chartType === 'area') {
          const grad = ctx.createLinearGradient(0, plot.y, 0, plot.y + plot.h)
          grad.addColorStop(0, 'rgba(38, 166, 154, 0.35)')
          grad.addColorStop(1, 'rgba(38, 166, 154, 0)')
          ctx.save()
          ctx.lineTo(xOf(list[list.length - 1].time), plot.y + plot.h)
          ctx.lineTo(xOf(list[0].time), plot.y + plot.h)
          ctx.closePath()
          ctx.fillStyle = grad
          ctx.fill()
          ctx.restore()
          ctx.beginPath()
          list.forEach((c, i) => {
            const x = xOf(c.time)
            const y = yOf(c.close)
            if (i === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          })
        }
        ctx.strokeStyle = theme.buy
        ctx.lineWidth = 1.6
        ctx.stroke()
      }
    }
    drawSeries(cs)

    // overlay indicators
    for (const id of indicators) {
      if (['rsi', 'macd', 'stoch', 'atr', 'cci', 'mom', 'awesome', 'liq'].includes(id)) continue
      const res = computeIndicator(id, cs)
      if (!res) continue
      for (const s of res.overlays) {
        drawLine(ctx, s, xOf, yOf, plot, theme, cs.map((c) => c.time))
      }
    }

    // CVD overlay (top strip line)
    if (indicators.includes('cvd')) {
      let cum = 0
      const vals = cs.map((c) => {
        cum += (c.close >= c.open ? 1 : -1) * c.volume
        return cum
      })
      const min = Math.min(...vals)
      const max = Math.max(...vals)
      ctx.beginPath()
      vals.forEach((v, i) => {
        const x = xOf(cs[i].time)
        const y = plot.y + 30 + (1 - (v - min) / (max - min || 1)) * (plot.h * 0.25)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.strokeStyle = '#22d3ee'
      ctx.globalAlpha = 0.7
      ctx.lineWidth = 1.2
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    // oscillator pane
    if (oscH > 0) {
      const oscTop = plot.y + plot.h + 6
      const oscPlot = { x: plot.x, y: oscTop, w: plot.w, h: oscH - 18 }
      ctx.strokeStyle = theme.grid
      ctx.strokeRect(oscPlot.x, oscPlot.y, oscPlot.w, oscPlot.h)
      let offset = 0
      for (const id of indicators) {
        const res = computeIndicator(id, cs)
        if (!res || !res.oscillator.length) continue
        const allVals = res.oscillator.flatMap((s) => s.data.filter((v): v is number => v !== null))
        if (res.histogram) allVals.push(...res.histogram.data)
        const min = Math.min(...allVals, 0)
        const max = Math.max(...allVals, 0)
        const sub = {
          x: oscPlot.x,
          y: oscPlot.y + offset,
          w: oscPlot.w,
          h: oscPlot.h,
        }
        if (res.histogram) {
          const bw = Math.max(1, (sub.w / res.histogram.data.length) * 0.7)
          res.histogram.data.forEach((v, i) => {
            const x = xOf(cs[i].time)
            const y0 = sub.y + sub.h / 2
            const y = sub.y + sub.h - ((v - min) / (max - min || 1)) * sub.h
            ctx.fillStyle = v >= 0 ? theme.buy : theme.sell
            ctx.globalAlpha = 0.5
            ctx.fillRect(x - bw / 2, Math.min(y, y0), bw, Math.abs(y - y0) || 1)
          })
          ctx.globalAlpha = 1
        }
        for (const s of res.oscillator) {
          ctx.beginPath()
          let started = false
          s.data.forEach((v, i) => {
            if (v === null) {
              started = false
              return
            }
            const x = xOf(cs[i].time)
            const y = sub.y + sub.h - ((v - min) / (max - min || 1)) * sub.h
            if (!started) {
              ctx.moveTo(x, y)
              started = true
            } else ctx.lineTo(x, y)
          })
          ctx.strokeStyle = s.color
          ctx.lineWidth = 1.2
          ctx.stroke()
        }
        ctx.fillStyle = theme.muted
        ctx.font = '10px "JetBrains Mono", monospace'
        ctx.fillText(res.oscillator[0].label, sub.x + 4, sub.y + 10)
        offset += sub.h
      }
    }

    // drawings
    const view: View = {
      xOf,
      yOf,
      plot,
      candles: cs,
      priceMin: sc.priceMin,
      priceMax: sc.priceMax,
      theme,
    }
    for (const d of drawings) drawDrawing(ctx, d, view, d.id === selectedId)
    if (draft.current && draft.current.pts.length > 0) {
      drawDrawing(
        ctx,
        {
          id: 'draft',
          tool: draft.current.tool,
          pts: draft.current.pts,
          color: theme.primary,
          width: 1.5,
        },
        view,
        false,
      )
    }

// last price line
    const last = cs[cs.length - 1]
    if (showLastPrice) {
      const y = yOf(last.close)
      ctx.strokeStyle = last.close >= last.open ? theme.buy : theme.sell
      ctx.setLineDash([4, 4])
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(plot.x, y)
      ctx.lineTo(plot.x + plot.w, y)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = last.close >= last.open ? theme.buy : theme.sell
      const label = formatPrice(last.close, priceDigits(last.close))
      ctx.font = '10px "JetBrains Mono", monospace'
      const tw = ctx.measureText(label).width + 10
      ctx.fillRect(plot.x + plot.w + AXIS_GAP, y - 8, Math.min(tw, PAD.right - AXIS_GAP - 2), 16)
ctx.fillStyle = '#fff'
      ctx.fillText(label, plot.x + plot.w + AXIS_GAP, y + 3)
    }

    // price axis labels
    ctx.font = '10px "JetBrains Mono", monospace'
    ctx.fillStyle = theme.muted
    const rows = 6
    for (let i = 0; i <= rows; i++) {
      const v = sc.priceMax - (i / rows) * (sc.priceMax - sc.priceMin)
      const y = plot.y + (plot.h / rows) * i
      const label =
        scaleMode === 'percent'
          ? `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`
          : scaleMode === 'indexed'
            ? v.toFixed(2)
            : formatPrice(sc.inv(v), priceDigits(sc.inv(v)))
      ctx.fillText(label, plot.x + plot.w + AXIS_GAP, y + 3)
    }

    // time axis labels
    const tRows = 6
    for (let i = 0; i <= tRows; i++) {
      const t = timeMin + (i / tRows) * (timeMax - timeMin)
      const x = plot.x + (i / tRows) * plot.w
      ctx.fillStyle = theme.muted
      const label = fmtAxisTime(t, interval)
      const tw = ctx.measureText(label).width
      ctx.fillText(label, Math.min(Math.max(x - tw / 2, plot.x), plot.x + plot.w - tw), plot.y + plot.h + 16)
    }

    // crosshair
    if (hover) {
      const { x, y } = hover
      if (x >= plot.x && x <= plot.x + plot.w && y >= plot.y && y <= plot.y + plot.h) {
        ctx.strokeStyle = theme.muted
        ctx.globalAlpha = 0.6
        ctx.setLineDash([3, 3])
        ctx.beginPath()
        ctx.moveTo(x, plot.y)
        ctx.lineTo(x, plot.y + plot.h)
        ctx.moveTo(plot.x, y)
        ctx.lineTo(plot.x + plot.w, y)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.globalAlpha = 1
        // price tag
        const v = sc.priceMax - ((y - plot.y) / plot.h) * (sc.priceMax - sc.priceMin)
        const label =
          scaleMode === 'percent'
            ? `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`
            : scaleMode === 'indexed'
              ? v.toFixed(2)
              : formatPrice(sc.inv(v), priceDigits(sc.inv(v)))
ctx.fillStyle = theme.card
        ctx.strokeStyle = theme.border
        ctx.fillRect(plot.x + plot.w + AXIS_GAP, y - 8, PAD.right - AXIS_GAP - 2, 16)
        ctx.strokeRect(plot.x + plot.w + AXIS_GAP, y - 8, PAD.right - AXIS_GAP - 2, 16)
        ctx.fillStyle = theme.fg
        ctx.fillText(label, plot.x + plot.w + AXIS_GAP + 4, y + 3)
      }
    }

    // compare lines
    if (compare.length > 0) {
      const first = cs[0].close
      compare.forEach((sym, i) => {
        const cmp = generateCandlesN('cmp:' + sym, base * (1 + (i + 1) * 0.05), interval, cs.length)
        ctx.beginPath()
        cmp.forEach((c, j) => {
          if (j >= cs.length) return
          const x = xOf(cs[j].time)
          const y = yOf((c.close / cmp[0].close) * first)
          if (j === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        })
        ctx.strokeStyle = ['#f59e0b', '#a78bfa', '#34d399', '#f472b6'][i % 4]
        ctx.lineWidth = 1.2
        ctx.globalAlpha = 0.8
        ctx.stroke()
        ctx.globalAlpha = 1
      })
    }
  }, [
    size,
    displayCandles,
    chartType,
    indicators,
    drawings,
    selectedId,
    hover,
    showGrid,
    showLastPrice,
    scaleMode,
    invert,
    yZoom,
    yPan,
    geom,
    market.id,
    compare,
    theme,
  ])

  const priceDigits = (p: number) => {
    if (p >= 1000) return 1
    if (p >= 10) return 2
    if (p >= 1) return 3
    return 6
  }

  // ----- interactions -----
  const mousePos = (e: { clientX: number; clientY: number }) => {
    const { x, y } = toXY(e.clientX, e.clientY)
    return { x, y }
  }

  const onPointerDown = (e: ReactPointerEvent) => {
    const { x, y } = mousePos(e)
    const { plot } = geom()
    if (x > plot.x + plot.w) {
      axisDrag.current = { startY: y, startZoom: yZoom }
      ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
      return
    }
    const inPlot = x >= plot.x && x <= plot.x + plot.w && y >= plot.y && y <= plot.y + plot.h
    if (!inPlot) return
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)

if (activeTool !== 'cursor') {
      const cs = displayCandles
      const sc = scales(cs, scaleMode)
      const { timeMin, timeMax } = timeBounds(cs)
      const t = timeMin + ((x - plot.x) / plot.w) * (timeMax - timeMin)
      const v = sc.priceMax - ((y - plot.y) / plot.h) * (sc.priceMax - sc.priceMin)
      const price = sc.inv(v)
      const pt: Pt = { time: t, price }
      if (activeTool === 'text') {
        const text = window.prompt('Drawing text', 'Text') || 'Text'
        setDrawings((prev) => [
          ...prev,
          { id: newId(), tool: 'text', pts: [pt], text, color: readTheme().fg, width: 1 },
        ])
        return
      }
      draft.current = {
        tool: activeTool,
        pts: [pt, pt],
        moved: false,
      }
      return
    }

    // selection / drag
    const view = currentView()
    for (let i = drawings.length - 1; i >= 0; i--) {
      const d = drawings[i]
      if (d.locked) continue
      if (hitTest(d, x, y, view)) {
        setSelectedId(d.id)
        drag.current = { id: d.id, startX: x, startY: y, orig: d, moved: false }
        return
      }
    }
    setSelectedId(null)
    pan.current = { startX: x, startY: y, startOffset: offset, moved: false }
    setPanning(true)
    setAutoScroll(false)
    return
  }

const currentView = (): View => {
    const cs = displayCandles
    const { plot } = geom()
    const sc = scales(cs, scaleMode)
    const { timeMin, timeMax } = timeBounds(cs)
    return {
      xOf: (t: number) => plot.x + ((t - timeMin) / (timeMax - timeMin || 1)) * plot.w,
      yOf: (p: number) => {
        const v = sc.tf(p)
        const y = plot.y + ((sc.priceMax - v) / (sc.priceMax - sc.priceMin || 1)) * plot.h
        return invert ? plot.y + plot.h - (y - plot.y) : y
      },
      plot,
      candles: cs,
      priceMin: sc.priceMin,
      priceMax: sc.priceMax,
      theme: readTheme(),
    }
  }

  const onPointerMove = (e: ReactPointerEvent) => {
    const { x, y } = mousePos(e)
    setHover({ x, y })
    const { plot } = geom()
    if (x >= plot.x && x <= plot.x + plot.w) {
      const ratio = (x - plot.x) / plot.w
      const idx = Math.min(displayCandles.length - 1, Math.max(0, Math.floor(ratio * displayCandles.length)))
      setHoverIdx(idx)
    } else setHoverIdx(null)

if (draft.current) {
      const cs = displayCandles
      const sc = scales(cs, scaleMode)
      const { timeMin, timeMax } = timeBounds(cs)
      const t = timeMin + ((x - plot.x) / plot.w) * (timeMax - timeMin)
      const v = sc.priceMax - ((y - plot.y) / plot.h) * (sc.priceMax - sc.priceMin)
      const price = sc.inv(v)
      draft.current.pts[1] = { time: t, price }
      draft.current.moved = true
      return
    }

    if (axisDrag.current) {
      const dy = y - axisDrag.current.startY
      const next = axisDrag.current.startZoom * Math.exp(-dy / 180)
      setYZoom(Math.min(30, Math.max(0.2, next)))
      return
    }

    if (pan.current) {
      const dx = x - pan.current.startX
      const dy = y - pan.current.startY
      const barW = plot.w / Math.max(1, displayCandles.length)
      const delta = Math.round(-dx / barW)
      const maxOff = Math.max(0, candles.length - viewCount)
      setOffset(Math.min(Math.max(0, pan.current.startOffset + delta), maxOff))
      // vertical pan
      const priceRange = (() => {
        const cs = displayCandles
        const sc = scales(cs, scaleMode)
        return sc.priceMax - sc.priceMin
      })()
      const panShift = dy / plot.h * 0.05
      setYPan((prev) => Math.max(-2, Math.min(2, prev + panShift)))
      pan.current.moved = pan.current.moved || Math.abs(dx) > 2 || Math.abs(dy) > 2
      return
    }

    if (drag.current) {
      const cs = displayCandles
      const sc = scales(cs, scaleMode)
      const { plot } = geom()
      const dx = x - drag.current.startX
      const dy = y - drag.current.startY
      const dTime = (dx / plot.w) * (cs[cs.length - 1].time - cs[0].time)
      const dPrice = sc.inv(sc.priceMax - (dy / plot.h) * (sc.priceMax - sc.priceMin)) - sc.inv(sc.priceMax)
      const moved = drag.current.moved || Math.abs(dx) + Math.abs(dy) > 2
      drag.current.moved = moved
      if (!moved) return
      setDrawings((prev) =>
        prev.map((d) =>
          d.id === drag.current!.id
            ? {
                ...d,
                pts: drag.current!.orig.pts.map((p) => ({
                  time: p.time + dTime,
                  price: p.price + dPrice,
                })),
              }
            : d,
        ),
      )
    }
  }

  const onPointerUp = () => {
    if (draft.current) {
      const { tool, pts } = draft.current
      if (tool === 'brush' || tool === 'path') {
        setDrawings((prev) => [
          ...prev,
          { id: newId(), tool, pts, color: readTheme().fg, width: 1.5 },
        ])
      } else {
        setDrawings((prev) => [
          ...prev,
          { id: newId(), tool, pts: [pts[0], pts[1]], color: readTheme().fg, width: 1.5 },
        ])
      }
      draft.current = null
    }
    drag.current = null
    pan.current = null
    axisDrag.current = null
    setPanning(false)
  }

  const enableAutoScroll = () => setAutoScroll(true)

  const onPointerLeave = () => {
    setHover(null)
    setHoverIdx(null)
  }

  const onDoubleClick = (e: ReactMouseEvent) => {
    const { x, y } = mousePos(e)
    const { plot } = geom()
    if (x > plot.x + plot.w) {
      setYZoom(1)
      setYPan(0)
      return
    }
    setAutoScroll(true)
    const view = currentView()
    for (let i = drawings.length - 1; i >= 0; i--) {
      const d = drawings[i]
      if (d.tool === 'text' && hitTest(d, x, y, view)) {
        const text = window.prompt('Edit drawing text', d.text || 'Text')
        if (text !== null) {
          setDrawings((prev) => prev.map((x) => (x.id === d.id ? { ...x, text } : x)))
        }
        return
      }
    }
  }

// brush needs freehand: collect points on move while down
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!draft.current) return
      if (draft.current.tool !== 'brush' && draft.current.tool !== 'path') return
      const { x, y } = toXY(e.clientX, e.clientY)
      const { plot } = geom()
      const cs = displayCandles
      const sc = scales(cs, scaleMode)
      const { timeMin, timeMax } = timeBounds(cs)
      const t = timeMin + ((x - plot.x) / plot.w) * (timeMax - timeMin)
      const v = sc.priceMax - ((y - plot.y) / plot.h) * (sc.priceMax - sc.priceMin)
      draft.current.pts.push({ time: t, price: sc.inv(v) })
      draft.current.moved = true
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [toXY, geom, displayCandles, scaleMode])

  // keyboard delete
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
        setDrawings((prev) => prev.filter((d) => d.id !== selectedId))
        setSelectedId(null)
      }
      if (e.key === 'Escape') {
        setSelectedId(null)
        draft.current = null
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedId, setDrawings, setSelectedId])

  useImperativeHandle(ref, () => ({
    snapshot: () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const url = canvas.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = url
      a.download = `${market.ticker}-${interval}-chart.png`
      a.click()
    },
  }))

  const legendCandle =
    hoverIdx !== null && displayCandles[hoverIdx] ? displayCandles[hoverIdx] : displayCandles[displayCandles.length - 1]
  const prev = hoverIdx !== null && hoverIdx > 0 ? displayCandles[hoverIdx - 1] : displayCandles[displayCandles.length - 2]
  const chg = legendCandle && prev ? legendCandle.close - prev.close : 0
  const chgPct = legendCandle && prev ? (chg / prev.close) * 100 : 0
  const up = chg >= 0
  const overAxis = hover ? hover.x > size.w - PAD.right : false

  return (
    <div className="chart-pane" ref={wrapRef}>
      <canvas
        ref={canvasRef}
        className="chart-canvas"
        style={{
          cursor: overAxis
            ? 'ns-resize'
            : activeTool === 'cursor'
              ? panning
                ? 'grabbing'
                : 'grab'
              : 'crosshair',
          touchAction: 'none',
        }}
        title={
          overAxis
            ? 'Drag the price scale to zoom · double-click to reset'
            : activeTool === 'cursor'
              ? 'Drag to pan · scroll to zoom'
              : undefined
        }
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerLeave}
        onDoubleClick={onDoubleClick}
      />

      <div className="chart-legend">
        <div className="legend-symbol" onClick={() => {}}>
          <span className="dot" />
          {market.ticker}/USDT Â· {interval} Â· <span style={{ color: 'var(--th-muted)' }}>live tape</span>
          <span className="live">LIVE</span>
        </div>
        {legendCandle && (
          <div className="legend-ohlc">
            <span>O <b>{formatPrice(legendCandle.open, priceDigits(legendCandle.open))}</b></span>
            <span>H <b>{formatPrice(legendCandle.high, priceDigits(legendCandle.high))}</b></span>
            <span>L <b>{formatPrice(legendCandle.low, priceDigits(legendCandle.low))}</b></span>
            <span>C <b>{formatPrice(legendCandle.close, priceDigits(legendCandle.close))}</b></span>
            <span className={up ? 'up' : 'down'}>
              {formatSigned(chg, Math.abs(chg) >= 1 ? 1 : Math.abs(chg) >= 0.01 ? 4 : 6)} (
              {formatPct(chgPct)})
            </span>
            <span style={{ color: 'var(--th-faint)' }}>Vol {formatCompact(legendCandle.volume * 1000)}</span>
          </div>
        )}
        <div className="legend-chip">
          <span className="swatch" /> Liq heatmap (matrix) Â· both
        </div>
<div className="legend-chip">
          <span style={{ color: '#22d3ee' }}>CVD</span>
          <span className="cvd">1D</span>
          <span>âˆ’$472.4M Î” âˆ’$6.7M L âˆ’$408.4M S âˆ’$12.5M</span>
        </div>
        <button
          className="tb-btn"
          style={{
            marginLeft: 8,
            padding: '2px 8px',
            fontSize: 11,
            background: autoScroll ? 'var(--th-buy)' : 'transparent',
            color: autoScroll ? '#000' : 'var(--th-fg)',
            borderColor: autoScroll ? 'var(--th-buy)' : 'var(--th-border)',
          }}
          onClick={() => setAutoScroll((v) => !v)}
          title={autoScroll ? 'Auto-scroll ON · Click to disable' : 'Auto-scroll OFF · Click to enable'}
        >
          {autoScroll ? '📍' : '📌'}
        </button>
      </div>

      <div className="symbol-info">
        <span className="t">
          {market.ticker}USDT
        </span>
        <span className="k">Perpetual</span>
        <span className="price">{formatPrice(market.last ?? base, priceDigits(market.last ?? base))}</span>
        <span className="sub">live Â· last traded</span>
      </div>

      {replayMode && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            bottom: 34,
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 8px',
            borderRadius: 8,
            background: 'var(--th-card)',
            border: '1px solid var(--th-border)',
            zIndex: 8,
          }}
        >
          <span style={{ fontSize: 11, color: 'var(--th-muted)', marginRight: 4 }}>
            Bar Replay {replayIdx + 1}/{candles.length}
          </span>
          <button
            className="tb-btn"
            onClick={() => setReplayIdx((i) => Math.max(0, i - 1))}
            aria-label="Step back"
          >
            â—€
          </button>
          <button
            className="tb-btn"
            onClick={() => setReplayIdx((i) => Math.min(candles.length - 1, i + 1))}
            aria-label="Step forward"
          >
            â–¶
          </button>
        </div>
      )}
    </div>
  )
})

function drawLine(
  ctx: CanvasRenderingContext2D,
  s: Series,
  xOf: (t: number) => number,
  yOf: (p: number) => number,
  plot: { x: number; y: number; w: number; h: number },
  theme: ThemeColors,
  times: number[],
) {
  ctx.save()
  ctx.beginPath()
  ctx.rect(plot.x, plot.y - 20, plot.w, plot.h + 20)
  ctx.clip()
  ctx.beginPath()
  let started = false
  s.data.forEach((v, i) => {
    if (v === null) {
      started = false
      return
    }
    const t = times[i] ?? i
    const x = xOf(t)
    const y = yOf(v)
    if (!started) {
      ctx.moveTo(x, y)
      started = true
    } else ctx.lineTo(x, y)
  })
  ctx.strokeStyle = s.color
  ctx.lineWidth = 1.3
  if (s.dashed) ctx.setLineDash([4, 3])
  ctx.stroke()
  ctx.restore()
}
