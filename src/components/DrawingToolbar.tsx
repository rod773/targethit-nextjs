import { useState } from 'react'
import {
  BarChart3,
  Circle,
  Eye,
  EyeOff,
  Flag,
  Layers,
  Lock,
  Magnet,
  Minus,
  MousePointer2,
  MoveUpRight,
  PenLine,
  Redo2,
  Settings2,
  Spline,
  Square,
  Trash2,
  TrendingUp,
  Type,
  Undo2,
} from 'lucide-react'
import type { ToolId } from '../lib/drawings'

interface DrawingToolbarProps {
  activeTool: ToolId
  setActiveTool: (t: ToolId) => void
  magnet: boolean
  setMagnet: (v: boolean) => void
  onObjects: () => void
  onLockAll: () => void
  onHideAll: () => void
  onRemoveAll: () => void
  onUndo: () => void
  onRedo: () => void
  onPresets: () => void
}

interface Group {
  id: string
  label: string
  primary: { tool: ToolId; label: string; icon: typeof MousePointer2 }
  more: { tool: ToolId; label: string; icon: typeof MousePointer2 }[]
}

const GROUPS: Group[] = [
  { id: 'lines', label: 'Lines', primary: { tool: 'trendline', label: 'Trendline', icon: TrendingUp }, more: [
    { tool: 'ray', label: 'Ray', icon: MoveUpRight },
    { tool: 'extline', label: 'Extended Line', icon: MoveUpRight },
    { tool: 'hline', label: 'Horizontal Line', icon: Minus },
    { tool: 'hray', label: 'Horizontal Ray', icon: Minus },
  ] },
  { id: 'channels', label: 'Channels', primary: { tool: 'trendline', label: 'Parallel Channel', icon: TrendingUp }, more: [] },
  { id: 'fib', label: 'Fib & Gann', primary: { tool: 'fib', label: 'Fib Retracement', icon: Layers }, more: [
    { tool: 'fibext', label: 'Trend-Based Fib Extension', icon: Layers },
  ] },
  { id: 'patterns', label: 'Patterns', primary: { tool: 'trendline', label: 'XABCD Pattern', icon: Spline }, more: [] },
  { id: 'forecast', label: 'Forecast & Measure', primary: { tool: 'angle', label: 'Trend Angle', icon: TrendingUp }, more: [
    { tool: 'volprofile', label: 'Fixed Range Volume Profile', icon: BarChart3 },
  ] },
  { id: 'shapes', label: 'Shapes', primary: { tool: 'rectangle', label: 'Rectangle', icon: Square }, more: [
    { tool: 'ellipse', label: 'Ellipse', icon: Circle },
  ] },
  { id: 'annotations', label: 'Annotations', primary: { tool: 'text', label: 'Text', icon: Type }, more: [
    { tool: 'brush', label: 'Brush', icon: PenLine },
    { tool: 'path', label: 'Path', icon: Spline },
    { tool: 'arrow', label: 'Arrow Marker', icon: MoveUpRight },
    { tool: 'flag', label: 'Flag Mark', icon: Flag },
    { tool: 'bars', label: 'Bars Pattern', icon: BarChart3 },
  ] },
]

export function DrawingToolbar(props: DrawingToolbarProps) {
  const [open, setOpen] = useState<string | null>(null)

  return (
    <div className="drawing-toolbar" role="toolbar" aria-label="Drawing tools">
      <button
        className={`tool-btn ${props.activeTool === 'cursor' ? 'active' : ''}`}
        onClick={() => props.setActiveTool('cursor')}
        aria-label="Cursor — deactivate drawing tool"
        title="Cursor"
      >
        <MousePointer2 size={15} />
      </button>
      <span className="tb-sep" style={{ height: 1, width: 18, margin: '3px 0' }} />

      {GROUPS.map((g) => {
        const active = g.primary.tool === props.activeTool || g.more.some((m) => m.tool === props.activeTool)
        const Icon = g.primary.icon
        return (
          <div key={g.id} style={{ position: 'relative' }}>
            <div className={`tool-group ${active ? 'active' : ''}`}>
              <button
                className={`tool-btn ${active ? 'active' : ''}`}
                onClick={() => props.setActiveTool(g.primary.tool)}
                aria-label={`${g.primary.label} — ${g.label}`}
                title={g.primary.label}
              >
                <Icon size={15} />
              </button>
              <button
                className="tool-btn caret-btn"
                onClick={() => setOpen((o) => (o === g.id ? null : g.id))}
                aria-label={`${g.label} — more tools`}
                title={`${g.label} — more tools`}
              >
                <span
                  style={{
                    width: 0,
                    height: 0,
                    borderLeft: '3px solid transparent',
                    borderRight: '3px solid transparent',
                    borderTop: '4px solid currentColor',
                  }}
                />
              </button>
            </div>
            {open === g.id && g.more.length > 0 && (
              <div className="tool-flyout">
                <div className="tool-flyout-title">{g.label}</div>
                {g.more.map((m) => {
                  const MIcon = m.icon
                  return (
                    <button
                      key={m.tool}
                      className={`tool-flyout-item ${props.activeTool === m.tool ? 'active' : ''}`}
                      onClick={() => {
                        props.setActiveTool(m.tool)
                        setOpen(null)
                      }}
                    >
                      <MIcon size={14} />
                      {m.label}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      <span className="tb-sep" style={{ height: 1, width: 18, margin: '3px 0' }} />

      <button className="tool-btn" onClick={props.onObjects} aria-label="Chart objects" title="Chart objects">
        <Layers size={15} />
      </button>
      <button
        className={`tool-btn ${props.magnet ? 'active' : ''}`}
        onClick={() => props.setMagnet(!props.magnet)}
        aria-label={`Magnet ${props.magnet ? 'On' : 'Off'}`}
        title="Magnet"
      >
        <Magnet size={15} />
      </button>
      <button className="tool-btn" onClick={props.onLockAll} aria-label="Lock all drawings" title="Lock all drawings">
        <Lock size={15} />
      </button>
      <button className="tool-btn" onClick={props.onHideAll} aria-label="Hide all drawings" title="Hide all drawings">
        <EyeOff size={15} />
      </button>
      <button className="tool-btn" onClick={props.onRemoveAll} aria-label="Remove all drawings" title="Remove all drawings">
        <Trash2 size={15} />
      </button>

      <span className="tb-sep" style={{ height: 1, width: 18, margin: '3px 0' }} />

      <button className="tool-btn" onClick={props.onUndo} aria-label="Undo drawing edit" title="Undo">
        <Undo2 size={14} />
      </button>
      <button className="tool-btn" onClick={props.onRedo} aria-label="Redo drawing edit" title="Redo">
        <Redo2 size={14} />
      </button>
      <button className="tool-btn" onClick={props.onPresets} aria-label="Presets / Edit" title="Presets / Edit">
        <Settings2 size={14} />
      </button>
      <span style={{ flex: 1 }} />
      <button className="tool-btn" onClick={props.onObjects} aria-label="Show drawings" title="Show drawings">
        <Eye size={14} />
      </button>
    </div>
  )
}