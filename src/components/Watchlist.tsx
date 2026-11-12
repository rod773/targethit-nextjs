import { Lock, Star } from 'lucide-react'
import type { Market } from '../data/markets'
import { formatPct, formatPrice } from '../lib/format'

interface WatchlistProps {
  markets: Market[]
  selectedId: string
  onSelect: (m: Market) => void
  stars: string[]
  onToggleStar: (id: string) => void
  tab: 'chart' | 'trade'
  setTab: (t: 'chart' | 'trade') => void
  venue: 'hyperliquid' | 'binance'
  setVenue: (v: 'hyperliquid' | 'binance') => void
  favoritesOnly: boolean
  setFavoritesOnly: (v: boolean) => void
  onToast: (msg: string) => void
}

export function Watchlist(props: WatchlistProps) {
  const list = props.favoritesOnly
    ? props.markets.filter((m) => props.stars.includes(m.id))
    : props.markets

  return (
    <aside className="sidebar">
      <div className="sidebar-tabs">
        <button className={`side-tab ${props.tab === 'chart' ? 'active' : ''}`} onClick={() => props.setTab('chart')}>
          Chart
        </button>
        <button
          className={`side-tab ${props.tab === 'trade' ? 'active' : ''}`}
          onClick={() => {
            props.setTab('trade')
            props.onToast('Sign in to unlock demo trading')
          }}
        >
          <Lock size={12} /> Trade
        </button>
      </div>

      <div className="venue-tabs">
        <button
          className={`venue-tab ${props.venue === 'hyperliquid' ? 'active' : ''}`}
          onClick={() => props.setVenue('hyperliquid')}
        >
          HyperLiquid <span className="count">97</span>
        </button>
        <button
          className={`venue-tab ${props.venue === 'binance' ? 'active' : ''}`}
          onClick={() => props.setVenue('binance')}
        >
          Binance
        </button>
      </div>

      <div className="list-head">
        <span>Top 30 · 24h volume</span>
        <span className="badge">PUBLIC</span>
        <span className="spacer" />
        <button
          onClick={() => props.setFavoritesOnly(!props.favoritesOnly)}
          style={{ color: props.favoritesOnly ? 'var(--th-primary)' : undefined }}
          title="Your own lists"
        >
          <Star size={13} fill={props.favoritesOnly ? 'currentColor' : 'none'} />
        </button>
      </div>

      {props.favoritesOnly && list.length === 0 ? (
        <div className="favorites-empty">
          <strong>Favorites</strong>
          Star a market from search or the watchlist
        </div>
      ) : (
        <div className="watch-table">
          <div className="watch-columns">
            <span />
            <span>Symbol</span>
            <button className="r" title="Toggle sort">
              Last
            </button>
            <button className="r" title="Toggle sort">
              24h%
            </button>
          </div>
          {list.map((m) => {
            const starred = props.stars.includes(m.id)
            const up = (m.change ?? 0) >= 0
            return (
              <div
                key={m.id}
                className={`watch-row ${props.selectedId === m.id ? 'selected' : ''}`}
                onClick={() => props.onSelect(m)}
                role="button"
                tabIndex={0}
              >
                <button
                  className={`star-btn ${starred ? 'on' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    props.onToggleStar(m.id)
                  }}
                  aria-label={starred ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Star size={12} fill={starred ? 'currentColor' : 'none'} />
                </button>
                <span className="market-id">
                  {m.icon ? (
                    <img src={m.icon} alt="" />
                  ) : (
                    <span className="coin-fallback">{m.ticker.slice(0, 2)}</span>
                  )}
                  <span style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                    <span className="sym">{m.ticker}</span>
                    <span className="name">{m.name}</span>
                  </span>
                </span>
                <span className="market-last">{formatPrice(m.last, m.decimals)}</span>
                <span className={`market-chg ${up ? 'up' : 'down'}`}>{formatPct(m.change)}</span>
              </div>
            )
          })}
        </div>
      )}

      <div className="sidebar-foot">
        <span>
          <span className="live-dot" /> live · engine poll (venue stream silent here)
        </span>
        <span>magnets live</span>
      </div>
    </aside>
  )
}