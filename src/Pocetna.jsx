import { NACINI } from './moduli'
import { useJezik } from './i18n'
import './Pocetna.css'

// Drugi ekran: za odabranu VARIJANTU biraš MOD (dnevni/tjedni/mjesečni/neograničeno).
function Pocetna({ varijanta, onNatrag, onOdaberiMod }) {
  const { t } = useJezik()
  const imeVarijante = t('var_' + varijanta.id + '_ime')
  return (
    <div className="pocetna">
      <div className="pocetna-top">
        <button className="natrag-gumb" onClick={onNatrag}>
          {t('back')}
        </button>
        <span className="korisnik-ime">
          {varijanta.ikona} {imeVarijante}
        </span>
      </div>

      <h1 className="pocetna-logo">{varijanta.ikona} {imeVarijante.toUpperCase()}</h1>
      <p className="pocetna-podnaslov">{t('choose_mode')}</p>

      {/* Kartice modova */}
      <div className="mod-kartice">
        {NACINI.map((m) => (
          <button key={m.id} className="mod-kartica" onClick={() => onOdaberiMod(m.id)}>
            <span className="mod-ikona">{m.ikona}</span>
            <span className="mod-ime">{t('nacin_' + m.id + '_ime')}</span>
            <span className="mod-opis">{t('nacin_' + m.id + '_opis')}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default Pocetna
