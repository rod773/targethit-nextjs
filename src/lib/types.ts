import type { Interval, Range } from './chartData'

export type ChartType = 'candles' | 'bars' | 'area' | 'line'
export type ScaleMode = 'linear' | 'log' | 'percent' | 'indexed'

export interface Workspace {
  id: string
  name: string
  interval: Interval
  range: Range
  chartType: ChartType
  indicators: string[]
}

export interface Alert {
  id: string
  symbol: string
  condition: 'above' | 'below'
  price: number
  active: boolean
  triggeredAt?: number
}