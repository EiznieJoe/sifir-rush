import Peer from 'peerjs'
import { PEER_PREFIX } from './hostGame.js'
import { peerOptions } from './peerOptions.js'

/**
 * Sambungan pemain ke host. Auto-reconnect: kalau talian putus (atau host refresh),
 * cuba sambung semula setiap 2 saat. Host kenal pemain melalui `key`, jadi skor kekal.
 */
export class PlayerClient {
  constructor(onMsg, onStatus) {
    this.onMsg = onMsg
    this.onStatus = onStatus
    this.peer = null
    this.conn = null
    this.joined = false
    this.stopped = false
    this.attempt = 0
  }

  connect(pin, profile) {
    this.pin = pin
    this.profile = profile
    this.peer = new Peer(undefined, peerOptions())
    this.peer.on('open', () => this.dial())
    this.peer.on('disconnected', () => {
      try { this.peer.reconnect() } catch { /* abaikan */ }
    })
    this.peer.on('error', (e) => {
      if (this.stopped) return
      if (e.type === 'peer-unavailable') this.retry()
      else if (e.type === 'network' || e.type === 'server-error' || e.type === 'socket-error') {
        this.onStatus('failed', 'Tak dapat sambung ke server signaling. Semak internet.')
      }
    })
  }

  dial() {
    if (this.stopped) return
    this.onStatus(this.joined ? 'lost' : 'connecting')
    const conn = this.peer.connect(PEER_PREFIX + this.pin, { reliable: true })
    this.conn = conn
    conn.on('open', () => {
      this.attempt = 0
      conn.send({ t: 'join', ...this.profile })
    })
    conn.on('data', (m) => {
      if (!m || typeof m !== 'object') return
      if (m.t === 'joined') this.joined = true
      if (m.t === 'rejected') this.stopped = true
      this.onMsg(m)
    })
    conn.on('close', () => {
      if (this.stopped) return
      this.onStatus(this.joined ? 'lost' : 'connecting')
      this.retry()
    })
  }

  retry() {
    if (this.stopped) return
    this.attempt++
    // PIN salah: jangan ligan lama-lama. Selepas pernah join: cuba sehingga ~2 minit.
    if (!this.joined && this.attempt >= 3) {
      this.stopped = true
      this.onStatus('notfound')
      return
    }
    if (this.attempt > 60) {
      this.stopped = true
      this.onStatus('failed', 'Sambungan terputus terlalu lama.')
      return
    }
    setTimeout(() => {
      if (this.stopped) return
      try { if (this.peer.disconnected) this.peer.reconnect() } catch { /* abaikan */ }
      this.dial()
    }, 2000)
  }

  send(msg) {
    if (this.conn && this.conn.open) this.conn.send(msg)
  }

  close() {
    this.stopped = true
    try { this.peer?.destroy() } catch { /* abaikan */ }
  }
}
