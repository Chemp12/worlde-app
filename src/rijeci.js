// Zajednička logika oko riječi — dijele je glavna igra (App.jsx) i izazovi.
// Svaki jezik ima svoj popis čestih riječi (4–8 slova), služi za rješenja i za dozvoljene pokušaje.
import en from './rijeci-en.txt?raw'
import es from './rijeci-es.txt?raw'
import fr from './rijeci-fr.txt?raw'
import de from './rijeci-de.txt?raw'
import it from './rijeci-it.txt?raw'
import hr from './rijeci-hr.txt?raw'

export const BROJ_STUPACA = 5 // zadana duljina (izazovi zasad koriste 5)

function parsiraj(txt) {
  return txt.split(/\r?\n/).map((r) => r.trim().toUpperCase()).filter(Boolean)
}

// Popisi po jeziku.
const POPISI = {
  en: parsiraj(en),
  es: parsiraj(es),
  fr: parsiraj(fr),
  de: parsiraj(de),
  it: parsiraj(it),
  hr: parsiraj(hr),
}

export const ZADANI_JEZIK = 'en'

// Ponuđeni jezici riječi (za izbornike). Kod se prikazuje kao tekst
// (zastavice-emoji se na Windowsu ne prikazuju kao zastave).
export const JEZICI = [
  { id: 'en', ime: 'English', kod: 'EN' },
  { id: 'es', ime: 'Español', kod: 'ES' },
  { id: 'fr', ime: 'Français', kod: 'FR' },
  { id: 'de', ime: 'Deutsch', kod: 'DE' },
  { id: 'it', ime: 'Italiano', kod: 'IT' },
  { id: 'hr', ime: 'Hrvatski', kod: 'HR' },
]

// Popis riječi zadane duljine za zadani jezik (računa se jednom pa se pamti).
const cachePool = {}
export function poolRijeci(jezik, duljina) {
  const kljuc = jezik + ':' + duljina
  if (!cachePool[kljuc]) {
    const popis = POPISI[jezik] || POPISI[ZADANI_JEZIK]
    cachePool[kljuc] = popis.filter((w) => w.length === duljina)
  }
  return cachePool[kljuc]
}

// Brza provjera je li utipkana riječ dozvoljena (za taj jezik i tu duljinu).
const cacheSet = {}
export function jeDozvoljena(jezik, rijec) {
  const kljuc = jezik + ':' + rijec.length
  if (!cacheSet[kljuc]) cacheSet[kljuc] = new Set(poolRijeci(jezik, rijec.length))
  return cacheSet[kljuc].has(rijec)
}

// Ocijeni pokušaj u odnosu na tajnu riječ: 'tocno' / 'skoro' / 'krivo' za svako slovo.
// Radi za bilo koju duljinu (koristi duljinu tajne riječi).
export function ocijeniRijec(pokusaj, tajna) {
  const n = tajna.length
  const rezultat = Array(n).fill('krivo')
  const slovaTajne = tajna.split('')

  for (let i = 0; i < n; i++) {
    if (pokusaj[i] === slovaTajne[i]) {
      rezultat[i] = 'tocno'
      slovaTajne[i] = null
    }
  }
  for (let i = 0; i < n; i++) {
    if (rezultat[i] === 'tocno') continue
    const gdje = slovaTajne.indexOf(pokusaj[i])
    if (gdje !== -1) {
      rezultat[i] = 'skoro'
      slovaTajne[gdje] = null
    }
  }
  return rezultat
}

// 'koliko' RAZLIČITIH nasumičnih riječi zadanog jezika i duljine (za unlimited / izazove).
export function slucajneRijeci(koliko, jezik = ZADANI_JEZIK, duljina = BROJ_STUPACA) {
  const pool = poolRijeci(jezik, duljina)
  const rijeci = []
  const koristeni = new Set()
  while (rijeci.length < koliko && koristeni.size < pool.length) {
    const index = Math.floor(Math.random() * pool.length)
    if (!koristeni.has(index)) {
      koristeni.add(index)
      rijeci.push(pool[index])
    }
  }
  return rijeci
}
