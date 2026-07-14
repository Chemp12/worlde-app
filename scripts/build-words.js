// Obrada sirovog popisa riječi u čistu datoteku za igru.
// Korištenje: node scripts/build-words.js <jezik> <sirova-datoteka> [filter-rjecnik]
// Radi: poravna naglaske (é->e, š->s, đ->d...), zadrži samo a-z riječi 4-8 slova,
// (po želji) zadrži samo riječi koje su i u filter-rječniku (izbacuje vlastita imena),
// izbaci duplikate, sortira (stabilan redoslijed za determinirane dnevne riječi),
// i spremi u src/rijeci-<jezik>.txt (VELIKIM slovima).
import fs from 'fs'

const [, , jezik, sirova, filter] = process.argv
if (!jezik || !sirova) {
  console.error('Korištenje: node scripts/build-words.js <jezik> <sirova-datoteka> [filter-rjecnik]')
  process.exit(1)
}

// Poravnaj naglaske na osnovno latinično slovo.
function poravnaj(s) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // makni kombinirajuće naglaske (é->e, š->s...)
    .replace(/đ/g, 'd')
    .replace(/ð/g, 'd')
    .replace(/ß/g, 'ss')
    .replace(/ø/g, 'o')
    .replace(/æ/g, 'ae')
    .replace(/œ/g, 'oe')
}

// Uzmi samo prvu "riječ" iz retka: podržava "riječ", "riječ broj" (frekvencija),
// i "riječ/FLAGS" (hunspell rječnik).
function prvaRijec(redak) {
  return poravnaj(redak.trim().split(/\s+/)[0].split('/')[0].toLowerCase())
}

// Filter-rječnik (npr. ENABLE) — zadržavamo samo riječi koje postoje u njemu.
let dozvoljene = null
if (filter) {
  dozvoljene = new Set(
    fs.readFileSync(filter, 'utf8').split(/\r?\n/).map(prvaRijec)
  )
}

const rijeci = fs
  .readFileSync(sirova, 'utf8')
  .split(/\r?\n/)
  .map(prvaRijec)
  .filter((w) => /^[a-z]+$/.test(w) && w.length >= 4 && w.length <= 8)
  .filter((w) => !dozvoljene || dozvoljene.has(w))

const jedinstvene = [...new Set(rijeci)].sort()
const izlaz = jedinstvene.map((w) => w.toUpperCase()).join('\n')
fs.writeFileSync(`src/rijeci-${jezik}.txt`, izlaz)

// Statistika po duljini
const po = {}
for (const w of jedinstvene) po[w.length] = (po[w.length] || 0) + 1
console.log(`${jezik}: ${jedinstvene.length} riječi`, JSON.stringify(po))
