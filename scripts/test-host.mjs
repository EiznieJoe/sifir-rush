// Test logik game tanpa rangkaian: soalan, scoring, reveal automatik, reconnect.
// Jalan: npm test
import assert from 'node:assert/strict'

// Stub minimum supaya modul boleh di-import dalam Node
globalThis.localStorage = {
  s: {},
  getItem(k) { return this.s[k] ?? null },
  setItem(k, v) { this.s[k] = String(v) },
  removeItem(k) { delete this.s[k] },
}

const { makeQuestions } = await import('../src/game/questions.js')
const { HostGame } = await import('../src/game/hostGame.js')

/* ----- soalan ----- */
for (let run = 0; run < 200; run++) {
  const qs = makeQuestions({ tables: [1, 2, 7, 12], count: 15 })
  assert.equal(qs.length, 15)
  for (const q of qs) {
    assert.equal(q.options.length, 4)
    assert.equal(new Set(q.options).size, 4, 'pilihan mesti unik')
    assert.ok(q.options.includes(q.answer), 'jawapan betul mesti ada dalam pilihan')
    assert.ok(q.options.every((o) => o > 0), 'tiada pilihan sifar/negatif')
    const [a, b] = q.text.split(' × ').map(Number)
    assert.equal(a * b, q.answer)
  }
}
console.log('ok  soalan (200 pusingan)')

/* ----- game flow dengan sambungan palsu ----- */
function fakeConn() {
  const c = { open: true, sent: [], send(m) { c.sent.push(m) } }
  return c
}
const last = (c, t) => [...c.sent].reverse().find((m) => m.t === t)

const g = new HostGame()
g.phase = 'lobby'
g.settings = { tables: [2], count: 2, seconds: 5 }

const c1 = fakeConn(), c2 = fakeConn(), c3 = fakeConn()
g.join(c1, { key: 'k1', name: 'Aina', avatar: { skin: 99, hat: -4 } })
g.join(c2, { key: 'k2', name: 'Bob', avatar: {} })
g.join(c3, { key: 'k3', name: 'aina' }) // nama sama (tak peka huruf besar/kecil)
assert.equal(last(c3, 'rejected').reason.includes('Nama'), true)
assert.equal(g.players.size, 2)
assert.ok(g.players.get('k1').avatar.skin <= 4 && g.players.get('k1').avatar.hat >= 0, 'avatar dibersihkan')

g.start()
assert.equal(g.phase, 'question')
const q0 = last(c1, 'question')
assert.ok(q0 && !('answer' in q0), 'jawapan betul tak boleh bocor ke pemain')

const q = g.questions[0]
const right = q.options.indexOf(q.answer)
const wrong = (right + 1) % 4

g.answer(g.players.get('k1'), { idx: 0, choice: right })
g.answer(g.players.get('k1'), { idx: 0, choice: wrong }) // jawab dua kali, mesti diabaikan
assert.equal(g.phase, 'question', 'belum semua jawab')
g.answer(g.players.get('k2'), { idx: 0, choice: wrong })
assert.equal(g.phase, 'reveal', 'semua dah jawab -> reveal automatik')

const r1 = last(c1, 'result'), r2 = last(c2, 'result')
assert.equal(r1.correct, true)
assert.ok(r1.gain >= 500 && r1.gain <= 1000)
assert.equal(r2.correct, false)
assert.equal(r2.gain, 0)
assert.equal(r1.rank, 1)
assert.equal(r2.rank, 2)

g.showBoard()
assert.equal(g.phase, 'leaderboard')
assert.equal(last(c1, 'board').me.rank, 1)
assert.equal(last(c1, 'board').last, false)

// pemain 2 putus sambungan lepas itu sambung semula, skor kekal
g.onClose(c2)
assert.equal(g.players.get('k2').connected, false)
const c2b = fakeConn()
g.join(c2b, { key: 'k2', name: 'Bob' })
assert.equal(g.players.get('k2').connected, true)
assert.equal(last(c2b, 'board').me.rank, 2, 'reconnect dapat state semasa')

// pemain baru tak boleh masuk selepas game mula
const c4 = fakeConn()
g.join(c4, { key: 'k4', name: 'Lewat' })
assert.match(last(c4, 'rejected').reason, /dah mula/)

// soalan 2: tiada siapa jawab, masa tamat
g.next()
assert.equal(g.phase, 'question')
g.reveal()
assert.equal(last(c1, 'result').answered, false)
assert.equal(last(c1, 'result').gain, 0)
g.showBoard()
assert.equal(last(c1, 'board').last, true)
g.next()
assert.equal(g.phase, 'end')
assert.ok(last(c1, 'end'))

g.destroy()
console.log('ok  game flow, scoring, reconnect, anti-bocor')
process.exit(0)
