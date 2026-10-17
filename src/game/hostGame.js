import Peer from 'peerjs'
import { makeQuestions } from './questions.js'
import { sanitizeAvatar } from '../avatar/config.js'

export const PEER_PREFIX = 'sifir-'
const SNAP_KEY = 'sifir.hostSnapshot'
const MAX_PLAYERS = 40
const SNAP_MAX_AGE = 2 * 60 * 60 * 1000

/**
 * Host = "server" game. Semua state hidup dalam memory di sini.
 * Skor dikira di sini sahaja; pemain cuma hantar pilihan (index), bukan "betul/salah".
 *
 * Fasa: lobby -> question -> reveal -> leaderboard -> (question ...) -> end
 */
export class HostGame {
  version = 0
  listeners = new Set()
  peer = null
  pin = null
  players = new Map() // key -> player
  phase = 'init'
  settings = { tables: [2, 3, 4, 5], count: 10, seconds: 15 }
  questions = []
  qIndex = -1
  qStart = 0
  timer = null
  counts = [0, 0, 0, 0]
  outcomes = {} // key -> 'c' (betul) | 'w' (salah) | 'n' (tak jawab)
  error = null

  // arrow property supaya boleh terus pass ke useSyncExternalStore
  subscribe = (fn) => {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  emit() {
    this.version++
    this.listeners.forEach((f) => f())
  }

  /* ---------- sambungan ---------- */

  async create() {
    this.pin = await this.open()
    this.phase = 'lobby'
    this.emit()
  }

  async resume(snap) {
    this.settings = snap.settings
    this.questions = snap.questions
    this.qIndex = snap.qIndex
    snap.players.forEach((p) =>
      this.players.set(p.key, { ...p, answered: null, last: null, conn: null, connected: false })
    )
    this.phase = 'leaderboard'
    this.pin = await this.open(snap.pin)
    this.emit()
  }

  async open(resumePin) {
    const tries = resumePin ? 8 : 6
    for (let i = 0; i < tries; i++) {
      const pin = resumePin || String(Math.floor(100000 + Math.random() * 900000))
      try {
        await this.tryOpen(pin)
        return pin
      } catch (e) {
        if (e && e.type === 'unavailable-id') {
          // PIN lama mungkin belum dilepaskan oleh signaling server, tunggu sekejap
          if (resumePin) await new Promise((r) => setTimeout(r, 2500))
          continue
        }
        throw e
      }
    }
    throw new Error(resumePin ? 'PIN lama belum dilepaskan server. Cuba lagi sebentar.' : 'Tak dapat PIN. Cuba lagi.')
  }

  tryOpen(pin) {
    return new Promise((resolve, reject) => {
      const peer = new Peer(PEER_PREFIX + pin)
      const fail = (e) => {
        try { peer.destroy() } catch { /* abaikan */ }
        reject(e)
      }
      peer.once('error', fail)
      peer.once('open', () => {
        peer.off('error', fail)
        this.peer = peer
        peer.on('connection', (c) => this.onConn(c))
        peer.on('disconnected', () => {
          try { peer.reconnect() } catch { /* abaikan */ }
        })
        peer.on('error', (e) => {
          this.error = e.type || 'error'
          this.emit()
        })
        resolve()
      })
    })
  }

  destroy() {
    clearTimeout(this.timer)
    try { this.peer?.destroy() } catch { /* abaikan */ }
  }

  onConn(conn) {
    conn.on('data', (msg) => this.onMsg(conn, msg))
    conn.on('close', () => this.onClose(conn))
    conn.on('error', () => this.onClose(conn))
  }

  byConn(conn) {
    for (const p of this.players.values()) if (p.conn === conn) return p
    return null
  }

  onMsg(conn, msg) {
    if (!msg || typeof msg !== 'object') return
    if (msg.t === 'join') return this.join(conn, msg)
    const p = this.byConn(conn)
    if (p && msg.t === 'answer') this.answer(p, msg)
  }

  onClose(conn) {
    const p = this.byConn(conn)
    if (!p) return
    p.connected = false
    p.conn = null
    if (this.phase === 'lobby') {
      this.players.delete(p.key)
      this.broadcastLobby()
    } else if (this.phase === 'question') {
      this.checkAllAnswered()
    }
    this.emit()
  }

  /* ---------- pemain ---------- */

  join(conn, msg) {
    const key = String(msg.key || '').slice(0, 40)
    const name = String(msg.name || '').trim().slice(0, 14)
    if (!key || !name) return conn.send({ t: 'rejected', reason: 'Nama diperlukan.' })

    let p = this.players.get(key)
    if (!p) {
      if (this.phase !== 'lobby') return conn.send({ t: 'rejected', reason: 'Game dah mula. Tunggu game seterusnya.' })
      if (this.players.size >= MAX_PLAYERS) return conn.send({ t: 'rejected', reason: 'Bilik dah penuh.' })
      const taken = [...this.players.values()].some((x) => x.name.toLowerCase() === name.toLowerCase())
      if (taken) return conn.send({ t: 'rejected', reason: 'Nama tu dah ada orang guna. Tukar nama lain.' })
      p = { key, name, avatar: sanitizeAvatar(msg.avatar), score: 0, streak: 0, answered: null, last: null, conn: null, connected: false }
      this.players.set(key, p)
    }
    p.conn = conn
    p.connected = true
    conn.send({ t: 'joined', name: p.name })
    this.sendState(p)
    this.broadcastLobby()
    this.emit()
  }

  // Hantar keadaan semasa kepada pemain (join baru atau reconnect)
  sendState(p) {
    const c = p.conn
    if (!c || !c.open) return
    // pemain yang reconnect tengah game perlu senarai pemain juga
    if (this.phase !== 'lobby') c.send({ t: 'roster', players: this.lobbyList() })
    switch (this.phase) {
      case 'question': {
        const q = this.questions[this.qIndex]
        const remaining = Math.max(0, this.settings.seconds * 1000 - (Date.now() - this.qStart))
        c.send({ t: 'question', ...this.qPayload(q), remaining, answered: p.answered ? p.answered.choice : null })
        c.send({ t: 'progress', answered: this.answeredKeys() })
        break
      }
      case 'reveal':
        if (p.last) c.send({ t: 'result', ...p.last })
        c.send({ t: 'reveal', outcomes: this.outcomes })
        break
      case 'leaderboard':
        c.send({ t: 'board', top: this.top(5), me: this.me(p), last: this.isLast() })
        break
      case 'end':
        c.send({ t: 'end', top: this.top(5), me: this.me(p) })
        break
      default:
        c.send({ t: 'lobby', players: this.lobbyList() })
    }
  }

  broadcast(msg) {
    this.players.forEach((p) => {
      if (p.conn && p.conn.open) p.conn.send(msg)
    })
  }

  lobbyList() {
    return [...this.players.values()].map((p) => ({ key: p.key, name: p.name, avatar: p.avatar }))
  }

  broadcastLobby() {
    if (this.phase === 'lobby') this.broadcast({ t: 'lobby', players: this.lobbyList() })
  }

  sorted() {
    return [...this.players.values()].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
  }

  top(n) {
    return this.sorted().slice(0, n).map((p) => ({ key: p.key, name: p.name, avatar: p.avatar, score: p.score }))
  }

  me(p) {
    return { rank: this.sorted().indexOf(p) + 1, score: p.score, total: this.players.size }
  }

  connectedCount() {
    let n = 0
    this.players.forEach((p) => p.connected && n++)
    return n
  }

  answeredKeys() {
    const out = []
    this.players.forEach((p) => p.answered && out.push(p.key))
    return out
  }

  broadcastProgress() {
    if (this.phase === 'question') this.broadcast({ t: 'progress', answered: this.answeredKeys() })
  }

  answeredCount() {
    let n = 0
    this.players.forEach((p) => p.answered && n++)
    return n
  }

  isLast() {
    return this.qIndex + 1 >= this.questions.length
  }

  /* ---------- alur game ---------- */

  start() {
    if (this.phase !== 'lobby' || this.players.size === 0) return
    this.questions = makeQuestions(this.settings)
    this.qIndex = -1
    this.nextQuestion()
  }

  qPayload(q) {
    return {
      idx: this.qIndex,
      total: this.questions.length,
      text: q.text,
      options: q.options,
      duration: this.settings.seconds * 1000,
    }
  }

  nextQuestion() {
    this.qIndex++
    if (this.qIndex >= this.questions.length) return this.end()
    const q = this.questions[this.qIndex]
    this.players.forEach((p) => {
      p.answered = null
      p.last = null
    })
    this.counts = [0, 0, 0, 0]
    this.outcomes = {}
    this.phase = 'question'
    this.qStart = Date.now()
    // jawapan betul TIDAK dihantar kepada pemain
    this.broadcast({ t: 'question', ...this.qPayload(q), remaining: this.settings.seconds * 1000, answered: null })
    clearTimeout(this.timer)
    this.timer = setTimeout(() => this.reveal(), this.settings.seconds * 1000 + 400)
    this.emit()
  }

  answer(p, msg) {
    if (this.phase !== 'question' || msg.idx !== this.qIndex || p.answered) return
    const choice = msg.choice
    if (!Number.isInteger(choice) || choice < 0 || choice > 3) return
    const q = this.questions[this.qIndex]
    const dur = this.settings.seconds * 1000
    const elapsed = Date.now() - this.qStart
    if (elapsed > dur + 1500) return // lewat (beri sedikit ruang untuk latency)

    const correct = q.options[choice] === q.answer
    // 1000 mata jika serta-merta, turun ke 500 jika di saat terakhir
    const gain = correct ? Math.round(1000 * (1 - 0.5 * Math.min(elapsed / dur, 1))) : 0
    p.answered = { choice, correct, gain, elapsed }
    this.counts[choice]++
    this.emit()
    this.broadcastProgress()
    this.checkAllAnswered()
  }

  checkAllAnswered() {
    if (this.phase !== 'question') return
    let live = 0
    let done = 0
    this.players.forEach((p) => {
      if (p.connected) {
        live++
        if (p.answered) done++
      }
    })
    if (live > 0 && done === live) this.reveal()
  }

  reveal() {
    if (this.phase !== 'question') return
    clearTimeout(this.timer)
    this.phase = 'reveal'
    const q = this.questions[this.qIndex]
    this.players.forEach((p) => {
      const gain = p.answered ? p.answered.gain : 0
      p.score += gain
      p.streak = p.answered && p.answered.correct ? p.streak + 1 : 0
    })
    this.sorted().forEach((p, i) => {
      p.last = {
        answered: !!p.answered,
        correct: !!(p.answered && p.answered.correct),
        gain: p.answered ? p.answered.gain : 0,
        score: p.score,
        rank: i + 1,
        total: this.players.size,
        streak: p.streak,
        answer: q.answer,
      }
      if (p.conn && p.conn.open) p.conn.send({ t: 'result', ...p.last })
    })
    // semua pemain nampak siapa betul, siapa salah
    const outcomes = {}
    this.players.forEach((p) => {
      outcomes[p.key] = !p.answered ? 'n' : p.answered.correct ? 'c' : 'w'
    })
    this.outcomes = outcomes
    this.broadcast({ t: 'reveal', outcomes })
    this.emit()
  }

  showBoard() {
    if (this.phase !== 'reveal') return
    this.phase = 'leaderboard'
    const top = this.top(5)
    const last = this.isLast()
    this.players.forEach((p) => {
      if (p.conn && p.conn.open) p.conn.send({ t: 'board', top, me: this.me(p), last })
    })
    this.saveSnapshot()
    this.emit()
  }

  next() {
    if (this.phase === 'leaderboard') this.nextQuestion()
  }

  skip() {
    this.reveal()
  }

  end() {
    clearTimeout(this.timer)
    this.phase = 'end'
    const top = this.top(5)
    this.players.forEach((p) => {
      if (p.conn && p.conn.open) p.conn.send({ t: 'end', top, me: this.me(p) })
    })
    HostGame.clearSnapshot()
    this.emit()
  }

  /* ---------- snapshot (resume kalau cikgu terrefresh) ---------- */

  saveSnapshot() {
    try {
      localStorage.setItem(
        SNAP_KEY,
        JSON.stringify({
          at: Date.now(),
          pin: this.pin,
          settings: this.settings,
          questions: this.questions,
          qIndex: this.qIndex,
          players: [...this.players.values()].map((p) => ({
            key: p.key, name: p.name, avatar: p.avatar, score: p.score, streak: p.streak,
          })),
        })
      )
    } catch { /* abaikan */ }
  }

  static loadSnapshot() {
    try {
      const s = JSON.parse(localStorage.getItem(SNAP_KEY) || 'null')
      if (!s || Date.now() - s.at > SNAP_MAX_AGE) return null
      return s
    } catch {
      return null
    }
  }

  static clearSnapshot() {
    try { localStorage.removeItem(SNAP_KEY) } catch { /* abaikan */ }
  }
}
