import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { useJezik } from './i18n'
import { slucajneRijeci } from './rijeci'
import Avatar from './Avatar'
import './modal.css'
import './Izazovi.css'

const IZBORI_BROJA = [5, 10, 15, 20] // ponuđeni brojevi riječi

function Izazovi({ korisnik, onIgraj, onZatvori }) {
  const { t } = useJezik()
  const [izazovi, setIzazovi] = useState([])
  const [profili, setProfili] = useState({})       // user_id -> {username, avatar_url}
  const [prijatelji, setPrijatelji] = useState([]) // popis prijatelja za padajući izbornik
  const [odabrani, setOdabrani] = useState('')     // user_id odabranog prijatelja
  const [kriterij, setKriterij] = useState('pokusaji')
  const [brojRijeci, setBrojRijeci] = useState(10) // koliko riječi u izazovu
  const [poruka, setPoruka] = useState('')

  async function ucitaj() {
    // 1) Moji izazovi (kao izazivač ili protivnik)
    const { data } = await supabase
      .from('izazovi')
      .select('*')
      .or(`izazivac.eq.${korisnik.id},protivnik.eq.${korisnik.id}`)
      .order('kreirano', { ascending: false })
    const lista = data || []
    setIzazovi(lista)

    // 2) Imena/avatari svih uključenih igrača
    const ids = new Set()
    lista.forEach((iz) => {
      ids.add(iz.izazivac)
      ids.add(iz.protivnik)
    })
    // 3) Prijatelji (za slanje novog izazova)
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
    const rijeci = slucajneRijeci(brojRijeci)
    const { error } = await supabase.from('izazovi').insert({
      izazivac: korisnik.id,
      protivnik: odabrani,
      rijeci,
      kriterij,
    })
    if (error) {
      setPoruka('❌ ' + error.message)
      return
    }
    setPoruka(t('ch_sent'))
    setOdabrani('')
    ucitaj()
  }

  // Pogled iz MOJE perspektive na jedan izazov.
  function moje(iz) {
    const jaIzazivac = iz.izazivac === korisnik.id
    return {
      protivnikId: jaIzazivac ? iz.protivnik : iz.izazivac,
      mojGotov: jaIzazivac ? iz.izazivac_gotov : iz.protivnik_gotov,
      protivnikGotov: jaIzazivac ? iz.protivnik_gotov : iz.izazivac_gotov,
      mojaVrijednost:
        iz.kriterij === 'vrijeme'
          ? jaIzazivac ? iz.izazivac_vrijeme : iz.protivnik_vrijeme
          : jaIzazivac ? iz.izazivac_pokusaji : iz.protivnik_pokusaji,
      protivnikVrijednost:
        iz.kriterij === 'vrijeme'
          ? jaIzazivac ? iz.protivnik_vrijeme : iz.izazivac_vrijeme
          : jaIzazivac ? iz.protivnik_pokusaji : iz.izazivac_pokusaji,
    }
  }

  // Podijeli izazove u tri skupine
  const zaOdigrati = izazovi.filter((iz) => !moje(iz).mojGotov)
  const cekaju = izazovi.filter((iz) => moje(iz).mojGotov && !moje(iz).protivnikGotov)
  const zavrseni = izazovi.filter((iz) => moje(iz).mojGotov && moje(iz).protivnikGotov)

  function imeProtivnika(iz) {
    return profili[moje(iz).protivnikId]?.username || '...'
  }
  function avatarProtivnika(iz) {
    return profili[moje(iz).protivnikId]?.avatar_url
  }

  // Redak izazova s avatarom protivnika i (po želji) desnim sadržajem.
  function redak(iz, desno) {
    return (
      <div className="iz-red" key={iz.id}>
        <span className="iz-osoba">
          <Avatar url={avatarProtivnika(iz)} ime={imeProtivnika(iz)} size={30} />
          {imeProtivnika(iz)}
        </span>
        <span className="iz-desno">
          <span className="iz-broj">{t('ch_words_label', { n: iz.rijeci.length })}</span>
          {desno}
        </span>
      </div>
    )
  }

  function rezultatOznaka(iz) {
    const m = moje(iz)
    if (m.mojaVrijednost < m.protivnikVrijednost) return <span className="iz-win">{t('ch_you_win')}</span>
    if (m.mojaVrijednost > m.protivnikVrijednost) return <span className="iz-lose">{t('ch_you_lose')}</span>
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

            {/* Broj riječi */}
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

            <button className="iz-posalji" onClick={posaljiIzazov} disabled={!odabrani}>
              {t('ch_send')}
            </button>
          </div>
        )}
        {poruka && <p className="iz-poruka">{poruka}</p>}

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

        {/* Čeka protivnika */}
        {cekaju.length > 0 && (
          <>
            <h3 className="iz-naslov">{t('ch_waiting')}</h3>
            {cekaju.map((iz) => redak(iz, <span className="iz-info">⏳</span>))}
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
