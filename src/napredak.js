// XP, razine i postignuća — sve se RAČUNA iz postojeće statistike (bez nove baze).
import { VARIJANTE } from './varijante'
import { NACINI } from './moduli'

// Teže varijante nose više XP-a po pobjedi.
const TEZINA = { klasik: 1, dvojac: 1.5, cetvorka: 2, osmorka: 3 }

// Sažmi ugniježđenu statistiku u nekoliko brojeva.
export function agregat(podaci) {
  let pobjede = 0
  let odigrano = 0
  let niz = 0
  let uDva = 0 // pobjede u ≤2 pokušaja
  const varijante = new Set()

  for (const v of VARIJANTE) {
    for (const m of NACINI) {
      const s = podaci?.[v.id]?.[m.id]
      if (!s) continue
      pobjede += s.pobjede || 0
      odigrano += s.odigrano || 0
      niz = Math.max(niz, s.najboljiNiz || 0)
      uDva += (s.raspodjela?.[0] || 0) + (s.raspodjela?.[1] || 0)
      if ((s.odigrano || 0) > 0) varijante.add(v.id)
    }
  }
  return { pobjede, odigrano, niz, uDva, varijante: varijante.size }
}

// XP: pobjeda = 15 × težina varijante, poraz (sudjelovanje) = 3.
export function izracunajXp(podaci) {
  let xp = 0
  for (const v of VARIJANTE) {
    for (const m of NACINI) {
      const s = podaci?.[v.id]?.[m.id]
      if (!s) continue
      const w = TEZINA[v.id] || 1
      xp += (s.pobjede || 0) * 15 * w + Math.max(0, (s.odigrano || 0) - (s.pobjede || 0)) * 3
    }
  }
  return Math.round(xp)
}

// Razina iz XP-a. Za razinu L treba ukupno 50·L·(L-1) XP (svaka sljedeća skuplja).
export function razinaZaXp(xp) {
  let razina = 1
  while (50 * (razina + 1) * razina <= xp) razina++
  const pocetak = 50 * razina * (razina - 1)
  const sljedeca = 50 * (razina + 1) * razina
  return {
    razina,
    uRazini: xp - pocetak,
    zaSljedecu: sljedeca - pocetak, // koliko XP-a ima taj "level bar"
    ukupnoXp: xp,
  }
}

// Popis postignuća. `uvjet` gleda agregat. Ime dolazi iz prijevoda (post_<id>).
export const POSTIGNUCA = [
  { id: 'prva_pobjeda', ikona: '🎉', uvjet: (a) => a.pobjede >= 1 },
  { id: 'deset_pobjeda', ikona: '🔟', uvjet: (a) => a.pobjede >= 10 },
  { id: 'pedeset_pobjeda', ikona: '🏆', uvjet: (a) => a.pobjede >= 50 },
  { id: 'niz_pet', ikona: '🔥', uvjet: (a) => a.niz >= 5 },
  { id: 'niz_deset', ikona: '⚡', uvjet: (a) => a.niz >= 10 },
  { id: 'brzi', ikona: '🎯', uvjet: (a) => a.uDva >= 1 },
  { id: 'sve_varijante', ikona: '🌀', uvjet: (a) => a.varijante >= 4 },
  { id: 'stotka', ikona: '💯', uvjet: (a) => a.odigrano >= 100 },
]
