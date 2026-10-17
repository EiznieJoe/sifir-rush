// localStorage: profil pemain, setting host, snapshot untuk resume.
export function load(key, fallback) {
  try {
    const v = localStorage.getItem(key)
    return v ? JSON.parse(v) : fallback
  } catch {
    return fallback
  }
}

export function save(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val))
  } catch {
    /* private mode / penuh, abaikan */
  }
}

export function remove(key) {
  try {
    localStorage.removeItem(key)
  } catch {
    /* abaikan */
  }
}

// Key pemain disimpan per-tab (sessionStorage): refresh kekal pemain yang sama,
// tapi dua tab dalam satu browser boleh jadi dua pemain berbeza semasa test.
export function playerKey() {
  try {
    let k = sessionStorage.getItem('sifir.key')
    if (!k) {
      k = Math.random().toString(36).slice(2) + Date.now().toString(36)
      sessionStorage.setItem('sifir.key', k)
    }
    return k
  } catch {
    return Math.random().toString(36).slice(2)
  }
}
