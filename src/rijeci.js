// Zajednička logika oko riječi. Popisi se učitavaju LIJENO (po potrebi) da glavni
// paket bude manji i prvo učitavanje brže. Engleski (fallback) + trenutni jezik
// učitaju se na startu; ostali kad prvi put zatrebaju.

// Vite: mapa "./rijeci-<jezik>.txt" -> funkcija koja lijeno učita tekst.
const UCITAVACI = import.meta.glob('./rijeci-*.txt', { query: '?raw', import: 'default' })

export const BROJ_STUPACA = 5 // zadana duljina (izazovi zasad koriste 5)
export const ZADANI_JEZIK = 'en'

// Ponuđeni jezici riječi (za izbornike). Kod se prikazuje kao tekst (Windows ne crta zastavice).
export const JEZICI = [
  { id: 'en', ime: 'English', kod: 'EN' },
  { id: 'es', ime: 'Español', kod: 'ES' },
  { id: 'fr', ime: 'Français', kod: 'FR' },
  { id: 'de', ime: 'Deutsch', kod: 'DE' },
  { id: 'it', ime: 'Italiano', kod: 'IT' },
  { id: 'hr', ime: 'Hrvatski', kod: 'HR' },
]

function parsiraj(txt) {
  return txt.split(/\r?\n/).map((r) => r.trim().toUpperCase()).filter(Boolean)
}

// Učitani popisi po jeziku (popunjava ih osiguraj()).
const POPISI = {}

// Osiguraj da je popis riječi za jezik učitan (asinkrono; pamti se).
export async function osiguraj(jezik) {
  if (POPISI[jezik]) return
  const ucitaj = UCITAVACI[`./rijeci-${jezik}.txt`]
  if (!ucitaj) return
  POPISI[jezik] = parsiraj(await ucitaj())
}

// Koji je jezik riječi spremljen (za startno učitavanje).
export function ucitajJezikRijeci() {
  return localStorage.getItem('wordle-jezik-rijeci') || ZADANI_JEZIK
}

// Popis riječi zadane duljine za zadani jezik (fallback na engleski ako još nije učitan).
const cachePool = {}
export function poolRijeci(jezik, duljina) {
  const izvor = POPISI[jezik] ? jezik : ZADANI_JEZIK
  const kljuc = izvor + ':' + duljina
  if (!cachePool[kljuc]) {
    const popis = POPISI[izvor] || []
    cachePool[kljuc] = popis.filter((w) => w.length === duljina)
  }
  return cachePool[kljuc]
}

// Brza provjera je li utipkana riječ dozvoljena (za taj jezik i tu duljinu).
const cacheSet = {}
export function jeDozvoljena(jezik, rijec) {
  const izvor = POPISI[jezik] ? jezik : ZADANI_JEZIK
  const kljuc = izvor + ':' + rijec.length
  if (!cacheSet[kljuc]) cacheSet[kljuc] = new Set(poolRijeci(izvor, rijec.length))
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
