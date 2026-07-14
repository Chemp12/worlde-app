import { useState } from 'react'
import { VARIJANTE } from './varijante'
import { useJezik } from './i18n'
import Avatar from './Avatar'
import Ljestvica from './Ljestvica'
import Postavke from './Postavke'
import Prijatelji from './Prijatelji'
import Izazovi from './Izazovi'
import './Pocetna.css'

// Prvi ekran (početna): biraš VRSTU igre (koliko riječi pogađaš odjednom).
function HubVarijanti({ korisnik, ime, onOdaberiVarijantu, onIgrajIzazov, onOdjava }) {
  const { t } = useJezik()
  const [modal, setModal] = useState(null) // 'prijatelji' | 'ljestvica' | 'postavke' | null

  return (
    <div className="pocetna">
      <div className="pocetna-top">
        <Avatar url={korisnik.user_metadata?.avatar_url} ime={ime} size={30} />
        <span className="korisnik-ime">{ime}</span>
      </div>

      <h1 className="pocetna-logo">WORDLE</h1>
      <p className="pocetna-podnaslov">{t('choose_variant')}</p>

      {/* Kartice varijanti */}
      <div className="mod-kartice">
        {VARIJANTE.map((v) => (
          <button
            key={v.id}
            className="mod-kartica"
            onClick={() => onOdaberiVarijantu(v.id)}
          >
            <span className="mod-ikona">{v.ikona}</span>
            <span className="mod-ime">{t('var_' + v.id + '_ime')}</span>
            <span className="mod-opis">{t('var_' + v.id + '_opis')}</span>
          </button>
        ))}
      </div>

      {/* Dodatne akcije */}
      <div className="pocetna-akcije">
        <button className="akcija-gumb" onClick={() => setModal('izazovi')}>
          {t('challenges')}
        </button>
        <button className="akcija-gumb" onClick={() => setModal('prijatelji')}>
          {t('friends')}
        </button>
        <button className="akcija-gumb" onClick={() => setModal('ljestvica')}>
          {t('leaderboard')}
        </button>
        <button className="akcija-gumb" onClick={() => setModal('postavke')}>
          {t('settings')}
        </button>
      </div>

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
