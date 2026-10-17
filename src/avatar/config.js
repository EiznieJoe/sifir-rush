// Config avatar = objek kecil berisi index sahaja. Ringan untuk dihantar melalui PeerJS.
export const SKINS = ['#ffdcc2', '#f7c59f', '#e0a97c', '#b9805a', '#8a5a3c']
export const HAIR_COLORS = ['#2b1b17', '#6b3f1f', '#c9822b', '#f2d16b', '#e0577a', '#4a7bdc', '#8d5bd6', '#f4f4f4']
export const OUTFITS = ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#4dabf7', '#9775fa', '#f783ac', '#495057']
export const HAIR_STYLES = ['Botak comel', 'Mangkuk', 'Sanggul', 'Berduri']
export const EYE_STYLES = ['Bulat', 'Gembira', 'Berkilau']
export const HATS = ['Tiada', 'Topi', 'Beanie', 'Mahkota', 'Telinga arnab']

export const LIMITS = {
  skin: SKINS.length,
  hairStyle: HAIR_STYLES.length,
  hairColor: HAIR_COLORS.length,
  eyes: EYE_STYLES.length,
  hat: HATS.length,
  outfit: OUTFITS.length,
}

export const defaultAvatar = { skin: 0, hairStyle: 1, hairColor: 1, eyes: 0, hat: 0, outfit: 4 }

// Pastikan data dari rangkaian (tak dipercayai) sentiasa dalam julat yang sah.
export function sanitizeAvatar(a) {
  const out = {}
  for (const k of Object.keys(LIMITS)) {
    const v = a && Number.isInteger(a[k]) ? a[k] : defaultAvatar[k]
    out[k] = Math.min(Math.max(v, 0), LIMITS[k] - 1)
  }
  return out
}

export function randomAvatar() {
  const out = {}
  for (const k of Object.keys(LIMITS)) out[k] = Math.floor(Math.random() * LIMITS[k])
  return out
}
