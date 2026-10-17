import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { HostGame } from '../game/hostGame.js'
import { AvatarImg, Avatar3D } from '../avatar/Avatar.jsx'
import { load, save } from '../lib/storage.js'
import { COLORS, SHAPES, TimerBar, fmtPin } from '../lib/ui.jsx'

const DEFAULTS = { tables: [2, 3, 4, 5, 6, 7, 8, 9], count: 10, seconds: 15 }
const TABLES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

export default function HostScreen({ onExit }) {
  const [settings, setSettings] = useState(() => ({ ...DEFAULTS, ...load('sifir.hostSettings', {}) }))
  const [game, setGame] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const snap = useRef(HostGame.loadSnapshot()).current
  const gameRef = useRef(null)

  useEffect(() => () => gameRef.current && gameRef.current.destroy(), [])

  async function begin(resume) {
    if (!resume && settings.tables.length === 0) return setErr('Pilih sekurang-kurangnya satu sifir.')
    setBusy(true)
    setErr('')
    save('sifir.hostSettings', settings)
    const g = new HostGame()
    gameRef.current = g
    try {
      if (resume) await g.resume(snap)
      else {
        g.settings = settings
        await g.create()
      }
      setGame(g)
    } catch (e) {
      g.destroy()
      setErr((e && e.message) || 'Gagal sambung ke server signaling. Semak internet.')
    }
    setBusy(false)
  }

  if (game) return <HostLive game={game} onExit={onExit} />

  const toggle = (t) =>
    setSettings((s) => ({
      ...s,
      tables: s.tables.includes(t) ? s.tables.filter((x) => x !== t) : [...s.tables, t].sort((a, b) => a - b),
    }))

  return (
    <div className="page">
      <div className="topbar">
        <button className="btn small secondary" onClick={onExit}>Balik</button>
        <h2>Setup game</h2>
      </div>

      {snap && (
        <div className="card notice">
          <div>
            <strong>Ada game yang belum habis</strong>
            <div className="muted">PIN {fmtPin(snap.pin)}, selepas soalan {snap.qIndex + 1}/{snap.questions.length}, {snap.players.length} pemain.</div>
          </div>
          <button className="btn small" disabled={busy} onClick={() => begin(true)}>Sambung</button>
        </div>
      )}

      <div className="card dark">
        <label className="field-label">Sifir yang diuji</label>
        <div className="chips">
          {TABLES.map((t) => (
            <button key={t} className={`chip ${settings.tables.includes(t) ? 'on' : ''}`} onClick={() => toggle(t)}>{t}</button>
          ))}
        </div>
        <div className="row-gap">
          <button className="link" onClick={() => setSettings((s) => ({ ...s, tables: TABLES }))}>Semua</button>
          <button className="link" onClick={() => setSettings((s) => ({ ...s, tables: [] }))}>Kosongkan</button>
        </div>

        <label className="field-label">Bilangan soalan</label>
        <div className="chips">
          {[5, 10, 15, 20].map((n) => (
            <button key={n} className={`chip ${settings.count === n ? 'on' : ''}`} onClick={() => setSettings((s) => ({ ...s, count: n }))}>{n}</button>
          ))}
        </div>

        <label className="field-label">Masa setiap soalan (saat)</label>
        <div className="chips">
          {[10, 15, 20, 30].map((n) => (
            <button key={n} className={`chip ${settings.seconds === n ? 'on' : ''}`} onClick={() => setSettings((s) => ({ ...s, seconds: n }))}>{n}</button>
          ))}
        </div>
      </div>

      {err && <p className="error">{err}</p>}
      <button className="btn big" disabled={busy} onClick={() => begin(false)}>
        {busy ? 'Menyediakan bilik...' : 'Buka bilik'}
      </button>
    </div>
  )
}

/* ================= game live (host) ================= */

function HostLive({ game, onExit }) {
  useSyncExternalStore(game.subscribe, () => game.version)
  const { phase } = game
  const joinUrl = `${location.origin}${location.pathname}?pin=${game.pin}`
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* abaikan */ }
  }

  if (phase === 'lobby') {
    const list = [...game.players.values()]
    return (
      <div className="page">
        <div className="topbar">
          <button className="btn small secondary" onClick={onExit}>Tutup bilik</button>
        </div>
        <div className="card pin-card">
          <div className="muted">Masuk di {location.host}{location.pathname.replace(/\/$/, '')} guna PIN</div>
          <div className="pin">{fmtPin(game.pin)}</div>
          <button className="link" onClick={copy}>{copied ? 'Link disalin' : 'Salin link terus'}</button>
        </div>
        {game.error && <p className="error">Masalah sambungan: {game.error}</p>}
        <div className="card dark">
          <div className="row-between">
            <strong>Pemain ({list.length})</strong>
            <span className="muted">Max 40</span>
          </div>
          {list.length === 0 ? (
            <p className="muted">Menunggu pemain masuk...</p>
          ) : (
            <div className="player-grid">
              {list.map((p) => (
                <div key={p.key} className="player-tile">
                  <AvatarImg config={p.avatar} size={72} />
                  <span>{p.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <button className="btn big" disabled={list.length === 0} onClick={() => game.start()}>
          Mula ({list.length} pemain)
        </button>
      </div>
    )
  }

  const q = game.questions[game.qIndex]

  if (phase === 'question') {
    return (
      <div className="page">
        <div className="row-between">
          <strong>Soalan {game.qIndex + 1}/{game.questions.length}</strong>
          <span className="muted">{game.answeredCount()}/{game.connectedCount()} dah jawab</span>
        </div>
        <TimerBar endAt={game.qStart + game.settings.seconds * 1000} duration={game.settings.seconds * 1000} />
        <div className="question-text">{q.text}</div>
        <div className="opts">
          {q.options.map((o, i) => (
            <div key={i} className="opt static" style={{ background: COLORS[i] }}>
              <span className="shape">{SHAPES[i]}</span>
              <span>{o}</span>
            </div>
          ))}
        </div>
        <button className="btn secondary" onClick={() => game.skip()}>Langkau masa</button>
      </div>
    )
  }

  if (phase === 'reveal') {
    const total = Math.max(1, game.counts.reduce((a, b) => a + b, 0))
    return (
      <div className="page">
        <strong>Soalan {game.qIndex + 1}/{game.questions.length}</strong>
        <div className="question-text">{q.text} = {q.answer}</div>
        <div className="opts">
          {q.options.map((o, i) => {
            const right = o === q.answer
            return (
              <div key={i} className={`opt static ${right ? 'right' : 'dim'}`} style={{ background: COLORS[i] }}>
                <span className="shape">{SHAPES[i]}</span>
                <span>{o}{right ? '  (betul)' : ''}</span>
                <span className="count">{game.counts[i]}</span>
                <span className="bar" style={{ width: `${(game.counts[i] / total) * 100}%` }} />
              </div>
            )
          })}
        </div>
        <button className="btn big" onClick={() => game.showBoard()}>Papar markah</button>
      </div>
    )
  }

  if (phase === 'leaderboard') {
    const top = game.top(5)
    return (
      <div className="page">
        <h2>Markah semasa</h2>
        <div className="board">
          {top.map((p, i) => (
            <div key={p.key} className="board-row">
              <span className="rank">{i + 1}</span>
              <AvatarImg config={p.avatar} size={56} />
              <span className="board-name">{p.name}</span>
              <span className="board-score">{p.score}</span>
            </div>
          ))}
        </div>
        <button className="btn big" onClick={() => game.next()}>
          {game.isLast() ? 'Keputusan akhir' : 'Soalan seterusnya'}
        </button>
      </div>
    )
  }

  // end: podium
  const top = game.top(10)
  const podium = [top[1], top[0], top[2]]
  return (
    <div className="page">
      <h2 className="center-text">Keputusan akhir</h2>
      <div className="podium">
        {podium.map((p, i) =>
          p ? (
            <div key={p.key} className={`pod pod-${i === 1 ? 1 : i === 0 ? 2 : 3}`}>
              <Avatar3D config={p.avatar} mood="happy" className="pod-avatar" />
              <div className="pod-name">{p.name}</div>
              <div className="pod-score">{p.score}</div>
              <div className="pod-step">{i === 1 ? 1 : i === 0 ? 2 : 3}</div>
            </div>
          ) : (
            <div key={i} className="pod" />
          )
        )}
      </div>
      {top.length > 3 && (
        <div className="board">
          {top.slice(3).map((p, i) => (
            <div key={p.key} className="board-row">
              <span className="rank">{i + 4}</span>
              <AvatarImg config={p.avatar} size={44} />
              <span className="board-name">{p.name}</span>
              <span className="board-score">{p.score}</span>
            </div>
          ))}
        </div>
      )}
      <button className="btn big" onClick={onExit}>Game baru</button>
    </div>
  )
}
