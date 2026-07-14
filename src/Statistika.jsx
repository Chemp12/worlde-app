import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { NACINI } from './moduli'
import { VARIJANTE } from './varijante'
import { useJezik } from './i18n'
import './modal.css'
import './Statistika.css'

const PRAZNO = {
  odigrano: 0,
  pobjede: 0,
  trenutniNiz: 0,
  najboljiNiz: 0,
  raspodjela: [],
}

// Podaci su ugniježđeni: { klasik:{ daily:{...}, ... }, dvojac:{...}, ... }.
// Stari (ravni) oblik { daily:{...} } smjesti pod 'klasik'.
function normaliziraj(podaci) {
  if (!podaci) return {}
  if (podaci.daily || podaci.unlimited) return { klasik: podaci }
  return podaci
}

function Statistika({ korisnik, onZatvori }) {
  const { t } = useJezik()
  const [podaci, setPodaci] = useState(null) // null = još učitava

  useEffect(() => {
    async function ucitaj() {
      const { data, error } = await supabase
        .from('statistike')
        .select('podaci')
        .eq('user_id', korisnik.id)
        .maybeSingle()
      if (error) {
        console.error('Čitanje statistike nije uspjelo:', error.message)
        setPodaci({})
        return
      }
      setPodaci(normaliziraj(data?.podaci) || {})
    }
    ucitaj()
  }, [])

  // Dohvati statistiku jedne varijante+moda (uvijek s punim poljima).
  function statZa(varijantaId, nacinId) {
    return { ...PRAZNO, ...(podaci?.[varijantaId]?.[nacinId] || {}) }
  }

  // Najduža raspodjela (npr. osmorka ima 13 mjesta) — određuje broj redaka grafa.
  let maxDuljina = 6
  if (podaci) {
    for (const v of VARIJANTE)
      for (const m of NACINI) {
        const s = statZa(v.id, m.id)
        if (s.raspodjela.length > maxDuljina) maxDuljina = s.raspodjela.length
      }
  }

  // Zbrojevi kroz SVE varijante i modove
  let zbrOdigrano = 0
  let zbrPobjede = 0
  let zbrRekord = 0
  const zbrRaspodjela = Array(maxDuljina).fill(0)
  if (podaci) {
    for (const v of VARIJANTE)
      for (const m of NACINI) {
        const s = statZa(v.id, m.id)
        zbrOdigrano += s.odigrano
        zbrPobjede += s.pobjede
        zbrRekord = Math.max(zbrRekord, s.najboljiNiz)
        for (let i = 0; i < s.raspodjela.length; i++) zbrRaspodjela[i] += s.raspodjela[i] || 0
      }
  }
  const zbrPorazi = zbrOdigrano - zbrPobjede
  const zbrPosto = zbrOdigrano > 0 ? Math.round((zbrPobjede / zbrOdigrano) * 100) : 0

  // Prosjek pokušaja — iz raspodjele (broj pobjeda po broju pokušaja)
  const brojURaspodjeli = zbrRaspodjela.reduce((zbroj, broj) => zbroj + broj, 0)
  const ukupnoPokusaja = zbrRaspodjela.reduce((zbroj, broj, i) => zbroj + broj * (i + 1), 0)
  const prosjek = brojURaspodjeli > 0 ? (ukupnoPokusaja / brojURaspodjeli).toFixed(1) : '–'

  const maxRaspodjela = Math.max(...zbrRaspodjela, 1) // za skaliranje traka

  // Zbroj po JEDNOJ varijanti (kroz sve modove) — za razradu.
  function zbrojVarijante(varijantaId) {
    let odigrano = 0
    let pobjede = 0
    let rekord = 0
    for (const m of NACINI) {
      const s = statZa(varijantaId, m.id)
      odigrano += s.odigrano
      pobjede += s.pobjede
      rekord = Math.max(rekord, s.najboljiNiz)
    }
    const posto = odigrano > 0 ? Math.round((pobjede / odigrano) * 100) : 0
    return { odigrano, pobjede, rekord, posto }
  }

  return (
    <div className="modal-pozadina" onClick={onZatvori}>
      <div className="modal-kartica stat-kartica" onClick={(e) => e.stopPropagation()}>
        <div className="modal-zaglavlje">
          <h2>{t('stats_title')}</h2>
          <button className="modal-zatvori" onClick={onZatvori}>
            ✕
          </button>
        </div>

        {podaci === null && <p className="stat-info">{t('loading')}</p>}

        {podaci !== null && (
          <>
            {/* Ukupni pregled */}
            <div className="stat-mreza">
              <div className="stat-celija">
                <b>{zbrOdigrano}</b>
                <span>{t('stats_played')}</span>
              </div>
              <div className="stat-celija">
                <b>{zbrPosto}%</b>
                <span>{t('stats_winpct')}</span>
              </div>
              <div className="stat-celija">
                <b>{zbrPobjede}</b>
                <span>{t('stats_wins')}</span>
              </div>
              <div className="stat-celija">
                <b>{zbrPorazi}</b>
                <span>{t('stats_losses')}</span>
              </div>
              <div className="stat-celija">
                <b>{zbrRekord}</b>
                <span>{t('stats_record')}</span>
              </div>
              <div className="stat-celija">
                <b>{prosjek}</b>
                <span>{t('stats_avg')}</span>
              </div>
            </div>

            {/* Raspodjela pogodaka */}
            <h3 className="stat-naslov">{t('stats_distribution')}</h3>
            <div className="raspodjela">
              {zbrRaspodjela.map((broj, i) => (
                <div className="rasp-red" key={i}>
                  <span className="rasp-broj">{i + 1}</span>
                  <div className="rasp-track">
                    <div
                      className="rasp-traka"
                      style={{ width: `${(broj / maxRaspodjela) * 100}%` }}
                    >
                      <span className="rasp-count">{broj}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Razrada po VARIJANTAMA */}
            <h3 className="stat-naslov">{t('stats_by_variant')}</h3>
            {VARIJANTE.map((v) => {
              const z = zbrojVarijante(v.id)
              return (
                <div className="stat-mod" key={v.id}>
                  <div className="stat-mod-naslov">
                    {v.ikona} {t('var_' + v.id + '_ime')}
                  </div>
                  <div className="stat-mod-brojevi">
                    <div>
                      <b>{z.odigrano}</b>
                      <span>{t('stats_played')}</span>
                    </div>
                    <div>
                      <b>{z.posto}%</b>
                      <span>{t('stats_winpct')}</span>
                    </div>
                    <div>
                      <b>{z.pobjede}</b>
                      <span>{t('stats_wins')}</span>
                    </div>
                    <div>
                      <b>{z.rekord}</b>
                      <span>{t('stat_record')}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}

export default Statistika
