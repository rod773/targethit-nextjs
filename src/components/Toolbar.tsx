import { useMemo, useState } from 'react'
import {
  AreaChart,
  BarChart3,
  Bell,
  Camera,
  ChevronDown,
  Crosshair,
  LayoutGrid,
  LineChart,
  Maximize,
  Minimize,
  MonitorPlay,
  Plus,
  Save,
  Settings,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react'
import type { Market } from '../data/markets'
import { INTERVALS, RANGES, type Interval, type Range } from '../lib/chartData'
import { INDICATORS } from '../lib/indicators'
import type { Alert, ChartType, ScaleMode, Workspace } from '../lib/types'

interface ToolbarProps {
  market: Market
  interval: Interval
  setInterval: (i: Interval) => void
  range: Range
  setRange: (r: Range) => void
  chartType: ChartType
  setChartType: (c: ChartType) => void
  indicators: string[]
  setIndicators: (updater: (prev: string[]) => string[]) => void
  showLiq: boolean
  setShowLiq: (v: boolean) => void
  showCvd: boolean
  setShowCvd: (v: boolean) => void
  threshold: number
  setThreshold: (v: number) => void
  compare: string[]
  setCompare: (v: string[]) => void
  onSnapshot: () => void
  focused: boolean
  onFocus: () => void
  replayMode: boolean
  setReplayMode: (v: boolean) => void
  showGrid: boolean
  setShowGrid: (v: boolean) => void
  showLastPrice: boolean
  setShowLastPrice: (v: boolean) => void
  scaleMode: ScaleMode
  setScaleMode: (v: ScaleMode) => void
  invert: boolean
  setInvert: (v: boolean) => void
  layout: 'single' | '2v' | '2h'
  setLayout: (v: 'single' | '2v' | '2h') => void
  workspaces: Workspace[]
  onSaveWorkspace: () => void
  onLoadWorkspace: (w: Workspace) => void
  onDeleteWorkspace: (id: string) => void
  alerts: Alert[]
  onCreateAlert: (condition: 'above' | 'below', price: number) => void
  onToggleAlert: (id: string) => void
  onDeleteAlert: (id: string) => void
  onToast: (msg: string) => void
}

type MenuId =
  | 'indicators'
  | 'chartType'
  | 'compare'
  | 'workspaces'
  | 'layout'
  | 'alerts'
  | 'settings'
  | 'symbol'
  | null

export function Toolbar(props: ToolbarProps) {
  const [menu, setMenu] = useState<MenuId>(null)
  const [search, setSearch] = useState('')
  const [alertCondition, setAlertCondition] = useState<'above' | 'below'>('above')
  const [alertPrice, setAlertPrice] = useState('')

  const toggleMenu = (id: MenuId) => setMenu((m) => (m === id ? null : id))
  const close = () => setMenu(null)

  const grouped = useMemo(() => {
    const map = new Map<string, typeof INDICATORS>()
    for (const ind of INDICATORS) {
      if (search && !ind.name.toLowerCase().includes(search.toLowerCase())) continue
      if (!map.has(ind.category)) map.set(ind.category, [])
      map.get(ind.category)!.push(ind)
    }
    return [...map.entries()]
  }, [search])

  const toggleIndicator = (id: string) => {
    props.setIndicators((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const isOn = (id: string) => props.indicators.includes(id)

  const chartTypeBtn = (type: ChartType, label: string, Icon: typeof BarChart3) => (
    <button
      className={`tb-btn ${props.chartType === type ? 'active' : ''}`}
      onClick={() => props.setChartType(type)}
      aria-label={label}
      title={label}
    >
      <Icon size={14} />
    </button>
  )

  return (
    <div className="chart-toolbar">
      <div className="toolbar-row">
        <button className="tb-symbol" onClick={() => toggleMenu('symbol')}>
          {props.market.icon ? (
            <img src={props.market.icon} alt="" />
          ) : (
            <span className="coin-fallback">{props.market.ticker.slice(0, 2)}</span>
          )}
          {props.market.ticker}
          <ChevronDown size={12} />
        </button>

        <button className="tb-btn icon-only" onClick={() => toggleMenu('compare')} aria-label={`Compare instruments · ${props.market.ticker}`} title="Compare instruments">
          <Plus size={14} />
        </button>

        <span className="tb-sep" />

        <div className="tf-group">
          {INTERVALS.map((iv) => (
            <button
              key={iv}
              className={`tb-btn ${props.interval === iv ? 'active' : ''}`}
              onClick={() => props.setInterval(iv)}
              aria-pressed={props.interval === iv}
            >
              {iv}
            </button>
          ))}
        </div>
        <button
          className="tb-btn icon-only"
          title="Chart interval"
          aria-label="Chart interval"
          onClick={() => {
            const v = window.prompt('Interval (e.g. 15, 4h, d, w, 1M)', props.interval)
            if (!v) return
            const found = INTERVALS.find((x) => x === v.trim())
            if (found) props.setInterval(found)
            else props.onToast('Unsupported interval')
          }}
        >
          <Settings size={13} />
        </button>

        <span className="tb-sep" />

        <div className="tf-group">
          {chartTypeBtn('bars', 'Bars', BarChart3)}
          {chartTypeBtn('candles', 'Candles', BarChart3)}
          {chartTypeBtn('area', 'Area', AreaChart)}
          {chartTypeBtn('line', 'Line', LineChart)}
        </div>
        <button
          className="tb-btn icon-only"
          onClick={() => toggleMenu('chartType')}
          aria-label="Chart type"
          title="Chart type"
        >
          <ChevronDown size={13} />
        </button>

        <span className="tb-sep" />

        <button
          className={`tb-btn ${menu === 'indicators' ? 'active' : ''}`}
          onClick={() => toggleMenu('indicators')}
          aria-label="Indicators"
          aria-expanded={menu === 'indicators'}
        >
          <SlidersHorizontal size={14} />
          Indicators
          {props.indicators.length > 0 && (
            <span
              className="mono"
              style={{
                fontSize: 9,
                background: 'var(--th-primary)',
                color: '#fff',
                borderRadius: 8,
                padding: '0 4px',
              }}
            >
              {props.indicators.length}
            </span>
          )}
        </button>

        <button
          className="tb-btn"
          aria-pressed={props.showLiq}
          onClick={() => props.setShowLiq(!props.showLiq)}
        >
          <span className="swatch" style={{ width: 9, height: 9, borderRadius: 2, background: 'linear-gradient(135deg,#ef5350,#26a69a)' }} />
          Liquidations
        </button>

        <span className="tb-sep" />

        <div className="range-group">
          {RANGES.map((r) => (
            <button
              key={r}
              className={`tb-btn ${props.range === r ? 'active' : ''}`}
              onClick={() => props.setRange(r)}
              aria-pressed={props.range === r}
            >
              {r}
            </button>
          ))}
        </div>

        <input
          className="threshold-slider"
          type="range"
          min={0.5}
          max={1}
          step={0.01}
          value={props.threshold}
          onChange={(e) => props.setThreshold(Number(e.target.value))}
          aria-label="Liquidity threshold"
          title="Liquidity threshold — lower = clusters paint brighter"
        />

        <button className="tb-btn" aria-pressed={props.showCvd} onClick={() => props.setShowCvd(!props.showCvd)}>
          CVD
        </button>
      </div>

      <div className="toolbar-row">
        <button className="tb-btn" onClick={() => toggleMenu('workspaces')} aria-label="Chart workspaces">
          <Save size={14} />
          Chart workspaces
          <ChevronDown size={12} />
        </button>
        <button className="tb-btn" onClick={() => toggleMenu('layout')} aria-label="Chart layout">
          <LayoutGrid size={14} />
          Chart layout
          <ChevronDown size={12} />
        </button>
        <button
          className={`tb-btn ${props.replayMode ? 'active' : ''}`}
          onClick={() => props.setReplayMode(!props.replayMode)}
          aria-label="Bar Replay"
          aria-pressed={props.replayMode}
        >
          <MonitorPlay size={14} />
          Bar Replay
        </button>
        <button
          className="tb-btn"
          onClick={() => {
            setAlertPrice(props.market.last ? String(props.market.last) : '')
            toggleMenu('alerts')
          }}
          aria-label={`Create alert · ${props.market.ticker}`}
        >
          <Bell size={14} />
          Create alert
        </button>
        <button className="tb-btn" onClick={() => toggleMenu('alerts')} aria-label="Alerts and log">
          <Bell size={14} />
          Alerts and log
          {props.alerts.filter((a) => a.active).length > 0 && (
            <span className="mono" style={{ fontSize: 9, color: 'var(--th-primary)' }}>
              {props.alerts.filter((a) => a.active).length}
            </span>
          )}
        </button>
        <button className="tb-btn icon-only" onClick={props.onSnapshot} aria-label="Chart snapshot" title="Chart snapshot">
          <Camera size={14} />
        </button>
        <button
          className={`tb-btn icon-only ${props.focused ? 'active' : ''}`}
          onClick={props.onFocus}
          aria-label="Focus chart"
          title="Focus chart"
          aria-pressed={props.focused}
        >
          {props.focused ? <Minimize size={14} /> : <Maximize size={14} />}
        </button>
        <button
          className={`tb-btn icon-only ${menu === 'settings' ? 'active' : ''}`}
          onClick={() => toggleMenu('settings')}
          aria-label="Chart settings"
          title="Chart settings"
        >
          <Settings size={14} />
        </button>
      </div>

      {menu && (
        <>
          <div className="popover-backdrop" onClick={close} />
          <div className="popover" style={{ top: 38, left: 8 }}>
            {menu === 'indicators' && (
              <>
                <div className="pop-head">
                  <strong>Indicators</strong>
                  <span className="pop-sub">Click to add · double-click settings</span>
                </div>
                <div className="pop-search">
                  <input
                    autoFocus
                    placeholder="Search indicators…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="pop-body">
                  {grouped.map(([cat, list]) => (
                    <div key={cat} className="pop-group">
                      <div className="pop-group-title">{cat}</div>
                      {list.map((ind) => (
                        <button
                          key={ind.id}
                          className={`pop-item ${isOn(ind.id) ? 'on' : ''}`}
                          onClick={() => toggleIndicator(ind.id)}
                        >
                          <span className="pop-check">{isOn(ind.id) ? '✓' : ''}</span>
                          <span className="pop-item-text">
                            <span className="pop-item-name">{ind.name}</span>
                            <span className="pop-item-desc">{ind.desc}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </>
            )}

            {menu === 'chartType' && (
              <>
                <div className="pop-head">
                  <strong>Chart type</strong>
                </div>
                <div className="pop-body">
                  {(
                    [
                      ['candles', 'Candles', BarChart3],
                      ['bars', 'Bars', BarChart3],
                      ['area', 'Area', AreaChart],
                      ['line', 'Line', LineChart],
                    ] as [ChartType, string, typeof BarChart3][]
                  ).map(([type, label, Icon]) => (
                    <button
                      key={type}
                      className={`pop-item ${props.chartType === type ? 'on' : ''}`}
                      onClick={() => {
                        props.setChartType(type)
                        close()
                      }}
                    >
                      <span className="pop-check">{props.chartType === type ? '✓' : ''}</span>
                      <Icon size={14} />
                      <span className="pop-item-name">{label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {menu === 'compare' && (
              <>
                <div className="pop-head">
                  <strong>Compare instruments</strong>
                  <span className="pop-sub">Normalized to the base symbol</span>
                </div>
                <div className="pop-search">
                  <input placeholder="Add symbol…" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <div className="pop-body">
                  {['ETH', 'SOL', 'BNB', 'XRP', 'DOGE', 'ADA', 'AVAX']
                    .filter((s) => s.toLowerCase().includes(search.toLowerCase()))
                    .map((s) => (
                      <button
                        key={s}
                        className={`pop-item ${props.compare.includes(s) ? 'on' : ''}`}
                        onClick={() =>
                          props.setCompare(
                            props.compare.includes(s)
                              ? props.compare.filter((x) => x !== s)
                              : [...props.compare, s],
                          )
                        }
                      >
                        <span className="pop-check">{props.compare.includes(s) ? '✓' : ''}</span>
                        <span className="pop-item-name">{s}</span>
                      </button>
                    ))}
                </div>
              </>
            )}

            {menu === 'workspaces' && (
              <>
                <div className="pop-head">
                  <strong>Chart workspaces</strong>
                  <span className="pop-sub">Saved on this device</span>
                </div>
                <div className="pop-body">
                  <button
                    className="pop-item"
                    onClick={() => {
                      props.onSaveWorkspace()
                      close()
                    }}
                  >
                    <Plus size={14} /> <span className="pop-item-name">Save current as new…</span>
                  </button>
                  {props.workspaces.length === 0 && (
                    <div className="pop-empty">No saved workspaces yet.</div>
                  )}
                  {props.workspaces.map((w) => (
                    <div key={w.id} className="pop-row">
                      <button
                        className="pop-item"
                        onClick={() => {
                          props.onLoadWorkspace(w)
                          close()
                        }}
                      >
                        <span className="pop-item-name">{w.name}</span>
                        <span className="pop-item-desc">
                          {w.interval} · {w.range}
                        </span>
                      </button>
                      <button className="icon-btn" onClick={() => props.onDeleteWorkspace(w.id)} aria-label="Delete">
                        <TrashX />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {menu === 'layout' && (
              <>
                <div className="pop-head">
                  <strong>Chart layout</strong>
                </div>
                <div className="pop-body">
                  {(
                    [
                      ['single', 'Single'],
                      ['2v', '2 charts · vertical'],
                      ['2h', '2 charts · horizontal'],
                    ] as ['single' | '2v' | '2h', string][]
                  ).map(([v, label]) => (
                    <button
                      key={v}
                      className={`pop-item ${props.layout === v ? 'on' : ''}`}
                      onClick={() => {
                        props.setLayout(v)
                        close()
                      }}
                    >
                      <span className="pop-check">{props.layout === v ? '✓' : ''}</span>
                      <span className="pop-item-name">{label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {menu === 'settings' && (
              <>
                <div className="pop-head">
                  <strong>Chart settings</strong>
                </div>
                <div className="pop-body">
                  <SettingToggle label="Grid" value={props.showGrid} onChange={props.setShowGrid} />
                  <SettingToggle label="Last price line" value={props.showLastPrice} onChange={props.setShowLastPrice} />
                  <SettingToggle label="Liquidations heatmap" value={props.showLiq} onChange={props.setShowLiq} />
                  <SettingToggle label="CVD" value={props.showCvd} onChange={props.setShowCvd} />
                  <div className="pop-group-title" style={{ marginTop: 6 }}>
                    Price scale
                  </div>
                  {(
                    [
                      ['linear', 'Linear'],
                      ['log', 'Logarithmic'],
                      ['percent', 'Percent'],
                      ['indexed', 'Indexed'],
                    ] as [ScaleMode, string][]
                  ).map(([v, label]) => (
                    <button
                      key={v}
                      className={`pop-item ${props.scaleMode === v ? 'on' : ''}`}
                      onClick={() => props.setScaleMode(v)}
                    >
                      <span className="pop-check">{props.scaleMode === v ? '✓' : ''}</span>
                      <span className="pop-item-name">{label}</span>
                    </button>
                  ))}
                  <SettingToggle label="Invert price scale" value={props.invert} onChange={props.setInvert} />
                </div>
              </>
            )}

            {menu === 'alerts' && (
              <>
                <div className="pop-head">
                  <strong>Alerts and log</strong>
                  <span className="pop-sub">
                    {props.market.ticker} · {props.market.last ?? '—'}
                  </span>
                </div>
                <div className="pop-body">
                  <div className="alert-form">
                    <select value={alertCondition} onChange={(e) => setAlertCondition(e.target.value as 'above' | 'below')}>
                      <option value="above">Crosses above</option>
                      <option value="below">Crosses below</option>
                    </select>
                    <input
                      inputMode="decimal"
                      placeholder="Price"
                      value={alertPrice}
                      onChange={(e) => setAlertPrice(e.target.value)}
                    />
                    <button
                      className="tb-btn primary"
                      onClick={() => {
                        const p = Number(alertPrice)
                        if (!p || Number.isNaN(p)) return
                        props.onCreateAlert(alertCondition, p)
                        setAlertPrice('')
                      }}
                    >
                      Create
                    </button>
                  </div>
                  {props.alerts.length === 0 && <div className="pop-empty">No alerts yet.</div>}
                  {props.alerts.map((a) => (
                    <div key={a.id} className="alert-row">
                      <span className={`alert-dot ${a.active ? 'on' : ''}`} />
                      <span className="pop-item-name">
                        {a.symbol} {a.condition === 'above' ? '≥' : '≤'} {a.price}
                      </span>
                      {a.triggeredAt ? (
                        <span className="pop-item-desc" style={{ color: 'var(--th-success)' }}>
                          triggered
                        </span>
                      ) : (
                        <span className="pop-item-desc">{a.active ? 'armed' : 'paused'}</span>
                      )}
                      <button className="icon-btn" onClick={() => props.onToggleAlert(a.id)} aria-label="Toggle alert">
                        {a.active ? '❚❚' : '▶'}
                      </button>
                      <button className="icon-btn" onClick={() => props.onDeleteAlert(a.id)} aria-label="Delete alert">
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {menu === 'symbol' && (
              <>
                <div className="pop-head">
                  <strong>Change symbol</strong>
                </div>
                <div className="pop-body">
                  <div className="pop-empty">
                    Use the watchlist on the right, or search with the compare tool.
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function SettingToggle({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button className={`pop-item ${value ? 'on' : ''}`} onClick={() => onChange(!value)}>
      <span className="pop-check">{value ? '✓' : ''}</span>
      <span className="pop-item-name">{label}</span>
    </button>
  )
}

function TrashX() {
  return <Trash2 size={13} />
}

export { Crosshair }