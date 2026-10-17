import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { buildAvatar, disposeAvatar, avatarDataURL } from './buildAvatar.js'

// Model 3D yang bergerak: bernafas, kelip mata, lompat bila gembira, tunduk bila sedih
function AvatarModel({ config, mood = 'idle', sway = false }) {
  const key = JSON.stringify(config)
  const obj = useMemo(() => buildAvatar(config), [key]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => disposeAvatar(obj), [obj])
  const offset = useRef(Math.random() * 10)

  useFrame(({ clock }) => {
    const t = clock.elapsedTime + offset.current
    const { head, bodyG, eyes, neck } = obj.userData
    const breathe = Math.sin(t * 2) * 0.02
    bodyG.scale.y = 1 + breathe
    head.position.y = neck + breathe * 1.5

    const blink = t % 3.2 < 0.12 ? 0.1 : 1
    eyes.forEach((e) => (e.scale.y = blink))

    if (mood === 'happy') {
      obj.position.y = Math.abs(Math.sin(clock.elapsedTime * 6)) * 0.35
      head.rotation.z = Math.sin(t * 6) * 0.08
    } else if (mood === 'sad') {
      obj.position.y = 0
      head.rotation.z = 0.12
      head.position.y = neck - 0.04
    } else {
      obj.position.y = 0
      head.rotation.z = Math.sin(t * 1.3) * 0.05
    }
    obj.rotation.y = sway ? Math.sin(t * 0.8) * 0.4 : 0
  })

  return <primitive object={obj} />
}

// Canvas 3D live. Guna untuk avatar sendiri dan podium sahaja (jimat GPU).
export function Avatar3D({ config, mood, sway, className = '', style }) {
  return (
    <div className={`avatar3d ${className}`} style={style}>
      {/* rotation diberi sengaja: tanpa itu R3F auto lookAt(0,0,0) dan kepala terpotong di atas */}
      <Canvas flat dpr={[1, 2]} camera={{ position: [0, 1.1, 5.6], rotation: [0, 0, 0], fov: 30 }}>
        <ambientLight intensity={1.1} />
        <directionalLight position={[3, 5, 4]} intensity={2.2} />
        <AvatarModel config={config} mood={mood} sway={sway} />
      </Canvas>
    </div>
  )
}

// Gambar statik dari snapshot 3D. Untuk senarai lobby dan leaderboard.
export function AvatarImg({ config, size = 72 }) {
  const key = JSON.stringify(config)
  const url = useMemo(() => avatarDataURL(config, 160), [key]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!url) return <div className="avatar-fallback" style={{ width: size, height: size }}>:)</div>
  return <img className="avatar-img" src={url} width={size} height={size} alt="" draggable={false} />
}
