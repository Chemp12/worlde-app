import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { useJezik } from './i18n'
import { slucajneRijeci, JEZICI } from './rijeci'
import { perspektiva, jeOdlucen, rezultat } from './izazovLogika'
import Avatar from './Avatar'
import './modal.css'
import './Izazovi.css'

const IZBORI_BROJA = [5, 10, 15, 20] // brzi izbori broja riječi
const MAX_RIJECI = 50                // gornja granica (razumno za jedan izazov)

function Izazovi({ korisnik, onIgraj, onZatvori }) {
  const { t } = useJezik()
  const [izazovi, setIzazovi] = useState([])
  const [profili, setProfili] = useState({})       // user_id -> {username, avatar_url}
  const [prijatelji, setPrijatelji] = useState([]) // popis prijatelja za padajući izbornik
  const [odabrani, setOdabrani] = useState('')     // user_id odabranog prijatelja
  const [kriterij, setKriterij] = useState('pokusaji')
  const [tip, setTip] = useState('offline')        // 'offline' | 'online'
  const [brojRijeci, setBrojRijeci] = useState(10) // koliko riječi u izazovu
  const [jezikRijeci, setJezikRijeci] = useState(
    () => localStorage.getItem('wordle-jezik-rijeci') || 'en'
  )
  const [poruka, setPoruka] = useState('')

  async function ucitaj() {
    const { data } = await supabase
      .from('izazovi')
      .select('*')
      .or(`izazivac.eq.${korisnik.id},protivnik.eq.${korisnik.id}`)
      .order('kreirano', { ascending: false })
    const lista = data || []
    setIzazovi(lista)

    const ids = new Set()
    lista.forEach((iz) => {
      ids.add(iz.izazivac)
      ids.add(iz.protivnik)
    })
    const { data: pr } = await supabase
      .from('prijateljstva')
      .select('posiljatelj, primatelj, status')
      .eq('status', 'prihvaceno')
    const prijateljIds = (pr || []).map((p) =>
      p.posiljatelj === korisnik.id ? p.primatelj : p.posiljatelj
    )
    prijateljIds.forEach((id) => ids.add(id))

    if (ids.size > 0) {
      const { data: prof } = await supabase
        .from('profili')
        .select('user_id, username, avatar_url')
        .in('user_id', [...ids])
      const mapa = {}
      ;(prof || []).forEach((p) => (mapa[p.user_id] = p))
      setProfili(mapa)
      setPrijatelji(prijateljIds.map((id) => mapa[id]).filter(Boolean))
    }
  }

  useEffect(() => {
    ucitaj()
  }, [])

  async function posaljiIzazov() {
    if (!odabrani) return
    setPoruka('')
    const rijeci = slucajneRijeci(brojRijeci, jezikRijeci, 5)
    const { error } = await supabase.from('izazovi').insert({
      izazivac: korisnik.id,
      protivnik: odabrani,
      rijeci,
      kriterij,
      tip,
      jezik: jezikRijeci,
      status: 'na_cekanju', // čeka da protivnik prihvati
    })
    if (error) {
      setPoruka('❌ ' + error.message)
      return
    }
    setPoruka(t('ch_sent'))
    setOdabrani('')
    ucitaj()
  }

  async function prihvati(iz) {
    await supabase.from('izazovi').update({ status: 'prihvacen' }).eq('id', iz.id)
    ucitaj()
  }
  async function odbij(iz) {
    // Ne brišemo (nema DELETE pravila u bazi) -> označimo kao odbijen pa ga sakrijemo.
    await supabase.from('izazovi').update({ status: 'odbijen' }).eq('id', iz.id)
    ucitaj()
  }

  function imeProtivnika(iz) {
    return profili[perspektiva(iz, korisnik.id).protivnikId]?.username || '...'
  }
  function avatarProtivnika(iz) {
    return profili[perspektiva(iz, korisnik.id).protivnikId]?.avatar_url
  }

  // Podjela izazova u skupine
  const zahtjevi = izazovi.filter((iz) => iz.status === 'na_cekanju' && iz.protivnik === korisnik.id)
  const cekaPrihvat = izazovi.filter((iz) => iz.status === 'na_cekanju' && iz.izazivac === korisnik.id)
  const prihvaceni = izazovi.filter((iz) => iz.status === 'prihvacen')
  const zavrseni = prihvaceni.filter((iz) => jeOdlucen(iz, korisnik.id))
  const zaOdigrati = prihvaceni.filter(
    (iz) => !jeOdlucen(iz, korisnik.id) && !perspektiva(iz, korisnik.id).mojGotov
  )
  const cekaju = prihvaceni.filter(
    (iz) => !jeOdlucen(iz, korisnik.id) && perspektiva(iz, korisnik.id).mojGotov
  )

  // Redak izazova s avatarom, imenom, detaljima i desnim sadržajem (gumb/rezultat).
  function redak(iz, desno) {
    const kriterijTekst = iz.kriterij === 'vrijeme' ? t('ch_crit_time') : t('ch_crit_attempts')
    const tipEmoji = iz.tip === 'online' ? '🟢' : '📴'
    const kritEmoji = iz.kriterij === 'vrijeme' ? '⏱️' : '🎯'
    return (
      <div className="iz-red" key={iz.id}>
        <span className="iz-osoba">
          <Avatar url={avatarProtivnika(iz)} ime={imeProtivnika(iz)} size={34} />
          <span className="iz-osoba-tekst">
            <span className="iz-ime">{imeProtivnika(iz)}</span>
            <span className="iz-detalji">
              {tipEmoji} {t('ch_words_label', { n: iz.rijeci.length })} · {kritEmoji} {kriterijTekst}
            </span>
          </span>
        </span>
        {desno}
      </div>
    )
  }

  function rezultatOznaka(iz) {
    const r = rezultat(iz, korisnik.id)
    if (r === 'win') return <span className="iz-win">{t('ch_you_win')}</span>
    if (r === 'lose') return <span className="iz-lose">{t('ch_you_lose')}</span>
    return <span className="iz-draw">{t('ch_draw')}</span>
  }

  return (
    <div className="modal-pozadina" onClick={onZatvori}>
      <div className="modal-kartica" onClick={(e) => e.stopPropagation()}>
        <div className="modal-zaglavlje">
          <h2>{t('ch_title')}</h2>
          <button className="modal-zatvori" onClick={onZatvori}>
            ✕
          </button>
        </div>

        {/* Novi izazov */}
        <h3 className="iz-naslov">{t('ch_new')}</h3>
        {prijatelji.length === 0 ? (
          <p className="iz-info">{t('ch_no_friends')}</p>
        ) : (
          <div className="iz-novi">
            <select
              className="iz-select"
              value={odabrani}
              onChange={(e) => setOdabrani(e.target.value)}
            >
              <option value="">{t('ch_pick_friend')}</option>
              {prijatelji.map((p) => (
                <option key={p.user_id} value={p.user_id}>
                  {p.username}
                </option>
              ))}
            </select>

            {/* Vrsta: offline / online */}
            <span className="iz-oznaka">{t('ch_type')}</span>
            <div className="iz-kriterij">
              <button className={tip === 'offline' ? 'aktivan' : ''} onClick={() => setTip('offline')}>
                {t('ch_offline')}
              </button>
              <button className={tip === 'online' ? 'aktivan' : ''} onClick={() => setTip('online')}>
                {t('ch_online')}
              </button>
            </div>

            {/* Jezik riječi */}
            <span className="iz-oznaka">{t('words_lang')}</span>
            <div className="iz-jezici">
              {JEZICI.map((j) => (
                <button
                  key={j.id}
                  className={`iz-jezik ${jezikRijeci === j.id ? 'aktivan' : ''}`}
                  onClick={() => setJezikRijeci(j.id)}
                  title={j.ime}
                >
                  {j.kod}
                </button>
              ))}
            </div>

            {/* Kriterij pobjede */}
            <span className="iz-oznaka">{t('ch_criterion')}</span>
            <div className="iz-kriterij">
              <button
                className={kriterij === 'pokusaji' ? 'aktivan' : ''}
                onClick={() => setKriterij('pokusaji')}
              >
                {t('ch_crit_attempts')}
              </button>
              <button
                className={kriterij === 'vrijeme' ? 'aktivan' : ''}
                onClick={() => setKriterij('vrijeme')}
              >
                {t('ch_crit_time')}
              </button>
            </div>

            {/* Broj riječi: brzi izbori + vlastiti unos */}
            <span className="iz-oznaka">{t('ch_word_count')}</span>
            <div className="iz-kriterij">
              {IZBORI_BROJA.map((n) => (
                <button
                  key={n}
                  className={brojRijeci === n ? 'aktivan' : ''}
                  onClick={() => setBrojRijeci(n)}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="iz-vlastito">
              <label>{t('ch_custom')}:</label>
              <input
                type="number"
                min="1"
                max={MAX_RIJECI}
                value={brojRijeci}
                onChange={(e) =>
                  setBrojRijeci(Math.max(1, Math.min(MAX_RIJECI, Number(e.target.value) || 1)))
                }
              />
            </div>

            <button className="iz-posalji" onClick={posaljiIzazov} disabled={!odabrani}>
              {t('ch_send')}
            </button>
          </div>
        )}
        {poruka && <p className="iz-poruka">{poruka}</p>}

        {/* Zahtjevi (netko me izazvao — prihvati ili odbij) */}
        {zahtjevi.length > 0 && (
          <>
            <h3 className="iz-naslov">{t('ch_requests')}</h3>
            {zahtjevi.map((iz) =>
              redak(
                iz,
                <span className="iz-akcije">
                  <button className="iz-igraj" onClick={() => prihvati(iz)}>
                    {t('ch_accept')}
                  </button>
                  <button className="iz-odbij" onClick={() => odbij(iz)}>
                    {t('ch_decline')}
                  </button>
                </span>
              )
            )}
          </>
        )}

        {/* Za odigrati */}
        {zaOdigrati.length > 0 && (
          <>
            <h3 className="iz-naslov">{t('ch_to_play')}</h3>
            {zaOdigrati.map((iz) =>
              redak(
                iz,
                <button className="iz-igraj" onClick={() => onIgraj(iz)}>
                  {t('ch_play')}
                </button>
              )
            )}
          </>
        )}

        {/* Čeka protivnika (ja završio) */}
        {cekaju.length > 0 && (
          <>
            <h3 className="iz-naslov">{t('ch_waiting')}</h3>
            {cekaju.map((iz) => redak(iz, <span className="iz-info">⏳</span>))}
          </>
        )}

        {/* Poslano — čeka da protivnik prihvati */}
        {cekaPrihvat.length > 0 && (
          <>
            <h3 className="iz-naslov">{t('ch_awaiting_accept')}</h3>
            {cekaPrihvat.map((iz) => redak(iz, <span className="iz-info">✉️</span>))}
          </>
        )}

        {/* Završeni */}
        {zavrseni.length > 0 && (
          <>
            <h3 className="iz-naslov">{t('ch_finished')}</h3>
            {zavrseni.map((iz) => redak(iz, rezultatOznaka(iz)))}
          </>
        )}

        {izazovi.length === 0 && <p className="iz-info">{t('ch_none')}</p>}
      </div>
    </div>
  )
}

export default Izazovi
