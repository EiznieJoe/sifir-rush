import * as THREE from 'three'
import { SKINS, HAIR_COLORS, OUTFITS, sanitizeAvatar } from './config.js'

/**
 * Avatar chibi procedural: kepala besar, badan kecil, toon shading + outline.
 * Satu fungsi ini dipakai untuk render live (react-three-fiber) dan snapshot gambar.
 *
 * Koordinat: kaki di y=0, kepala berpusat di y=NECK+HY. Kepala dalam group sendiri
 * supaya boleh senget/bob dari "leher".
 */
const NECK = 0.7
const HY = 0.75 // pusat kepala relatif kepada group kepala
const R = 0.75 // jejari kepala

let gradientTex
function gradient() {
  if (!gradientTex) {
    gradientTex = new THREE.DataTexture(new Uint8Array([145, 205, 255]), 3, 1, THREE.RedFormat)
    gradientTex.minFilter = gradientTex.magFilter = THREE.NearestFilter
    gradientTex.needsUpdate = true
  }
  return gradientTex
}

// Material outline dikongsi, jangan dispose semasa pembersihan
export const outlineMat = new THREE.MeshBasicMaterial({ color: 0x3a2540, side: THREE.BackSide })

const toon = (color, extra = {}) => new THREE.MeshToonMaterial({ color, gradientMap: gradient(), ...extra })

function part(geo, color, { outline = 1.06, material } = {}) {
  const m = new THREE.Mesh(geo, material || toon(color))
  if (outline) {
    const o = new THREE.Mesh(geo, outlineMat)
    o.scale.setScalar(outline)
    m.add(o)
  }
  return m
}

// Letak objek atas permukaan kepala pada (x, y) relatif pusat kepala, menghadap keluar
function placeOnHead(obj, x, y, lift = 1) {
  const z = Math.sqrt(Math.max(R * R - x * x - y * y, 0)) * lift
  obj.position.set(x * lift, HY + y * lift, z)
  obj.lookAt(x * 2, HY + y * 2, z * 2)
}

export function buildAvatar(rawCfg) {
  const cfg = sanitizeAvatar(rawCfg)
  const skin = SKINS[cfg.skin]
  const hairC = HAIR_COLORS[cfg.hairColor]
  const outfit = OUTFITS[cfg.outfit]

  const root = new THREE.Group()

  /* ----- badan ----- */
  const bodyG = new THREE.Group()
  root.add(bodyG)
  const body = part(new THREE.SphereGeometry(0.5, 24, 18), outfit)
  body.scale.set(1, 1.2, 0.9)
  body.position.y = 0.6
  bodyG.add(body)
  for (const s of [-1, 1]) {
    const arm = part(new THREE.SphereGeometry(0.15, 16, 12), skin)
    arm.position.set(s * 0.57, 0.62, 0.03)
    bodyG.add(arm)
    const foot = part(new THREE.SphereGeometry(0.19, 16, 12), '#3b3b4f')
    foot.scale.set(1, 0.7, 1.35)
    foot.position.set(s * 0.25, 0.12, 0.1)
    bodyG.add(foot)
  }

  /* ----- kepala ----- */
  const head = new THREE.Group()
  head.position.y = NECK
  root.add(head)

  const skull = part(new THREE.SphereGeometry(R, 32, 24), skin, { outline: 1.045 })
  skull.position.y = HY
  head.add(skull)

  // mata
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x2a1830 })
  const white = new THREE.MeshBasicMaterial({ color: 0xffffff })
  const eyes = []
  for (const s of [-1, 1]) {
    const g = new THREE.Group()
    placeOnHead(g, s * 0.27, -0.05, 1.002)
    if (cfg.eyes === 1) {
      // mata gembira ^ ^
      g.add(new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.028, 8, 16, Math.PI), eyeMat))
    } else {
      const big = cfg.eyes === 2
      const e = new THREE.Mesh(new THREE.SphereGeometry(big ? 0.15 : 0.11, 16, 12), eyeMat)
      e.scale.set(1, 1.35, 0.4)
      g.add(e)
      const h1 = new THREE.Mesh(new THREE.SphereGeometry(big ? 0.055 : 0.04, 8, 8), white)
      h1.position.set(big ? 0.05 : 0.04, big ? 0.08 : 0.06, big ? 0.07 : 0.05)
      g.add(h1)
      if (big) {
        const h2 = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), white)
        h2.position.set(-0.05, -0.07, 0.07)
        g.add(h2)
      }
      eyes.push(g)
    }
    head.add(g)
  }

  // mulut (senyum)
  const mouth = new THREE.Group()
  placeOnHead(mouth, 0, -0.27, 1.002)
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.02, 8, 16, Math.PI), eyeMat)
  smile.rotation.z = Math.PI
  mouth.add(smile)
  head.add(mouth)

  // pipi merah
  const blushMat = new THREE.MeshBasicMaterial({ color: 0xff7aa2, transparent: true, opacity: 0.55 })
  for (const s of [-1, 1]) {
    const b = new THREE.Mesh(new THREE.CircleGeometry(0.1, 16), blushMat)
    placeOnHead(b, s * 0.45, -0.18, 1.004)
    b.scale.set(1, 0.7, 1)
    head.add(b)
  }

  /* ----- rambut (disembunyikan kalau pakai topi/beanie) ----- */
  const hat = cfg.hat
  if (hat !== 1 && hat !== 2) {
    if (cfg.hairStyle === 0) {
      const tuft = part(new THREE.ConeGeometry(0.1, 0.32, 10), hairC, { outline: 1.15 })
      tuft.position.set(0, HY + R + 0.08, 0)
      head.add(tuft)
    } else {
      const capGeo = new THREE.SphereGeometry(R + 0.04, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.5)
      const cap = part(capGeo, hairC, { outline: 1.04, material: toon(hairC, { side: THREE.DoubleSide }) })
      cap.position.y = HY
      cap.rotation.x = cfg.hairStyle === 1 ? -0.12 : -0.25
      head.add(cap)

      if (cfg.hairStyle === 2) {
        for (const s of [-1, 1]) {
          const bun = part(new THREE.SphereGeometry(0.22, 16, 12), hairC)
          bun.position.set(s * 0.5, HY + 0.62, -0.05)
          head.add(bun)
        }
      }
      if (cfg.hairStyle === 3) {
        const dirs = [[0, 1, 0.05], [0.55, 0.85, 0.1], [-0.55, 0.85, 0.1], [0.45, 0.78, -0.4], [-0.45, 0.78, -0.4]]
        for (const d of dirs) {
          const v = new THREE.Vector3(...d).normalize()
          const cone = part(new THREE.ConeGeometry(0.17, 0.42, 10), hairC, { outline: 1.12 })
          cone.position.set(v.x * (R + 0.1), HY + v.y * (R + 0.1), v.z * (R + 0.1))
          cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v)
          head.add(cone)
        }
      }
    }
  }

  /* ----- topi / aksesori ----- */
  if (hat === 1) {
    // topi baseball
    const dome = part(new THREE.SphereGeometry(R + 0.06, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.4), outfit, {
      outline: 1.04,
      material: toon(outfit, { side: THREE.DoubleSide }),
    })
    dome.position.y = HY
    dome.rotation.x = -0.18
    head.add(dome)
    const brim = part(new THREE.CylinderGeometry(0.42, 0.42, 0.06, 24), outfit, { outline: 1.1 })
    brim.scale.set(1, 1, 0.85)
    brim.position.set(0, HY + 0.34, 0.7)
    brim.rotation.x = 0.28
    head.add(brim)
  }
  if (hat === 2) {
    // beanie + pompom
    const dome = part(new THREE.SphereGeometry(R + 0.07, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.42), outfit, {
      outline: 1.04,
      material: toon(outfit, { side: THREE.DoubleSide }),
    })
    dome.position.y = HY
    dome.rotation.x = -0.1
    head.add(dome)
    const cuff = part(new THREE.TorusGeometry(0.74, 0.09, 12, 32), '#ffffff', { outline: 1.08 })
    cuff.rotation.x = Math.PI / 2
    cuff.position.y = HY + 0.2
    head.add(cuff)
    const pom = part(new THREE.SphereGeometry(0.15, 14, 10), '#ffffff')
    pom.position.y = HY + R + 0.1
    head.add(pom)
  }
  if (hat === 3) {
    // mahkota
    const gold = '#ffd43b'
    const band = part(new THREE.CylinderGeometry(0.4, 0.34, 0.22, 14, 1, true), gold, {
      outline: 1.06,
      material: toon(gold, { side: THREE.DoubleSide }),
    })
    band.position.y = HY + 0.68
    head.add(band)
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2
      const spike = part(new THREE.ConeGeometry(0.08, 0.2, 8), gold, { outline: 1.12 })
      spike.position.set(Math.cos(a) * 0.38, HY + 0.88, Math.sin(a) * 0.38)
      head.add(spike)
    }
  }
  if (hat === 4) {
    // telinga arnab
    for (const s of [-1, 1]) {
      const ear = part(new THREE.CapsuleGeometry(0.11, 0.45, 6, 12), '#ffffff')
      ear.position.set(s * 0.3, HY + R + 0.3, 0)
      ear.rotation.z = -s * 0.22
      head.add(ear)
      const inner = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.33, 4, 8), new THREE.MeshBasicMaterial({ color: 0xffb3c7 }))
      inner.position.z = 0.06
      ear.add(inner)
    }
  }

  root.userData = { head, bodyG, eyes, neck: NECK }
  return root
}

// Bersihkan geometry dan material (kecuali yang dikongsi)
export function disposeAvatar(obj) {
  obj.traverse((o) => {
    if (o.geometry) o.geometry.dispose()
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : []
    mats.forEach((m) => {
      if (m !== outlineMat) m.dispose()
    })
  })
}

/* ----- snapshot gambar (untuk lobby/leaderboard, elak banyak WebGL canvas) ----- */
let snapRenderer
const cache = new Map()

export function avatarDataURL(cfg, size = 160) {
  const clean = sanitizeAvatar(cfg)
  const key = JSON.stringify(clean) + size
  if (cache.has(key)) return cache.get(key)
  try {
    if (!snapRenderer) {
      snapRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true })
      snapRenderer.setPixelRatio(1)
      snapRenderer.setClearColor(0x000000, 0)
    }
    snapRenderer.setSize(size, size, false)
    const scene = new THREE.Scene()
    scene.add(new THREE.AmbientLight(0xffffff, 1.1))
    const light = new THREE.DirectionalLight(0xffffff, 2.2)
    light.position.set(3, 5, 4)
    scene.add(light)
    const av = buildAvatar(clean)
    scene.add(av)
    const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50)
    cam.position.set(0, 1.35, 6.0) // lebih dekat dari kamera live supaya avatar penuh dalam bulatan kecil; pandang lurus ke -z
    snapRenderer.render(scene, cam)
    const url = snapRenderer.domElement.toDataURL('image/png')
    disposeAvatar(av)
    cache.set(key, url)
    return url
  } catch {
    return null
  }
}
