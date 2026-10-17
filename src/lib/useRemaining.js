import { useEffect, useState } from 'react'

// Baki masa (ms) sehingga endAt. Dikira dari jam peranti sendiri supaya tak terjejas jam peranti lain.
export function useRemaining(endAt, active = true) {
  const [ms, setMs] = useState(Math.max(0, endAt - Date.now()))
  useEffect(() => {
    if (!active) return
    const tick = () => setMs(Math.max(0, endAt - Date.now()))
    tick()
    const id = setInterval(tick, 150)
    return () => clearInterval(id)
  }, [endAt, active])
  return ms
}
