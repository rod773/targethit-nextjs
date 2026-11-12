"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Header } from './components/Header'
import { Toolbar } from './components/Toolbar'
import { Chart, type ChartHandle } from './components/Chart'
import { DrawingToolbar } from './components/DrawingToolbar'
import { FavoriteToolbar } from './components/FavoriteToolbar'
import { Watchlist } from './components/Watchlist'
import { MARKETS, type Market } from './data/markets'
import type { Interval, Range } from './lib/chartData'
import type { Drawing, ToolId } from './lib/drawings'
import type { Alert, ChartType, ScaleMode, Workspace } from './lib/types'

const LS_DRAWINGS = 'th.drawings'
const LS_WORKSPACES = 'th.workspaces'
const LS_ALERTS = 'th.alerts'
const LS_THEME = 'theme.v2'

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function saveJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore */
  }
}

export default function App() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const s = localStorage.getItem(LS_THEME)
      if (s === 'light' || s === 'dark') return s
    } catch {
      /* ignore */
    }
    return 'dark'
  })

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme
    root.classList.remove('light', 'dark')
    root.classList.add(theme)
    root.style.colorScheme = theme
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'light' ? '#e5eaf0' : '#0d0d0d')
    try {
      localStorage.setItem(LS_THEME, theme)
    } catch {
      /* ignore */
    }
  }, [theme])

  const [market, setMarket] = useState<Market>(MARKETS[0])
  const [interval, setInterval] = useState<Interval>('1h')
  const [range, setRange] = useState<Range>('2W')
  const [chartType, setChartType] = useState<ChartType>('candles')
  const [indicators, setIndicators] = useState<string[]>(['liq', 'cvd'])
  const [threshold, setThreshold] = useState(0.99)
  const [compare, setCompare] = useState<string[]>([])
  const [scaleMode, setScaleMode] = useState<ScaleMode>('linear')
  const [invert, setInvert] = useState(false)
  const [showGrid, setShowGrid] = useState(true)
  const [showLastPrice, setShowLastPrice] = useState(true)
  const [layout, setLayout] = useState<'single' | '2v' | '2h'>('single')
  const [replayMode, setReplayMode] = useState(false)
  const [focused, setFocused] = useState(false)

  const [drawings, setDrawingsState] = useState<Drawing[]>(() => loadJSON<Drawing[]>(LS_DRAWINGS, []))
  const past = useRef<Drawing[][]>([])
  const future = useRef<Drawing[][]>([])

  const setDrawings = useCallback((updater: (prev: Drawing[]) => Drawing[]) => {
    setDrawingsState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      past.current.push(prev)
      if (past.current.length > 60) past.current.shift()
      future.current = []
      return next
    })
  }, [])

  const applyDrawings = useCallback((next: Drawing[]) => setDrawingsState(next), [])

  const undo = useCallback(() => {
    setDrawingsState((cur) => {
      const prev = past.current.pop()
      if (!prev) return cur
      future.current.push(cur)
      return prev
    })
  }, [])

  const redo = useCallback(() => {
    setDrawingsState((cur) => {
      const next = future.current.pop()
      if (!next) return cur
      past.current.push(cur)
      return next
    })
  }, [])

  useEffect(() => {
    saveJSON(LS_DRAWINGS, drawings)
  }, [drawings])

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeTool, setActiveTool] = useState<ToolId>('cursor')
  const [magnet, setMagnet] = useState(false)

  const chartRef = useRef<ChartHandle>(null)

  const [workspaces, setWorkspaces] = useState<Workspace[]>(() => loadJSON<Workspace[]>(LS_WORKSPACES, []))
  useEffect(() => saveJSON(LS_WORKSPACES, workspaces), [workspaces])

  const [alerts, setAlerts] = useState<Alert[]>(() => loadJSON<Alert[]>(LS_ALERTS, []))
  useEffect(() => saveJSON(LS_ALERTS, alerts), [alerts])

  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | null>(null)
  const showToast = useCallback((msg: string) => {
    setToast(msg)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2600)
  }, [])

  const [tab, setTab] = useState<'chart' | 'trade'>('chart')
  const [venue, setVenue] = useState<'hyperliquid' | 'binance'>('binance')
  const [stars, setStars] = useState<string[]>(['btc', 'eth'])
  const [favoritesOnly, setFavoritesOnly] = useState(false)

  const toggleStar = (id: string) =>
    setStars((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  // live price simulation for alerts
  const [livePrice, setLivePrice] = useState<number>(market.last ?? 100)
  useEffect(() => {
    setLivePrice(market.last ?? 100)
  }, [market])
  useEffect(() => {
    const t = window.setInterval(() => {
      setLivePrice((p) => Math.max(0.000001, p * (1 + (Math.random() - 0.5) * 0.0009)))
    }, 1500)
    return () => window.clearInterval(t)
  }, [])

  useEffect(() => {
    setAlerts((prev) => {
      let changed = false
      const next = prev.map((a) => {
        if (!a.active || a.triggeredAt) return a
        const hit = a.condition === 'above' ? livePrice >= a.price : livePrice <= a.price
        if (hit) {
          changed = true
          showToast(`Alert: ${a.symbol} crossed ${a.condition} ${a.price}`)
          return { ...a, triggeredAt: Date.now() }
        }
        return a
      })
      return changed ? next : prev
    })
  }, [livePrice, showToast])

  const showLiq = indicators.includes('liq')
  const showCvd = indicators.includes('cvd')
  const setShowLiq = (v: boolean) =>
    setIndicators((prev) => (v ? [...new Set([...prev, 'liq'])] : prev.filter((x) => x !== 'liq')))
  const setShowCvd = (v: boolean) =>
    setIndicators((prev) => (v ? [...new Set([...prev, 'cvd'])] : prev.filter((x) => x !== 'cvd')))

  const saveWorkspace = () => {
    const name = window.prompt('Workspace name', `${market.ticker} ${interval} ${range}`)
    if (!name) return
    const ws: Workspace = {
      id: 'w' + Date.now().toString(36),
      name,
      interval,
      range,
      chartType,
      indicators,
    }
    setWorkspaces((prev) => [...prev, ws])
    showToast('Workspace saved')
  }

  const loadWorkspace = (w: Workspace) => {
    setInterval(w.interval)
    setRange(w.range)
    setChartType(w.chartType)
    setIndicators(w.indicators)
    showToast(`Loaded “${w.name}”`)
  }

  const createAlert = (condition: 'above' | 'below', price: number) => {
    setAlerts((prev) => [
      ...prev,
      {
        id: 'a' + Date.now().toString(36),
        symbol: market.ticker,
        condition,
        price,
        active: true,
      },
    ])
    showToast('Alert created')
  }

  const removeAll = () => {
    if (drawings.length === 0) return
    if (window.confirm('Remove all drawings?')) setDrawings(() => [])
  }

  const chartProps = useMemo(
    () => ({
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
    }),
    [
      market,
      interval,
      range,
      chartType,
      indicators,
      drawings,
      setDrawings,
      selectedId,
      activeTool,
      showGrid,
      showLastPrice,
      scaleMode,
      invert,
      theme,
      replayMode,
      compare,
    ],
  )

  if (!mounted) return <div className="app" style={{ background: 'var(--th-bg)' }} />

  return (
    <div className="app">
      <Header theme={theme} onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))} />

      <div className="promo">
        <p>
          Free $100,000 simulated account on live markets · liquidation levels computed from real positions ·
          connect your exchange when you're ready
        </p>
        <a href="#register">Start trading free</a>
      </div>

      <Toolbar
        market={market}
        interval={interval}
        setInterval={setInterval}
        range={range}
        setRange={setRange}
        chartType={chartType}
        setChartType={setChartType}
        indicators={indicators}
        setIndicators={setIndicators}
        showLiq={showLiq}
        setShowLiq={setShowLiq}
        showCvd={showCvd}
        setShowCvd={setShowCvd}
        threshold={threshold}
        setThreshold={setThreshold}
        compare={compare}
        setCompare={setCompare}
        onSnapshot={() => {
          chartRef.current?.snapshot()
          showToast('Snapshot saved')
        }}
        focused={focused}
        onFocus={() => setFocused((f) => !f)}
        replayMode={replayMode}
        setReplayMode={setReplayMode}
        showGrid={showGrid}
        setShowGrid={setShowGrid}
        showLastPrice={showLastPrice}
        setShowLastPrice={setShowLastPrice}
        scaleMode={scaleMode}
        setScaleMode={setScaleMode}
        invert={invert}
        setInvert={setInvert}
        layout={layout}
        setLayout={setLayout}
        workspaces={workspaces}
        onSaveWorkspace={saveWorkspace}
        onLoadWorkspace={loadWorkspace}
        onDeleteWorkspace={(id) => setWorkspaces((prev) => prev.filter((w) => w.id !== id))}
        alerts={alerts}
        onCreateAlert={createAlert}
        onToggleAlert={(id) =>
          setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, active: !a.active } : a)))
        }
        onDeleteAlert={(id) => setAlerts((prev) => prev.filter((a) => a.id !== id))}
        onToast={showToast}
      />

      <div className="main">
        <div
          className="chart-area"
          style={
            layout === '2v'
              ? { display: 'flex', flexDirection: 'column' }
              : layout === '2h'
                ? { display: 'flex', flexDirection: 'row' }
                : undefined
          }
        >
          {layout === 'single' && <Chart ref={chartRef} {...chartProps} />}
          {layout === '2v' && (
            <>
              <div className="chart-slot" style={{ flex: 1 }}>
                <Chart ref={chartRef} {...chartProps} />
              </div>
              <div
                className="chart-slot"
                style={{ flex: 1, borderTop: '1px solid var(--th-border)' }}
              >
                <Chart {...chartProps} range="1M" interval="15m" />
              </div>
            </>
          )}
          {layout === '2h' && (
            <>
              <div className="chart-slot" style={{ flex: 1 }}>
                <Chart ref={chartRef} {...chartProps} />
              </div>
              <div
                className="chart-slot"
                style={{ flex: 1, borderLeft: '1px solid var(--th-border)' }}
              >
                <Chart {...chartProps} range="1M" interval="15m" />
              </div>
            </>
          )}

          <DrawingToolbar
            activeTool={activeTool}
            setActiveTool={setActiveTool}
            magnet={magnet}
            setMagnet={setMagnet}
            onObjects={() => showToast(`${drawings.length} drawings on chart`)}
            onLockAll={() => setDrawings((prev) => prev.map((d) => ({ ...d, locked: true })))}
            onHideAll={() => {
              const anyVisible = drawings.some((d) => !d.hidden)
              setDrawings((prev) => prev.map((d) => ({ ...d, hidden: anyVisible })))
            }}
            onRemoveAll={removeAll}
            onUndo={undo}
            onRedo={redo}
            onPresets={() => showToast('Drawing presets are stored on this device')}
          />

          <FavoriteToolbar activeTool={activeTool} setActiveTool={setActiveTool} />

          <div className="chart-scale" role="toolbar" aria-label="Price scale">
            <button
              className={`tb-btn ${scaleMode === 'log' ? 'active' : ''}`}
              onClick={() => setScaleMode('log')}
              aria-label="log price scale"
              title="Logarithmic scale"
            >
              Log
            </button>
            <button
              className={`tb-btn ${scaleMode === 'percent' ? 'active' : ''}`}
              onClick={() => setScaleMode('percent')}
              aria-label="percent price scale"
              title="Percent scale"
            >
              %
            </button>
            <button
              className={`tb-btn ${scaleMode === 'indexed' ? 'active' : ''}`}
              onClick={() => setScaleMode('indexed')}
              aria-label="indexed price scale"
              title="Indexed scale"
            >
              100
            </button>
            <button
              className={`tb-btn ${invert ? 'active' : ''}`}
              onClick={() => setInvert((v) => !v)}
              aria-label="Invert price scale"
              title="Invert price scale"
            >
              ↕
            </button>
            <span className="tb-sep" />
            <button
              className="tb-btn"
              onClick={() => showToast('Use ← / → to step through bars in replay mode')}
              aria-label="Chart navigation"
              title="Time / Go to…"
            >
              Time / Go to…
            </button>
          </div>
        </div>

        {!focused && (
          <Watchlist
            markets={MARKETS}
            selectedId={market.id}
            onSelect={setMarket}
            stars={stars}
            onToggleStar={toggleStar}
            tab={tab}
            setTab={setTab}
            venue={venue}
            setVenue={setVenue}
            favoritesOnly={favoritesOnly}
            setFavoritesOnly={setFavoritesOnly}
            onToast={showToast}
          />
        )}
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}