# Sifir Rush

Game kuiz sifir gaya Kahoot. Cikgu jadi host, murid masuk guna PIN 6 digit dan pilih karakter chibi 3D sendiri. Tiada backend, tiada database.

## Cara ia berfungsi

- **Multiplayer:** WebRTC peer-to-peer melalui PeerJS. Browser host jadi "server", semua state game (soalan, skor, leaderboard) hidup dalam memory host.
- **Skor dikira di host.** Pemain cuma hantar index pilihan. Jawapan betul tak pernah dihantar ke pemain, jadi tak boleh cheat dari DevTools.
- **localStorage:** nama dan karakter pemain, setting host, snapshot untuk resume.
- **Avatar:** dibina dalam code (Three.js), config cuma enam nombor kecil. Lobby dan leaderboard guna gambar snapshot, 3D live hanya untuk avatar sendiri dan podium.
- **Resume:** kalau cikgu terrefresh, snapshot disimpan setiap kali papar leaderboard. Buka halaman host semula dan tekan Sambung, PIN sama dipakai. Pemain auto-reconnect dan skor kekal.

## Jalankan

```bash
npm install
npm run dev      # buka dari telefon guna IP LAN yang Vite paparkan
npm test         # test logik scoring/flow (tanpa rangkaian)
npm run build
```

Test multiplayer sendiri: buka satu tab sebagai host, beberapa tab lain sebagai pemain (key pemain disimpan per-tab). Perlu internet sebab handshake guna server signaling percuma PeerJS.

## Deploy ke GitHub Pages

1. Push ke repo GitHub, branch `main`.
2. Settings, Pages, Source: **GitHub Actions**.
3. Setiap push akan test, build dan deploy. Link: `https://<nama>.github.io/<repo>/`.

`vite.config.js` guna `base: './'`, jadi nama repo tak perlu ditetapkan.

## Had yang kena tahu

- Host mesti kekal online dan tab terbuka. Tab di background pada telefon boleh dibekukan browser, guna laptop untuk host.
- Network sekolah yang block WebRTC akan halang sebahagian pemain. Tanpa TURN server, sambungan melalui NAT yang ketat gagal. **Test di network sekolah sebenar sebelum guna di kelas.**
- Bergantung pada server signaling percuma PeerJS (`0.peerjs.com`). Kalau down, tiada sesiapa boleh masuk. Boleh self-host `peerjs-server` kemudian dan tetapkan host/port di `new Peer(...)`.
- Had praktikal sekitar 30-40 pemain.
- Pemain tak boleh join selepas game mula (reconnect pemain yang sedia ada dibenarkan).

## Struktur

```
src/game/questions.js     generator soalan sifir + pilihan salah yang hampir
src/game/hostGame.js      enjin game di sisi host (fasa, skor, snapshot)
src/game/playerClient.js  sambungan pemain + auto-reconnect
src/game/usePlayer.js     hook React untuk state pemain
src/avatar/               chibi 3D: config, buildAvatar (three), komponen, creator
src/screens/              HostScreen, PlayerScreen
scripts/test-host.mjs     test logik
```

## Idea seterusnya

QR code untuk link join, bunyi dan muzik, bonus streak, lebih banyak topik (tambah, tolak, bahagi), lebih banyak topi dan aksesori, TURN server.
