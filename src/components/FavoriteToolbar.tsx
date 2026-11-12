import { useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import {
  BarChart3,
  Circle,
  Flag,
  GripVertical,
  Layers,
  Minus,
  MoveUpRight,
  PenLine,
  Rows3,
  Spline,
  Square,
  TrendingUp,
  Type,
} from 'lucide-react'
import type { ToolId } from '../lib/drawings'

interface FavToolbarProps {
  activeTool: ToolId
  setActiveTool: (t: ToolId) => void
}

const FAV: { tool: ToolId; label: string; icon: typeof TrendingUp }[] = [
  { tool: 'trendline', label: 'Trendline', icon: TrendingUp },
  { tool: 'brush', label: 'Brush', icon: PenLine },
  { tool: 'rectangle', label: 'Rectangle', icon: Square },
  { tool: 'text', label: 'Text', icon: Type },
  { tool: 'path', label: 'Path', icon: Spline },
  { tool: 'arrow', label: 'Arrow Marker', icon: MoveUpRight },
  { tool: 'fib', label: 'Fib Retracement', icon: Layers },
  { tool: 'fibext', label: 'Trend-Based Fib Extension', icon: Layers },
  { tool: 'volprofile', label: 'Fixed Range Volume Profile', icon: BarChart3 },
  { tool: 'ray', label: 'Ray', icon: MoveUpRight },
  { tool: 'angle', label: 'Trend Angle', icon: TrendingUp },
  { tool: 'ellipse', label: 'Ellipse', icon: Circle },
  { tool: 'hline', label: 'Horizontal Line', icon: Minus },
  { tool: 'flag', label: 'Flag Mark', icon: Flag },
  { tool: 'bars', label: 'Bars Pattern', icon: BarChart3 },
  { tool: 'extline', label: 'Extended Line', icon: MoveUpRight },
  { tool: 'hray', label: 'Horizontal Ray', icon: Minus },
]

export function FavoriteToolbar({ activeTool, setActiveTool }: FavToolbarProps) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const [vertical, setVertical] = useState(false)
  const drag = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)

  const startDrag = (e: ReactPointerEvent) => {
    const base = pos ?? { x: 54, y: 96 }
    drag.current = { startX: e.clientX, startY: e.clientY, origX: base.x, origY: base.y }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onDrag = (e: ReactPointerEvent) => {
    if (!drag.current) return
    setPos({
      x: Math.max(4, drag.current.origX + (e.clientX - drag.current.startX)),
      y: Math.max(4, drag.current.origY + (e.clientY - drag.current.startY)),
    })
  }
  const endDrag = () => {
    drag.current = null
  }

  const style: CSSProperties = vertical
    ? {
        left: pos?.x ?? 54,
        top: pos?.y ?? 96,
        flexDirection: 'column',
        height: 'auto',
        maxHeight: 'calc(100% - 120px)',
        overflowY: 'auto',
      }
    : { left: pos?.x ?? 54, top: pos?.y ?? 70 }

  return (
    <div
      className="fav-toolbar"
      role="toolbar"
      aria-label="Favorite drawing tools"
      style={style}
    >
      <button
        className="tool-btn drag-handle"
        onPointerDown={startDrag}
        onPointerMove={onDrag}
        onPointerUp={endDrag}
        aria-label="Move favorite drawing tools toolbar; use arrow keys or drag"
        title="Drag to move"
      >
        <GripVertical size={14} />
      </button>
      {FAV.map((f) => {
        const Icon = f.icon
        return (
          <button
            key={f.tool + f.label}
            className={`tool-btn ${activeTool === f.tool ? 'active' : ''}`}
            onClick={() => setActiveTool(f.tool)}
            aria-label={f.label}
            title={f.label}
          >
            <Icon size={14} />
          </button>
        )
      })}
      <button
        className="tool-btn"
        onClick={() => setVertical((v) => !v)}
        aria-label="Switch favorite toolbar to vertical layout"
        title="Toggle layout"
      >
        <Rows3 size={14} />
      </button>
    </div>
  )
}

