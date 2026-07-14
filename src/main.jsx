import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ucitajTemuId, primijeniTemu, ucitajBoju, primijeniBoju } from './tema'
import { JezikProvider, ucitajJezik } from './i18n'

// Primijeni spremljenu temu (i vlastitu boju ako postoji) prije prvog crtanja
primijeniTemu(ucitajTemuId())
const spremljenaBoja = ucitajBoju()
if (spremljenaBoja) primijeniBoju(spremljenaBoja)

// Postavi jezik <html lang> (zadano engleski)
document.documentElement.lang = ucitajJezik()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <JezikProvider>
      <App />
    </JezikProvider>
  </StrictMode>,
)
