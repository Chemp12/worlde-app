// Gotove teme za cijelu stranicu.
// Svaka tema: osnova (tamna/svijetla neutralna paleta iz index.css),
// boja naglaska, i (po želji) tonirane pozadine.
export const TEME = [
  { id: 'tamna', ime: 'Klasična tamna', osnova: 'tamna', accent: '#538d4e', vars: {} },
  { id: 'svijetla', ime: 'Klasična svijetla', osnova: 'svijetla', accent: '#538d4e', vars: {} },
  {
    id: 'ocean',
    ime: 'Ocean',
    osnova: 'tamna',
    accent: '#3b9ae1',
    vars: { '--bg': '#0e1620', '--surface': '#152232', '--surface2': '#1e2f43', '--surface3': '#284057', '--border': '#2b3f56' },
  },
  {
    id: 'suma',
    ime: 'Šuma',
    osnova: 'tamna',
    accent: '#4c9a5b',
    vars: { '--bg': '#0f150f', '--surface': '#17211a', '--surface2': '#1f2d23', '--surface3': '#2a3d30', '--border': '#2c3d31' },
  },
  {
    id: 'zalazak',
    ime: 'Zalazak',
    osnova: 'tamna',
    accent: '#e0683b',
    vars: { '--bg': '#1a1113', '--surface': '#26191c', '--surface2': '#332226', '--surface3': '#432d33', '--border': '#3f2a2f' },
  },
  {
    id: 'ljubicasta',
    ime: 'Ljubičasta noć',
    osnova: 'tamna',
    accent: '#8b5cf6',
    vars: { '--bg': '#12101c', '--surface': '#1c1830', '--surface2': '#26203f', '--surface3': '#332a52', '--border': '#2f2748' },
  },
  {
    id: 'sepija',
    ime: 'Sepija',
    osnova: 'svijetla',
    accent: '#b5651d',
    vars: { '--bg': '#f4ecd8', '--surface': '#efe6cf', '--surface2': '#e6dabb', '--surface3': '#dccca6', '--border': '#d3c39c' },
  },
  {
    id: 'tresnja',
    ime: 'Trešnja',
    osnova: 'tamna',
    accent: '#e0567a',
    vars: { '--bg': '#1a1015', '--surface': '#26181f', '--surface2': '#33212a', '--surface3': '#432c38', '--border': '#3f2933' },
  },
  {
    id: 'menta',
    ime: 'Menta',
    osnova: 'svijetla',
    accent: '#0f9e8e',
    vars: { '--bg': '#eef7f4', '--surface': '#e4f1ec', '--surface2': '#d6e9e2', '--surface3': '#c4ded4', '--border': '#bcdbd0' },
  },
]

const KLJUC_TEME = 'wordle-tema-id'
const KLJUC_BOJE = 'wordle-boja'
// Varijable koje tema smije "prepisati" (očistimo ih pri svakoj promjeni teme)
const OVERRIDE = ['--bg', '--surface', '--surface2', '--surface3', '--border', '--accent']

export function ucitajTemuId() {
  return localStorage.getItem(KLJUC_TEME) || 'tamna'
}

// Primijeni cijelu temu na <html>.
export function primijeniTemu(id) {
  const t = TEME.find((x) => x.id === id) || TEME[0]
  const root = document.documentElement

  // Neutralna osnova (tamna/svijetla) -> paleta iz index.css
  root.setAttribute('data-theme', t.osnova === 'svijetla' ? 'light' : 'dark')

  // Očisti prethodne inline override-e, pa postavi ove teme
  for (const v of OVERRIDE) root.style.removeProperty(v)
  root.style.setProperty('--accent', t.accent)
  for (const [kljuc, vrijednost] of Object.entries(t.vars)) {
    root.style.setProperty(kljuc, vrijednost)
  }
}

export function postaviTemu(id) {
  localStorage.setItem(KLJUC_TEME, id)
  localStorage.removeItem(KLJUC_BOJE) // nova tema -> resetiraj vlastitu boju naglaska
  primijeniTemu(id)
}

// --- Vlastita boja naglaska (override preko teme) ---
export function ucitajBoju() {
  return localStorage.getItem(KLJUC_BOJE) // null ako korisnik nije birao vlastitu
}
export function primijeniBoju(boja) {
  document.documentElement.style.setProperty('--accent', boja)
}
export function postaviBoju(boja) {
  localStorage.setItem(KLJUC_BOJE, boja)
  primijeniBoju(boja)
}
