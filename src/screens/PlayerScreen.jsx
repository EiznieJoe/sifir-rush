import { useState } from 'react'
import { usePlayer } from '../game/usePlayer.js'
import { Avatar3D, AvatarImg } from '../avatar/Avatar.jsx'
import AvatarCreator from '../avatar/AvatarCreator.jsx'
import { defaultAvatar, randomAvatar, sanitizeAvatar } from '../avatar/config.js'
import { load, save, playerKey } from '../lib/storage.js'
import { COLORS, SHAPES, TimerBar, fmtPin, Crowd, waitStatus, outcomeStatus } from '../lib/ui.jsx'

export default function PlayerScreen({ initialPin, onExit }) {
  const [pin, setPin] = useState(initialPin || '')
  const [name, setName] = useState(() => load('sifir.profile', {}).name || '')
  const [avatar, setAvatar] = useState(() => {
    const saved = load('sifir.profile', {}).avatar
    return saved ? sanitizeAvatar(saved) : { ...defaultAvatar, ...randomAvatar() }
  })
  const [profile, setProfile] = useState(null)

  const canJoin = pin.length === 6 && name.trim().length > 0

  if (profile) return <PlayerLive pin={pin} profile={profile} avatar={avatar} onExit={() => { setProfile(null); onExit() }} onBack={() => setProfile(null)} />

  return (
    <div className="page">
      <div className="topbar">
        <button className="btn small secondary" onClick={onExit}>Balik</button>
        <h2>Masuk game</h2>
      </div>

      <div className="card dark">
        <label className="field-label">PIN game</label>
        <input
          className="input pin-input"
          inputMode="numeric"
          autoComplete="off"
          maxLength={6}
          placeholder="123456"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
        />
        <label className="field-label">Nama</label>
        <input
          className="input"
          maxLength={14}
          placeholder="Nama kau"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="card dark">
        <label className="field-label">Karakter kau</label>
        <AvatarCreator value={avatar} onChange={setAvatar} />
      </div>

      <button
        className="btn big"
        disabled={!canJoin}
        onClick={() => {
          const p = { name: name.trim(), avatar }
          save('sifir.profile', p)
          setProfile({ ...p, key: playerKey() })
        }}
      >
        Masuk
      </button>
    </div>
  )
}

/* ================= game live (pemain) ================= */

function PlayerLive({ pin, profile, avatar, onExit, onBack }) {
  const { state, answer } = usePlayer(pin, profile)
  const { status, phase } = state

  if (status === 'connecting') {
    return <Msg title={`Menyambung ke ${fmtPin(pin)}...`} sub="Tunggu sekejap." />
  }
  if (status === 'notfound') {
    return <Msg title="PIN tak jumpa" sub="Semak PIN, dan pastikan cikgu dah buka bilik." action={onBack} actionText="Cuba lagi" />
  }
  if (status === 'rejected') {
    return <Msg title="Tak boleh masuk" sub={state.reason} action={onBack} actionText="Balik" />
  }
  if (status === 'failed') {
    return <Msg title="Sambungan gagal" sub={state.reason} action={onBack} actionText="Balik" />
  }

  const lost = status === 'lost'

  return (
    <div className="page player-page">
      {lost && <div className="banner">Sambungan terputus. Cuba sambung semula...</div>}
      <PlayerPhase state={state} answer={answer} avatar={avatar} profile={profile} onExit={onExit} />
    </div>
  )
}

function Msg({ title, sub, action, actionText }) {
  return (
    <div className="page center">
      <h2>{title}</h2>
      {sub && <p className="muted">{sub}</p>}
      {action && <button className="btn" onClick={action}>{actionText}</button>}
    </div>
  )
}

function PlayerPhase({ state, answer, avatar, profile, onExit }) {
  const { phase, q, chosen, endAt, result, board, me, last, players, answeredKeys, outcomes } = state

  if (phase === 'lobby') {
    return (
      <div className="center-col">
        <Avatar3D config={avatar} sway className="hero-avatar" />
        <h2>{profile.name}</h2>
        <p className="muted">Kau dah masuk. Tunggu cikgu mulakan game.</p>
        <p className="muted">{players.length} pemain dalam bilik</p>
        <Crowd players={players} size={56} names />
      </div>
    )
  }

  if (phase === 'question' && q) {
    return (
      <div className="stack-full">
        <div className="row-between">
          <strong>{q.idx + 1}/{q.total}</strong>
          <span className="muted">{profile.name}</span>
        </div>
        <TimerBar endAt={endAt} duration={q.duration} active={chosen == null} />
        <div className="question-text">{q.text}</div>
        {chosen != null && <p className="center-text muted">Jawapan dihantar. Tunggu yang lain...</p>}
        <div className="opts">
          {q.options.map((o, i) => (
            <button
              key={i}
              className={`opt ${chosen === i ? 'picked' : chosen != null ? 'dim' : ''}`}
              style={{ background: COLORS[i] }}
              disabled={chosen != null}
              onClick={() => answer(i)}
            >
              <span className="shape">{SHAPES[i]}</span>
              <span>{o}</span>
            </button>
          ))}
        </div>
        <Crowd players={players} status={waitStatus(players, answeredKeys)} size={40} />
      </div>
    )
  }

  if (phase === 'result' && result) {
    const good = result.correct
    return (
      <div className={`center-col result ${good ? 'good' : 'bad'}`}>
        <Avatar3D config={avatar} mood={good ? 'happy' : 'sad'} className="hero-avatar" />
        <h1>{good ? 'Betul' : result.answered ? 'Salah' : 'Tak sempat'}</h1>
        {good ? (
          <p className="gain">+{result.gain}</p>
        ) : (
          <p className="muted">Jawapan betul: {result.answer}</p>
        )}
        {result.streak >= 2 && <p>{result.streak} betul berturut-turut</p>}
        <p className="muted">Markah {result.score}, tempat {result.rank}/{result.total}</p>
        <Crowd players={players} status={outcomeStatus(outcomes)} size={40} />
      </div>
    )
  }

  if (phase === 'board' && board) {
    return (
      <div className="stack-full">
        <h2 className="center-text">Tempat kau: {me.rank}/{me.total}</h2>
        <p className="center-text muted">Markah {me.score}</p>
        <div className="board">
          {board.map((p, i) => (
            <div key={p.key} className={`board-row ${p.name === profile.name ? 'me' : ''}`}>
              <span className="rank">{i + 1}</span>
              <AvatarImg config={p.avatar} size={44} />
              <span className="board-name">{p.name}</span>
              <span className="board-score">{p.score}</span>
            </div>
          ))}
        </div>
        <p className="center-text muted">{last ? 'Tunggu keputusan akhir...' : 'Soalan seterusnya sebentar lagi...'}</p>
      </div>
    )
  }

  if (phase === 'end' && me) {
    const podium = me.rank <= 3
    return (
      <div className="center-col">
        <Avatar3D config={avatar} mood={podium ? 'happy' : 'idle'} className="hero-avatar" />
        <h1>Tempat {me.rank}</h1>
        <p className="muted">Markah akhir {me.score}, daripada {me.total} pemain</p>
        <button className="btn" onClick={onExit}>Selesai</button>
      </div>
    )
  }

  return <div className="center-col"><p className="muted">Tunggu...</p></div>
}
