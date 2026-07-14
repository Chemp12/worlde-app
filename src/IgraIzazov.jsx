import { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from './supabaseClient'
import { useJezik } from './i18n'
import { BROJ_STUPACA, DOZVOLJENE_RIJECI, ocijeniRijec } from './rijeci'
import './App.css'
import './Izazovi.css'

const BROJ_REDOVA = 6            // svaka riječ = klasičnih 6 pokušaja
const TRAJANJE_OTKRIVANJA = 1700 // ms: koliko traje okretanje cijelog reda

const REDOVI_TIPKOVNICE = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACK'],
]

// Pretvori sekunde u "m:ss"
function formatVrijeme(sek) {
  const m = Math.floor(sek / 60)
  const s = sek % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function IgraIzazov({ korisnik, izazov, onNatrag }) {
  const { t } = useJezik()
  const rijeci = izazov.rijeci
  const ukupnoRijeci = rijeci.length

  // Ključ pod kojim pamtimo napredak OVOG izazova za OVOG igrača.
  const KLJUC = `wordle-izazov-${izazov.id}-${korisnik.id}`
  // Učitaj spremljeni napredak SAMO jednom, na startu.
  const pocetno = useMemo(() => {
    const s = localStorage.getItem(KLJUC)
    return s ? JSON.parse(s) : {}
  }, [])

  const [indexRijeci, setIndexRijeci] = useState(pocetno.indexRijeci ?? 0)
  const [pokusaji, setPokusaji] = useState(pocetno.pokusaji ?? [])
  const [ukupnoPokusaja, setUkupnoPokusaja] = useState(pocetno.ukupnoPokusaja ?? 0)
  const [proteklo, setProteklo] = useState(pocetno.proteklo ?? 0) // ukupno sekundi (pamti se)
  const [trenutni, setTrenutni] = useState('')
  const [poruka, setPoruka] = useState('')
  const [tresi, setTresi] = useState(false)
  const [redZaAnimaciju, setRedZaAnimaciju] = useState(null)
  const [otkriveno, setOtkriveno] = useState(0)
  const [animira, setAnimira] = useState(false)
  const [gotovSve, setGotovSve] = useState(false)
  const [konacni, setKonacni] = useState(null) // red izazova nakon spremanja (za rezultat)

  const inputRef = useRef(null)

  const tajna = rijeci[indexRijeci]
  const zadnji = pokusaji[pokusaji.length - 1]
  const pobijedio = zadnji === tajna
  const izgubio = !pobijedio && pokusaji.length === BROJ_REDOVA
  const krajRijeci = pobijedio || izgubio

  // Štoperica: broji sekunde SAMO dok je izazov otvoren (staje kad izađeš).
  useEffect(() => {
    if (gotovSve) return
    const id = setInterval(() => setProteklo((p) => p + 1), 1000)
    return () => clearInterval(id)
  }, [gotovSve])

  // Pamti napredak (riječ, pokušaji, ukupno, vrijeme) na svaku promjenu.
  useEffect(() => {
    if (gotovSve) return
    localStorage.setItem(
      KLJUC,
      JSON.stringify({ indexRijeci, pokusaji, ukupnoPokusaja, proteklo })
    )
  }, [indexRijeci, pokusaji, ukupnoPokusaja, proteklo, gotovSve, KLJUC])

  // Rubni slučaj: ako je učitana riječ VEĆ gotova (igrač izašao usred okretanja
  // zadnjeg poteza), na povratku prijeđi dalje da se ne zaglavi.
  useEffect(() => {
    if (!gotovSve && krajRijeci && redZaAnimaciju === null) {
      const id = setTimeout(() => sljedecaRijec(pokusaji.length), 300)
      return () => clearTimeout(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function zatresi() {
    setTresi(true)
    setTimeout(() => setTresi(false), 500)
  }

  async function spremiRezultat(pokusajaUkupno, vrijeme) {
    const jaIzazivac = izazov.izazivac === korisnik.id
    const polja = jaIzazivac
      ? { izazivac_pokusaji: pokusajaUkupno, izazivac_vrijeme: vrijeme, izazivac_gotov: true }
      : { protivnik_pokusaji: pokusajaUkupno, protivnik_vrijeme: vrijeme, protivnik_gotov: true }
    await supabase.from('izazovi').update(polja).eq('id', izazov.id)
    const { data } = await supabase.from('izazovi').select('*').eq('id', izazov.id).maybeSingle()
    setKonacni(data)
  }

  // Prijeđi na sljedeću riječ ili završi izazov.
  function sljedecaRijec(pokusajaZaOvu) {
    const noviUkupno = ukupnoPokusaja + pokusajaZaOvu
    setUkupnoPokusaja(noviUkupno)
    setRedZaAnimaciju(null)
    setOtkriveno(0)

    if (indexRijeci + 1 >= ukupnoRijeci) {
      setGotovSve(true)
      localStorage.removeItem(KLJUC) // izazov gotov -> obriši spremljeni napredak
      spremiRezultat(noviUkupno, proteklo)
    } else {
      setIndexRijeci(indexRijeci + 1)
      setPokusaji([])
      setTrenutni('')
      setPoruka('')
    }
  }

  function obradiTipku(tipka) {
    if (krajRijeci || animira || gotovSve) return

    if (tipka === 'ENTER') {
      if (trenutni.length !== BROJ_STUPACA) {
        setPoruka(t('too_few'))
        zatresi()
        return
      }
      if (!DOZVOLJENE_RIJECI.has(trenutni)) {
        setPoruka(t('not_in_list'))
        zatresi()
        return
      }
      const noviPokusaji = [...pokusaji, trenutni]
      setPokusaji(noviPokusaji)
      setTrenutni('')
      setPoruka('')

      // Animacija okretanja reda (boje se otkrivaju stupac po stupac).
      setRedZaAnimaciju(pokusaji.length)
      setOtkriveno(0)
      setAnimira(true)
      for (let i = 0; i < BROJ_STUPACA; i++) {
        setTimeout(() => setOtkriveno(i + 1), i * 280 + 250)
      }
      setTimeout(() => setAnimira(false), TRAJANJE_OTKRIVANJA)

      const rijesio = trenutni === tajna
      const potrosio = noviPokusaji.length === BROJ_REDOVA
      if (rijesio || potrosio) {
        // Tek kad okretanje završi -> (prikaži riječ ako nije pogodio i) idi dalje.
        setTimeout(() => {
          if (!rijesio) setPoruka(t('ch_word_was', { rijec: tajna }))
          sljedecaRijec(noviPokusaji.length)
        }, TRAJANJE_OTKRIVANJA)
      }
    } else if (tipka === 'BACK') {
      setTrenutni(trenutni.slice(0, -1))
    } else if (/^[A-Z]$/.test(tipka)) {
      if (trenutni.length < BROJ_STUPACA) setTrenutni(trenutni + tipka)
    }
  }

  function fokusirajUnos() {
    if (!krajRijeci && !animira) inputRef.current?.focus()
  }
  function naInput(event) {
    if (krajRijeci || animira) return
    setTrenutni(event.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, BROJ_STUPACA))
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
  }, [trenutni, pokusaji, krajRijeci, animira, gotovSve, tajna])

  // Boje tipkovnice za TRENUTNU riječ (dok se red okreće, još ga ne bojamo).
  const statusSlova = {}
  const RANG = { krivo: 1, skoro: 2, tocno: 3 }
  const redovaZaBoje = animira ? pokusaji.length - 1 : pokusaji.length
  for (let r = 0; r < redovaZaBoje; r++) {
    const pokusaj = pokusaji[r]
    const ocjene = ocijeniRijec(pokusaj, tajna)
    pokusaj.split('').forEach((slovo, i) => {
      const novi = ocjene[i]
      const stari = statusSlova[slovo]
      if (!stari || RANG[novi] > RANG[stari]) statusSlova[slovo] = novi
    })
  }

  // --- Završni ekran ---
  if (gotovSve) {
    const jaIzazivac = izazov.izazivac === korisnik.id
    const protivnikGotov = konacni
      ? jaIzazivac ? konacni.protivnik_gotov : konacni.izazivac_gotov
      : false
    let rezultat = null
    if (konacni && protivnikGotov) {
      const poljeP = jaIzazivac ? 'izazivac_pokusaji' : 'protivnik_pokusaji'
      const poljePP = jaIzazivac ? 'protivnik_pokusaji' : 'izazivac_pokusaji'
      const poljeV = jaIzazivac ? 'izazivac_vrijeme' : 'protivnik_vrijeme'
      const poljeVP = jaIzazivac ? 'protivnik_vrijeme' : 'izazivac_vrijeme'
      const moja = konacni.kriterij === 'vrijeme' ? konacni[poljeV] : konacni[poljeP]
      const prot = konacni.kriterij === 'vrijeme' ? konacni[poljeVP] : konacni[poljePP]
      rezultat = moja < prot ? 'win' : moja > prot ? 'lose' : 'draw'
    }

    return (
      <div className="app">
        <div className="korisnik-traka">
          <button className="odjava-gumb" onClick={onNatrag}>
            {t('back')}
          </button>
        </div>
        <h1>⚔️</h1>
        <p className="poruka uspjeh">{t('ch_complete')}</p>

        <div className="statistika">
          <div className="stat">
            <span className="stat-broj">{ukupnoPokusaja}</span>
            <span className="stat-ime">{t('ch_total_attempts')}</span>
          </div>
          <div className="stat">
            <span className="stat-broj">{formatVrijeme(proteklo)}</span>
            <span className="stat-ime">{t('ch_total_time')}</span>
          </div>
        </div>

        {rezultat === 'win' && <p className="poruka uspjeh">{t('ch_you_win')}</p>}
        {rezultat === 'lose' && <p className="poruka neuspjeh">{t('ch_you_lose')}</p>}
        {rezultat === 'draw' && <p className="poruka">{t('ch_draw')}</p>}
        {!protivnikGotov && <p className="poruka">{t('ch_waiting_result')}</p>}

        <button className="gumb" onClick={onNatrag}>
          {t('back')}
        </button>
      </div>
    )
  }

  // --- Ekran igranja ---
  return (
    <div className="app">
      <div className="korisnik-traka">
        <button className="odjava-gumb" onClick={onNatrag}>
          {t('back')}
        </button>
      </div>

      <h1>⚔️ {t('ch_word_of', { n: indexRijeci + 1, total: ukupnoRijeci })}</h1>

      <div className="statistika">
        <div className="stat">
          <span className="stat-broj">{ukupnoPokusaja}</span>
          <span className="stat-ime">{t('ch_total_attempts')}</span>
        </div>
        <div className="stat">
          <span className="stat-broj">{formatVrijeme(proteklo)}</span>
          <span className="stat-ime">{t('ch_total_time')}</span>
        </div>
      </div>

      {poruka && <p className="poruka">{poruka}</p>}

      <div className="ploce ploce-1" onClick={fokusirajUnos}>
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
          readOnly={krajRijeci || animira}
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          inputMode="text"
          aria-hidden="true"
        />
        <div className="ploca">
          {Array.from({ length: BROJ_REDOVA }).map((_, indexReda) => {
            const jePotvrdjen = indexReda < pokusaji.length
            const jeTrenutni = indexReda === pokusaji.length
            const slova = jePotvrdjen ? pokusaji[indexReda] : jeTrenutni ? trenutni : ''
            const ocjene = jePotvrdjen ? ocijeniRijec(slova, tajna) : null
            const jeOtkrivRed = jePotvrdjen && indexReda === redZaAnimaciju
            return (
              <div className={`red ${jeTrenutni && tresi ? 'tresi' : ''}`} key={indexReda}>
                {Array.from({ length: BROJ_STUPACA }).map((_, i) => {
                  let klase = 'kvadratic'
                  if (jePotvrdjen) {
                    const prikaziBoju = !jeOtkrivRed || i < otkriveno
                    if (prikaziBoju) klase += ` ${ocjene[i]}`
                    if (jeOtkrivRed) klase += ' otkrij'
                  } else if (jeTrenutni && slova[i]) {
                    klase += ' upisano'
                  }
                  return (
                    <div className={klase} key={i}>
                      {slova[i] || ''}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

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
    </div>
  )
}

export default IgraIzazov
