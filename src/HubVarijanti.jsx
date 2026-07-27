import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { VARIJANTE } from './varijante'
import { useJezik } from './i18n'
import { jeOdlucen, perspektiva } from './izazovLogika'
import { izracunajXp, razinaZaXp } from './napredak'
import Avatar from './Avatar'
import Ljestvica from './Ljestvica'
import Postavke from './Postavke'
import Prijatelji from './Prijatelji'
import Izazovi from './Izazovi'
import Upute from './Upute'
import NapredakModal from './NapredakModal'
import './Pocetna.css'

// Prvi ekran (početna): biraš VRSTU igre (koliko riječi pogađaš odjednom).
function HubVarijanti({ korisnik, ime, onOdaberiVarijantu, onIgrajIzazov, onOdjava }) {
  const { t } = useJezik()
  const [modal, setModal] = useState(null) // 'prijatelji' | 'ljestvica' | 'postavke' | null
  const [upute, setUpute] = useState(null)  // varijanta čije upute gledamo
  const [brojZahtjeva, setBrojZahtjeva] = useState(0) // zahtjevi za prijateljstvo
  const [brojIzazova, setBrojIzazova] = useState(0)   // izazovi koji traže moju akciju
  const [podaci, setPodaci] = useState(null)          // statistika (za razinu/postignuća)

  // Prebroji stvari koje me čekaju (za značke).
  async function osvjeziZnacke() {
    const { count } = await supabase
      .from('prijateljstva')
      .select('*', { count: 'exact', head: true })
      .eq('primatelj', korisnik.id)
      .eq('status', 'na_cekanju')
    setBrojZahtjeva(count || 0)

    const { data } = await supabase
      .from('izazovi')
      .select('*')
      .or(`izazivac.eq.${korisnik.id},protivnik.eq.${korisnik.id}`)
    let n = 0
    for (const iz of data || []) {
      if (iz.status === 'na_cekanju' && iz.protivnik === korisnik.id) n++ // čeka moje prihvaćanje
      else if (
        iz.status === 'prihvacen' &&
        !jeOdlucen(iz, korisnik.id) &&
        !perspektiva(iz, korisnik.id).mojGotov
      )
        n++ // za odigrati
    }
    setBrojIzazova(n)

    // Statistika za razinu i postignuća
    const { data: stat } = await supabase
      .from('statistike')
      .select('podaci')
      .eq('user_id', korisnik.id)
      .maybeSingle()
    setPodaci(stat?.podaci || {})
  }

  // Osvježi na početku i svaki put kad se zatvori neki prozor (npr. prihvatiš zahtjev).
  useEffect(() => {
    if (modal === null) osvjeziZnacke()
  }, [modal])

  return (
    <div className="pocetna">
      <div className="pocetna-top">
        <Avatar url={korisnik.user_metadata?.avatar_url} ime={ime} size={30} />
        <span className="korisnik-ime">{ime}</span>
      </div>

      {/* Traka razine (klik -> napredak i postignuća) */}
      {podaci &&
        (() => {
          const r = razinaZaXp(izracunajXp(podaci))
          const pct = Math.round((r.uRazini / r.zaSljedecu) * 100)
          return (
            <button className="razina-traka" onClick={() => setModal('napredak')}>
              <span className="razina-lvl">
                {t('level_short')} {r.razina}
              </span>
              <span className="razina-bar">
                <span style={{ width: `${pct}%` }} />
              </span>
            </button>
          )
        })()}

      <h1 className="pocetna-logo">WORDLE</h1>
      <p className="pocetna-podnaslov">{t('choose_variant')}</p>

      {/* Kartice varijanti (+ gumb "?" za upute) */}
      <div className="mod-kartice">
        {VARIJANTE.map((v) => (
          <div className="mod-kartica-wrap" key={v.id}>
            <button
              className="mod-info"
              onClick={() => setUpute(v)}
              title={t('how_to_play')}
              aria-label={t('how_to_play')}
            >
              ?
            </button>
            <button className="mod-kartica" onClick={() => onOdaberiVarijantu(v.id)}>
              <span className="mod-ikona">{v.ikona}</span>
              <span className="mod-ime">{t('var_' + v.id + '_ime')}</span>
              <span className="mod-opis">{t('var_' + v.id + '_opis')}</span>
            </button>
          </div>
        ))}
      </div>

      {/* Dodatne akcije */}
      <div className="pocetna-akcije">
        <button className="akcija-gumb" onClick={() => setModal('izazovi')}>
          {t('challenges')}
          {brojIzazova > 0 && <span className="akcija-znacka">{brojIzazova}</span>}
        </button>
        <button className="akcija-gumb" onClick={() => setModal('prijatelji')}>
          {t('friends')}
          {brojZahtjeva > 0 && <span className="akcija-znacka">{brojZahtjeva}</span>}
        </button>
        <button className="akcija-gumb" onClick={() => setModal('ljestvica')}>
          {t('leaderboard')}
        </button>
        <button className="akcija-gumb" onClick={() => setModal('postavke')}>
          {t('settings')}
        </button>
      </div>

      {/* Upute za odabranu varijantu */}
      {upute && <Upute varijanta={upute} onZatvori={() => setUpute(null)} />}

      {/* Napredak (razina + postignuća) */}
      {modal === 'napredak' && (
        <NapredakModal podaci={podaci} onZatvori={() => setModal(null)} />
      )}

      {/* Skočni prozori */}
      {modal === 'izazovi' && (
        <Izazovi
          korisnik={korisnik}
          onIgraj={(iz) => {
            setModal(null)
            onIgrajIzazov(iz)
          }}
          onZatvori={() => setModal(null)}
        />
      )}
      {modal === 'prijatelji' && (
        <Prijatelji korisnik={korisnik} onZatvori={() => setModal(null)} />
      )}
      {modal === 'ljestvica' && (
        <Ljestvica korisnik={korisnik} onZatvori={() => setModal(null)} />
      )}
      {modal === 'postavke' && (
        <Postavke
          korisnik={korisnik}
          ime={ime}
          onOdjava={onOdjava}
          onZatvori={() => setModal(null)}
        />
      )}
    </div>
  )
}

export default HubVarijanti
