export interface Market {
  id: string
  ticker: string
  name: string
  last: number | null
  change: number | null
  decimals: number
  icon?: string
  venue?: 'hyperliquid' | 'binance'
}

export const MARKETS: Market[] = [
  { id: 'btc', ticker: 'BTC', name: 'Bitcoin', last: 71980.9, change: -3.41, decimals: 1, icon: '/coins/btc.png' },
  { id: 'eth', ticker: 'ETH', name: 'Ethereum', last: 2013.5, change: -3.86, decimals: 1, icon: '/coins/eth.png' },
  { id: 'bi', ticker: 'BI', name: 'BITCOIN', last: null, change: null, decimals: 2, icon: '/coins/bi.png' },
  { id: 'nv', ticker: 'NV', name: 'NVIDIA', last: 164.26, change: -6.85, decimals: 2, icon: '/coins/nv.png' },
  { id: 'zec', ticker: 'ZEC', name: 'Zcash', last: 953.15, change: -5.69, decimals: 2, icon: '/coins/zec.png' },
  { id: 'sol', ticker: 'SOL', name: 'Solana', last: 81.51, change: -4.59, decimals: 3, icon: '/coins/sol.png' },
  { id: 'et', ticker: 'ET', name: 'ETHEREUM', last: null, change: null, decimals: 2, icon: '/coins/et.png' },
  { id: 'xrp', ticker: 'XRP', name: 'XRP', last: 1.027, change: -4.16, decimals: 3, icon: '/coins/xrp.png' },
  { id: 'xy', ticker: 'XY', name: 'XYZ 100', last: 28386.0, change: -0.5, decimals: 1, icon: '/coins/xy.png' },
  { id: 'hy', ticker: 'HY', name: 'HYPE', last: 70.998, change: -3.97, decimals: 3, icon: '/coins/hype.png' },
  { id: 'pepe', ticker: '10', name: '1000PEPE', last: 0.004334, change: -12.74, decimals: 6, icon: '/coins/1000pepe.png' },
  { id: 'agt', ticker: 'AG', name: 'AGT', last: 0.07351, change: 1.76, decimals: 5, icon: '/coins/agt.png' },
  { id: 'soxl', ticker: 'SO', name: 'SOXL', last: 65.05, change: -5.71, decimals: 3, icon: '/coins/soxl.png' },
  { id: 'sp500', ticker: 'S&', name: 'S&P 500', last: 7631.1, change: 0.04, decimals: 1, icon: '/coins/sp500.png' },
  { id: 'sk', ticker: 'SK', name: 'SK HYNIX', last: null, change: null, decimals: 2, icon: '/coins/sk.png' },
  { id: 'hliq', ticker: 'HY', name: 'HYPERLIQUID', last: null, change: null, decimals: 2, icon: '/coins/hype.png' },
  { id: 'near', ticker: 'NE', name: 'NEAR', last: 3.397, change: -10.22, decimals: 3, icon: '/coins/near.png' },
  { id: 'bnb', ticker: 'BNB', name: 'BNB', last: 656.35, change: -4.55, decimals: 2, icon: '/coins/bnb.png' },
  { id: 'amd', ticker: 'AM', name: 'AMD', last: 578.39, change: 3.99, decimals: 2, icon: '/coins/amd.png' },
  { id: 'doge', ticker: 'DOGE', name: 'Dogecoin', last: 0.0658, change: -4.94, decimals: 5, icon: '/coins/doge.png' },
  { id: 'zcash', ticker: 'ZC', name: 'ZCASH', last: null, change: null, decimals: 2, icon: '/coins/zc.png' },
  { id: 'init', ticker: 'IN', name: 'INIT', last: 0.11073, change: -24.18, decimals: 5, icon: '/coins/init.png' },
  { id: 'jct', ticker: 'JC', name: 'JCT', last: 0.002421, change: -53.83, decimals: 6, icon: '/coins/jct.png' },
  { id: 'idol', ticker: 'ID', name: 'IDOL', last: 0.02176, change: -14.09, decimals: 5, icon: '/coins/idol.png' },
  { id: 'kgen', ticker: 'KG', name: 'KGEN', last: 0.07128, change: -9.27, decimals: 5, icon: '/coins/kgen.png' },
  { id: 'uni', ticker: 'UNI', name: 'Uniswap', last: 5.997, change: -9.6, decimals: 3, icon: '/coins/uni.png' },
  { id: 'sandisk', ticker: 'SA', name: 'SANDISK', last: null, change: null, decimals: 2, icon: '/coins/sa.png' },
  { id: 'solana', ticker: 'SO', name: 'SOLANA', last: null, change: null, decimals: 2, icon: '/coins/sol.png' },
  { id: 'ena', ticker: 'EN', name: 'ENA', last: 0.13829, change: -10.54, decimals: 5, icon: '/coins/ena.png' },
  { id: 'nebius', ticker: 'NE', name: 'NEBIUS', last: null, change: null, decimals: 2, icon: '/coins/ne.png' },
]

export const DEFAULT_MARKET = MARKETS[0]