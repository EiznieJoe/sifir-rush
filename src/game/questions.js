const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a

const shuffle = (arr) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(0, i)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// tables: senarai sifir (1..12), count: bilangan soalan
export function makeQuestions({ tables, count }) {
  const pool = []
  for (const t of tables) for (let b = 1; b <= 12; b++) pool.push([t, b])

  // Elak ulang soalan yang sama selagi pool belum habis
  const picked = []
  let bag = shuffle(pool)
  while (picked.length < count) {
    if (!bag.length) bag = shuffle(pool)
    picked.push(bag.pop())
  }

  return picked.map(([t, b]) => {
    const [x, y] = Math.random() < 0.5 ? [t, b] : [b, t]
    const answer = t * b

    // Pilihan salah yang "hampir": kesilapan sifir biasa budak
    const candidates = [
      (t + 1) * b, (t - 1) * b, t * (b + 1), t * (b - 1),
      answer + rand(1, 3), answer - rand(1, 3),
      answer + 10, answer - 10, (t + 2) * b, t * (b + 2),
    ]
    const wrong = new Set()
    for (const c of shuffle(candidates)) {
      if (c > 0 && c !== answer) wrong.add(c)
      if (wrong.size === 3) break
    }
    let n = 1
    while (wrong.size < 3) {
      const c = answer + n++
      if (c !== answer) wrong.add(c)
    }

    return { text: `${x} × ${y}`, answer, options: shuffle([answer, ...wrong]) }
  })
}
