import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'

// Sengaja tiada StrictMode: effect dua kali akan cipta dua sambungan PeerJS semasa dev.
createRoot(document.getElementById('root')).render(<App />)
