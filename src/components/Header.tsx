import { ChevronDown, MessageCircle, Moon, Sun, Youtube } from 'lucide-react'

interface HeaderProps {
  theme: 'dark' | 'light'
  onToggleTheme: () => void
}

export function Header({ theme, onToggleTheme }: HeaderProps) {
  return (
    <header className="header">
      <div className="brand">
        TARGET<span className="accent">HIT!</span>
        <span className="sr-only"> Trading Terminal</span>
      </div>

      <nav className="site-nav" aria-label="Site menu">
        <a className="active" href="#trade">
          Trade
        </a>
        <a href="#traders">Traders</a>
        <a href="#strategies">Strategies</a>
        <button type="button">
          Learn <ChevronDown size={13} />
        </button>
        <button type="button">
          Help <ChevronDown size={13} />
        </button>
      </nav>

      <span className="header-spacer" />

      <a className="header-login" href="#login">
        Log in
      </a>
      <a className="header-cta" href="#register">
        Start trading free
      </a>

      <div className="header-social">
        <a href="https://youtube.com/@TargetHit" target="_blank" rel="noreferrer" aria-label="TargetHit on YouTube">
          <Youtube size={16} />
        </a>
        <a href="https://discord.gg/YT38EJ3nJr" target="_blank" rel="noreferrer" aria-label="Join our Discord">
          <MessageCircle size={15} />
          <span className="online-dot" />
          <span className="mono">1043 online</span>
        </a>
      </div>

      <button
        className="icon-btn"
        onClick={onToggleTheme}
        aria-label={theme === 'dark' ? 'Use light theme' : 'Use dark theme'}
      >
        {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
      </button>
    </header>
  )
}