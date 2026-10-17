import { useRemaining } from './useRemaining.js'

export const COLORS = ['#e21b3c', '#1368ce', '#d89e00', '#26890c']
export const SHAPES = ['▲', '◆', '●', '■']

// Bar masa. endAt = timestamp tamat (ms), duration = jumlah ms
export function TimerBar({ endAt, duration, active = true }) {
  const ms = useRemaining(endAt, active)
  const pct = Math.max(0, Math.min(100, (ms / duration) * 100))
  return (
    <div className="timer-wrap">
      <div className="timer">
        <div className="timer-fill" style={{ width: `${pct}%`, background: pct < 25 ? 'var(--bad)' : 'var(--accent)' }} />
      </div>
      <span className="timer-num">{Math.ceil(ms / 1000)}</span>
    </div>
  )
}

// Ruang tiga digit dalam PIN: 123 456
export const fmtPin = (p) => (p ? `${p.slice(0, 3)} ${p.slice(3)}` : '')
