import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabaseClient'
import { useJezik } from './i18n'
import { jeDozvoljena, ocijeniRijec } from './rijeci'
import { rezultat as izracunajRezultat } from './izazovLogika'
import './App.css'
import './IgraPoteze.css'

const BROJ_REDOVA = 6
const BROJ_STUPACA = 5

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
    rijeseoI: false,
    rijeseoP: false,
    ukupnoI: 0,
    ukupnoP: 0,
    gotovo: false,
  }
}

// Primijeni jedan potez (čisti izračun novog stanja). Igra ga onaj tko je na potezu.
function primijeniPotez(stanje, izazov, mojId, guess) {
  const jaIzazivac = izazov.izazivac === mojId
  const s = { ...stanje, guessI: [...stanje.guessI], guessP: [...stanje.guessP] }
  const tajna = izazov.rijeci[s.trenutna]
  const rijesio = guess === tajna

  if (jaIzazivac) {
    s.guessI.push(guess)
    if (rijesio) s.rijeseoI = true
  } else {
    s.guessP.push(guess)
    if (rijesio) s.rijeseoP = true
  }

  const iGotov = s.rijeseoI || s.guessI.length >= BROJ_REDOVA
  const pGotov = s.rijeseoP || s.guessP.length >= BROJ_REDOVA

  if (iGotov && pGotov) {
    // Oboje gotovi s ovom riječi -> zbroji pokušaje i idi dalje.
    s.ukupnoI += s.guessI.length
    s.ukupnoP += s.guessP.length
    if (s.trenutna + 1 >= izazov.rijeci.length) {
      s.gotovo = true
    } else {
      s.trenutna += 1
      s.guessI = []
      s.guessP = []
      s.rijeseoI = false
      s.rijeseoP = false
      // Prvi na potezu za novu riječ naizmjence (parni index -> izazivač).
      s.naPotezu = s.trenutna % 2 === 0 ? izazov.izazivac : izazov.protivnik
    }
  } else if (!iGotov && !pGotov) {
    // Nitko nije gotov -> red ide protivniku.
    s.naPotezu = jaIzazivac ? izazov.protivnik : izazov.izazivac
  } else {
    // Jedan je gotov -> red ide onome tko NIJE gotov (drugi se preskače).
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
  const inputRef = useRef(null)
  const inicijalizirano = useRef(false)
  const zadnjiPotez = useRef(0) // kad sam zadnji put odigrao (da polling ne "vrati" moj potez)

  // Prvi koji uđe stvara stanje partije; ostali ga učitaju.
  useEffect(() => {
    async function init() {
      const p = pocetnoStanje(izazov)
      // Postavi početno stanje SAMO ako još ne postoji (siguran od istovremenog ulaska).
      await supabase.from('izazovi').update({ poteza: p }).eq('id', izazov.id).is('poteza', null)
      const { data } = await supabase.from('izazovi').select('poteza').eq('id', izazov.id).maybeSingle()
      setStanje(data?.poteza || p)
    }
    if (!inicijalizirano.current) {
      inicijalizirano.current = true
      init()
    }
  }, [])

  // Sinkronizacija: povlači stanje svakih 1.5 s (da vidiš protivnikove poteze).
  useEffect(() => {
    const id = setInterval(async () => {
      // Preskoči nakratko nakon vlastitog poteza da svjež upis ne prepiše stanje.
      if (Date.now() - zadnjiPotez.current < 1200) return
      const { data } = await supabase.from('izazovi').select('poteza').eq('id', izazov.id).maybeSingle()
      if (data?.poteza) setStanje(data.poteza)
    }, 1500)
    return () => clearInterval(id)
  }, [izazov.id])

  function zatresi() {
    setTresi(true)
    setTimeout(() => setTresi(false), 500)
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
  const mojRijeseo = jaIzazivac ? stanje.rijeseoI : stanje.rijeseoP
  const mojUkupno = jaIzazivac ? stanje.ukupnoI : stanje.ukupnoP
  const protivnikUkupno = jaIzazivac ? stanje.ukupnoP : stanje.ukupnoI
  const moguGuessati = naMeni && !mojRijeseo && mojiGuesses.length < BROJ_REDOVA

  async function posalji() {
    if (!moguGuessati) return
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

  function obradiTipku(tipka) {
    if (!moguGuessati) return
    if (tipka === 'ENTER') posalji()
    else if (tipka === 'BACK') setTrenutni(trenutni.slice(0, -1))
    else if (/^[A-Z]$/.test(tipka) && trenutni.length < BROJ_STUPACA) setTrenutni(trenutni + tipka)
  }

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

  // Boje tipkovnice iz mojih pokušaja za trenutnu riječ.
  const statusSlova = {}
  const RANG = { krivo: 1, skoro: 2, tocno: 3 }
  mojiGuesses.forEach((g) => {
    const ocjene = ocijeniRijec(g, tajna)
    g.split('').forEach((slovo, i) => {
      const novi = ocjene[i]
      const stari = statusSlova[slovo]
      if (!stari || RANG[novi] > RANG[stari]) statusSlova[slovo] = novi
    })
  })

  // Jedna ploča (moja ili protivnikova). "skriva" = ne pokazuj slova protivnika dok nije potvrdio.
  function ploca(guesses, mojaPloca) {
    return (
      <div className="pt-ploca">
        {Array.from({ length: BROJ_REDOVA }).map((_, r) => {
          const jePotvrdjen = r < guesses.length
          const jeTrenutni = mojaPloca && r === guesses.length
          const rijec = jePotvrdjen ? guesses[r] : jeTrenutni ? trenutni : ''
          const ocjene = jePotvrdjen ? ocijeniRijec(guesses[r], tajna) : null
          return (
            <div className={`red ${jeTrenutni && tresi ? 'tresi' : ''}`} key={r}>
              {Array.from({ length: BROJ_STUPACA }).map((_, i) => {
                let klase = 'kvadratic'
                if (jePotvrdjen) klase += ` ${ocjene[i]}`
                else if (jeTrenutni && rijec[i]) klase += ' upisano'
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

  // --- Kraj partije ---
  if (stanje.gotovo) {
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
        <div className="statistika">
          <div className="stat">
            <span className="stat-broj">{mojUkupno}</span>
            <span className="stat-ime">{t('pt_you')}</span>
          </div>
          <div className="stat">
            <span className="stat-broj">{protivnikUkupno}</span>
            <span className="stat-ime">{t('pt_opponent')}</span>
          </div>
        </div>
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
  const statusReda = mojRijeseo ? t('pt_solved_waiting') : naMeni ? t('pt_your_turn') : t('pt_opp_turn')

  return (
    <div className="app">
      <div className="korisnik-traka">
        <button className="odjava-gumb" onClick={onNatrag}>
          {t('back')}
        </button>
      </div>

      <h1>🔄 {t('ch_word_of', { n: stanje.trenutna + 1, total: izazov.rijeci.length })}</h1>
      <p className={`pt-status ${naMeni ? 'moj' : ''}`}>{statusReda}</p>

      {poruka && <p className="poruka">{poruka}</p>}

      {/* Nevidljivo polje za tipkovnicu mobitela (aktivno samo na mom potezu) */}
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

      {/* Dvije ploče: ti + protivnik */}
      <div className="pt-ploce" onClick={() => moguGuessati && inputRef.current?.focus()}>
        <div className="pt-strana">
          <span className="pt-oznaka">{t('pt_you')} · {mojUkupno + mojiGuesses.length}</span>
          {ploca(mojiGuesses, true)}
        </div>
        <div className="pt-strana">
          <span className="pt-oznaka">{t('pt_opponent')} · {protivnikUkupno + protivnikGuesses.length}</span>
          {ploca(protivnikGuesses, false)}
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
