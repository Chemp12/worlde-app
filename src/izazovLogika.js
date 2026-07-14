// Zajednička logika izazova — dijele je Izazovi.jsx (popis) i IgraIzazov.jsx (igranje).

// Koliko dodatnog vremena (sekundi) dobiva protivnik u ONLINE izazovu "manje pokušaja"
// nakon što je prvi igrač završio: 1 min za 5 riječi, +30 s za svaku dodatnu riječ.
export function graceSekunde(brojRijeci) {
  return 60 + Math.max(0, brojRijeci - 5) * 30
}

// Trenutak (ms) do kojeg protivnik smije završiti; null ako nitko još nije prvi završio.
export function graceRokMs(iz) {
  if (!iz.prvi_gotov_u) return null
  return new Date(iz.prvi_gotov_u).getTime() + graceSekunde(iz.rijeci.length) * 1000
}

// Je li dodatno vrijeme isteklo?
export function graceIstekao(iz) {
  const rok = graceRokMs(iz)
  return rok !== null && Date.now() > rok
}

// Pogled na izazov iz perspektive danog igrača (moja polja vs protivnikova).
export function perspektiva(iz, mojId) {
  const jaIzazivac = iz.izazivac === mojId
  return {
    jaIzazivac,
    protivnikId: jaIzazivac ? iz.protivnik : iz.izazivac,
    mojGotov: jaIzazivac ? iz.izazivac_gotov : iz.protivnik_gotov,
    protivnikGotov: jaIzazivac ? iz.protivnik_gotov : iz.izazivac_gotov,
    mojiPokusaji: jaIzazivac ? iz.izazivac_pokusaji : iz.protivnik_pokusaji,
    mojeVrijeme: jaIzazivac ? iz.izazivac_vrijeme : iz.protivnik_vrijeme,
    protivnikPokusaji: jaIzazivac ? iz.protivnik_pokusaji : iz.izazivac_pokusaji,
    protivnikVrijeme: jaIzazivac ? iz.protivnik_vrijeme : iz.izazivac_vrijeme,
  }
}

// Je li izazov odlučen (znamo li pobjednika)?
export function jeOdlucen(iz, mojId) {
  const p = perspektiva(iz, mojId)
  if (iz.tip === 'online') {
    if (iz.kriterij === 'vrijeme') return !!iz.prvi_gotov // prvi koji završi je pobjednik
    // "manje pokušaja": odlučeno kad su oba gotova ILI kad istekne dodatno vrijeme
    if (p.mojGotov && p.protivnikGotov) return true
    if (iz.prvi_gotov && graceIstekao(iz)) return true
    return false
  }
  // offline: kad su oba završila
  return p.mojGotov && p.protivnikGotov
}

// Rezultat iz perspektive igrača: 'win' | 'lose' | 'draw' | null (još nije odlučeno).
export function rezultat(iz, mojId) {
  if (!jeOdlucen(iz, mojId)) return null
  const p = perspektiva(iz, mojId)

  if (iz.tip === 'online' && iz.kriterij === 'vrijeme') {
    return iz.prvi_gotov === mojId ? 'win' : 'lose'
  }
  if (iz.tip === 'online' && iz.kriterij === 'pokusaji') {
    if (!(p.mojGotov && p.protivnikGotov)) {
      // samo je prvi završio, dodatno vrijeme isteklo -> prvi pobjeđuje
      return iz.prvi_gotov === mojId ? 'win' : 'lose'
    }
    // oba završila -> manje pokušaja
    return p.mojiPokusaji < p.protivnikPokusaji
      ? 'win'
      : p.mojiPokusaji > p.protivnikPokusaji
      ? 'lose'
      : 'draw'
  }

  // offline: usporedi po kriteriju
  const moja = iz.kriterij === 'vrijeme' ? p.mojeVrijeme : p.mojiPokusaji
  const prot = iz.kriterij === 'vrijeme' ? p.protivnikVrijeme : p.protivnikPokusaji
  return moja < prot ? 'win' : moja > prot ? 'lose' : 'draw'
}
