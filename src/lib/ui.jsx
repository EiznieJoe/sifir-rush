import { useRemaining } from './useRemaining.js'
import { AvatarImg } from '../avatar/Avatar.jsx'

// Barisan avatar pemain. status[key]: wait | done | right | wrong | none (kosong = biasa)
export function Crowd({ players, status = {}, size = 48, names = false }) {
  return (
    <div className="crowd">
      {players.map((p) => (
        <div key={p.key} className={`crowd-item ${status[p.key] || ''}`}>
          <AvatarImg config={p.avatar} size={size} />
          {names && <span>{p.name}</span>}
        </div>
      ))}
    </div>
  )
}

// Status semasa menjawab: yang dah jawab terang, yang belum malap
export const waitStatus = (players, answeredKeys) =>
  Object.fromEntries(players.map((p) => [p.key, answeredKeys.includes(p.key) ? 'done' : 'wait']))

// Selepas reveal: c -> right, w -> wrong, n -> none
export const outcomeStatus = (outcomes) =>
  Object.fromEntries(
    Object.entries(outcomes).map(([k, v]) => [k, v === 'c' ? 'right' : v === 'w' ? 'wrong' : 'none'])
  )

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
