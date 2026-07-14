import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { VARIJANTE } from './varijante'
import { useJezik } from './i18n'
import Avatar from './Avatar'
import './Ljestvica.css'

function Ljestvica({ korisnik, onZatvori }) {
  const { t } = useJezik()
  const [varijantaId, setVarijantaId] = useState('klasik') // koju varijantu gledamo
  const [prikaz, setPrikaz] = useState('globalno')         // 'globalno' | 'prijatelji'
  const [redovi, setRedovi] = useState(null)               // null = još učitava

  useEffect(() => {
    let otkazano = false
    async function ucitaj() {
      setRedovi(null)

      // Ako gledamo prijatelje, prvo skupi ID-eve mojih prijatelja (+ mene).
      let filterIds = null
      if (prikaz === 'prijatelji') {
        const { data: pr } = await supabase
          .from('prijateljstva')
          .select('posiljatelj, primatelj, status')
          .eq('status', 'prihvaceno')
        const ids = (pr || []).map((p) =>
          p.posiljatelj === korisnik.id ? p.primatelj : p.posiljatelj
        )
        filterIds = [...ids, korisnik.id] // uključi i sebe
      }

      // Dohvati rezultate za ovu varijantu (+ ime i avatar iz povezanog profila).
      let upit = supabase
        .from('rezultati')
        .select('user_id, pobjede, najbolji_niz, profili(username, avatar_url)')
        .eq('varijanta', varijantaId)
        .gt('pobjede', 0) // samo igrači s barem jednom pobjedom
        .order('pobjede', { ascending: false })
        .limit(20)
      if (filterIds) upit = upit.in('user_id', filterIds)

      const { data, error } = await upit
      if (otkazano) return
      if (error) {
        console.error('Čitanje ljestvice nije uspjelo:', error.message)
        setRedovi([])
        return
      }
      setRedovi(data)
    }
    ucitaj()
    return () => {
      otkazano = true
    }
  }, [varijantaId, prikaz, korisnik.id])

  return (
    <div className="ljestvica-pozadina" onClick={onZatvori}>
      <div className="ljestvica-kartica" onClick={(e) => e.stopPropagation()}>
        <div className="ljestvica-zaglavlje">
          <h2>{t('lb_title')}</h2>
          <button className="ljestvica-zatvori" onClick={onZatvori}>
            ✕
          </button>
        </div>

        {/* Kartice varijanti */}
        <div className="lj-varijante">
          {VARIJANTE.map((v) => (
            <button
              key={v.id}
              className={`lj-var-gumb ${varijantaId === v.id ? 'aktivan' : ''}`}
              onClick={() => setVarijantaId(v.id)}
            >
              <span className="lj-var-ikona">{v.ikona}</span>
              <span className="lj-var-ime">{t('var_' + v.id + '_ime')}</span>
            </button>
          ))}
        </div>

        {/* Prekidač Globalno / Prijatelji */}
        <div className="lj-prekidac">
          <button
            className={prikaz === 'globalno' ? 'aktivan' : ''}
            onClick={() => setPrikaz('globalno')}
          >
            {t('lb_global')}
          </button>
          <button
            className={prikaz === 'prijatelji' ? 'aktivan' : ''}
            onClick={() => setPrikaz('prijatelji')}
          >
            {t('lb_friends')}
          </button>
        </div>

        {redovi === null && <p className="ljestvica-info">{t('loading')}</p>}
        {redovi !== null && redovi.length === 0 && (
          <p className="ljestvica-info">
            {prikaz === 'prijatelji' ? t('lb_empty_friends') : t('lb_empty_global')}
          </p>
        )}

        {redovi !== null && redovi.length > 0 && (
          <table className="ljestvica-tablica">
            <thead>
              <tr>
                <th>#</th>
                <th>{t('lb_player')}</th>
                <th>{t('lb_wins')}</th>
                <th>{t('lb_streak')}</th>
              </tr>
            </thead>
            <tbody>
              {redovi.map((red, index) => (
                <tr key={red.user_id} className={red.user_id === korisnik.id ? 'ja' : ''}>
                  <td>{index + 1}</td>
                  <td>
                    <span className="lj-igrac">
                      <Avatar
                        url={red.profili?.avatar_url}
                        ime={red.profili?.username}
                        size={26}
                      />
                      {red.profili?.username || '???'}
                    </span>
                  </td>
                  <td>{red.pobjede}</td>
                  <td>{red.najbolji_niz}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default Ljestvica
