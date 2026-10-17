// Secara lalai guna server signaling awam PeerJS. Untuk self-host (atau test tempatan),
// set VITE_PEER_HOST (dan pilihan VITE_PEER_PORT, VITE_PEER_PATH, VITE_PEER_SECURE) semasa build.
export function peerOptions() {
  const env = import.meta.env
  const host = env && env.VITE_PEER_HOST
  if (!host) return undefined
  return {
    host,
    port: Number(env.VITE_PEER_PORT || 9000),
    path: env.VITE_PEER_PATH || '/',
    secure: env.VITE_PEER_SECURE === 'true',
  }
}
