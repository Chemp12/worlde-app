import { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from './supabaseClient'
import { NACINI } from './moduli'
import { VARIJANTE, varijantaPoId } from './varijante'
import { useJezik } from './i18n'
import { poolRijeci, jeDozvoljena, slucajneRijeci, ocijeniRijec, ZADANI_JEZIK, JEZICI } from './rijeci'
import { zvukTipka, zvukGreska, zvukPobjeda, zvukPoraz } from './zvuk'

const KLJUC_JEZIK_RIJECI = 'wordle-jezik-rijeci'
import Avatar from './Avatar'
import Prijava from './Prijava'
import HubVarijanti from './HubVarijanti'
import Pocetna from './Pocetna'
import IgraIzazov from './IgraIzazov'
import IgraPoteze from './IgraPoteze'
import './App.css'

const KLJUC_STATISTIKE = 'wordle-statistika'
const KLJUC_NACINA = 'wordle-nacin'
const POCETNI_DATUM = new Date('2022-01-01') // dan 0 naše igre

const REDOVI_TIPKOVNICE = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACK'],
]

// Prazan predložak statistike. Raspodjela ima onoliko mjesta koliko mod ima redova
// (pobjeda u 1,2,...,brojRedova pokušaja).
function praznaStatistika(brojRedova) {
  return {
    odigrano: 0,
    pobjede: 0,
    trenutniNiz: 0,
    najboljiNiz: 0,
    zadnjiPeriod: null, // broj razdoblja zadnje pobjede (za računanje niza)
    raspodjela: Array(brojRedova).fill(0),
  }
}

// --- Datumi i brojevi razdoblja ---
function datumOd(date) {
  const g = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${g}-${m}-${d}`
}
function datumDanas() {
  return datumOd(new Date())
}
function danaOdPocetka(datumTekst) {
  const razlika = new Date(datumTekst) - POCETNI_DATUM
  return Math.floor(razlika / (1000 * 60 * 60 * 24))
}
function brojTjedna() {
  return Math.floor(danaOdPocetka(datumDanas()) / 7)
}
function brojMjeseca() {
  const d = new Date()
  return d.getFullYear() * 12 + d.getMonth()
}

// "Broj razdoblja" za dani način (isti broj = ista riječ = isti napredak).
// Za neograničeni način nema razdoblja -> null.
function periodId(nacin) {
  if (nacin === 'daily') return danaOdPocetka(datumDanas())
  if (nacin === 'weekly') return brojTjedna()
  if (nacin === 'monthly') return brojMjeseca()
  return null
}

// Jednostavan determinističan generator (LCG): iz jednog "sjemena" (broja)
// izbaci niz brojeva koji uvijek isti za isto sjeme. Tako su dnevne riječi
// jednake za sve igrače, ali svaka ploča dobije SVOJU riječ.
function sljedeciSeed(seed) {
  return (seed * 1103515245 + 12345) & 0x7fffffff
}

// Odaberi 'koliko' RAZLIČITIH riječi iz danog popisa (pool), počevši od sjemena.
function odaberiRijeci(koliko, seed, pool) {
  const rijeci = []
  const koristeni = new Set()
  let s = Math.abs(seed) + 1
  while (rijeci.length < koliko && koristeni.size < pool.length) {
    s = sljedeciSeed(s)
    const index = s % pool.length
    if (!koristeni.has(index)) {
      koristeni.add(index)
      rijeci.push(pool[index])
    }
  }
  return rijeci
}

// Duljina riječi za danu varijantu + mod.
// Klasik: dnevni 5, tjedni 6, mjesečni 8, neograničeni = koliko korisnik izabere.
// Ostale varijante: uvijek 5 slova.
function duljinaZa(varijanta, nacin, duljinaUnlimited) {
  if (nacin === 'timer') return 5 // timer uvijek 5 slova
  if (varijanta.id !== 'klasik') return 5
  if (nacin === 'weekly') return 6
  if (nacin === 'monthly') return 8
  if (nacin === 'unlimited') return duljinaUnlimited
  return 5 // daily
}

// Timer mod: početno vrijeme i bonus po riješenom setu (teže varijante -> veći bonus).
const TIMER_POCETNO = 60
function timerBonus(brojRijeci) {
  return brojRijeci * 5 + 10
}

// Riječi za periodički mod (dnevni/tjedni/mjesečni). Sjeme spaja broj razdoblja,
// "pomak" varijante i duljinu -> svaka varijanta ima svoj set riječi istog dana.
function rijeciZaNacin(nacin, varijanta, jezik, duljina) {
  const n = periodId(nacin)
  const pomakVarijante = VARIJANTE.findIndex((v) => v.id === varijanta.id)
  const seed = n * 1000 + (pomakVarijante + 1) * 97 + duljina * 7
  return odaberiRijeci(varijanta.brojRijeci, seed, poolRijeci(jezik, duljina))
}

// Nasumične riječi (neograničeni mod).
function nasumicneRijeci(koliko, jezik, duljina) {
  return slucajneRijeci(koliko, jezik, duljina)
}

// Kada se dani način "resetira" (dobiva novu riječ)? Vrati taj datum/vrijeme.
function sljedeciReset(nacin) {
  const sad = new Date()
  if (nacin === 'daily') {
    const d = new Date(sad)
    d.setHours(24, 0, 0, 0) // sljedeća ponoć
    return d
  }
  if (nacin === 'weekly') {
    const n = danaOdPocetka(datumDanas())
    const d = new Date(sad)
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + (7 - (n % 7))) // početak sljedećeg tjedna
    return d
  }
  if (nacin === 'monthly') {
    return new Date(sad.getFullYear(), sad.getMonth() + 1, 1) // 1. sljedećeg mjeseca
  }
  return null
}

// Pretvori trajanje (u milisekundama) u lijep tekst.
function formatirajTrajanje(ms) {
  const sek = Math.floor(ms / 1000)
  const d = Math.floor(sek / 86400)
  const h = Math.floor((sek % 86400) / 3600)
  const m = Math.floor((sek % 3600) / 60)
  const s = sek % 60
  if (d > 0) return `${d}d ${h}h ${m}m`
  return `${h}h ${m}m ${s}s`
}

// Podnaslov ovisno o načinu (t = funkcija prijevoda)
function podnaslovZa(nacin, t) {
  if (nacin === 'daily') return t('daily_sub', { n: danaOdPocetka(datumDanas()) + 1 })
  if (nacin === 'weekly') return t('weekly_sub', { n: brojTjedna() + 1 })
  if (nacin === 'monthly') return t('monthly_sub')
  if (nacin === 'timer') return t('timer_sub')
  return t('unlimited_sub')
}

// --- Spremanje / učitavanje ---
// Učitaj statistiku za SVE varijante i modove. Oblik: { klasik:{ daily:{...}, ... }, dvojac:{...}, ... }.
// Podržava i staru "ravnu" strukturu ({ daily:{...} }) -> smjesti je pod 'klasik'.
function ucitajSveStatistike(userId) {
  const spremljeno = localStorage.getItem(KLJUC_STATISTIKE + '-' + userId)
  let ucitano = spremljeno ? JSON.parse(spremljeno) : {}
  // Migracija stare (ravne) strukture: ako na vrhu stoje modovi, to je bio klasik.
  if (ucitano.daily || ucitano.unlimited) {
    ucitano = { klasik: ucitano }
  }
  return normalizirajStatistike(ucitano)
}

// Osiguraj da za SVAKU varijantu i mod postoje sva polja (raspodjela prave dužine).
function normalizirajStatistike(ucitano) {
  const rezultat = {}
  for (const v of VARIJANTE) {
    rezultat[v.id] = {}
    const zaVarijantu = ucitano[v.id] || {}
    for (const m of NACINI) {
      rezultat[v.id][m.id] = { ...praznaStatistika(v.brojRedova), ...(zaVarijantu[m.id] || {}) }
    }
  }
  return rezultat
}

// Ključ pod kojim pamtimo napredak (uključuje jezik i duljinu -> različite igre se ne miješaju).
function kljucIgre(varijanta, nacin, jezik, duljina, userId) {
  return `wordle-igra-${varijanta.id}-${nacin}-${jezik}-${duljina}-${userId}`
}

// Učitaj (tajne riječi + spremljeni napredak) za danu varijantu, način, jezik i duljinu.
function ucitajStanje(varijanta, nacin, userId, jezik, duljina) {
  // Timer mod se ne pamti — uvijek svježe nasumične riječi.
  if (nacin === 'timer') {
    return { tajne: nasumicneRijeci(varijanta.brojRijeci, jezik, duljina), pokusaji: [] }
  }
  const spremljeno = localStorage.getItem(kljucIgre(varijanta, nacin, jezik, duljina, userId))
  if (spremljeno) {
    const p = JSON.parse(spremljeno)
    if (nacin === 'unlimited') {
      return { tajne: p.rijeci, pokusaji: p.pokusaji }
    }
    if (p.period === periodId(nacin)) {
      // isto razdoblje -> nastavi tamo gdje si stao
      return { tajne: rijeciZaNacin(nacin, varijanta, jezik, duljina), pokusaji: p.pokusaji }
    }
  }
  // ništa spremljeno ili novo razdoblje -> čista igra
  const tajne =
    nacin === 'unlimited'
      ? nasumicneRijeci(varijanta.brojRijeci, jezik, duljina)
      : rijeciZaNacin(nacin, varijanta, jezik, duljina)
  return { tajne, pokusaji: [] }
}

// Zbroji statistiku svih varijanti i modova u dva broja za ljestvicu:
// ukupno pobjeda i najbolji niz (najveći od svih).
function agregatZaLjestvicu(sve) {
  let pobjede = 0
  let niz = 0
  for (const v of VARIJANTE) {
    for (const m of NACINI) {
      const s = sve[v.id]?.[m.id]
      if (!s) continue
      pobjede += s.pobjede
      niz = Math.max(niz, s.najboljiNiz)
    }
  }
  return { pobjede, niz }
}

// Je li igra gotova? Gotova je kad su SVE riječi pogođene, ili su potrošeni svi redovi.
function jeGotovaIgra(pokusaji, tajne, brojRedova) {
  const sveRijesene = tajne.every((t) => pokusaji.includes(t))
  return sveRijesene || pokusaji.length === brojRedova
}

function Igra({ korisnik, varijanta, pocetniMod, onNatrag, onOdjava }) {
  const { t } = useJezik()
  const ime = korisnik.user_metadata?.username || korisnik.email
  const brojRedova = varijanta.brojRedova
  const brojRijeci = varijanta.brojRijeci
  const [nacin, setNacin] = useState(pocetniMod)
  // Jezik riječi (pamti se globalno).
  const [jezik, setJezik] = useState(() => localStorage.getItem(KLJUC_JEZIK_RIJECI) || ZADANI_JEZIK)
  const [duljinaUnlimited, setDuljinaUnlimited] = useState(5) // duljina za neograničeni mod

  // Duljina riječi (= broj stupaca ploče) za trenutnu varijantu + mod.
  const brojStupaca = duljinaZa(varijanta, nacin, duljinaUnlimited)

  // Početno stanje (riječi + napredak) učitaj SAMO jednom, na startu.
  const pocetno = useMemo(
    () =>
      ucitajStanje(
        varijanta,
        pocetniMod,
        korisnik.id,
        localStorage.getItem(KLJUC_JEZIK_RIJECI) || ZADANI_JEZIK,
        duljinaZa(varijanta, pocetniMod, 5)
      ),
    []
  )

  const [tajne, setTajne] = useState(pocetno.tajne)
  const [pokusaji, setPokusaji] = useState(pocetno.pokusaji)
  const [trenutni, setTrenutni] = useState('')
  const [poruka, setPoruka] = useState('')
  const [sveStatistike, setSveStatistike] = useState(() => ucitajSveStatistike(korisnik.id))
  const [odbrojavanje, setOdbrojavanje] = useState('')

  // Statistika za TRENUTNU varijantu + mod.
  const statistika = sveStatistike[varijanta.id][nacin]
  const [redZaAnimaciju, setRedZaAnimaciju] = useState(null)
  const [otkriveno, setOtkriveno] = useState(0) // koliko stupaca reda se već "otkrilo" (boja)
  const [animira, setAnimira] = useState(false) // traje li trenutno okretanje reda?
  const [tresi, setTresi] = useState(false)
  const [kopirano, setKopirano] = useState(false) // "Kopirano!" nakon dijeljenja
  // Timer mod
  const [preostalo, setPreostalo] = useState(TIMER_POCETNO)
  const [bodovi, setBodovi] = useState(0)
  const [krajTimer, setKrajTimer] = useState(false)
  const [rekord, setRekord] = useState(() =>
    Number(localStorage.getItem(`wordle-timer-best-${varijanta.id}-${korisnik.id}`) || 0)
  )
  const [prikaziKraj, setPrikaziKraj] = useState(() =>
    jeGotovaIgra(pocetno.pokusaji, pocetno.tajne, brojRedova)
  )
  const inputRef = useRef(null) // nevidljivo polje koje otvara tipkovnicu mobitela

  // Za svaku tajnu riječ: u kojem je pokušaju riješena (-1 ako još nije).
  const rijeseno = tajne.map((t) => pokusaji.indexOf(t))
  const pobijedio = tajne.every((t) => pokusaji.includes(t))
  const izgubio = !pobijedio && pokusaji.length === brojRedova
  const gotovo = pobijedio || izgubio

  const postotakPobjeda =
    statistika.odigrano > 0
      ? Math.round((statistika.pobjede / statistika.odigrano) * 100)
      : 0

  // Spremi napredak trenutne varijante+načina kad se promijeni.
  useEffect(() => {
    const kljuc = kljucIgre(varijanta, nacin, jezik, brojStupaca, korisnik.id)
    const podaci =
      nacin === 'unlimited'
        ? { rijeci: tajne, pokusaji }
        : { period: periodId(nacin), pokusaji }
    localStorage.setItem(kljuc, JSON.stringify(podaci))
  }, [pokusaji, nacin, tajne, korisnik.id, varijanta.id, jezik, brojStupaca])

  // Pri prijavi: učitaj statistiku iz oblaka da prati račun na svim uređajima.
  useEffect(() => {
    let otkazano = false
    async function ucitajIzOblaka() {
      const { data, error } = await supabase
        .from('statistike')
        .select('podaci')
        .eq('user_id', korisnik.id)
        .maybeSingle() // 0 ili 1 red (ne baca grešku ako nema reda)
      if (error) {
        console.error('Čitanje iz oblaka nije uspjelo:', error.message)
        return
      }
      if (otkazano) return

      if (data && data.podaci) {
        // Postoji u oblaku -> koristi to (uz migraciju/normalizaciju za nova polja).
        let izOblaka = data.podaci
        if (izOblaka.daily || izOblaka.unlimited) izOblaka = { klasik: izOblaka }
        const spojeno = normalizirajStatistike(izOblaka)
        setSveStatistike(spojeno)
        localStorage.setItem(KLJUC_STATISTIKE + '-' + korisnik.id, JSON.stringify(spojeno))
        spremiRezultate(spojeno) // popuni tablicu rezultata po varijanti
      } else {
        // Prvi put (nema reda) -> gurni trenutnu lokalnu statistiku u oblak.
        spremiUOblak(sveStatistike)
      }
    }
    ucitajIzOblaka()
    return () => {
      otkazano = true // ako se komponenta ugasi prije odgovora -> ne diraj state
    }
  }, [korisnik.id])

  // Odbrojavanje do sljedeće riječi (ovisi o načinu). Neograničeni nema odbrojavanje.
  useEffect(() => {
    if (nacin === 'unlimited') {
      setOdbrojavanje('')
      return
    }
    function izracunaj() {
      const cilj = sljedeciReset(nacin)
      setOdbrojavanje(formatirajTrajanje(cilj - new Date()))
    }
    izracunaj()
    const id = setInterval(izracunaj, 1000)
    return () => clearInterval(id)
  }, [nacin])

  // Timer mod: odbrojavanje. Kad istekne vrijeme -> kraj partije.
  useEffect(() => {
    if (nacin !== 'timer' || krajTimer) return
    const id = setInterval(() => {
      setPreostalo((p) => {
        if (p <= 1) {
          setKrajTimer(true)
          return 0
        }
        return p - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [nacin, krajTimer])

  // Timer kraj: spremi rekord (najviše bodova).
  useEffect(() => {
    if (krajTimer && nacin === 'timer') {
      const kljuc = `wordle-timer-best-${varijanta.id}-${korisnik.id}`
      if (bodovi > Number(localStorage.getItem(kljuc) || 0)) {
        localStorage.setItem(kljuc, String(bodovi))
        setRekord(bodovi)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [krajTimer])

  // Prebaci na drugi način: učitaj njegove riječi i napredak (duljina ovisi o modu).
  function promijeniNacin(noviNacin) {
    const novaDuljina = duljinaZa(varijanta, noviNacin, duljinaUnlimited)
    const stanje = ucitajStanje(varijanta, noviNacin, korisnik.id, jezik, novaDuljina)
    setNacin(noviNacin)
    setTajne(stanje.tajne)
    setPokusaji(stanje.pokusaji)
    setTrenutni('')
    setPoruka('')
    setRedZaAnimaciju(null)
    setAnimira(false)
    setPrikaziKraj(jeGotovaIgra(stanje.pokusaji, stanje.tajne, brojRedova))
    localStorage.setItem(KLJUC_NACINA, noviNacin)
    // Timer: kreni ispočetka (vrijeme, bodovi).
    if (noviNacin === 'timer') {
      setPreostalo(TIMER_POCETNO)
      setBodovi(0)
      setKrajTimer(false)
    }
  }

  // Promijeni jezik riječi -> učitaj igru trenutnog moda na novom jeziku.
  function promijeniJezik(noviJezik) {
    setJezik(noviJezik)
    localStorage.setItem(KLJUC_JEZIK_RIJECI, noviJezik)
    const stanje = ucitajStanje(varijanta, nacin, korisnik.id, noviJezik, brojStupaca)
    setTajne(stanje.tajne)
    setPokusaji(stanje.pokusaji)
    setTrenutni('')
    setPoruka('')
    setRedZaAnimaciju(null)
    setAnimira(false)
    setPrikaziKraj(jeGotovaIgra(stanje.pokusaji, stanje.tajne, brojRedova))
  }

  // Promijeni duljinu riječi (samo neograničeni mod) -> nova/spremljena igra te duljine.
  function promijeniDuljinu(novaDuljina) {
    setDuljinaUnlimited(novaDuljina)
    const stanje = ucitajStanje(varijanta, 'unlimited', korisnik.id, jezik, novaDuljina)
    setTajne(stanje.tajne)
    setPokusaji(stanje.pokusaji)
    setTrenutni('')
    setPoruka('')
    setRedZaAnimaciju(null)
    setAnimira(false)
    setPrikaziKraj(jeGotovaIgra(stanje.pokusaji, stanje.tajne, brojRedova))
  }

  // Sastavi tekst rezultata s emoji-mrežom (🟩🟨⬜) za dijeljenje.
  function tekstRezultata() {
    const emoji = (o) => (o === 'tocno' ? '🟩' : o === 'skoro' ? '🟨' : '⬜')
    const varIme = t('var_' + varijanta.id + '_ime')
    const linije = [`Wordle · ${varijanta.ikona} ${varIme} · ${podnaslovZa(nacin, t)}`]

    // Rezultat: klasik "n/redova", više riječi -> po ploči.
    const rezultatPloce = (w) => {
      const idx = pokusaji.indexOf(w)
      return idx === -1 ? 'X' : idx + 1
    }
    linije.push(tajne.map(rezultatPloce).join(' · ') + `/${brojRedova}`)
    linije.push('')

    // Mreža po ploči (do reda u kojem je riječ riješena).
    tajne.forEach((w, bi) => {
      if (tajne.length > 1) linije.push(`#${bi + 1}`)
      const idx = pokusaji.indexOf(w)
      const redova = idx === -1 ? pokusaji.length : idx + 1
      for (let r = 0; r < redova; r++) {
        linije.push(ocijeniRijec(pokusaji[r], w).map(emoji).join(''))
      }
      linije.push('')
    })
    linije.push('wordle-app-gamma.vercel.app')
    return linije.join('\n')
  }

  // Podijeli: probaj nativno dijeljenje (mobitel), inače kopiraj u međuspremnik.
  async function podijeli() {
    const tekst = tekstRezultata()
    if (navigator.share) {
      try {
        await navigator.share({ text: tekst })
        return
      } catch {
        // korisnik odustao ili nije uspjelo -> probaj kopirati
      }
    }
    try {
      await navigator.clipboard.writeText(tekst)
      setKopirano(true)
      setTimeout(() => setKopirano(false), 2000)
    } catch {
      setPoruka(tekst) // krajnja rezerva: pokaži tekst
    }
  }

  // Nova igra (samo za neograničeni način).
  function novaNeogranicena() {
    setTajne(nasumicneRijeci(brojRijeci, jezik, duljinaUnlimited))
    setPokusaji([])
    setTrenutni('')
    setPoruka('')
    setRedZaAnimaciju(null)
    setAnimira(false)
    setPrikaziKraj(false)
  }

  // Timer: novi set riječi (bez diranja vremena/bodova).
  function noviTimerSet() {
    setTajne(nasumicneRijeci(brojRijeci, jezik, 5))
    setPokusaji([])
    setTrenutni('')
    setPoruka('')
    setRedZaAnimaciju(null)
    setAnimira(false)
  }

  // Timer: kreni ispočetka (nova partija).
  function pokreniTimer() {
    setPreostalo(TIMER_POCETNO)
    setBodovi(0)
    setKrajTimer(false)
    noviTimerSet()
  }

  // Spremi cijelu statistiku u Supabase (upsert = unesi ili ažuriraj red korisnika).
  async function spremiUOblak(sve) {
    const { error } = await supabase
      .from('statistike')
      .upsert({ user_id: korisnik.id, podaci: sve, azurirano: new Date().toISOString() })
    if (error) console.error('Spremanje u oblak nije uspjelo:', error.message)

    // Ažuriraj i javni profil (za ukupnu ljestvicu).
    const { pobjede, niz } = agregatZaLjestvicu(sve)
    const { error: greskaProfil } = await supabase.from('profili').upsert({
      user_id: korisnik.id,
      username: ime,
      ukupno_pobjeda: pobjede,
      najbolji_niz: niz,
      azurirano: new Date().toISOString(),
    })
    if (greskaProfil) console.error('Spremanje profila nije uspjelo:', greskaProfil.message)

    // Ažuriraj rezultate PO VARIJANTI (za ljestvicu po varijanti).
    spremiRezultate(sve)
  }

  // Spremi pobjede + najbolji niz za SVAKU varijantu (zbroj kroz sve modove).
  async function spremiRezultate(sve) {
    const redovi = VARIJANTE.map((v) => {
      let pobjede = 0
      let niz = 0
      for (const m of NACINI) {
        const s = sve[v.id]?.[m.id]
        if (!s) continue
        pobjede += s.pobjede
        niz = Math.max(niz, s.najboljiNiz)
      }
      return {
        user_id: korisnik.id,
        varijanta: v.id,
        pobjede,
        najbolji_niz: niz,
        azurirano: new Date().toISOString(),
      }
    })
    const { error } = await supabase.from('rezultati').upsert(redovi)
    if (error) console.error('Spremanje rezultata nije uspjelo:', error.message)
  }

  function azurirajStatistiku(pobjeda, brojPokusaja) {
    const stara = sveStatistike[varijanta.id][nacin]
    const nova = { ...stara, raspodjela: [...(stara.raspodjela || Array(brojRedova).fill(0))] }
    nova.odigrano += 1

    if (pobjeda) {
      nova.pobjede += 1
      nova.raspodjela[brojPokusaja - 1] += 1 // npr. pobjeda u 3 pokušaja -> raspodjela[2]++
      if (nacin === 'unlimited') {
        nova.trenutniNiz = stara.trenutniNiz + 1
      } else {
        const period = periodId(nacin)
        nova.trenutniNiz = stara.zadnjiPeriod === period - 1 ? stara.trenutniNiz + 1 : 1
        nova.zadnjiPeriod = period
      }
      nova.najboljiNiz = Math.max(nova.najboljiNiz, nova.trenutniNiz)
    } else {
      nova.trenutniNiz = 0
    }

    // Ugnijezdi natrag: kopiraj cijelu strukturu pa zamijeni ovu jednu ćeliju.
    const sve = {
      ...sveStatistike,
      [varijanta.id]: { ...sveStatistike[varijanta.id], [nacin]: nova },
    }
    setSveStatistike(sve)
    localStorage.setItem(KLJUC_STATISTIKE + '-' + korisnik.id, JSON.stringify(sve))
    spremiUOblak(sve)
  }

  function zatresi() {
    setTresi(true)
    setTimeout(() => setTresi(false), 500)
  }

  function obradiTipku(tipka) {
    if (gotovo || animira || krajTimer) return // dok se red okreće / timer istekao, ignoriraj

    if (tipka === 'ENTER') {
      if (trenutni.length !== brojStupaca) {
        setPoruka(t('too_few'))
        zatresi()
        zvukGreska()
        return
      }
      if (!jeDozvoljena(jezik, trenutni)) {
        setPoruka(t('not_in_list'))
        zatresi()
        zvukGreska()
        return
      }

      const noviPokusaji = [...pokusaji, trenutni]
      setPokusaji(noviPokusaji)
      setTrenutni('')
      setPoruka('')

      // Trajanje okretanja ovisi o broju stupaca (zadnji stupac + trajanje okreta).
      const trajanje = (brojStupaca - 1) * 280 + 250 + 350

      // Pokreni animaciju okretanja za ovaj red (na svim pločama) i otkrivaj boje stupac po stupac.
      setRedZaAnimaciju(pokusaji.length)
      setOtkriveno(0)
      setAnimira(true)
      for (let i = 0; i < brojStupaca; i++) {
        setTimeout(() => setOtkriveno(i + 1), i * 280 + 250)
      }
      setTimeout(() => setAnimira(false), trajanje)

      // Pobjeda = SVE riječi pogođene. Poraz = potrošeni svi redovi bez pogotka svih.
      const pobjeda = tajne.every((t) => noviPokusaji.includes(t))
      const poraz = !pobjeda && noviPokusaji.length === brojRedova
      if (pobjeda || poraz) {
        setTimeout(() => {
          if (nacin === 'timer') {
            // Timer: pobjeda -> bod + bonus vrijeme; svejedno novi set (dok ima vremena).
            if (pobjeda) {
              setBodovi((b) => b + 1)
              setPreostalo((p) => p + timerBonus(brojRijeci))
              zvukPobjeda()
            }
            noviTimerSet()
          } else {
            azurirajStatistiku(pobjeda, noviPokusaji.length)
            setPrikaziKraj(true)
            if (pobjeda) zvukPobjeda()
            else zvukPoraz()
          }
        }, trajanje)
      }
    } else if (tipka === 'BACK') {
      setTrenutni(trenutni.slice(0, -1))
    } else if (/^[A-Z]$/.test(tipka)) {
      if (trenutni.length < brojStupaca) {
        setTrenutni(trenutni + tipka)
        zvukTipka()
      }
    }
  }

  // Dodir na ploču -> fokusiraj nevidljivo polje -> mobitel otvori tipkovnicu.
  function fokusirajUnos() {
    if (!gotovo) inputRef.current?.focus()
  }

  function naInput(event) {
    if (gotovo || animira || krajTimer) return
    const cist = event.target.value
      .toUpperCase()
      .replace(/[^A-Z]/g, '') // makni sve što nije slovo
      .slice(0, brojStupaca)
    setTrenutni(cist)
  }

  useEffect(() => {
    function naPritisakTipke(event) {
      if (document.activeElement === inputRef.current) return
      if (event.key === 'Enter') obradiTipku('ENTER')
      else if (event.key === 'Backspace') obradiTipku('BACK')
      else if (/^[a-zA-Z]$/.test(event.key)) obradiTipku(event.key.toUpperCase())
    }
    window.addEventListener('keydown', naPritisakTipke)
    return () => window.removeEventListener('keydown', naPritisakTipke)
  }, [trenutni, pokusaji, gotovo, nacin, tajne, animira])

  // Boje tipkovnice: gledamo SAMO još neriješene ploče (da riješena riječ ne
  // "ugasi" slovo koje ti još treba negdje drugdje). Za svako slovo uzmemo
  // najbolji status kroz sve neriješene ploče (tocno > skoro > krivo).
  const RANG = { krivo: 1, skoro: 2, tocno: 3 }
  const statusSlova = {}
  const redovaZaBoje = animira ? pokusaji.length - 1 : pokusaji.length
  tajne.forEach((tajna, indexPloce) => {
    if (rijeseno[indexPloce] !== -1) return // preskoči riješene ploče
    for (let r = 0; r < redovaZaBoje; r++) {
      const pokusaj = pokusaji[r]
      const ocjene = ocijeniRijec(pokusaj, tajna)
      pokusaj.split('').forEach((slovo, i) => {
        const novi = ocjene[i]
        const stari = statusSlova[slovo]
        if (!stari || RANG[novi] > RANG[stari]) statusSlova[slovo] = novi
      })
    }
  })

  // Jedna ploča (jedna tajna riječ).
  function renderPloca(tajna, indexPloce) {
    const rijesenaU = rijeseno[indexPloce] // -1 ako nije riješena
    // Na riješenoj ploči prikazujemo redove do (uključivo) pogotka; dalje prazno.
    const redovaZaPrikaz = rijesenaU === -1 ? pokusaji.length : rijesenaU + 1

    return (
      <div className={`ploca ${rijesenaU !== -1 ? 'rijesena' : ''}`} key={indexPloce}>
        {Array.from({ length: brojRedova }).map((_, indexReda) => {
          const jePotvrdjen = indexReda < redovaZaPrikaz
          const jeTrenutni = indexReda === pokusaji.length && rijesenaU === -1
          const slova = jePotvrdjen ? pokusaji[indexReda] : jeTrenutni ? trenutni : ''
          const ocjene = jePotvrdjen ? ocijeniRijec(slova, tajna) : null
          const jeOtkrivRed = jePotvrdjen && indexReda === redZaAnimaciju

          return (
            <div className={`red ${jeTrenutni && tresi ? 'tresi' : ''}`} key={indexReda}>
              {Array.from({ length: brojStupaca }).map((_, indexSlova) => {
                const slovo = slova[indexSlova] || ''
                let klase = 'kvadratic'
                if (jePotvrdjen) {
                  const prikaziBoju = !jeOtkrivRed || indexSlova < otkriveno
                  if (prikaziBoju) klase += ` ${ocjene[indexSlova]}`
                  if (jeOtkrivRed) klase += ' otkrij'
                } else if (jeTrenutni && slovo) {
                  klase += ' upisano'
                }
                return (
                  <div className={klase} key={indexSlova}>
                    {slovo}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="app">
      {/* Traka s prijavljenim korisnikom */}
      <div className="korisnik-traka">
        <button className="odjava-gumb" onClick={onNatrag}>
          {t('back')}
        </button>
        <span className="korisnik-ime">
          <Avatar url={korisnik.user_metadata?.avatar_url} ime={ime} size={26} />
          <span className="korisnik-ime-tekst">{ime}</span>
        </span>
        <button className="odjava-gumb" onClick={onOdjava}>
          {t('logout')}
        </button>
      </div>

      {/* Bočna traka s načinima igre (izvuče se na hover) */}
      <div className="bocna-traka">
        <div className="nacini">
          <h2 className="nacini-naslov">{t('modes_title')}</h2>
          {NACINI.map((m) => (
            <button
              key={m.id}
              className={`nacin-gumb ${nacin === m.id ? 'aktivan' : ''}`}
              onClick={() => promijeniNacin(m.id)}
            >
              <span className="nacin-ikona">{m.ikona}</span>
              {t('nacin_' + m.id + '_ime')}
            </button>
          ))}
        </div>
        <div className="rucka">☰</div>
      </div>

      <h1>{varijanta.ikona} {t('var_' + varijanta.id + '_ime').toUpperCase()}</h1>
      <p className="podnaslov">{podnaslovZa(nacin, t)}</p>

      {/* Izbor jezika riječi (svi modovi) */}
      <div className="jezik-rijeci" title={t('words_lang')}>
        {JEZICI.map((j) => (
          <button
            key={j.id}
            className={`jr-gumb ${jezik === j.id ? 'aktivan' : ''}`}
            onClick={() => promijeniJezik(j.id)}
            title={j.ime}
          >
            {j.kod}
          </button>
        ))}
      </div>

      {/* Izbor duljine riječi — samo Klasik neograničeni */}
      {nacin === 'unlimited' && varijanta.id === 'klasik' && (
        <div className="duljina-izbor">
          <span className="duljina-oznaka">{t('word_length')}</span>
          <div className="duljina-gumbi">
            {[4, 5, 6, 7, 8].map((d) => (
              <button
                key={d}
                className={`duljina-gumb ${brojStupaca === d ? 'aktivan' : ''}`}
                onClick={() => promijeniDuljinu(d)}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      )}

      {nacin === 'timer' ? (
        <div className="statistika">
          <div className="stat">
            <span className={`stat-broj ${preostalo <= 10 ? 'malo-vremena' : ''}`}>{preostalo}s</span>
            <span className="stat-ime">{t('timer_time')}</span>
          </div>
          <div className="stat">
            <span className="stat-broj">{bodovi}</span>
            <span className="stat-ime">{t('timer_score')}</span>
          </div>
          <div className="stat">
            <span className="stat-broj">{rekord}</span>
            <span className="stat-ime">{t('timer_best')}</span>
          </div>
        </div>
      ) : (
        <div className="statistika">
          <div className="stat">
            <span className="stat-broj">{statistika.odigrano}</span>
            <span className="stat-ime">{t('stat_played')}</span>
          </div>
          <div className="stat">
            <span className="stat-broj">{postotakPobjeda}%</span>
            <span className="stat-ime">{t('stat_wins')}</span>
          </div>
          <div className="stat">
            <span className="stat-broj">{statistika.trenutniNiz}</span>
            <span className="stat-ime">{t('stat_streak')}</span>
          </div>
          <div className="stat">
            <span className="stat-broj">{statistika.najboljiNiz}</span>
            <span className="stat-ime">{t('stat_record')}</span>
          </div>
        </div>
      )}

      {/* Timer istekao -> rezultat + igraj ponovno */}
      {nacin === 'timer' && krajTimer && (
        <div className="timer-kraj">
          <p className="poruka neuspjeh">{t('timer_over')}</p>
          <p className="timer-rezultat">
            {t('timer_score')}: <b>{bodovi}</b> · {t('timer_best')}: <b>{rekord}</b>
          </p>
          <button className="gumb" onClick={pokreniTimer}>
            {t('play_again')}
          </button>
        </div>
      )}

      {pobijedio && prikaziKraj && <p className="poruka uspjeh">{t('win_msg')}</p>}
      {izgubio && prikaziKraj && (
        <p className="poruka neuspjeh">{t('lose_msg', { rijeci: tajne.join(', ') })}</p>
      )}
      {!gotovo && poruka && <p className="poruka">{poruka}</p>}

      {/* Sve ploče u rešetki (klik bilo gdje otvara tipkovnicu mobitela).
          key = jezik+mod+duljina -> ploča se ponovno iscrta i "uleti" pri promjeni. */}
      <div
        className={`ploce ploce-${brojRijeci}`}
        key={`${jezik}-${nacin}-${brojStupaca}`}
        onClick={fokusirajUnos}
      >
        {/* Nevidljivo polje: otvara tipkovnicu mobitela i prima slova. */}
        <input
          ref={inputRef}
          className="skriveni-unos"
          value={trenutni}
          onChange={naInput}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              obradiTipku('ENTER')
            }
          }}
          readOnly={gotovo || animira}
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          inputMode="text"
          aria-hidden="true"
        />
        {tajne.map((tajna, i) => renderPloca(tajna, i))}
      </div>

      {pokusaji.length === 0 && trenutni === '' && !gotovo && (
        <p className="mobilni-savjet">{t('mobile_hint')}</p>
      )}

      <div className="tipkovnica">
        {REDOVI_TIPKOVNICE.map((red, indexReda) => (
          <div className="tipk-red" key={indexReda}>
            {indexReda === 1 && <div className="tipk-spacer" />}
            {red.map((tipka) => {
              const jeSiroka = tipka === 'ENTER' || tipka === 'BACK'
              const status = statusSlova[tipka] || ''
              return (
                <button
                  key={tipka}
                  className={`tipka ${status} ${jeSiroka ? 'siroka' : ''}`}
                  onClick={() => obradiTipku(tipka)}
                >
                  {tipka === 'BACK' ? '⌫' : tipka}
                </button>
              )
            })}
            {indexReda === 1 && <div className="tipk-spacer" />}
          </div>
        ))}
      </div>

      {/* Dijeljenje rezultata (emoji-mreža) */}
      {prikaziKraj && (
        <button className="gumb-podijeli" onClick={podijeli}>
          {kopirano ? t('share_copied') : t('share')}
        </button>
      )}

      {/* Neograničeni: gumb za novu igru. Ostali načini: odbrojavanje. */}
      {prikaziKraj && nacin === 'unlimited' && (
        <button className="gumb" onClick={novaNeogranicena}>
          {t('new_game')}
        </button>
      )}
      {prikaziKraj && nacin !== 'unlimited' && (
        <div className="odbrojavanje">
          <span className="stat-ime">{t('next_word_in')}</span>
          <span className="stat-broj">{odbrojavanje}</span>
        </div>
      )}
    </div>
  )
}

// Glavni "vratar": provjeri je li korisnik prijavljen.
// Ako nije -> Prijava. Ako je -> hub varijanti -> hub modova -> Igra.
function App() {
  const [korisnik, setKorisnik] = useState(null)
  const [provjeraSesije, setProvjeraSesije] = useState(true) // dok provjeravamo prijavu
  const [ekran, setEkran] = useState('varijante')            // 'varijante' | 'pocetna' | 'igra' | 'izazov'
  const [odabranaVarijanta, setOdabranaVarijanta] = useState('klasik')
  const [odabraniMod, setOdabraniMod] = useState('daily')
  const [aktivniIzazov, setAktivniIzazov] = useState(null)   // izazov koji trenutno igramo

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setKorisnik(data.session?.user ?? null)
      setProvjeraSesije(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_dogadaj, sesija) => {
      setKorisnik(sesija?.user ?? null)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  async function odjava() {
    await supabase.auth.signOut()
    setEkran('varijante') // nakon odjave vrati na početni ekran
  }

  if (provjeraSesije) return null
  if (!korisnik) return <Prijava />

  const ime = korisnik.user_metadata?.username || korisnik.email

  // 1. ekran: odabir vrste igre (varijante) + račun/ljestvica/postavke
  if (ekran === 'varijante') {
    return (
      <HubVarijanti
        korisnik={korisnik}
        ime={ime}
        onOdaberiVarijantu={(id) => {
          setOdabranaVarijanta(id)
          setEkran('pocetna')
        }}
        onIgrajIzazov={(iz) => {
          setAktivniIzazov(iz)
          setEkran('izazov')
        }}
        onOdjava={odjava}
      />
    )
  }

  // Ekran igranja izazova (na poteze -> IgraPoteze, inače -> IgraIzazov)
  if (ekran === 'izazov' && aktivniIzazov) {
    const zajednicko = {
      korisnik,
      izazov: aktivniIzazov,
      onNatrag: () => setEkran('varijante'),
    }
    return aktivniIzazov.tip === 'poteze' ? (
      <IgraPoteze {...zajednicko} />
    ) : (
      <IgraIzazov {...zajednicko} />
    )
  }

  // 2. ekran: odabir moda za odabranu varijantu
  if (ekran === 'pocetna') {
    return (
      <Pocetna
        korisnik={korisnik}
        ime={ime}
        varijanta={varijantaPoId(odabranaVarijanta)}
        onNatrag={() => setEkran('varijante')}
        onOdaberiMod={(mod) => {
          setOdabraniMod(mod)
          setEkran('igra')
        }}
        onOdjava={odjava}
      />
    )
  }

  // 3. ekran: igra (za odabranu varijantu + mod)
  return (
    <Igra
      korisnik={korisnik}
      varijanta={varijantaPoId(odabranaVarijanta)}
      pocetniMod={odabraniMod}
      onNatrag={() => setEkran('pocetna')}
      onOdjava={odjava}
    />
  )
}

export default App
