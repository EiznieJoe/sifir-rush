import { useState } from 'react'
import HostScreen from './screens/HostScreen.jsx'
import PlayerScreen from './screens/PlayerScreen.jsx'

// Link kongsi: ?pin=123456 terus ke skrin pemain dengan PIN siap isi
const urlPin = (new URLSearchParams(location.search).get('pin') || '').replace(/\D/g, '').slice(0, 6)

export default function App() {
  const [screen, setScreen] = useState(urlPin ? 'play' : 'home')

  if (screen === 'host') return <HostScreen onExit={() => setScreen('home')} />
  if (screen === 'play') return <PlayerScreen initialPin={urlPin} onExit={() => setScreen('home')} />

  return (
    <div className="page center home">
      <h1>Sifir Rush</h1>
      <p className="tagline">Kuiz sifir berpasukan. Cikgu jadi host, murid masuk guna PIN.</p>
      <div className="stack">
        <button className="btn big" onClick={() => setScreen('play')}>Masuk game</button>
        <button className="btn big secondary" onClick={() => setScreen('host')}>Jadi host (cikgu)</button>
      </div>
      <p className="fine">Tiada akaun, tiada database. Semua murid dan host kena online.</p>
      <p className="fine">versi {__BUILD__}</p>
    </div>
  )
}
