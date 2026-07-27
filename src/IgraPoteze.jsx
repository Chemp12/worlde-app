import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabaseClient'
import { useJezik } from './i18n'
import { jeDozvoljena, ocijeniRijec, osiguraj } from './rijeci'
import { rezultat as izracunajRezultat } from './izazovLogika'
import './App.css'
import './IgraPoteze.css'

const BROJ_REDOVA = 6
const BROJ_STUPACA = 5
const TIMEOUT_MS = 90000     // 90 s neaktivnosti protivnika -> možeš preuzeti pobjedu
const TRAJANJE_OTKRIVANJA = 1700 // ms: okretanje reda

const REDOVI_TIPKOVNICE = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACK'],
]

// Početno stanje partije "na poteze".
function pocetnoStanje(izazov) {
  return {
    trenutna: 0,
    naPotezu: izazov.izazivac, // izazivač prvi
    guessI: [],
    guessP: [],
    gotovo: false,
    pobjednik: null, // user_id prvog koji pogodi (ili null = neriješeno)
    zadnjaAkcija: new Date().toISOString(),
  }
}

// Primijeni jedan potez (čisti izračun). Pravilo: tko PRVI pogodi riječ -> pobjeđuje.
function primijeniPotez(stanje, izazov, mojId, guess) {
  const jaIzazivac = izazov.izazivac === mojId
  const s = { ...stanje, guessI: [...stanje.guessI], guessP: [...stanje.guessP] }
  const tajna = izazov.rijeci[s.trenutna]
  const rijesio = guess === tajna

  if (jaIzazivac) s.guessI.push(guess)
  else s.guessP.push(guess)
  s.zadnjaAkcija = new Date().toISOString()

  if (rijesio) {
    s.gotovo = true
    s.pobjednik = mojId
    return s
  }

  const iGotov = s.guessI.length >= BROJ_REDOVA
  const pGotov = s.guessP.length >= BROJ_REDOVA
  if (iGotov && pGotov) {
    if (s.trenutna + 1 >= izazov.rijeci.length) {
      s.gotovo = true
      s.pobjednik = null
    } else {
      s.trenutna += 1
      s.guessI = []
      s.guessP = []
      s.naPotezu = s.trenutna % 2 === 0 ? izazov.izazivac : izazov.protivnik
    }
  } else if (!iGotov && !pGotov) {
    s.naPotezu = jaIzazivac ? izazov.protivnik : izazov.izazivac
  } else {
    s.naPotezu = iGotov ? izazov.protivnik : izazov.izazivac
  }
  return s
}

function IgraPoteze({ korisnik, izazov, onNatrag }) {
  const { t } = useJezik()
  const jaIzazivac = izazov.izazivac === korisnik.id

  const [stanje, setStanje] = useState(izazov.poteza || null)
  const [trenutni, setTrenutni] = useState('')
  const [poruka, setPoruka] = useState('')
  const [tresi, setTresi] = useState(false)
  const [sada, setSada] = useState(Date.now())
  const [anim, setAnim] = useState(null) // { ploca: 'I'|'P', red } — koji red se trenutno okreće
  const [otkriveno, setOtkriveno] = useState(0)
  const [krajPrikazan, setKrajPrikazan] = useState(false)

  const inputRef = useRef(null)
  const inicijalizirano = useRef(false)
  const zadnjiPotez = useRef(0) // da polling ne "vrati" moj svježi potez
  const prevI = useRef(izazov.poteza?.guessI.length || 0)
  const prevP = useRef(izazov.poteza?.guessP.length || 0)

  // Učitaj popis riječi jezika izazova (za validaciju pokušaja).
  useEffect(() => {
    osiguraj(izazov.jezik || 'en')
  }, [])

  // Prvi koji uđe stvara stanje partije; ostali ga učitaju.
  useEffect(() => {
    async function init() {
      const p = pocetnoStanje(izazov)
      await supabase.from('izazovi').update({ poteza: p }).eq('id', izazov.id).is('poteza', null)
      const { data } = await supabase.from('izazovi').select('poteza').eq('id', izazov.id).maybeSingle()
      setStanje(data?.poteza || p)
    }
    if (!inicijalizirano.current) {
      inicijalizirano.current = true
      init()
    }
  }, [])

  // Sinkronizacija: povlači stanje svakih 1.5 s. Osvježi SAMO ako se promijenilo
  // (inače bi nepromijenjeni poll prekidao animaciju okretanja).
  useEffect(() => {
    const id = setInterval(async () => {
      if (Date.now() - zadnjiPotez.current < 1200) return // nakratko nakon vlastitog poteza
      const { data } = await supabase.from('izazovi').select('poteza').eq('id', izazov.id).maybeSingle()
      if (!data?.poteza) return
      const noviJson = JSON.stringify(data.poteza)
      setStanje((prev) => (JSON.stringify(prev) === noviJson ? prev : data.poteza))
    }, 1500)
    return () => clearInterval(id)
  }, [izazov.id])

  // Štoperica (za timeout gumb).
  useEffect(() => {
    const id = setInterval(() => setSada(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  // Kad se pojavi NOVI pokušaj (moj ili protivnikov) -> pokreni okretanje tog reda.
  useEffect(() => {
    if (!stanje) return
    const iLen = stanje.guessI.length
    const pLen = stanje.guessP.length
    let ploca = null
    let red = null
    if (iLen > prevI.current) {
      ploca = 'I'
      red = iLen - 1
    } else if (pLen > prevP.current) {
      ploca = 'P'
      red = pLen - 1
    }
    prevI.current = iLen
    prevP.current = pLen
    if (ploca !== null) {
      setAnim({ ploca, red })
      setOtkriveno(0)
      const tajmeri = []
      for (let i = 0; i < BROJ_STUPACA; i++) {
        tajmeri.push(setTimeout(() => setOtkriveno(i + 1), i * 280 + 250))
      }
      tajmeri.push(setTimeout(() => setAnim(null), TRAJANJE_OTKRIVANJA))
      return () => tajmeri.forEach(clearTimeout)
    }
  }, [stanje])

  // Kad je partija gotova -> pokaži rezultat tek nakon što zadnje okretanje završi.
  useEffect(() => {
    if (stanje?.gotovo) {
      const id = setTimeout(() => setKrajPrikazan(true), TRAJANJE_OTKRIVANJA)
      return () => clearTimeout(id)
    }
  }, [stanje?.gotovo])

  // Fizička tipkovnica.
  useEffect(() => {
    function naPritisak(event) {
      if (document.activeElement === inputRef.current) return
      if (event.key === 'Enter') obradiTipku('ENTER')
      else if (event.key === 'Backspace') obradiTipku('BACK')
      else if (/^[a-zA-Z]$/.test(event.key)) obradiTipku(event.key.toUpperCase())
    }
    window.addEventListener('keydown', naPritisak)
    return () => window.removeEventListener('keydown', naPritisak)
  })

  function zatresi() {
    setTresi(true)
    setTimeout(() => setTresi(false), 500)
  }

  // Smijem li sad igrati? (na mom je redu i imam još pokušaja)
  function moguSad() {
    if (!stanje) return false
    const naMeni = stanje.naPotezu === korisnik.id && !stanje.gotovo
    const mine = jaIzazivac ? stanje.guessI : stanje.guessP
    return naMeni && mine.length < BROJ_REDOVA
  }

  async function posalji() {
    if (!moguSad()) return
    if (trenutni.length !== BROJ_STUPACA) {
      setPoruka(t('too_few'))
      zatresi()
      return
    }
    if (!jeDozvoljena(izazov.jezik || 'en', trenutni)) {
      setPoruka(t('not_in_list'))
      zatresi()
      return
    }
    const novo = primijeniPotez(stanje, izazov, korisnik.id, trenutni)
    zadnjiPotez.current = Date.now()
    setStanje(novo)
    setTrenutni('')
    setPoruka('')
    await supabase.from('izazovi').update({ poteza: novo }).eq('id', izazov.id)
  }

  async function preuzmiPobjedu() {
    const novo = { ...stanje, gotovo: true, pobjednik: korisnik.id }
    zadnjiPotez.current = Date.now()
    setStanje(novo)
    await supabase.from('izazovi').update({ poteza: novo }).eq('id', izazov.id)
  }

  function obradiTipku(tipka) {
    if (!moguSad()) return
    if (tipka === 'ENTER') posalji()
    else if (tipka === 'BACK') setTrenutni((v) => v.slice(0, -1))
    else if (/^[A-Z]$/.test(tipka)) setTrenutni((v) => (v.length < BROJ_STUPACA ? v + tipka : v))
  }

  if (!stanje) {
    return (
      <div className="app">
        <h1>🔄</h1>
        <p className="poruka">{t('loading')}</p>
      </div>
    )
  }

  const tajna = izazov.rijeci[stanje.trenutna]
  const naMeni = stanje.naPotezu === korisnik.id && !stanje.gotovo
  const mojiGuesses = jaIzazivac ? stanje.guessI : stanje.guessP
  const protivnikGuesses = jaIzazivac ? stanje.guessP : stanje.guessI
  const mojKljuc = jaIzazivac ? 'I' : 'P'
  const protKljuc = jaIzazivac ? 'P' : 'I'
  const moguGuessati = naMeni && mojiGuesses.length < BROJ_REDOVA
  const neaktivan =
    !naMeni &&
    !stanje.gotovo &&
    stanje.zadnjaAkcija &&
    sada - new Date(stanje.zadnjaAkcija).getTime() > TIMEOUT_MS

  // Boje tipkovnice iz SVIH pokušaja na trenutnoj riječi (i mojih i protivnikovih).
  const statusSlova = {}
  const RANG = { krivo: 1, skoro: 2, tocno: 3 }
  ;[...stanje.guessI, ...stanje.guessP].forEach((g) => {
    const ocjene = ocijeniRijec(g, tajna)
    g.split('').forEach((slovo, i) => {
      const novi = ocjene[i]
      const stari = statusSlova[slovo]
      if (!stari || RANG[novi] > RANG[stari]) statusSlova[slovo] = novi
    })
  })

  // Jedna ploča. kljuc = 'I' (izazivač) ili 'P' (protivnik) — za animaciju.
  function ploca(guesses, mojaPloca, kljuc) {
    return (
      <div className="pt-ploca">
        {Array.from({ length: BROJ_REDOVA }).map((_, r) => {
          const jePotvrdjen = r < guesses.length
          const jeTrenutni = mojaPloca && r === guesses.length && !stanje.gotovo
          const rijec = jePotvrdjen ? guesses[r] : jeTrenutni ? trenutni : ''
          const ocjene = jePotvrdjen ? ocijeniRijec(guesses[r], tajna) : null
          const jeOtkrivRed = jePotvrdjen && anim && anim.ploca === kljuc && r === anim.red
          return (
            <div className={`red ${jeTrenutni && tresi ? 'tresi' : ''}`} key={r}>
              {Array.from({ length: BROJ_STUPACA }).map((_, i) => {
                let klase = 'kvadratic'
                if (jePotvrdjen) {
                  const prikaziBoju = !jeOtkrivRed || i < otkriveno
                  if (prikaziBoju) klase += ` ${ocjene[i]}`
                  if (jeOtkrivRed) klase += ' otkrij'
                } else if (jeTrenutni && rijec[i]) {
                  klase += ' upisano'
                }
                return (
                  <div className={klase} key={i}>
                    {rijec[i] || ''}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    )
  }

  // --- Kraj partije (nakon što okretanje završi) ---
  if (stanje.gotovo && krajPrikazan) {
    const r = izracunajRezultat({ ...izazov, poteza: stanje }, korisnik.id)
    return (
      <div className="app">
        <div className="korisnik-traka">
          <button className="odjava-gumb" onClick={onNatrag}>
            {t('back')}
          </button>
        </div>
        <h1>🔄</h1>
        <p className="poruka uspjeh">{t('ch_complete')}</p>
        {r === 'win' && <p className="poruka uspjeh">{t('ch_you_win')}</p>}
        {r === 'lose' && <p className="poruka neuspjeh">{t('ch_you_lose')}</p>}
        {r === 'draw' && <p className="poruka">{t('ch_draw')}</p>}
        <button className="gumb" onClick={onNatrag}>
          {t('back')}
        </button>
      </div>
    )
  }

  // --- Igra ---
  const statusReda = naMeni ? t('pt_your_turn') : t('pt_opp_turn')

  return (
    <div className="app">
      <div className="korisnik-traka">
        <button className="odjava-gumb" onClick={onNatrag}>
          {t('back')}
        </button>
      </div>

      <h1>🔄 {t('ch_word_of', { n: stanje.trenutna + 1, total: izazov.rijeci.length })}</h1>
      <p className={`pt-status ${naMeni ? 'moj' : ''}`}>{statusReda}</p>

      {neaktivan && (
        <div className="pt-neaktivan">
          <span>{t('pt_idle')}</span>
          <button className="gumb" onClick={preuzmiPobjedu}>
            {t('pt_claim')}
          </button>
        </div>
      )}

      {poruka && <p className="poruka">{poruka}</p>}

      <input
        ref={inputRef}
        className="skriveni-unos"
        style={{ position: 'fixed', opacity: 0, pointerEvents: 'none' }}
        value={trenutni}
        onChange={(e) =>
          moguGuessati &&
          setTrenutni(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, BROJ_STUPACA))
        }
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            obradiTipku('ENTER')
          }
        }}
        readOnly={!moguGuessati}
        autoCapitalize="characters"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        aria-hidden="true"
      />

      <div className="pt-ploce" onClick={() => moguGuessati && inputRef.current?.focus()}>
        <div className="pt-strana">
          <span className="pt-oznaka">{t('pt_you')}</span>
          {ploca(mojiGuesses, true, mojKljuc)}
        </div>
        <div className="pt-strana">
          <span className="pt-oznaka">{t('pt_opponent')}</span>
          {ploca(protivnikGuesses, false, protKljuc)}
        </div>
      </div>

      <div className={`tipkovnica ${!moguGuessati ? 'onemoguceno' : ''}`}>
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
    </div>
  )
}

export default IgraPoteze
