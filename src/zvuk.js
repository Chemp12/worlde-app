// Zvučni efekti (sintetizirani, bez datoteka) + vibracija. Ima prekidač u Postavkama.
const KLJUC = 'wordle-zvuk'
let ctx = null

export function zvukUkljucen() {
  return localStorage.getItem(KLJUC) !== '0' // zadano: uključen
}
export function postaviZvuk(ukljucen) {
  localStorage.setItem(KLJUC, ukljucen ? '1' : '0')
}

// AudioContext se stvara tek na prvu interakciju (preglednici blokiraju autoplay).
function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

// Odsviraj kratak ton.
function ton(freq, trajanje, tip = 'sine', glasnoca = 0.12, kada = 0) {
  const c = audio()
  if (!c) return
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = tip
  osc.frequency.value = freq
  osc.connect(gain)
  gain.connect(c.destination)
  const t = c.currentTime + kada
  gain.gain.setValueAtTime(glasnoca, t)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + trajanje)
  osc.start(t)
  osc.stop(t + trajanje)
}

export function vibriraj(uzorak) {
  if (navigator.vibrate) navigator.vibrate(uzorak)
}

export function zvukTipka() {
  if (!zvukUkljucen()) return
  ton(320, 0.04, 'sine', 0.05)
  vibriraj(8)
}
export function zvukGreska() {
  if (!zvukUkljucen()) return
  ton(150, 0.18, 'square', 0.07)
  vibriraj(60)
}
export function zvukPobjeda() {
  if (!zvukUkljucen()) return
  ;[523, 659, 784, 1047].forEach((f, i) => ton(f, 0.16, 'sine', 0.09, i * 0.11)) // uzlazna melodija
  vibriraj([30, 40, 30])
}
export function zvukPoraz() {
  if (!zvukUkljucen()) return
  ton(200, 0.4, 'sine', 0.09)
  ton(150, 0.5, 'sine', 0.09, 0.16)
  vibriraj(120)
}
