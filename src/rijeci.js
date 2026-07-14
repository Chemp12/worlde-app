// Zajednička logika oko riječi — dijele je i glavna igra (App.jsx) i izazovi.
import dozvoljeneTekst from './dozvoljene-rijeci.txt?raw' // ~15k riječi koje smiješ utipkati
import tajneTekst from './tajne-rijeci.txt?raw'           // ~2,3k riječi koje mogu biti rješenje

export const BROJ_STUPACA = 5 // duljina riječi

export const DOZVOLJENE_RIJECI = new Set(
  dozvoljeneTekst.split('\n').map((r) => r.trim().toUpperCase())
)

export const TAJNE_RIJECI = tajneTekst
  .split('\n')
  .map((r) => r.trim().toUpperCase())
  .filter((r) => r.length === BROJ_STUPACA)

// Ocijeni pokušaj u odnosu na tajnu riječ: 'tocno' / 'skoro' / 'krivo' za svako slovo.
// Dvije faze: prvo točna mjesta, pa "žuta" (da se duple slova ispravno broje).
export function ocijeniRijec(pokusaj, tajna) {
  const rezultat = Array(BROJ_STUPACA).fill('krivo')
  const slovaTajne = tajna.split('')

  for (let i = 0; i < BROJ_STUPACA; i++) {
    if (pokusaj[i] === slovaTajne[i]) {
      rezultat[i] = 'tocno'
      slovaTajne[i] = null
    }
  }
  for (let i = 0; i < BROJ_STUPACA; i++) {
    if (rezultat[i] === 'tocno') continue
    const gdje = slovaTajne.indexOf(pokusaj[i])
    if (gdje !== -1) {
      rezultat[i] = 'skoro'
      slovaTajne[gdje] = null
    }
  }
  return rezultat
}

// Odaberi 'koliko' RAZLIČITIH nasumičnih riječi (za izazove).
export function slucajneRijeci(koliko) {
  const rijeci = []
  const koristeni = new Set()
  while (rijeci.length < koliko && koristeni.size < TAJNE_RIJECI.length) {
    const index = Math.floor(Math.random() * TAJNE_RIJECI.length)
    if (!koristeni.has(index)) {
      koristeni.add(index)
      rijeci.push(TAJNE_RIJECI[index])
    }
  }
  return rijeci
}
