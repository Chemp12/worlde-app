import { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from './supabaseClient'
import { useJezik } from './i18n'
import { BROJ_STUPACA, jeDozvoljena, ocijeniRijec } from './rijeci'
import { graceRokMs, rezultat as izracunajRezultat } from './izazovLogika'
import './App.css'
import './Izazovi.css'

const BROJ_REDOVA = 6            // svaka riječ = klasičnih 6 pokušaja
const TRAJANJE_OTKRIVANJA = 1700 // ms: koliko traje okretanje cijelog reda

const REDOVI_TIPKOVNICE = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACK'],
]

function formatVrijeme(sek) {
  const m = Math.floor(sek / 60)
  const s = sek % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function IgraIzazov({ korisnik, izazov, onNatrag }) {
  const { t } = useJezik()
  const rijeci = izazov.rijeci
  const ukupnoRijeci = rijeci.length
  const jeOnline = izazov.tip === 'online'

  const KLJUC = `wordle-izazov-${izazov.id}-${korisnik.id}`
  const pocetno = useMemo(() => {
    const s = localStorage.getItem(KLJUC)
    return s ? JSON.parse(s) : {}
  }, [])

  const [indexRijeci, setIndexRijeci] = useState(pocetno.indexRijeci ?? 0)
  const [pokusaji, setPokusaji] = useState(pocetno.pokusaji ?? [])
  const [ukupnoPokusaja, setUkupnoPokusaja] = useState(pocetno.ukupnoPokusaja ?? 0)
  const [proteklo, setProteklo] = useState(pocetno.proteklo ?? 0)
  const [trenutni, setTrenutni] = useState('')
  const [poruka, setPoruka] = useState('')
  const [tresi, setTresi] = useState(false)
  const [redZaAnimaciju, setRedZaAnimaciju] = useState(null)
  const [otkriveno, setOtkriveno] = useState(0)
  const [animira, setAnimira] = useState(false)
  const [gotovSve, setGotovSve] = useState(false)
  const [ishod, setIshod] = useState(null)      // null | 'lost_first' | 'time_up' (online porazi)
  const [stanje, setStanje] = useState(izazov)  // najnovije stanje izazova iz baze (za online)

  const inputRef = useRef(null)

  const tajna = rijeci[indexRijeci]
  const zadnji = pokusaji[pokusaji.length - 1]
  const pobijedio = zadnji === tajna
  const izgubio = !pobijedio && pokusaji.length === BROJ_REDOVA
  const krajRijeci = pobijedio || izgubio

  // Je li protivnik prvi završio? (za online)
  const protivnikPrvi = jeOnline && stanje.prvi_gotov && stanje.prvi_gotov !== korisnik.id
  // Koliko sekundi protivnik (ja) još ima kad je online "manje pokušaja"
  let graceOstalo = null
  if (protivnikPrvi && izazov.kriterij === 'pokusaji') {
    const rok = graceRokMs(stanje)
    if (rok) graceOstalo = Math.max(0, Math.ceil((rok - Date.now()) / 1000))
  }

  // Štoperica (broji dok je izazov otvoren i nije gotov).
  useEffect(() => {
    if (gotovSve) return
    const id = setInterval(() => setProteklo((p) => p + 1), 1000)
    return () => clearInterval(id)
  }, [gotovSve])

  // Online: povlači stanje izazova iz baze svake 2 sekunde (dok je otvoreno).
  useEffect(() => {
    if (!jeOnline) return
    async function povuci() {
      const { data } = await supabase.from('izazovi').select('*').eq('id', izazov.id).maybeSingle()
      if (data) setStanje(data)
    }
    povuci()
    const id = setInterval(povuci, 2000)
    return () => clearInterval(id)
  }, [jeOnline, izazov.id])

  // Pamti napredak.
  useEffect(() => {
    if (gotovSve) return
    localStorage.setItem(
      KLJUC,
      JSON.stringify({ indexRijeci, pokusaji, ukupnoPokusaja, proteklo })
    )
  }, [indexRijeci, pokusaji, ukupnoPokusaja, proteklo, gotovSve, KLJUC])

  // Rubni slučaj: učitana riječ već gotova (izašao usred okretanja) -> nastavi.
  useEffect(() => {
    if (!gotovSve && krajRijeci && redZaAnimaciju === null) {
      const id = setTimeout(() => sljedecaRijec(pokusaji.length), 300)
      return () => clearTimeout(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ONLINE: reagiraj kad protivnik prvi završi.
  useEffect(() => {
    if (!jeOnline || gotovSve || !protivnikPrvi) return
    if (izazov.kriterij === 'vrijeme') {
      // kraće vrijeme: protivnik je prvi -> odmah gubim
      setIshod('lost_first')
      setGotovSve(true)
      localStorage.removeItem(KLJUC)
    } else if (graceOstalo === 0) {
      // manje pokušaja: isteklo mi je dodatno vrijeme -> gubim
      setIshod('time_up')
      setGotovSve(true)
      localStorage.removeItem(KLJUC)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stanje, proteklo, gotovSve, protivnikPrvi, graceOstalo])

  function zatresi() {
    setTresi(true)
    setTimeout(() => setTresi(false), 500)
  }

  async function spremiRezultat(pokusajaUkupno, vrijeme) {
    const jaIzazivac = izazov.izazivac === korisnik.id
    const polja = jaIzazivac
      ? { izazivac_pokusaji: pokusajaUkupno, izazivac_vrijeme: vrijeme, izazivac_gotov: true }
      : { protivnik_pokusaji: pokusajaUkupno, protivnik_vrijeme: vrijeme, protivnik_gotov: true }

    // Online: ako još nitko nije "prvi gotov", proglasi sebe prvim (pokreće grace).
    if (jeOnline) {
      const { data: cur } = await supabase
        .from('izazovi')
        .select('prvi_gotov')
        .eq('id', izazov.id)
        .maybeSingle()
      if (cur && !cur.prvi_gotov) {
        polja.prvi_gotov = korisnik.id
        polja.prvi_gotov_u = new Date().toISOString()
      }
    }

    await supabase.from('izazovi').update(polja).eq('id', izazov.id)
    const { data } = await supabase.from('izazovi').select('*').eq('id', izazov.id).maybeSingle()
    if (data) setStanje(data)
  }

  function sljedecaRijec(pokusajaZaOvu) {
    const noviUkupno = ukupnoPokusaja + pokusajaZaOvu
    setUkupnoPokusaja(noviUkupno)
    setRedZaAnimaciju(null)
    setOtkriveno(0)

    if (indexRijeci + 1 >= ukupnoRijeci) {
      setGotovSve(true)
      localStorage.removeItem(KLJUC)
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
      if (!jeDozvoljena('en', trenutni)) {
        setPoruka(t('not_in_list'))
        zatresi()
        return
      }
      const noviPokusaji = [...pokusaji, trenutni]
      setPokusaji(noviPokusaji)
      setTrenutni('')
      setPoruka('')

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

  // Boje tipkovnice za TRENUTNU riječ.
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
    const r = izracunajRezultat(stanje, korisnik.id) // 'win' | 'lose' | 'draw' | null
    const jaPrvi = jeOnline && stanje.prvi_gotov === korisnik.id

    return (
      <div className="app">
        <div className="korisnik-traka">
          <button className="odjava-gumb" onClick={onNatrag}>
            {t('back')}
          </button>
        </div>
        <h1>⚔️</h1>

        {ishod === 'lost_first' && <p className="poruka neuspjeh">{t('ch_lost_first')}</p>}
        {ishod === 'time_up' && <p className="poruka neuspjeh">{t('ch_time_up')}</p>}
        {!ishod && <p className="poruka uspjeh">{t('ch_complete')}</p>}

        {!ishod && (
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
        )}

        {r === 'win' && <p className="poruka uspjeh">{t('ch_you_win')}</p>}
        {r === 'lose' && <p className="poruka neuspjeh">{t('ch_you_lose')}</p>}
        {r === 'draw' && <p className="poruka">{t('ch_draw')}</p>}
        {r === null && !ishod && (
          <p className="poruka">{jaPrvi ? t('ch_you_first') : t('ch_waiting_result')}</p>
        )}

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

      {/* Online "manje pokušaja": dodatno vrijeme otkucava kad je protivnik prvi završio */}
      {graceOstalo !== null && (
        <p className="poruka neuspjeh">
          ⏳ {t('ch_grace_left')}: {formatVrijeme(graceOstalo)}
        </p>
      )}

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
