import { useJezik } from './i18n'
import './modal.css'
import './Upute.css'

// Modal s uputama za odabranu varijantu (kako se igra).
function Upute({ varijanta, onZatvori }) {
  const { t } = useJezik()
  if (!varijanta) return null

  const ime = t('var_' + varijanta.id + '_ime')
  const cilj =
    varijanta.brojRijeci === 1
      ? t('rules_goal_1', { redova: varijanta.brojRedova })
      : t('rules_goal_n', { rijeci: varijanta.brojRijeci, redova: varijanta.brojRedova })

  return (
    <div className="modal-pozadina" onClick={onZatvori}>
      <div className="modal-kartica" onClick={(e) => e.stopPropagation()}>
        <div className="modal-zaglavlje">
          <h2>
            {varijanta.ikona} {ime}
          </h2>
          <button className="modal-zatvori" onClick={onZatvori}>
            ✕
          </button>
        </div>

        <p className="upute-cilj">{cilj}</p>

        <h3 className="upute-naslov">{t('rules_colors')}</h3>
        <div className="upute-boja">
          <span className="upute-kv tocno">R</span>
          <span>{t('rules_green')}</span>
        </div>
        <div className="upute-boja">
          <span className="upute-kv skoro">I</span>
          <span>{t('rules_yellow')}</span>
        </div>
        <div className="upute-boja">
          <span className="upute-kv krivo">J</span>
          <span>{t('rules_gray')}</span>
        </div>

        <h3 className="upute-naslov">{t('rules_modes_title')}</h3>
        <p className="upute-tekst">{t('rules_modes')}</p>
        <p className="upute-tekst">{t('rules_extra')}</p>
      </div>
    </div>
  )
}

export default Upute
