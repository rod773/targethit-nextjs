import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import '../styles.css'

export const metadata: Metadata = {
  title: 'TargetHit Trading Terminal | Free Charts & Demo Trading',
  description:
    'Free multi-market charts, demo trading, and member-open HyperLiquid heatmaps: observable stop/trigger orders and modeled liquidation levels across crypto and supported stock, metals, and oil perpetuals.',
}

export const viewport: Viewport = {
  themeColor: '#0d0d0d',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

const themeScript = `(function(){try{var t=localStorage.getItem('theme.v2');if(t!=='light'&&t!=='dark')t='dark';var r=document.documentElement;r.dataset.theme=t;r.classList.remove('light','dark');r.classList.add(t);r.style.colorScheme=t;}catch(e){}})();`

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  )
}