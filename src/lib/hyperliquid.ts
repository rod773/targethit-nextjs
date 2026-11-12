import type { Market } from '../data/markets'

type MetaUniverse = { name: string; szDecimals?: number }
type MetaResponse = { universe: MetaUniverse[] }
type Ctx = { markPx?: string; midPx?: string; prevDayPx?: string }

export async function fetchHyperliquidMarkets(): Promise<Market[]> {
  const res = await fetch('https://api.hyperliquid.xyz/info', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'metaAndAssetCtxs' }),
  })
  if (!res.ok) throw new Error('Hyperliquid meta failed: ' + res.status)
  const data = (await res.json()) as [MetaResponse, Ctx[]]
  const universe = data?.[0]?.universe ?? []
  const ctxs = data?.[1] ?? []

  return universe.map((u, i) => {
    const ctx = ctxs[i] ?? {}
    const mark = Number(ctx.markPx ?? ctx.midPx ?? NaN)
    const prev = Number(ctx.prevDayPx ?? NaN)
    const last = Number.isFinite(mark) ? mark : null
    const change =
      last != null && Number.isFinite(prev) && prev > 0 ? ((last - prev) / prev) * 100 : null
    const sz = u.szDecimals ?? 3
    const decimals =
      last != null && Math.abs(last) >= 1000
        ? 1
        : last != null && Math.abs(last) >= 1
          ? Math.max(2, Math.min(4, 6 - sz))
          : Math.max(4, Math.min(6, 8 - sz))
    return {
      id: 'hl-' + u.name.toLowerCase(),
      ticker: u.name,
      name: u.name,
      last,
      change,
      decimals,
      venue: 'hyperliquid' as const,
    }
  })
}
