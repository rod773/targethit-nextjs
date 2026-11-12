import type { Candle } from './chartData'

export type ToolId =
  | 'cursor'
  | 'trendline'
  | 'brush'
  | 'rectangle'
  | 'text'
  | 'path'
  | 'arrow'
  | 'fib'
  | 'fibext'
  | 'volprofile'
  | 'ray'
  | 'angle'
  | 'ellipse'
  | 'hline'
  | 'flag'
  | 'bars'
  | 'extline'
  | 'hray'

export interface Pt {
  time: number
  price: number
}

export interface Drawing {
  id: string
  tool: ToolId
  pts: Pt[]
  text?: string
  color: string
  width: number
  locked?: boolean
  hidden?: boolean
}

export interface ThemeColors {
  fg: string
  muted: string
  border: string
  buy: string
  sell: string
  primary: string
  grid: string
  bg: string
  card: string
}

export interface View {
  xOf: (t: number) => number
  yOf: (p: number) => number
  plot: { x: number; y: number; w: number; h: number }
  candles: Candle[]
  priceMin: number
  priceMax: number
  theme: ThemeColors
}

export const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]
export const FIB_EXT_LEVELS = [0, 0.618, 1, 1.618, 2.618, 3.618, 4.236]

let counter = 0
export function newId(): string {
  counter += 1
  return `d${Date.now().toString(36)}${counter}`
}

export function distToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1
  const dy = y2 - y1
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return Math.hypot(px - x1, py - y1)
  let t = ((px - x1) * dx + (py - y1) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy))
}

export function hitTest(d: Drawing, x: number, y: number, v: View): boolean {
  if (d.hidden) return false
  const p = d.pts.map((pt) => ({ x: v.xOf(pt.time), y: v.yOf(pt.price) }))
  const tol = 7
  if (d.tool === 'text') {
    return p.length > 0 && Math.hypot(x - p[0].x, y - p[0].y) < 24
  }
  if (d.tool === 'brush' || d.tool === 'path') {
    for (let i = 1; i < p.length; i++) {
      if (distToSegment(x, y, p[i - 1].x, p[i - 1].y, p[i].x, p[i].y) < tol) return true
    }
    return false
  }
  if (d.tool === 'rectangle' || d.tool === 'ellipse' || d.tool === 'volprofile') {
    if (p.length < 2) return false
    const minX = Math.min(p[0].x, p[1].x)
    const maxX = Math.max(p[0].x, p[1].x)
    const minY = Math.min(p[0].y, p[1].y)
    const maxY = Math.max(p[0].y, p[1].y)
    return x >= minX - 4 && x <= maxX + 4 && y >= minY - 4 && y <= maxY + 4
  }
  if (d.tool === 'hline') return Math.abs(y - p[0].y) < tol
  if (d.tool === 'hray') return p[0].x <= x && Math.abs(y - p[0].y) < tol
  if (d.tool === 'flag' || d.tool === 'bars') {
    return p.length > 0 && Math.hypot(x - p[0].x, y - p[0].y) < 16
  }
  // line-based tools
  if (p.length < 2) return false
  return distToSegment(x, y, p[0].x, p[0].y, p[1].x, p[1].y) < tol
}

export function drawDrawing(
  ctx: CanvasRenderingContext2D,
  d: Drawing,
  v: View,
  selected: boolean,
): void {
  if (d.hidden) return
  const t = v.theme
  const color = d.color
  ctx.save()
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = d.width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  if (selected) {
    ctx.shadowColor = t.primary
    ctx.shadowBlur = 6
  }
  const p = d.pts.map((pt) => ({ x: v.xOf(pt.time), y: v.yOf(pt.price) }))
  const plot = v.plot

  switch (d.tool) {
    case 'trendline':
    case 'extline':
    case 'ray':
    case 'angle': {
      if (p.length < 2) break
      const [a, b] = p
      let ex = b.x
      let ey = b.y
      if (d.tool === 'ray' || d.tool === 'extline' || d.tool === 'angle') {
        const dx = b.x - a.x
        const dy = b.y - a.y
        const k = d.tool === 'ray' ? 1 : 4
        ex = a.x + dx * k
        ey = a.y + dy * k
        if (d.tool === 'ray') {
          ex = b.x + dx * 10
          ey = b.y + dy * 10
        }
      }
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(ex, ey)
      ctx.stroke()
      if (d.tool === 'angle') {
        const deg = (Math.atan2(-(b.y - a.y), b.x - a.x) * 180) / Math.PI
        ctx.font = '10px var(--th-font-mono)'
        ctx.fillStyle = t.muted
        ctx.fillText(`${deg.toFixed(1)}°`, b.x + 6, b.y - 6)
      }
      break
    }
    case 'hline':
    case 'hray': {
      if (p.length < 1) break
      const y = p[0].y
      ctx.beginPath()
      ctx.moveTo(d.tool === 'hray' ? p[0].x : plot.x, y)
      ctx.lineTo(plot.x + plot.w, y)
      ctx.stroke()
      ctx.fillStyle = color
      ctx.font = '10px var(--th-font-mono)'
      ctx.fillText(v.priceMin.toFixed(2), plot.x + 4, y - 4)
      break
    }
    case 'rectangle': {
      if (p.length < 2) break
      const x = Math.min(p[0].x, p[1].x)
      const y = Math.min(p[0].y, p[1].y)
      const w = Math.abs(p[1].x - p[0].x)
      const h = Math.abs(p[1].y - p[0].y)
      ctx.globalAlpha = 0.12
      ctx.fillRect(x, y, w, h)
      ctx.globalAlpha = 1
      ctx.strokeRect(x, y, w, h)
      break
    }
    case 'ellipse': {
      if (p.length < 2) break
      const cx = (p[0].x + p[1].x) / 2
      const cy = (p[0].y + p[1].y) / 2
      const rx = Math.abs(p[1].x - p[0].x) / 2
      const ry = Math.abs(p[1].y - p[0].y) / 2
      ctx.beginPath()
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
      ctx.stroke()
      break
    }
    case 'fib':
    case 'fibext': {
      if (p.length < 2) break
      const levels = d.tool === 'fib' ? FIB_LEVELS : FIB_EXT_LEVELS
      const [a, b] = p
      ctx.font = '10px var(--th-font-mono)'
      levels.forEach((lvl) => {
        const y = a.y + (b.y - a.y) * lvl
        if (y < plot.y - 20 || y > plot.y + plot.h + 20) return
        ctx.globalAlpha = 0.9
        ctx.beginPath()
        ctx.moveTo(plot.x, y)
        ctx.lineTo(plot.x + plot.w, y)
        ctx.stroke()
        ctx.globalAlpha = 1
        ctx.fillStyle = t.muted
        ctx.fillText(lvl.toFixed(3), plot.x + plot.w + 6, y + 3)
      })
      break
    }
    case 'volprofile': {
      if (p.length < 2) break
      const [a, b] = p
      const pa = d.pts[0]
      const pb = d.pts[1]
      const priceHi = Math.max(pa.price, pb.price)
      const priceLo = Math.min(pa.price, pb.price)
      const bins = 28
      const vol = new Array(bins).fill(0)
      for (const c of v.candles) {
        if (c.high < priceLo || c.low > priceHi) continue
        const mid = (c.high + c.low) / 2
        const idx = Math.min(
          bins - 1,
          Math.max(0, Math.floor(((priceHi - mid) / (priceHi - priceLo || 1)) * bins)),
        )
        vol[idx] += c.volume
      }
      const maxV = Math.max(...vol, 1)
      const left = Math.min(a.x, b.x)
      const binH = Math.abs(b.y - a.y) / bins
      vol.forEach((val, i) => {
        const y = Math.max(a.y, b.y) - i * binH
        const w = (val / maxV) * (plot.x + plot.w - left) * 0.8
        ctx.globalAlpha = 0.28
        ctx.fillRect(left, y, w, Math.max(1, binH - 1))
      })
      ctx.globalAlpha = 1
      ctx.strokeStyle = color
      ctx.strokeRect(left, Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y))
      break
    }
    case 'brush':
    case 'path': {
      if (p.length < 2) break
      ctx.beginPath()
      ctx.moveTo(p[0].x, p[0].y)
      for (let i = 1; i < p.length; i++) ctx.lineTo(p[i].x, p[i].y)
      ctx.stroke()
      break
    }
    case 'arrow': {
      if (p.length < 2) break
      const [a, b] = p
      const ang = Math.atan2(b.y - a.y, b.x - a.x)
      const size = 10
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(b.x, b.y)
      ctx.lineTo(b.x - size * Math.cos(ang - Math.PI / 7), b.y - size * Math.sin(ang - Math.PI / 7))
      ctx.lineTo(b.x - size * Math.cos(ang + Math.PI / 7), b.y - size * Math.sin(ang + Math.PI / 7))
      ctx.closePath()
      ctx.fill()
      break
    }
    case 'flag': {
      if (p.length < 1) break
      const a = p[0]
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(a.x, a.y - 22)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(a.x, a.y - 22)
      ctx.lineTo(a.x + 14, a.y - 17)
      ctx.lineTo(a.x, a.y - 12)
      ctx.closePath()
      ctx.fill()
      break
    }
    case 'bars': {
      if (p.length < 1) break
      const a = p[0]
      for (let i = 0; i < 5; i++) {
        const bh = 6 + i * 4
        ctx.globalAlpha = 0.4 + i * 0.12
        ctx.fillRect(a.x - 10 + i * 5, a.y - bh, 3, bh)
      }
      ctx.globalAlpha = 1
      break
    }
    case 'text': {
      if (p.length < 1) break
      ctx.font = '600 12px var(--th-font-sans)'
      ctx.fillStyle = color
      ctx.fillText(d.text || 'Text', p[0].x, p[0].y)
      break
    }
    default:
      break
  }

  // selection handles
  if (selected && (d.tool === 'trendline' || d.tool === 'fib' || d.tool === 'rectangle')) {
    ctx.shadowBlur = 0
    ctx.fillStyle = t.primary
    for (const pt of p.slice(0, 2)) {
      ctx.beginPath()
      ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.restore()
}